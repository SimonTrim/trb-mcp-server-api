const CORE_HOSTS: Record<string, string> = {
  us: "app.connect.trimble.com",
  eu: "app21.connect.trimble.com",
  ap: "app31.connect.trimble.com",
  "ap-au": "app32.connect.trimble.com",
};

const BCF_HOSTS: Record<string, string> = {
  us: "open11.connect.trimble.com",
  eu: "open21.connect.trimble.com",
  ap: "open31.connect.trimble.com",
  "ap-au": "open32.connect.trimble.com",
};

export type Region = "us" | "eu" | "ap" | "ap-au";
export type ApiType = "core" | "bcf";

export function getCoreBaseUrl(region: Region): string {
  const host = CORE_HOSTS[region] || CORE_HOSTS.us;
  return `https://${host}/tc/api/2.0`;
}

export function getBcfBaseUrl(region: Region, bcfVersion = "2.1"): string {
  const host = BCF_HOSTS[region] || BCF_HOSTS.us;
  return `https://${host}/bcf/${bcfVersion}`;
}

export const VALID_REGIONS = Object.keys(CORE_HOSTS);

/**
 * Per-session auth token storage.
 * Tokens are injected by the Trimble Agent Studio via HTTP headers.
 */
const sessionTokens = new Map<string, string>();

export function storeSessionToken(sessionId: string, token: string): void {
  sessionTokens.set(sessionId, token);
}

export function getSessionToken(sessionId: string): string | undefined {
  return sessionTokens.get(sessionId);
}

export function clearSessionToken(sessionId: string): void {
  sessionTokens.delete(sessionId);
}

export interface TcApiCallOptions {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  region: Region;
  path: string;
  apiType?: ApiType;
  bcfVersion?: string;
  query?: Record<string, string>;
  body?: unknown;
  authToken: string;
}

export interface TcApiResult {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
}

export async function tcApiCall(opts: TcApiCallOptions): Promise<TcApiResult> {
  const baseUrl =
    opts.apiType === "bcf"
      ? getBcfBaseUrl(opts.region, opts.bcfVersion)
      : getCoreBaseUrl(opts.region);

  const normalizedPath = opts.path.startsWith("/") ? opts.path : `/${opts.path}`;
  let url = `${baseUrl}${normalizedPath}`;

  if (opts.query && Object.keys(opts.query).length > 0) {
    const params = new URLSearchParams(opts.query);
    url += `?${params.toString()}`;
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${opts.authToken}`,
    Accept: "application/json",
  };

  if (opts.body && opts.method !== "GET" && opts.method !== "DELETE") {
    headers["Content-Type"] = "application/json";
  }

  const fetchOpts: RequestInit = {
    method: opts.method,
    headers,
  };

  if (opts.body && opts.method !== "GET" && opts.method !== "DELETE") {
    fetchOpts.body = JSON.stringify(opts.body);
  }

  const response = await fetch(url, fetchOpts);

  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  let body: unknown;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    body = await response.json();
  } else if (contentType.includes("text/")) {
    body = await response.text();
  } else if (response.status === 204) {
    body = null;
  } else {
    body = await response.text();
  }

  return {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
    body,
  };
}
