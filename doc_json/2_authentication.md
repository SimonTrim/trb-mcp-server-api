# Authentication

All APIs and applications on the Trimble Agentic AI Platform are protected using **Trimble Identity**.

## Getting Started[​](#getting-started "Direct link to Getting Started")

### Create a Trimble ID Account[​](#create-a-trimble-id-account "Direct link to Create a Trimble ID Account")

To access the platform's apps and APIs, you need a Trimble ID account.

👉 [Get started with Trimble ID](https://help.trimble.com/en/trimble-account-services/trimble-account-services/sign-in-and-profile/getting-started-with-trimble-id)

### Generate Access Tokens[​](#generate-access-tokens "Direct link to Generate Access Tokens")

Once you have a Trimble ID account, learn how to generate OAuth 2.0 tokens to authenticate your API requests.

👉 [Trimble Identity Documentation](https://docs.trimblecloud.com/trimble-identity/)

## Understanding OAuth Scopes[​](#understanding-oauth-scopes "Direct link to Understanding OAuth Scopes")

OAuth scopes define the specific permissions your application needs to access different parts of the Agentic AI Platform. When generating access tokens, you must request the appropriate scopes for the APIs you intend to use.

### Available Scopes by Service[​](#available-scopes-by-service "Direct link to Available Scopes by Service")

Each service in the Agentic AI Platform requires specific scopes:

#### Common Scopes[​](#common-scopes "Direct link to Common Scopes")

* **`openid`** - Required for all services. Provides user identity information and is necessary for OAuth 2.0 authentication.

#### Agent Service[​](#agent-service "Direct link to Agent Service")

* **`agents`** - Required to use the Agent Service API. Allows you to:

  <!-- -->

  * Create and manage AI agents
  * Interact with agents
  * Manage agent configurations

**Example**: To create or list agents, your token must include both `openid` and `agents` scopes.

#### Model Control Plane API[​](#model-control-plane-api "Direct link to Model Control Plane API")

* **`models`** - Required to access model management endpoints. Allows you to:

  * List available AI models
  * Get model details and configurations
  * Check model health status
  * Access model gateway connectivity

* **`profile`** - Optional. Provides access to user profile information.

**Example**: To query available models or check model health, your token must include `openid` and `models` scopes.

#### Knowledge Service[​](#knowledge-service "Direct link to Knowledge Service")

* **`kb`** - Required to use the Knowledge Base Service. Allows you to:

  <!-- -->

  * Create and manage knowledge base libraries
  * Query documents and retrieve semantic search results
  * Manage access control policies
  * Organize documents into libraries

**Example**: To search a knowledge base or create a library, your token must include `openid` and `kb` scopes.

#### Ingestion Service[​](#ingestion-service "Direct link to Ingestion Service")

* **`kb-ingest`** - Required to ingest documents into the Knowledge Service. Allows you to:

  <!-- -->

  * Create ingestion jobs
  * Upload documents to knowledge bases
  * Monitor ingestion job status
  * List ingestion jobs

**Note**: Your application must be subscribed to the Ingestion Service API product in the [Trimble Cloud Console](https://console.trimble.com/) to use this scope.

**Example**: To ingest a document into a knowledge base, your token must include `openid` and `kb-ingest` scopes.

### Requesting Multiple Scopes[​](#requesting-multiple-scopes "Direct link to Requesting Multiple Scopes")

If your application needs to interact with multiple services, you can request multiple scopes in a single token request. For example:

* To use both Agent Service and Knowledge Service: request `openid`, `agents`, and `kb`
* To ingest documents and query knowledge bases: request `openid`, `kb-ingest`, and `kb`
* For full platform access: request `openid`, `agents`, `models`, `kb`, and `kb-ingest`

### Common Issues and Solutions[​](#common-issues-and-solutions "Direct link to Common Issues and Solutions")

**Issue**: API returns `401 Unauthorized` even with a valid token

* **Solution**: Verify that your token includes all required scopes for the API you're calling. Check the API documentation for required scopes.

**Issue**: Some API endpoints work, but others fail with `403 Forbidden`

* **Solution**: Different endpoints may require different scopes. Ensure your token includes scopes for all endpoints you're using.

**Issue**: Token works in one environment but not another

* **Solution**: Verify that the same scopes are requested in both environments. Scope requirements are consistent across environments.

### Best Practices[​](#best-practices "Direct link to Best Practices")

1. **Request Only What You Need**: Only request scopes that your application actually uses. This improves security and reduces token size.

2. **Document Your Scope Requirements**: Keep track of which scopes your application needs for each feature or API endpoint.

3. **Test Scope Validation**: During development, test your application with tokens that have missing scopes to ensure proper error handling.

4. **Monitor Token Usage**: Regularly review which scopes are included in your tokens to ensure they align with your application's needs.
