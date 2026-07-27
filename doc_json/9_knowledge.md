# Knowledge

The Knowledge Service is designed to be used by AI agents to retrieve semantically relevant information for answering user queries. For information owners, it provides APIs to ingest documents, organize them into libraries, and manage access control.

## Capabilities Overview[​](#capabilities-overview "Direct link to Capabilities Overview")

### Library Management[​](#library-management "Direct link to Library Management")

* **Organize documents into libraries** - Top-level containers for organizing related documents

  <!-- -->

  * Control access to all documents in the library with access policies
  * Discover libraries you have access to by listing available libraries
  * Govern the metadata schema for documents within the library

### Document Management[​](#document-management "Direct link to Document Management")

* **Document-level metadata** - Rich metadata support for each document

  <!-- -->

  * Metadata schema is currently fixed and defined by the system namespace
  * Future: Additional configurable namespaces
  * Future: Document-level access control on retrieval

### Retrieval and Search[​](#retrieval-and-search "Direct link to Retrieval and Search")

* **Search for documents** across multiple libraries
* **Semantic (vector) search** - Find contextually relevant information
* **Full-text (keyword) search** - Traditional text-based search
* **Hybrid search** - Combining semantic and keyword search for best results
* **Ranked retrieval** - Get document chunks stored across multiple libraries ranked by relevance
* Future: Metadata-based filtering to reduce the search space

### Integration[​](#integration "Direct link to Integration")

* **Model Context Protocol (MCP)** - Discovery and retrieval functionality is exposed as MCP tools for seamless integration with AI agents
