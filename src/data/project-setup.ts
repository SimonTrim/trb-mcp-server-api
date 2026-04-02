export const projectSetupDocs = {
  architecture: `# Recommended Technical Architecture

\`\`\`
┌────────────────────────────────────────────────────┐
│           TRIMBLE CONNECT (for Browser)            │
│  ┌──────────────────────────────────────────────┐  │
│  │  <iframe> — YOUR EXTENSION                   │  │
│  │  ┌────────────────────────────────────────┐  │  │
│  │  │  Frontend (HTML/CSS/JS or framework)   │  │  │
│  │  │  + Workspace API SDK                   │  │  │
│  │  └────────────┬───────────────────────────┘  │  │
│  └───────────────┼──────────────────────────────┘  │
└──────────────────┼─────────────────────────────────┘
                   │ HTTPS (fetch)
        ┌──────────▼──────────┐
        │  BACKEND PROXY      │
        │  (Vercel / Node.js) │
        │  - Auth proxy       │
        │  - CORS             │
        └──────────┬──────────┘
                   │ HTTPS + Bearer Token
        ┌──────────▼──────────┐
        │  TRIMBLE CONNECT    │
        │  REST API (v2.0)    │
        │  + BCF API          │
        └─────────────────────┘
\`\`\`

## Why a Backend Proxy?

1. **CORS**: Trimble APIs do not allow direct calls from an iframe
2. **Security**: Do not expose client_secret in the frontend
3. **OAuth Fallback**: Enable standalone mode with full OAuth
4. **Transformation**: Adapt API responses to the format expected by the frontend

## Recommended Technologies

| Layer | Technologies | Notes |
|-------|-------------|-------|
| Frontend | TypeScript, Webpack/Vite, React/Vue/Vanilla | Must be lightweight (loaded in an iframe) |
| Design System | Modus 2.0 (@trimble-oss/moduswebcomponents) | Required — Official Trimble design system |
| Complementary UI | shadcn/ui (components + blocks) | Advanced layouts/dashboards |
| Backend | Node.js + Express | Simple proxy to Trimble APIs |
| Frontend Deployment | GitHub Pages, Vercel, Netlify | Public HTTPS URL |
| Backend Deployment | Vercel Serverless, AWS Lambda, Heroku | Serverless recommended |
| Workspace API | trimble-connect-workspace-api (npm) | Official SDK |`,

  projectStructure: `# Recommended Project Structure

\`\`\`
my-tc-extension/
├── api/
│   └── index.js              # Backend proxy (Vercel serverless)
├── public/
│   ├── index.html             # Page loaded by TC (CDN scripts)
│   ├── index-local.html       # Local testing page
│   ├── manifest.json          # Extension manifest
│   ├── icon-48.png            # Extension icon (48x48, transparent background)
│   ├── icon-white-48.png      # White icon (for dark sidebar)
│   └── dist/
│       └── index.js           # Bundle copied for GitHub Pages
├── src/
│   ├── index.ts               # Frontend entry point
│   ├── api/
│   │   ├── workspaceAPIAdapter.ts  # Workspace API → backend adapter
│   │   ├── authService.ts          # Authentication service
│   │   └── [service]Service.ts     # Domain-specific services
│   ├── models/
│   │   └── types.ts           # TypeScript interfaces
│   ├── ui/
│   │   ├── styles.css         # Styles
│   │   └── [components].ts    # UI components
│   └── utils/
│       ├── logger.ts          # Logging
│       └── errorHandler.ts    # Error handling
├── dist/                      # Build output
├── .env.example               # Environment variables
├── package.json
├── tsconfig.json
├── webpack.config.js          # or vite.config.ts
├── vercel.json                # Vercel config
└── README.md
\`\`\``,

  backendProxy: `# Backend Proxy — Architecture

## Recommended Proxy Routes

\`\`\`javascript
const express = require('express');
const app = express();

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });
  req.accessToken = token;
  req.region = req.headers['x-project-region'] || 'eu';
  next();
}

// Proxy fetch to TC API
async function tcFetch(req, endpoint, options = {}) {
  const baseUrl = getCoreApiUrl(req.region);
  const url = \`\${baseUrl}\${endpoint}\`;
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      Authorization: \`Bearer \${req.accessToken}\`,
      'Content-Type': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!response.ok) throw { status: response.status, message: await response.text() };
  if (response.status === 204) return null;
  return response.json();
}

app.get('/api/projects/:projectId/todos', requireAuth, async (req, res) => {
  const url = \`/todos?projectId=\${req.params.projectId}\`;
  const data = await tcFetch(req, url);
  res.json(data);
});
\`\`\`

## CORS Configuration

\`\`\`javascript
const cors = require('cors');
app.use(cors({
  origin: [
    'http://localhost:8080',
    'http://localhost:3000',
    'https://myapp.github.io',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Project-Region'],
}));
\`\`\`

## Environment Variables

\`\`\`env
ENVIRONMENT=production
TRIMBLE_CLIENT_ID=your_client_id
TRIMBLE_CLIENT_SECRET=your_client_secret
TRIMBLE_REDIRECT_URI=https://your-backend.vercel.app/callback
PORT=3000
FRONTEND_URL=https://your-frontend.github.io
\`\`\``,

  deployment: `# Deployment

## Frontend — GitHub Pages

\`\`\`bash
public/
  index.html          # Main page
  manifest.json       # Extension manifest
  dist/
    index.js          # Webpack bundle
  icon-48.png         # Icon

# Push to GitHub
git add -A && git commit -m "deploy" && git push origin main
# Enable GitHub Pages: Settings > Pages > Source: main
\`\`\`

## Backend — Vercel Serverless

\`\`\`json
// vercel.json
{
  "version": 2,
  "builds": [
    { "src": "api/index.js", "use": "@vercel/node" }
  ],
  "routes": [
    { "src": "/(.*)", "dest": "api/index.js" }
  ]
}
\`\`\`

## Deployment Checklist

- [ ] npm run build succeeds without errors
- [ ] The dist/ folder contains index.html, manifest.json, assets
- [ ] URLs in manifest.json point to the final hosting
- [ ] Hosting is HTTPS
- [ ] CORS headers allow *.connect.trimble.com
- [ ] The manifest is publicly accessible
- [ ] The extension is registered in Trimble Connect
- [ ] WorkspaceAPI.connect() connection succeeds
- [ ] The viewer.selectionChanged event is properly received`,

  viteConfig: `# Vite Configuration for Trimble Connect Extensions

\`\`\`typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      external: ['trimble-connect-workspace-api'],
      output: {
        globals: { 'trimble-connect-workspace-api': 'TrimbleConnectWorkspace' },
        manualChunks(id) {
          if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
          if (id.includes('jspdf') || id.includes('html2canvas')) return 'vendor-export';
        },
      },
    },
  },
})
\`\`\`

## CDN Scripts in index.html

\`\`\`html
<body>
  <div id="root"></div>
  <script src="https://components.connect.trimble.com/trimble-connect-workspace-api/index.js"></script>
  <script src="https://app.connect.trimble.com/tc/static/5.0.0/tcw-extension-api.js"></script>
  <script type="module" src="/src/main.tsx"></script>
</body>
\`\`\`

## Vite Environment Variables

\`\`\`env
VITE_TC_API_BASE=https://app.connect.trimble.com/tc/api/2.0
VITE_TC_REGION=europe
VITE_EXT_BASE_URL=https://your-domain.com/extension
VITE_DEBUG=false
\`\`\`

> Only variables prefixed with VITE_ are exposed on the client side.`,
};
