export const workspaceApiDocs = {
  overview: `# Workspace API — Trimble Connect for Browser

The Workspace API is the official SDK for creating Trimble Connect extensions.
Extensions are web applications loaded in <iframe> elements and communicate via window.postMessage() encapsulated by the SDK.

## Installation

**NPM:**
\`\`\`bash
npm install trimble-connect-workspace-api --save
\`\`\`

**CDN (without bundler):**
\`\`\`html
<script src="https://components.connect.trimble.com/trimble-connect-workspace-api/index.js"></script>
\`\`\`

**Additional script (extension in TC):**
\`\`\`html
<script src="https://app.connect.trimble.com/tc/static/5.0.0/tcw-extension-api.js"></script>
\`\`\`

## Connection

\`\`\`typescript
import * as WorkspaceAPI from 'trimble-connect-workspace-api';

// Extension mode (inside Trimble Connect)
const API = await WorkspaceAPI.connect(
  window.parent,
  (event: string, data: any) => { /* Event handler */ },
  30000 // timeout in ms
);

// Embedded mode (your app embeds TC)
const iframe = document.getElementById('viewer-iframe');
const API = await WorkspaceAPI.connect(iframe, onEvent);
\`\`\`

## Available API Namespaces

| Namespace | Interface | Description |
|-----------|-----------|-------------|
| API.project | ProjectAPI | Project info (id, name, location) |
| API.user | UserAPI | User info (settings, language) |
| API.extension | ExtensionAPI | Extension management (token, permissions, status) |
| API.ui | UIAPI | User interface (menus, theme) |
| API.viewer | ViewerAPI | 3D Viewer (camera, selection, objects) |
| API.view | ViewAPI | Saved views management |
| API.embed | EmbedAPI | Embedded components (init, tokens) |
| API.markup | MarkupAPI | Annotations/markups in the viewer |
| API.modelsPanel | ModelsPanelAPI | Models panel |
| API.propertyPanel | PropertyPanelAPI | Properties panel |
| API.dataTable | DataTableAPI | Data table |

npm package: trimble-connect-workspace-api v0.3.34
CDN: https://components.connect.trimble.com/trimble-connect-workspace-api/index.js
Official documentation: https://components.connect.trimble.com/trimble-connect-workspace-api/index.html`,

  projectApi: `# ProjectAPI

\`\`\`typescript
// Get current project info
const project = await API.project.getCurrentProject();
// Returns: { id: string, name: string, location: string, rootId: string }
// location = 'europe' | 'northAmerica' | 'asia' | 'australia'

// Get the project (alias)
const project = await API.project.getProject();
\`\`\``,

  userApi: `# UserAPI

\`\`\`typescript
// User settings
const settings = await API.user.getUserSettings();
// Returns: { language: string, ... }
\`\`\``,

  extensionApi: `# ExtensionAPI

\`\`\`typescript
// Request the access token
const token = await API.extension.requestPermission('accesstoken');
// 'pending' → waiting for user consent
// 'denied' → denied by the user
// '<token>' → valid JWT token

// Set a status message
API.extension.setStatusMessage('Loading...');

// Broadcast a message to all other extensions
await API.extension.broadcast({ type: 'myEvent', data: { /* ... */ } });

// Get host info (extension type)
const host = await API.extension.getHost();
// Returns: { name: ExtensionType } — 'project' | 'viewer3d' | ...

// Configure the extension programmatically
await API.extension.configure({
  url: 'https://myapp.com/index.html',
  title: 'My Extension',
});

// Navigate to a specific TC route
await API.extension.goTo('3d-viewer', { projectId: 'xxx', modelId: 'yyy' });

// Request focus (open the extension tab)
await API.extension.requestFocus();
\`\`\``,

  uiApi: `# UIAPI (Menus and interface)

\`\`\`typescript
// Set the extension side menu
API.ui.setMenu({
  title: 'My Extension',
  icon: 'https://myapp.com/icon.png',
  command: 'main_menu',
  subMenus: [
    { title: 'Sub-menu 1', icon: 'https://myapp.com/icon1.png', command: 'submenu_1' },
    { title: 'Sub-menu 2', icon: 'https://myapp.com/icon2.png', command: 'submenu_2' },
  ],
});

// Set the active menu item
API.ui.setActiveMenuItem('submenu_1');

// With dynamic query params
API.ui.setActiveMenuItem('submenu_1?id=123');

// Get all UI elements and their states
const uiElements = await API.ui.getUI();

// Modify the state of a UI element
await API.ui.setUI({ /* ElementState */ });

// Get available 3D Viewer tabs
const tabIds = await API.ui.getUITabIds();

// Open a specific viewer tab
await API.ui.openUITab(tabId, optionalArgs);

// Add a custom action to the file menu
await API.ui.addCustomFileAction([{ /* IFileActionConfig */ }]);
\`\`\``,

  events: `# Workspace API Events — Complete Reference

\`\`\`typescript
function onEvent(event: string, data: any) {
  switch (event) {
    // ═══ EXTENSION EVENTS (all types) ═══
    case 'extension.command':
      // Menu clicked — data = command string (e.g. 'submenu_1')
      break;
    case 'extension.accessToken':
      // New token — data = access token string
      break;
    case 'extension.userSettingsChanged':
      // User settings changed
      break;
    case 'extension.sessionInvalid':
      // Session expired (embedded mode) → call embed.setTokens()
      break;
    case 'extension.broadcastMessage':
      // Message received from another extension
      break;

    // ═══ 3D VIEWER EVENTS ═══
    case 'viewer.selectionChanged':
      // data = ViewerSelection[] = [{ modelId: string, objectRuntimeIds: number[] }]
      break;
    case 'viewer.cameraChanged':
      // data = Camera { position, target, up }
      break;
    case 'viewer.modelLoaded':
      // Model loaded in the viewer
      break;
    case 'viewer.modelRemoved':
      break;
    case 'viewer.iconClicked':
      // data = PointIcon { id, iconPath, position, size }
      break;
    case 'viewer.objectClicked':
      // data = { modelId, objectRuntimeId, position }
      break;
    case 'viewer.sectionPlanesChanged':
      break;
    case 'viewer.settingsChanged':
      break;
    case 'viewer.toolChanged':
      break;

    // ═══ MARKUP EVENTS ═══
    case 'viewer.markupChanged':
      break;

    // ═══ DATA TABLE EVENTS ═══
    case 'dataTable.configChanged':
      break;

    // ═══ EMBEDDED EVENTS ═══
    case 'embed.projectSelected':
      break;
    case 'embed.fileSelected':
      break;
  }
}
\`\`\``,
};
