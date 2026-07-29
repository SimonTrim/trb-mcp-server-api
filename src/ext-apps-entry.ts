/**
 * Entry point bundled by esbuild into dist/ext-apps.bundle.js and served at
 * GET /assets/ext-apps.js. The MCP App HTML pages import it from there
 * instead of esm.sh, so npm resolves the SDK dependency graph consistently
 * (esm.sh's on-the-fly resolution mixed zod builds and broke `App.connect`).
 */
export * from "@modelcontextprotocol/ext-apps";
