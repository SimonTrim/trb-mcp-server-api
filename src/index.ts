#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { workspaceApiDocs } from "./data/workspace-api.js";
import { restApiDocs } from "./data/rest-api.js";
import { bcfApiDocs } from "./data/bcf-api.js";
import { viewerApiDocs } from "./data/viewer-api.js";
import { markupApiDocs } from "./data/markup-api.js";
import { viewApiDocs } from "./data/view-api.js";
import { panelsApiDocs } from "./data/panels-api.js";
import { authDocs } from "./data/auth.js";
import { regionsDocs } from "./data/regions.js";
import { extensionsDocs } from "./data/extensions.js";
import { typescriptTypes } from "./data/typescript-types.js";
import { projectSetupDocs } from "./data/project-setup.js";
import { codeExamples } from "./data/code-examples.js";
import { propertySetDocs } from "./data/property-set.js";
import { pitfallsDocs } from "./data/pitfalls.js";
import { restApiExtendedDocs } from "./data/rest-api-extended.js";
import { sdkDocs } from "./data/sdk.js";

// Build a flat searchable index of all documentation sections
interface DocSection {
  category: string;
  key: string;
  title: string;
  content: string;
}

function buildDocIndex(): DocSection[] {
  const sections: DocSection[] = [];

  const addSections = (category: string, obj: Record<string, string> | string) => {
    if (typeof obj === "string") {
      sections.push({
        category,
        key: category,
        title: category,
        content: obj,
      });
    } else {
      for (const [key, content] of Object.entries(obj)) {
        const titleMatch = content.match(/^#\s+(.+)/m);
        sections.push({
          category,
          key,
          title: titleMatch?.[1] ?? key,
          content,
        });
      }
    }
  };

  addSections("workspace-api", workspaceApiDocs);
  addSections("rest-api", restApiDocs);
  addSections("bcf-api", bcfApiDocs);
  addSections("viewer-api", viewerApiDocs);
  addSections("markup-api", markupApiDocs);
  addSections("view-api", viewApiDocs);
  addSections("panels-api", panelsApiDocs);
  addSections("auth", authDocs);
  addSections("regions", regionsDocs);
  addSections("extensions", extensionsDocs);
  addSections("typescript-types", typescriptTypes);
  addSections("project-setup", projectSetupDocs);
  addSections("code-examples", codeExamples);
  addSections("property-set", propertySetDocs);
  addSections("pitfalls", pitfallsDocs);
  addSections("rest-api-extended", restApiExtendedDocs);
  addSections("sdk", sdkDocs);

  return sections;
}

const docIndex = buildDocIndex();

// ── MCP Server Factory ──

const apiCategories = [
  "workspace-api",
  "rest-api",
  "rest-api-extended",
  "bcf-api",
  "viewer-api",
  "markup-api",
  "view-api",
  "panels-api",
  "auth",
  "regions",
  "extensions",
  "typescript-types",
  "project-setup",
  "code-examples",
  "property-set",
  "pitfalls",
  "sdk",
] as const;

function createServer(): McpServer {
  const srv = new McpServer({
    name: "trimble-connect-api",
    version: "1.0.0",
  });

  srv.tool(
    "search_trimble_connect_docs",
    "Search across all Trimble Connect for Browser API documentation. Returns matching sections with code examples.",
    {
      query: z.string().describe("Search query — keywords or question about Trimble Connect APIs"),
    },
    async ({ query }) => {
      const terms = query.toLowerCase().split(/\s+/);
      const scored = docIndex
        .map((section) => {
          const text = (section.content + " " + section.title + " " + section.category).toLowerCase();
          let score = 0;
          for (const term of terms) {
            if (text.includes(term)) score++;
            if (section.title.toLowerCase().includes(term)) score += 2;
            if (section.category.toLowerCase().includes(term)) score += 1;
          }
          return { section, score };
        })
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      if (scored.length === 0) {
        return {
          content: [{ type: "text" as const, text: `No results found for "${query}". Try broader terms like: workspace-api, viewer, rest-api, bcf, markup, auth, regions, extensions, property-set, typescript-types, project-setup, code-examples, pitfalls` }],
        };
      }

      const results = scored
        .map((s) => `## [${s.section.category}/${s.section.key}] ${s.section.title}\n\n${s.section.content}`)
        .join("\n\n---\n\n");

      return { content: [{ type: "text" as const, text: results }] };
    }
  );

  srv.tool(
    "get_api_reference",
    "Get the complete reference documentation for a specific Trimble Connect API category.",
    {
      category: z.enum(apiCategories).describe("API category to retrieve"),
      section: z.string().optional().describe("Optional: specific section within the category"),
    },
    async ({ category, section }) => {
      const matching = docIndex.filter((s) => s.category === category);
      if (matching.length === 0) {
        return { content: [{ type: "text" as const, text: `Category "${category}" not found. Available: ${apiCategories.join(", ")}` }] };
      }
      if (section) {
        const specific = matching.find((s) => s.key.toLowerCase() === section.toLowerCase() || s.title.toLowerCase().includes(section.toLowerCase()));
        if (specific) return { content: [{ type: "text" as const, text: specific.content }] };
        return { content: [{ type: "text" as const, text: `Section "${section}" not found in ${category}. Available: ${matching.map((s) => s.key).join(", ")}` }] };
      }
      return { content: [{ type: "text" as const, text: matching.map((s) => s.content).join("\n\n---\n\n") }] };
    }
  );

  srv.tool(
    "get_extension_starter",
    "Get a complete starter template for a Trimble Connect extension.",
    {
      type: z.enum(["project", "viewer3d", "embedded"]).describe("Type of extension"),
      framework: z.enum(["vanilla", "react"]).optional().describe("Framework to use. Default: vanilla TypeScript"),
    },
    async ({ type, framework = "vanilla" }) => {
      const parts: string[] = [];
      if (type === "embedded") { parts.push(extensionsDocs.embedded); }
      else { parts.push(extensionsDocs.manifests); }
      if (framework === "react" && type !== "embedded") { parts.push(codeExamples.reactHookPattern); parts.push(codeExamples.viewerBridge); }
      else if (type === "project") { parts.push(codeExamples.projectExtension); }
      else if (type === "viewer3d") { parts.push(codeExamples.viewerExtension); }
      parts.push(authDocs.integrated);
      parts.push(projectSetupDocs.projectStructure);
      if (framework === "react") parts.push(projectSetupDocs.viteConfig);
      parts.push(codeExamples.errorHandling);
      parts.push(regionsDocs.overview);
      return { content: [{ type: "text" as const, text: parts.join("\n\n---\n\n") }] };
    }
  );

  srv.tool(
    "get_viewer_api_guide",
    "Get a comprehensive guide for a specific Viewer 3D API topic.",
    {
      topic: z.enum(["camera","selection","objectState","models","sectionPlanes","snapshots","boundingBoxes","layers","icons","tools","objects","hierarchy","idConversion","placement","pointClouds","trimbim","markup-text","markup-arrow","markup-line","markup-cloud","markup-measurement","markup-all","view","units","annotation-workflow"]).describe("Viewer 3D API topic"),
    },
    async ({ topic }) => {
      const topicMap: Record<string, string> = {
        camera: viewerApiDocs.camera, selection: viewerApiDocs.selection, objectState: viewerApiDocs.objectState,
        models: viewerApiDocs.models, sectionPlanes: viewerApiDocs.sectionPlanes, snapshots: viewerApiDocs.snapshots,
        boundingBoxes: viewerApiDocs.boundingBoxes, layers: viewerApiDocs.layers, icons: viewerApiDocs.icons,
        tools: viewerApiDocs.tools, objects: viewerApiDocs.objects, hierarchy: viewerApiDocs.hierarchy,
        idConversion: viewerApiDocs.idConversion, placement: viewerApiDocs.placement, pointClouds: viewerApiDocs.pointClouds,
        trimbim: viewerApiDocs.trimbim, "markup-text": markupApiDocs.textMarkup, "markup-arrow": markupApiDocs.arrowMarkup,
        "markup-line": markupApiDocs.lineMarkup, "markup-cloud": markupApiDocs.cloudMarkup,
        "markup-measurement": markupApiDocs.measurementMarkup,
        "markup-all": [markupApiDocs.overview, markupApiDocs.interfaces, markupApiDocs.textMarkup, markupApiDocs.arrowMarkup, markupApiDocs.lineMarkup, markupApiDocs.cloudMarkup, markupApiDocs.measurementMarkup, markupApiDocs.removeMarkups].join("\n\n---\n\n"),
        view: viewApiDocs.overview, units: codeExamples.unitsConversion, "annotation-workflow": codeExamples.annotationWorkflow,
      };
      const doc = topicMap[topic];
      if (!doc) return { content: [{ type: "text" as const, text: `Topic "${topic}" not found. Available: ${Object.keys(topicMap).join(", ")}` }] };
      return { content: [{ type: "text" as const, text: doc }] };
    }
  );

  srv.tool(
    "list_available_docs",
    "List all available documentation categories and sections in this Trimble Connect MCP server.",
    {},
    async () => {
      const categories = new Map<string, string[]>();
      for (const section of docIndex) {
        if (!categories.has(section.category)) categories.set(section.category, []);
        categories.get(section.category)!.push(`  - ${section.key}: ${section.title}`);
      }
      const output = Array.from(categories.entries()).map(([cat, sections]) => `## ${cat}\n${sections.join("\n")}`).join("\n\n");
      return { content: [{ type: "text" as const, text: `# Trimble Connect API Documentation — Table of Contents\n\n${output}` }] };
    }
  );

  return srv;
}

// ═══════════════════════════════════════
// Start the server
// ═══════════════════════════════════════

async function main() {
  const isHttpMode = process.argv.includes("--http") || !!process.env.PORT;

  if (isHttpMode) {
    const app = express();
    app.use(cors());
    app.use(express.json());

    // ── Streamable HTTP transport at /mcp ──
    const sessions = new Map<string, { server: McpServer; transport: StreamableHTTPServerTransport }>();

    app.post("/mcp", async (req, res) => {
      try {
        const sessionId = req.headers["mcp-session-id"] as string | undefined;

        if (sessionId && sessions.has(sessionId)) {
          const { transport } = sessions.get(sessionId)!;
          await transport.handleRequest(req, res, req.body);
          return;
        }

        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
        });

        const sid = transport.sessionId!;
        const sessionServer = createServer();
        sessions.set(sid, { server: sessionServer, transport });

        transport.onclose = () => {
          sessions.delete(sid);
        };

        await sessionServer.connect(transport);
        await transport.handleRequest(req, res, req.body);
      } catch (error) {
        console.error("POST /mcp error:", error);
        if (!res.headersSent) {
          res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: String(error) }, id: null });
        }
      }
    });

    app.get("/mcp", async (req, res) => {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      if (!sessionId || !sessions.has(sessionId)) {
        res.status(400).json({ jsonrpc: "2.0", error: { code: -32000, message: "Bad Request: No valid session ID" }, id: null });
        return;
      }
      await sessions.get(sessionId)!.transport.handleRequest(req, res);
    });

    app.delete("/mcp", async (req, res) => {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      if (sessionId && sessions.has(sessionId)) {
        const { transport } = sessions.get(sessionId)!;
        await transport.handleRequest(req, res);
        sessions.delete(sessionId);
      } else {
        res.status(400).json({ jsonrpc: "2.0", error: { code: -32000, message: "Bad Request: No valid session ID" }, id: null });
      }
    });

    // ── SSE transport (legacy) at /sse ──
    const sseTransports: Record<string, { server: McpServer; transport: SSEServerTransport }> = {};

    app.get("/sse", async (req, res) => {
      const transport = new SSEServerTransport("/messages", res);
      const sessionServer = createServer();
      sseTransports[transport.sessionId] = { server: sessionServer, transport };
      res.on("close", () => { delete sseTransports[transport.sessionId]; });
      await sessionServer.connect(transport);
    });

    app.post("/messages", async (req, res) => {
      const sessionId = req.query.sessionId as string;
      const entry = sseTransports[sessionId];
      if (!entry) { res.status(400).json({ error: "No active session" }); return; }
      await entry.transport.handlePostMessage(req, res);
    });

    // ── Health check ──
    app.get("/health", (_req, res) => {
      res.json({ status: "ok", server: "trimble-connect-api", version: "1.0.0" });
    });

    const port = parseInt(process.env.PORT || "3001", 10);
    app.listen(port, () => {
      console.error(`Trimble Connect MCP Server (HTTP) running on:`);
      console.error(`  Streamable HTTP:  http://localhost:${port}/mcp`);
      console.error(`  SSE (legacy):     http://localhost:${port}/sse`);
      console.error(`  Health check:     http://localhost:${port}/health`);
    });
  } else {
    const stdioServer = createServer();
    const transport = new StdioServerTransport();
    await stdioServer.connect(transport);
    console.error("Trimble Connect MCP Server running on stdio");
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
