# Quickstart

This guide will walk you through creating your first AI agent using Trimble Studio. You'll learn how to create a knowledge library, add documents, build an agent, and use it through Trimble Assist.

## Prerequisites[​](#prerequisites "Direct link to Prerequisites")

* A Trimble ID account with access to the Agentic AI Platform
* Access to Trimble Studio and Trimble Assist applications

## Step 1: Launch Trimble Studio[​](#step-1-launch-trimble-studio "Direct link to Step 1: Launch Trimble Studio")

1. Navigate to [**Trimble Studio**](https://studio.ai.trimble.com/) in your browser or application launcher
2. Sign in with your Trimble ID credentials
3. You'll see the Studio dashboard with navigation options on the left sidebar

## Step 2: Create a Knowledge Library[​](#step-2-create-a-knowledge-library "Direct link to Step 2: Create a Knowledge Library")

Knowledge libraries store documents that your agents can reference to answer questions.

1. In the left sidebar, click on **Knowledge** (folder icon)

2. You'll see the "Knowledge Libraries" page with a list of existing libraries

3. Click the blue **"Create Library"** button in the top right

4. Fill in the library details:

   <!-- -->

   * **Library Name** (required): Enter a descriptive name, e.g., "Product Documentation"

   * **Library Description**: Add a brief description of what this library contains

   * **Users Visibility**: Choose between:

     <!-- -->

     * **Private**: Only you can access this library
     * **Public**: Other users in your organization can access it

5. Click **"Save"** to create the library

## Step 3: Add Documents to Your Library[​](#step-3-add-documents-to-your-library "Direct link to Step 3: Add Documents to Your Library")

Once your library is created, you can add documents that your agent will use as a knowledge source.

1. In your knowledge library details page, you'll see two tabs: **"Ingestion Jobs"** and **"Documents"**

2. Click the **"Upload Documents"** button

3. You can upload documents in two ways:

   <!-- -->

   * **Upload from your computer**: Select files from your local machine
   * **Import from URL**: Provide a URL to download and ingest the document

4. Supported file formats include:

   <!-- -->

   * PDF documents
   * Microsoft Office files (Word, Excel, PowerPoint)
   * Text files, Markdown, and code files
   * And many more formats

5. After uploading, the documents will be processed automatically:

   <!-- -->

   * The system will parse the document content
   * Break it into semantically meaningful chunks
   * Index it for retrieval

6. Monitor the ingestion status in the **"Ingestion Jobs"** tab

7. Once processing is complete, view your documents in the **"Documents"** tab

**Note**: If a document shows a "FAILED" status, check the error details and try re-uploading or contact support.

## Step 4: Create Your First Agent[​](#step-4-create-your-first-agent "Direct link to Step 4: Create Your First Agent")

Now that you have a knowledge library, let's create an AI agent that can use it.

1. In the left sidebar, click on **"Agent Builder"** (wrench icon)

2. You'll see the Agent Builder interface with a configuration panel on the left and a live preview on the right

3. Fill in the **General** section:

   <!-- -->

   * **Agent Name** (required): Give your agent a name, e.g., "Product Help Assistant"
   * **Description** (required): Describe what your agent does
   * **Instructions** (required): Provide system instructions that define the agent's behavior and personality
     <!-- -->
     * Example: "You are a helpful and knowledgeable assistant that provides concise, accurate answers about our company's products. Always use a friendly, professional tone."
   * **Avatar**: Optionally upload an avatar image for your agent
   * **Visibility**: Toggle between Private and Public visibility

4. Configure **Models**:

   <!-- -->

   * Click on the "Models" section to expand it
   * Select which AI models your agent can use (e.g., GPT-4o, Claude, Gemini)
   * The agent will use these models to generate responses

5. Connect **Knowledge Libraries**:

   <!-- -->

   * Click on the "Knowledge Libraries" section
   * Select the knowledge library you created in Step 2
   * This enables your agent to retrieve information from your documents

6. (Optional) Add **Conversation Starters**:

   <!-- -->

   * Provide sample prompts to help users get started
   * Example: "What products do you offer?" or "How do I get started?"

7. (Optional) Configure **Tools**:

   <!-- -->

   * Add MCP (Model Context Protocol) tools or local tools
   * These allow your agent to perform actions beyond just answering questions

8. (Optional) Set **Quota** limits:
   <!-- -->
   * Define usage limits for your agent to control costs

9. Click **"Save"** to create your agent

10. Once saved, the live preview on the right will activate, allowing you to test your agent

## Step 5: Launch Trimble Assist[​](#step-5-launch-trimble-assist "Direct link to Step 5: Launch Trimble Assist")

Now that your agent is created, you can use it through Trimble Assist, the conversational UI for end users.

1. Navigate to [**Trimble Assist**](https://assist.ai.trimble.com/) in your browser or application

2. Sign in with your Trimble ID

3. You'll see the Assist interface with your available agents

4. Select the agent you just created

5. Start chatting! The agent will:

   <!-- -->

   * Use the knowledge from your library to answer questions
   * Follow the instructions you provided
   * Provide helpful, context-aware responses
