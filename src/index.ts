#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  tcApiCall,
  storeSessionToken,
  getSessionToken,
  clearSessionToken,
  type Region,
  type ApiType,
  VALID_REGIONS,
  getCoreBaseUrl,
  getBcfBaseUrl,
} from "./tc-api-client.js";

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

  // ═══════════════════════════════════════════════════
  // API EXECUTION TOOLS — Call Trimble Connect APIs
  // ═══════════════════════════════════════════════════

  const regionEnum = z.enum(["us", "eu", "ap", "ap-au"]).describe("Trimble Connect region: us (North America), eu (Europe), ap (Asia-Pacific), ap-au (Australia)");

  function getToken(extra: { sessionId?: string }): string {
    const token = extra.sessionId ? getSessionToken(extra.sessionId) : undefined;
    if (!token) throw new Error("No auth token available. Configure the MCP tool in Trimble Agent Studio with an Authorization header: Bearer {actorToken?scopes=openid tc}");
    return token;
  }

  srv.tool(
    "tc_api_call",
    "Execute any Trimble Connect REST API call. Use the documentation tools first to find the right endpoint, then use this tool to execute it. Supports Core API and BCF API.",
    {
      method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).describe("HTTP method"),
      region: regionEnum,
      path: z.string().describe("API path (e.g. /projects, /files/{fileId}, /todos). Do NOT include the base URL."),
      apiType: z.enum(["core", "bcf"]).default("core").describe("API type: core (/tc/api/2.0) or bcf (/bcf/2.1)"),
      query: z.record(z.string(), z.string()).optional().describe("Query parameters as key-value pairs (e.g. {projectId: '...', type: 'FILE'})"),
      body: z.any().optional().describe("Request body for POST/PUT/PATCH (JSON object)"),
    },
    async ({ method, region, path, apiType, query, body }, extra) => {
      const token = getToken(extra);
      const result = await tcApiCall({ method, region: region as Region, path, apiType: apiType as ApiType, query, body, authToken: token });
      const text = typeof result.body === "string" ? result.body : JSON.stringify(result.body, null, 2);
      const summary = `${method} ${path} → ${result.status} ${result.statusText}`;
      if (result.status >= 400) {
        return { content: [{ type: "text" as const, text: `ERROR: ${summary}\n\n${text}` }], isError: true };
      }
      return { content: [{ type: "text" as const, text: `${summary}\n\n${text}` }] };
    }
  );

  srv.tool(
    "tc_get_regions",
    "Get all available Trimble Connect regions and their API base URLs. Call this first to determine which region a project is in.",
    {},
    async (_args, extra) => {
      const token = getToken(extra);
      const result = await tcApiCall({ method: "GET", region: "us", path: "/regions", authToken: token });
      const regionInfo = VALID_REGIONS.map((r) => `- **${r}**: Core=${getCoreBaseUrl(r as Region)}, BCF=${getBcfBaseUrl(r as Region)}`).join("\n");
      const text = typeof result.body === "string" ? result.body : JSON.stringify(result.body, null, 2);
      return { content: [{ type: "text" as const, text: `# Trimble Connect Regions\n\n${regionInfo}\n\n## API Response:\n${text}` }] };
    }
  );

  srv.tool(
    "tc_get_current_user",
    "Get the current authenticated user's profile information.",
    { region: regionEnum.default("us") },
    async ({ region }, extra) => {
      const token = getToken(extra);
      const result = await tcApiCall({ method: "GET", region: region as Region, path: "/users/me", authToken: token });
      const text = typeof result.body === "string" ? result.body : JSON.stringify(result.body, null, 2);
      return { content: [{ type: "text" as const, text: text }] };
    }
  );

  srv.tool(
    "tc_list_projects",
    "List all projects the authenticated user has access to in a given region.",
    {
      region: regionEnum,
      fullyLoaded: z.boolean().default(false).describe("If true, return full project details including rootId"),
    },
    async ({ region, fullyLoaded }, extra) => {
      const token = getToken(extra);
      const query: Record<string, string> = {};
      if (fullyLoaded) query.fullyLoaded = "true";
      const result = await tcApiCall({ method: "GET", region: region as Region, path: "/projects", query, authToken: token });
      const text = typeof result.body === "string" ? result.body : JSON.stringify(result.body, null, 2);
      return { content: [{ type: "text" as const, text: text }] };
    }
  );

  srv.tool(
    "tc_get_project",
    "Get details of a specific project.",
    {
      region: regionEnum,
      projectId: z.string().describe("Project ID"),
    },
    async ({ region, projectId }, extra) => {
      const token = getToken(extra);
      const result = await tcApiCall({ method: "GET", region: region as Region, path: `/projects/${projectId}`, authToken: token });
      const text = typeof result.body === "string" ? result.body : JSON.stringify(result.body, null, 2);
      return { content: [{ type: "text" as const, text: text }] };
    }
  );

  srv.tool(
    "tc_create_project",
    "Create a new project in Trimble Connect.",
    {
      region: regionEnum,
      name: z.string().describe("Project name"),
      description: z.string().optional().describe("Project description"),
    },
    async ({ region, name, description }, extra) => {
      const token = getToken(extra);
      const body: Record<string, string> = { name };
      if (description) body.description = description;
      const result = await tcApiCall({ method: "POST", region: region as Region, path: "/projects", body, authToken: token });
      const text = typeof result.body === "string" ? result.body : JSON.stringify(result.body, null, 2);
      return { content: [{ type: "text" as const, text: text }] };
    }
  );

  srv.tool(
    "tc_list_project_users",
    "List all members of a project.",
    {
      region: regionEnum,
      projectId: z.string().describe("Project ID"),
    },
    async ({ region, projectId }, extra) => {
      const token = getToken(extra);
      const result = await tcApiCall({ method: "GET", region: region as Region, path: `/projects/${projectId}/users`, authToken: token });
      const text = typeof result.body === "string" ? result.body : JSON.stringify(result.body, null, 2);
      return { content: [{ type: "text" as const, text: text }] };
    }
  );

  srv.tool(
    "tc_search_files",
    "Search for files in a project.",
    {
      region: regionEnum,
      projectId: z.string().describe("Project ID"),
      query: z.string().default("*").describe("Search query (use * for all files)"),
      type: z.enum(["FILE", "FOLDER"]).default("FILE").describe("Object type to search for"),
    },
    async ({ region, projectId, query: q, type: t }, extra) => {
      const token = getToken(extra);
      const result = await tcApiCall({ method: "GET", region: region as Region, path: "/search", query: { query: q, projectId, type: t }, authToken: token });
      const text = typeof result.body === "string" ? result.body : JSON.stringify(result.body, null, 2);
      return { content: [{ type: "text" as const, text: text }] };
    }
  );

  srv.tool(
    "tc_get_folder_contents",
    "List the contents (files and subfolders) of a folder.",
    {
      region: regionEnum,
      folderId: z.string().describe("Folder ID (use project's rootId for root folder)"),
    },
    async ({ region, folderId }, extra) => {
      const token = getToken(extra);
      const result = await tcApiCall({ method: "GET", region: region as Region, path: `/folders/${folderId}/items`, authToken: token });
      const text = typeof result.body === "string" ? result.body : JSON.stringify(result.body, null, 2);
      return { content: [{ type: "text" as const, text: text }] };
    }
  );

  srv.tool(
    "tc_get_file",
    "Get details of a specific file including versions and download URL.",
    {
      region: regionEnum,
      fileId: z.string().describe("File ID"),
      includeDownloadUrl: z.boolean().default(false).describe("If true, also fetch the download URL"),
    },
    async ({ region, fileId, includeDownloadUrl }, extra) => {
      const token = getToken(extra);
      const result = await tcApiCall({ method: "GET", region: region as Region, path: `/files/${fileId}`, authToken: token });
      let text = typeof result.body === "string" ? result.body : JSON.stringify(result.body, null, 2);
      if (includeDownloadUrl) {
        const dlResult = await tcApiCall({ method: "GET", region: region as Region, path: `/files/${fileId}/downloadurl`, authToken: token });
        const dlText = typeof dlResult.body === "string" ? dlResult.body : JSON.stringify(dlResult.body, null, 2);
        text += `\n\n## Download URL:\n${dlText}`;
      }
      return { content: [{ type: "text" as const, text: text }] };
    }
  );

  srv.tool(
    "tc_list_todos",
    "List all todos/notes in a project.",
    {
      region: regionEnum,
      projectId: z.string().describe("Project ID"),
    },
    async ({ region, projectId }, extra) => {
      const token = getToken(extra);
      const result = await tcApiCall({ method: "GET", region: region as Region, path: "/todos", query: { projectId }, authToken: token });
      const text = typeof result.body === "string" ? result.body : JSON.stringify(result.body, null, 2);
      return { content: [{ type: "text" as const, text: text }] };
    }
  );

  srv.tool(
    "tc_create_todo",
    "Create a new todo/note in a project.",
    {
      region: regionEnum,
      projectId: z.string().describe("Project ID"),
      label: z.string().describe("Todo title"),
      description: z.string().optional().describe("Todo description/content"),
    },
    async ({ region, projectId, label, description }, extra) => {
      const token = getToken(extra);
      const body: Record<string, unknown> = { label, projectId };
      if (description) body.description = description;
      const result = await tcApiCall({ method: "POST", region: region as Region, path: "/todos", body, authToken: token });
      const text = typeof result.body === "string" ? result.body : JSON.stringify(result.body, null, 2);
      return { content: [{ type: "text" as const, text: text }] };
    }
  );

  srv.tool(
    "tc_update_todo",
    "Update an existing todo/note.",
    {
      region: regionEnum,
      todoId: z.string().describe("Todo ID"),
      label: z.string().optional().describe("New title"),
      description: z.string().optional().describe("New description"),
      done: z.boolean().optional().describe("Mark as done or not done"),
    },
    async ({ region, todoId, label, description, done }, extra) => {
      const token = getToken(extra);
      const body: Record<string, unknown> = {};
      if (label !== undefined) body.label = label;
      if (description !== undefined) body.description = description;
      if (done !== undefined) body.done = done;
      const result = await tcApiCall({ method: "PUT", region: region as Region, path: `/todos/${todoId}`, body, authToken: token });
      const text = typeof result.body === "string" ? result.body : JSON.stringify(result.body, null, 2);
      return { content: [{ type: "text" as const, text: text }] };
    }
  );

  srv.tool(
    "tc_list_views",
    "List all 3D views saved in a project.",
    {
      region: regionEnum,
      projectId: z.string().describe("Project ID"),
    },
    async ({ region, projectId }, extra) => {
      const token = getToken(extra);
      const result = await tcApiCall({ method: "GET", region: region as Region, path: "/views", query: { projectId }, authToken: token });
      const text = typeof result.body === "string" ? result.body : JSON.stringify(result.body, null, 2);
      return { content: [{ type: "text" as const, text: text }] };
    }
  );

  srv.tool(
    "tc_list_clashsets",
    "List all clash sets in a project.",
    {
      region: regionEnum,
      projectId: z.string().describe("Project ID"),
    },
    async ({ region, projectId }, extra) => {
      const token = getToken(extra);
      const result = await tcApiCall({ method: "GET", region: region as Region, path: "/clashsets", query: { projectId }, authToken: token });
      const text = typeof result.body === "string" ? result.body : JSON.stringify(result.body, null, 2);
      return { content: [{ type: "text" as const, text: text }] };
    }
  );

  srv.tool(
    "tc_list_activities",
    "List recent activities in a project (audit trail).",
    {
      region: regionEnum,
      projectId: z.string().describe("Project ID"),
      pageSize: z.number().default(20).describe("Number of activities to return"),
    },
    async ({ region, projectId, pageSize }, extra) => {
      const token = getToken(extra);
      const result = await tcApiCall({
        method: "POST", region: region as Region, path: "/activities/list",
        body: { objectType: "PROJECT", objectId: projectId, pageSize },
        authToken: token,
      });
      const text = typeof result.body === "string" ? result.body : JSON.stringify(result.body, null, 2);
      return { content: [{ type: "text" as const, text: text }] };
    }
  );

  srv.tool(
    "tc_bcf_list_topics",
    "List BCF topics (issues) in a project.",
    {
      region: regionEnum,
      projectId: z.string().describe("Project ID"),
    },
    async ({ region, projectId }, extra) => {
      const token = getToken(extra);
      const result = await tcApiCall({ method: "GET", region: region as Region, path: `/projects/${projectId}/topics`, apiType: "bcf", authToken: token });
      const text = typeof result.body === "string" ? result.body : JSON.stringify(result.body, null, 2);
      return { content: [{ type: "text" as const, text: text }] };
    }
  );

  srv.tool(
    "tc_bcf_create_topic",
    "Create a new BCF topic (issue) in a project.",
    {
      region: regionEnum,
      projectId: z.string().describe("Project ID"),
      title: z.string().describe("Topic title"),
      description: z.string().optional().describe("Topic description"),
      topicType: z.string().optional().describe("Topic type (e.g. 'Issue', 'Request', 'Comment')"),
      priority: z.string().optional().describe("Priority (e.g. 'Critical', 'Major', 'Normal', 'Minor')"),
      assignedTo: z.string().optional().describe("Email of the user to assign the topic to"),
    },
    async ({ region, projectId, title, description, topicType, priority, assignedTo }, extra) => {
      const token = getToken(extra);
      const body: Record<string, unknown> = { title };
      if (description) body.description = description;
      if (topicType) body.topic_type = topicType;
      if (priority) body.priority = priority;
      if (assignedTo) body.assigned_to = assignedTo;
      const result = await tcApiCall({ method: "POST", region: region as Region, path: `/projects/${projectId}/topics`, apiType: "bcf", body, authToken: token });
      const text = typeof result.body === "string" ? result.body : JSON.stringify(result.body, null, 2);
      return { content: [{ type: "text" as const, text: text }] };
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

    // ── Transport state ──
    const transports: Record<string, StreamableHTTPServerTransport> = {};
    const sseTransports: Record<string, { server: McpServer; transport: SSEServerTransport }> = {};

    const handleMcpPost = async (req: express.Request, res: express.Response) => {
      try {
        const sessionId = req.headers["mcp-session-id"] as string | undefined;

        // Capture auth token from every request (Agent Studio injects it)
        const authHeader = req.headers["authorization"] as string | undefined;
        if (authHeader && sessionId) {
          const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
          storeSessionToken(sessionId, token);
        }

        if (sessionId && transports[sessionId]) {
          await transports[sessionId].handleRequest(req, res, req.body);
          return;
        }

        if (!sessionId && isInitializeRequest(req.body)) {
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (sid) => {
              transports[sid] = transport;
              // Store token for the new session too
              if (authHeader) {
                const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
                storeSessionToken(sid, token);
              }
            },
          });

          transport.onclose = () => {
            const sid = transport.sessionId;
            if (sid) {
              delete transports[sid];
              clearSessionToken(sid);
            }
          };

          const sessionServer = createServer();
          await sessionServer.connect(transport);
          await transport.handleRequest(req, res, req.body);
          return;
        }

        res.status(400).json({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Bad Request: No valid session ID provided" },
          id: null,
        });
      } catch (error) {
        console.error("POST error:", error);
        if (!res.headersSent) {
          res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: String(error) }, id: null });
        }
      }
    };

    const handleMcpGet = async (req: express.Request, res: express.Response) => {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      if (sessionId && transports[sessionId]) {
        await transports[sessionId].handleRequest(req, res);
        return;
      }
      const transport = new SSEServerTransport("/messages", res);
      const sessionServer = createServer();
      sseTransports[transport.sessionId] = { server: sessionServer, transport };
      res.on("close", () => { delete sseTransports[transport.sessionId]; });
      await sessionServer.connect(transport);
    };

    const handleMcpDelete = async (req: express.Request, res: express.Response) => {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      if (sessionId && transports[sessionId]) {
        await transports[sessionId].handleRequest(req, res);
        delete transports[sessionId];
      } else {
        res.status(400).json({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Bad Request: No valid session ID" },
          id: null,
        });
      }
    };

    app.post("/mcp", handleMcpPost);
    app.get("/mcp", handleMcpGet);
    app.delete("/mcp", handleMcpDelete);

    app.post("/", handleMcpPost);
    app.get("/", handleMcpGet);
    app.delete("/", handleMcpDelete);

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
      console.error(`Trimble Connect MCP Server (HTTP) running on port ${port}`);

      // Keep-alive: ping ourselves every 13 minutes to prevent Render free tier from sleeping
      const KEEP_ALIVE_MS = 13 * 60 * 1000;
      const selfUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`;
      setInterval(async () => {
        try {
          await fetch(`${selfUrl}/health`);
        } catch { /* ignore */ }
      }, KEEP_ALIVE_MS);
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
