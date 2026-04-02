export const bcfApiDocs = {
  overview: `# BCF Topics API (BIM Collaboration Format)

## BCF Base URLs (DIFFERENT from Core API)

> CRITICAL: The BCF API uses openXX servers different from the Core API appXX servers.

| Region | BCF Host | Base URL |
|--------|----------|----------|
| US | open11.connect.trimble.com | https://open11.connect.trimble.com |
| EU | open21.connect.trimble.com | https://open21.connect.trimble.com |
| AP | open31.connect.trimble.com | https://open31.connect.trimble.com |
| AU | open32.connect.trimble.com | https://open32.connect.trimble.com |

## Supported BCF Versions

Try in order:
1. BCF 3.0: /bcf/3.0/projects/{projectId}/topics
2. BCF 2.1: /bcf/2.1/projects/{projectId}/topics
3. Without version: /projects/{projectId}/topics`,

  endpoints: `# BCF Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /bcf/{version}/projects/{id}/topics | List BCF topics |
| GET | /bcf/{version}/projects/{id}/topics/{topicId} | Get topic details |
| POST | /bcf/{version}/projects/{id}/topics | Create a topic |
| PUT | /bcf/{version}/projects/{id}/topics/{topicId} | Update a topic |
| DELETE | /bcf/{version}/projects/{id}/topics/{topicId} | Delete a topic |
| GET | /bcf/{version}/projects/{id}/topics/{topicId}/comments | Topic comments |
| POST | /bcf/{version}/projects/{id}/topics/{topicId}/comments | Add a comment |
| GET | /bcf/{version}/projects/{id}/topics/{topicId}/viewpoints | Topic viewpoints |
| POST | /bcf/{version}/projects/{id}/topics/{topicId}/viewpoints | Create a viewpoint |

**BCF Topic Structure:**
\`\`\`json
{
  "guid": "...",
  "title": "Clash between wall and duct",
  "description": "Detailed description",
  "creation_date": "2025-01-01T00:00:00Z",
  "modified_date": "2025-01-02T00:00:00Z",
  "creation_author": "user@email.com",
  "assigned_to": "other@email.com",
  "topic_status": "Open",
  "topic_type": "Issue",
  "priority": "High",
  "due_date": "2025-02-01T00:00:00Z",
  "labels": ["Architecture", "MEP"]
}
\`\`\`

**Official Swagger**: https://app.swaggerhub.com/apis/Trimble-Connect/topic/v2`,
};
