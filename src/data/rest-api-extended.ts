export const restApiExtendedDocs = {
  activities: `# Activities API

Audit and collaboration activity records for projects and objects. Use list endpoints with filters and cursor-based pagination for large histories.

**Base URL:** \`https://app.connect.trimble.com/tc/api/2.0\`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /activities/list | List activities with filters (\`objectId\`, \`objectType\`, date range, users). Supports cursor pagination via \`lastId\` and \`pageSize\`. |
| GET | /activities/{activityId} | Retrieve a single activity by ID. |
| GET | /activities/{activityId}/logs | Retrieve log entries associated with an activity. |
| GET | /activities | List activities for a project or object context. |
| POST | /activities/exports | Create an asynchronous activity export request. |
| GET | /activities/exports/{exportId} | Poll export job status and retrieve export metadata or download details when ready. |`,

  clashesExtended: `# Clash Sets API (Extended)

Full clash-detection workflow: create clash reports (clash sets), list and inspect clashes, update metadata such as name and assignees, and enumerate clash items including geometric center points.

**Base URL:** \`https://app.connect.trimble.com/tc/api/2.0\`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /clashsets | Create a new clash report (clash set). |
| GET | /clashsets | List all clash sets in a project. Query: \`projectId\`. |
| GET | /clashsets/{clashId} | Get detailed information for one clash set. |
| PATCH | /clashsets/{clashId} | Update clash set properties (e.g. name, assignees). |
| DELETE | /clashsets/{clashId} | Delete a clash set. |
| GET | /clashsets/{clashId}/items | List individual clash items, typically including center point data for navigation in the viewer. |`,

  views2d: `# 2D Views API

Manage saved 2D views linked to project files and versions. Supports JSON payloads and multipart uploads for thumbnails.

**Base URL:** \`https://app.connect.trimble.com/tc/api/2.0\`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /views2d | Create a 2D view; optional base64-encoded thumbnail in the body. |
| POST | /views2d/multiparts | Create a 2D view using multipart form data (e.g. thumbnail file). |
| GET | /views2d | List 2D views. Query: \`projectId\`, \`fileId\`, \`fileVersionId\`. |
| GET | /views2d/{viewId} | Get metadata and payload for one 2D view. |
| PATCH | /views2d/{viewId} | Update an existing 2D view. |
| PATCH | /views2d/multiparts/{viewId} | Update a 2D view via multipart. |
| DELETE | /views2d/{viewId} | Delete a 2D view. |`,

  comments: `# Comments API

Threaded discussion on project entities. Supports reactions, attachments, and CRUD on comment content.

**Base URL:** \`https://app.connect.trimble.com/tc/api/2.0\`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /comments | Create a new comment. |
| GET | /comments | List comments. Query: \`projectId\`, \`objectId\`, \`objectType\`. |
| GET | /comments/{commentId} | Get one comment with full detail. |
| PATCH | /comments/{commentId} | Update comment text or description. |
| DELETE | /comments/{commentId} | Delete a comment. |
| POST | /comments/{commentId}/reactions | Add a reaction to a comment. |
| GET | /comments/{commentId}/reactions | List reactions on a comment. |
| DELETE | /comments/{commentId}/reactions/{reactionId} | Remove a specific reaction. |
| POST | /comments/{commentId}/attachments | Attach files or references to a comment. |
| GET | /comments/{commentId}/attachments | List attachments on a comment. |
| DELETE | /comments/{commentId}/attachments | Remove attachments from a comment. |`,

  companies: `# Companies API

Organization-level directory: company profile, domains, logo, and membership.

**Base URL:** \`https://app.connect.trimble.com/tc/api/2.0\`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /companies | List companies associated with the current tenant or context. |
| GET | /companies/{companyId} | Get company details. |
| PATCH | /companies/{companyId} | Update company profile (name, website, email domains, etc.). |
| POST | /companies/{companyId}/users | Add users to the company. |
| GET | /companies/{companyId}/users | List users belonging to the company. |
| DELETE | /companies/{companyId}/users/{userId} | Remove a user from the company. |
| PATCH | /companies/{companyId}/users/{userId} | Change a user's role within the company. |
| PATCH | /companies/{companyId}/domains | Append allowed email domains. |
| DELETE | /companies/{companyId}/domains | Remove email domains. |
| POST | /companies/{companyId}/image | Upload or replace the company logo. |`,

  groups: `# Groups API

Project-scoped user groups for access and notification batching.

**Base URL:** \`https://app.connect.trimble.com/tc/api/2.0\`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /groups | Create a new group in a project. |
| GET | /groups | List groups. Query: \`projectId\`. |
| GET | /groups/{groupId} | Get group details. |
| PATCH | /groups/{groupId} | Rename or update group metadata. |
| DELETE | /groups/{groupId} | Delete a group. |
| POST | /groups/{groupId}/users | Add one or more users to the group. |
| GET | /groups/{groupId}/users | List users in the group. |
| DELETE | /groups/{groupId}/users | Remove users from the group (payload identifies members). |`,

  objectLinks: `# Object Links API

Relationships between model objects and other entities (e.g. cross-model references). Supports single and bulk creation.

**Base URL:** \`https://app.connect.trimble.com/tc/api/2.0\`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /objectlink | Create a single object link. |
| POST | /objectlink/objectlinks | Bulk-create multiple object links. |
| GET | /objectlink | List links filtered by model version and object or source identifier. |
| GET | /objectlink/target | List links where the given entity is the target. |
| PATCH | /objectlink/{linkId} | Update link properties. |
| DELETE | /objectlink/{linkId} | Delete an object link. |`,

  objectSync: `# Object Sync API

Incremental synchronization of project object data using a server-maintained cursor.

**Base URL:** \`https://app.connect.trimble.com/tc/api/2.0\`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /projects/{projectId}/objects | Incremental sync: return object changes after the supplied cursor (or initial snapshot semantics per API contract). |
| GET | /projects/{projectId}/status | Retrieve the current project content sync cursor and related sync state. |`,

  releases: `# Releases API

Formal packages of file versions distributed to stakeholders. Status transitions (e.g. to \`SENT\`) control distribution.

**Base URL:** \`https://app.connect.trimble.com/tc/api/2.0\`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /releases | Create a new release. |
| GET | /releases | List releases for a project. Query: \`projectId\`, \`status\`. |
| GET | /releases/{releaseId} | Get release details. |
| PATCH | /releases/{releaseId} | Update release metadata; set status to \`SENT\` to distribute. |
| DELETE | /releases/{releaseId} | Delete a release. |
| POST | /releases/{releaseId}/files | Add files (or file versions) to the release. |
| GET | /releases/{releaseId}/files | List files included in the release. |
| DELETE | /releases/{releaseId}/files | Remove files from the release. |
| POST | /releases/downloadFiles | Request a bundled download (e.g. ZIP) for release files. |`,

  shares: `# Shares API

Time-bound or token-based sharing of project content. Behavior may depend on share mode (notifications, expiry).

**Base URL:** \`https://app.connect.trimble.com/tc/api/2.0\`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /shares | Create a share; options vary by mode (notify recipients, expiry). |
| GET | /shares | List shares visible to the current user or filtered by project. |
| GET | /shares/{shareId} | Get share details by internal ID. |
| PATCH | /shares/{shareId} | Update share settings. |
| DELETE | /shares/{shareId} | Revoke or delete a share. |
| GET | /shares/token/{stoken} | Resolve share details using the public share token. |`,

  tags: `# Tags API

Labels applied to objects within a project for filtering and organization.

**Base URL:** \`https://app.connect.trimble.com/tc/api/2.0\`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /tags | Create a tag in a project. |
| GET | /tags | List tags. Query: \`projectId\`, \`objectId\`. |
| GET | /tags/{tagId} | Get tag details. |
| PATCH | /tags/{tagId} | Update tag name or properties. |
| DELETE | /tags/{tagId} | Delete a tag. |
| POST | /tags/{tagId}/objects | Associate objects with the tag. |
| GET | /tags/{tagId}/objects | List objects mapped to the tag. |
| DELETE | /tags/{tagId}/objects | Remove object associations from the tag. |`,

  users: `# Users API

Profile and preference data for directory users, plus reference lists for timezones, languages, and licenses.

**Base URL:** \`https://app.connect.trimble.com/tc/api/2.0\`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /users/{userId} | User profile; use \`me\` as \`userId\` for the authenticated user. |
| PATCH | /users/{userId} | Update user profile fields. |
| GET | /users/timezones | List supported timezone identifiers. |
| GET | /users/languages | List supported UI or content languages. |
| GET | /users/licenses | List licenses available to the current user. |`,

  viewGroups: `# View Groups API

Named collections of 3D or 2D views for structured navigation in a project.

**Base URL:** \`https://app.connect.trimble.com/tc/api/2.0\`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /viewgroups | Create a view group. |
| GET | /viewgroups | List view groups. Query: \`projectId\`. |
| GET | /viewgroups/{viewGroupId} | Get view group details and contained views. |
| PATCH | /viewgroups/{viewGroupId} | Update name and the ordered list of views. |
| DELETE | /viewgroups/{viewGroupId} | Delete a view group. |`,

  filesExtended: `# Files API (Extended)

Check-in/out, alignment, processing status, ACLs, multipart upload to object storage, formats, exports, and download URLs.

**Base URL:** \`https://app.connect.trimble.com/tc/api/2.0\`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /files/{fileId}/checkout | Lock the file for exclusive editing (check out). |
| POST | /files/{fileId}/checkin | Unlock the file after changes (check in). |
| PUT | /files/{fileId}/alignment | Create or replace spatial alignment for the file. |
| GET | /files/{fileId}/alignment | Get current alignment data. |
| DELETE | /files/{fileId}/alignment | Remove alignment. |
| GET | /files/{fileId}/status | File processing status (2D/3D pipeline). |
| GET | /files/{fileId}/permissions | Get file-level access control entries. |
| PATCH | /files/{fileId}/permissions | Update file ACLs. |
| GET | /files/formats | List supported 2D, 3D, and spatial file formats. |
| POST | /files/fs/upload | Start a multipart upload; returns presigned part URLs. |
| POST | /files/fs/upload/{uploadId}/complete | Finalize multipart upload after all parts are uploaded. |
| POST | /files/fs/commit | Commit uploaded bytes into a file or representation record. |
| GET | /files/fs/upload | Poll upload session status. |
| GET | /files/fs/uploadstatus | Upload or representation commit status. |
| GET | /files/fs/snapshot | Latest snapshot of project files and folders for sync clients. |
| GET | /files/fs/{fileId}/downloadurl | Resolve a time-limited download URL (version and format query parameters as applicable). |
| POST | /files/export | Create an asynchronous file export job. |
| GET | /files/export/{exportId} | Get export job status and result location. |`,

  foldersExtended: `# Folders API (Extended)

Folder CRUD, hierarchical listing, path-based lookup, versioning, permission matrices, and async deletion jobs. Most routes use API **v2.0**. Rows whose endpoint starts with \`/2.1/\` are called with host \`https://app.connect.trimble.com/tc/api\` plus that path (equivalent to the **v2.1** base \`https://app.connect.trimble.com/tc/api/2.1/...\` without duplicating the version segment).

**Base URL (v2.0):** \`https://app.connect.trimble.com/tc/api/2.0\`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /folders | Create a folder. |
| GET | /folders/{folderId} | Get folder metadata. |
| PATCH | /folders/{folderId} | Move or rename the folder. |
| DELETE | /folders/{folderId} | Delete an empty folder or trigger standard deletion. |
| DELETE | /folders/{folderId}/delete | Delete with force option; non-empty trees may be processed asynchronously. |
| GET | /folders/jobs/{jobId} | Status of an asynchronous folder deletion job. |
| GET | /folders/{folderId}/items | List child files and folders. |
| GET | /2.1/folders/{folderId}/items | List folder items (**v2.1**); cursor pagination. |
| GET | /folders/by_path | Resolve and list items by folder path. |
| GET | /2.1/folders/by_path | List by path (**v2.1**). |
| GET | /folders/{folderId}/item | Get a single child by name and type. |
| GET | /folders/{folderId}/versions | List historical versions of the folder record. |
| POST | /folders/{folderId}/permissions | Create or replace folder permissions. |
| GET | /folders/{folderId}/permissions | List folder permissions. |
| PATCH | /folders/{folderId}/permissions | Partially update permissions. |
| DELETE | /folders/{folderId}/permissions | Remove permission rules. |
| GET | /folders/fs/{folderId}/permissions | Get folder ACLs (filesystem-oriented model). |
| PATCH | /folders/fs/{folderId}/permissions | Patch folder ACLs. |`,

  projectsExtended: `# Projects API (Extended)

Project lifecycle, membership, roles, metrics, licensing, settings, imagery, cloning, and access requests. Project listing includes a **v2.1** list endpoint (cursor pagination, fields, sort). Use \`/2.1/projects\` with host \`https://app.connect.trimble.com/tc/api\` (same pattern as other \`/2.1/...\` paths).

**Base URL (v2.0):** \`https://app.connect.trimble.com/tc/api/2.0\`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /projects | Create a project. |
| GET | /projects | List all projects the caller can access. |
| GET | /2.1/projects | List projects (**v2.1**): cursor pagination, selectable fields, sort. |
| GET | /projects/me | Minimal project list optimized for the current user. |
| GET | /projects/{projectId} | Project details. |
| PATCH | /projects/{projectId} | Update project metadata. |
| DELETE | /projects/{projectId} | Delete a project. |
| POST | /projects/{projectId}/users | Invite or add users to the project. |
| GET | /projects/{projectId}/users | List project members. |
| GET | /projects/{projectId}/users/{userId} | Get one member's project profile. |
| PATCH | /projects/{projectId}/users/{userId} | Update the member's role or flags. |
| DELETE | /projects/{projectId}/users/{userId} | Remove a user from the project. |
| GET | /projects/{projectId}/roles | List assignable roles. |
| GET | /projects/{projectId}/metrics | Project usage or activity metrics. |
| GET | /projects/{projectId}/license | License allocation for the project. |
| PATCH | /projects/{projectId}/license | Update license settings. |
| GET | /projects/{projectId}/settings | Project settings payload. |
| PATCH | /projects/{projectId}/settings | Update project settings. |
| POST | /projects/{projectId}/image | Upload or replace project thumbnail or banner image. |
| POST | /projects/clones | Start a project clone job. |
| GET | /projects/clones/{cloneId} | Poll clone job status. |
| POST | /projects/accessRequests | Request access to a project. |`,

  viewsExtended: `# 3D Views API (REST Extended)

Saved 3D views: camera, presentation, markups, sectioning, and raster thumbnails. Supports JSON and multipart creation.

**Base URL:** \`https://app.connect.trimble.com/tc/api/2.0\`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /views | Create a 3D view. |
| POST | /views/multiparts | Create a view with thumbnail via multipart upload. |
| GET | /views | List views. Query: \`projectId\`, \`fileId\`, \`topicId\`. |
| GET | /views/{viewId} | Get view details. |
| PATCH | /views/{viewId} | Update view metadata. |
| DELETE | /views/{viewId} | Delete a view. |
| GET | /views/{viewId}/camera | Get stored camera transform and projection. |
| PATCH | /views/{viewId}/camera | Update camera. |
| GET | /views/{viewId}/presentation | Get presentation mode settings. |
| PATCH | /views/{viewId}/presentation | Update presentation settings. |
| POST | /views/{viewId}/markups | Create markups on the view. |
| GET | /views/{viewId}/markups | List markups. |
| PATCH | /views/{viewId}/markups | Batch-update markups. |
| DELETE | /views/{viewId}/markups/{markupId} | Delete one markup. |
| POST | /views/{viewId}/sectionplanes | Add section planes. |
| GET | /views/{viewId}/sectionplanes | List section planes. |
| PATCH | /views/{viewId}/sectionplanes | Update section planes. |
| DELETE | /views/{viewId}/sectionplanes/{sectionplaneId} | Delete one section plane. |
| PUT | /views/{viewId}/sectionbox | Create or replace section box clipping. |
| GET | /views/{viewId}/sectionbox | Get section box. |
| DELETE | /views/{viewId}/sectionbox | Remove section box. |
| GET | /views/{viewId}/image | Retrieve view snapshot image. |
| POST | /views/{viewId}/image | Upload or replace view thumbnail image. |`,
};
