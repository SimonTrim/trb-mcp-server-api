export const restApiDocs = {
  overview: `# Trimble Connect REST API (Core v2.0)

## Base URL by Region

| Region | Code | Production Host | Base URL |
|--------|------|-----------------|----------|
| North America | us | app.connect.trimble.com | https://app.connect.trimble.com/tc/api/2.0 |
| Europe | eu | app21.connect.trimble.com | https://app21.connect.trimble.com/tc/api/2.0 |
| Asia-Pacific | ap | app31.connect.trimble.com | https://app31.connect.trimble.com/tc/api/2.0 |
| Australia | ap-au | app32.connect.trimble.com | https://app32.connect.trimble.com/tc/api/2.0 |

**Staging:**
| Region | Staging Host |
|--------|-------------|
| US | app.stage.connect.trimble.com |
| EU | app21.stage.connect.trimble.com |
| AP | app31.stage.connect.trimble.com |
| AU | app32.stage.connect.trimble.com |

## Location → Region Mapping

\`\`\`typescript
function getRegionCode(location: string): string {
  const loc = location.toLowerCase();
  if (loc === 'northamerica' || loc === 'us') return 'us';
  if (loc === 'europe' || loc === 'eu') return 'eu';
  if (loc === 'asia' || loc === 'ap') return 'ap';
  if (loc === 'australia' || loc === 'ap-au') return 'ap-au';
  return 'us';
}
\`\`\`

## Required Headers

\`\`\`
Authorization: Bearer {access_token}
Content-Type: application/json
\`\`\``,

  projects: `# Project Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /projects | List user's projects |
| GET | /projects/{projectId} | Get project details |
| GET | /projects/{projectId}/users | Get project members |
| POST | /projects | Create a project |
| PUT | /projects/{projectId} | Update a project |
| DELETE | /projects/{projectId} | Delete a project |`,

  files: `# File / Document Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /search?query=*&projectId={id}&type=FILE | Search files (recommended) |
| GET | /sync/{projectId}?excludeVersion=true | Full project sync (fallback) |
| GET | /folders/{folderId}/items | Folder contents |
| GET | /folders/{folderId} | Folder details (name, parentId) |
| GET | /files/{fileId} | File details |
| GET | /files/{fileId}/versions | File versions |
| GET | /files/{fileId}/downloadurl | Download URL |
| POST | /files | Upload a file |
| PATCH | /files/{fileId} | Update a file (e.g. move via { parentId }) |
| DELETE | /files/{fileId} | Delete a file |

> The search endpoint is the most reliable for retrieving files.

## Move a File (VERIFIED)

\`\`\`http
PATCH /tc/api/2.0/files/{fileId}
Authorization: Bearer {token}
Content-Type: application/json

{ "parentId": "{targetFolderId}" }
\`\`\`

**Cascade strategies:**
1. PATCH /files/{fileId} with { parentId } — Native TC API (recommended)
2. PATCH /projects/{projectId}/files/{fileId} with { parentId } — Project-scoped variant
3. Copy + delete

> The endpoints /files/{fileId}/content and /files/{fileId}/download are REMOVED (status 400).

## 2D Viewer (PDF, DOC, DWG, images)

\`\`\`
https://web.connect.trimble.com/projects/{projectId}/viewer/2D?id={versionId}&version={versionId}&type=revisions&etag={versionId}
\`\`\`

## 3D Viewer (IFC, RVT, SKP, NWD)

\`\`\`
https://web.connect.trimble.com/projects/{projectId}/viewer/3d/?modelId={fileId}&l=&origin={tcHost}
\`\`\`

## Path Field Normalization

\`\`\`javascript
function normalizeTcPath(rawPath) {
  if (!rawPath) return '';
  if (typeof rawPath === 'string') return rawPath;
  if (Array.isArray(rawPath)) {
    return rawPath
      .map(segment => {
        if (typeof segment === 'string') return segment;
        if (segment && typeof segment === 'object') return segment.name || '';
        return '';
      })
      .filter(Boolean)
      .join(' / ');
  }
  return '';
}
\`\`\``,

  todos: `# Notes / Todos Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /todos?projectId={id} | List project todos |
| GET | /todos/{todoId} | Get todo details |
| POST | /todos | Create a todo |
| PUT | /todos/{todoId} | Update a todo |
| DELETE | /todos/{todoId} | Delete a todo |

**Todo Structure:**
\`\`\`json
{
  "id": "...",
  "label": "Note title",
  "description": "Content",
  "createdBy": "user@email.com",
  "createdOn": "2025-01-01T00:00:00Z",
  "modifiedOn": "2025-01-02T00:00:00Z",
  "done": false,
  "projectId": "..."
}
\`\`\``,

  views: `# 3D Views Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /views?projectId={id} | List saved views |
| GET | /views/{viewId} | Get view details |
| GET | /views/{viewId}/thumbnail | View thumbnail (image, requires auth) |
| POST | /views | Create a view |
| DELETE | /views/{viewId} | Delete a view |

> The views endpoint uses a projectId query parameter, not a path parameter.`,

  clashSets: `# Clash Sets Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /clashsets?projectId={id} | List clash sets |
| GET | /clashsets/{clashSetId} | Get clash set details |
| GET | /clashsets/{clashSetId}/results | Clash results |`,

  regions: `# Regions Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /regions | List available regions |`,
};
