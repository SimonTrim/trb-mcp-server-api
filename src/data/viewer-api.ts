export const viewerApiDocs = {
  camera: `# 3D Viewer — Camera Management

\`\`\`typescript
// Get the camera
const camera = await API.viewer.getCamera();
// { position: {x,y,z}, target: {x,y,z}, up: {x,y,z}, ... }

// Set the camera
await API.viewer.setCamera({
  position: { x: 10, y: 20, z: 30 },
  target: { x: 0, y: 0, z: 0 },
  up: { x: 0, y: 0, z: 1 }
}, { animationTime: 500 });

// Reset
await API.viewer.setCamera('reset');

// Zoom to fit objects
await API.viewer.setCamera({ modelId: 'xxx', objectRuntimeIds: [1, 2, 3] });

// Camera mode (orbit, walk, fly)
await API.viewer.setCameraMode('walk', spawnPoint);
const mode = await API.viewer.getCameraMode();
\`\`\``,

  selection: `# 3D Viewer — Object Selection

\`\`\`typescript
// Get the current selection
const selection = await API.viewer.getSelection();

// Select objects
await API.viewer.setSelection(
  { modelId: 'xxx', objectRuntimeIds: [1, 2, 3] },
  'set' // 'set' | 'add' | 'remove'
);

// WARNING: for setObjectState and isolateEntities, the selector uses:
// { modelObjectIds: [{ modelId, objectRuntimeIds }] }
// and NOT { modelId, objectRuntimeIds } directly

// Get object properties
const props = await API.viewer.getObjectProperties('modelId', [1, 2, 3]);
// [{ runtimeId, name, type, properties: [...] }]

// Isolate objects (hide everything else)
await API.viewer.isolateEntities([
  { modelObjectIds: [{ modelId: 'xxx', objectRuntimeIds: [1, 2, 3] }] }
]);
\`\`\`

## ViewerSelection Structure (viewer.selectionChanged event)

\`\`\`typescript
interface ViewerSelection {
  modelId: string;
  objectRuntimeIds: number[];
}
// Count: selection.reduce((sum, sel) => sum + sel.objectRuntimeIds.length, 0);
\`\`\``,

  objectState: `# 3D Viewer — Object State (visibility, color)

\`\`\`typescript
// Change object state
await API.viewer.setObjectState(
  { modelObjectIds: [{ modelId: 'xxx', objectRuntimeIds: [1, 2] }] },
  { visible: true, color: '#FF0000' }
);

// Apply to all objects
await API.viewer.setObjectState(undefined, { visible: true });

// Get colored objects
const colored = await API.viewer.getColoredObjects();

// Reset color
await API.viewer.setObjectState(
  { modelObjectIds: [{ modelId, objectRuntimeIds: runtimeIds }] },
  { color: null } // null = reset
);

// CRITICAL: The selector uses { modelObjectIds: [{ modelId, objectRuntimeIds }] }
// and NOT { modelId, objectRuntimeIds } directly. Common mistake.
\`\`\`

## ObjectState Interface

\`\`\`typescript
interface ObjectState {
  visible?: boolean | 'reset';
  color?: string | ColorRGBA; // '#RRGGBB' or RGBA, or 'reset'
  opacity?: number;           // [0-1]
}
\`\`\`

## ObjectSelector Interface

\`\`\`typescript
interface ObjectSelector {
  modelObjectIds?: ModelObjectIds[];
  selected?: boolean;
  parameter?: EntityParameter;
}
\`\`\``,

  models: `# 3D Viewer — Models

\`\`\`typescript
// List models
const models = await API.viewer.getModels();        // all
const loaded = await API.viewer.getModels('loaded'); // loaded only

// Load/unload a model
await API.viewer.toggleModel('modelId', true);  // load
await API.viewer.toggleModel('modelId', false); // unload

// Load a specific version
await API.viewer.toggleModelVersion(
  { modelId: 'xxx', versionId: 'yyy' }, true
);

// Remove a model from the viewer
await API.viewer.removeModel('modelId');

// Get loaded model info
const file = await API.viewer.getLoadedModel('modelId');
\`\`\``,

  sectionPlanes: `# 3D Viewer — Section Planes & Boxes

\`\`\`typescript
// Add a section plane
const planes = await API.viewer.addSectionPlane({
  position: { x: 0, y: 0, z: 5 },
  normal: { x: 0, y: 0, z: 1 }
});

// Get section planes
const allPlanes = await API.viewer.getSectionPlanes();

// Remove section planes
await API.viewer.removeSectionPlanes([planeId]);
await API.viewer.removeSectionPlanes(); // all

// Section box
await API.viewer.addSectionBox({
  min: { x: -10, y: -10, z: 0 },
  max: { x: 10, y: 10, z: 5 }
});
await API.viewer.removeSectionBox();

// Select/deselect section box (edit mode)
await API.viewer.selectSectionBox();
await API.viewer.deSelectSectionBox();
\`\`\``,

  snapshots: `# 3D Viewer — Snapshots and Presentations

\`\`\`typescript
// Viewer screenshot (base64)
const snapshot = await API.viewer.getSnapshot();
// "data:image/png;base64,..."

// Current presentation
const presentation = await API.viewer.getPresentation();
\`\`\``,

  boundingBoxes: `# 3D Viewer — Bounding Boxes and Positions

\`\`\`typescript
// Object bounding boxes
const boxes = await API.viewer.getObjectBoundingBoxes('modelId', [runtimeId1, runtimeId2]);
// [{ runtimeId, min: {x,y,z}, max: {x,y,z} }]
// Coordinates in METERS
\`\`\``,

  layers: `# 3D Viewer — Layers

\`\`\`typescript
// Get model layers
const layers = await API.viewer.getLayers('modelId');

// Change layer visibility
await API.viewer.setLayersVisibility('modelId', [
  { name: 'Architecture', visible: true },
  { name: 'MEP', visible: false }
]);
\`\`\``,

  icons: `# 3D Viewer — Icons and Annotations (PointIcon)

\`\`\`typescript
interface PointIcon {
  id: number;               // Unique numeric identifier (required)
  iconPath: string;         // Image URL (PNG recommended, transparent background)
  position: Vector3;        // Position in METERS { x, y, z }
  size: number;             // Icon size (in screen pixels)
}

// Add an icon
await API.viewer.addIcon({
  id: 1,
  iconPath: 'https://myapp.com/marker.png',
  position: { x: 10, y: 20, z: 5 },
  size: 32
});

// Add multiple icons
await API.viewer.addIcon([
  { id: 1, iconPath: 'https://myapp.com/ok.png', position: { x: 10, y: 20, z: 5 }, size: 24 },
  { id: 2, iconPath: 'https://myapp.com/warning.png', position: { x: 15, y: 25, z: 5 }, size: 24 },
]);

// Get all icons
const icons = await API.viewer.getIcon();

// Remove a specific icon
await API.viewer.removeIcon({ id: 1, iconPath: '', position: { x: 0, y: 0, z: 0 }, size: 0 });

// Remove ALL icons
await API.viewer.removeIcon();
\`\`\`

> IMPORTANT:
> - PointIcon.position coordinates are in METERS (not millimeters like markups)
> - id is a number (not a string)
> - The viewer.iconClicked event is emitted when the user clicks on an icon`,

  tools: `# 3D Viewer — Tools and Settings

\`\`\`typescript
// Activate a tool
await API.viewer.activateTool('measure');
await API.viewer.activateTool('markup');
await API.viewer.activateTool('reset'); // default tool

// Reset the viewer
await API.viewer.reset();

// Set global opacity (0 = transparent, 100 = opaque)
await API.viewer.setOpacity(50);

// Viewer settings
const settings = await API.viewer.getSettings();
// { assemblySelection: boolean, zoomToFitRatio?: number }

await API.viewer.setSettings({
  assemblySelection: true,
  zoomToFitRatio: 1.5
});
await API.viewer.setSettings({ zoomToFitRatio: 'reset' });
\`\`\``,

  objects: `# 3D Viewer — Query Objects by Criteria

\`\`\`typescript
// Get selected and visible objects
const objects = await API.viewer.getObjects(
  { selected: true },
  { visible: true }
);
// Returns: ModelObjects[] = [{ modelId, objectRuntimeIds }]

// Get all visible objects
const visibleObjects = await API.viewer.getObjects(undefined, { visible: true });

// Filter by IFC parameter
const walls = await API.viewer.getObjects({
  parameter: { /* EntityParameter */ }
});
\`\`\``,

  hierarchy: `# 3D Viewer — Model Hierarchy

\`\`\`typescript
// Children of an element
const children = await API.viewer.getHierarchyChildren('modelId', [entityId], 'spatial', true);

// Parents of an element
const parents = await API.viewer.getHierarchyParents('modelId', [entityId], 'spatial', true);

// Parents with containedOnly filter
const strictParents = await API.viewer.getHierarchyParents('modelId', [entityId], 'spatial', true, true);

// Full spatial hierarchy (model tree)
const hierarchy = await API.viewer.getHierarchyChildren(modelId, [], 'spatial', true);
// [] = model root, true = recursive
\`\`\`

## Hierarchy Types (HierarchyType)

| Enum | Value | Description |
|------|-------|-------------|
| Unknown | 0 | Unknown type |
| SpatialHierarchy | 1 | Spatial hierarchy (Site → Building → Storey → Space → Elements) |
| SpatialContainment | 2 | Spatial containment |
| Containment | 3 | Generic containment |
| ElementAssembly | 4 | Element assemblies |
| Group | 5 | Groups |
| System | 6 | Systems (MEP, Structure) |
| Zone | 7 | Zones |
| VoidsElement | 8 | Openings (IfcOpeningElement) |
| FillsElement | 9 | Door, window in opening |
| ConnectsPortToElement | 10 | Port → element connection |
| ConnectsPorts | 11 | Port-to-port connection |
| ServicesBuildings | 12 | Building services |
| Positions | 13 | Placements |

> Common usage: 'spatial' (1) for the standard IFC hierarchy.`,

  idConversion: `# 3D Viewer — ID Conversion

\`\`\`typescript
// Runtime IDs → External IDs (IFC GUIDs)
const externalIds = await API.viewer.convertToObjectIds('modelId', [1, 2, 3]);

// External IDs → Runtime IDs
const runtimeIds = await API.viewer.convertToObjectRuntimeIds('modelId', ['guid1', 'guid2']);
\`\`\`

> IDS files reference objects by IFC GUID, the viewer by Runtime ID. This conversion is essential.`,

  placement: `# 3D Viewer — Model Placement

\`\`\`typescript
// Reposition a model in the viewer
await API.viewer.placeModel('modelId', { /* ModelPlacement */ });

// Show model details
await API.viewer.showModelDetails(fileObject);
\`\`\``,

  pointClouds: `# 3D Viewer — Point Clouds and Panoramas

\`\`\`typescript
// Add a point cloud
await API.viewer.addPointCloud({
  modelId: 'pc-1',
  url: 'https://myapp.com/pointcloud',
  position: { x: 0, y: 0, z: 0 }
});

// Add a panorama
await API.viewer.addPanorama({ /* PanoramaMetadata */ });

// Configure point cloud settings
await API.viewer.setPointCloudSettings({
  pointSize: 2,
  pointBudget: 1000000
});
\`\`\``,

  trimbim: `# 3D Viewer — Trimble BIM Models (.trb)

\`\`\`typescript
// Add a Trimbim model
await API.viewer.addTrimbimModel({
  id: 'trb-1',
  visible: true,
});

// Remove
await API.viewer.removeTrimbimModel('trb-1');
\`\`\``,
};
