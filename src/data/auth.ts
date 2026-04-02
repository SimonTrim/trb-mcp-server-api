export const authDocs = {
  integrated: `# Authentication — Integrated Mode (inside Trimble Connect)

The extension receives the access token directly from Trimble Connect:

\`\`\`typescript
// Connect to the Workspace API
const API = await WorkspaceAPI.connect(window.parent, onEvent);

// Request the token
const token = await API.extension.requestPermission('accesstoken');
// Returns: 'pending' | 'denied' | '<access_token>'

// The token is automatically refreshed via the event:
function onEvent(event: string, data: any) {
  if (event === 'extension.accessToken') {
    const newToken = data;
  }
}
\`\`\`

**Flow:**
1. The extension calls requestPermission('accesstoken')
2. Trimble Connect displays a consent dialog to the user
3. If accepted: returns the token + emits extension.accessToken on each refresh
4. If denied: returns 'denied'`,

  standalone: `# Authentication — Standalone Mode (OAuth 2.0 Authorization Code)

For standalone applications outside of Trimble Connect.

## OAuth URLs

| Environment | Authorize | Token |
|-------------|-----------|-------|
| Production | https://id.trimble.com/oauth/authorize | https://id.trimble.com/oauth/token |
| Staging | https://stage.id.trimble.com/oauth/authorize | https://stage.id.trimble.com/oauth/token |

## Authorization Parameters

\`\`\`
GET https://id.trimble.com/oauth/authorize
  ?response_type=code
  &client_id={TRIMBLE_CLIENT_ID}
  &redirect_uri={REDIRECT_URI}
  &scope=openid {SCOPE}
  &state={STATE}
\`\`\`

## Code Exchange

\`\`\`
POST https://id.trimble.com/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code={AUTH_CODE}
&redirect_uri={REDIRECT_URI}
&client_id={TRIMBLE_CLIENT_ID}
&client_secret={TRIMBLE_CLIENT_SECRET}
\`\`\`

## Response

\`\`\`json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
\`\`\`

## Token Refresh

\`\`\`
POST https://id.trimble.com/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&refresh_token={REFRESH_TOKEN}
&client_id={TRIMBLE_CLIENT_ID}
&client_secret={TRIMBLE_CLIENT_SECRET}
\`\`\``,

  scopes: `# Available Scopes

- openid — Required
- Application-specific scope (e.g. SMA-tc-myapp)

## Token Usage

All API requests use the header:
\`\`\`
Authorization: Bearer {access_token}
\`\`\``,

  tokenRefresh: `# Token Refresh Management

\`\`\`typescript
// The token typically expires after 1h
// Integrated mode: refresh is automatic via the event
// Standalone mode: implement refresh in the backend proxy

function isTokenExpired(expiresAt: number): boolean {
  return Date.now() >= expiresAt - 5 * 60 * 1000; // 5 min before expiration
}
\`\`\``,
};
