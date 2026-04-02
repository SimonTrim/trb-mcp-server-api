export const extensionsDocs = {
  types: `# Trimble Connect Extension Types

## Project Extension

The extension is displayed in the left side panel of Trimble Connect.

- **Location**: center + right panel of the Project page
- **Menu**: appears in the left navigation
- **Use cases**: Dashboards, document management, reports, forms, workflows

## 3D Viewer Extension

The extension is displayed in a side panel of the 3D Viewer.

- **Location**: panel in the 3D Viewer
- **Access**: all Viewer APIs (camera, selection, objects, section planes, etc.)
- **Use cases**: Model analysis, annotations, clash detection, QA/QC, measurements

## Embedded Components

Integrate Trimble Connect components into your own web application.

| Component | Init Method | Description |
|-----------|-------------|-------------|
| 3D Viewer | embed.init3DViewer() | Embedded 3D Viewer |
| File Explorer | embed.initFileExplorer() | Embedded file explorer |
| Project List | embed.initProjectList() | Embedded project list |

**Embed URL**: https://web.connect.trimble.com/?isEmbedded=true`,

  manifests: `# Extension Manifests

## Project Extension Manifest

\`\`\`json
{
  "icon": "https://myapp.com/icon-48.png",
  "title": "Extension Name",
  "url": "https://myapp.com/index.html",
  "description": "Description visible in project settings",
  "configCommand": "open_settings",
  "enabled": true
}
\`\`\`

| Field | Required | Description |
|-------|----------|-------------|
| title | Yes | Title displayed in Settings > Extensions |
| url | Yes | URL of the extension web application |
| icon | No | Icon URL (recommended: 48x48 PNG) |
| description | No | Short description |
| configCommand | No | Command sent when ⚙️ is clicked |
| enabled | No | true = immediately visible |

## 3D Viewer Extension Manifest

\`\`\`json
{
  "url": "https://myapp.com/viewer-ext/index.html",
  "title": "3D Viewer Extension",
  "icon": "https://myapp.com/icon.png",
  "infoUrl": "https://myapp.com/help.html"
}
\`\`\`

## Advanced Manifest (multi-extension)

\`\`\`json
{
  "name": "My Extension Pack",
  "version": "1.0.0",
  "api": "1.0",
  "extensions": [
    {
      "type": "projectModule",
      "id": "my-dashboard",
      "title": "Dashboard",
      "icon": "https://myapp.com/icon.png",
      "url": "https://myapp.com/dashboard/index.html"
    },
    {
      "type": "viewerModule",
      "id": "my-viewer-tool",
      "title": "3D Tool",
      "icon": "https://myapp.com/icon-3d.png",
      "url": "https://myapp.com/viewer-tool/index.html"
    }
  ],
  "permissions": ["project.read", "files.read", "bcf.read", "views.read"],
  "dependencies": {
    "@trimble/connect-workspace-api": "^2.0.0"
  }
}
\`\`\`

## Installing an Extension

1. Open a Trimble Connect project
2. Go to Settings > Extensions
3. Click Add a custom extension
4. Paste the manifest URL
5. Enable/disable via the toggle

> CORS: The manifest URL must be accessible via CORS from *.connect.trimble.com`,

  embedded: `# Embedded Components

## Embedded 3D Viewer

\`\`\`html
<iframe id="viewer" src="https://web.connect.trimble.com/?isEmbedded=true"></iframe>
<script src="https://components.connect.trimble.com/trimble-connect-workspace-api/index.js"></script>
<script>
  const viewer = document.getElementById('viewer');
  const API = await TrimbleConnectWorkspace.connect(viewer, onEvent);

  await API.embed.setTokens({ accessToken: 'xxx' });
  await API.embed.init3DViewer({
    projectId: 'xxx',
    modelId: 'yyy',
    viewId: 'zzz',
  });
</script>
\`\`\`

## Embedded File Explorer

\`\`\`javascript
const API = await TrimbleConnectWorkspace.connect(iframe, onEvent);
await API.embed.setTokens({ accessToken: 'xxx' });
await API.embed.initFileExplorer({
  projectId: 'xxx',
  folderId: 'yyy',
});
\`\`\`

## Embedded Project List

\`\`\`javascript
const API = await TrimbleConnectWorkspace.connect(iframe, onEvent);
await API.embed.setTokens({ accessToken: 'xxx' });
await API.embed.initProjectList({
  enableRegion: 'na',
  enableNewProject: true,
  enableCloneProject: true,
  enableLeaveProject: true,
  enableThumbnail: true,
  embedViewMode: 'list',
});
\`\`\`

## Token Management (embedded mode)

\`\`\`javascript
// Set tokens (REQUIRED before init)
await API.embed.setTokens({ accessToken: 'xxx' });

// Refresh tokens BEFORE expiration
// Listen for the 'extension.sessionInvalid' event for refresh
\`\`\``,
};
