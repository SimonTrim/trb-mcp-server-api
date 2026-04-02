# Trimble Connect MCP Server

MCP (Model Context Protocol) server exposing all **Trimble Connect for Browser APIs** documentation. Designed for AI-assisted development of Trimble Connect extensions and applications.

## What's included

This MCP server provides structured, searchable documentation for **200+ API endpoints** across the entire Trimble Connect platform:

| Category | Description |
|----------|-------------|
| **Workspace API** | SDK connection, namespaces (project, user, extension, ui, viewer, embed), events |
| **REST API (Core v2.0)** | Projects, files, folders, todos, views, search, regions |
| **REST API Extended** | Activities, clashes (full CRUD), 2D views, comments, companies, groups, object links, object sync, releases, shares, tags, users, view groups, extended files/folders/projects/views endpoints |
| **BCF API** | BIM Collaboration Format — topics, comments, viewpoints |
| **Viewer 3D API** | Camera, selection, objects, models, hierarchy, section planes, icons, layers, point clouds |
| **Markup API** | Annotations — text, arrows, lines, clouds, measurements, points, freelines |
| **View API** | Saved 3D views (CRUD via Workspace API) |
| **Panels API** | PropertyPanel, DataTable, ModelsPanel |
| **Authentication** | OAuth 2.0, integrated mode (Workspace API), standalone mode, token management |
| **Regions** | URLs per region (US, EU, APAC, AU) for Core API and BCF API |
| **Extensions** | Types (project, viewer3d, embedded), manifests, installation guide |
| **Property Set Service** | Custom property sets for BIM model objects, libraries, definitions, instances |
| **Trimble Connect SDK** | `trimble-connect-sdk` npm package — TCPS Client, Organizer (LBS/WBS), PSet SDK, Credentials |
| **TypeScript Types** | All interfaces (Vector3, Camera, ObjectProperties, BCFTopic, ViewerSelection, etc.) |
| **Project Setup** | Architecture, folder structure, backend proxy, Vite config, deployment |
| **Code Examples** | Extension skeletons, React hooks, ViewerBridge pattern, annotation workflow |
| **Pitfalls** | Common bugs and validated solutions for Trimble Connect extensions |

## Available tools

| Tool | Description |
|------|-------------|
| `search_trimble_connect_docs` | Full-text search across all documentation |
| `get_api_reference` | Get complete reference for a specific API category |
| `get_extension_starter` | Get a starter template for a new extension (project/viewer3d/embedded) |
| `get_viewer_api_guide` | Get detailed guide for a specific Viewer 3D topic |
| `list_available_docs` | List all available documentation sections |

## Installation

### Prerequisites

- Node.js >= 18
- npm

### Build from source

```bash
git clone https://github.com/YOUR_USERNAME/trb-mcp-server-api.git
cd trb-mcp-server-api
npm install
npm run build
```

## Configuration

### Cursor IDE

Add to your Cursor MCP settings (`.cursor/mcp.json` or global settings):

```json
{
  "mcpServers": {
    "trimble-connect": {
      "command": "node",
      "args": ["C:/path/to/trb-mcp-server-api/dist/index.js"]
    }
  }
}
```

### Claude Desktop

Add to your Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "trimble-connect": {
      "command": "node",
      "args": ["C:/path/to/trb-mcp-server-api/dist/index.js"]
    }
  }
}
```

### VS Code (Copilot)

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "trimble-connect": {
      "command": "node",
      "args": ["C:/path/to/trb-mcp-server-api/dist/index.js"]
    }
  }
}
```

## Usage examples

Once configured, the AI assistant can use these tools:

**Search for specific API methods:**
> "Search Trimble Connect docs for viewer selection"

**Get a complete API reference:**
> "Get the viewer-api reference"

**Start a new extension project:**
> "Get the extension starter for a viewer3d extension with React"

**Get specific viewer API guide:**
> "Get the viewer API guide for hierarchy"

**List all available docs:**
> "List all available Trimble Connect documentation"

## Project structure

```
trb-mcp-server-api/
├── src/
│   ├── index.ts                  # MCP server entry point
│   └── data/                     # Structured documentation
│       ├── workspace-api.ts      # Workspace API reference
│       ├── rest-api.ts           # REST API Core v2.0 (basic)
│       ├── rest-api-extended.ts  # REST API extended (activities, clashes, comments, companies, groups, etc.)
│       ├── bcf-api.ts            # BCF Topics API
│       ├── viewer-api.ts         # Viewer 3D API
│       ├── markup-api.ts         # Markup/Annotations API
│       ├── view-api.ts           # View API
│       ├── panels-api.ts         # PropertyPanel, DataTable, ModelsPanel
│       ├── auth.ts               # Authentication (OAuth, tokens)
│       ├── regions.ts            # Region URLs
│       ├── extensions.ts         # Extension types, manifests, embedded
│       ├── sdk.ts                # trimble-connect-sdk (TCPS, Organizer, PSet)
│       ├── typescript-types.ts   # TypeScript interfaces
│       ├── project-setup.ts      # Architecture, proxy, Vite, deployment
│       ├── code-examples.ts      # Code skeletons and patterns
│       ├── property-set.ts       # Property Set Service
│       └── pitfalls.ts           # Common pitfalls and solutions
├── dist/                         # Compiled output
├── package.json
├── tsconfig.json
└── README.md
```

## Updating documentation

To add or update API documentation:

1. Edit the relevant file in `src/data/`
2. Run `npm run build`
3. Restart the MCP server (or reconnect in Cursor)

## Source documentation

- [Workspace API — npm](https://www.npmjs.com/package/trimble-connect-workspace-api)
- [Workspace API — Reference](https://components.connect.trimble.com/trimble-connect-workspace-api/index.html)
- [Core API — Developer docs](https://developer.trimble.com/docs/connect/core)
- [BCF Topics — Swagger](https://app.swaggerhub.com/apis/Trimble-Connect/topic/v2)
- [Modus 2.0 — Design System](https://modus.trimble.com/)
- [Developer Portal](https://developer.trimble.com/)

## License

MIT
