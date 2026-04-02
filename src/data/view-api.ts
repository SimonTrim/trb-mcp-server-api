export const viewApiDocs = {
  overview: `# View API — Complete Reference

The View API is accessible via API.view. It allows managing saved 3D views directly from the extension (without going through the REST API).

## ViewSpec Interface

\`\`\`typescript
interface ViewSpec {
  id?: string;
  name?: string;
  description?: string;
  projectId?: string;
  camera?: Camera;
  sectionPlanes?: SectionPlane[];
  files?: string[];              // Model IDs (ModelSpec.id)
  models?: string[];             // Model version IDs (ModelSpec.versionId)
  imageData?: string;            // Base64 image (Data URL)
  thumbnail?: string;            // Thumbnail URL
  createdBy?: ConnectUser;
  createdOn?: string;
  modifiedBy?: ConnectUser;
  modifiedOn?: string;
}
\`\`\`

## Methods

\`\`\`typescript
// List all project views
const views = await API.view.getViews();

// Get a specific view
const view = await API.view.getView('viewId');

// Get the currently loaded view
const currentView = await API.view.getCurrentView();

// Select and apply a view
await API.view.selectView('viewId');
// With original model version
await API.view.selectView('viewId', true);

// Apply a full view (ViewSpec)
await API.view.setView(viewSpec);

// Create a new view
const newView = await API.view.createView({
  name: 'My View',
  description: 'Annotated view',
});

// Update an existing view
const updated = await API.view.updateView({ id: 'viewId' });
const updated2 = await API.view.updateView(viewSpec);

// Delete a view
await API.view.deleteView('viewId');
\`\`\``,
};
