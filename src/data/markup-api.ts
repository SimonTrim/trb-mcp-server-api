export const markupApiDocs = {
  overview: `# Markup API — Complete Reference

The Markup API is accessible via API.markup. It allows creating visual annotations in the 3D Viewer: text, arrows, lines, measurements, clouds, points, etc.

> IMPORTANT: Markup coordinates are in MILLIMETERS (unlike object positions which are in meters).

## Available Markup Types

| Type | Add Method | Get Method | Description |
|------|------------|------------|-------------|
| Text | addTextMarkup() | getTextMarkups() | Text with leader line |
| Arrow | addArrowMarkups() | getArrowMarkups() | Directional arrows |
| Line | addLineMarkups() | getLineMarkups() | Simple lines |
| Cloud | addCloudMarkup() | getCloudMarkups() | Annotation clouds (area) |
| Point | addSinglePointMarkups() | getSinglePointMarkups() | Single points |
| Measurement | addMeasurementMarkups() | getMeasurementMarkups() | Distance measurements |
| Angle | addAngleMarkups() | getAngleMarkups() | Angle measurements |
| Slope | addSlopeMeasurementMarkups() | getSlopeMeasurementMarkups() | Slope measurements |
| Freeline | addFreelineMarkups() | getFreelineMarkups() | Freehand drawings |`,

  interfaces: `# Markup API — Interfaces

## MarkupPick (point position)

\`\`\`typescript
interface MarkupPick {
  positionX: number;         // X in millimeters (REQUIRED)
  positionY: number;         // Y in millimeters (REQUIRED)
  positionZ: number;         // Z in millimeters (REQUIRED)
  position2X?: number;       // For pick type 'line' and 'lineSegment'
  position2Y?: number;
  position2Z?: number;
  directionX?: number;       // Unit vector, for pick type 'plane'
  directionY?: number;
  directionZ?: number;
  modelId?: string;          // Associated model ID
  objectId?: number;         // Associated object runtime ID
  referenceObjectId?: string; // Associated object static ID
  type?: PickType;           // Pick type
}
\`\`\`

## ColorRGBA

\`\`\`typescript
interface ColorRGBA {
  r: number;  // Red [0, 255]
  g: number;  // Green [0, 255]
  b: number;  // Blue [0, 255]
  a: number;  // Alpha [0, 255]
}
\`\`\``,

  textMarkup: `# Text Markups

\`\`\`typescript
interface TextMarkup {
  id?: number;
  text?: string;             // Text to display
  start: MarkupPick;         // Start point (anchor)
  end: MarkupPick;           // End point (text position)
  color?: ColorRGBA;
}

const textMarkups = await API.markup.addTextMarkup([{
  text: 'Load-bearing wall — Thickness 200mm',
  start: { positionX: 5000, positionY: 3000, positionZ: 2500 },
  end: { positionX: 5500, positionY: 3500, positionZ: 3000 },
  color: { r: 0, g: 99, b: 163, a: 255 } // Trimble Blue
}]);

const allTexts = await API.markup.getTextMarkups();
\`\`\``,

  arrowMarkup: `# Arrow Markups

\`\`\`typescript
interface ArrowMarkup {
  id?: number;
  start: MarkupPick;         // Arrow origin
  end: MarkupPick;           // Arrow tip
  color?: ColorRGBA;
}

const arrows = await API.markup.addArrowMarkups([{
  start: { positionX: 1000, positionY: 2000, positionZ: 0 },
  end: { positionX: 3000, positionY: 2000, positionZ: 0 },
  color: { r: 218, g: 33, b: 44, a: 255 }
}]);
\`\`\``,

  lineMarkup: `# Line Markups

\`\`\`typescript
interface LineMarkup {
  id?: number;
  start: MarkupPick;
  end: MarkupPick;
  color?: ColorRGBA;
}

const lines = await API.markup.addLineMarkups([{
  start: { positionX: 0, positionY: 0, positionZ: 0 },
  end: { positionX: 5000, positionY: 5000, positionZ: 0 },
  color: { r: 30, g: 138, b: 68, a: 255 }
}]);
\`\`\``,

  cloudMarkup: `# Cloud Markups

\`\`\`typescript
interface CloudMarkup {
  id?: number;
  position?: MarkupPick;     // Cloud center
  normal?: Vector3;           // Cloud plane normal
  width?: number;             // Half-width in mm
  height?: number;            // Half-height in mm
  color?: ColorRGBA;
}

const clouds = await API.markup.addCloudMarkup([{
  position: { positionX: 2000, positionY: 1000, positionZ: 3000 },
  normal: { x: 0, y: 0, z: 1 },
  width: 500,   // total width = 1000mm = 1m
  height: 300,  // total height = 600mm = 0.6m
  color: { r: 228, g: 147, b: 37, a: 200 }
}]);
\`\`\``,

  measurementMarkup: `# Measurement Markups

\`\`\`typescript
interface MeasurementMarkup {
  id?: number;
  start: MarkupPick;
  end: MarkupPick;
  mainLineStart: MarkupPick;
  mainLineEnd: MarkupPick;
  color?: ColorRGBA;
}

const measurements = await API.markup.addMeasurementMarkups([{
  start: { positionX: 0, positionY: 0, positionZ: 0 },
  end: { positionX: 5000, positionY: 0, positionZ: 0 },
  mainLineStart: { positionX: 0, positionY: 0, positionZ: 0 },
  mainLineEnd: { positionX: 5000, positionY: 0, positionZ: 0 },
}]);
\`\`\``,

  removeMarkups: `# Remove Markups

\`\`\`typescript
// Remove specific markups by ID
await API.markup.removeMarkups([1, 2, 3]);

// Remove ALL markups
await API.markup.removeMarkups(undefined);
\`\`\``,
};
