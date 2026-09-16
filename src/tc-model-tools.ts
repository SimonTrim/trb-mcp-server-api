/**
 * Trimble Connect Model API tools — native REST (NOT OData).
 *
 * Correct endpoints (per Trimble Model Service):
 *   GET /models/{modelId}?include=metadata
 *   GET /models/{modelId}/entities?top=1000&offset=0&include=id,type,product,psets,layerIds
 *   GET /models/{modelId}/layers
 *   GET /models/{modelId}/psetdefs
 *
 * modelId is usually the file **versionId** from model_list (e.g. akwjvMzgCqI).
 * On 404, the tool retries with fileId (runtime model ID, e.g. fYBFB6043Zc).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { tcApiCall, type Region, type TcApiResult } from "./tc-api-client.js";

const regionEnum = z
  .enum(["us", "eu", "ap", "ap-au"])
  .describe("Trimble Connect region");

type LayerItem = { idx: number; name: string };
type PsetDefItem = { idx: number; name: string; props: { name: string }[] };
type EntityItem = {
  id: string;
  idx?: number;
  type?: string;
  product?: { name?: string; objectType?: string };
  layerIds?: number[];
  psets?: { idx: number; values: unknown[] }[];
};

function resultText(result: TcApiResult, path: string): string {
  const body = typeof result.body === "string" ? result.body : JSON.stringify(result.body, null, 2);
  const summary = `GET ${path} → ${result.status} ${result.statusText}`;
  return result.status >= 400 ? `ERROR: ${summary}\n\n${body}` : `${summary}\n\n${body}`;
}

function toFrnEntity(ifcGuid: string): string {
  return `frn:entity:${ifcGuid.replace(/\$/g, "%24")}`;
}

async function modelGet(
  region: Region,
  path: string,
  query: Record<string, string>,
  token: string
): Promise<TcApiResult> {
  return tcApiCall({ method: "GET", region, path, apiType: "model", query, authToken: token });
}

async function resolveModelId(
  region: Region,
  token: string,
  versionId: string,
  fileId?: string
): Promise<{ modelId: string; info: unknown } | { error: string }> {
  const candidates = [versionId, fileId].filter((v, i, a) => v && a.indexOf(v) === i) as string[];

  for (const id of candidates) {
    const path = `/models/${encodeURIComponent(id)}`;
    const result = await modelGet(region, path, { include: "metadata" }, token);
    if (result.status === 200) {
      const info = result.body as Record<string, unknown>;
      const resolved = typeof info.versionId === "string" ? info.versionId : id;
      return { modelId: resolved, info };
    }
  }

  return {
    error: `Model not found. Tried IDs: ${candidates.join(", ")}. Ensure the IFC is processed (TRB) and the user has read access.`,
  };
}

async function fetchAllEntities(
  region: Region,
  token: string,
  modelId: string,
  include: string,
  pageSize = 1000
): Promise<EntityItem[]> {
  const all: EntityItem[] = [];
  let offset = 0;

  for (;;) {
    const result = await modelGet(
      region,
      `/models/${encodeURIComponent(modelId)}/entities`,
      { top: String(pageSize), offset: String(offset), include },
      token
    );
    if (result.status !== 200) {
      throw new Error(resultText(result, `/models/${modelId}/entities`));
    }
    const body = result.body as { items?: EntityItem[] };
    const items = body.items ?? [];
    all.push(...items);
    if (items.length < pageSize) break;
    offset += pageSize;
  }

  return all;
}

function getPsetProperty(
  entity: EntityItem,
  psetDefs: PsetDefItem[],
  psetName: string,
  propName: string
): unknown {
  const def = psetDefs.find((d) => d.name === psetName);
  if (!def || !entity.psets) return undefined;
  const inst = entity.psets.find((p) => p.idx === def.idx);
  if (!inst?.values) return undefined;
  const propIdx = def.props.findIndex((p) => p.name === propName);
  if (propIdx < 0) return undefined;
  return inst.values[propIdx];
}

export function registerModelTools(
  srv: McpServer,
  getToken: (extra: { sessionId?: string }) => string
): void {
  srv.tool(
    "tc_model_entities",
    `Trimble Connect **Model Service API** — read native IFC entity properties server-side (no Agent Eyes).

**NOT OData** — do NOT use fields, $filter, $top, $apply. Use actions below.

**IDs:** versionId = Version from model_list (e.g. akwjvMzgCqI). fileId = runtime ID (e.g. fYBFB6043Zc). On 404, pass both.

**actions:**
- \`info\` — GET /models/{id}?include=metadata (auto-resolve id)
- \`entities\` — paginated entities with \`include\` (default: id,type,product,psets,layerIds)
- \`layers\` — layer idx→name map
- \`psetdefs\` — pset/property definitions
- \`search\` — **preferred for Organizer workflows**: filter by layer + IFC type + pset property; returns [{id, frn, productName, layer, propertyValue}]

**Organizer FRN:** frn:entity:{id} — encode $ as %24.

**After tc_model_entities search**, link objects: tc_organizer node_update {add:[frn:entity:…]}. Verify node_get count>0.`,
    {
      region: regionEnum.default("eu"),
      action: z
        .enum(["info", "entities", "layers", "psetdefs", "search"])
        .describe("info|entities|layers|psetdefs|search"),
      versionId: z.string().describe("Model version ID from model_list / session context"),
      fileId: z.string().optional().describe("Runtime model ID from model_list (fallback if versionId 404)"),
      include: z
        .string()
        .optional()
        .describe("For action=entities: include param, default id,type,product,psets,layerIds"),
      top: z.number().int().positive().optional().describe("For action=entities: page size (default 1000)"),
      offset: z.number().int().nonnegative().optional().describe("For action=entities: offset (default 0)"),
      layerName: z.string().optional().describe("For action=search: exact layer name e.g. V_Air_soufflé"),
      ifcType: z.string().optional().describe("For action=search: IFC type e.g. IFCFLOWSEGMENT"),
      psetName: z.string().optional().describe("For action=search: pset name e.g. Pset MEP"),
      propertyName: z
        .string()
        .optional()
        .describe("For action=search: property name e.g. Geom-Ø (mm) or Geom-D (mm)"),
      altPropertyName: z
        .string()
        .optional()
        .describe("For action=search: fallback property if primary is null"),
    },
    async (
      {
        region,
        action,
        versionId,
        fileId,
        include,
        top,
        offset,
        layerName,
        ifcType,
        psetName,
        propertyName,
        altPropertyName,
      },
      extra
    ) => {
      const token = getToken(extra);
      const reg = region as Region;

      const resolved = await resolveModelId(reg, token, versionId, fileId);
      if ("error" in resolved) {
        return { content: [{ type: "text" as const, text: resolved.error }], isError: true };
      }
      const { modelId, info } = resolved;

      if (action === "info") {
        return {
          content: [
            {
              type: "text" as const,
              text: `Resolved modelId: ${modelId}\n\n${JSON.stringify(info, null, 2)}`,
            },
          ],
        };
      }

      if (action === "layers") {
        const result = await modelGet(reg, `/models/${encodeURIComponent(modelId)}/layers`, {}, token);
        const text = resultText(result, `/models/${modelId}/layers`);
        return result.status >= 400
          ? { content: [{ type: "text" as const, text }], isError: true }
          : { content: [{ type: "text" as const, text: `modelId: ${modelId}\n\n${text}` }] };
      }

      if (action === "psetdefs") {
        const result = await modelGet(reg, `/models/${encodeURIComponent(modelId)}/psetdefs`, {}, token);
        const text = resultText(result, `/models/${modelId}/psetdefs`);
        return result.status >= 400
          ? { content: [{ type: "text" as const, text }], isError: true }
          : { content: [{ type: "text" as const, text: `modelId: ${modelId}\n\n${text}` }] };
      }

      if (action === "entities") {
        const inc = include ?? "id,type,product,psets,layerIds";
        if (top !== undefined || offset !== undefined) {
          const result = await modelGet(
            reg,
            `/models/${encodeURIComponent(modelId)}/entities`,
            {
              top: String(top ?? 1000),
              offset: String(offset ?? 0),
              include: inc,
            },
            token
          );
          const text = resultText(result, `/models/${modelId}/entities`);
          return result.status >= 400
            ? { content: [{ type: "text" as const, text }], isError: true }
            : { content: [{ type: "text" as const, text: `modelId: ${modelId}\n\n${text}` }] };
        }

        const items = await fetchAllEntities(reg, token, modelId, inc);
        return {
          content: [
            {
              type: "text" as const,
              text: `modelId: ${modelId}\nFetched ${items.length} entities (all pages).\n\n${JSON.stringify({ items }, null, 2)}`,
            },
          ],
        };
      }

      // action === "search"
      if (!layerName && !ifcType && !psetName && !propertyName) {
        return {
          content: [
            {
              type: "text" as const,
              text: "action=search requires at least layerName, ifcType, or psetName+propertyName",
            },
          ],
          isError: true,
        };
      }

      const layersResult = await modelGet(reg, `/models/${encodeURIComponent(modelId)}/layers`, {}, token);
      const psetDefsResult = await modelGet(reg, `/models/${encodeURIComponent(modelId)}/psetdefs`, {}, token);
      if (layersResult.status !== 200 || psetDefsResult.status !== 200) {
        const err = [
          layersResult.status !== 200 ? resultText(layersResult, `/models/${modelId}/layers`) : "",
          psetDefsResult.status !== 200 ? resultText(psetDefsResult, `/models/${modelId}/psetdefs`) : "",
        ]
          .filter(Boolean)
          .join("\n\n");
        return { content: [{ type: "text" as const, text: err }], isError: true };
      }

      const layerItems = ((layersResult.body as { items?: LayerItem[] }).items ?? []) as LayerItem[];
      const layerByIdx = new Map(layerItems.map((l) => [l.idx, l.name]));
      const targetLayerIdx = layerName ? layerItems.find((l) => l.name === layerName)?.idx : undefined;
      if (layerName && targetLayerIdx === undefined) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Layer "${layerName}" not found. Available: ${layerItems.map((l) => l.name).join(", ")}`,
            },
          ],
          isError: true,
        };
      }

      const psetDefs = ((psetDefsResult.body as { items?: PsetDefItem[] }).items ?? []) as PsetDefItem[];
      const entities = await fetchAllEntities(reg, token, modelId, "id,type,product,psets,layerIds");

      const matches = entities
        .filter((e) => {
          if (ifcType && e.type !== ifcType) return false;
          if (targetLayerIdx !== undefined) {
            if (!e.layerIds?.includes(targetLayerIdx)) return false;
          }
          return true;
        })
        .map((e) => {
          const layer =
            e.layerIds?.map((idx) => layerByIdx.get(idx)).filter(Boolean).join(", ") ?? "";
          let propVal =
            psetName && propertyName
              ? getPsetProperty(e, psetDefs, psetName, propertyName)
              : undefined;
          if ((propVal === null || propVal === undefined) && psetName && altPropertyName) {
            propVal = getPsetProperty(e, psetDefs, psetName, altPropertyName);
          }
          const frn = toFrnEntity(e.id);
          return {
            id: e.id,
            frn,
            type: e.type,
            productName: e.product?.name ?? e.product?.objectType,
            layer,
            propertyValue: propVal,
          };
        });

      const withProp = propertyName ? matches.filter((m) => m.propertyValue != null) : matches;
      const summary = {
        modelId,
        totalEntities: entities.length,
        matched: matches.length,
        withProperty: withProp.length,
        layerName,
        ifcType,
        psetName,
        propertyName,
        altPropertyName,
        items: matches,
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(summary, null, 2) }],
      };
    }
  );
}
