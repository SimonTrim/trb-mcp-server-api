/**
 * Additional MCP Apps (batch 2): views gallery, clash explorer, todos kanban,
 * team directory, folder browser and pset editor.
 *
 * Same pattern as tc-apps.ts: each app is an MCP resource (ui:// HTML page
 * loading the self-hosted MCP Apps SDK) plus a tool whose result carries
 * `_meta.ui.resourceUri` and `structuredContent` consumed by the page.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { tcApiCall, getCoreBaseUrl, type Region } from "./tc-api-client.js";
import { resolveUserKeys, getViewerState } from "./viewer-state.js";
import { EXT_APPS_SDK_URL, APP_CSP_META } from "./tc-apps.js";

const VIEWS_APP_URI = "ui://trimble-connect/views-gallery.html";
const CLASHES_APP_URI = "ui://trimble-connect/clashes.html";
const KANBAN_APP_URI = "ui://trimble-connect/todos-kanban.html";
const MEMBERS_APP_URI = "ui://trimble-connect/members.html";
const FOLDER_BROWSER_APP_URI = "ui://trimble-connect/folder-browser.html";
const PSET_EDITOR_APP_URI = "ui://trimble-connect/pset-editor.html";

// ── Small mapping helpers (local copies, kept intentionally simple) ──

function recArray(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter((i): i is Record<string, unknown> => typeof i === "object" && i !== null);
  if (typeof value === "object" && value !== null) {
    const r = value as Record<string, unknown>;
    for (const key of ["items", "data", "results", "views", "users", "clashsets"]) {
      if (Array.isArray(r[key])) return recArray(r[key]);
    }
  }
  return [];
}

function txt(value: unknown, fallback = "-"): string {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") {
    const r = value as Record<string, unknown>;
    const cand = r.name ?? r.label ?? r.title ?? r.email ?? r.id;
    if (cand !== undefined) return txt(cand, fallback);
    return fallback;
  }
  return String(value);
}

function personName(value: unknown): string {
  if (typeof value === "object" && value !== null) {
    const r = value as Record<string, unknown>;
    const full = [txt(r.firstName, ""), txt(r.lastName, "")].filter(Boolean).join(" ").trim();
    if (full) return full;
  }
  return txt(value);
}

function errText(status: number, statusText: string, body: unknown): string {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return `ERROR ${status} ${statusText}\n\n${String(text).slice(0, 500)}`;
}

// ═══════════════════════════════════════════════════════════════
// 1. Views gallery app
// ═══════════════════════════════════════════════════════════════

function createViewsAppHtml(): string {
  return String.raw`<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Vues 3D du projet</title>
  <style>
    :root { color-scheme: light; font-family: Inter, "Open Sans", Arial, sans-serif; }
    body { margin: 0; background: #f8fafc; color: #1e293b; }
    .app { padding: 14px; }
    .header { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 12px; }
    h1 { font-size: 16px; margin: 0 0 4px; }
    .muted { color: #64748b; font-size: 12px; }
    button { border: 1px solid #cbd5e1; border-radius: 8px; background: white; color: #0f172a; font-size: 12px; padding: 7px 9px; cursor: pointer; font-weight: 600; }
    button.primary { background: #0ea5e9; border-color: #0ea5e9; color: white; }
    input { width: 100%; box-sizing: border-box; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 10px; font-size: 13px; margin-bottom: 12px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; }
    .card { background: white; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
    .thumb { height: 110px; background: #f1f5f9; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 11px; cursor: pointer; }
    .thumb img { width: 100%; height: 100%; object-fit: cover; }
    .card-body { padding: 8px 10px; }
    .card-body h2 { font-size: 12px; margin: 0 0 3px; word-break: break-word; }
    .card-body .meta { color: #64748b; font-size: 11px; }
    .card-actions { padding: 0 10px 10px; display: flex; gap: 6px; }
    .card-actions button { font-size: 11px; padding: 4px 7px; flex: 1; }
    .empty, .error { padding: 18px; border: 1px dashed #cbd5e1; border-radius: 10px; background: white; color: #64748b; }
    .error { border-color: #fecaca; background: #fef2f2; color: #991b1b; }
  </style>
</head>
<body>
  <main class="app">
    <div class="header">
      <div>
        <h1>Vues 3D du projet</h1>
        <div class="muted" id="subtitle">En attente des données...</div>
      </div>
      <button id="refreshBtn" class="primary" type="button">Rafraîchir</button>
    </div>
    <input id="filter" type="search" placeholder="Filtrer par nom de vue..." />
    <div id="gridWrap" class="empty">Les vues 3D du projet vont s'afficher ici.</div>
  </main>
  <script type="module">
    let mcpApp = null;
    let data = null;
    const thumbs = {}; // viewId -> dataUrl
    const els = {
      subtitle: document.getElementById('subtitle'),
      filter: document.getElementById('filter'),
      gridWrap: document.getElementById('gridWrap'),
      refreshBtn: document.getElementById('refreshBtn'),
    };

    function escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
    }

    function renderGrid() {
      if (!data) return;
      const q = els.filter.value.trim().toLowerCase();
      const views = (data.views || []).filter(v => !q || String(v.name || '').toLowerCase().includes(q));
      if (views.length === 0) {
        els.gridWrap.className = 'empty';
        els.gridWrap.textContent = q ? 'Aucune vue ne correspond au filtre.' : 'Aucune vue 3D enregistrée dans ce projet.';
        return;
      }
      els.gridWrap.className = 'grid';
      els.gridWrap.innerHTML = views.map(v => {
        const t = thumbs[v.id] || v.thumbnail;
        return '<div class="card">' +
          '<div class="thumb" data-view="' + escapeHtml(v.id) + '">' +
            (t ? '<img src="' + escapeHtml(t) + '" alt="" />' : 'Cliquer pour charger la vignette') +
          '</div>' +
          '<div class="card-body"><h2>' + escapeHtml(v.name) + '</h2>' +
          '<div class="meta">' + escapeHtml(v.createdBy || '') + (v.modifiedOn ? ' — ' + escapeHtml(String(v.modifiedOn).substring(0, 10)) : '') + '</div></div>' +
          '<div class="card-actions"><button data-detail="' + escapeHtml(v.id) + '" type="button">Détails</button></div>' +
        '</div>';
      }).join('');
      els.gridWrap.querySelectorAll('.thumb').forEach(el => el.addEventListener('click', () => loadThumb(el.getAttribute('data-view'))));
      els.gridWrap.querySelectorAll('[data-detail]').forEach(el => el.addEventListener('click', () => {
        const v = (data.views || []).find(x => x.id === el.getAttribute('data-detail'));
        if (v) ask('Donne-moi le détail de la vue 3D "' + v.name + '" (id ' + v.id + ') du projet ' + data.projectId + ' : modèles, caméra, markups éventuels.');
      }));
    }

    async function loadThumb(viewId) {
      if (!mcpApp?.callServerTool || !viewId || thumbs[viewId]) return;
      const result = await mcpApp.callServerTool({ name: 'tc_views_app', arguments: { region: data.region, projectId: data.projectId, thumbnailViewId: viewId } });
      const dataUrl = result.structuredContent?.dataUrl;
      if (!result.isError && dataUrl) { thumbs[viewId] = dataUrl; renderGrid(); }
    }

    function render(newData) {
      if (!newData || newData.mode !== 'views') return;
      data = newData;
      els.subtitle.textContent = data.total + ' vue(s) — projet ' + (data.projectName || data.projectId);
      renderGrid();
    }

    async function refresh() {
      if (!mcpApp?.callServerTool) return;
      const result = await mcpApp.callServerTool({ name: 'tc_views_app', arguments: { region: data?.region || 'eu', projectId: data?.projectId, limit: data?.limit || 24 } });
      if (!result.isError && result.structuredContent) render(result.structuredContent);
    }

    async function ask(text) {
      if (!mcpApp?.sendMessage) return;
      await mcpApp.sendMessage({ role: 'user', content: [{ type: 'text', text }] });
    }

    els.refreshBtn.addEventListener('click', refresh);
    els.filter.addEventListener('input', renderGrid);

    async function connectMcpApp() {
      try {
        const mod = await import('${EXT_APPS_SDK_URL}');
        const { App, PostMessageTransport } = mod;
        mcpApp = new App({ name: 'Trimble Connect Views Gallery', version: '1.0.0' });
        mcpApp.ontoolresult = ({ structuredContent }) => render(structuredContent);
        await mcpApp.connect(new PostMessageTransport(window.parent));
      } catch (error) {
        els.gridWrap.className = 'error';
        els.gridWrap.textContent = 'MCP Apps SDK non chargé. Le résumé texte reste disponible dans le chat.';
        console.error(error);
      }
    }

    window.addEventListener('message', (event) => {
      const params = event.data?.params || {};
      const structured = params.structuredContent || params.result?.structuredContent;
      if (structured) render(structured);
    });

    connectMcpApp();
  </script>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════
// 2. Clash explorer app
// ═══════════════════════════════════════════════════════════════

function createClashesAppHtml(): string {
  return String.raw`<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Clashes du projet</title>
  <style>
    :root { color-scheme: light; font-family: Inter, "Open Sans", Arial, sans-serif; }
    body { margin: 0; background: #f8fafc; color: #1e293b; }
    .app { padding: 14px; }
    .header { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 12px; }
    h1 { font-size: 16px; margin: 0 0 4px; }
    .muted { color: #64748b; font-size: 12px; }
    button { border: 1px solid #cbd5e1; border-radius: 8px; background: white; color: #0f172a; font-size: 12px; padding: 7px 9px; cursor: pointer; font-weight: 600; }
    button.primary { background: #0ea5e9; border-color: #0ea5e9; color: white; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; background: white; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
    th { text-align: left; padding: 8px 10px; background: #f1f5f9; color: #334155; font-size: 11px; text-transform: uppercase; }
    td { padding: 7px 10px; border-top: 1px solid #f1f5f9; vertical-align: top; word-break: break-word; }
    .badge { display: inline-block; padding: 1px 7px; border-radius: 999px; background: #e0f2fe; color: #0369a1; font-size: 11px; }
    .badge.red { background: #fee2e2; color: #b91c1c; }
    .guid { color: #94a3b8; font-size: 10px; word-break: break-all; }
    .empty, .error { padding: 18px; border: 1px dashed #cbd5e1; border-radius: 10px; background: white; color: #64748b; }
    .error { border-color: #fecaca; background: #fef2f2; color: #991b1b; }
    .row-btn { font-size: 11px; padding: 3px 7px; }
  </style>
</head>
<body>
  <main class="app">
    <div class="header">
      <div>
        <h1 id="title">Clash sets du projet</h1>
        <div class="muted" id="subtitle">En attente des données...</div>
      </div>
      <div style="display:flex; gap:8px">
        <button id="backBtn" type="button" style="display:none">← Clash sets</button>
        <button id="refreshBtn" class="primary" type="button">Rafraîchir</button>
      </div>
    </div>
    <div id="wrap" class="empty">Les clash sets du projet vont s'afficher ici.</div>
  </main>
  <script type="module">
    let mcpApp = null;
    let data = null;
    const els = {
      title: document.getElementById('title'),
      subtitle: document.getElementById('subtitle'),
      wrap: document.getElementById('wrap'),
      backBtn: document.getElementById('backBtn'),
      refreshBtn: document.getElementById('refreshBtn'),
    };

    function escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
    }

    function render(newData) {
      if (!newData || (newData.mode !== 'sets' && newData.mode !== 'results')) return;
      data = newData;
      if (data.mode === 'sets') {
        els.title.textContent = 'Clash sets du projet';
        els.subtitle.textContent = data.sets.length + ' clash set(s)';
        els.backBtn.style.display = 'none';
        if (data.sets.length === 0) {
          els.wrap.className = 'empty';
          els.wrap.textContent = 'Aucun clash set dans ce projet.';
          return;
        }
        els.wrap.className = '';
        els.wrap.innerHTML = '<table><thead><tr><th>Nom</th><th>Conflits</th><th>Tolérance</th><th>Modifié</th><th></th></tr></thead><tbody>' +
          data.sets.map(s => '<tr>' +
            '<td>' + escapeHtml(s.name) + '</td>' +
            '<td>' + (s.count !== null ? '<span class="badge' + (s.count > 0 ? ' red' : '') + '">' + s.count + '</span>' : '-') + '</td>' +
            '<td>' + escapeHtml(s.clearance ?? '-') + '</td>' +
            '<td>' + escapeHtml((s.modifiedOn || '').substring(0, 10)) + '</td>' +
            '<td><button class="row-btn" data-set="' + escapeHtml(s.id) + '" type="button">Voir les résultats</button></td>' +
          '</tr>').join('') + '</tbody></table>';
        els.wrap.querySelectorAll('[data-set]').forEach(el => el.addEventListener('click', () => loadResults(el.getAttribute('data-set'))));
      } else {
        els.title.textContent = 'Résultats — ' + (data.setName || data.clashSetId);
        els.subtitle.textContent = data.items.length + ' conflit(s) affiché(s)' + (data.truncated ? ' (tronqué)' : '');
        els.backBtn.style.display = '';
        if (data.items.length === 0) {
          els.wrap.className = 'empty';
          els.wrap.textContent = 'Aucun conflit dans ce clash set.';
          return;
        }
        els.wrap.className = '';
        els.wrap.innerHTML = '<table><thead><tr><th>#</th><th>Objet A</th><th>Objet B</th><th>Distance</th></tr></thead><tbody>' +
          data.items.map((it, i) => '<tr>' +
            '<td>' + (i + 1) + '</td>' +
            '<td><div class="guid">' + escapeHtml(it.objectA || '-') + '</div></td>' +
            '<td><div class="guid">' + escapeHtml(it.objectB || '-') + '</div></td>' +
            '<td>' + escapeHtml(it.distance ?? '-') + '</td>' +
          '</tr>').join('') + '</tbody></table>';
      }
    }

    async function call(args) {
      if (!mcpApp?.callServerTool) return;
      const result = await mcpApp.callServerTool({ name: 'tc_clashes_app', arguments: args });
      if (!result.isError && result.structuredContent) render(result.structuredContent);
      else {
        els.wrap.className = 'error';
        els.wrap.textContent = 'Erreur lors du chargement des clashes.';
      }
    }

    function loadResults(setId) { call({ region: data.region, projectId: data.projectId, clashSetId: setId }); }

    els.backBtn.addEventListener('click', () => call({ region: data.region, projectId: data.projectId }));
    els.refreshBtn.addEventListener('click', () => {
      if (data?.mode === 'results') call({ region: data.region, projectId: data.projectId, clashSetId: data.clashSetId });
      else call({ region: data?.region || 'eu', projectId: data?.projectId });
    });

    async function connectMcpApp() {
      try {
        const mod = await import('${EXT_APPS_SDK_URL}');
        const { App, PostMessageTransport } = mod;
        mcpApp = new App({ name: 'Trimble Connect Clash Explorer', version: '1.0.0' });
        mcpApp.ontoolresult = ({ structuredContent }) => render(structuredContent);
        await mcpApp.connect(new PostMessageTransport(window.parent));
      } catch (error) {
        els.wrap.className = 'error';
        els.wrap.textContent = 'MCP Apps SDK non chargé. Le résumé texte reste disponible dans le chat.';
        console.error(error);
      }
    }

    window.addEventListener('message', (event) => {
      const params = event.data?.params || {};
      const structured = params.structuredContent || params.result?.structuredContent;
      if (structured) render(structured);
    });

    connectMcpApp();
  </script>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════
// 3. ToDos kanban app
// ═══════════════════════════════════════════════════════════════

function createKanbanAppHtml(): string {
  return String.raw`<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Kanban des ToDos</title>
  <style>
    :root { color-scheme: light; font-family: Inter, "Open Sans", Arial, sans-serif; }
    body { margin: 0; background: #f8fafc; color: #1e293b; }
    .app { padding: 14px; }
    .header { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 12px; }
    h1 { font-size: 16px; margin: 0 0 4px; }
    .muted { color: #64748b; font-size: 12px; }
    button { border: 1px solid #cbd5e1; border-radius: 8px; background: white; color: #0f172a; font-size: 12px; padding: 7px 9px; cursor: pointer; font-weight: 600; }
    button.primary { background: #0ea5e9; border-color: #0ea5e9; color: white; }
    .board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; align-items: start; }
    .col { background: #f1f5f9; border-radius: 10px; padding: 8px; }
    .col h2 { font-size: 12px; margin: 2px 4px 8px; color: #334155; text-transform: uppercase; }
    .card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 9px; margin-bottom: 7px; font-size: 12px; }
    .card h3 { font-size: 12px; margin: 0 0 4px; word-break: break-word; }
    .meta { color: #64748b; font-size: 11px; margin-bottom: 6px; }
    .badge { display: inline-block; padding: 0 6px; border-radius: 999px; font-size: 10px; margin-right: 4px; }
    .badge.crit { background: #fee2e2; color: #b91c1c; }
    .badge.high { background: #ffedd5; color: #c2410c; }
    .badge.norm { background: #e0f2fe; color: #0369a1; }
    .move { display: flex; gap: 4px; }
    .move button { font-size: 10px; padding: 2px 6px; flex: 1; }
    .empty, .error { padding: 18px; border: 1px dashed #cbd5e1; border-radius: 10px; background: white; color: #64748b; }
    .error { border-color: #fecaca; background: #fef2f2; color: #991b1b; }
    .busy { opacity: 0.5; pointer-events: none; }
  </style>
</head>
<body>
  <main class="app">
    <div class="header">
      <div>
        <h1>Kanban des ToDos</h1>
        <div class="muted" id="subtitle">En attente des données...</div>
      </div>
      <button id="refreshBtn" class="primary" type="button">Rafraîchir</button>
    </div>
    <div id="board" class="empty">Le kanban des ToDos va s'afficher ici.</div>
  </main>
  <script type="module">
    let mcpApp = null;
    let data = null;
    const COLS = [
      { key: 'NEW', label: 'Nouveau' },
      { key: 'IN_PROGRESS', label: 'En cours' },
      { key: 'CLOSED', label: 'Terminé' },
    ];
    const els = {
      subtitle: document.getElementById('subtitle'),
      board: document.getElementById('board'),
      refreshBtn: document.getElementById('refreshBtn'),
    };

    function escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
    }

    function bucket(status) {
      const s = String(status || '').toUpperCase();
      if (s.includes('PROGRESS') || s === 'INPROGRESS') return 'IN_PROGRESS';
      if (s === 'CLOSED' || s === 'DONE' || s === 'RESOLVED' || s === 'COMPLETED') return 'CLOSED';
      return 'NEW';
    }

    function prioBadge(p) {
      const s = String(p || '').toUpperCase();
      if (s === 'CRITICAL') return '<span class="badge crit">CRITICAL</span>';
      if (s === 'HIGH') return '<span class="badge high">HIGH</span>';
      if (!s || s === '-') return '';
      return '<span class="badge norm">' + escapeHtml(s) + '</span>';
    }

    function render(newData) {
      if (!newData || newData.mode !== 'kanban') return;
      data = newData;
      els.subtitle.textContent = data.todos.length + ' ToDo(s) — projet ' + (data.projectName || data.projectId);
      if (data.todos.length === 0) {
        els.board.className = 'empty';
        els.board.textContent = 'Aucun ToDo dans ce projet.';
        return;
      }
      els.board.className = 'board';
      els.board.innerHTML = COLS.map(col => {
        const cards = data.todos.filter(t => bucket(t.status) === col.key);
        return '<div class="col"><h2>' + col.label + ' (' + cards.length + ')</h2>' +
          cards.map(t => {
            const others = COLS.filter(c => c.key !== col.key);
            return '<div class="card" id="todo-' + escapeHtml(t.id) + '">' +
              '<h3>' + escapeHtml(t.label) + '</h3>' +
              '<div class="meta">' + prioBadge(t.priority) + escapeHtml(t.assignee || '') + (t.dueDate ? ' — éch. ' + escapeHtml(t.dueDate) : '') + '</div>' +
              '<div class="move">' + others.map(o => '<button type="button" data-todo="' + escapeHtml(t.id) + '" data-status="' + o.key + '">→ ' + o.label + '</button>').join('') + '</div>' +
            '</div>';
          }).join('') + '</div>';
      }).join('');
      els.board.querySelectorAll('[data-todo]').forEach(el => el.addEventListener('click', () => move(el.getAttribute('data-todo'), el.getAttribute('data-status'))));
    }

    async function move(todoId, newStatus) {
      if (!mcpApp?.callServerTool) return;
      const card = document.getElementById('todo-' + todoId);
      if (card) card.className = 'card busy';
      const result = await mcpApp.callServerTool({ name: 'tc_todos_kanban_app', arguments: { region: data.region, projectId: data.projectId, limit: data.limit, updateTodoId: todoId, newStatus } });
      if (!result.isError && result.structuredContent) render(result.structuredContent);
      else if (card) card.className = 'card';
    }

    async function refresh() {
      if (!mcpApp?.callServerTool) return;
      const result = await mcpApp.callServerTool({ name: 'tc_todos_kanban_app', arguments: { region: data?.region || 'eu', projectId: data?.projectId, limit: data?.limit || 60 } });
      if (!result.isError && result.structuredContent) render(result.structuredContent);
    }

    els.refreshBtn.addEventListener('click', refresh);

    async function connectMcpApp() {
      try {
        const mod = await import('${EXT_APPS_SDK_URL}');
        const { App, PostMessageTransport } = mod;
        mcpApp = new App({ name: 'Trimble Connect Todos Kanban', version: '1.0.0' });
        mcpApp.ontoolresult = ({ structuredContent }) => render(structuredContent);
        await mcpApp.connect(new PostMessageTransport(window.parent));
      } catch (error) {
        els.board.className = 'error';
        els.board.textContent = 'MCP Apps SDK non chargé. Le résumé texte reste disponible dans le chat.';
        console.error(error);
      }
    }

    window.addEventListener('message', (event) => {
      const params = event.data?.params || {};
      const structured = params.structuredContent || params.result?.structuredContent;
      if (structured) render(structured);
    });

    connectMcpApp();
  </script>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════
// 4. Team directory app
// ═══════════════════════════════════════════════════════════════

function createMembersAppHtml(): string {
  return String.raw`<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Équipe du projet</title>
  <style>
    :root { color-scheme: light; font-family: Inter, "Open Sans", Arial, sans-serif; }
    body { margin: 0; background: #f8fafc; color: #1e293b; }
    .app { padding: 14px; }
    .header { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 12px; }
    h1 { font-size: 16px; margin: 0 0 4px; }
    .muted { color: #64748b; font-size: 12px; }
    button { border: 1px solid #cbd5e1; border-radius: 8px; background: white; color: #0f172a; font-size: 12px; padding: 7px 9px; cursor: pointer; font-weight: 600; }
    button.primary { background: #0ea5e9; border-color: #0ea5e9; color: white; }
    input { width: 100%; box-sizing: border-box; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 10px; font-size: 13px; margin-bottom: 10px; }
    .chips { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
    .chip { border: 1px solid #cbd5e1; border-radius: 999px; background: white; color: #334155; font-size: 12px; padding: 4px 10px; cursor: pointer; }
    .chip.active { background: #0ea5e9; border-color: #0ea5e9; color: white; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; background: white; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
    th { text-align: left; padding: 8px 10px; background: #f1f5f9; color: #334155; font-size: 11px; text-transform: uppercase; }
    td { padding: 7px 10px; border-top: 1px solid #f1f5f9; word-break: break-word; }
    .badge { display: inline-block; padding: 1px 7px; border-radius: 999px; background: #e0f2fe; color: #0369a1; font-size: 11px; }
    .row-btn { font-size: 11px; padding: 3px 7px; }
    .empty, .error { padding: 18px; border: 1px dashed #cbd5e1; border-radius: 10px; background: white; color: #64748b; }
    .error { border-color: #fecaca; background: #fef2f2; color: #991b1b; }
  </style>
</head>
<body>
  <main class="app">
    <div class="header">
      <div>
        <h1>Équipe du projet</h1>
        <div class="muted" id="subtitle">En attente des données...</div>
      </div>
      <button id="refreshBtn" class="primary" type="button">Rafraîchir</button>
    </div>
    <input id="filter" type="search" placeholder="Filtrer par nom, email, société..." />
    <div class="chips" id="chips"></div>
    <div id="wrap" class="empty">Les membres du projet vont s'afficher ici.</div>
  </main>
  <script type="module">
    let mcpApp = null;
    let data = null;
    let roleFilter = '';
    const els = {
      subtitle: document.getElementById('subtitle'),
      filter: document.getElementById('filter'),
      chips: document.getElementById('chips'),
      wrap: document.getElementById('wrap'),
      refreshBtn: document.getElementById('refreshBtn'),
    };

    function escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
    }

    function renderTable() {
      if (!data) return;
      const q = els.filter.value.trim().toLowerCase();
      const members = (data.members || []).filter(m => {
        if (roleFilter && m.role !== roleFilter) return false;
        if (!q) return true;
        return (m.name + ' ' + m.email + ' ' + m.company).toLowerCase().includes(q);
      });
      const roles = [...new Set((data.members || []).map(m => m.role).filter(Boolean))];
      els.chips.innerHTML = '<span class="chip' + (roleFilter === '' ? ' active' : '') + '" data-role="">Tous</span>' +
        roles.map(r => '<span class="chip' + (roleFilter === r ? ' active' : '') + '" data-role="' + escapeHtml(r) + '">' + escapeHtml(r) + '</span>').join('');
      els.chips.querySelectorAll('.chip').forEach(el => el.addEventListener('click', () => { roleFilter = el.getAttribute('data-role'); renderTable(); }));
      if (members.length === 0) {
        els.wrap.className = 'empty';
        els.wrap.textContent = 'Aucun membre ne correspond au filtre.';
        return;
      }
      els.wrap.className = '';
      els.wrap.innerHTML = '<table><thead><tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Société</th><th></th></tr></thead><tbody>' +
        members.map(m => '<tr>' +
          '<td>' + escapeHtml(m.name) + '</td>' +
          '<td>' + escapeHtml(m.email) + '</td>' +
          '<td>' + (m.role ? '<span class="badge">' + escapeHtml(m.role) + '</span>' : '-') + '</td>' +
          '<td>' + escapeHtml(m.company || '-') + '</td>' +
          '<td><button class="row-btn" data-email="' + escapeHtml(m.email) + '" data-name="' + escapeHtml(m.name) + '" type="button">Assigner un ToDo</button></td>' +
        '</tr>').join('') + '</tbody></table>';
      els.wrap.querySelectorAll('[data-email]').forEach(el => el.addEventListener('click', () =>
        ask('Crée un ToDo dans le projet ' + data.projectId + ' assigné à ' + el.getAttribute('data-name') + ' (' + el.getAttribute('data-email') + '). Demande-moi le titre et la description avant de créer.')));
    }

    function render(newData) {
      if (!newData || newData.mode !== 'members') return;
      data = newData;
      els.subtitle.textContent = data.members.length + ' membre(s) — projet ' + (data.projectName || data.projectId);
      renderTable();
    }

    async function refresh() {
      if (!mcpApp?.callServerTool) return;
      const result = await mcpApp.callServerTool({ name: 'tc_members_app', arguments: { region: data?.region || 'eu', projectId: data?.projectId } });
      if (!result.isError && result.structuredContent) render(result.structuredContent);
    }

    async function ask(text) {
      if (!mcpApp?.sendMessage) return;
      await mcpApp.sendMessage({ role: 'user', content: [{ type: 'text', text }] });
    }

    els.refreshBtn.addEventListener('click', refresh);
    els.filter.addEventListener('input', renderTable);

    async function connectMcpApp() {
      try {
        const mod = await import('${EXT_APPS_SDK_URL}');
        const { App, PostMessageTransport } = mod;
        mcpApp = new App({ name: 'Trimble Connect Team Directory', version: '1.0.0' });
        mcpApp.ontoolresult = ({ structuredContent }) => render(structuredContent);
        await mcpApp.connect(new PostMessageTransport(window.parent));
      } catch (error) {
        els.wrap.className = 'error';
        els.wrap.textContent = 'MCP Apps SDK non chargé. Le résumé texte reste disponible dans le chat.';
        console.error(error);
      }
    }

    window.addEventListener('message', (event) => {
      const params = event.data?.params || {};
      const structured = params.structuredContent || params.result?.structuredContent;
      if (structured) render(structured);
    });

    connectMcpApp();
  </script>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════
// 5. Folder browser app
// ═══════════════════════════════════════════════════════════════

function createFolderBrowserAppHtml(): string {
  return String.raw`<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Explorateur de dossiers</title>
  <style>
    :root { color-scheme: light; font-family: Inter, "Open Sans", Arial, sans-serif; }
    body { margin: 0; background: #f8fafc; color: #1e293b; }
    .app { padding: 14px; }
    .header { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 10px; }
    h1 { font-size: 16px; margin: 0 0 4px; }
    .muted { color: #64748b; font-size: 12px; }
    button { border: 1px solid #cbd5e1; border-radius: 8px; background: white; color: #0f172a; font-size: 12px; padding: 7px 9px; cursor: pointer; font-weight: 600; }
    button.primary { background: #0ea5e9; border-color: #0ea5e9; color: white; }
    .crumbs { font-size: 12px; margin-bottom: 10px; color: #334155; }
    .crumbs a { color: #0369a1; cursor: pointer; text-decoration: none; }
    .crumbs a:hover { text-decoration: underline; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; background: white; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
    th { text-align: left; padding: 8px 10px; background: #f1f5f9; color: #334155; font-size: 11px; text-transform: uppercase; }
    td { padding: 7px 10px; border-top: 1px solid #f1f5f9; word-break: break-word; }
    .name { cursor: pointer; color: #0369a1; font-weight: 600; }
    .name:hover { text-decoration: underline; }
    .icon { margin-right: 5px; }
    .versions td { background: #f8fafc; font-size: 11px; }
    .empty, .error { padding: 18px; border: 1px dashed #cbd5e1; border-radius: 10px; background: white; color: #64748b; }
    .error { border-color: #fecaca; background: #fef2f2; color: #991b1b; }
  </style>
</head>
<body>
  <main class="app">
    <div class="header">
      <div>
        <h1>Explorateur de dossiers</h1>
        <div class="muted" id="subtitle">En attente des données...</div>
      </div>
      <button id="refreshBtn" class="primary" type="button">Rafraîchir</button>
    </div>
    <div class="crumbs" id="crumbs"></div>
    <div id="wrap" class="empty">Le contenu du projet va s'afficher ici.</div>
  </main>
  <script type="module">
    let mcpApp = null;
    let data = null;
    let crumbs = []; // [{id, name}]
    let expandedFile = null; // {fileId, versions}
    const els = {
      subtitle: document.getElementById('subtitle'),
      crumbs: document.getElementById('crumbs'),
      wrap: document.getElementById('wrap'),
      refreshBtn: document.getElementById('refreshBtn'),
    };

    function escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
    }

    function fmtSize(bytes) {
      const n = Number(bytes);
      if (!isFinite(n) || n <= 0) return '-';
      if (n > 1048576) return (n / 1048576).toFixed(1) + ' MB';
      if (n > 1024) return (n / 1024).toFixed(0) + ' KB';
      return n + ' B';
    }

    function renderCrumbs() {
      els.crumbs.innerHTML = crumbs.map((c, i) =>
        i === crumbs.length - 1 ? '<strong>' + escapeHtml(c.name) + '</strong>' : '<a data-idx="' + i + '">' + escapeHtml(c.name) + '</a>'
      ).join(' / ');
      els.crumbs.querySelectorAll('a').forEach(el => el.addEventListener('click', () => {
        const idx = Number(el.getAttribute('data-idx'));
        const target = crumbs[idx];
        crumbs = crumbs.slice(0, idx);
        navigate(target.id, target.name);
      }));
    }

    function renderTable() {
      if (!data) return;
      const items = data.items || [];
      if (items.length === 0) {
        els.wrap.className = 'empty';
        els.wrap.textContent = 'Ce dossier est vide.';
        return;
      }
      els.wrap.className = '';
      els.wrap.innerHTML = '<table><thead><tr><th>Nom</th><th>Taille</th><th>Modifié</th><th>Par</th></tr></thead><tbody>' +
        items.map(it => {
          let row = '<tr>' +
            '<td><span class="name" data-id="' + escapeHtml(it.id) + '" data-type="' + escapeHtml(it.type) + '" data-name="' + escapeHtml(it.name) + '">' +
            '<span class="icon">' + (it.type === 'FOLDER' ? '📁' : '📄') + '</span>' + escapeHtml(it.name) + '</span></td>' +
            '<td>' + (it.type === 'FOLDER' ? '-' : fmtSize(it.size)) + '</td>' +
            '<td>' + escapeHtml((it.modifiedOn || '').substring(0, 10)) + '</td>' +
            '<td>' + escapeHtml(it.modifiedBy || '-') + '</td>' +
          '</tr>';
          if (expandedFile && expandedFile.fileId === it.id) {
            row += expandedFile.versions.map(v => '<tr class="versions"><td colspan="4">↳ v' + escapeHtml(v.versionNumber) + ' — ' +
              escapeHtml((v.createdOn || '').substring(0, 16).replace('T', ' ')) + ' — ' + escapeHtml(v.createdBy || '-') + ' — ' + fmtSize(v.size) + '</td></tr>').join('');
          }
          return row;
        }).join('') + '</tbody></table>';
      els.wrap.querySelectorAll('.name').forEach(el => el.addEventListener('click', () => {
        const id = el.getAttribute('data-id');
        const type = el.getAttribute('data-type');
        const name = el.getAttribute('data-name');
        if (type === 'FOLDER') navigate(id, name);
        else toggleVersions(id);
      }));
    }

    async function call(args) {
      if (!mcpApp?.callServerTool) return null;
      const result = await mcpApp.callServerTool({ name: 'tc_folder_browser_app', arguments: args });
      return !result.isError && result.structuredContent ? result.structuredContent : null;
    }

    async function navigate(folderId, name) {
      const res = await call({ region: data?.region || 'eu', projectId: data?.projectId, folderId });
      if (res) {
        expandedFile = null;
        if (name) crumbs.push({ id: folderId, name });
        render(res, true);
      }
    }

    async function toggleVersions(fileId) {
      if (expandedFile && expandedFile.fileId === fileId) { expandedFile = null; renderTable(); return; }
      const res = await call({ region: data.region, projectId: data.projectId, fileId });
      if (res && res.mode === 'versions') { expandedFile = { fileId, versions: res.versions }; renderTable(); }
    }

    function render(newData, keepCrumbs) {
      if (!newData || newData.mode !== 'folder') return;
      data = newData;
      if (!keepCrumbs) crumbs = [{ id: data.folderId, name: data.folderName || 'Racine' }];
      els.subtitle.textContent = data.items.length + ' élément(s) — projet ' + (data.projectName || data.projectId);
      renderCrumbs();
      renderTable();
    }

    els.refreshBtn.addEventListener('click', async () => {
      const current = crumbs[crumbs.length - 1];
      const res = await call({ region: data?.region || 'eu', projectId: data?.projectId, folderId: current?.id });
      if (res) { expandedFile = null; render(res, true); }
    });

    async function connectMcpApp() {
      try {
        const mod = await import('${EXT_APPS_SDK_URL}');
        const { App, PostMessageTransport } = mod;
        mcpApp = new App({ name: 'Trimble Connect Folder Browser', version: '1.0.0' });
        mcpApp.ontoolresult = ({ structuredContent }) => render(structuredContent);
        await mcpApp.connect(new PostMessageTransport(window.parent));
      } catch (error) {
        els.wrap.className = 'error';
        els.wrap.textContent = 'MCP Apps SDK non chargé. Le résumé texte reste disponible dans le chat.';
        console.error(error);
      }
    }

    window.addEventListener('message', (event) => {
      const params = event.data?.params || {};
      const structured = params.structuredContent || params.result?.structuredContent;
      if (structured) render(structured);
    });

    connectMcpApp();
  </script>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════
// 6. PSet editor app (viewer bridge + PSet service)
// ═══════════════════════════════════════════════════════════════

function createPsetEditorAppHtml(): string {
  return String.raw`<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>PSets de la sélection</title>
  <style>
    :root { color-scheme: light; font-family: Inter, "Open Sans", Arial, sans-serif; }
    body { margin: 0; background: #f8fafc; color: #1e293b; }
    .app { padding: 14px; }
    .header { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 12px; }
    h1 { font-size: 16px; margin: 0 0 4px; }
    .muted { color: #64748b; font-size: 12px; }
    button { border: 1px solid #cbd5e1; border-radius: 8px; background: white; color: #0f172a; font-size: 12px; padding: 7px 9px; cursor: pointer; font-weight: 600; }
    button.primary { background: #0ea5e9; border-color: #0ea5e9; color: white; }
    .obj { background: white; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 10px; overflow: hidden; }
    .obj-head { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
    .obj-head h2 { font-size: 13px; margin: 0 0 2px; }
    .guid { color: #94a3b8; font-size: 11px; word-break: break-all; }
    .pset { border-top: 1px solid #f1f5f9; padding: 10px 12px; }
    .pset h3 { font-size: 12px; margin: 0 0 8px; color: #334155; }
    .field { margin-bottom: 8px; }
    .field label { display: block; font-size: 11px; color: #64748b; margin-bottom: 3px; }
    .field input, .field select, .field textarea { width: 100%; box-sizing: border-box; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; font-size: 12px; font-family: inherit; }
    .field textarea { min-height: 44px; }
    .save-row { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
    .status { font-size: 11px; }
    .status.ok { color: #047857; }
    .status.err { color: #b91c1c; }
    .warn { display: none; background: #fef3c7; border: 1px solid #fcd34d; color: #92400e; border-radius: 8px; padding: 8px 10px; font-size: 12px; margin-bottom: 10px; }
    .warn.show { display: block; }
    .empty, .error { padding: 18px; border: 1px dashed #cbd5e1; border-radius: 10px; background: white; color: #64748b; }
    .error { border-color: #fecaca; background: #fef2f2; color: #991b1b; }
  </style>
</head>
<body>
  <main class="app">
    <div class="header">
      <div>
        <h1>PSets des objets sélectionnés</h1>
        <div class="muted" id="subtitle">En attente des données...</div>
      </div>
      <button id="refreshBtn" class="primary" type="button">Rafraîchir</button>
    </div>
    <div id="staleWarn" class="warn"></div>
    <div id="wrap" class="empty">Les property sets modifiables des objets sélectionnés vont s'afficher ici.</div>
  </main>
  <script type="module">
    let mcpApp = null;
    let data = null;
    const els = {
      subtitle: document.getElementById('subtitle'),
      staleWarn: document.getElementById('staleWarn'),
      wrap: document.getElementById('wrap'),
      refreshBtn: document.getElementById('refreshBtn'),
    };

    function escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
    }

    function fieldHtml(psetIdx, objIdx, f, fi) {
      const id = 'f-' + objIdx + '-' + psetIdx + '-' + fi;
      let control;
      const val = f.value === null || f.value === undefined ? '' : f.value;
      if (f.enum && f.enum.length) {
        control = '<select id="' + id + '"><option value=""></option>' + f.enum.map(o =>
          '<option value="' + escapeHtml(o) + '"' + (String(val) === o ? ' selected' : '') + '>' + escapeHtml(o) + '</option>').join('') + '</select>';
      } else if (f.type === 'boolean') {
        control = '<select id="' + id + '"><option value=""></option><option value="true"' + (val === true ? ' selected' : '') + '>Oui</option><option value="false"' + (val === false ? ' selected' : '') + '>Non</option></select>';
      } else if (f.format === 'date') {
        control = '<input id="' + id + '" type="date" value="' + escapeHtml(val) + '" />';
      } else if (f.type === 'array') {
        const lines = Array.isArray(val) ? val.join('\n') : String(val);
        control = '<textarea id="' + id + '" placeholder="Une valeur par ligne">' + escapeHtml(lines) + '</textarea>';
      } else if (f.type === 'number' || f.type === 'integer') {
        control = '<input id="' + id + '" type="number" value="' + escapeHtml(val) + '" />';
      } else {
        control = '<input id="' + id + '" type="text" value="' + escapeHtml(typeof val === 'object' ? JSON.stringify(val) : val) + '" />';
      }
      return '<div class="field"><label for="' + id + '">' + escapeHtml(f.label) + '</label>' + control + '</div>';
    }

    function collectValues(objIdx, psetIdx, pset) {
      const props = {};
      pset.fields.forEach((f, fi) => {
        const el = document.getElementById('f-' + objIdx + '-' + psetIdx + '-' + fi);
        if (!el) return;
        let v = el.value;
        if (v === '') return;
        if (f.type === 'boolean') v = v === 'true';
        else if (f.type === 'array') v = v.split('\n').map(s => s.trim()).filter(Boolean);
        else if (f.type === 'number' || f.type === 'integer') v = Number(v);
        props[f.key] = v;
      });
      return props;
    }

    function render(newData) {
      if (!newData || newData.mode !== 'psets') return;
      data = newData;
      els.subtitle.textContent = data.objects.length + ' objet(s) — capturé il y a ' + data.ageSeconds + ' s';
      if (data.stale) {
        els.staleWarn.className = 'warn show';
        els.staleWarn.textContent = 'Données anciennes — vérifiez que le panneau Agent Eyes est toujours ouvert.';
      } else {
        els.staleWarn.className = 'warn';
      }
      if (data.objects.length === 0) {
        els.wrap.className = 'empty';
        els.wrap.textContent = 'Aucun objet sélectionné, ou aucun PSet modifiable trouvé pour la sélection.';
        return;
      }
      els.wrap.className = '';
      els.wrap.innerHTML = data.objects.map((obj, oi) =>
        '<div class="obj"><div class="obj-head"><h2>' + escapeHtml(obj.name || 'Objet ' + (oi + 1)) + '</h2>' +
        '<div class="guid">GUID ' + escapeHtml(obj.guid) + '</div></div>' +
        (obj.psets.length === 0 ? '<div class="pset muted">Aucun PSet pour cet objet.</div>' :
          obj.psets.map((p, pi) =>
            '<div class="pset"><h3>' + escapeHtml(p.defName) + '</h3>' +
            p.fields.map((f, fi) => fieldHtml(pi, oi, f, fi)).join('') +
            '<div class="save-row"><button class="primary" type="button" data-obj="' + oi + '" data-pset="' + pi + '">Enregistrer</button>' +
            '<span class="status" id="st-' + oi + '-' + pi + '"></span></div></div>'
          ).join('')) +
        '</div>'
      ).join('');
      els.wrap.querySelectorAll('button[data-obj]').forEach(el => el.addEventListener('click', () =>
        save(Number(el.getAttribute('data-obj')), Number(el.getAttribute('data-pset')))));
    }

    async function save(objIdx, psetIdx) {
      if (!mcpApp?.callServerTool) return;
      const obj = data.objects[objIdx];
      const pset = obj.psets[psetIdx];
      const st = document.getElementById('st-' + objIdx + '-' + psetIdx);
      st.className = 'status'; st.textContent = 'Enregistrement...';
      const props = collectValues(objIdx, psetIdx, pset);
      const result = await mcpApp.callServerTool({ name: 'tc_pset_editor_app', arguments: {
        region: data.region,
        save: { link: pset.link, libId: pset.libId, defId: pset.defId, props: JSON.stringify(props) },
      }});
      if (!result.isError) {
        st.className = 'status ok'; st.textContent = 'Enregistré ✓';
      } else {
        st.className = 'status err';
        st.textContent = 'Échec: ' + String(result.content?.[0]?.text || 'erreur').substring(0, 120);
      }
    }

    async function refresh() {
      if (!mcpApp?.callServerTool) return;
      const result = await mcpApp.callServerTool({ name: 'tc_pset_editor_app', arguments: { region: data?.region || 'eu' } });
      if (!result.isError && result.structuredContent) render(result.structuredContent);
      else {
        els.wrap.className = 'error';
        els.wrap.textContent = 'État du viewer indisponible. Ouvrez le panneau « Agent Eyes » puis réessayez.';
      }
    }

    els.refreshBtn.addEventListener('click', refresh);

    async function connectMcpApp() {
      try {
        const mod = await import('${EXT_APPS_SDK_URL}');
        const { App, PostMessageTransport } = mod;
        mcpApp = new App({ name: 'Trimble Connect PSet Editor', version: '1.0.0' });
        mcpApp.ontoolresult = ({ structuredContent }) => render(structuredContent);
        await mcpApp.connect(new PostMessageTransport(window.parent));
      } catch (error) {
        els.wrap.className = 'error';
        els.wrap.textContent = 'MCP Apps SDK non chargé. Le résumé texte reste disponible dans le chat.';
        console.error(error);
      }
    }

    window.addEventListener('message', (event) => {
      const params = event.data?.params || {};
      const structured = params.structuredContent || params.result?.structuredContent;
      if (structured) render(structured);
    });

    connectMcpApp();
  </script>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════
// Registration
// ═══════════════════════════════════════════════════════════════

export function registerTcAppsExtra(
  srv: McpServer,
  getToken: (extra: { sessionId?: string }) => string
): void {
  const regionEnum = z.enum(["us", "eu", "ap", "ap-au"]).describe("Trimble Connect region: us (North America), eu (Europe), ap (Asia-Pacific), ap-au (Australia)");

  const registerAppResource = (name: string, uri: string, title: string, description: string, html: () => string) => {
    const meta = { ...APP_CSP_META, "openai/widgetDescription": description, "openai/widgetPrefersBorder": true };
    srv.registerResource(name, uri, { title, description, mimeType: "text/html+skybridge", _meta: meta }, async () => ({
      contents: [{ uri, mimeType: "text/html+skybridge", text: html(), _meta: meta }],
    }));
  };

  const appToolMeta = (uri: string, invoking: string, invoked: string) => ({
    "ui": { "resourceUri": uri },
    "openai/outputTemplate": uri,
    "openai/widgetAccessible": true,
    "openai/toolInvocation/invoking": invoking,
    "openai/toolInvocation/invoked": invoked,
  });

  // ── 1. Views gallery ──

  registerAppResource(
    "trimble-connect-views-app",
    VIEWS_APP_URI,
    "Galerie des vues 3D",
    "Interactive MCP App gallery of the project's saved 3D views with on-demand thumbnails.",
    createViewsAppHtml
  );

  srv.registerTool(
    "tc_views_app",
    {
      title: "Afficher la galerie des vues 3D",
      description: "Show an interactive MCP App gallery of the project's saved 3D views (name, author, date, thumbnail loaded on click). Use when the user asks to SEE the project views (e.g. 'montre-moi les vues 3D du projet', 'galerie des vues'). For plain data without UI, use tc_list_views instead.",
      inputSchema: {
        region: regionEnum,
        projectId: z.string().describe("Trimble Connect project ID"),
        limit: z.number().min(1).max(100).default(24).describe("Max number of views to display"),
        thumbnailViewId: z.string().optional().describe("INTERNAL (used by the app UI): fetch the thumbnail of this view as a data URL instead of listing views"),
      },
      _meta: appToolMeta(VIEWS_APP_URI, "Chargement des vues...", "Galerie prête."),
    },
    async ({ region, projectId, limit, thumbnailViewId }, extra) => {
      const token = getToken(extra);

      if (thumbnailViewId) {
        const rawToken = token.replace(/^Bearer\s+/i, "");
        const url = `${getCoreBaseUrl(region as Region)}/views/${encodeURIComponent(thumbnailViewId)}/thumbnail`;
        try {
          const res = await fetch(url, { headers: { Authorization: `Bearer ${rawToken}` } });
          if (!res.ok) return { content: [{ type: "text" as const, text: `Vignette indisponible (${res.status}).` }], isError: true };
          const buffer = Buffer.from(await res.arrayBuffer());
          if (buffer.byteLength > 2_000_000) return { content: [{ type: "text" as const, text: "Vignette trop volumineuse." }], isError: true };
          const contentType = res.headers.get("content-type")?.split(";")[0] || "image/png";
          return {
            content: [{ type: "text" as const, text: `Vignette de la vue ${thumbnailViewId} chargée.` }],
            structuredContent: { mode: "thumbnail", viewId: thumbnailViewId, dataUrl: `data:${contentType};base64,${buffer.toString("base64")}` },
          };
        } catch (error) {
          return { content: [{ type: "text" as const, text: `Vignette indisponible: ${String(error)}` }], isError: true };
        }
      }

      const result = await tcApiCall({ method: "GET", region: region as Region, path: "/views", query: { projectId }, authToken: token });
      if (result.status >= 400) return { content: [{ type: "text" as const, text: errText(result.status, result.statusText, result.body) }], isError: true };
      const views = recArray(result.body)
        .map((v) => ({
          id: txt(v.id),
          name: txt(v.name ?? v.label),
          createdBy: personName(v.createdBy ?? v.author),
          modifiedOn: txt(v.modifiedOn ?? v.createdOn, ""),
          thumbnail: typeof v.thumbnail === "string" && v.thumbnail.startsWith("http") ? v.thumbnail : undefined,
        }))
        .sort((a, b) => (b.modifiedOn > a.modifiedOn ? 1 : -1))
        .slice(0, limit);
      const dataOut = { mode: "views" as const, region: region as string, projectId, limit, total: views.length, views };
      return {
        content: [{ type: "text" as const, text: `Galerie affichée: ${views.length} vue(s) 3D du projet ${projectId}. Le détail est visible dans la galerie interactive.` }],
        structuredContent: dataOut,
        _meta: appToolMeta(VIEWS_APP_URI, "Chargement des vues...", "Galerie prête."),
      };
    }
  );

  // ── 2. Clash explorer ──

  registerAppResource(
    "trimble-connect-clashes-app",
    CLASHES_APP_URI,
    "Explorateur de clashes",
    "Interactive MCP App to browse the project's clash sets and drill into clash results.",
    createClashesAppHtml
  );

  srv.registerTool(
    "tc_clashes_app",
    {
      title: "Afficher l'explorateur de clashes",
      description: "Show an interactive MCP App listing the project's clash sets; the user can drill into a set to see the clash results (conflicting object pairs). Use when the user asks to SEE the clashes (e.g. 'montre-moi les clashes du projet', 'résultats du clash set X'). For plain data without UI, use tc_clashes instead.",
      inputSchema: {
        region: regionEnum,
        projectId: z.string().describe("Trimble Connect project ID"),
        clashSetId: z.string().optional().describe("If set, show the results of this clash set instead of the list of sets"),
        limit: z.number().min(1).max(500).default(100).describe("Max clash results to display"),
      },
      _meta: appToolMeta(CLASHES_APP_URI, "Chargement des clashes...", "Explorateur prêt."),
    },
    async ({ region, projectId, clashSetId, limit }, extra) => {
      const token = getToken(extra);

      if (clashSetId) {
        const [setRes, itemsRes] = await Promise.all([
          tcApiCall({ method: "GET", region: region as Region, path: `/clashsets/${clashSetId}`, authToken: token }),
          tcApiCall({ method: "GET", region: region as Region, path: `/clashsets/${clashSetId}/items`, authToken: token }),
        ]);
        if (itemsRes.status >= 400) return { content: [{ type: "text" as const, text: errText(itemsRes.status, itemsRes.statusText, itemsRes.body) }], isError: true };
        const rawItems = recArray(itemsRes.body);
        const items = rawItems.slice(0, limit).map((it) => {
          const objects = recArray(it.objects ?? it.clashingObjects);
          const pick = (o: Record<string, unknown> | undefined) => (o ? txt(o.objectId ?? o.guid ?? o.id, "") + (o.modelId ? ` (modèle ${txt(o.modelId)})` : "") : "");
          return {
            id: txt(it.id, ""),
            objectA: pick(objects[0]) || txt(it.sourceObjectId ?? it.object1, ""),
            objectB: pick(objects[1]) || txt(it.targetObjectId ?? it.object2, ""),
            distance: txt(it.distance ?? it.penetration ?? it.clearance, ""),
          };
        });
        const setRec = (typeof setRes.body === "object" && setRes.body !== null ? setRes.body : {}) as Record<string, unknown>;
        const dataOut = {
          mode: "results" as const,
          region: region as string,
          projectId,
          clashSetId,
          setName: txt(setRec.name, clashSetId),
          truncated: rawItems.length > limit,
          items,
        };
        return {
          content: [{ type: "text" as const, text: `Résultats du clash set « ${dataOut.setName} »: ${items.length} conflit(s) affiché(s)${dataOut.truncated ? " (liste tronquée)" : ""}. Le détail est visible dans l'explorateur interactif.` }],
          structuredContent: dataOut,
          _meta: appToolMeta(CLASHES_APP_URI, "Chargement des clashes...", "Explorateur prêt."),
        };
      }

      const result = await tcApiCall({ method: "GET", region: region as Region, path: "/clashsets", query: { projectId }, authToken: token });
      if (result.status >= 400) return { content: [{ type: "text" as const, text: errText(result.status, result.statusText, result.body) }], isError: true };
      const sets = recArray(result.body).map((s) => {
        const count = s.clashCount ?? s.count ?? s.itemsCount ?? s.numberOfItems;
        return {
          id: txt(s.id),
          name: txt(s.name ?? s.label),
          count: typeof count === "number" ? count : null,
          clearance: txt(s.clearance ?? s.tolerance, ""),
          modifiedOn: txt(s.modifiedOn ?? s.createdOn, ""),
        };
      });
      const dataOut = { mode: "sets" as const, region: region as string, projectId, sets };
      return {
        content: [{ type: "text" as const, text: `Explorateur de clashes affiché: ${sets.length} clash set(s) dans le projet ${projectId}. Cliquez sur un set pour voir ses résultats.` }],
        structuredContent: dataOut,
        _meta: appToolMeta(CLASHES_APP_URI, "Chargement des clashes...", "Explorateur prêt."),
      };
    }
  );

  // ── 3. ToDos kanban ──

  registerAppResource(
    "trimble-connect-todos-kanban-app",
    KANBAN_APP_URI,
    "Kanban des ToDos",
    "Interactive MCP App kanban board of project ToDos with one-click status changes.",
    createKanbanAppHtml
  );

  const fetchKanbanData = async (region: Region, projectId: string, limit: number, token: string) => {
    const result = await tcApiCall({ method: "GET", region, path: "/todos", query: { projectId }, authToken: token });
    if (result.status >= 400) return { error: errText(result.status, result.statusText, result.body) };
    const todos = recArray(result.body)
      .map((t) => ({
        id: txt(t.id),
        label: txt(t.label ?? t.title),
        status: txt(t.status, "NEW"),
        priority: txt(t.priority, ""),
        assignee: personName((Array.isArray(t.assignees) ? (t.assignees as unknown[])[0] : t.assignees) ?? t.assignedTo ?? ""),
        dueDate: txt(t.dueDate ?? t.endDate, "").substring(0, 10),
        modifiedOn: txt(t.modifiedOn ?? t.createdOn, ""),
      }))
      .sort((a, b) => (b.modifiedOn > a.modifiedOn ? 1 : -1))
      .slice(0, limit);
    return { todos };
  };

  srv.registerTool(
    "tc_todos_kanban_app",
    {
      title: "Afficher le kanban des ToDos",
      description: "Show an interactive MCP App kanban board of the project ToDos with three columns (Nouveau / En cours / Terminé) and one-click status changes. Use when the user asks for a kanban/board of tasks (e.g. 'affiche le kanban des ToDos', 'tableau de bord des tâches par statut'). For a simple table use tc_todos_app; for plain data use tc_todos.",
      inputSchema: {
        region: regionEnum,
        projectId: z.string().describe("Trimble Connect project ID"),
        limit: z.number().min(1).max(200).default(60).describe("Max ToDos on the board"),
        updateTodoId: z.string().optional().describe("INTERNAL (used by the app UI): ToDo ID whose status must be changed before returning the refreshed board"),
        newStatus: z.enum(["NEW", "IN_PROGRESS", "CLOSED"]).optional().describe("INTERNAL: target status for updateTodoId"),
      },
      _meta: appToolMeta(KANBAN_APP_URI, "Chargement du kanban...", "Kanban prêt."),
    },
    async ({ region, projectId, limit, updateTodoId, newStatus }, extra) => {
      const token = getToken(extra);

      let updateNote = "";
      if (updateTodoId && newStatus) {
        let upd = await tcApiCall({ method: "PUT", region: region as Region, path: `/todos/${updateTodoId}`, body: { status: newStatus }, authToken: token });
        if (upd.status >= 400) {
          // Some tenants only accept the boolean "done" flag.
          upd = await tcApiCall({ method: "PUT", region: region as Region, path: `/todos/${updateTodoId}`, body: { done: newStatus === "CLOSED" }, authToken: token });
        }
        updateNote = upd.status < 400 ? ` (ToDo ${updateTodoId} → ${newStatus})` : ` (échec de la mise à jour du ToDo ${updateTodoId}: ${upd.status})`;
        if (upd.status >= 400) console.error(`[kanban-app] todo update failed: ${errText(upd.status, upd.statusText, upd.body)}`);
      }

      const kanban = await fetchKanbanData(region as Region, projectId, limit, token);
      if ("error" in kanban) return { content: [{ type: "text" as const, text: kanban.error as string }], isError: true };
      const dataOut = { mode: "kanban" as const, region: region as string, projectId, limit, todos: kanban.todos };
      return {
        content: [{ type: "text" as const, text: `Kanban affiché: ${kanban.todos!.length} ToDo(s) du projet ${projectId}${updateNote}. Le détail est visible dans le kanban interactif.` }],
        structuredContent: dataOut,
        _meta: appToolMeta(KANBAN_APP_URI, "Chargement du kanban...", "Kanban prêt."),
      };
    }
  );

  // ── 4. Team directory ──

  registerAppResource(
    "trimble-connect-members-app",
    MEMBERS_APP_URI,
    "Équipe du projet",
    "Interactive MCP App directory of project members with role and company filters.",
    createMembersAppHtml
  );

  srv.registerTool(
    "tc_members_app",
    {
      title: "Afficher l'annuaire de l'équipe",
      description: "Show an interactive MCP App directory of the project members (name, email, role, company) with text search and role filters, plus a quick action to assign a ToDo to a member. Use when the user asks to SEE the team (e.g. 'montre-moi l'équipe du projet', 'annuaire des membres', 'qui est sur le projet ?'). For plain data without UI, use tc_list_project_users instead.",
      inputSchema: {
        region: regionEnum,
        projectId: z.string().describe("Trimble Connect project ID"),
      },
      _meta: appToolMeta(MEMBERS_APP_URI, "Chargement de l'équipe...", "Annuaire prêt."),
    },
    async ({ region, projectId }, extra) => {
      const token = getToken(extra);
      const result = await tcApiCall({ method: "GET", region: region as Region, path: `/projects/${projectId}/users`, authToken: token });
      if (result.status >= 400) return { content: [{ type: "text" as const, text: errText(result.status, result.statusText, result.body) }], isError: true };
      const members = recArray(result.body).map((u) => ({
        id: txt(u.id),
        name: personName(u),
        email: txt(u.email, ""),
        role: txt(u.role ?? u.roleName, "").toUpperCase(),
        company: txt(u.company ?? u.companyName, ""),
        status: txt(u.status, ""),
      }));
      const dataOut = { mode: "members" as const, region: region as string, projectId, members };
      return {
        content: [{ type: "text" as const, text: `Annuaire affiché: ${members.length} membre(s) du projet ${projectId}. Le détail est visible dans l'annuaire interactif.` }],
        structuredContent: dataOut,
        _meta: appToolMeta(MEMBERS_APP_URI, "Chargement de l'équipe...", "Annuaire prêt."),
      };
    }
  );

  // ── 5. Folder browser ──

  registerAppResource(
    "trimble-connect-folder-browser-app",
    FOLDER_BROWSER_APP_URI,
    "Explorateur de dossiers",
    "Interactive MCP App to browse the project folder tree; folders navigate, files expand their version history.",
    createFolderBrowserAppHtml
  );

  srv.registerTool(
    "tc_folder_browser_app",
    {
      title: "Afficher l'explorateur de dossiers",
      description: "Show an interactive MCP App to browse the project folder tree with breadcrumb navigation: clicking a folder opens it, clicking a file expands its version history. Use when the user asks to browse/explore folders (e.g. 'explore les dossiers du projet', 'navigue dans l'arborescence'). For a flat list of recent files use tc_files_app; for plain data use tc_get_folder_contents.",
      inputSchema: {
        region: regionEnum,
        projectId: z.string().describe("Trimble Connect project ID"),
        folderId: z.string().optional().describe("Folder to open (defaults to the project root folder)"),
        fileId: z.string().optional().describe("INTERNAL (used by the app UI): return the version history of this file instead of folder contents"),
      },
      _meta: appToolMeta(FOLDER_BROWSER_APP_URI, "Chargement des dossiers...", "Explorateur prêt."),
    },
    async ({ region, projectId, folderId, fileId }, extra) => {
      const token = getToken(extra);

      if (fileId) {
        const result = await tcApiCall({ method: "GET", region: region as Region, path: `/files/${fileId}/versions`, authToken: token });
        if (result.status >= 400) return { content: [{ type: "text" as const, text: errText(result.status, result.statusText, result.body) }], isError: true };
        const versions = recArray(result.body).map((v, i, arr) => ({
          versionNumber: txt(v.versionNumber ?? v.version, String(arr.length - i)),
          createdOn: txt(v.createdOn ?? v.modifiedOn, ""),
          createdBy: personName(v.createdBy ?? v.modifiedBy),
          size: v.size,
        }));
        return {
          content: [{ type: "text" as const, text: `${versions.length} version(s) du fichier ${fileId}.` }],
          structuredContent: { mode: "versions", fileId, versions },
        };
      }

      let targetFolder = folderId;
      let folderName = "";
      if (!targetFolder) {
        const proj = await tcApiCall({ method: "GET", region: region as Region, path: `/projects/${projectId}`, query: { fullyLoaded: "true" }, authToken: token });
        if (proj.status >= 400) return { content: [{ type: "text" as const, text: errText(proj.status, proj.statusText, proj.body) }], isError: true };
        const rec = (typeof proj.body === "object" && proj.body !== null ? proj.body : {}) as Record<string, unknown>;
        targetFolder = txt(rec.rootId, "");
        folderName = "Racine";
        if (!targetFolder || targetFolder === "-") return { content: [{ type: "text" as const, text: "Impossible de résoudre le dossier racine du projet (rootId absent)." }], isError: true };
      }

      const result = await tcApiCall({ method: "GET", region: region as Region, path: `/folders/${targetFolder}/items`, authToken: token });
      if (result.status >= 400) return { content: [{ type: "text" as const, text: errText(result.status, result.statusText, result.body) }], isError: true };
      const items = recArray(result.body)
        .map((it) => ({
          id: txt(it.id),
          name: txt(it.name),
          type: txt(it.type, "FILE").toUpperCase(),
          size: it.size,
          modifiedOn: txt(it.modifiedOn ?? it.createdOn, ""),
          modifiedBy: personName(it.modifiedBy ?? it.createdBy),
        }))
        .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "FOLDER" ? -1 : 1));
      const dataOut = { mode: "folder" as const, region: region as string, projectId, folderId: targetFolder, folderName, items };
      return {
        content: [{ type: "text" as const, text: `Explorateur affiché: ${items.length} élément(s) dans le dossier${folderName ? ` ${folderName}` : ""} du projet ${projectId}. Naviguez dans l'arborescence via l'interface interactive.` }],
        structuredContent: dataOut,
        _meta: appToolMeta(FOLDER_BROWSER_APP_URI, "Chargement des dossiers...", "Explorateur prêt."),
      };
    }
  );

  // ── 6. PSet editor (viewer bridge + PSet service) ──

  registerAppResource(
    "trimble-connect-pset-editor-app",
    PSET_EDITOR_APP_URI,
    "Éditeur de PSets de la sélection",
    "Interactive MCP App form to view and edit the custom property sets (PSet service) of the objects currently selected in the 3D viewer.",
    createPsetEditorAppHtml
  );

  srv.registerTool(
    "tc_pset_editor_app",
    {
      title: "Afficher l'éditeur de PSets de la sélection",
      description: "Show an interactive MCP App form to view and EDIT the custom property sets (Trimble Connect PSet service) of the objects currently selected in the user's 3D viewer (via Agent Eyes): enum dropdowns, dates, booleans, text fields, with a save button per pset. Use when the user asks to edit/fill the custom properties of their selection (e.g. 'édite les psets de ma sélection', 'mets à jour le statut d'avancement de ces objets'). Read-only IFC properties are shown by tc_object_properties_app instead. Requires the Agent Eyes panel open.",
      inputSchema: {
        region: regionEnum,
        save: z
          .object({
            link: z.string().describe("PSet link (FRN), e.g. frn:entity:<GUID>"),
            libId: z.string(),
            defId: z.string(),
            props: z.string().describe("JSON object string of prop values to write"),
          })
          .optional()
          .describe("INTERNAL (used by the app UI): write these prop values instead of reading the selection"),
      },
      _meta: appToolMeta(PSET_EDITOR_APP_URI, "Chargement des PSets...", "Éditeur prêt."),
    },
    async ({ region, save }, extra) => {
      const token = getToken(extra);

      if (save) {
        let props: Record<string, unknown>;
        try {
          props = JSON.parse(save.props) as Record<string, unknown>;
        } catch {
          return { content: [{ type: "text" as const, text: "props n'est pas un JSON valide." }], isError: true };
        }
        const path = `/psets/${save.link}/${save.libId}/${save.defId}`;
        let res = await tcApiCall({ method: "PATCH", region: region as Region, path, apiType: "pset", body: { props }, authToken: token });
        if (res.status >= 400) {
          // Some pset deployments require PUT (PutPSet) instead of PATCH.
          res = await tcApiCall({ method: "PUT", region: region as Region, path, apiType: "pset", body: { props }, authToken: token });
        }
        if (res.status >= 400) {
          console.error(`[pset-editor-app] save failed: ${errText(res.status, res.statusText, res.body)}`);
          return { content: [{ type: "text" as const, text: errText(res.status, res.statusText, res.body) }], isError: true };
        }
        return { content: [{ type: "text" as const, text: `PSet ${save.defId} enregistré pour ${save.link}.` }], structuredContent: { mode: "saved", link: save.link, defId: save.defId } };
      }

      const user = await resolveUserKeys(token);
      const match = getViewerState(user.keys);
      if (!match) {
        return {
          content: [{ type: "text" as const, text: "No viewer state available. Ask the user to open the 'Agent Eyes' extension panel in the Trimble Connect 3D viewer, then retry." }],
          isError: true,
        };
      }
      const state = match.entry.state;
      const ageSeconds = Math.max(0, Math.round((Date.now() - match.entry.storedAt) / 1000));

      // Collect up to 5 selected GUIDs with a friendly name when available.
      const guids: { guid: string; name?: string }[] = [];
      for (const sel of state.selection ?? []) {
        for (let i = 0; i < (sel.externalIds ?? []).length && guids.length < 5; i++) {
          const guid = sel.externalIds![i];
          const name = sel.properties?.find((p) => p.externalId === guid)?.name;
          guids.push({ guid, name });
        }
      }
      if (guids.length === 0) {
        return { content: [{ type: "text" as const, text: "No objects are currently selected in the 3D viewer. Ask the user to select objects, then retry." }], isError: true };
      }

      const defCache = new Map<string, { defName: string; schemaProps: Record<string, unknown>; labels: Record<string, string> }>();
      const loadDef = async (libId: string, defId: string) => {
        const key = `${libId}/${defId}`;
        if (defCache.has(key)) return defCache.get(key)!;
        const res = await tcApiCall({ method: "GET", region: region as Region, path: `/libs/${libId}/defs/${defId}`, apiType: "pset", authToken: token });
        const rec = (typeof res.body === "object" && res.body !== null ? res.body : {}) as Record<string, unknown>;
        const schema = (typeof rec.schema === "object" && rec.schema !== null ? rec.schema : {}) as Record<string, unknown>;
        const schemaProps = (typeof schema.props === "object" && schema.props !== null ? schema.props : {}) as Record<string, unknown>;
        const i18n = (typeof rec.i18n === "object" && rec.i18n !== null ? rec.i18n : {}) as Record<string, unknown>;
        let labels: Record<string, string> = {};
        for (const locale of Object.keys(i18n)) {
          if (locale.startsWith("__")) continue;
          const entry = i18n[locale] as Record<string, unknown> | undefined;
          const props = (entry && typeof entry.props === "object" && entry.props !== null ? entry.props : {}) as Record<string, unknown>;
          labels = Object.fromEntries(Object.entries(props).filter(([k]) => !k.includes(".")).map(([k, v]) => [k, String(v)]));
          break;
        }
        const def = { defName: txt(rec.name, defId), schemaProps, labels };
        defCache.set(key, def);
        return def;
      };

      const objects: Record<string, unknown>[] = [];
      for (const { guid, name } of guids) {
        const link = `frn:entity:${guid}`;
        const res = await tcApiCall({ method: "GET", region: region as Region, path: `/psets/${link}`, apiType: "pset", authToken: token });
        const psets: Record<string, unknown>[] = [];
        if (res.status < 400) {
          for (const inst of recArray(res.body)) {
            const libId = txt(inst.libId, "");
            const defId = txt(inst.defId, "");
            if (!libId || !defId || libId === "-" || defId === "-") continue;
            const def = await loadDef(libId, defId);
            const values = (typeof inst.props === "object" && inst.props !== null ? inst.props : {}) as Record<string, unknown>;
            const fields = Object.entries(def.schemaProps).map(([key, rawSchema]) => {
              const s = (typeof rawSchema === "object" && rawSchema !== null ? rawSchema : {}) as Record<string, unknown>;
              return {
                key,
                label: def.labels[key] ?? key,
                type: txt(s.type, "string"),
                format: txt(s.format, ""),
                enum: Array.isArray(s.enum) ? (s.enum as unknown[]).map(String) : undefined,
                value: values[key] ?? null,
              };
            });
            psets.push({ link, libId, defId, defName: def.defName, v: inst.v, fields });
          }
        }
        objects.push({ guid, name: name ?? "", psets });
      }

      const totalPsets = objects.reduce((sum, o) => sum + (o.psets as unknown[]).length, 0);
      const dataOut = {
        mode: "psets" as const,
        region: region as string,
        ageSeconds,
        stale: ageSeconds > 120,
        project: state.project ?? {},
        objects,
      };
      return {
        content: [{ type: "text" as const, text: `Éditeur de PSets affiché: ${objects.length} objet(s) sélectionné(s), ${totalPsets} pset(s) modifiable(s). Le formulaire est visible dans le panneau interactif.` }],
        structuredContent: dataOut,
        _meta: appToolMeta(PSET_EDITOR_APP_URI, "Chargement des PSets...", "Éditeur prêt."),
      };
    }
  );
}
