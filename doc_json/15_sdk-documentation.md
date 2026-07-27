# Agentic Platform SDK for TypeScript Documentation

## 1. What is the SDK?[​](#1-what-is-the-sdk "Direct link to 1. What is the SDK?")

The Agentic Platform SDK for TypeScript is a comprehensive, type-safe library that provides seamless integration with Trimble's Agentic Platform services. Built specifically for TypeScript and JavaScript applications, this SDK abstracts the complexity of direct API interactions and provides a unified interface for accessing multiple AI-powered services.

The SDK enables developers to:

* **Create and manage AI agents** with custom configurations and behaviors
* **Build and maintain knowledge bases** with document management and semantic search capabilities
* **Access various AI models** for different use cases and requirements
* **Ingest and process data** into the platform for AI consumption
* **Handle authentication and authorization** seamlessly across all services
* **Benefit from full TypeScript support** with comprehensive type definitions and IntelliSense

Whether you're building chatbots, knowledge management systems, or AI-powered applications, this SDK provides the foundation for rapid development with enterprise-grade reliability and security.

## 2. How does it work?[​](#2-how-does-it-work "Direct link to 2. How does it work?")

The SDK follows a modular architecture where each service is encapsulated in its own client, all orchestrated through the main `AgenticPlatformSdk` class. This design provides clean separation of concerns while maintaining ease of use.

### Architecture Overview[​](#architecture-overview "Direct link to Architecture Overview")

```typescript
import {
  AgenticPlatformSdk,
  Environments,
  createAuthProvider,
} from '@trimble-agentic-external-npm-local/agentic-platform-sdk-ts';

const authProvider = createAuthProvider(async () => 'your-access-token');

const sdk = new AgenticPlatformSdk({
  environment: Environments.Development,
  authProvider,
});

// Access individual services
const agents = sdk.agents; // AgentsService - Create and manage AI agents
const knowledge = sdk.knowledge; // KnowledgeService - Manage documents and libraries
const models = sdk.models; // ModelsService - Access available AI models
const ingestion = sdk.ingestion; // IngestionService - Data ingestion and processing
const evals = sdk.evals; // EvalsService - Manage datasets, evaluators, and jobs

```

### Core Components[​](#core-components "Direct link to Core Components")

The SDK is built around several key components:

1. **Main SDK Class**: `AgenticPlatformSdk` - The primary entry point that initializes and provides access to all services
2. **Service Classes**: Each service (Agents, Knowledge, Models, Ingestion, Evals) has its own dedicated class
3. **API Clients**: Lower-level HTTP clients that handle the actual API communication
4. **HTTP Configuration**: Shared Axios configuration for authentication, retries, and request interceptors
5. **Type Definitions**: Comprehensive TypeScript interfaces for all requests, responses, and configurations

### Initialization Requirements[​](#initialization-requirements "Direct link to Initialization Requirements")

When you instantiate the `AgenticPlatformSdk`, you need to provide:

1. **Environment**: Specifies which deployment environment to connect to (`Development`, `Stage`, or `Production`)
2. **Auth Provider**: An object with authentication functions that provide and refresh JWT access tokens
3. **Timeout** (optional): Request timeout in milliseconds (defaults to 30 seconds)
4. **Retries** (optional): Number of retry attempts for transient failures (defaults to 3)
5. **Max Auth Retries** (optional): Maximum number of auth retries on 401 when `onUnauthorized` is provided
6. **Request Interceptor** (optional): Add or override headers per request

### 2.1. The Token Provider[​](#21-the-token-provider "Direct link to 2.1. The Token Provider")

The SDK uses a flexible token provider pattern for authentication, allowing you to implement custom token management strategies. Instead of passing a static token, you provide an asynchronous function that the SDK calls whenever it needs fresh authentication credentials.

#### Why Token Providers?[​](#why-token-providers "Direct link to Why Token Providers?")

* **Security**: Tokens can be refreshed automatically without exposing long-lived credentials
* **Flexibility**: Integrate with any authentication system (OAuth2, OIDC, custom auth)
* **Reliability**: Handle token expiration gracefully without manual intervention
* **Scalability**: Support different authentication strategies per environment

#### Basic Auth Provider[​](#basic-auth-provider "Direct link to Basic Auth Provider")

```typescript
import {
  AgenticPlatformSdk,
  Environments,
  createAuthProvider,
} from '@trimble-agentic-external-npm-local/agentic-platform-sdk-ts';

const getAccessToken = async (): Promise<string> => {
  // Simple static token (development only)
  return 'your-jwt-access-token';
};

const authProvider = createAuthProvider(getAccessToken);

const sdk = new AgenticPlatformSdk({
  environment: Environments.Development,
  authProvider,
});

```

#### Advanced Auth Provider with Refresh Logic[​](#advanced-auth-provider-with-refresh-logic "Direct link to Advanced Auth Provider with Refresh Logic")

```typescript
import { createAuthProvider } from '@trimble-agentic-external-npm-local/agentic-platform-sdk-ts';

class TokenManager {
  private token: string | null = null;
  private tokenExpiry: Date | null = null;

  async getAccessToken(): Promise<string> {
    // Check if token is still valid
    if (this.token && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.token;
    }

    // Refresh token from your auth service
    const response = await fetch('/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        /* auth credentials */
      }),
    });

    const { access_token, expires_in } = await response.json();

    this.token = access_token;
    this.tokenExpiry = new Date(Date.now() + expires_in * 1000);

    return this.token;
  }
}

const tokenManager = new TokenManager();
const authProvider = createAuthProvider(() => tokenManager.getAccessToken());

const sdk = new AgenticPlatformSdk({
  environment: Environments.Development,
  authProvider,
});

```

#### Integration with Trimble ID[​](#integration-with-trimble-id "Direct link to Integration with Trimble ID")

```typescript
import { TrimbleId } from '@trimble-oss/trimble-id';
import { createAuthProvider } from '@trimble-agentic-external-npm-local/agentic-platform-sdk-ts';

const trimbleId = new TrimbleId({
  clientId: 'your-client-id',
  redirectUri: 'your-redirect-uri',
});

const authProvider = createAuthProvider(async () => {
  const token = await trimbleId.getAccessToken();
  return token;
});

const sdk = new AgenticPlatformSdk({
  environment: Environments.Development,
  authProvider,
});

```

The SDK automatically adds the `Authorization: Bearer <token>` header to every API request.

#### Authentication Retry Mechanism[​](#authentication-retry-mechanism "Direct link to Authentication Retry Mechanism")

The SDK includes a flexible and automatic retry mechanism for handling 401 Unauthorized errors. This allows you to implement token refresh strategies that match your application's authentication architecture.

**How It Works:**

When a request receives a 401 (Unauthorized) response, the SDK can automatically retry the request with a fresh token if you provide an `onUnauthorized` callback. This callback gives you full control over how authentication failures are handled.

**Key Concepts:**

1. **`getAccessToken()`** - Called before each request to get the current token

2. **`onUnauthorized()`** (optional) - Called when a 401 error occurs, returns:

   <!-- -->

   * A **new token string** → SDK retries the request automatically
   * **`undefined` or `void`** → SDK propagates the error to your application
   * **Not provided** → SDK immediately propagates 401 errors (no retry)

**When to Use Auto-Retry (provide `onUnauthorized`):**

* ✅ **Server-side applications** with refresh tokens
* ✅ **Long-running services** that need automatic token refresh
* ✅ **Background jobs** where user interaction isn't possible
* ✅ **OAuth 2.0 flows** with automatic refresh token support

**When NOT to Use Auto-Retry (omit `onUnauthorized`):**

* ✅ **Browser applications** requiring user interaction (OAuth redirect to Trimble ID)
* ✅ **Single-page apps** that need to show a login UI on token expiration
* ✅ **Public APIs** where re-authentication requires user action

**Benefits:**

* **Flexible**: Works with both server-side and browser-based authentication flows
* **Safe Guards**: Built-in protections against infinite retry loops with configurable `maxAuthRetries`
* **User Control**: Return `undefined` from `onUnauthorized` to handle auth failures in your UI layer
* **Seamless Recovery**: Automatically handles token expiration for server-side apps

***

### Authentication Examples[​](#authentication-examples "Direct link to Authentication Examples")

See [Authentication Examples](/docs/build/sdk/examples/authentication.md) for full snippets.

***

### Configuration Options[​](#configuration-options "Direct link to Configuration Options")

You can customize the authentication retry behavior:

```typescript
import {
  AgenticPlatformSdk,
  Environments,
  createAuthProvider,
} from '@trimble-agentic-external-npm-local/agentic-platform-sdk-ts';

const authProvider = createAuthProvider(
  () => getAccessToken(),
  () => refreshToken()
);

const sdk = new AgenticPlatformSdk({
  environment: Environments.Development,
  authProvider,
  timeoutInMs: 30000,
  maxAuthRetries: 2, // Allow up to 2 retry attempts (default: 1)
});

```

**Options:**

* **`maxAuthRetries`**: Maximum number of times to retry on 401 errors (default: `1`)
* Set to `0` to disable retries even when `onUnauthorized` is provided

This flexible authentication mechanism ensures your application can handle token expiration gracefully, whether you're building server-side services or browser-based applications.

### 2.2. Technologies Used Under the Hood[​](#22-technologies-used-under-the-hood "Direct link to 2.2. Technologies Used Under the Hood")

The SDK leverages proven, enterprise-grade technologies to ensure reliability, performance, and developer experience:

#### Core Dependencies[​](#core-dependencies "Direct link to Core Dependencies")

* **[Axios](https://axios-http.com/)** (v1.12.2): HTTP client library for making API requests

  * Automatic request/response interceptors for authentication
  * Built-in timeout handling and retry logic with exponential backoff
  * Optional automatic retry on 401 errors via `onUnauthorized` callback (configurable via `maxAuthRetries`)
  * Automatic retry on network errors, 429 rate limits, and 5xx server errors
  * Request and response transformation
  * Comprehensive error handling with custom `HttpError` types

* **[Zod](https://zod.dev/)** (v4.1.12): TypeScript-first schema validation library

  * Runtime validation of API responses
  * Type-safe error handling and validation
  * Ensures data integrity and type safety at runtime

* **[@ag-ui/client](https://www.npmjs.com/package/@ag-ui/client)** (v0.0.43): Agent–User Interaction Protocol client

  * Open, lightweight, event-based protocol for AI agent-to-UI communication
  * Standardizes agent state, UI intents, and user interaction flows
  * Enables reliable, debuggable, user-friendly agentic features
  * Simplifies integration between agent runtime and frontend applications

* **[axios-retry](https://github.com/softonic/axios-retry)** (v4.5.0): Retry middleware for Axios

  * Retries transient failures with exponential backoff
  * Covers network errors, rate limits (429), and 5xx responses

#### Development & Build Tools[​](#development--build-tools "Direct link to Development & Build Tools")

* **[TypeScript](https://www.typescriptlang.org/)** (v5.9.3): Primary development language

  * Full type safety and IntelliSense support
  * Compile-time error checking
  * Advanced type inference and generics

* **[Rollup](https://rollupjs.org/)** (v4.52.5): Module bundler for building the SDK

  * Tree-shaking for optimal bundle size
  * Multiple output formats (ESM, CJS, UMD)
  * TypeScript declaration file generation

* **[Vitest](https://vitest.dev/)** (v4.0.3): Testing framework

  * Fast unit and integration testing
  * Contract testing against live APIs
  * Coverage reporting and test watching

#### Quality Assurance Tools[​](#quality-assurance-tools "Direct link to Quality Assurance Tools")

* **[ESLint](https://eslint.org/)** (v9.38.0): Code linting and style enforcement
* **[Prettier](https://prettier.io/)** (v3.4.2): Code formatting
* **[Lefthook](https://github.com/evilmartians/lefthook)** (v2.0.1): Git hooks management
* **[CSpell](https://cspell.org/)** (v9.2.2): Spell checking for code and documentation

#### Runtime Requirements[​](#runtime-requirements "Direct link to Runtime Requirements")

* **Node.js**: >=20.19.5
* **npm**: >=10.0.0

The SDK is designed to work in both Node.js and browser environments, with appropriate polyfills and configurations for each platform.

## 3. What are the capabilities?[​](#3-what-are-the-capabilities "Direct link to 3. What are the capabilities?")

The SDK provides comprehensive access to five core services, each designed to handle specific aspects of the Agentic Platform ecosystem:

### 3.1. Agents Service (`sdk.agents`)[​](#31-agents-service-sdkagents "Direct link to 31-agents-service-sdkagents")

The Agents Service enables you to create, configure, and manage AI agents with sophisticated capabilities.

**Core Features:**

* **Agent Lifecycle Management**: Create, read, update, and delete agents
* **Configuration Management**: Set system prompts, model preferences, and behavior parameters
* **Execution Management**: Run agent conversations and track execution history
* **Thread Management**: Manage conversation threads and context

**Key Methods:**

* `list(params?)` - List all accessible agents with filtering and pagination
* `get(agentId, params?)` - Retrieve a specific agent configuration
* `create(request, params?)` - Create a new agent with custom configuration
* `update(agentId, request, params?)` - Update agent settings and behavior
* `delete(agentId, params?)` - Remove an agent (soft or hard delete)
* `searchAgents(search, params?)` - Full-text search for agents by name/description with relevance scoring
* `searchThreads(search, params?)` - Full-text search for threads by title/content with relevance scoring

**Additional Methods:**

* `run(agentId, request)` - Execute an agent run and return the final result
* `stream(agentId, request, subscriber)` - Execute a run and handle streaming AG UI events
* `autocomplete(search, params?)` - Fast autocomplete search for agents (optimized for search-as-you-type)
* `listThreads(params?)` - List threads across agents
* `listRuns(threadId, params?)` - List runs within a thread

### 3.2. Knowledge Service (`sdk.knowledge`)[​](#32-knowledge-service-sdkknowledge "Direct link to 32-knowledge-service-sdkknowledge")

The Knowledge Service provides comprehensive document and knowledge base management capabilities.

**Core Features:**

* **Document Management**: Upload, organize, and manage documents
* **Library Organization**: Create and maintain knowledge libraries
* **Chunk Processing**: Handle document chunking and semantic indexing
* **Search and Retrieval**: Query knowledge bases with semantic search

**Key Methods:**

* `listLibraries(params?)` - List knowledge libraries
* `createLibrary(request, params?)` - Create a new library
* `getLibrary(libraryId, params?)` - Get library details
* `updateLibrary(libraryId, request, params?)` - Update library metadata
* `deleteLibrary(libraryId, params?)` - Delete a library
* `listDocuments(libraryId, params?)` - List documents in a library
* `createDocument(libraryId, request, params?)` - Create a document
* `getDocument(libraryId, documentId, params?)` - Retrieve document details
* `updateDocument(libraryId, documentId, request, params?)` - Update document metadata
* `deleteDocument(libraryId, documentId, params?)` - Remove a document
* `createStagingGeneration(libraryId, documentId, request)` - Create a staging generation
* `publishStagingGeneration(libraryId, documentId, generationId)` - Publish a staging generation
* `bulkUploadChunks(libraryId, documentId, generationId, chunks)` - Upload chunks in bulk
* `searchResources(params)` - Search for knowledge resources with advanced filtering and highlights

### 3.3. Models Service (`sdk.models`)[​](#33-models-service-sdkmodels "Direct link to 33-models-service-sdkmodels")

The Models Service provides access to available AI models and their configurations.

**Core Features:**

* **Model Discovery**: Browse available AI models and their capabilities
* **Model Filtering**: Filter models by provider, status, and capabilities
* **Pagination Support**: Efficiently navigate large model catalogs
* **Model Metadata**: Access detailed information about model specifications

**Key Methods:**

* `list(params?)` - List available models with advanced filtering options

  <!-- -->

  * Filter by status, provider, or search terms
  * Paginated results with next/prev navigation
  * Support for FIQL (Feed Item Query Language) queries

### 3.4. Ingestion Service (`sdk.ingestion`)[​](#34-ingestion-service-sdkingestion "Direct link to 34-ingestion-service-sdkingestion")

The Ingestion Service handles data processing and ingestion workflows.

**Core Features:**

* **Job Management**: Create and monitor data ingestion jobs
* **Batch Processing**: Handle large-scale data ingestion operations
* **Status Tracking**: Monitor job progress and completion status
* **Error Handling**: Comprehensive error reporting and recovery

**Key Methods:**

* Job creation and management
* Status monitoring and progress tracking
* Batch operation support

### 3.5. Evals Service (`sdk.evals`)[​](#35-evals-service-sdkevals "Direct link to 35-evals-service-sdkevals")

The Evals Service manages evaluation datasets, evaluators, and jobs for testing agent and retrieval performance.

**Core Features:**

* **Dataset Management**: Create and manage datasets and records
* **Evaluator Management**: Create and configure evaluators
* **Job Management**: Run evaluations and inspect results

**Dataset Operations:**

* `listDatasets(params?)` - List all accessible datasets with pagination
* `createDataset(request, params?)` - Create a new dataset collection
* `getDataset(datasetId, params?)` - Retrieve dataset metadata
* `updateDataset(datasetId, request, params?)` - Update dataset configuration
* `deleteDataset(datasetId)` - Delete a dataset and all associated records

**Record Operations:**

* `listRecords(datasetId, params?)` - List records in a dataset with filtering
* `addRecords(datasetId, request)` - Add one or more records to a dataset
* `getRecord(datasetId, recordId, params?)` - Retrieve a specific record
* `updateRecord(datasetId, recordId, request, params?)` - Update record content
* `deleteRecord(datasetId, recordId)` - Delete a record from a dataset

**Evaluator Operations:**

* `listEvaluators(params?)` - List system and user-owned evaluators
* `createEvaluator(request, params?)` - Create a new user-owned evaluator
* `getEvaluator(evaluatorId, params?)` - Get evaluator configuration
* `updateEvaluator(evaluatorId, request, params?)` - Update evaluator (user-owned only)
* `deleteEvaluator(evaluatorId)` - Delete evaluator (user-owned only)

**Job Operations:**

* `listJobs(params?)` - List evaluation and generation jobs with filtering
* `createJob(request)` - Create a new evaluation or generation job
* `getJob(jobId, params?)` - Get job status and summary
* `getJobResults(jobId, params?)` - Retrieve detailed job results

**Record Evaluation Operations:**

* `listRecordEvaluations(datasetId, recordId, params?)` - List all evaluations for a record
* `submitRecordEvaluation(datasetId, recordId, request)` - Submit a new evaluation
* `getRecordEvaluation(datasetId, recordId, evaluationId, params?)` - Get evaluation details
* `deleteRecordEvaluation(datasetId, recordId, evaluationId)` - Delete an evaluation

## 4. Examples[​](#4-examples "Direct link to 4. Examples")

Examples have been moved into the Examples section:

* [Service Examples](/docs/build/sdk/examples/service-examples.md)
* [Authentication Examples](/docs/build/sdk/examples/authentication.md)
* [Error Handling](/docs/build/sdk/examples/error-handling.md)

## 5. API Documentation[​](#5-api-documentation "Direct link to 5. API Documentation")

For detailed information about API endpoints, request/response schemas, authentication requirements, and error codes, please refer to the official OpenAPI specifications for each service:

### Service API Specifications[​](#service-api-specifications "Direct link to Service API Specifications")

#### Agents Service[​](#agents-service "Direct link to Agents Service")

* **OpenAPI Spec**: <https://agents.dev.trimble-ai.com/openapi.json>

* **Environment URLs**:

  <!-- -->

  * Development: `https://agents.dev.trimble-ai.com/`
  * Stage: `https://agents.stage.trimble-ai.com/`
  * Production: `https://agents.ai.trimble.com/`

#### Knowledge Service[​](#knowledge-service "Direct link to Knowledge Service")

* **OpenAPI Spec**: <https://kb.dev.trimble-ai.com/openapi.json>

* **Environment URLs**:

  <!-- -->

  * Development: `https://kb.dev.trimble-ai.com/`
  * Stage: `https://kb.stage.trimble-ai.com/`
  * Production: `https://kb.ai.trimble.com/`

#### Models Service[​](#models-service "Direct link to Models Service")

* **OpenAPI Spec**: <https://models-api.dev.trimble-ai.com/openapi.json>

* **Environment URLs**:

  <!-- -->

  * Development: `https://models-api.dev.trimble-ai.com/`
  * Stage: `https://models-api.stage.trimble-ai.com/`
  * Production: `https://models-api.ai.trimble.com/`

#### Ingestion Service[​](#ingestion-service "Direct link to Ingestion Service")

* **OpenAPI Spec**: <https://ingest.dev.trimble-ai.com/openapi.json>

* **Environment URLs**:

  <!-- -->

  * Development: `https://ingest.dev.trimble-ai.com/`
  * Stage: `https://ingest.stage.trimble-ai.com/`
  * Production: `https://ingest.ai.trimble.com/`

#### Evals Service[​](#evals-service "Direct link to Evals Service")

* **OpenAPI Spec**: <https://evals.dev.trimble-ai.com/openapi.json>

* **Environment URLs**:

  <!-- -->

  * Development: `https://evals.dev.trimble-ai.com/`
  * Stage: `https://evals.stage.trimble-ai.com/`
  * Production: `https://evals.ai.trimble.com/`

### Using the API Specifications[​](#using-the-api-specifications "Direct link to Using the API Specifications")

The OpenAPI specifications provide:

* **Complete endpoint documentation** with request/response examples
* **Schema definitions** for all data types and models
* **Authentication requirements** and security schemes
* **Error response formats** and status codes
* **Interactive API explorers** for testing endpoints

### SDK Implementation Notes[​](#sdk-implementation-notes "Direct link to SDK Implementation Notes")

The SDK implementations are validated against these API specifications through comprehensive contract tests. All request/response types in the SDK match the OpenAPI schema definitions exactly, ensuring type safety and API compatibility.

## 6. Authors and Maintainers[​](#6-authors-and-maintainers "Direct link to 6. Authors and Maintainers")

### Development Team[​](#development-team "Direct link to Development Team")

This SDK is developed and maintained by **Trimble's Agentic Platform Team**

### Key Contributors[​](#key-contributors "Direct link to Key Contributors")

* **Johan Nyberg** (<johan.nyberg@trimble.com>)
* **Sami Raboun** (<sami_raboun@trimble.com>)
* **Pieter Dhondt** (<pieter_dhondt@trimble.com>)
