# Authentication Examples

## Simple static token (development/testing)[​](#simple-static-token-developmenttesting "Direct link to Simple static token (development/testing)")

For development and testing with long-lived static tokens:

```typescript
import {
  AgenticPlatformSdk,
  Environments,
  createAuthProvider,
} from '@trimble-agentic-external-npm-local/agentic-platform-sdk-ts';

const authProvider = createAuthProvider(async () => 'your-static-token');

const sdk = new AgenticPlatformSdk({
  environment: Environments.Development,
  authProvider,
});

```

**Note:** No automatic retry on 401 errors. Best for development only.

***

## Server-side with automatic token refresh[​](#server-side-with-automatic-token-refresh "Direct link to Server-side with automatic token refresh")

For server-side applications with refresh tokens (recommended for production backends):

```typescript
import { createAuthProvider } from '@trimble-agentic-external-npm-local/agentic-platform-sdk-ts';

class ServerTokenManager {
  private accessToken: string | null = null;
  private refreshToken: string;
  private tokenExpiry: Date | null = null;

  constructor(refreshToken: string) {
    this.refreshToken = refreshToken;
  }

  async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }
    // If no valid cached token, fetch a new one
    return this.fetchNewToken();
  }

  async onUnauthorized(): Promise<string> {
    // Called automatically on 401 errors - refresh and return new token
    return this.fetchNewToken();
  }

  private async fetchNewToken(): Promise<string> {
    // Call OAuth 2.0 token endpoint with refresh token
    const response = await fetch('https://auth.example.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();

    this.accessToken = data.access_token;
    this.tokenExpiry = new Date(Date.now() + data.expires_in * 1000);

    if (data.refresh_token) {
      this.refreshToken = data.refresh_token;
    }

    return this.accessToken;
  }
}

// Initialize SDK with auto-refresh
const tokenManager = new ServerTokenManager(process.env.REFRESH_TOKEN);
const authProvider = createAuthProvider(
  () => tokenManager.getAccessToken(),
  () => tokenManager.onUnauthorized()
);

const sdk = new AgenticPlatformSdk({
  environment: Environments.Production,
  authProvider,
  timeoutInMs: 30000,
});

```

**Benefits:** Automatic retry on 401 errors with seamless token refresh.

***

## Browser app (no auto-retry, user interaction required)[​](#browser-app-no-auto-retry-user-interaction-required "Direct link to Browser app (no auto-retry, user interaction required)")

For single-page applications where 401 errors should trigger a login UI:

```typescript
import { createAuthProvider } from '@trimble-agentic-external-npm-local/agentic-platform-sdk-ts';

class BrowserTokenManager {
  private token: string | null = null;

  async getAccessToken(): Promise<string> {
    // Get token from localStorage or memory
    if (this.token) {
      return this.token;
    }

    // No token - redirect to login
    window.location.href = '/login';
    throw new Error('No token available');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('access_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('access_token');
  }
}

const tokenManager = new BrowserTokenManager();

// Create auth provider WITHOUT onUnauthorized
// 401 errors will propagate to your error handlers
const authProvider = createAuthProvider(
  () => tokenManager.getAccessToken()
  // No onUnauthorized - let app handle 401 errors
);

const sdk = new AgenticPlatformSdk({
  environment: Environments.Production,
  authProvider,
});

// Handle 401 errors in your application
try {
  await sdk.agents.list();
} catch (error) {
  if (error.errorPayload?.status === 401) {
    // Token expired - show login UI or redirect to Trimble ID
    tokenManager.clearToken();
    window.location.href = '/login';
  }
}

```

**Benefits:** Full control over authentication UI and user experience.

***

## Conditional auto-retry[​](#conditional-auto-retry "Direct link to Conditional auto-retry")

Return `undefined` from `onUnauthorized` to conditionally disable retry:

```typescript
class SmartTokenManager {
  private retryCount = 0;

  async getAccessToken(): Promise<string> {
    return this.getCurrentToken();
  }

  async onUnauthorized(): Promise<string | void> {
    // Only retry once per session
    if (this.retryCount >= 1) {
      console.log('Max retry attempts reached, requiring user login');
      return undefined; // Let the error propagate to UI
    }

    this.retryCount++;

    try {
      // Attempt silent token refresh
      const newToken = await this.silentRefresh();
      return newToken;
    } catch (error) {
      // Silent refresh failed - return undefined to show login UI
      return undefined;
    }
  }

  private async silentRefresh(): Promise<string> {
    // Implement silent refresh logic
  }

  private async getCurrentToken(): Promise<string> {
    // Get current token
  }
}

const tokenManager = new SmartTokenManager();
const authProvider = createAuthProvider(
  () => tokenManager.getAccessToken(),
  () => tokenManager.onUnauthorized()
);

const sdk = new AgenticPlatformSdk({
  environment: Environments.Production,
  authProvider,
});

```

**Benefits:** Fine-grained control over retry behavior based on application state.
