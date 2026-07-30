/**
 * MCP Apps (interactive UIs rendered inline in Trimble Assist).
 *
 * Each app is a pair: an MCP resource (ui:// HTML page using the MCP Apps
 * SDK) and a tool whose result carries `_meta.ui.resourceUri` so the host
 * renders the page and feeds it the tool's structuredContent.
 *
 * Apps registered here:
 *  - tc_todos_app: interactive table of the latest project ToDos.
 *  - tc_files_app: interactive table of the latest uploaded files; clicking
 *    a row loads and expands its version history (via callServerTool).
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { tcApiCall, getBcfBaseUrl, type Region } from "./tc-api-client.js";
import { resolveUserKeys, getViewerState } from "./viewer-state.js";

const TODOS_APP_URI = "ui://trimble-connect/todos.html";
const FILES_APP_URI = "ui://trimble-connect/files.html";
const BCF_DETAIL_APP_URI = "ui://trimble-connect/bcf-detail.html";
const SELECTION_REVIEW_APP_URI = "ui://trimble-connect/selection-review.html";
const ACTIVITY_TIMELINE_APP_URI = "ui://trimble-connect/activity-timeline.html";
const OBJECT_PROPERTIES_APP_URI = "ui://trimble-connect/object-properties.html";

/** Public origin of this server — used by MCP App pages to load self-hosted assets. */
export const SERVER_ORIGIN = process.env.PUBLIC_BASE_URL ?? "https://trb-mcp-server-api-256019753506.europe-west1.run.app";
/** Self-hosted single-file bundle of @modelcontextprotocol/ext-apps (see /assets/ext-apps.js). */
export const EXT_APPS_SDK_URL = `${SERVER_ORIGIN}/assets/ext-apps.js`;

export const APP_CSP_META = {
  "ui": {
    "csp": {
      "resource_domains": [SERVER_ORIGIN],
      "connect_domains": [SERVER_ORIGIN],
    },
    "prefersBorder": true,
  },
} as const;

// ── Shared mapping helpers ──

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    for (const candidate of [record.items, record.data, record.results, record.todos, record.files]) {
      if (Array.isArray(candidate)) {
        return candidate.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
      }
    }
  }
  return [];
}

function toText(value: unknown, fallback = "-"): string {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const name = [record.firstName ?? record.first_name, record.lastName ?? record.last_name].filter(Boolean).join(" ").trim();
    return name || toText(record.name ?? record.email ?? record.id, fallback);
  }
  return String(value);
}

function toDateText(value: unknown): string {
  const text = value === undefined || value === null ? "" : String(value);
  return text ? text.substring(0, 10) : "-";
}

function toEpoch(value: unknown): number {
  const t = Date.parse(String(value ?? ""));
  return Number.isNaN(t) ? 0 : t;
}

// ── ToDos app ──

function buildTodosData(projectId: string, region: string, raw: unknown, limit: number) {
  const todos = asRecordArray(raw)
    .map((todo) => ({
      id: toText(todo.id),
      label: toText(todo.label ?? todo.title, "(sans titre)"),
      description: toText(todo.description, ""),
      status: toText(todo.status),
      priority: toText(todo.priority),
      percentComplete: toText(todo.percentComplete ?? todo.percent_complete, ""),
      assignees: asRecordArray(todo.assignees).map((a) => toText(a)).join(", ") || toText(todo.assignedTo ?? todo.assigned_to, "-"),
      createdBy: toText(todo.createdBy ?? todo.created_by),
      dueDate: toDateText(todo.dueDate ?? todo.due_date),
      created: toDateText(todo.createdOn ?? todo.created_on ?? todo.createdDate),
      modified: toDateText(todo.modifiedOn ?? todo.modified_on ?? todo.modifiedDate),
      _sort: toEpoch(todo.modifiedOn ?? todo.modified_on ?? todo.createdOn ?? todo.created_on),
    }))
    .sort((a, b) => b._sort - a._sort);
  return {
    projectId,
    region,
    generatedAt: new Date().toISOString(),
    total: todos.length,
    showing: Math.min(limit, todos.length),
    todos: todos.slice(0, limit).map(({ _sort, ...rest }) => rest),
  };
}

function createTodosAppHtml(): string {
  return String.raw`<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ToDos Trimble Connect</title>
  <style>
    :root { color-scheme: light; font-family: Inter, "Open Sans", Arial, sans-serif; }
    body { margin: 0; background: #f8fafc; color: #1e293b; }
    .app { padding: 14px; }
    .header { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 12px; }
    h1 { font-size: 16px; line-height: 1.2; margin: 0 0 4px; }
    .muted { color: #64748b; font-size: 12px; }
    .toolbar { display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
    input, button { border: 1px solid #cbd5e1; border-radius: 8px; background: white; color: #0f172a; font-size: 12px; padding: 7px 9px; }
    input { flex: 1 1 160px; min-width: 0; }
    button { cursor: pointer; font-weight: 600; }
    button.primary { background: #0ea5e9; border-color: #0ea5e9; color: white; }
    table { width: 100%; border-collapse: collapse; background: white; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; font-size: 12px; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    th { background: #f1f5f9; color: #334155; font-weight: 700; }
    tr:last-child td { border-bottom: 0; }
    .pill { display: inline-block; padding: 2px 7px; border-radius: 999px; background: #e0f2fe; color: #0369a1; white-space: nowrap; }
    .empty, .error { padding: 18px; border: 1px dashed #cbd5e1; border-radius: 10px; background: white; color: #64748b; }
    .error { border-color: #fecaca; background: #fef2f2; color: #991b1b; }
    @media (max-width: 520px) { th:nth-child(4), td:nth-child(4) { display: none; } }
  </style>
</head>
<body>
  <main class="app">
    <div class="header">
      <div>
        <h1>ToDos Trimble Connect</h1>
        <div class="muted" id="subtitle">En attente des données...</div>
      </div>
      <button id="refreshBtn" class="primary" type="button">Rafraîchir</button>
    </div>
    <div class="toolbar">
      <input id="search" type="search" placeholder="Filtrer par titre, statut, assigné..." />
      <button id="askBtn" type="button">Demander une analyse</button>
    </div>
    <div id="tableWrap" class="empty">Les ToDos vont s'afficher ici.</div>
  </main>
  <script type="module">
    let mcpApp = null;
    let data = null;
    const els = {
      subtitle: document.getElementById('subtitle'),
      search: document.getElementById('search'),
      tableWrap: document.getElementById('tableWrap'),
      refreshBtn: document.getElementById('refreshBtn'),
      askBtn: document.getElementById('askBtn'),
    };

    function escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
    }

    function render(newData) {
      if (!newData) return;
      data = newData;
      els.subtitle.textContent = 'Projet ' + data.projectId + ' — ' + data.showing + ' sur ' + data.total + ' ToDo(s) — généré le ' + new Date(data.generatedAt).toLocaleString('fr-FR');
      renderTable();
    }

    function renderTable() {
      if (!data) return;
      const query = els.search.value.trim().toLowerCase();
      const rows = (data.todos || []).filter(todo => {
        const text = [todo.label, todo.status, todo.priority, todo.assignees, todo.description].join(' ').toLowerCase();
        return !query || text.includes(query);
      });
      if (rows.length === 0) {
        els.tableWrap.className = 'empty';
        els.tableWrap.textContent = 'Aucun ToDo ne correspond au filtre.';
        return;
      }
      els.tableWrap.className = '';
      els.tableWrap.innerHTML = '<table><thead><tr><th>Titre</th><th>Statut</th><th>Priorité</th><th>Assigné à</th><th>Échéance</th><th>Modifié</th></tr></thead><tbody>' +
        rows.map(todo => '<tr>' +
          '<td><strong>' + escapeHtml(todo.label) + '</strong>' + (todo.description ? '<div class="muted">' + escapeHtml(todo.description.substring(0, 120)) + '</div>' : '') + '</td>' +
          '<td><span class="pill">' + escapeHtml(todo.status) + '</span></td>' +
          '<td>' + escapeHtml(todo.priority) + '</td>' +
          '<td>' + escapeHtml(todo.assignees) + '</td>' +
          '<td>' + escapeHtml(todo.dueDate) + '</td>' +
          '<td>' + escapeHtml(todo.modified) + '</td>' +
        '</tr>').join('') + '</tbody></table>';
    }

    async function connectMcpApp() {
      try {
        const mod = await import('${EXT_APPS_SDK_URL}');
        const { App, PostMessageTransport } = mod;
        mcpApp = new App({ name: 'Trimble Connect ToDos', version: '1.0.0' });
        mcpApp.ontoolinput = () => {
          els.tableWrap.className = 'empty';
          els.tableWrap.textContent = 'Chargement des ToDos...';
        };
        mcpApp.ontoolresult = ({ structuredContent }) => render(structuredContent);
        await mcpApp.connect(new PostMessageTransport(window.parent));
      } catch (error) {
        els.tableWrap.className = 'error';
        els.tableWrap.textContent = 'MCP Apps SDK non chargé. Le résumé texte reste disponible dans le chat.';
        console.error(error);
      }
    }

    window.addEventListener('message', (event) => {
      const params = event.data?.params || {};
      const structured = params.structuredContent || params.result?.structuredContent;
      if (structured) render(structured);
    });

    els.search.addEventListener('input', renderTable);
    els.refreshBtn.addEventListener('click', async () => {
      if (!data || !mcpApp?.callServerTool) return;
      const result = await mcpApp.callServerTool({
        name: 'tc_todos_app',
        arguments: { region: data.region, projectId: data.projectId, limit: data.showing || 5 },
      });
      if (!result.isError && result.structuredContent) render(result.structuredContent);
    });
    els.askBtn.addEventListener('click', async () => {
      if (!mcpApp?.sendMessage || !data) return;
      await mcpApp.sendMessage({
        role: 'user',
        content: [{ type: 'text', text: 'Analyse la liste des ToDos affichée et propose-moi les priorités d’action.' }],
      });
    });

    connectMcpApp();
  </script>
</body>
</html>`;
}

// ── Files app ──

function buildFilesListData(projectId: string, region: string, raw: unknown, limit: number) {
  const files = asRecordArray(raw)
    .map((file) => ({
      id: toText(file.id),
      name: toText(file.name, "(sans nom)"),
      size: typeof file.size === "number" ? file.size : Number(file.size ?? 0) || 0,
      revision: toText(file.revision ?? file.versionNumber ?? file.version, ""),
      modifiedBy: toText(file.modifiedBy ?? file.modified_by ?? file.createdBy ?? file.created_by),
      modified: toDateText(file.modifiedOn ?? file.modified_on ?? file.createdOn ?? file.created_on),
      parentId: toText(file.parentId ?? file.parent_id, ""),
      _sort: toEpoch(file.modifiedOn ?? file.modified_on ?? file.createdOn ?? file.created_on),
    }))
    .sort((a, b) => b._sort - a._sort);
  return {
    mode: "list" as const,
    projectId,
    region,
    generatedAt: new Date().toISOString(),
    total: files.length,
    showing: Math.min(limit, files.length),
    files: files.slice(0, limit).map(({ _sort, ...rest }) => rest),
  };
}

function buildFileVersionsData(projectId: string, region: string, fileId: string, raw: unknown) {
  const versions = asRecordArray(raw)
    .map((v) => ({
      versionId: toText(v.versionId ?? v.id),
      revision: toText(v.revision ?? v.versionNumber ?? v.version, "-"),
      name: toText(v.name, ""),
      size: typeof v.size === "number" ? v.size : Number(v.size ?? 0) || 0,
      modifiedBy: toText(v.modifiedBy ?? v.modified_by ?? v.createdBy ?? v.created_by),
      modified: toDateText(v.modifiedOn ?? v.modified_on ?? v.createdOn ?? v.created_on),
      _sort: toEpoch(v.modifiedOn ?? v.modified_on ?? v.createdOn ?? v.created_on),
    }))
    .sort((a, b) => b._sort - a._sort)
    .map(({ _sort, ...rest }) => rest);
  return { mode: "versions" as const, projectId, region, fileId, versions };
}

function createFilesAppHtml(): string {
  return String.raw`<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Fichiers Trimble Connect</title>
  <style>
    :root { color-scheme: light; font-family: Inter, "Open Sans", Arial, sans-serif; }
    body { margin: 0; background: #f8fafc; color: #1e293b; }
    .app { padding: 14px; }
    .header { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 12px; }
    h1 { font-size: 16px; line-height: 1.2; margin: 0 0 4px; }
    .muted { color: #64748b; font-size: 12px; }
    button { border: 1px solid #cbd5e1; border-radius: 8px; background: white; color: #0f172a; font-size: 12px; padding: 7px 9px; cursor: pointer; font-weight: 600; }
    button.primary { background: #0ea5e9; border-color: #0ea5e9; color: white; }
    table { width: 100%; border-collapse: collapse; background: white; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; font-size: 12px; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    th { background: #f1f5f9; color: #334155; font-weight: 700; }
    tr:last-child td { border-bottom: 0; }
    tr.file-row { cursor: pointer; }
    tr.file-row:hover { background: #f0f9ff; }
    .filename { color: #0369a1; font-weight: 600; }
    .chevron { display: inline-block; width: 14px; color: #64748b; }
    .versions-cell { background: #f8fafc; padding: 0 8px 10px 30px; }
    .versions-cell table { border: 1px solid #e2e8f0; margin-top: 8px; }
    .empty, .error { padding: 18px; border: 1px dashed #cbd5e1; border-radius: 10px; background: white; color: #64748b; }
    .error { border-color: #fecaca; background: #fef2f2; color: #991b1b; }
    .loading { color: #64748b; font-style: italic; padding: 8px; }
  </style>
</head>
<body>
  <main class="app">
    <div class="header">
      <div>
        <h1>Derniers fichiers déposés</h1>
        <div class="muted" id="subtitle">En attente des données...</div>
        <div class="muted">Cliquez sur un fichier pour afficher ses versions.</div>
      </div>
      <button id="refreshBtn" class="primary" type="button">Rafraîchir</button>
    </div>
    <div id="tableWrap" class="empty">Les fichiers vont s'afficher ici.</div>
  </main>
  <script type="module">
    let mcpApp = null;
    let data = null;
    const versionsCache = {};
    let expandedFileId = null;
    const els = {
      subtitle: document.getElementById('subtitle'),
      tableWrap: document.getElementById('tableWrap'),
      refreshBtn: document.getElementById('refreshBtn'),
    };

    function escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
    }

    function humanSize(bytes) {
      if (!bytes) return '-';
      const units = ['o', 'Ko', 'Mo', 'Go'];
      let value = bytes, unit = 0;
      while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit++; }
      return value.toFixed(unit === 0 ? 0 : 1) + ' ' + units[unit];
    }

    function render(newData) {
      if (!newData) return;
      if (newData.mode === 'versions') { renderVersions(newData); return; }
      data = newData;
      expandedFileId = null;
      els.subtitle.textContent = 'Projet ' + data.projectId + ' — ' + data.showing + ' sur ' + data.total + ' fichier(s) — généré le ' + new Date(data.generatedAt).toLocaleString('fr-FR');
      renderTable();
    }

    function renderTable() {
      if (!data) return;
      const rows = data.files || [];
      if (rows.length === 0) {
        els.tableWrap.className = 'empty';
        els.tableWrap.textContent = 'Aucun fichier trouvé dans ce projet.';
        return;
      }
      els.tableWrap.className = '';
      els.tableWrap.innerHTML = '<table><thead><tr><th></th><th>Nom</th><th>Taille</th><th>Rév.</th><th>Modifié par</th><th>Modifié le</th></tr></thead><tbody>' +
        rows.map(file => {
          const expanded = expandedFileId === file.id;
          let html = '<tr class="file-row" data-file-id="' + escapeHtml(file.id) + '">' +
            '<td><span class="chevron">' + (expanded ? '▼' : '▶') + '</span></td>' +
            '<td><span class="filename">' + escapeHtml(file.name) + '</span></td>' +
            '<td>' + humanSize(file.size) + '</td>' +
            '<td>' + escapeHtml(file.revision || '-') + '</td>' +
            '<td>' + escapeHtml(file.modifiedBy) + '</td>' +
            '<td>' + escapeHtml(file.modified) + '</td>' +
          '</tr>';
          if (expanded) {
            html += '<tr><td colspan="6" class="versions-cell" id="versions-' + escapeHtml(file.id) + '">' + versionsHtml(file.id) + '</td></tr>';
          }
          return html;
        }).join('') + '</tbody></table>';

      for (const row of els.tableWrap.querySelectorAll('tr.file-row')) {
        row.addEventListener('click', () => toggleVersions(row.getAttribute('data-file-id')));
      }
    }

    function versionsHtml(fileId) {
      const versions = versionsCache[fileId];
      if (!versions) return '<div class="loading">Chargement des versions...</div>';
      if (versions.length === 0) return '<div class="loading">Aucune version trouvée.</div>';
      return '<table><thead><tr><th>Rév.</th><th>Nom</th><th>Taille</th><th>Modifié par</th><th>Date</th></tr></thead><tbody>' +
        versions.map(v => '<tr>' +
          '<td>' + escapeHtml(v.revision) + '</td>' +
          '<td>' + escapeHtml(v.name || '-') + '</td>' +
          '<td>' + humanSize(v.size) + '</td>' +
          '<td>' + escapeHtml(v.modifiedBy) + '</td>' +
          '<td>' + escapeHtml(v.modified) + '</td>' +
        '</tr>').join('') + '</tbody></table>';
    }

    function renderVersions(versionsData) {
      versionsCache[versionsData.fileId] = versionsData.versions || [];
      const cell = document.getElementById('versions-' + versionsData.fileId);
      if (cell) cell.innerHTML = versionsHtml(versionsData.fileId);
    }

    async function toggleVersions(fileId) {
      if (!fileId) return;
      expandedFileId = expandedFileId === fileId ? null : fileId;
      renderTable();
      if (!expandedFileId || versionsCache[fileId] || !mcpApp?.callServerTool) return;
      try {
        const result = await mcpApp.callServerTool({
          name: 'tc_files_app',
          arguments: { region: data.region, projectId: data.projectId, fileId },
        });
        if (!result.isError && result.structuredContent) renderVersions(result.structuredContent);
        else {
          versionsCache[fileId] = [];
          renderVersions({ fileId, versions: [] });
        }
      } catch (error) {
        console.error(error);
        versionsCache[fileId] = [];
        renderVersions({ fileId, versions: [] });
      }
    }

    async function connectMcpApp() {
      try {
        const mod = await import('${EXT_APPS_SDK_URL}');
        const { App, PostMessageTransport } = mod;
        mcpApp = new App({ name: 'Trimble Connect Files', version: '1.0.0' });
        mcpApp.ontoolinput = () => {
          els.tableWrap.className = 'empty';
          els.tableWrap.textContent = 'Chargement des fichiers...';
        };
        mcpApp.ontoolresult = ({ structuredContent }) => render(structuredContent);
        await mcpApp.connect(new PostMessageTransport(window.parent));
      } catch (error) {
        els.tableWrap.className = 'error';
        els.tableWrap.textContent = 'MCP Apps SDK non chargé. Le résumé texte reste disponible dans le chat.';
        console.error(error);
      }
    }

    window.addEventListener('message', (event) => {
      const params = event.data?.params || {};
      const structured = params.structuredContent || params.result?.structuredContent;
      if (structured) render(structured);
    });

    els.refreshBtn.addEventListener('click', async () => {
      if (!data || !mcpApp?.callServerTool) return;
      const result = await mcpApp.callServerTool({
        name: 'tc_files_app',
        arguments: { region: data.region, projectId: data.projectId, limit: data.showing || 5 },
      });
      if (!result.isError && result.structuredContent) render(result.structuredContent);
    });

    connectMcpApp();
  </script>
</body>
</html>`;
}

// ── BCF detail app ──

function asStringArrayLoose(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function buildBcfDetailData(
  region: string,
  projectId: string,
  bcfVersion: string,
  rawTopic: Record<string, unknown>,
  rawComments: unknown,
  rawViewpoints: unknown,
  rawExtensions: unknown
) {
  const comments = asRecordArray(rawComments).map((c) => ({
    guid: toText(c.guid ?? c.id),
    author: toText(c.author ?? c.modified_author ?? c.created_by),
    date: toText(c.date ?? c.created_on ?? c.modified_date, "").substring(0, 16).replace("T", " "),
    text: toText(c.comment, ""),
  }));
  const viewpoints = asRecordArray(rawViewpoints).map((v) => ({
    guid: toText(v.guid ?? v.id),
    hasSnapshot: Boolean(v.snapshot ?? v.snapshot_type ?? true),
  }));
  const ext = (typeof rawExtensions === "object" && rawExtensions !== null ? rawExtensions : {}) as Record<string, unknown>;
  return {
    mode: "detail" as const,
    region,
    projectId,
    bcfVersion,
    topic: {
      guid: toText(rawTopic.guid ?? rawTopic.id),
      title: toText(rawTopic.title, "(sans titre)"),
      description: toText(rawTopic.description, ""),
      status: toText(rawTopic.topic_status ?? rawTopic.status),
      priority: toText(rawTopic.priority),
      type: toText(rawTopic.topic_type ?? rawTopic.type),
      assignedTo: toText(rawTopic.assigned_to, ""),
      createdBy: toText(rawTopic.creation_author ?? rawTopic.created_by),
      created: toDateText(rawTopic.creation_date ?? rawTopic.created),
      modified: toDateText(rawTopic.modified_date ?? rawTopic.modified),
      dueDate: toDateText(rawTopic.due_date),
    },
    extensions: {
      statuses: asStringArrayLoose(ext.topic_status ?? ext.topicStatus),
      priorities: asStringArrayLoose(ext.priority ?? ext.priorities),
    },
    comments,
    viewpoints,
  };
}

function createBcfDetailAppHtml(): string {
  return String.raw`<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Détail BCF Trimble Connect</title>
  <style>
    :root { color-scheme: light; font-family: Inter, "Open Sans", Arial, sans-serif; }
    body { margin: 0; background: #f8fafc; color: #1e293b; }
    .app { padding: 14px; }
    h1 { font-size: 16px; line-height: 1.3; margin: 0 0 4px; }
    .muted { color: #64748b; font-size: 12px; }
    .pill { display: inline-block; padding: 2px 8px; border-radius: 999px; background: #e0f2fe; color: #0369a1; font-size: 12px; margin-right: 6px; white-space: nowrap; }
    .section { margin-top: 14px; }
    .section h2 { font-size: 13px; margin: 0 0 8px; color: #334155; }
    .card { background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; }
    .desc { white-space: pre-wrap; font-size: 13px; }
    select, textarea, button, input { border: 1px solid #cbd5e1; border-radius: 8px; background: white; color: #0f172a; font-size: 12px; padding: 7px 9px; }
    textarea { width: 100%; box-sizing: border-box; min-height: 54px; resize: vertical; font-family: inherit; }
    button { cursor: pointer; font-weight: 600; }
    button.primary { background: #0ea5e9; border-color: #0ea5e9; color: white; }
    button:disabled { opacity: .6; cursor: not-allowed; }
    .row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .comment { border-bottom: 1px solid #e2e8f0; padding: 8px 0; }
    .comment:last-child { border-bottom: 0; }
    .comment .meta { font-size: 11px; color: #64748b; margin-bottom: 2px; }
    .comment .body { font-size: 13px; white-space: pre-wrap; }
    .vp { display: inline-block; margin: 0 8px 8px 0; text-align: center; }
    .vp img { max-width: 280px; max-height: 200px; border: 1px solid #e2e8f0; border-radius: 8px; display: block; margin-top: 6px; }
    .banner { padding: 9px 11px; border-radius: 8px; font-size: 12px; display: none; margin-top: 10px; }
    .banner.show { display: block; }
    .banner.success { background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; }
    .banner.error { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
    .empty { color: #64748b; font-size: 12px; font-style: italic; }
  </style>
</head>
<body>
  <main class="app">
    <h1 id="title">Chargement du BCF...</h1>
    <div class="muted" id="subtitle"></div>
    <div style="margin-top:8px" id="pills"></div>
    <div id="banner" class="banner"></div>

    <div class="section">
      <h2>Description</h2>
      <div class="card desc" id="description">-</div>
    </div>

    <div class="section">
      <h2>Modifier</h2>
      <div class="card">
        <div class="row">
          <label class="muted">Statut</label><select id="statusSel"></select>
          <label class="muted">Priorité</label><select id="prioritySel"></select>
          <button id="applyBtn" class="primary" type="button">Appliquer</button>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>Vues (viewpoints)</h2>
      <div class="card" id="viewpoints"><span class="empty">Aucune vue attachée.</span></div>
    </div>

    <div class="section">
      <h2>Commentaires</h2>
      <div class="card" id="comments"><span class="empty">Aucun commentaire.</span></div>
      <div style="margin-top:8px">
        <textarea id="newComment" placeholder="Ajouter un commentaire..."></textarea>
        <div class="row" style="justify-content:flex-end; margin-top:6px">
          <button id="commentBtn" class="primary" type="button">Commenter</button>
        </div>
      </div>
    </div>
  </main>
  <script type="module">
    let mcpApp = null;
    let data = null;
    const els = {
      title: document.getElementById('title'),
      subtitle: document.getElementById('subtitle'),
      pills: document.getElementById('pills'),
      banner: document.getElementById('banner'),
      description: document.getElementById('description'),
      statusSel: document.getElementById('statusSel'),
      prioritySel: document.getElementById('prioritySel'),
      applyBtn: document.getElementById('applyBtn'),
      viewpoints: document.getElementById('viewpoints'),
      comments: document.getElementById('comments'),
      newComment: document.getElementById('newComment'),
      commentBtn: document.getElementById('commentBtn'),
    };

    function escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
    }

    function setBanner(type, message) {
      els.banner.className = 'banner show ' + type;
      els.banner.textContent = message;
    }

    function fillSelect(select, values, selected) {
      const list = values && values.length ? values : (selected ? [selected] : []);
      select.innerHTML = list.map(v => '<option value="' + escapeHtml(v) + '"' + (v === selected ? ' selected' : '') + '>' + escapeHtml(v) + '</option>').join('');
    }

    function render(newData) {
      if (!newData) return;
      if (newData.mode === 'snapshot') { renderSnapshot(newData); return; }
      data = newData;
      const t = data.topic;
      els.title.textContent = t.title;
      els.subtitle.textContent = 'Créé par ' + t.createdBy + ' le ' + t.created + ' — modifié le ' + t.modified + (t.assignedTo ? ' — assigné à ' + t.assignedTo : '');
      els.pills.innerHTML =
        '<span class="pill">' + escapeHtml(t.status) + '</span>' +
        '<span class="pill">Priorité: ' + escapeHtml(t.priority) + '</span>' +
        '<span class="pill">' + escapeHtml(t.type) + '</span>' +
        (t.dueDate !== '-' ? '<span class="pill">Échéance: ' + escapeHtml(t.dueDate) + '</span>' : '');
      els.description.textContent = t.description || '(pas de description)';
      fillSelect(els.statusSel, data.extensions.statuses, t.status);
      fillSelect(els.prioritySel, data.extensions.priorities, t.priority);

      if (data.comments.length === 0) {
        els.comments.innerHTML = '<span class="empty">Aucun commentaire.</span>';
      } else {
        els.comments.innerHTML = data.comments.map(c =>
          '<div class="comment"><div class="meta">' + escapeHtml(c.author) + ' — ' + escapeHtml(c.date) + '</div><div class="body">' + escapeHtml(c.text) + '</div></div>'
        ).join('');
      }

      if (data.viewpoints.length === 0) {
        els.viewpoints.innerHTML = '<span class="empty">Aucune vue attachée.</span>';
      } else {
        els.viewpoints.innerHTML = data.viewpoints.map((v, i) =>
          '<div class="vp" id="vp-' + escapeHtml(v.guid) + '"><button type="button" data-vp="' + escapeHtml(v.guid) + '">Afficher la capture ' + (i + 1) + '</button></div>'
        ).join('');
        for (const btn of els.viewpoints.querySelectorAll('button[data-vp]')) {
          btn.addEventListener('click', () => loadSnapshot(btn.getAttribute('data-vp')));
        }
      }
    }

    function renderSnapshot(snap) {
      const holder = document.getElementById('vp-' + snap.viewpointId);
      if (holder && snap.dataUrl) holder.innerHTML = '<img alt="Capture du viewpoint" src="' + snap.dataUrl + '" />';
    }

    async function loadSnapshot(vpId) {
      if (!mcpApp?.callServerTool || !data) return;
      const holder = document.getElementById('vp-' + vpId);
      if (holder) holder.innerHTML = '<span class="empty">Chargement de la capture...</span>';
      try {
        const result = await mcpApp.callServerTool({
          name: 'tc_bcf_detail_app',
          arguments: { region: data.region, projectId: data.projectId, topicId: data.topic.guid, bcfVersion: data.bcfVersion, snapshotViewpointId: vpId },
        });
        if (!result.isError && result.structuredContent) renderSnapshot(result.structuredContent);
        else if (holder) holder.innerHTML = '<span class="empty">Capture indisponible.</span>';
      } catch (e) {
        if (holder) holder.innerHTML = '<span class="empty">Capture indisponible.</span>';
      }
    }

    async function reload() {
      if (!mcpApp?.callServerTool || !data) return;
      const result = await mcpApp.callServerTool({
        name: 'tc_bcf_detail_app',
        arguments: { region: data.region, projectId: data.projectId, topicId: data.topic.guid, bcfVersion: data.bcfVersion },
      });
      if (!result.isError && result.structuredContent) render(result.structuredContent);
    }

    els.applyBtn.addEventListener('click', async () => {
      if (!mcpApp?.callServerTool || !data) return;
      els.applyBtn.disabled = true;
      setBanner('success', 'Mise à jour du BCF...');
      try {
        const t = data.topic;
        const body = { title: t.title, topic_status: els.statusSel.value, priority: els.prioritySel.value };
        if (t.description) body.description = t.description;
        if (t.type && t.type !== '-') body.topic_type = t.type;
        if (t.assignedTo) body.assigned_to = t.assignedTo;
        const result = await mcpApp.callServerTool({
          name: 'tc_bcf',
          arguments: { region: data.region, action: 'topic_update', projectId: data.projectId, id: t.guid, bcfVersion: data.bcfVersion, body },
        });
        if (result?.isError) {
          const txt = (result?.content || []).map(c => c.text).filter(Boolean).join(' ');
          setBanner('error', 'Échec de la mise à jour: ' + (txt || 'erreur inconnue').substring(0, 300));
        } else {
          setBanner('success', 'BCF mis à jour.');
          await reload();
        }
      } catch (e) {
        setBanner('error', 'Erreur: ' + (e?.message || String(e)));
      } finally {
        els.applyBtn.disabled = false;
      }
    });

    els.commentBtn.addEventListener('click', async () => {
      const text = els.newComment.value.trim();
      if (!text || !mcpApp?.callServerTool || !data) return;
      els.commentBtn.disabled = true;
      try {
        const result = await mcpApp.callServerTool({
          name: 'tc_bcf',
          arguments: { region: data.region, action: 'comment_create', projectId: data.projectId, id: data.topic.guid, bcfVersion: data.bcfVersion, body: { comment: text } },
        });
        if (result?.isError) {
          setBanner('error', 'Échec de l\'ajout du commentaire.');
        } else {
          els.newComment.value = '';
          setBanner('success', 'Commentaire ajouté.');
          await reload();
        }
      } catch (e) {
        setBanner('error', 'Erreur: ' + (e?.message || String(e)));
      } finally {
        els.commentBtn.disabled = false;
      }
    });

    async function connectMcpApp() {
      try {
        const mod = await import('${EXT_APPS_SDK_URL}');
        const { App, PostMessageTransport } = mod;
        mcpApp = new App({ name: 'Trimble Connect BCF Detail', version: '1.0.0' });
        mcpApp.ontoolresult = ({ structuredContent }) => render(structuredContent);
        await mcpApp.connect(new PostMessageTransport(window.parent));
      } catch (error) {
        setBanner('error', 'MCP Apps SDK non chargé. Le résumé texte reste disponible dans le chat.');
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

// ── Selection review app (viewer bridge) ──

function createSelectionReviewAppHtml(): string {
  return String.raw`<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Revue de sélection Trimble Connect</title>
  <style>
    :root { color-scheme: light; font-family: Inter, "Open Sans", Arial, sans-serif; }
    body { margin: 0; background: #f8fafc; color: #1e293b; }
    .app { padding: 14px; }
    .header { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 12px; }
    h1 { font-size: 16px; margin: 0 0 4px; }
    .muted { color: #64748b; font-size: 12px; }
    .cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-bottom: 12px; }
    .card { background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px; }
    .card strong { display: block; font-size: 18px; margin-bottom: 2px; }
    table { width: 100%; border-collapse: collapse; background: white; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; font-size: 12px; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    th { background: #f1f5f9; color: #334155; font-weight: 700; }
    tr:last-child td { border-bottom: 0; }
    .guids { color: #64748b; font-size: 11px; word-break: break-all; }
    button { border: 1px solid #cbd5e1; border-radius: 8px; background: white; color: #0f172a; font-size: 12px; padding: 7px 10px; cursor: pointer; font-weight: 600; }
    button.primary { background: #0ea5e9; border-color: #0ea5e9; color: white; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
    .empty, .error { padding: 18px; border: 1px dashed #cbd5e1; border-radius: 10px; background: white; color: #64748b; }
    .error { border-color: #fecaca; background: #fef2f2; color: #991b1b; }
    .warn { padding: 8px 10px; border-radius: 8px; background: #fffbeb; border: 1px solid #fde68a; color: #92400e; font-size: 12px; margin-bottom: 10px; display: none; }
    .warn.show { display: block; }
  </style>
</head>
<body>
  <main class="app">
    <div class="header">
      <div>
        <h1>Revue de sélection — viewer 3D</h1>
        <div class="muted" id="subtitle">En attente des données Agent Eyes...</div>
      </div>
      <button id="refreshBtn" class="primary" type="button">Rafraîchir</button>
    </div>
    <div id="staleWarn" class="warn"></div>
    <section class="cards">
      <div class="card"><strong id="selCount">-</strong><span class="muted">Objets sélectionnés</span></div>
      <div class="card"><strong id="modelCount">-</strong><span class="muted">Modèles chargés</span></div>
      <div class="card"><strong id="age">-</strong><span class="muted">Fraîcheur des données</span></div>
    </section>
    <div id="tableWrap" class="empty">La sélection du viewer va s'afficher ici.</div>
    <div class="actions">
      <button id="bcfBtn" type="button">Créer un BCF sur cette sélection</button>
      <button id="todoBtn" type="button">Créer un ToDo</button>
      <button id="propsBtn" type="button">Voir les propriétés</button>
    </div>
  </main>
  <script type="module">
    let mcpApp = null;
    let data = null;
    const els = {
      subtitle: document.getElementById('subtitle'),
      staleWarn: document.getElementById('staleWarn'),
      selCount: document.getElementById('selCount'),
      modelCount: document.getElementById('modelCount'),
      age: document.getElementById('age'),
      tableWrap: document.getElementById('tableWrap'),
      refreshBtn: document.getElementById('refreshBtn'),
      bcfBtn: document.getElementById('bcfBtn'),
      todoBtn: document.getElementById('todoBtn'),
      propsBtn: document.getElementById('propsBtn'),
    };

    function escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
    }

    function render(newData) {
      if (!newData || newData.mode !== 'review') return;
      data = newData;
      els.subtitle.textContent = (data.project?.name ? 'Projet ' + data.project.name + ' — ' : '') + 'capturé il y a ' + data.ageSeconds + ' s';
      els.selCount.textContent = data.totalSelected;
      els.modelCount.textContent = (data.models || []).length;
      els.age.textContent = data.ageSeconds + ' s';
      if (data.stale) {
        els.staleWarn.className = 'warn show';
        els.staleWarn.textContent = 'Données anciennes — vérifiez que le panneau Agent Eyes est toujours ouvert dans le viewer 3D.';
      } else {
        els.staleWarn.className = 'warn';
      }
      const rows = data.selection || [];
      if (rows.length === 0) {
        els.tableWrap.className = 'empty';
        els.tableWrap.textContent = 'Aucun objet sélectionné dans le viewer. Sélectionnez des objets puis cliquez sur Rafraîchir.';
        return;
      }
      els.tableWrap.className = '';
      els.tableWrap.innerHTML = '<table><thead><tr><th>Modèle</th><th>Objets</th><th>GUIDs IFC</th></tr></thead><tbody>' +
        rows.map(s => '<tr>' +
          '<td>' + escapeHtml(s.modelName || s.modelId) + '</td>' +
          '<td>' + s.count + '</td>' +
          '<td><div class="guids">' + escapeHtml((s.guids || []).slice(0, 10).join(', ')) + ((s.guids || []).length > 10 ? ' … (+' + ((s.guids || []).length - 10) + ')' : '') + '</div></td>' +
        '</tr>').join('') + '</tbody></table>';
    }

    async function refresh() {
      if (!mcpApp?.callServerTool) return;
      const result = await mcpApp.callServerTool({ name: 'tc_selection_review_app', arguments: {} });
      if (!result.isError && result.structuredContent) render(result.structuredContent);
      else {
        els.tableWrap.className = 'error';
        els.tableWrap.textContent = 'État du viewer indisponible. Ouvrez le panneau « Agent Eyes » dans le viewer 3D puis réessayez.';
      }
    }

    async function ask(text) {
      if (!mcpApp?.sendMessage) return;
      await mcpApp.sendMessage({ role: 'user', content: [{ type: 'text', text }] });
    }

    els.refreshBtn.addEventListener('click', refresh);
    els.bcfBtn.addEventListener('click', () => ask("Crée un BCF sur les objets actuellement sélectionnés dans mon viewer 3D et joins la vue 3D actuelle (caméra + capture + sélection). Demande-moi le titre et la priorité avant de créer."));
    els.todoBtn.addEventListener('click', () => ask("Crée un ToDo concernant les objets actuellement sélectionnés dans mon viewer 3D. Demande-moi le titre avant de créer."));
    els.propsBtn.addEventListener('click', () => ask("Affiche les propriétés (property sets) des objets actuellement sélectionnés dans mon viewer 3D."));

    async function connectMcpApp() {
      try {
        const mod = await import('${EXT_APPS_SDK_URL}');
        const { App, PostMessageTransport } = mod;
        mcpApp = new App({ name: 'Trimble Connect Selection Review', version: '1.0.0' });
        mcpApp.ontoolresult = ({ structuredContent }) => render(structuredContent);
        await mcpApp.connect(new PostMessageTransport(window.parent));
      } catch (error) {
        els.tableWrap.className = 'error';
        els.tableWrap.textContent = 'MCP Apps SDK non chargé. Le résumé texte reste disponible dans le chat.';
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

// ── Object properties app (viewer bridge) ──

function createObjectPropertiesAppHtml(): string {
  return String.raw`<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Propriétés des objets sélectionnés</title>
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
    .warn { display: none; background: #fef3c7; border: 1px solid #fcd34d; color: #92400e; border-radius: 8px; padding: 8px 10px; font-size: 12px; margin-bottom: 10px; }
    .warn.show { display: block; }
    .obj { background: white; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 10px; overflow: hidden; }
    .obj-head { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
    .obj-head h2 { font-size: 13px; margin: 0 0 2px; }
    .badge { display: inline-block; padding: 1px 7px; border-radius: 999px; background: #e0f2fe; color: #0369a1; font-size: 11px; margin-right: 6px; }
    .guid { color: #94a3b8; font-size: 11px; word-break: break-all; }
    details { border-top: 1px solid #f1f5f9; }
    summary { padding: 7px 12px; font-size: 12px; font-weight: 700; color: #334155; cursor: pointer; background: #f8fafc; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    td { padding: 5px 12px; border-top: 1px solid #f1f5f9; vertical-align: top; }
    td.k { color: #64748b; width: 42%; }
    td.v { word-break: break-word; }
    .empty, .error { padding: 18px; border: 1px dashed #cbd5e1; border-radius: 10px; background: white; color: #64748b; }
    .error { border-color: #fecaca; background: #fef2f2; color: #991b1b; }
  </style>
</head>
<body>
  <main class="app">
    <div class="header">
      <div>
        <h1>Propriétés des objets sélectionnés</h1>
        <div class="muted" id="subtitle">En attente des données...</div>
      </div>
      <button id="refreshBtn" class="primary" type="button">Rafraîchir</button>
    </div>
    <div id="staleWarn" class="warn"></div>
    <input id="filter" type="search" placeholder="Filtrer par propriété ou valeur (ex: Volume, IFCFLOWTERMINAL, SR 861)..." />
    <div id="listWrap" class="empty">Les propriétés des objets sélectionnés dans le viewer vont s'afficher ici.</div>
  </main>
  <script type="module">
    let mcpApp = null;
    let data = null;
    const els = {
      subtitle: document.getElementById('subtitle'),
      staleWarn: document.getElementById('staleWarn'),
      filter: document.getElementById('filter'),
      listWrap: document.getElementById('listWrap'),
      refreshBtn: document.getElementById('refreshBtn'),
    };

    function escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
    }

    function renderList() {
      if (!data) return;
      const q = els.filter.value.trim().toLowerCase();
      const objects = data.objects || [];
      if (objects.length === 0) {
        els.listWrap.className = 'empty';
        els.listWrap.textContent = 'Aucun objet sélectionné dans le viewer. Sélectionnez des objets puis cliquez sur Rafraîchir.';
        return;
      }
      const html = objects.map((obj, idx) => {
        const identity = [obj.name, obj.objectType, obj.class, obj.externalId, obj.modelName].join(' ').toLowerCase();
        const groups = (obj.propertySets || []).map((g, gi) => {
          let props = g.props || [];
          if (q && !identity.includes(q)) {
            props = props.filter(p => (String(p.name ?? '') + ' ' + String(p.value ?? '')).toLowerCase().includes(q));
          }
          if (q && props.length === 0 && !(String(g.name ?? '').toLowerCase().includes(q)) && !identity.includes(q)) return '';
          return '<details' + (q || gi === 0 ? ' open' : '') + '><summary>' + escapeHtml(g.name || 'Propriétés') + ' (' + props.length + ')</summary>' +
            '<table><tbody>' + props.map(p => '<tr><td class="k">' + escapeHtml(p.name) + '</td><td class="v">' + escapeHtml(p.value) + '</td></tr>').join('') + '</tbody></table></details>';
        }).filter(Boolean).join('');
        if (q && !identity.includes(q) && groups === '') return '';
        return '<div class="obj"><div class="obj-head">' +
          '<h2>' + escapeHtml(obj.name || 'Objet ' + (idx + 1)) + '</h2>' +
          '<div>' + (obj.class ? '<span class="badge">' + escapeHtml(obj.class) + '</span>' : '') +
          (obj.objectType ? '<span class="badge">' + escapeHtml(obj.objectType) + '</span>' : '') +
          (obj.modelName ? '<span class="muted">' + escapeHtml(obj.modelName) + '</span>' : '') + '</div>' +
          (obj.externalId ? '<div class="guid">GUID ' + escapeHtml(obj.externalId) + '</div>' : '') +
          '</div>' + groups + '</div>';
      }).filter(Boolean).join('');
      els.listWrap.className = '';
      els.listWrap.innerHTML = html || '<div class="empty">Aucune propriété ne correspond au filtre.</div>';
    }

    function render(newData) {
      if (!newData || newData.mode !== 'properties') return;
      data = newData;
      els.subtitle.textContent = (data.project?.name ? 'Projet ' + data.project.name + ' — ' : '') +
        data.totalSelected + ' objet(s) sélectionné(s), propriétés de ' + (data.objects || []).length + ' objet(s) — capturé il y a ' + data.ageSeconds + ' s';
      if (data.stale) {
        els.staleWarn.className = 'warn show';
        els.staleWarn.textContent = 'Données anciennes — vérifiez que le panneau Agent Eyes est toujours ouvert dans le viewer 3D.';
      } else {
        els.staleWarn.className = 'warn';
      }
      renderList();
    }

    async function refresh() {
      if (!mcpApp?.callServerTool) return;
      const result = await mcpApp.callServerTool({ name: 'tc_object_properties_app', arguments: {} });
      if (!result.isError && result.structuredContent) render(result.structuredContent);
      else {
        els.listWrap.className = 'error';
        els.listWrap.textContent = 'État du viewer indisponible. Ouvrez le panneau « Agent Eyes » dans le viewer 3D puis réessayez.';
      }
    }

    els.refreshBtn.addEventListener('click', refresh);
    els.filter.addEventListener('input', renderList);

    async function connectMcpApp() {
      try {
        const mod = await import('${EXT_APPS_SDK_URL}');
        const { App, PostMessageTransport } = mod;
        mcpApp = new App({ name: 'Trimble Connect Object Properties', version: '1.0.0' });
        mcpApp.ontoolresult = ({ structuredContent }) => render(structuredContent);
        await mcpApp.connect(new PostMessageTransport(window.parent));
      } catch (error) {
        els.listWrap.className = 'error';
        els.listWrap.textContent = 'MCP Apps SDK non chargé. Le résumé texte reste disponible dans le chat.';
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

// ── Activity timeline app ──

function buildActivityData(projectId: string, region: string, raw: unknown, limit: number) {
  const activities = asRecordArray(raw)
    .map((a) => {
      const details = (typeof a.details === "object" && a.details !== null ? a.details : {}) as Record<string, unknown>;
      const objects = asRecordArray(a.objects ?? details.objects);
      const subject =
        toText(details.name ?? details.title ?? details.label, "") ||
        (objects.length > 0 ? objects.map((o) => toText(o.name ?? o.title ?? o.id)).slice(0, 3).join(", ") : "") ||
        toText(a.objectName ?? a.object_name, "");
      const dateIso = toText(a.createdOn ?? a.created_on ?? a.timestamp ?? a.modifiedOn, "");
      return {
        id: toText(a.id),
        type: toText(a.activityType ?? a.activity_type ?? a.type ?? a.action),
        actor: toText(a.createdBy ?? a.created_by ?? a.user ?? a.actor),
        dateIso,
        day: dateIso ? dateIso.substring(0, 10) : "-",
        time: dateIso.length >= 16 ? dateIso.substring(11, 16) : "",
        subject,
        _sort: toEpoch(dateIso),
      };
    })
    .sort((a, b) => b._sort - a._sort)
    .slice(0, limit)
    .map(({ _sort, ...rest }) => rest);
  return {
    mode: "timeline" as const,
    projectId,
    region,
    generatedAt: new Date().toISOString(),
    total: activities.length,
    activities,
  };
}

function createActivityTimelineAppHtml(): string {
  return String.raw`<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Activité du projet Trimble Connect</title>
  <style>
    :root { color-scheme: light; font-family: Inter, "Open Sans", Arial, sans-serif; }
    body { margin: 0; background: #f8fafc; color: #1e293b; }
    .app { padding: 14px; }
    .header { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 12px; }
    h1 { font-size: 16px; margin: 0 0 4px; }
    .muted { color: #64748b; font-size: 12px; }
    button { border: 1px solid #cbd5e1; border-radius: 8px; background: white; color: #0f172a; font-size: 12px; padding: 7px 9px; cursor: pointer; font-weight: 600; }
    button.primary { background: #0ea5e9; border-color: #0ea5e9; color: white; }
    .filters { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
    .chip { border: 1px solid #cbd5e1; border-radius: 999px; background: white; color: #334155; font-size: 12px; padding: 4px 10px; cursor: pointer; }
    .chip.active { background: #0ea5e9; border-color: #0ea5e9; color: white; }
    .day { font-size: 12px; font-weight: 700; color: #334155; margin: 14px 0 6px; }
    .item { display: flex; gap: 10px; background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px 10px; margin-bottom: 6px; font-size: 12px; }
    .time { color: #64748b; min-width: 38px; }
    .type { display: inline-block; padding: 1px 7px; border-radius: 999px; background: #e0f2fe; color: #0369a1; white-space: nowrap; margin-right: 6px; }
    .empty, .error { padding: 18px; border: 1px dashed #cbd5e1; border-radius: 10px; background: white; color: #64748b; }
    .error { border-color: #fecaca; background: #fef2f2; color: #991b1b; }
  </style>
</head>
<body>
  <main class="app">
    <div class="header">
      <div>
        <h1>Activité du projet</h1>
        <div class="muted" id="subtitle">En attente des données...</div>
      </div>
      <div style="display:flex; gap:8px">
        <button id="askBtn" type="button">Demander une synthèse</button>
        <button id="refreshBtn" class="primary" type="button">Rafraîchir</button>
      </div>
    </div>
    <div class="filters" id="filters"></div>
    <div id="listWrap" class="empty">La timeline va s'afficher ici.</div>
  </main>
  <script type="module">
    let mcpApp = null;
    let data = null;
    let activeFilter = '';
    const els = {
      subtitle: document.getElementById('subtitle'),
      filters: document.getElementById('filters'),
      listWrap: document.getElementById('listWrap'),
      refreshBtn: document.getElementById('refreshBtn'),
      askBtn: document.getElementById('askBtn'),
    };

    function escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
    }

    function category(type) {
      const t = String(type || '').toUpperCase();
      if (t.includes('FILE') || t.includes('FOLDER') || t.includes('VERSION')) return 'Fichiers';
      if (t.includes('TOPIC') || t.includes('BCF') || t.includes('ISSUE')) return 'BCF';
      if (t.includes('TODO') || t.includes('NOTE')) return 'ToDos';
      if (t.includes('USER') || t.includes('MEMBER') || t.includes('INVIT')) return 'Membres';
      if (t.includes('VIEW')) return 'Vues';
      if (t.includes('SHARE') || t.includes('RELEASE')) return 'Partages';
      return 'Autres';
    }

    function render(newData) {
      if (!newData || newData.mode !== 'timeline') return;
      data = newData;
      els.subtitle.textContent = 'Projet ' + data.projectId + ' — ' + data.total + ' événement(s) — généré le ' + new Date(data.generatedAt).toLocaleString('fr-FR');
      const cats = [...new Set((data.activities || []).map(a => category(a.type)))];
      els.filters.innerHTML = '<span class="chip' + (activeFilter === '' ? ' active' : '') + '" data-cat="">Tout</span>' +
        cats.map(c => '<span class="chip' + (activeFilter === c ? ' active' : '') + '" data-cat="' + escapeHtml(c) + '">' + escapeHtml(c) + '</span>').join('');
      for (const chip of els.filters.querySelectorAll('.chip')) {
        chip.addEventListener('click', () => { activeFilter = chip.getAttribute('data-cat'); render(data); });
      }
      renderList();
    }

    function renderList() {
      const items = (data.activities || []).filter(a => !activeFilter || category(a.type) === activeFilter);
      if (items.length === 0) {
        els.listWrap.className = 'empty';
        els.listWrap.textContent = 'Aucun événement pour ce filtre.';
        return;
      }
      els.listWrap.className = '';
      let html = '';
      let lastDay = '';
      for (const a of items) {
        if (a.day !== lastDay) {
          lastDay = a.day;
          html += '<div class="day">' + escapeHtml(a.day) + '</div>';
        }
        html += '<div class="item"><span class="time">' + escapeHtml(a.time) + '</span><span>' +
          '<span class="type">' + escapeHtml(category(a.type)) + '</span>' +
          '<strong>' + escapeHtml(a.actor) + '</strong> — ' + escapeHtml(a.type) +
          (a.subject ? ' : ' + escapeHtml(a.subject) : '') +
        '</span></div>';
      }
      els.listWrap.innerHTML = html;
    }

    els.refreshBtn.addEventListener('click', async () => {
      if (!data || !mcpApp?.callServerTool) return;
      const result = await mcpApp.callServerTool({
        name: 'tc_activity_timeline_app',
        arguments: { region: data.region, projectId: data.projectId, limit: data.total || 20 },
      });
      if (!result.isError && result.structuredContent) render(result.structuredContent);
    });
    els.askBtn.addEventListener('click', async () => {
      if (!mcpApp?.sendMessage) return;
      await mcpApp.sendMessage({ role: 'user', content: [{ type: 'text', text: "Fais-moi une synthèse de l'activité récente du projet affichée dans la timeline." }] });
    });

    async function connectMcpApp() {
      try {
        const mod = await import('${EXT_APPS_SDK_URL}');
        const { App, PostMessageTransport } = mod;
        mcpApp = new App({ name: 'Trimble Connect Activity Timeline', version: '1.0.0' });
        mcpApp.ontoolinput = () => {
          els.listWrap.className = 'empty';
          els.listWrap.textContent = "Chargement de l'activité...";
        };
        mcpApp.ontoolresult = ({ structuredContent }) => render(structuredContent);
        await mcpApp.connect(new PostMessageTransport(window.parent));
      } catch (error) {
        els.listWrap.className = 'error';
        els.listWrap.textContent = 'MCP Apps SDK non chargé. Le résumé texte reste disponible dans le chat.';
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

// ── Registration ──

export function registerTcApps(
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
  srv.registerResource(
    "trimble-connect-todos-app",
    TODOS_APP_URI,
    {
      title: "ToDos Trimble Connect",
      description: "Interactive MCP App table of Trimble Connect project ToDos.",
      mimeType: "text/html+skybridge",
      _meta: { ...APP_CSP_META, "openai/widgetDescription": "Interactive table of Trimble Connect ToDos.", "openai/widgetPrefersBorder": true },
    },
    async () => ({
      contents: [{
        uri: TODOS_APP_URI,
        mimeType: "text/html+skybridge",
        text: createTodosAppHtml(),
        _meta: { ...APP_CSP_META, "openai/widgetDescription": "Interactive table of Trimble Connect ToDos.", "openai/widgetPrefersBorder": true },
      }],
    })
  );

  srv.registerTool(
    "tc_todos_app",
    {
      title: "Afficher le tableau des ToDos",
      description: "Show an interactive MCP App table of the latest project ToDos (title, status, priority, assignee, due date). Use this when the user asks to SEE/DISPLAY the todos, e.g. 'affiche les 5 derniers ToDos', 'montre-moi les tâches'. For plain data without UI, use tc_todos instead.",
      inputSchema: {
        region: regionEnum,
        projectId: z.string().describe("Trimble Connect project ID"),
        limit: z.number().min(1).max(50).default(5).describe("Number of most recent ToDos to display"),
      },
      _meta: {
        "ui": { "resourceUri": TODOS_APP_URI },
        "openai/outputTemplate": TODOS_APP_URI,
        "openai/widgetAccessible": true,
        "openai/toolInvocation/invoking": "Chargement des ToDos...",
        "openai/toolInvocation/invoked": "Tableau des ToDos prêt.",
      },
    },
    async ({ region, projectId, limit }, extra) => {
      const token = getToken(extra);
      const result = await tcApiCall({ method: "GET", region: region as Region, path: "/todos", query: { projectId }, authToken: token });
      if (result.status >= 400) {
        const text = typeof result.body === "string" ? result.body : JSON.stringify(result.body);
        return { content: [{ type: "text" as const, text: `ERROR: GET /todos → ${result.status} ${result.statusText}\n\n${text}` }], isError: true };
      }
      const dataOut = buildTodosData(projectId, region as string, result.body, limit);
      return {
        content: [{
          type: "text" as const,
          text: `Tableau interactif des ToDos affiché: ${dataOut.showing} ToDo(s) sur ${dataOut.total} (projet ${projectId}). Les détails sont visibles dans le tableau.`,
        }],
        structuredContent: dataOut,
        _meta: {
          "ui": { "resourceUri": TODOS_APP_URI },
          "openai/outputTemplate": TODOS_APP_URI,
          "openai/widgetAccessible": true,
          "openai/toolInvocation/invoked": "Tableau des ToDos prêt.",
        },
      };
    }
  );

  srv.registerResource(
    "trimble-connect-files-app",
    FILES_APP_URI,
    {
      title: "Fichiers Trimble Connect",
      description: "Interactive MCP App table of the latest uploaded files with expandable version history.",
      mimeType: "text/html+skybridge",
      _meta: { ...APP_CSP_META, "openai/widgetDescription": "Interactive table of Trimble Connect files with versions.", "openai/widgetPrefersBorder": true },
    },
    async () => ({
      contents: [{
        uri: FILES_APP_URI,
        mimeType: "text/html+skybridge",
        text: createFilesAppHtml(),
        _meta: { ...APP_CSP_META, "openai/widgetDescription": "Interactive table of Trimble Connect files with versions.", "openai/widgetPrefersBorder": true },
      }],
    })
  );

  srv.registerTool(
    "tc_files_app",
    {
      title: "Afficher le tableau des derniers fichiers",
      description: "Show an interactive MCP App table of the latest uploaded/modified files of a project; clicking a file expands its version history. Use this when the user asks to SEE/DISPLAY recent files, e.g. 'affiche les 5 derniers fichiers déposés'. With fileId set, returns the version history of that file (used internally by the app UI). For plain data without UI, use tc_files instead.",
      inputSchema: {
        region: regionEnum,
        projectId: z.string().describe("Trimble Connect project ID"),
        limit: z.number().min(1).max(50).default(5).describe("Number of most recent files to display"),
        fileId: z.string().optional().describe("If set, return the version history of this file instead of the file list"),
      },
      _meta: {
        "ui": { "resourceUri": FILES_APP_URI },
        "openai/outputTemplate": FILES_APP_URI,
        "openai/widgetAccessible": true,
        "openai/toolInvocation/invoking": "Chargement des fichiers...",
        "openai/toolInvocation/invoked": "Tableau des fichiers prêt.",
      },
    },
    async ({ region, projectId, limit, fileId }, extra) => {
      const token = getToken(extra);

      if (fileId) {
        const result = await tcApiCall({ method: "GET", region: region as Region, path: `/files/${fileId}/versions`, authToken: token });
        if (result.status >= 400) {
          const text = typeof result.body === "string" ? result.body : JSON.stringify(result.body);
          return { content: [{ type: "text" as const, text: `ERROR: GET /files/${fileId}/versions → ${result.status} ${result.statusText}\n\n${text}` }], isError: true };
        }
        const versionsData = buildFileVersionsData(projectId, region as string, fileId, result.body);
        return {
          content: [{ type: "text" as const, text: `${versionsData.versions.length} version(s) du fichier ${fileId}.` }],
          structuredContent: versionsData,
        };
      }

      const result = await tcApiCall({ method: "GET", region: region as Region, path: "/search", query: { query: "*", projectId, type: "FILE" }, authToken: token });
      if (result.status >= 400) {
        const text = typeof result.body === "string" ? result.body : JSON.stringify(result.body);
        return { content: [{ type: "text" as const, text: `ERROR: GET /search → ${result.status} ${result.statusText}\n\n${text}` }], isError: true };
      }
      const dataOut = buildFilesListData(projectId, region as string, result.body, limit);
      return {
        content: [{
          type: "text" as const,
          text: `Tableau interactif des fichiers affiché: ${dataOut.showing} fichier(s) sur ${dataOut.total} (projet ${projectId}). L'utilisateur peut cliquer sur un fichier pour voir ses versions.`,
        }],
        structuredContent: dataOut,
        _meta: {
          "ui": { "resourceUri": FILES_APP_URI },
          "openai/outputTemplate": FILES_APP_URI,
          "openai/widgetAccessible": true,
          "openai/toolInvocation/invoked": "Tableau des fichiers prêt.",
        },
      };
    }
  );

  // ── BCF detail app ──

  registerAppResource(
    "trimble-connect-bcf-detail-app",
    BCF_DETAIL_APP_URI,
    "Détail d'un BCF Trimble Connect",
    "Interactive MCP App card showing a BCF topic with comments, viewpoints and quick status/priority edits.",
    createBcfDetailAppHtml
  );

  srv.registerTool(
    "tc_bcf_detail_app",
    {
      title: "Afficher la fiche détail d'un BCF",
      description: "Show an interactive MCP App card with the full detail of one BCF topic: description, status, priority, comments thread, attached viewpoints (snapshots loadable on click), plus inline actions to change status/priority and add a comment. Use this when the user asks to SEE the detail of a specific BCF (e.g. 'montre-moi le détail du BCF X'). Resolve the topic GUID first with tc_bcf action topics_list if the user gave a title. For plain data without UI, use tc_bcf action topic_get instead.",
      inputSchema: {
        region: regionEnum,
        projectId: z.string().describe("Trimble Connect project ID"),
        topicId: z.string().describe("GUID of the BCF topic"),
        bcfVersion: z.enum(["2.1", "3.0"]).default("2.1").describe("BCF API version"),
        snapshotViewpointId: z.string().optional().describe("If set, return the snapshot image (data URL) of this viewpoint instead of the topic detail (used internally by the app UI)"),
      },
      _meta: appToolMeta(BCF_DETAIL_APP_URI, "Chargement du BCF...", "Fiche BCF prête."),
    },
    async ({ region, projectId, topicId, bcfVersion, snapshotViewpointId }, extra) => {
      const token = getToken(extra);

      if (snapshotViewpointId) {
        const rawToken = token.replace(/^Bearer\s+/i, "");
        const url = `${getBcfBaseUrl(region as Region, bcfVersion)}/projects/${encodeURIComponent(projectId)}/topics/${encodeURIComponent(topicId)}/viewpoints/${encodeURIComponent(snapshotViewpointId)}/snapshot`;
        try {
          const res = await fetch(url, { headers: { Authorization: `Bearer ${rawToken}` } });
          if (!res.ok) {
            return { content: [{ type: "text" as const, text: `Snapshot indisponible (${res.status} ${res.statusText}).` }], isError: true };
          }
          const buffer = Buffer.from(await res.arrayBuffer());
          if (buffer.byteLength > 3_000_000) {
            return { content: [{ type: "text" as const, text: "Snapshot trop volumineux pour être affiché dans le chat." }], isError: true };
          }
          const contentType = res.headers.get("content-type")?.split(";")[0] || "image/png";
          return {
            content: [{ type: "text" as const, text: `Snapshot du viewpoint ${snapshotViewpointId} chargé.` }],
            structuredContent: {
              mode: "snapshot",
              viewpointId: snapshotViewpointId,
              dataUrl: `data:${contentType};base64,${buffer.toString("base64")}`,
            },
          };
        } catch (error) {
          return { content: [{ type: "text" as const, text: `Snapshot indisponible: ${String(error)}` }], isError: true };
        }
      }

      const base = { region: region as Region, apiType: "bcf" as const, bcfVersion, authToken: token };
      const [topicRes, commentsRes, viewpointsRes, extRes] = await Promise.all([
        tcApiCall({ ...base, method: "GET", path: `/projects/${projectId}/topics/${topicId}` }),
        tcApiCall({ ...base, method: "GET", path: `/projects/${projectId}/topics/${topicId}/comments` }),
        tcApiCall({ ...base, method: "GET", path: `/projects/${projectId}/topics/${topicId}/viewpoints` }),
        tcApiCall({ ...base, method: "GET", path: `/projects/${projectId}/extensions` }),
      ]);
      console.log(`[bcf-detail-app] topic=${topicRes.status} comments=${commentsRes.status} viewpoints=${viewpointsRes.status} extensions=${extRes.status} (project=${projectId}, topic=${topicId}, bcf=${bcfVersion})`);

      if (topicRes.status >= 400) {
        const text = typeof topicRes.body === "string" ? topicRes.body : JSON.stringify(topicRes.body);
        console.error(`[bcf-detail-app] topic GET failed: ${topicRes.status} — ${text.slice(0, 300)}`);
        return { content: [{ type: "text" as const, text: `ERROR: GET topic → ${topicRes.status} ${topicRes.statusText}\n\n${text}` }], isError: true };
      }
      const rawTopic = (typeof topicRes.body === "object" && topicRes.body !== null ? topicRes.body : {}) as Record<string, unknown>;
      const dataOut = buildBcfDetailData(
        region as string,
        projectId,
        bcfVersion,
        rawTopic,
        commentsRes.status < 400 ? commentsRes.body : [],
        viewpointsRes.status < 400 ? viewpointsRes.body : [],
        extRes.status < 400 ? extRes.body : {}
      );
      return {
        content: [{
          type: "text" as const,
          text: `Fiche BCF affichée: « ${dataOut.topic.title} » (statut ${dataOut.topic.status}, priorité ${dataOut.topic.priority}) — ${dataOut.comments.length} commentaire(s), ${dataOut.viewpoints.length} vue(s). Les détails sont visibles dans la fiche interactive.`,
        }],
        structuredContent: dataOut,
        _meta: appToolMeta(BCF_DETAIL_APP_URI, "Chargement du BCF...", "Fiche BCF prête."),
      };
    }
  );

  // ── Selection review app (viewer bridge) ──

  registerAppResource(
    "trimble-connect-selection-review-app",
    SELECTION_REVIEW_APP_URI,
    "Revue de sélection du viewer 3D",
    "Interactive MCP App showing the objects currently selected in the user's 3D viewer, with quick actions.",
    createSelectionReviewAppHtml
  );

  srv.registerTool(
    "tc_selection_review_app",
    {
      title: "Afficher la revue de sélection du viewer 3D",
      description: "Show an interactive MCP App that reviews the objects currently selected in the user's Trimble Connect 3D viewer (via the Agent Eyes extension): model, object count, IFC GUIDs, data freshness, with quick action buttons (create BCF, create ToDo, show properties). Use this when the user asks to review/see their current selection (e.g. 'fais une revue de ma sélection'). Requires the Agent Eyes panel open. For plain data without UI, use get_current_viewer_state instead.",
      inputSchema: {},
      _meta: appToolMeta(SELECTION_REVIEW_APP_URI, "Lecture de la sélection...", "Revue de sélection prête."),
    },
    async (_args, extra) => {
      const token = getToken(extra);
      const user = await resolveUserKeys(token);
      const match = getViewerState(user.keys);
      if (!match) {
        return {
          content: [{
            type: "text" as const,
            text: "No viewer state available. Ask the user to open the 'Agent Eyes' extension panel in the Trimble Connect 3D viewer (left sidebar), then retry.",
          }],
          isError: true,
        };
      }
      const state = match.entry.state;
      const ageSeconds = Math.max(0, Math.round((Date.now() - match.entry.storedAt) / 1000));
      const selection = (state.selection ?? []).map((s) => ({
        modelId: s.modelId,
        modelName: s.modelName ?? "",
        count: s.externalIds?.length ?? s.objectRuntimeIds?.length ?? 0,
        guids: (s.externalIds ?? []).slice(0, 50),
      }));
      const totalSelected = selection.reduce((sum, s) => sum + s.count, 0);
      const dataOut = {
        mode: "review" as const,
        ageSeconds,
        stale: ageSeconds > 120,
        project: state.project ?? {},
        models: (state.models ?? []).map((m) => ({ name: m.name ?? m.id })),
        selection,
        totalSelected,
      };
      return {
        content: [{
          type: "text" as const,
          text: `Revue de sélection affichée: ${totalSelected} objet(s) sélectionné(s) dans ${selection.length} modèle(s), données capturées il y a ${ageSeconds} s. Le détail est visible dans le panneau interactif.`,
        }],
        structuredContent: dataOut,
        _meta: appToolMeta(SELECTION_REVIEW_APP_URI, "Lecture de la sélection...", "Revue de sélection prête."),
      };
    }
  );

  // ── Activity timeline app ──

  registerAppResource(
    "trimble-connect-activity-timeline-app",
    ACTIVITY_TIMELINE_APP_URI,
    "Timeline d'activité du projet",
    "Interactive MCP App timeline of recent Trimble Connect project events, filterable by category.",
    createActivityTimelineAppHtml
  );

  srv.registerTool(
    "tc_activity_timeline_app",
    {
      title: "Afficher la timeline d'activité du projet",
      description: "Show an interactive MCP App timeline of the latest project events (file uploads, BCF, todos, members, views...) grouped by day and filterable by category. Use this when the user asks to SEE the recent project activity (e.g. 'montre-moi l'activité du projet cette semaine'). For plain data without UI, use tc_activities instead.",
      inputSchema: {
        region: regionEnum,
        projectId: z.string().describe("Trimble Connect project ID"),
        limit: z.number().min(1).max(100).default(20).describe("Number of most recent events to display"),
      },
      _meta: appToolMeta(ACTIVITY_TIMELINE_APP_URI, "Chargement de l'activité...", "Timeline prête."),
    },
    async ({ region, projectId, limit }, extra) => {
      const token = getToken(extra);
      let result = await tcApiCall({
        method: "POST",
        region: region as Region,
        path: "/activities/list",
        body: { objectType: "PROJECT", objectId: projectId, pageSize: limit },
        authToken: token,
      });
      if (result.status >= 400) {
        result = await tcApiCall({ method: "GET", region: region as Region, path: "/activities", query: { projectId }, authToken: token });
      }
      if (result.status >= 400) {
        const text = typeof result.body === "string" ? result.body : JSON.stringify(result.body);
        return { content: [{ type: "text" as const, text: `ERROR: activities → ${result.status} ${result.statusText}\n\n${text}` }], isError: true };
      }
      const dataOut = buildActivityData(projectId, region as string, result.body, limit);
      return {
        content: [{
          type: "text" as const,
          text: `Timeline d'activité affichée: ${dataOut.total} événement(s) récents du projet ${projectId}. Le détail est visible dans la timeline interactive.`,
        }],
        structuredContent: dataOut,
        _meta: appToolMeta(ACTIVITY_TIMELINE_APP_URI, "Chargement de l'activité...", "Timeline prête."),
      };
    }
  );

  // ── Object properties app (viewer bridge) ──

  registerAppResource(
    "trimble-connect-object-properties-app",
    OBJECT_PROPERTIES_APP_URI,
    "Propriétés des objets sélectionnés",
    "Interactive MCP App showing the IFC properties (name, object type, class, property sets) of the objects currently selected in the user's 3D viewer.",
    createObjectPropertiesAppHtml
  );

  srv.registerTool(
    "tc_object_properties_app",
    {
      title: "Afficher les propriétés des objets sélectionnés",
      description: "Show an interactive MCP App with the IFC properties of the objects currently selected in the user's Trimble Connect 3D viewer (via the Agent Eyes extension): name, object type, IFC class, GUID, and all property sets (calculated geometry, bounding box, custom psets...) as filterable tables. ALWAYS use this tool when the user asks to see/display the properties of their selection (e.g. 'affiche les propriétés des objets sélectionnés', 'quel est le type d'objet ?'). Do NOT use model_search or the model gateway for this. Requires the Agent Eyes panel open in the viewer.",
      inputSchema: {},
      _meta: appToolMeta(OBJECT_PROPERTIES_APP_URI, "Lecture des propriétés...", "Propriétés prêtes."),
    },
    async (_args, extra) => {
      const token = getToken(extra);
      const user = await resolveUserKeys(token);
      const match = getViewerState(user.keys);
      if (!match) {
        return {
          content: [{
            type: "text" as const,
            text: "No viewer state available. Ask the user to open the 'Agent Eyes' extension panel in the Trimble Connect 3D viewer (left sidebar), then retry.",
          }],
          isError: true,
        };
      }
      const state = match.entry.state;
      const ageSeconds = Math.max(0, Math.round((Date.now() - match.entry.storedAt) / 1000));
      const objects: Record<string, unknown>[] = [];
      let totalSelected = 0;
      for (const sel of state.selection ?? []) {
        totalSelected += sel.externalIds?.length ?? sel.objectRuntimeIds?.length ?? 0;
        for (const obj of sel.properties ?? []) {
          objects.push({ ...obj, modelName: sel.modelName ?? sel.modelId });
        }
      }
      if (totalSelected === 0) {
        return {
          content: [{
            type: "text" as const,
            text: "No objects are currently selected in the 3D viewer. Ask the user to select objects, then retry.",
          }],
          isError: true,
        };
      }
      if (objects.length === 0) {
        return {
          content: [{
            type: "text" as const,
            text: `${totalSelected} object(s) selected but no properties were captured yet. The Agent Eyes extension may need a few seconds (or a refresh of the Trimble Connect page to load its latest version). Retry shortly.`,
          }],
          isError: true,
        };
      }
      const dataOut = {
        mode: "properties" as const,
        ageSeconds,
        stale: ageSeconds > 120,
        project: state.project ?? {},
        totalSelected,
        objects,
      };
      const names = objects.map((o) => String((o as { name?: unknown }).name ?? "?")).slice(0, 5).join(", ");
      return {
        content: [{
          type: "text" as const,
          text: `Propriétés affichées pour ${objects.length} objet(s) sélectionné(s) (${names}${objects.length > 5 ? ", …" : ""}) — capturées il y a ${ageSeconds} s. Le détail (property sets complets) est visible dans le panneau interactif.`,
        }],
        structuredContent: dataOut,
        _meta: appToolMeta(OBJECT_PROPERTIES_APP_URI, "Lecture des propriétés...", "Propriétés prêtes."),
      };
    }
  );
}
