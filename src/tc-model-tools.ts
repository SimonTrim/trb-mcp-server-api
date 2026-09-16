/**
 * Trimble Connect Model API tools — server-side entity/property queries
 * against processed BIM model versions (.trb), without requiring the 3D viewer
 * or Agent Eyes extension.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { tcApiCall, type Region } from "./tc-api-client.js";

const regionEnum = z
  .enum(["us", "eu", "ap", "ap-au"])
  .describe("Trimble Connect region: us (North America), eu (Europe), ap (Asia-Pacific), ap-au (Australia)");

export function registerModelTools(
  srv: McpServer,
  getToken: (extra: { sessionId?: string }) => string
): void {
  srv.tool(
    "tc_model_entities",
    `Query Trimble Connect Model API entities and property values for a loaded BIM model VERSION.

Use this to read IFC GUIDs (field \`idc\`), layers, and property-set values (e.g. Pset MEP Geom-Ø, Tech-Medium) when built-in \`model_search\` OData groupby returns null — common on Nova/IFC MEP models.

**versionId** = Version ID from \`model_list\` / session context (e.g. akwjvMzgCqI). NOT the runtime model ID (e.g. fYBFB6043Zc).

**OData property path encoding:** spaces → _x0020_, hyphen → _x002D_, parentheses → _x0028_ / _x0029_
Examples:
- Pset MEP / Geom-Ø (mm) → Pset_x0020_MEP/Geom_x002D_Ø_x0028_mm_x0029_
- Pset MEP / Tech-Medium → Pset_x0020_MEP/Tech_x002D_Medium
- Presentation Layers / Layer → Presentation_x0020_Layers/Layer

**endpoints:**
- entities (default): GET /models/{versionId}/entities — pass odataFilter, fields, top, skip
- aggregate: GET /models/{versionId}/entities/aggregate — pass odataApply (groupby/count/max)

**Typical Organizer workflow (air soufflé ducts by Geom-Ø):**
1. Built-in \`get_model_layers\` → find layer name (e.g. V_Air_soufflé)
2. Built-in \`model_search\` select: type eq 'IFCFLOWSEGMENT' and haslayer('V_Air_soufflé')
3. \`tc_model_entities\` fields=idc,type,Product/Name,Pset_x0020_MEP/Geom_x002D_Ø_x0028_mm_x0029_,Presentation_x0020_Layers/Layer — paginate with top/skip until all rows fetched
4. Group by diameter; \`tc_organizer\` \`node_update\` body { add: ["frn:entity:GUID", ...] } per node ($ encoded as %24)
5. \`node_get\` — verify count > 0

Do NOT ask the user to open Agent Eyes to read properties.`,
    {
      region: regionEnum.default("eu"),
      versionId: z.string().describe("Model version ID from model_list / session context"),
      endpoint: z.enum(["entities", "aggregate"]).default("entities").describe("entities = list rows; aggregate = $apply groupby/count"),
      odataFilter: z
        .string()
        .optional()
        .describe("$filter WITHOUT prefix, e.g. type eq 'IFCFLOWSEGMENT' and haslayer('V_Air_soufflé')"),
      odataApply: z
        .string()
        .optional()
        .describe("$apply WITHOUT prefix — for endpoint=aggregate only"),
      fields: z
        .string()
        .optional()
        .describe("Comma-separated field paths for entities endpoint, e.g. idc,type,Product/Name,Pset_x0020_MEP/Geom_x002D_Ø_x0028_mm_x0029_"),
      top: z.number().int().positive().optional().describe("Max rows returned"),
      skip: z.number().int().nonnegative().optional().describe("Skip rows for pagination"),
    },
    async ({ region, versionId, endpoint, odataFilter, odataApply, fields, top, skip }, extra) => {
      const token = getToken(extra);
      const query: Record<string, string> = {};
      if (odataFilter) query["$filter"] = odataFilter;
      if (odataApply) query["$apply"] = odataApply;
      if (fields) query.fields = fields;
      if (top !== undefined) query["$top"] = String(top);
      if (skip !== undefined) query["$skip"] = String(skip);

      const path =
        endpoint === "aggregate"
          ? `/models/${encodeURIComponent(versionId)}/entities/aggregate`
          : `/models/${encodeURIComponent(versionId)}/entities`;

      const result = await tcApiCall({
        method: "GET",
        region: region as Region,
        path,
        apiType: "model",
        query,
        authToken: token,
      });

      const text = typeof result.body === "string" ? result.body : JSON.stringify(result.body, null, 2);
      const summary = `GET ${path} → ${result.status} ${result.statusText}`;
      if (result.status >= 400) {
        return { content: [{ type: "text" as const, text: `ERROR: ${summary}\n\n${text}` }], isError: true };
      }
      return { content: [{ type: "text" as const, text: `${summary}\n\n${text}` }] };
    }
  );
}
