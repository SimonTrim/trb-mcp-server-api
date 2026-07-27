# Agents

The Agent Service is part of Trimble AI Agentic Platform, providing comprehensive capabilities to manage and interact with AI agents.

## Core Capabilities[​](#core-capabilities "Direct link to Core Capabilities")

### Agent Management[​](#agent-management "Direct link to Agent Management")

* **Create and manage AI agents** with flexible configuration options

  <!-- -->

  * Support for external and internally stored icons (automatically normalized to 256x256 center-cropped square WebP format)
  * Flexible LLM configuration
  * Configuration change tracking via agent versioning
  * Multi-language support through translation tables

### Agent Workflows[​](#agent-workflows "Direct link to Agent Workflows")

* **RAG (Retrieval-Augmented Generation) workflow** with one or multiple Knowledge Base libraries connected
* **Agentic workflows** with tools usage
* Configurable retrieval query rewriting for improved search results
* Context-aware information retrieval with relevance scoring

### Tools Support[​](#tools-support "Direct link to Tools Support")

The platform provides multiple ways for agents to interact with external systems:

* **[MCP (Model Context Protocol)](https://modelcontextprotocol.io/)** tools over HTTP streamable transport with TID authentication

* **Client-side tool calls** for local execution

* **Built-in tools** including:

  <!-- -->

  * `datetime` - Makes agents aware of current date and time
  * `myprofile` - Provides user identity, contact information, and organizational context
  * `tekla_help` - Searches [Tekla User Assistance](https://support.tekla.com/) for product help and support articles
  * `trimble_help` - Searches [Trimble Help](https://help.trimble.com/) for product help and support articles
  * `user_directory` - Provides access to organization/account user directory with identity and contact information
  * `web_search` - Enables web searches with results including title, URL, and snippets

### Chat & Conversation Management[​](#chat--conversation-management "Direct link to Chat & Conversation Management")

* **Chat with AI agents** via [AG UI](https://docs.ag-ui.com/introduction) protocol

* **Conversation history** with privacy and access controls:

  <!-- -->

  * Personal conversation history accessible only by the creator
  * Access revoked if creator loses agent access (e.g., license revocation)
  * Automatic or custom thread titles
  * Thread renaming and deletion by creator
  * Automatic deletion of inactive threads after 2 years
  * Immediate and permanent deletion when agent is hard-deleted

### File Handling[​](#file-handling "Direct link to File Handling")

* **Files in thread context** - Agents can support user file uploads in the context of a conversation thread (capability: `filesInThreadContext`)

### Access Control[​](#access-control "Direct link to Access Control")

* **Role-based access control (RBAC)** with three roles:

  <!-- -->

  * `AgentCreator` - System-wide role for creating new agents (Trimble employees only)
  * `Admin` - Agent-scoped role for configuration, deletion, and permission management
  * `User` - Agent-scoped role for interacting with agents

* **Subject-based permissions** supporting:

  <!-- -->

  * TID users, applications, and billing accounts
  * License-based access controls
  * User groups and roles
  * Special claims for Trimble employees and automation accounts

### Usage & Quota Management[​](#usage--quota-management "Direct link to Usage & Quota Management")

* **Usage Quota Enforcement** per user per agent with:

  <!-- -->

  * Configurable run limits (maximum number of agent runs)
  * Configurable token limits (input + output tokens)
  * Flexible tracking periods with sliding window approach
  * Exclude lists for exempting specific users/applications
  * Real-time usage monitoring and statistics

### Localization[​](#localization "Direct link to Localization")

* **Multi-language support** through translation tables
* Support for localizing agent names, descriptions, sample prompts, and UI placeholders
* Content negotiation via `Accept-Language` header
* Case-insensitive language tag matching

## Coming Soon[​](#coming-soon "Direct link to Coming Soon")

The following capabilities are planned for future releases:

* **Image analysis and generation**
* **Voice interactions** in addition to text interactions

## Agent Capabilities Configuration[​](#agent-capabilities-configuration "Direct link to Agent Capabilities Configuration")

Individual agents can be configured with specific capabilities:

| Capability             | Type    | Description                                                                 | Default |
| ---------------------- | ------- | --------------------------------------------------------------------------- | ------- |
| `filesInThreadContext` | boolean | Indicates that the agent supports user files uploaded in the thread context | `false` |

## Additional Features[​](#additional-features "Direct link to Additional Features")

### Data Management[​](#data-management "Direct link to Data Management")

* **Soft and hard delete** options for agents
* **Automatic data retention** policies (2-year retention for inactive threads)
* **Eventually consistent** API responses with caching

### Integration & API[​](#integration--api "Direct link to Integration & API")

* **OAuth 2.0 protection** with TID token requirements
* **Cross-Origin Resource Sharing (CORS)** support
* **Payload compression** (gzip and br)
* **Server-Sent Events (SSE)** for streaming responses
* **Cursor-based pagination** for efficient data retrieval
* **Comprehensive error handling** with RFC 9457 compliant error responses

### Context & Customization[​](#context--customization "Direct link to Context & Customization")

* **Context variables** for passing structured information to agents
* **Format string syntax** for dynamic placeholder substitution in system prompts
* **Token placeholder support** for secure authentication in tool calls
* **Configurable short-memory size** for conversation history

## API Scopes[​](#api-scopes "Direct link to API Scopes")

To use the Agent Service API, the following TID token scopes are required:

* `openid` - Get user identity
* `agents` - Use Agent Service
