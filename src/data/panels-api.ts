export const panelsApiDocs = {
  propertyPanel: `# PropertyPanel API — Complete Reference

The PropertyPanel API is accessible via API.propertyPanel (optional — may be undefined).
It allows interacting with the native Trimble Connect property panel.

## Methods

\`\`\`typescript
if (API.propertyPanel) {
  // Get displayed data
  const data = await API.propertyPanel.getPropertyPanelData();
  // Returns: IPropertyPanelData { entities?: string[], title?: string }

  // Close the panel
  await API.propertyPanel.close?.();

  // Change mode ('edit' = unsaved changes possible)
  await API.propertyPanel.changeMode?.('view');

  // Open the Property Set Manager
  await API.propertyPanel.openPropertySetManager?.();
}
\`\`\`

## IPropertyPanelData Interface

\`\`\`typescript
interface IPropertyPanelData {
  entities?: string[];  // FRN format (URL encoded)
                        // Ex: "frn:entity:3CqVfw%24t15ihB2vPgB1wri"
  title?: string;
}
\`\`\`

> FRN format: frn:entity:{IFC_GUID_URL_ENCODED}. The \$ character in IFC GUIDs must be encoded as %24.`,

  dataTable: `# DataTable API — Complete Reference

The DataTable API is accessible via API.dataTable. It interacts with the native Trimble Connect data table.

> WARNING: Availability may change at runtime. Handle errors accordingly.

## Methods

\`\`\`typescript
// Get the current configuration
const config = await API.dataTable.getConfig();

// Modify the configuration
await API.dataTable.setConfig({
  show: true,
  mode: 'Selected',     // 'All' | 'Selected' | 'Visible'
  filter: 'Wall',
  columnSet: myColumnSet
});

// Get all available columns
const columns = await API.dataTable.getAllColumns();

// Get saved column sets
const presets = await API.dataTable.getColumnSets();
\`\`\`

## DataTableConfig Interface

\`\`\`typescript
interface DataTableConfig {
  show?: boolean;
  mode?: 'All' | 'Selected' | 'Visible';
  filter?: string;
  columnSet?: ColumnSet;
}
\`\`\``,

  modelsPanel: `# ModelsPanel API — Complete Reference

The ModelsPanel API is accessible via API.modelsPanel. It controls the native models panel.

## Methods

\`\`\`typescript
// Get the current configuration
const config = await API.modelsPanel.getConfig();

// Modify the configuration
await API.modelsPanel.setConfig({
  mode: 'selected'  // 'all' | 'selected'
});
\`\`\``,
};
