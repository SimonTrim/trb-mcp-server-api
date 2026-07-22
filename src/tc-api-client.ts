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

/**
 * API families served by the Trimble Connect platform:
 * - core:     Core API  https://<app-host>/tc/api/2.0  (v2.1 paths switch to /tc/api)
 * - bcf:      BCF/Topic API  https://<open-host>/bcf/<version>
 * - bcf-root: BCF/Topic host without version prefix (e.g. /bcf/versions, /foundation/...)
 * - pset:     Property Set Service  (regional URI resolved from GET /regions)
 * - org:      Organizer Service     (regional URI resolved from GET /regions)
 */
export type ApiType = "core" | "bcf" | "bcf-root" | "pset" | "org";

export function getCoreBaseUrl(region: Region, path = ""): string {
  const host = CORE_HOSTS[region] || CORE_HOSTS.us;
  // v2.1 endpoints are rooted at /tc/api (e.g. /tc/api/2.1/projects)
  if (path.startsWith("/2.1/")) return `https://${host}/tc/api`;
  return `https://${host}/tc/api/2.0`;
}

export function getBcfBaseUrl(region: Region, bcfVersion = "2.1"): string {
  const host = BCF_HOSTS[region] || BCF_HOSTS.us;
  return `https://${host}/bcf/${bcfVersion}`;
}

export function getBcfRootUrl(region: Region): string {
  const host = BCF_HOSTS[region] || BCF_HOSTS.us;
  return `https://${host}`;
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

/**
 * PSet / Organizer service URIs are region-specific and published by the
 * Core API /regions endpoint (fields "pset-api" and "org-api").
 * Resolved once per process and cached.
 */
interface RegionEntry {
  origin?: string;
  [key: string]: unknown;
}

let regionsCache: RegionEntry[] | null = null;

async function fetchRegions(authToken: string): Promise<RegionEntry[]> {
  if (regionsCache) return regionsCache;
  const response = await fetch(`https://${CORE_HOSTS.us}/tc/api/2.0/regions`, {
    headers: { Authorization: `Bearer ${authToken}`, Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Failed to resolve service URIs from /regions: ${response.status} ${response.statusText}`);
  }
  const data = (await response.json()) as RegionEntry[];
  if (!Array.isArray(data)) throw new Error("Unexpected /regions response shape");
  regionsCache = data;
  return data;
}

async function resolveServiceUri(region: Region, service: "pset-api" | "org-api", authToken: string): Promise<string> {
  const regions = await fetchRegions(authToken);
  const host = CORE_HOSTS[region] || CORE_HOSTS.us;
  const entry = regions.find((r) => r.origin === host) ?? regions.find((r) => r.isMaster === true);
  const uri = entry?.[service];
  if (typeof uri !== "string" || !uri) {
    throw new Error(`Service "${service}" URI not found for region "${region}" in /regions response.`);
  }
  return uri.replace(/\/+$/, "");
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

async function getBaseUrl(opts: TcApiCallOptions): Promise<string> {
  switch (opts.apiType) {
    case "bcf":
      return getBcfBaseUrl(opts.region, opts.bcfVersion);
    case "bcf-root":
      return getBcfRootUrl(opts.region);
    case "pset":
      return resolveServiceUri(opts.region, "pset-api", opts.authToken);
    case "org":
      return resolveServiceUri(opts.region, "org-api", opts.authToken);
    default:
      return getCoreBaseUrl(opts.region, opts.path);
  }
}

export async function tcApiCall(opts: TcApiCallOptions): Promise<TcApiResult> {
  const baseUrl = await getBaseUrl(opts);

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

  // Some Trimble Connect endpoints require a JSON body on DELETE
  // (e.g. remove attachments, remove users, remove tag objects).
  if (opts.body && opts.method !== "GET") {
    headers["Content-Type"] = "application/json";
  }

  const fetchOpts: RequestInit = {
    method: opts.method,
    headers,
  };

  if (opts.body && opts.method !== "GET") {
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
