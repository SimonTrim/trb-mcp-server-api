/**
 * Domain tools: full coverage of the Trimble Connect Core API (tc/api/2.0)
 * and BCF API (bcf/2.1) grouped by API domain.
 *
 * One MCP tool per domain, with an `action` parameter selecting the endpoint.
 * This keeps the tool count manageable (~18 tools instead of ~200) while
 * exposing every JSON-based endpoint of the Trimble Connect REST APIs.
 *
 * Binary/multipart endpoints (file binary upload, thumbnails, snapshots)
 * are intentionally not exposed: MCP tools exchange JSON/text only.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { tcApiCall, type Region, type ApiType } from "./tc-api-client.js";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface ActionDef {
  method: HttpMethod;
  /** Path template. Placeholders: {projectId}, {id}, {subId}, {extraId}, {version} */
  path: string;
  apiType?: ApiType;
  /** Short hint shown in the tool description (required params, body shape…) */
  hint: string;
}

interface DomainDef {
  toolName: string;
  title: string;
  actions: Record<string, ActionDef>;
}

const domains: DomainDef[] = [
  {
    toolName: "tc_activities",
    title: "Trimble Connect Activities (audit trail) and activity exports",
    actions: {
      list: { method: "POST", path: "/activities/list", hint: "body: {objectType:'PROJECT', objectId, pageSize?, filters?}" },
      list_by_query: { method: "GET", path: "/activities", hint: "query: {projectId, ...}" },
      get: { method: "GET", path: "/activities/{id}", hint: "id=activityId" },
      logs: { method: "GET", path: "/activities/{id}/logs", hint: "id=activityId" },
      create_export: { method: "POST", path: "/activities/exports", hint: "body: export request" },
      get_export: { method: "GET", path: "/activities/exports/{id}", hint: "id=exportId" },
    },
  },
  {
    toolName: "tc_clashes",
    title: "Trimble Connect Clash sets (create, inspect, update, delete clash reports)",
    actions: {
      list: { method: "GET", path: "/clashsets", hint: "query: {projectId}" },
      get: { method: "GET", path: "/clashsets/{id}", hint: "id=clashId" },
      list_items: { method: "GET", path: "/clashsets/{id}/items", hint: "id=clashId" },
      create: { method: "POST", path: "/clashsets", hint: "body: CreateClashRequest {name, projectId, models, clearance...}" },
      update: { method: "PATCH", path: "/clashsets/{id}", hint: "id=clashId, body: fields to update" },
      delete: { method: "DELETE", path: "/clashsets/{id}", hint: "id=clashId" },
    },
  },
  {
    toolName: "tc_views2d",
    title: "Trimble Connect 2D Views",
    actions: {
      list: { method: "GET", path: "/views2d", hint: "query: {projectId}" },
      get: { method: "GET", path: "/views2d/{id}", hint: "id=viewId" },
      create: { method: "POST", path: "/views2d", hint: "body: Create2DViewRequest" },
      update: { method: "PATCH", path: "/views2d/{id}", hint: "id=viewId, body: fields to update" },
      delete: { method: "DELETE", path: "/views2d/{id}", hint: "id=viewId" },
    },
  },
  {
    toolName: "tc_comments",
    title: "Trimble Connect Comments (on files, folders, todos, views…) incl. attachments and reactions",
    actions: {
      list: { method: "GET", path: "/comments", hint: "query: {objectId, objectType} e.g. objectType=TODO|FILE|FOLDER|VIEW" },
      get: { method: "GET", path: "/comments/{id}", hint: "id=commentId" },
      create: { method: "POST", path: "/comments", hint: "body: {objectId, objectType, description...}" },
      update: { method: "PATCH", path: "/comments/{id}", hint: "id=commentId, body: {description...}" },
      delete: { method: "DELETE", path: "/comments/{id}", hint: "id=commentId" },
      list_attachments: { method: "GET", path: "/comments/{id}/attachments", hint: "id=commentId" },
      add_attachments: { method: "POST", path: "/comments/{id}/attachments", hint: "id=commentId, body: {attachments:[fileIds]}" },
      remove_attachments: { method: "DELETE", path: "/comments/{id}/attachments", hint: "id=commentId, body: {attachments:[fileIds]}" },
      list_reactions: { method: "GET", path: "/comments/{id}/reactions", hint: "id=commentId" },
      add_reaction: { method: "POST", path: "/comments/{id}/reactions", hint: "id=commentId, body: {reaction}" },
      delete_reaction: { method: "DELETE", path: "/comments/{id}/reactions/{subId}", hint: "id=commentId, subId=reactionId" },
    },
  },
  {
    toolName: "tc_companies",
    title: "Trimble Connect Companies and company members",
    actions: {
      list: { method: "GET", path: "/companies", hint: "" },
      get: { method: "GET", path: "/companies/{id}", hint: "id=companyId" },
      update: { method: "PATCH", path: "/companies/{id}", hint: "id=companyId, body: fields to update" },
      list_users: { method: "GET", path: "/companies/{id}/users", hint: "id=companyId" },
      add_users: { method: "POST", path: "/companies/{id}/users", hint: "id=companyId, body: users to add" },
      update_user: { method: "PATCH", path: "/companies/{id}/users/{subId}", hint: "id=companyId, subId=userId, body: role..." },
      remove_user: { method: "DELETE", path: "/companies/{id}/users/{subId}", hint: "id=companyId, subId=userId" },
      remove_users: { method: "DELETE", path: "/companies/{id}/users", hint: "id=companyId, body: users to remove" },
      add_domains: { method: "PATCH", path: "/companies/{id}/domains", hint: "id=companyId, body: email domains to add" },
      remove_domains: { method: "DELETE", path: "/companies/{id}/domains", hint: "id=companyId, body: email domains to remove" },
    },
  },
  {
    toolName: "tc_files",
    title: "Trimble Connect Files: details, versions, download URL, check-in/out, permissions, alignment, exports, upload orchestration (JSON steps only)",
    actions: {
      get: { method: "GET", path: "/files/{id}", hint: "id=fileId" },
      update: { method: "PATCH", path: "/files/{id}", hint: "id=fileId, body: {name?, parentId?...}" },
      delete: { method: "DELETE", path: "/files/{id}", hint: "id=fileId" },
      versions: { method: "GET", path: "/files/{id}/versions", hint: "id=fileId" },
      versions_v21: { method: "GET", path: "/2.1/projects/{projectId}/files/{id}/versions", hint: "id=fileId (paged v2.1 API)" },
      processing_status: { method: "GET", path: "/files/{id}/status", hint: "id=fileId" },
      process: { method: "POST", path: "/files/{id}/process", hint: "id=fileId, body: {format:'TRB', versionId?} — trigger model assimilation/processing" },
      download_url: { method: "GET", path: "/files/fs/{id}/downloadurl", hint: "id=fileId, query: {versionId?}" },
      checkin: { method: "POST", path: "/files/{id}/checkin", hint: "id=fileId" },
      checkout: { method: "POST", path: "/files/{id}/checkout", hint: "id=fileId" },
      permissions_get: { method: "GET", path: "/files/{id}/permissions", hint: "id=fileId" },
      permissions_update: { method: "PATCH", path: "/files/{id}/permissions", hint: "id=fileId, body: permissions" },
      supported_formats: { method: "GET", path: "/files/formats", hint: "list supported 2D/3D/spatial formats" },
      snapshot: { method: "GET", path: "/files/fs/snapshot", hint: "query: {projectId} — active file/folder snapshot" },
      create_export: { method: "POST", path: "/files/export", hint: "body: export request" },
      get_export: { method: "GET", path: "/files/export/{id}", hint: "id=exportId" },
      initiate_upload: { method: "POST", path: "/files/fs/initiate", hint: "body: upload init request (returns signed upload URLs)" },
      initiate_package_upload: { method: "POST", path: "/files/fs/upload", hint: "body: package upload request" },
      complete_multipart_upload: { method: "POST", path: "/files/fs/upload/{id}/complete", hint: "id=uploadId, body: parts" },
      commit_upload: { method: "POST", path: "/files/fs/commit", hint: "body: commit request" },
      upload_details: { method: "GET", path: "/files/fs/upload", hint: "query: upload details params" },
      upload_status: { method: "GET", path: "/files/fs/uploadstatus", hint: "query: {uploadId...}" },
      alignment_get: { method: "GET", path: "/files/{id}/alignment", hint: "id=fileId" },
      alignment_set: { method: "PUT", path: "/files/{id}/alignment", hint: "id=fileId, body: alignment" },
      alignment_set_matrix: { method: "POST", path: "/files/{id}/alignment/matrix", hint: "id=fileId, body: matrix" },
      alignment_delete: { method: "DELETE", path: "/files/{id}/alignment", hint: "id=fileId" },
    },
  },
  {
    toolName: "tc_folders",
    title: "Trimble Connect Folders: browse, create, rename, delete, versions, permissions",
    actions: {
      get: { method: "GET", path: "/folders/{id}", hint: "id=folderId" },
      items: { method: "GET", path: "/folders/{id}/items", hint: "id=folderId (use project rootId for root)" },
      items_v21: { method: "GET", path: "/2.1/folders/{id}/items", hint: "id=folderId (paged v2.1 API)" },
      items_by_path: { method: "GET", path: "/folders/by_path", hint: "query: {projectId, path}" },
      items_by_path_v21: { method: "GET", path: "/2.1/folders/by_path", hint: "query: {projectId, path} (paged v2.1 API)" },
      item_by_name: { method: "GET", path: "/folders/{id}/item", hint: "id=folderId, query: {name}" },
      create: { method: "POST", path: "/folders", hint: "body: {name, parentId}" },
      update: { method: "PATCH", path: "/folders/{id}", hint: "id=folderId, body: {name?, parentId?}" },
      delete: { method: "DELETE", path: "/folders/{id}", hint: "id=folderId" },
      delete_async: { method: "DELETE", path: "/folders/{id}/delete", hint: "id=folderId (async deletion job)" },
      deletion_job_status: { method: "GET", path: "/folders/jobs/{id}", hint: "id=jobId" },
      versions: { method: "GET", path: "/folders/{id}/versions", hint: "id=folderId" },
      versions_v21: { method: "GET", path: "/2.1/projects/{projectId}/folders/{id}/versions", hint: "id=folderId (paged v2.1 API)" },
      permissions_get: { method: "GET", path: "/folders/fs/{id}/permissions", hint: "id=folderId" },
      permissions_patch: { method: "PATCH", path: "/folders/fs/{id}/permissions", hint: "id=folderId, body: permissions" },
      permission_add: { method: "POST", path: "/folders/{id}/permissions", hint: "id=folderId, body: permission" },
      permission_update: { method: "PATCH", path: "/folders/{id}/permissions", hint: "id=folderId, body: permission" },
      permission_remove: { method: "DELETE", path: "/folders/{id}/permissions", hint: "id=folderId, body: permission to remove" },
    },
  },
  {
    toolName: "tc_groups",
    title: "Trimble Connect user Groups within a project",
    actions: {
      list: { method: "GET", path: "/groups", hint: "query: {projectId}" },
      get: { method: "GET", path: "/groups/{id}", hint: "id=groupId" },
      create: { method: "POST", path: "/groups", hint: "body: {name, projectId}" },
      rename: { method: "PATCH", path: "/groups/{id}", hint: "id=groupId, body: {name}" },
      delete: { method: "DELETE", path: "/groups/{id}", hint: "id=groupId" },
      list_users: { method: "GET", path: "/groups/{id}/users", hint: "id=groupId" },
      add_users: { method: "POST", path: "/groups/{id}/users", hint: "id=groupId, body: users to add" },
      remove_users: { method: "DELETE", path: "/groups/{id}/users", hint: "id=groupId, body: users to remove" },
    },
  },
  {
    toolName: "tc_object_links",
    title: "Trimble Connect Object Links (link entities like todos/files/views to model objects)",
    actions: {
      list: { method: "GET", path: "/objectlink", hint: "query: {projectId, objectId?...}" },
      list_for_target: { method: "GET", path: "/objectlink/target", hint: "query: target entity params" },
      create: { method: "POST", path: "/objectlink", hint: "body: object link" },
      bulk_create: { method: "POST", path: "/objectlink/objectlinks", hint: "body: array of object links" },
      update: { method: "PATCH", path: "/objectlink/{id}", hint: "id=linkId, body: fields to update" },
      delete: { method: "DELETE", path: "/objectlink/{id}", hint: "id=linkId" },
    },
  },
  {
    toolName: "tc_projects",
    title: "Trimble Connect Projects administration: update/delete/clone project, members, roles, settings, license, metrics, sync status",
    actions: {
      list: { method: "GET", path: "/projects", hint: "query: {fullyLoaded?}" },
      list_v21: { method: "GET", path: "/2.1/projects", hint: "paged project list (v2.1 API)" },
      list_mini: { method: "GET", path: "/projects/me", hint: "minimal list of user's projects" },
      get: { method: "GET", path: "/projects/{projectId}", hint: "" },
      update: { method: "PATCH", path: "/projects/{projectId}", hint: "body: {name?, description?...}" },
      delete: { method: "DELETE", path: "/projects/{projectId}", hint: "" },
      clone: { method: "POST", path: "/projects/clones", hint: "body: clone request {projectId, name...}" },
      clone_status: { method: "GET", path: "/projects/clones/{id}", hint: "id=cloneId" },
      metrics: { method: "GET", path: "/projects/{projectId}/metrics", hint: "" },
      settings_get: { method: "GET", path: "/projects/{projectId}/settings", hint: "" },
      settings_update: { method: "PATCH", path: "/projects/{projectId}/settings", hint: "body: settings" },
      license_get: { method: "GET", path: "/projects/{projectId}/license", hint: "" },
      license_update: { method: "PATCH", path: "/projects/{projectId}/license", hint: "body: license details" },
      roles: { method: "GET", path: "/projects/{projectId}/roles", hint: "list roles available in project" },
      list_users: { method: "GET", path: "/projects/{projectId}/users", hint: "" },
      get_user: { method: "GET", path: "/projects/{projectId}/users/{id}", hint: "id=userId" },
      add_users: { method: "POST", path: "/projects/{projectId}/users", hint: "body: users to add/invite [{email, role?}]" },
      update_user_role: { method: "PATCH", path: "/projects/{projectId}/users/{id}", hint: "id=userId, body: {role}" },
      remove_user: { method: "DELETE", path: "/projects/{projectId}/users/{id}", hint: "id=userId" },
      request_access: { method: "POST", path: "/projects/accessRequests", hint: "body: access request" },
      sync_objects: { method: "GET", path: "/projects/{projectId}/objects", hint: "object sync list" },
      sync_status: { method: "GET", path: "/projects/{projectId}/status", hint: "project sync status" },
      fs_structure: { method: "GET", path: "/sync/{projectId}", hint: "full file-system structure of the project (query: {excludeVersion?:'true'})" },
    },
  },
  {
    toolName: "tc_releases",
    title: "Trimble Connect Releases (file release packages)",
    actions: {
      list: { method: "GET", path: "/releases", hint: "query: {projectId}" },
      get: { method: "GET", path: "/releases/{id}", hint: "id=releaseId" },
      create: { method: "POST", path: "/releases", hint: "body: release {name, projectId...}" },
      update: { method: "PATCH", path: "/releases/{id}", hint: "id=releaseId, body: fields to update" },
      delete: { method: "DELETE", path: "/releases/{id}", hint: "id=releaseId" },
      list_files: { method: "GET", path: "/releases/{id}/files", hint: "id=releaseId" },
      add_files: { method: "POST", path: "/releases/{id}/files", hint: "id=releaseId, body: files to add" },
      remove_files: { method: "DELETE", path: "/releases/{id}/files", hint: "id=releaseId, body: files to remove" },
      download_files: { method: "POST", path: "/releases/downloadFiles", hint: "body: download request" },
    },
  },
  {
    toolName: "tc_shares",
    title: "Trimble Connect Shares (share files/views with external users)",
    actions: {
      list: { method: "GET", path: "/shares", hint: "query: {projectId}" },
      get: { method: "GET", path: "/shares/{id}", hint: "id=shareId" },
      get_by_token: { method: "GET", path: "/shares/token/{id}", hint: "id=share token (stoken)" },
      create: { method: "POST", path: "/shares", hint: "body: ShareObjectRequest" },
      update: { method: "PATCH", path: "/shares/{id}", hint: "id=shareId, body: fields to update" },
      delete: { method: "DELETE", path: "/shares/{id}", hint: "id=shareId" },
    },
  },
  {
    toolName: "tc_tags",
    title: "Trimble Connect Tags (tag files, folders and other objects)",
    actions: {
      list: { method: "GET", path: "/tags", hint: "query: {projectId}" },
      get: { method: "GET", path: "/tags/{id}", hint: "id=tagId" },
      create: { method: "POST", path: "/tags", hint: "body: {label, projectId, description?}" },
      update: { method: "PATCH", path: "/tags/{id}", hint: "id=tagId, body: fields to update" },
      delete: { method: "DELETE", path: "/tags/{id}", hint: "id=tagId" },
      list_objects: { method: "GET", path: "/tags/{id}/objects", hint: "id=tagId" },
      add_objects: { method: "POST", path: "/tags/{id}/objects", hint: "id=tagId, body: objects to tag" },
      remove_objects: { method: "DELETE", path: "/tags/{id}/objects", hint: "id=tagId, body: objects to untag" },
    },
  },
  {
    toolName: "tc_todos",
    title: "Trimble Connect ToDos: full management incl. details, delete, types, attachments",
    actions: {
      list: { method: "GET", path: "/todos", hint: "query: {projectId}" },
      get: { method: "GET", path: "/todos/{id}", hint: "id=todoId" },
      create: { method: "POST", path: "/todos", hint: "body: {label, projectId, description?, assignees?, dueDate?...}" },
      update: { method: "PATCH", path: "/todos/{id}", hint: "id=todoId, body: fields to update" },
      delete: { method: "DELETE", path: "/todos/{id}", hint: "id=todoId" },
      list_types: { method: "GET", path: "/todos/types", hint: "query: {projectId}" },
      list_attachments: { method: "GET", path: "/todos/{id}/attachments", hint: "id=todoId" },
      add_attachments: { method: "POST", path: "/todos/{id}/attachments", hint: "id=todoId, body: {attachments:[fileIds]}" },
      remove_attachments: { method: "DELETE", path: "/todos/{id}/attachments", hint: "id=todoId, body: {attachments:[fileIds]}" },
    },
  },
  {
    toolName: "tc_users",
    title: "Trimble Connect Users: profiles, update, licenses, timezones, languages",
    actions: {
      get: { method: "GET", path: "/users/{id}", hint: "id=userId (or 'me')" },
      update: { method: "PATCH", path: "/users/{id}", hint: "id=userId, body: fields to update" },
      licenses: { method: "GET", path: "/users/licenses", hint: "current user's licenses" },
      timezones: { method: "GET", path: "/users/timezones", hint: "" },
      languages: { method: "GET", path: "/users/languages", hint: "" },
    },
  },
  {
    toolName: "tc_view_groups",
    title: "Trimble Connect View Groups (organize saved views)",
    actions: {
      list: { method: "GET", path: "/viewgroups", hint: "query: {projectId}" },
      get: { method: "GET", path: "/viewgroups/{id}", hint: "id=viewGroupId" },
      create: { method: "POST", path: "/viewgroups", hint: "body: {name, projectId, views?}" },
      update: { method: "PATCH", path: "/viewgroups/{id}", hint: "id=viewGroupId, body: fields to update" },
      delete: { method: "DELETE", path: "/viewgroups/{id}", hint: "id=viewGroupId" },
    },
  },
  {
    toolName: "tc_views",
    title: "Trimble Connect 3D Views: CRUD plus camera, presentation, section box/planes and markups",
    actions: {
      list: { method: "GET", path: "/views", hint: "query: {projectId}" },
      get: { method: "GET", path: "/views/{id}", hint: "id=viewId" },
      create: { method: "POST", path: "/views", hint: "body: view definition {name, projectId, models?, camera?...}" },
      update: { method: "PATCH", path: "/views/{id}", hint: "id=viewId, body: fields to update" },
      delete: { method: "DELETE", path: "/views/{id}", hint: "id=viewId" },
      camera_get: { method: "GET", path: "/views/{id}/camera", hint: "id=viewId" },
      camera_update: { method: "PATCH", path: "/views/{id}/camera", hint: "id=viewId, body: camera" },
      presentation_get: { method: "GET", path: "/views/{id}/presentation", hint: "id=viewId" },
      presentation_update: { method: "PATCH", path: "/views/{id}/presentation", hint: "id=viewId, body: presentation" },
      sectionbox_get: { method: "GET", path: "/views/{id}/sectionbox", hint: "id=viewId" },
      sectionbox_update: { method: "PUT", path: "/views/{id}/sectionbox", hint: "id=viewId, body: section box" },
      sectionbox_delete: { method: "DELETE", path: "/views/{id}/sectionbox", hint: "id=viewId" },
      sectionplanes_list: { method: "GET", path: "/views/{id}/sectionplanes", hint: "id=viewId" },
      sectionplane_create: { method: "POST", path: "/views/{id}/sectionplanes", hint: "id=viewId, body: section plane" },
      sectionplane_update: { method: "PATCH", path: "/views/{id}/sectionplanes", hint: "id=viewId, body: section plane" },
      sectionplane_delete: { method: "DELETE", path: "/views/{id}/sectionplanes/{subId}", hint: "id=viewId, subId=sectionplaneId" },
      markups_list: { method: "GET", path: "/views/{id}/markups", hint: "id=viewId" },
      markups_create: { method: "POST", path: "/views/{id}/markups", hint: "id=viewId, body: markups" },
      markups_update: { method: "PATCH", path: "/views/{id}/markups", hint: "id=viewId, body: markups" },
      markup_delete: { method: "DELETE", path: "/views/{id}/markups/{subId}", hint: "id=viewId, subId=markupId" },
    },
  },
  {
    toolName: "tc_bcf",
    title: "Trimble Connect BCF/Topic API (default 2.1, set bcfVersion='3.0' for BCF 3.0): topics, comments, viewpoints, extensions, document references, batch operations",
    actions: {
      list_projects: { method: "GET", path: "/projects", apiType: "bcf", hint: "" },
      get_project: { method: "GET", path: "/projects/{projectId}", apiType: "bcf", hint: "" },
      extensions_get: { method: "GET", path: "/projects/{projectId}/extensions", apiType: "bcf", hint: "topic types, statuses, priorities, labels, users" },
      extensions_update: { method: "PUT", path: "/projects/{projectId}/extensions", apiType: "bcf", hint: "body: extensions" },
      default_extensions: { method: "GET", path: "/projects/{projectId}/defaultextensions", apiType: "bcf", hint: "" },
      topics_list: { method: "GET", path: "/projects/{projectId}/topics", apiType: "bcf", hint: "query: OData filters supported ($filter, $orderby...)" },
      topic_get: { method: "GET", path: "/projects/{projectId}/topics/{id}", apiType: "bcf", hint: "id=topicId (guid)" },
      topic_create: { method: "POST", path: "/projects/{projectId}/topics", apiType: "bcf", hint: "body: {title, description?, topic_type?, priority?, assigned_to?, topic_status?...}" },
      topic_update: { method: "PUT", path: "/projects/{projectId}/topics/{id}", apiType: "bcf", hint: "id=topicId, body: full topic object" },
      topic_delete: { method: "DELETE", path: "/projects/{projectId}/topics/{id}", apiType: "bcf", hint: "id=topicId" },
      topics_batch_create: { method: "POST", path: "/projects/{projectId}/topics/batch", apiType: "bcf", hint: "body: array of topics" },
      topics_batch_update: { method: "PATCH", path: "/projects/{projectId}/topics/batch", apiType: "bcf", hint: "body: array of topic patches" },
      comments_list: { method: "GET", path: "/projects/{projectId}/topics/{id}/comments", apiType: "bcf", hint: "id=topicId" },
      comment_get: { method: "GET", path: "/projects/{projectId}/topics/{id}/comments/{subId}", apiType: "bcf", hint: "id=topicId, subId=commentId" },
      comment_create: { method: "POST", path: "/projects/{projectId}/topics/{id}/comments", apiType: "bcf", hint: "id=topicId, body: {comment}" },
      comment_update: { method: "PUT", path: "/projects/{projectId}/topics/{id}/comments/{subId}", apiType: "bcf", hint: "id=topicId, subId=commentId, body: {comment}" },
      comment_delete: { method: "DELETE", path: "/projects/{projectId}/topics/{id}/comments/{subId}", apiType: "bcf", hint: "id=topicId, subId=commentId" },
      comments_batch_create: { method: "POST", path: "/projects/{projectId}/comments/batch", apiType: "bcf", hint: "body: array of comments" },
      comments_batch_update: { method: "PATCH", path: "/projects/{projectId}/comments/batch", apiType: "bcf", hint: "body: array of comment patches" },
      viewpoints_list: { method: "GET", path: "/projects/{projectId}/topics/{id}/viewpoints", apiType: "bcf", hint: "id=topicId" },
      viewpoint_get: { method: "GET", path: "/projects/{projectId}/topics/{id}/viewpoints/{subId}", apiType: "bcf", hint: "id=topicId, subId=viewpointId" },
      viewpoint_create: { method: "POST", path: "/projects/{projectId}/topics/{id}/viewpoints", apiType: "bcf", hint: "id=topicId, body: viewpoint (camera, snapshot base64...)" },
      viewpoint_delete: { method: "DELETE", path: "/projects/{projectId}/topics/{id}/viewpoints/{subId}", apiType: "bcf", hint: "id=topicId, subId=viewpointId" },
      viewpoint_selection: { method: "GET", path: "/projects/{projectId}/topics/{id}/viewpoints/{subId}/selection", apiType: "bcf", hint: "id=topicId, subId=viewpointId" },
      viewpoint_coloring: { method: "GET", path: "/projects/{projectId}/topics/{id}/viewpoints/{subId}/coloring", apiType: "bcf", hint: "id=topicId, subId=viewpointId" },
      viewpoint_visibility: { method: "GET", path: "/projects/{projectId}/topics/{id}/viewpoints/{subId}/visibility", apiType: "bcf", hint: "id=topicId, subId=viewpointId" },
      related_topics_get: { method: "GET", path: "/projects/{projectId}/topics/{id}/related_topics", apiType: "bcf", hint: "id=topicId" },
      related_topics_update: { method: "PUT", path: "/projects/{projectId}/topics/{id}/related_topics", apiType: "bcf", hint: "id=topicId, body: related topics" },
      topic_files_get: { method: "GET", path: "/projects/{projectId}/topics/{id}/files", apiType: "bcf", hint: "id=topicId" },
      topic_files_update: { method: "PUT", path: "/projects/{projectId}/topics/{id}/files", apiType: "bcf", hint: "id=topicId, body: file references" },
      document_references_list: { method: "GET", path: "/projects/{projectId}/topics/{id}/document_references", apiType: "bcf", hint: "id=topicId" },
      document_reference_create: { method: "POST", path: "/projects/{projectId}/topics/{id}/document_references", apiType: "bcf", hint: "id=topicId, body: document reference" },
      document_reference_update: { method: "PUT", path: "/projects/{projectId}/topics/{id}/document_references/{subId}", apiType: "bcf", hint: "id=topicId, subId=documentReferenceId, body" },
      document_reference_delete: { method: "DELETE", path: "/projects/{projectId}/topics/{id}/document_references/{subId}", apiType: "bcf", hint: "id=topicId, subId=documentReferenceId" },
      documents_list: { method: "GET", path: "/projects/{projectId}/documents", apiType: "bcf", hint: "" },
      document_get: { method: "GET", path: "/projects/{projectId}/documents/{id}", apiType: "bcf", hint: "id=documentId" },
      objects: { method: "GET", path: "/projects/{projectId}/objects", apiType: "bcf", hint: "" },
      changes: { method: "GET", path: "/projects/{projectId}/changes", apiType: "bcf", hint: "query: change tracking params" },
      current_user: { method: "GET", path: "/current-user", apiType: "bcf", hint: "" },
      bcf_versions: { method: "GET", path: "/bcf/versions", apiType: "bcf-root", hint: "supported BCF versions" },
      foundation_versions: { method: "GET", path: "/foundation/versions", apiType: "bcf-root", hint: "" },
      foundation_auth: { method: "GET", path: "/foundation/1.0/auth", apiType: "bcf-root", hint: "" },
      foundation_current_user: { method: "GET", path: "/foundation/1.0/current-user", apiType: "bcf-root", hint: "" },
    },
  },
  {
    toolName: "tc_psets",
    title: "Trimble Connect Property Set Service (PSet): libraries, definitions, pset instances, policies, changesets. Regional service URI is resolved automatically. In pset paths, 'link' is the FRN of the external resource (e.g. model object)",
    actions: {
      me: { method: "GET", path: "/me", apiType: "pset", hint: "current user info" },
      library_create: { method: "POST", path: "/libs", apiType: "pset", hint: "body: library definition" },
      library_get: { method: "GET", path: "/libs/{id}", apiType: "pset", hint: "id=libId" },
      library_update: { method: "PATCH", path: "/libs/{id}", apiType: "pset", hint: "id=libId, body: fields to update" },
      library_delete: { method: "DELETE", path: "/libs/{id}", apiType: "pset", hint: "id=libId" },
      library_policy_get: { method: "GET", path: "/libs/{id}/policy", apiType: "pset", hint: "id=libId" },
      library_policy_put: { method: "PUT", path: "/libs/{id}/policy", apiType: "pset", hint: "id=libId, body: access control policy" },
      definitions_list: { method: "GET", path: "/libs/{id}/defs", apiType: "pset", hint: "id=libId, query: {top?, skiptoken?, prefix?}" },
      definition_create: { method: "POST", path: "/libs/{id}/defs", apiType: "pset", hint: "id=libId, body: definition with data schema" },
      definition_get: { method: "GET", path: "/libs/{id}/defs/{subId}", apiType: "pset", hint: "id=libId, subId=defId" },
      definition_update: { method: "PATCH", path: "/libs/{id}/defs/{subId}", apiType: "pset", hint: "id=libId, subId=defId, body: fields to update" },
      definition_delete: { method: "DELETE", path: "/libs/{id}/defs/{subId}", apiType: "pset", hint: "id=libId, subId=defId" },
      definition_versions: { method: "GET", path: "/libs/{id}/defs/{subId}/versions", apiType: "pset", hint: "id=libId, subId=defId" },
      definition_version_get: { method: "GET", path: "/libs/{id}/defs/{subId}/versions/{version}", apiType: "pset", hint: "id=libId, subId=defId, version=version number" },
      definition_schema_get: { method: "GET", path: "/libs/{id}/defs/{subId}/schema/{version}", apiType: "pset", hint: "id=libId, subId=defId, version=schema version" },
      definition_validate: { method: "POST", path: "/libs/{id}/defs/{subId}/validate", apiType: "pset", hint: "id=libId, subId=defId, body: values to validate" },
      psets_list_by_definition: { method: "GET", path: "/libs/{id}/defs/{subId}/psets", apiType: "pset", hint: "id=libId, subId=defId" },
      psets_list_for_link: { method: "GET", path: "/psets/{id}", apiType: "pset", hint: "id=link (FRN), query: {top?, skiptoken?}" },
      pset_get: { method: "GET", path: "/psets/{id}/{subId}/{extraId}", apiType: "pset", hint: "id=link, subId=libId, extraId=defId" },
      pset_update: { method: "PATCH", path: "/psets/{id}/{subId}/{extraId}", apiType: "pset", hint: "id=link, subId=libId, extraId=defId, body: {props}" },
      pset_delete: { method: "DELETE", path: "/psets/{id}/{subId}/{extraId}", apiType: "pset", hint: "id=link, subId=libId, extraId=defId" },
      pset_versions: { method: "GET", path: "/psets/{id}/{subId}/{extraId}/versions", apiType: "pset", hint: "id=link, subId=libId, extraId=defId" },
      pset_version_get: { method: "GET", path: "/psets/{id}/{subId}/{extraId}/versions/{version}", apiType: "pset", hint: "id=link, subId=libId, extraId=defId, version" },
      batch_get: { method: "POST", path: "/batch-get", apiType: "pset", hint: "body: {psets:[{libId, defId, link, v?}]}" },
      changeset: { method: "POST", path: "/psets/changeset", apiType: "pset", hint: "body: changeset (bulk create/update)" },
      changeset_async: { method: "POST", path: "/psets/changeset-async", apiType: "pset", hint: "body: changeset" },
      changeset_status: { method: "GET", path: "/psets/changeset/{id}", apiType: "pset", hint: "id=changesetId" },
    },
  },
  {
    toolName: "tc_organizer",
    title: "Trimble Connect Organizer Service: forests, trees (breakdown structures like LBS), nodes, policies, changesets. forestId is usually the Trimble Connect projectId. Regional service URI is resolved automatically",
    actions: {
      trees_list: { method: "GET", path: "/forests/{id}/trees", apiType: "org", hint: "id=forestId (projectId)" },
      tree_get: { method: "GET", path: "/forests/{id}/trees/{subId}", apiType: "org", hint: "id=forestId, subId=treeId, query: {deleted?}" },
      tree_create: { method: "POST", path: "/forests/{id}/trees", apiType: "org", hint: "id=forestId, body: {name, type} e.g. type='LBS'" },
      tree_update: { method: "PATCH", path: "/forests/{id}/trees/{subId}", apiType: "org", hint: "id=forestId, subId=treeId, body: fields to update" },
      tree_delete: { method: "DELETE", path: "/forests/{id}/trees/{subId}", apiType: "org", hint: "id=forestId, subId=treeId" },
      tree_policy_get: { method: "GET", path: "/forests/{id}/trees/{subId}/policy", apiType: "org", hint: "id=forestId, subId=treeId" },
      tree_policy_put: { method: "PUT", path: "/forests/{id}/trees/{subId}/policy", apiType: "org", hint: "id=forestId, subId=treeId, body: policy" },
      nodes_list: { method: "GET", path: "/forests/{id}/trees/{subId}/nodes", apiType: "org", hint: "id=forestId, subId=treeId, query: {top?, skiptoken?}" },
      node_get: { method: "GET", path: "/forests/{id}/trees/{subId}/nodes/{extraId}", apiType: "org", hint: "id=forestId, subId=treeId, extraId=nodeId" },
      node_create: { method: "POST", path: "/forests/{id}/trees/{subId}/nodes", apiType: "org", hint: "id=forestId, subId=treeId, body: node" },
      node_update: { method: "PATCH", path: "/forests/{id}/trees/{subId}/nodes/{extraId}", apiType: "org", hint: "id=forestId, subId=treeId, extraId=nodeId, body" },
      node_delete: { method: "DELETE", path: "/forests/{id}/trees/{subId}/nodes/{extraId}", apiType: "org", hint: "id=forestId, subId=treeId, extraId=nodeId" },
      node_links: { method: "GET", path: "/forests/{id}/trees/{subId}/nodes/{extraId}/links", apiType: "org", hint: "id=forestId, subId=treeId, extraId=nodeId" },
      node_versions: { method: "GET", path: "/forests/{id}/trees/{subId}/nodes/{extraId}/versions", apiType: "org", hint: "id=forestId, subId=treeId, extraId=nodeId" },
      node_version_get: { method: "GET", path: "/forests/{id}/trees/{subId}/nodes/{extraId}/versions/{version}", apiType: "org", hint: "id=forestId, subId=treeId, extraId=nodeId, version" },
      search_forest: { method: "GET", path: "/forests/{id}/search", apiType: "org", hint: "id=forestId, query: search params" },
      search_tree: { method: "GET", path: "/forests/{id}/trees/{subId}/search", apiType: "org", hint: "id=forestId, subId=treeId, query: search params" },
      batch_get_nodes: { method: "POST", path: "/batch-get", apiType: "org", hint: "body: batch node keys" },
      changeset: { method: "POST", path: "/forests/{id}/trees/{subId}/changeset", apiType: "org", hint: "id=forestId, subId=treeId, body: changeset" },
      changeset_async: { method: "POST", path: "/forests/{id}/trees/{subId}/changeset-async", apiType: "org", hint: "id=forestId, subId=treeId, body: changeset" },
      changeset_status: { method: "GET", path: "/changeset/{id}", apiType: "org", hint: "id=changesetId" },
    },
  },
];

function buildPath(
  template: string,
  params: { projectId?: string; id?: string; subId?: string; extraId?: string; version?: string }
): string {
  return template.replace(/\{(projectId|id|subId|extraId|version)\}/g, (_match, key: string) => {
    const value = params[key as keyof typeof params];
    if (!value) {
      throw new Error(`Missing required parameter "${key}" for this action.`);
    }
    return encodeURIComponent(value);
  });
}

function buildDescription(domain: DomainDef): string {
  const lines = Object.entries(domain.actions).map(([name, def]) => {
    const hint = def.hint ? ` — ${def.hint}` : "";
    return `- ${name}: ${def.method} ${def.path}${hint}`;
  });
  return `${domain.title}. Select the endpoint with the "action" parameter. Path placeholders {projectId}/{id}/{subId}/{extraId}/{version} are filled from the matching input parameters. Actions:\n${lines.join("\n")}`;
}

const regionEnum = z
  .enum(["us", "eu", "ap", "ap-au"])
  .describe("Trimble Connect region: us (North America), eu (Europe), ap (Asia-Pacific), ap-au (Australia)");

export function registerDomainTools(
  srv: McpServer,
  getToken: (extra: { sessionId?: string }) => string
): void {
  for (const domain of domains) {
    const actionNames = Object.keys(domain.actions) as [string, ...string[]];

    srv.tool(
      domain.toolName,
      buildDescription(domain),
      {
        region: regionEnum,
        action: z.enum(actionNames).describe("Endpoint to call (see tool description)"),
        projectId: z.string().optional().describe("Project ID — required when the action path contains {projectId}"),
        id: z.string().optional().describe("Primary resource ID — required when the action path contains {id}"),
        subId: z.string().optional().describe("Secondary resource ID — required when the action path contains {subId}"),
        extraId: z.string().optional().describe("Tertiary resource ID — required when the action path contains {extraId}"),
        version: z.string().optional().describe("Version number — required when the action path contains {version}"),
        bcfVersion: z.enum(["2.1", "3.0"]).optional().describe("BCF API version for BCF actions (default 2.1)"),
        query: z.record(z.string(), z.string()).optional().describe("Query parameters as key-value pairs"),
        body: z.any().optional().describe("JSON request body for POST/PUT/PATCH (and some DELETE) actions"),
      },
      async ({ region, action, projectId, id, subId, extraId, version, bcfVersion, query, body }, extra) => {
        const def = domain.actions[action];
        if (!def) {
          return {
            content: [{ type: "text" as const, text: `Unknown action "${action}". Available: ${actionNames.join(", ")}` }],
            isError: true,
          };
        }

        let path: string;
        try {
          path = buildPath(def.path, { projectId, id, subId, extraId, version });
        } catch (error) {
          return {
            content: [{ type: "text" as const, text: String(error instanceof Error ? error.message : error) }],
            isError: true,
          };
        }

        const token = getToken(extra);
        const result = await tcApiCall({
          method: def.method,
          region: region as Region,
          path,
          apiType: def.apiType ?? "core",
          bcfVersion,
          query,
          body,
          authToken: token,
        });

        const text = typeof result.body === "string" ? result.body : JSON.stringify(result.body, null, 2);
        const summary = `${def.method} ${path} → ${result.status} ${result.statusText}`;
        if (result.status >= 400) {
          return { content: [{ type: "text" as const, text: `ERROR: ${summary}\n\n${text}` }], isError: true };
        }
        return { content: [{ type: "text" as const, text: `${summary}\n\n${text}` }] };
      }
    );
  }
}
