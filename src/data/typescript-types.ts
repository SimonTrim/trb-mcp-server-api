export const typescriptTypes = `# TypeScript Reference Interfaces — Trimble Connect

\`\`\`typescript
// ═══════════════════════════════════════
// BASE TYPES
// ═══════════════════════════════════════

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface ColorRGBA {
  r: number;  // [0, 255]
  g: number;  // [0, 255]
  b: number;  // [0, 255]
  a: number;  // [0, 255]
}

// ═══════════════════════════════════════
// PROJECT & USER
// ═══════════════════════════════════════

interface ConnectProject {
  id: string;
  name: string;
  location: string;   // 'europe' | 'northAmerica' | 'asia' | 'australia'
  rootId: string;
}

interface ConnectUser {
  id?: string;
  name?: string;
  email?: string;
}

// ═══════════════════════════════════════
// FILES & MODELS
// ═══════════════════════════════════════

interface ProjectFile {
  id: string;
  name: string;
  extension: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Date;
  lastModified: Date;
  downloadUrl?: string;
  path: string;
  versionId?: string;
  parentId?: string;
}

interface ModelSpec {
  id: string;
  name?: string;
  versionId?: string;
  state?: string;       // 'loaded' | 'unloaded'
}

interface ModelObjectIds {
  modelId: string;
  objectRuntimeIds: number[];
}

// ═══════════════════════════════════════
// OBJECTS & PROPERTIES
// ═══════════════════════════════════════

interface ObjectProperties {
  id: number;                    // Runtime ID
  class?: string;                // IFC class (e.g. 'IfcWall')
  color?: string;
  position?: Vector3;            // Position in meters
  product?: Product;
  properties?: PropertySet[];
}

interface Product {
  name?: string;
  description?: string;
  objectType?: string;
}

interface PropertySet {
  set?: string;                  // Property Set name (e.g. 'Pset_WallCommon')
  properties?: Property[];
}

interface Property {
  name: string;
  value: string | number;
  type: PropertyType;            // 'string' | 'number' | 'boolean' | ...
}

interface ObjectState {
  visible?: boolean | 'reset';
  color?: string | ColorRGBA;
  opacity?: number;
}

interface ObjectSelector {
  modelObjectIds?: ModelObjectIds[];
  selected?: boolean;
  parameter?: EntityParameter;
}

// ═══════════════════════════════════════
// HIERARCHY
// ═══════════════════════════════════════

interface HierarchyEntity {
  id: number;
  name: string;
  fileId: string;
}

// ═══════════════════════════════════════
// 3D VIEWS
// ═══════════════════════════════════════

interface ViewSpec {
  id?: string;
  name?: string;
  description?: string;
  projectId?: string;
  camera?: Camera;
  sectionPlanes?: SectionPlane[];
  files?: string[];
  models?: string[];
  imageData?: string;
  thumbnail?: string;
  createdBy?: ConnectUser;
  createdOn?: string;
  modifiedBy?: ConnectUser;
  modifiedOn?: string;
}

// ═══════════════════════════════════════
// CAMERA
// ═══════════════════════════════════════

interface Camera {
  position: Vector3;
  target: Vector3;
  up: Vector3;
}

interface ViewerSettings {
  assemblySelection: boolean;
  zoomToFitRatio?: number | 'reset';
}

// ═══════════════════════════════════════
// ICONS (PointIcon)
// ═══════════════════════════════════════

interface PointIcon {
  id: number;                    // Unique numeric identifier
  iconPath: string;              // Image URL
  position: Vector3;             // Position in METERS
  size: number;                  // Size in pixels
}

// ═══════════════════════════════════════
// MARKUPS
// ═══════════════════════════════════════

interface MarkupPick {
  positionX: number;             // X in millimeters
  positionY: number;             // Y in millimeters
  positionZ: number;             // Z in millimeters
  modelId?: string;
  objectId?: number;
  referenceObjectId?: string;
  type?: PickType;
  directionX?: number;
  directionY?: number;
  directionZ?: number;
  position2X?: number;
  position2Y?: number;
  position2Z?: number;
}

interface PointMarkup {
  id?: number;
  start: MarkupPick;
  color?: ColorRGBA;
}

interface LineMarkup extends PointMarkup {
  end: MarkupPick;
}

interface ArrowMarkup extends LineMarkup {}

interface TextMarkup extends LineMarkup {
  text?: string;
}

interface CloudMarkup {
  id?: number;
  position?: MarkupPick;
  normal?: Vector3;
  width?: number;
  height?: number;
  color?: ColorRGBA;
}

interface MeasurementMarkup extends LineMarkup {
  mainLineStart: MarkupPick;
  mainLineEnd: MarkupPick;
}

// ═══════════════════════════════════════
// SECTIONS
// ═══════════════════════════════════════

interface SectionPlane {
  id?: number;
  position: Vector3;
  normal: Vector3;
}

interface SectionBox {
  min: Vector3;
  max: Vector3;
}

// ═══════════════════════════════════════
// BOUNDING BOX
// ═══════════════════════════════════════

interface ObjectBoundingBox {
  runtimeId: number;
  min: Vector3;                  // In meters
  max: Vector3;                  // In meters
}

// ═══════════════════════════════════════
// BCF TOPICS
// ═══════════════════════════════════════

interface BCFTopic {
  id: string;
  title: string;
  description: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  priority: 'Low' | 'Medium' | 'High';
  assignedTo?: string;
  createdBy: string;
  createdAt: Date;
  modifiedAt: Date;
  dueDate?: Date;
  labels?: string[];
}

// ═══════════════════════════════════════
// NOTES / TODOS
// ═══════════════════════════════════════

interface TrimbleNote {
  id: string;
  title: string;
  content: string;
  author: string;
  createdAt: Date;
  updatedAt: Date;
  archived: boolean;
  projectId: string;
}

// ═══════════════════════════════════════
// DATA TABLE
// ═══════════════════════════════════════

interface DataTableConfig {
  show?: boolean;
  mode?: 'All' | 'Selected' | 'Visible';
  filter?: string;
  columnSet?: ColumnSet;
}

// ═══════════════════════════════════════
// PROPERTY PANEL
// ═══════════════════════════════════════

interface IPropertyPanelData {
  entities?: string[];     // FRN format
  title?: string;
}

// ═══════════════════════════════════════
// VIEWER SELECTION (event)
// ═══════════════════════════════════════

interface ViewerSelection {
  modelId: string;
  objectRuntimeIds: number[];
}
\`\`\`

## Common IFC Standard Property Sets

| Property Set | Applies To | Typical Properties |
|-------------|------------|-------------------|
| Pset_WallCommon | IfcWall | IsExternal, LoadBearing, FireRating, Reference |
| Pset_DoorCommon | IfcDoor | IsExternal, FireRating, AcousticRating, SecurityRating |
| Pset_WindowCommon | IfcWindow | IsExternal, FireRating, GlazingAreaFraction |
| Pset_SlabCommon | IfcSlab | IsExternal, LoadBearing, FireRating |
| Pset_BeamCommon | IfcBeam | LoadBearing, FireRating, Span |
| Pset_ColumnCommon | IfcColumn | LoadBearing, FireRating |
| Pset_SpaceCommon | IfcSpace | IsExternal, GrossPlannedArea, NetPlannedArea |
| Pset_BuildingStoreyCommon | IfcBuildingStorey | AboveGround, EntranceLevel |
| BaseQuantities | All elements | Width, Height, Length, Volume, Area |
`;
