export const sdkDocs = {
  overview: `# Trimble Connect SDK (trimble-connect-sdk)

## Installation

\`\`\`bash
npm install trimble-connect-sdk --save
\`\`\`

## Overview

The \`trimble-connect-sdk\` npm package (v4.0.11) provides a JavaScript/TypeScript SDK for interacting with Trimble Connect services. It includes clients and utilities for:

- **TCPS (TCPSClient)** — Trimble Connect Project Service client for listing servers and projects
- **Organizer** — Manages trees/forests for organizing BIM data (LBS, WBS structures)
- **PSet (Property Set)** — Property set libraries, definitions, instances, and links
- **TIDCredentials** — OAuth credentials for Trimble Identity (TID)
- **ServiceCredentials** — Service-level credentials wrapping TIDCredentials

## Quick Start

\`\`\`typescript
import * as TC from "trimble-connect-sdk";

// 1. Set up TID credentials
const tidParams = {
  clientId: "your-client-id",
  clientSecret: "your-client-secret",
  appName: "your-app-name",
  redirectUri: "https://your-app.com/callback",
  serviceUri: "https://id.trimble.com/",
};
const tidCreds = new TC.TIDCredentials(tidParams);

// 2. Set tokens (obtained via OAuth flow)
tidCreds.tokens = {
  access_token: "...",
  expires_in: 3600,
  id_token: "...",
  refresh_token: "...",
  scope: "openid",
  token_type: "Bearer",
};

// 3. Create service credentials
const serviceCredentials = new TC.ServiceCredentials(tidCreds);

// 4. Configure TCPSClient
TC.TCPSClient.config.credentials = serviceCredentials;
TC.TCPSClient.config.serviceUri = "https://app.connect.trimble.com/tc/api/2.0/";

// 5. List servers and projects
const servers = await TC.TCPSClient.listServers();
const projects = await TC.TCPSClient.listProjects(servers[0]);
\`\`\`

npm: https://www.npmjs.com/package/trimble-connect-sdk`,

  credentials: `# Credentials — TIDCredentials & ServiceCredentials

## TIDCredentials

TIDCredentials handles OAuth authentication with Trimble Identity (TID).

\`\`\`typescript
import * as TC from "trimble-connect-sdk";

const tidParams = {
  clientId: "your-client-id",
  clientSecret: "your-client-secret",
  appName: "your-app-name",
  redirectUri: "https://your-app.com/callback",
  serviceUri: "https://id.trimble.com/",
};

const tidCreds = new TC.TIDCredentials(tidParams);

// Set tokens after completing the OAuth flow
tidCreds.tokens = {
  access_token: "eyJ...",
  expires_in: 3600,
  id_token: "eyJ...",
  refresh_token: "abc123...",
  scope: "openid",
  token_type: "Bearer",
};
\`\`\`

### TID Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| clientId | string | OAuth client ID registered in Trimble Developer Console |
| clientSecret | string | OAuth client secret |
| appName | string | Application name |
| redirectUri | string | OAuth redirect URI |
| serviceUri | string | Trimble Identity service URI (e.g. \`https://id.trimble.com/\`) |

### Token Object

| Field | Type | Description |
|-------|------|-------------|
| access_token | string | JWT access token |
| expires_in | number | Token lifetime in seconds |
| id_token | string | OpenID Connect ID token |
| refresh_token | string | Token used to obtain a new access token |
| scope | string | Granted scopes |
| token_type | string | Token type (typically "Bearer") |

## ServiceCredentials

ServiceCredentials wraps TIDCredentials for use with SDK clients (TCPSClient, Organizer, PSet).

\`\`\`typescript
const serviceCredentials = new TC.ServiceCredentials(tidCreds);
\`\`\`

ServiceCredentials is passed to all SDK clients as the \`credentials\` configuration property.`,

  tcpsClient: `# TCPSClient — Trimble Connect Project Service

TCPSClient provides methods to list available servers (regions) and projects from the Trimble Connect Project Service.

## Configuration

\`\`\`typescript
import * as TC from "trimble-connect-sdk";

TC.TCPSClient.config.credentials = serviceCredentials;
TC.TCPSClient.config.serviceUri = "https://app.connect.trimble.com/tc/api/2.0/";
\`\`\`

## List Servers

\`\`\`typescript
const servers = await TC.TCPSClient.listServers();
// Returns an array of available server/region objects
\`\`\`

## List Projects

\`\`\`typescript
const projects = await TC.TCPSClient.listProjects(servers[0]);
// Returns an array of projects for the given server/region
\`\`\`

## Region-Specific Service URIs

Use \`TCPS.regionToServiceUri()\` to get the correct service URI for a specific region and API:

\`\`\`typescript
const TCPS = TC.TCPSClient;

// Get the Organizer API URI for the EU West region
const orgServiceUri = await TCPS.regionToServiceUri('eu-west-1', 'orgApi');

// Get the PSet API URI for a region
const psetServiceUri = await TCPS.regionToServiceUri('eu-west-1', 'psetApi');
\`\`\`

### Available API Keys for regionToServiceUri

| API Key | Service |
|---------|---------|
| orgApi | Organizer API (trees/forests) |
| psetApi | Property Set API |

> The serviceUri for TCPSClient itself uses the Core API base URL (e.g. \`https://app.connect.trimble.com/tc/api/2.0/\`).`,

  organizer: `# Organizer — Trees and Forests

The Organizer client manages trees and forests for organizing BIM data. Trees represent hierarchical structures like LBS (Location Breakdown Structure) or WBS (Work Breakdown Structure).

## Setup

\`\`\`typescript
import * as TC from "trimble-connect-sdk";

const TCPS = TC.TCPSClient;
const orgServiceUri = await TCPS.regionToServiceUri('eu-west-1', 'orgApi');

const orgClient = new TC.Organizer({
  credentials: serviceCredentials,
  serviceUri: orgServiceUri,
});
\`\`\`

## Tree Operations

### Create a Tree

\`\`\`typescript
const tree = await orgClient.createTree(forestId, {
  name: "Location Breakdown",
  type: "LBS",
});
\`\`\`

### Get a Tree

\`\`\`typescript
const tree = await orgClient.getTree(forestId, treeId);

// Include deleted trees
const treeWithDeleted = await orgClient.getTree(forestId, treeId, { deleted: true });
\`\`\`

### Update a Tree

\`\`\`typescript
await orgClient.updateTree(forestId, treeId, {
  name: "Updated Location Breakdown",
});
\`\`\`

### Delete a Tree

\`\`\`typescript
await orgClient.deleteTree(forestId, treeId);
\`\`\`

## Tree Types

| Type | Description |
|------|-------------|
| LBS | Location Breakdown Structure |
| WBS | Work Breakdown Structure |

> The \`forestId\` typically corresponds to the Trimble Connect project ID.`,

  pset: `# PSet — Property Set Service SDK

The PSet client provides methods for managing property set libraries, definitions, instances, and links via the Property Set Service.

## Setup

\`\`\`typescript
import * as TC from "trimble-connect-sdk";

const TCPS = TC.TCPSClient;
const psetServiceUri = await TCPS.regionToServiceUri('eu-west-1', 'psetApi');

const psetClient = new TC.PSet({
  credentials: serviceCredentials,
  serviceUri: psetServiceUri,
});
\`\`\`

## Libraries

Libraries are containers for collections of property set definitions.

\`\`\`typescript
// Create a library
const library = await psetClient.createLibrary({ name: "My PSet Library", description: "..." });

// Get a library
const lib = await psetClient.getLibrary(libraryId);

// Update a library
await psetClient.updateLibrary(libraryId, { name: "Updated Library" });

// Delete a library
await psetClient.deleteLibrary(libraryId);

// List all libraries
const libraries = await psetClient.listLibraries();
\`\`\`

## Definitions

Definitions describe the schema/structure of a property set (name, description, data schema).

\`\`\`typescript
// Create a definition
const definition = await psetClient.createDefinition(libraryId, {
  name: "Wall Properties",
  description: "Custom wall property set",
  defs: [
    { name: "FireRating", dataType: "string" },
    { name: "LoadBearing", dataType: "boolean" },
  ],
});

// Get a definition
const def = await psetClient.getDefinition(libraryId, definitionId);

// Update a definition
await psetClient.updateDefinition(libraryId, definitionId, { name: "Updated Wall Properties" });

// Delete a definition
await psetClient.deleteDefinition(libraryId, definitionId);
\`\`\`

## Instances

Instances are property sets created from a definition, holding actual property values.

\`\`\`typescript
// Create an instance
const instance = await psetClient.createInstance(libraryId, definitionId, {
  props: [
    { name: "FireRating", val: "REI 120" },
    { name: "LoadBearing", val: true },
  ],
});

// Get an instance
const inst = await psetClient.getInstance(libraryId, definitionId, instanceId);

// Update an instance
await psetClient.updateInstance(libraryId, definitionId, instanceId, {
  props: [{ name: "FireRating", val: "REI 90" }],
});

// Delete an instance
await psetClient.deleteInstance(libraryId, definitionId, instanceId);
\`\`\`

## Links

Links associate property set instances with external resources (e.g., BIM model objects via FRN notation).

\`\`\`typescript
// Create a link
const link = await psetClient.createLink(libraryId, definitionId, instanceId, {
  target: "frn:entity:3CqVfw%24t15ihB2vPgB1wri",
});

// Get a link
const lnk = await psetClient.getLink(libraryId, definitionId, instanceId, linkId);

// Delete a link
await psetClient.deleteLink(libraryId, definitionId, instanceId, linkId);
\`\`\`

## Access Control

\`\`\`typescript
// Set access policy on a library
await psetClient.setPolicy(libraryId, {
  principals: [{ id: "user-id", role: "writer" }],
});

// Get access policy
const policy = await psetClient.getPolicy(libraryId);
\`\`\`

> Property sets are linked to model objects using FRN (Federated Resource Name) notation. The \`$\` character in IFC GUIDs must be URL-encoded as \`%24\`.`,
};
