/**
 * "Agent Eyes" Trimble Connect extension.
 *
 * Loaded as a 3D-viewer extension inside Trimble Connect for Browser. It
 * connects to the Workspace API, captures the live viewer state (camera,
 * selection with IFC GUIDs, snapshot) and pushes it to POST /viewer-state
 * on this same server so the Agent Studio agent can read it back through
 * the get_current_viewer_state / tc_create_viewpoint_from_viewer MCP tools.
 */

export function createTcExtensionHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Agent Eyes</title>
<style>
  body { font-family: "Open Sans", system-ui, sans-serif; margin: 0; padding: 16px; color: #252a2e; font-size: 13px; }
  h1 { font-size: 15px; margin: 0 0 4px; }
  .sub { color: #6a6e79; margin: 0 0 16px; }
  .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e0e1e9; }
  .row .label { color: #6a6e79; }
  .ok { color: #006638; font-weight: 600; }
  .warn { color: #da212c; font-weight: 600; }
  button { margin-top: 16px; width: 100%; padding: 8px 12px; border: none; border-radius: 4px; background: #0063a3; color: #fff; font-size: 13px; cursor: pointer; }
  button:disabled { background: #b7b9c3; cursor: default; }
  .note { margin-top: 12px; color: #6a6e79; font-size: 12px; line-height: 1.5; }
</style>
</head>
<body>
<h1>Agent Eyes</h1>
<p class="sub">Partage la vue 3D avec l'agent IA</p>
<div class="row"><span class="label">Connexion</span><span id="conn">…</span></div>
<div class="row"><span class="label">Autorisation</span><span id="auth">…</span></div>
<div class="row"><span class="label">Projet</span><span id="project">–</span></div>
<div class="row"><span class="label">Sélection</span><span id="selection">0 objet</span></div>
<div class="row"><span class="label">Dernière synchro</span><span id="sync">jamais</span></div>
<button id="syncBtn" disabled>Synchroniser maintenant</button>
<p class="note">Tant que ce panneau est ouvert, la caméra, la sélection et une capture de la vue sont envoyées automatiquement à l'agent IA toutes les quelques secondes.</p>
<script type="module">
import * as WorkspaceAPI from "https://esm.sh/trimble-connect-workspace-api@0.3.34";

const els = {
  conn: document.getElementById("conn"),
  auth: document.getElementById("auth"),
  project: document.getElementById("project"),
  selection: document.getElementById("selection"),
  sync: document.getElementById("sync"),
  btn: document.getElementById("syncBtn"),
};

const PUSH_URL = new URL("/viewer-state", window.location.href).toString();
const PUSH_INTERVAL_MS = 5000;

let api = null;
let token = null;
let project = null;
let dirty = true;
let pushing = false;
let lastError = null;

function setText(el, text, cls) {
  el.textContent = text;
  el.className = cls || "";
}

// The token shape varies across Workspace API versions: it can be the raw
// JWT, be prefixed with "Bearer ", be a status string ("pending"/"denied"/
// "accepted"), or arrive later via the extension.accessToken event.
function normalizeToken(value) {
  if (typeof value !== "string") return null;
  let s = value.trim();
  if (s.toLowerCase().startsWith("bearer ")) s = s.slice(7).trim();
  return s.split(".").length === 3 ? s : null;
}

function onEvent(event, data) {
  if (event === "extension.accessToken") {
    const tok = normalizeToken(data);
    if (tok) {
      token = tok;
      setText(els.auth, "accordée", "ok");
      dirty = true;
    } else if (data === "denied") {
      setText(els.auth, "refusée", "warn");
    }
  }
  if (event === "viewer.selectionChanged" || event === "viewer.cameraChanged" || event === "viewer.modelLoaded") {
    dirty = true;
  }
}

async function capture() {
  const state = { capturedAt: Date.now() };

  try { state.camera = await api.viewer.getCamera(); } catch {}

  try {
    const models = await api.viewer.getModels("loaded");
    state.models = (models || []).map((m) => ({ id: m.id, versionId: m.versionId, name: m.name }));
  } catch {}

  try {
    const selection = await api.viewer.getSelection();
    const entries = [];
    let count = 0;
    for (const sel of selection || []) {
      const runtimeIds = (sel.objectRuntimeIds || []).slice(0, 500);
      count += runtimeIds.length;
      const entry = { modelId: sel.modelId, objectRuntimeIds: runtimeIds };
      try {
        entry.externalIds = await api.viewer.convertToObjectIds(sel.modelId, runtimeIds);
      } catch {}
      const model = (state.models || []).find((m) => m.id === sel.modelId);
      if (model) entry.modelName = model.name;
      entries.push(entry);
    }
    state.selection = entries;
    setText(els.selection, count + " objet" + (count > 1 ? "s" : ""));
  } catch {}

  try { state.snapshot = await api.viewer.getSnapshot(); } catch {}

  if (project) state.project = { id: project.id, name: project.name, location: project.location };
  return state;
}

async function push(force) {
  if (!api || !token || pushing) return;
  if (!dirty && !force) return;
  pushing = true;
  try {
    const state = await capture();
    const res = await fetch(PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify(state),
    });
    if (!res.ok) {
      let detail = "";
      try { detail = (await res.json()).error || ""; } catch {}
      throw new Error("HTTP " + res.status + (detail ? " - " + detail : ""));
    }
    dirty = false;
    lastError = null;
    setText(els.sync, new Date().toLocaleTimeString(), "ok");
  } catch (err) {
    lastError = String(err);
    setText(els.sync, "échec (" + lastError + ")", "warn");
  } finally {
    pushing = false;
  }
}

async function init() {
  try {
    api = await WorkspaceAPI.connect(window.parent, onEvent, 30000);
    setText(els.conn, "connecté", "ok");
  } catch (err) {
    setText(els.conn, "échec", "warn");
    return;
  }

  try {
    project = await api.project.getCurrentProject();
    setText(els.project, project?.name || project?.id || "–");
  } catch {}

  try {
    const result = await api.extension.requestPermission("accesstoken");
    const tok = normalizeToken(result);
    if (tok) {
      token = tok;
      setText(els.auth, "accordée", "ok");
    } else if (result === "denied") {
      setText(els.auth, "refusée", "warn");
    } else {
      // "pending"/"accepted"/other status: the token arrives (or is refreshed)
      // via the extension.accessToken event handled in onEvent.
      setText(els.auth, "en attente…");
    }
  } catch {
    setText(els.auth, "erreur", "warn");
  }

  els.btn.disabled = false;
  els.btn.addEventListener("click", () => push(true));

  setInterval(() => push(false), PUSH_INTERVAL_MS);
  // Full refresh (snapshot included) at a slower cadence even without events.
  setInterval(() => { dirty = true; }, 30000);
}

init();
</script>
</body>
</html>`;
}
