export const codeExamples = {
  projectExtension: `# Project Extension Skeleton

\`\`\`typescript
import * as WorkspaceAPI from 'trimble-connect-workspace-api';

class MyExtension {
  private api: any;
  private accessToken: string | null = null;
  private projectId: string | null = null;
  private projectRegion: string = 'eu';

  async initialize() {
    this.api = await WorkspaceAPI.connect(window.parent, this.onEvent.bind(this), 30000);

    const project = await this.api.project.getCurrentProject();
    this.projectId = project.id;
    this.projectRegion = project.location;

    const token = await this.api.extension.requestPermission('accesstoken');
    if (token !== 'pending' && token !== 'denied') {
      this.accessToken = token;
      this.start();
    }

    this.api.ui.setMenu({
      title: 'My Extension',
      icon: 'https://myapp.com/icon.png',
      command: 'main',
      subMenus: [
        { title: 'View 1', command: 'view_1' },
        { title: 'View 2', command: 'view_2' },
      ],
    });
  }

  private onEvent(event: string, data: any) {
    switch (event) {
      case 'extension.accessToken':
        this.accessToken = data;
        if (!this.projectId) return;
        this.start();
        break;
      case 'extension.command':
        this.handleCommand(data);
        break;
    }
  }

  private handleCommand(command: string) {
    switch (command) {
      case 'view_1': /* show view 1 */ break;
      case 'view_2': /* show view 2 */ break;
    }
  }

  private async start() {
    const response = await fetch(\`\${BACKEND_URL}/api/projects/\${this.projectId}/data\`, {
      headers: {
        'Authorization': \`Bearer \${this.accessToken}\`,
        'X-Project-Region': this.projectRegion,
      },
    });
    const data = await response.json();
    this.render(data);
  }

  private render(data: any) {
    document.getElementById('app')!.innerHTML = \`<h1>My Extension</h1>\`;
  }
}

new MyExtension().initialize();
\`\`\``,

  viewerExtension: `# 3D Viewer Extension Skeleton

\`\`\`typescript
import * as WorkspaceAPI from 'trimble-connect-workspace-api';

class My3DExtension {
  private api: any;

  async initialize() {
    this.api = await WorkspaceAPI.connect(window.parent, this.onEvent.bind(this), 30000);

    const project = await this.api.project.getCurrentProject();
    const token = await this.api.extension.requestPermission('accesstoken');

    if (token !== 'pending' && token !== 'denied') {
      this.start();
    }
  }

  private onEvent(event: string, data: any) {
    switch (event) {
      case 'extension.accessToken':
        this.start();
        break;
      case 'viewer.selectionChanged':
        this.onSelectionChanged(data);
        break;
      case 'viewer.modelLoaded':
        this.onModelLoaded(data);
        break;
    }
  }

  private async start() {
    const models = await this.api.viewer.getModels('loaded');
    console.log('Loaded models:', models);

    await this.api.viewer.addIcon({
      id: 1,
      iconPath: 'https://myapp.com/marker.png',
      position: { x: 0, y: 0, z: 10 },
      size: 32,
    });
  }

  private async onSelectionChanged(selection: any) {
    if (!selection || !selection.length) return;

    const { modelId, objectRuntimeIds } = selection[0];
    const props = await this.api.viewer.getObjectProperties(modelId, objectRuntimeIds);
    this.renderProperties(props);
  }

  private async onModelLoaded(model: any) {
    console.log('Model loaded:', model);
  }

  private renderProperties(props: any[]) {
    const html = props.map(p =>
      \`<div>\${p.name}: \${JSON.stringify(p.properties)}</div>\`
    ).join('');
    document.getElementById('app')!.innerHTML = html;
  }
}

new My3DExtension().initialize();
\`\`\``,

  reactHookPattern: `# React Hook + Context Pattern for Workspace API

\`\`\`typescript
// src/hooks/useTrimbleConnect.ts
import { useState, useEffect, useCallback, createContext, useContext } from 'react';

declare global {
  interface Window {
    TrimbleConnectWorkspace: {
      connect: (
        target: Window | HTMLIFrameElement,
        onEvent: (event: string, data: unknown) => void,
        timeout?: number,
      ) => Promise<TrimbleAPI>;
    };
  }
}

export interface TrimbleAPI {
  project: {
    getCurrentProject: () => Promise<{ id: string; name: string; location: string }>;
  };
  extension: {
    requestPermission: (permission: string) => Promise<string>;
    setStatusMessage: (msg: string) => void;
  };
  viewer: {
    getModels: (filter?: string) => Promise<unknown[]>;
    getSelection: () => Promise<ViewerSelection[]>;
    setSelection: (selector: unknown, mode: string) => Promise<void>;
    getObjectProperties: (modelId: string, ids: number[]) => Promise<unknown[]>;
    getHierarchyChildren: (modelId: string, ids: number[], type: string, recursive: boolean) => Promise<unknown[]>;
    setObjectState: (selector: unknown, state: unknown) => Promise<void>;
    isolateEntities: (entities: unknown[]) => Promise<void>;
    convertToObjectIds: (modelId: string, ids: number[]) => Promise<string[]>;
    convertToObjectRuntimeIds: (modelId: string, ids: string[]) => Promise<number[]>;
    getSnapshot: () => Promise<string>;
  };
}

export interface TrimbleConnectState {
  isConnected: boolean;
  isEmbedded: boolean;
  project: { id: string; name: string; location: string } | null;
  accessToken: string | null;
  selection: ViewerSelection[];
  api: TrimbleAPI | null;
}

const TrimbleContext = createContext<TrimbleConnectState>({
  isConnected: false, isEmbedded: false,
  project: null, accessToken: null, selection: [], api: null,
});
export const TrimbleProvider = TrimbleContext.Provider;
export function useTrimbleContext() { return useContext(TrimbleContext); }

export function useTrimbleConnect() {
  const [state, setState] = useState<TrimbleConnectState>({
    isConnected: false, isEmbedded: false,
    project: null, accessToken: null, selection: [], api: null,
  });

  const handleEvent = useCallback((event: string, data: unknown) => {
    switch (event) {
      case 'extension.accessToken':
        setState(s => ({ ...s, accessToken: data as string }));
        break;
      case 'viewer.selectionChanged':
        setState(s => ({ ...s, selection: data as ViewerSelection[] }));
        break;
    }
  }, []);

  useEffect(() => {
    const isInIframe = window.self !== window.top;

    if (isInIframe && window.TrimbleConnectWorkspace) {
      window.TrimbleConnectWorkspace
        .connect(window.parent, handleEvent, 30000)
        .then(async (api) => {
          const project = await api.project.getCurrentProject();
          const token = await api.extension.requestPermission('accesstoken');
          setState({
            isConnected: true, isEmbedded: true, project,
            accessToken: token !== 'pending' && token !== 'denied' ? token : null,
            selection: [], api,
          });
        })
        .catch(console.error);
    } else {
      setState({
        isConnected: true, isEmbedded: false,
        project: { id: 'mock', name: 'Local Dev', location: 'europe' },
        accessToken: 'mock-token', selection: [], api: null,
      });
    }
  }, [handleEvent]);

  return state;
}
\`\`\`

**Usage in App.tsx:**

\`\`\`tsx
export default function App() {
  const trimble = useTrimbleConnect();
  return (
    <TrimbleProvider value={trimble}>
      {/* All child components access via useTrimbleContext() */}
    </TrimbleProvider>
  );
}
\`\`\`

> Key pattern: api: null in dev → api: TrimbleAPI in prod.`,

  viewerBridge: `# ViewerBridge Pattern — API Abstraction with Mock Fallback

\`\`\`typescript
// viewerBridge.ts — Single entry point for Viewer API calls

export async function getLoadedModels(api: TrimbleAPI | null) {
  if (!api) return [{ id: 'mock-model', name: 'Test model' }];
  try {
    return await api.viewer.getModels('loaded');
  } catch (err) {
    console.error('getLoadedModels failed:', err);
    return [];
  }
}

export async function getHierarchy(api: TrimbleAPI | null, modelId: string) {
  if (!api) return MOCK_HIERARCHY;
  try {
    return await api.viewer.getHierarchyChildren(modelId, [], 'spatial', true);
  } catch (err) {
    console.error('getHierarchy failed:', err);
    return [];
  }
}

export async function selectObjects(
  api: TrimbleAPI | null,
  modelId: string,
  runtimeIds: number[]
) {
  if (!api) return;
  await api.viewer.setSelection(
    { modelObjectIds: [{ modelId, objectRuntimeIds: runtimeIds }] },
    'set'
  );
}

export async function colorizeObjects(
  api: TrimbleAPI | null,
  modelId: string,
  runtimeIds: number[],
  color: string | null
) {
  if (!api) return;
  await api.viewer.setObjectState(
    { modelObjectIds: [{ modelId, objectRuntimeIds: runtimeIds }] },
    { color }
  );
}
\`\`\``,

  annotationWorkflow: `# Complete Workflow: Selection → Annotation with Properties

\`\`\`typescript
async function annotateSelectedObject(api: TrimbleAPI, selection: ViewerSelection) {
  const { modelId, objectRuntimeIds } = selection;
  if (!objectRuntimeIds.length) return;

  const runtimeId = objectRuntimeIds[0];

  // 1. Get properties
  const [props] = await api.viewer.getObjectProperties(modelId, [runtimeId]);

  // 2. Get position
  const [bbox] = await api.viewer.getObjectBoundingBoxes(modelId, [runtimeId]);

  // 3. Build text
  const name = props.product?.name || props.class || 'Object';
  const mainPset = props.properties?.[0];
  const propsText = mainPset?.properties
    ?.slice(0, 3)
    .map(p => \`\${p.name}: \${p.value}\`)
    .join('\\n') || '';
  const annotationText = \`\${name}\\n\${propsText}\`;

  // 4. Position the markup (m → mm)
  const centerX = ((bbox.min.x + bbox.max.x) / 2) * 1000;
  const centerY = ((bbox.min.y + bbox.max.y) / 2) * 1000;
  const topZ = bbox.max.z * 1000;

  // 5. Create the markup
  await api.markup.addTextMarkup([{
    text: annotationText,
    start: {
      positionX: centerX, positionY: centerY, positionZ: topZ,
      modelId, objectId: runtimeId,
    },
    end: {
      positionX: centerX + 1000,
      positionY: centerY + 1000,
      positionZ: topZ + 1500,
    },
    color: { r: 0, g: 99, b: 163, a: 255 },
  }]);

  // 6. Add an icon
  await api.viewer.addIcon({
    id: runtimeId,
    iconPath: 'https://myapp.com/info-icon.png',
    position: {
      x: (bbox.min.x + bbox.max.x) / 2,
      y: (bbox.min.y + bbox.max.y) / 2,
      z: bbox.max.z + 0.3,
    },
    size: 24,
  });
}
\`\`\``,

  errorHandling: `# Error Handling and Best Practices

## Retry Pattern with Fallback

\`\`\`typescript
async function executeWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries) throw error;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
  throw new Error('Max retries reached');
}
\`\`\`

## Error Boundary (required for iframe)

\`\`\`tsx
import { Component, type ReactNode, type ErrorInfo } from 'react';

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6">
          <p>An error occurred</p>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
\`\`\`

## Best Practices

1. **Modus 2.0 Design System + shadcn/ui**: Required
2. **Bundle size**: < 500KB (loaded in an iframe)
3. **No sensitive localStorage**: iframe in third-party context
4. **Graceful degradation**: Handle the case where Workspace API does not connect
5. **Connection timeout**: 30000ms recommended
6. **Icon**: PNG 48x48 with transparent background
7. **CORS manifest**: Accessible via CORS
8. **Regions**: Always use the correct base URL
9. **BCF**: BCF URLs (openXX) are DIFFERENT from Core API URLs (appXX)
10. **Batch calls**: getObjectProperties in groups of 50 runtimeIds max`,

  unitsConversion: `# Units and Coordinate Systems

## Units Summary Table

| API / Context | Unit |
|---------------|------|
| viewer.getObjectBoundingBoxes() | Meters |
| viewer.getObjectProperties() → position | Meters |
| viewer.addIcon() → PointIcon.position | Meters |
| viewer.getCamera() / setCamera() | Meters |
| markup.addTextMarkup() → MarkupPick | Millimeters |
| markup.addArrowMarkups() → MarkupPick | Millimeters |
| markup.addCloudMarkup() → width/height | Millimeters |
| viewer.addSectionPlane() | Meters |
| viewer.addSectionBox() | Meters |

## Meters ↔ Millimeters Conversion

\`\`\`typescript
// Bounding box (meters) → Markup position (millimeters)
function bboxCenterToMarkupPosition(bbox: ObjectBoundingBox): MarkupPick {
  const centerX = (bbox.min.x + bbox.max.x) / 2;
  const centerY = (bbox.min.y + bbox.max.y) / 2;
  const topZ = bbox.max.z;
  return {
    positionX: centerX * 1000,
    positionY: centerY * 1000,
    positionZ: topZ * 1000 + 500,
  };
}

// Bounding box (meters) → Icon position (meters)
function bboxCenterToIconPosition(bbox: ObjectBoundingBox): Vector3 {
  return {
    x: (bbox.min.x + bbox.max.x) / 2,
    y: (bbox.min.y + bbox.max.y) / 2,
    z: bbox.max.z + 0.5,
  };
}
\`\`\``,
};
