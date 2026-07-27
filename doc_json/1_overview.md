# Overview

The Agentic AI Platform provides a comprehensive architecture for building, deploying, and managing AI agents at production scale. The platform is divided into two main sections: **Frontend** (user-facing applications and development tools) and **Backend** (core services, AI models, and data management).

![Agentic AI Platform Architecture](/assets/images/image-5903ff207e95c2dc998abe37fd1dbfbf.png)

## Frontend Components[​](#frontend-components "Direct link to Frontend Components")

### User Applications[​](#user-applications "Direct link to User Applications")

* **Trimble Identity**: Authentication and identity management service that provides secure access to platform components.

* **Trimble Agent Studio**: The development environment where agents are created, optimized, and tested. This is the primary tool for developers building AI agents.

* **Trimble Assist**: An embeddable conversational UI where end users interact with agents. This provides the user-facing interface for agent interactions.

### Development Stack[​](#development-stack "Direct link to Development Stack")

* **Agentic AI Component Library**: A reusable component library built on top of the platform SDK, providing pre-built UI components for agent interactions.

* **Modus 2.0 Design System**: Trimble's design system that provides consistent styling and components, integrated with the Agentic AI Component Library.

* **Agentic AI Platform SDK**: The core SDK that enables integration with the platform's backend services.

* **AG-UI**: The user interface layer that connects the frontend applications to the backend Agent Service.

## Core Services[​](#core-services "Direct link to Core Services")

### Agent Service[​](#agent-service "Direct link to Agent Service")

The **Agent Service** is the core orchestration layer that handles production-scale agent execution with enterprise security. It leverages:

* **A2A** (Agent-to-Agent): Enables agents to communicate and collaborate with each other.
* **LangGraph**: Provides the execution framework for agent workflows and decision-making.

The Agent Service communicates with tools via **MCP** (Model Context Protocol):

### Model gateway[​](#model-gateway "Direct link to Model gateway")

An AI model gateway service that provides secure access to multiple AI models with responsible AI practices:

* **Safety Filters**: Ensures all model interactions meet safety and compliance requirements.

* **AI Models**: Supports multiple model providers including:

  <!-- -->

  * Gemini (Google)
  * OpenAI
  * Claude (Anthropic)
  * Meta

### Knowledge Service[​](#knowledge-service "Direct link to Knowledge Service")

A knowledge storage and retrieval service for AI-powered applications:

* **Access Control**: Manages permissions and security for knowledge base access.
* **Data**: Stores and manages documents, databases, and other knowledge sources that agents can query.

### Ingestion Service[​](#ingestion-service "Direct link to Ingestion Service")

A document processing and ingestion service that prepares content for the Knowledge Service:

* **Document Processing**: Automatically parses and processes documents from various formats including PDF, Word, Excel, PowerPoint, text files, and code files.
* **Intelligent Chunking**: Breaks down documents into semantically meaningful chunks optimized for retrieval.
* **Job Management**: Provides asynchronous job processing with status monitoring for ingestion workflows.
* **Format Support**: Handles complex documents using Document Intelligence and plain text parsing for code and configuration files.

### Tools Service[​](#tools-service "Direct link to Tools Service")

A tools gateway service that enables agents to call external tools and APIs:

* **Access Control**: Manages authentication and authorization for tool access.
* **APIs / MCP**: Provides integration with external APIs and Model Control Plane endpoints, allowing agents to interact with external systems and services.

## Architecture Flow[​](#architecture-flow "Direct link to Architecture Flow")

The platform follows a clear data flow:

1. **Development**: Developers use **Trimble Agent Studio** to build and test agents, leveraging the component library and SDK.

2. **User Interaction**: End users interact with agents through **Trimble Assist**, which provides a conversational interface.

3. **Agent Execution**: User requests flow through **AG-UI** to the **Agent Service**, which orchestrates agent workflows.

4. **Service Integration**: The Agent Service coordinates with:

   * **Model gateway** for AI model inference (with safety filters)
   * **Knowledge Service** for retrieving relevant information
   * **Ingestion Service** for processing and ingesting documents into knowledge bases
   * **Tools Service** for executing external actions and API calls

5. **Response**: Results flow back through the same path to provide users with intelligent, context-aware responses.

This architecture ensures scalability, security, and flexibility while maintaining responsible AI practices throughout the platform.
