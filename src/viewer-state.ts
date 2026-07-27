/**
 * Viewer-state bridge.
 *
 * The Trimble Connect extension (served from /tc-extension/) runs in the
 * user's browser next to the 3D viewer and periodically pushes the live
 * viewer state (camera, selection, snapshot) to POST /viewer-state.
 *
 * The MCP tools (get_current_viewer_state, tc_create_viewpoint_from_viewer)
 * read that state back, matching the pushing user with the calling user via
 * their Trimble Identity: both the extension token and the Agent Studio
 * token resolve to the same TC user through GET /users/me.
 *
 * Storage is in-memory, consistent with the per-instance MCP session store.
 */

export interface ViewerCamera {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  up: { x: number; y: number; z: number };
  fov?: number;
  projectionType?: string;
}

export interface ViewerSelectionEntry {
  modelId: string;
  modelName?: string;
  objectRuntimeIds?: number[];
  /** IFC GUIDs resolved by the extension via convertToObjectIds */
  externalIds?: string[];
}

export interface ViewerState {
  camera?: ViewerCamera;
  selection?: ViewerSelectionEntry[];
  /** data URL or raw base64 PNG of the current viewer canvas */
  snapshot?: string;
  project?: { id?: string; name?: string; location?: string };
  models?: { id: string; name?: string }[];
  /** Client-side capture timestamp (ms since epoch) */
  capturedAt?: number;
}

interface StoredState {
  state: ViewerState;
  storedAt: number;
  userEmail?: string;
}

const TTL_MS = 30 * 60 * 1000;
const stateByUserKey = new Map<string, StoredState>();

function prune(): void {
  const now = Date.now();
  for (const [key, entry] of stateByUserKey) {
    if (now - entry.storedAt > TTL_MS) stateByUserKey.delete(key);
  }
}

export function storeViewerState(userKeys: string[], state: ViewerState, userEmail?: string): void {
  prune();
  const entry: StoredState = { state, storedAt: Date.now(), userEmail };
  for (const key of userKeys) {
    if (key) stateByUserKey.set(key.toLowerCase(), entry);
  }
}

export interface ViewerStateMatch {
  entry: StoredState;
  /** "exact" = caller identity matched a stored key; "single_user_fallback" =
   * no key matched but only one user has pushed state, so we use it. */
  matchedBy: "exact" | "single_user_fallback";
}

export function getViewerState(userKeys: string[]): ViewerStateMatch | undefined {
  prune();
  for (const key of userKeys) {
    const entry = stateByUserKey.get(key.toLowerCase());
    if (entry) return { entry, matchedBy: "exact" };
  }
  // The Agent Studio gateway token may resolve to a different identity than
  // the extension token. If a single user is pushing state, it is safe enough
  // to fall back to it.
  const uniqueEntries = new Set(stateByUserKey.values());
  if (uniqueEntries.size === 1) {
    return { entry: [...uniqueEntries][0], matchedBy: "single_user_fallback" };
  }
  return undefined;
}

/** Diagnostic summary of the store: which keys hold state and how old it is. */
export function describeStore(): Record<string, unknown> {
  prune();
  const uniqueEntries = new Set(stateByUserKey.values());
  return {
    stored_states: uniqueEntries.size,
    keys: [...stateByUserKey.entries()].map(([key, entry]) => ({
      key,
      email: entry.userEmail ?? null,
      age_seconds: Math.round((Date.now() - entry.storedAt) / 1000),
    })),
  };
}

// ── User identity resolution ──

interface ResolvedUser {
  keys: string[];
  email?: string;
}

const userCache = new Map<string, { user: ResolvedUser; cachedAt: number }>();
const USER_CACHE_TTL_MS = 10 * 60 * 1000;

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const part = token.split(".")[1];
    if (!part) return {};
    const json = Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** Strip any (possibly repeated) "Bearer " prefixes off a token string. */
function normalizeBearer(token: string): string {
  let s = token.trim();
  while (s.toLowerCase().startsWith("bearer ")) s = s.slice(7).trim();
  return s;
}

/**
 * Resolve the identity keys of a token holder. Primary source is the TC Core
 * API /users/me (validates the token against Trimble at the same time);
 * fallback is the decoded JWT payload (sub / uuid / email claims).
 */
export async function resolveUserKeys(rawToken: string): Promise<ResolvedUser> {
  const token = normalizeBearer(rawToken);
  const cacheKey = token.slice(-48);
  const cached = userCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < USER_CACHE_TTL_MS) return cached.user;

  const keys = new Set<string>();
  let email: string | undefined;

  for (const host of ["app.connect.trimble.com", "app21.connect.trimble.com"]) {
    try {
      const res = await fetch(`https://${host}/tc/api/2.0/users/me`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (res.ok) {
        const me = (await res.json()) as Record<string, unknown>;
        if (typeof me.id === "string") keys.add(me.id);
        if (typeof me.tiduuid === "string") keys.add(me.tiduuid);
        if (typeof me.email === "string") {
          keys.add(me.email);
          email = me.email;
        }
        break;
      }
    } catch {
      // Network failure — try next host / fall back to JWT claims below.
    }
  }

  const payload = decodeJwtPayload(token);
  for (const claim of ["sub", "uuid", "email", "preferred_username"]) {
    const value = payload[claim];
    if (typeof value === "string" && value) {
      keys.add(value);
      if (claim === "email" && !email) email = value;
    }
  }

  const user: ResolvedUser = { keys: [...keys], email };
  if (user.keys.length > 0) {
    userCache.set(cacheKey, { user, cachedAt: Date.now() });
  } else {
    console.error(
      `[viewer-state] Could not resolve user identity: token length=${rawToken.length}, ` +
      `looks like JWT=${token.split(".").length === 3}, prefix=${token.slice(0, 12)}...`
    );
  }
  return user;
}

// ── BCF viewpoint construction ──

function normalize(v: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) || 1;
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

/** Strip a data-URL prefix so only the raw base64 payload remains. */
export function toRawBase64(snapshot: string): string {
  const comma = snapshot.indexOf(",");
  return snapshot.startsWith("data:") && comma !== -1 ? snapshot.slice(comma + 1) : snapshot;
}

/**
 * Build a BCF 2.1/3.0 viewpoint body from the cached viewer state:
 * perspective camera, selected components (IFC GUIDs) and PNG snapshot.
 */
export function buildBcfViewpoint(state: ViewerState, bcfVersion: string): Record<string, unknown> {
  const viewpoint: Record<string, unknown> = {};

  if (state.camera) {
    const { position, target, up, fov } = state.camera;
    const direction = normalize({ x: target.x - position.x, y: target.y - position.y, z: target.z - position.z });
    viewpoint.perspective_camera = {
      camera_view_point: { x: position.x, y: position.y, z: position.z },
      camera_direction: direction,
      camera_up_vector: normalize(up),
      field_of_view: fov ?? 60,
      ...(bcfVersion === "3.0" ? { aspect_ratio: 1.33 } : {}),
    };
  }

  const ifcGuids = (state.selection ?? []).flatMap((sel) => sel.externalIds ?? []);
  if (ifcGuids.length > 0) {
    viewpoint.components = {
      selection: ifcGuids.map((guid) => ({ ifc_guid: guid })),
      visibility: { default_visibility: true, exceptions: [] },
    };
  }

  if (state.snapshot) {
    viewpoint.snapshot = {
      snapshot_type: "png",
      snapshot_data: toRawBase64(state.snapshot),
    };
  }

  return viewpoint;
}

export function describeState(entry: StoredState): Record<string, unknown> {
  const { state, storedAt } = entry;
  const ageSeconds = Math.round((Date.now() - storedAt) / 1000);
  return {
    age_seconds: ageSeconds,
    stale: ageSeconds > 120,
    captured_at: new Date(storedAt).toISOString(),
    project: state.project ?? null,
    camera: state.camera ?? null,
    models: state.models ?? [],
    selection: (state.selection ?? []).map((sel) => ({
      modelId: sel.modelId,
      modelName: sel.modelName,
      objectCount: sel.externalIds?.length ?? sel.objectRuntimeIds?.length ?? 0,
      externalIds: (sel.externalIds ?? []).slice(0, 200),
    })),
    snapshot_available: Boolean(state.snapshot),
  };
}
