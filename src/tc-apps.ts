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
import { tcApiCall, type Region } from "./tc-api-client.js";

const TODOS_APP_URI = "ui://trimble-connect/todos.html";
const FILES_APP_URI = "ui://trimble-connect/files.html";

const APP_CSP_META = {
  "ui": {
    "csp": {
      "resource_domains": ["https://esm.sh"],
      "connect_domains": ["https://esm.sh"],
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
        const mod = await import('https://esm.sh/@modelcontextprotocol/ext-apps@latest');
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
        const mod = await import('https://esm.sh/@modelcontextprotocol/ext-apps@latest');
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

// ── Registration ──

export function registerTcApps(
  srv: McpServer,
  getToken: (extra: { sessionId?: string }) => string
): void {
  const regionEnum = z.enum(["us", "eu", "ap", "ap-au"]).describe("Trimble Connect region: us (North America), eu (Europe), ap (Asia-Pacific), ap-au (Australia)");
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
}
