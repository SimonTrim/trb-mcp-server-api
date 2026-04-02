export const regionsDocs = {
  overview: `# Regions and Base URLs — Complete Summary Table

| Region | Location API | Core API Host (appXX) | BCF API Host (openXX) |
|--------|--------------|-----------------------|-----------------------|
| US | northAmerica / us | app.connect.trimble.com | open11.connect.trimble.com |
| EU | europe / eu | app21.connect.trimble.com | open21.connect.trimble.com |
| APAC | asia / ap | app31.connect.trimble.com | open31.connect.trimble.com |
| AU | australia / ap-au | app32.connect.trimble.com | open32.connect.trimble.com |

## Staging

| Region | Staging Host |
|--------|-------------|
| US | app.stage.connect.trimble.com |
| EU | app21.stage.connect.trimble.com |
| AP | app31.stage.connect.trimble.com |
| AU | app32.stage.connect.trimble.com |

## URL Construction

\`\`\`typescript
// Core API
const baseUrl = \`https://\${coreHost}/tc/api/2.0\`;

// BCF API
const bcfUrl = \`https://\${bcfHost}/bcf/2.1/projects/\${projectId}/topics\`;
\`\`\`

## Location → Region Mapping

\`\`\`typescript
function getRegionCode(location: string): string {
  const loc = location.toLowerCase();
  if (loc === 'northamerica' || loc === 'us') return 'us';
  if (loc === 'europe' || loc === 'eu') return 'eu';
  if (loc === 'asia' || loc === 'ap') return 'ap';
  if (loc === 'australia' || loc === 'ap-au') return 'ap-au';
  return 'us';
}

function getCoreApiHost(region: string): string {
  const hosts: Record<string, string> = {
    us: 'app.connect.trimble.com',
    eu: 'app21.connect.trimble.com',
    ap: 'app31.connect.trimble.com',
    'ap-au': 'app32.connect.trimble.com',
  };
  return hosts[region] || hosts.us;
}

function getBcfApiHost(region: string): string {
  const hosts: Record<string, string> = {
    us: 'open11.connect.trimble.com',
    eu: 'open21.connect.trimble.com',
    ap: 'open31.connect.trimble.com',
    'ap-au': 'open32.connect.trimble.com',
  };
  return hosts[region] || hosts.us;
}
\`\`\`

> CRITICAL: The BCF API uses openXX servers DIFFERENT from the Core API appXX servers.`,
};
