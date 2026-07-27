# Iframe Communication Flow

This document illustrates the communication flow between the **Parent Frame (Host Application)** and the **Child Frame (Trimble Assist)** using the `postMessage` API.

The SDK enables bi-directional communication between a host application and an embedded Trimble Assist iframe. Communication is achieved through the browser's `window.postMessage()` API with structured request/response patterns.

## Sequence Diagram[​](#sequence-diagram "Direct link to Sequence Diagram")

<!-- -->

## Message Types[​](#message-types "Direct link to Message Types")

### Requests (Child → Parent)[​](#requests-child--parent "Direct link to Requests (Child → Parent)")

| Request Type     | Class                   | Description                                                   |
| ---------------- | ----------------------- | ------------------------------------------------------------- |
| `config`         | `ChatUiConfigRequest`   | Request the UI configuration from the host                    |
| `token`          | `ChatUiTokenRequest`    | Request the authentication token from the host                |
| `toolCallback`   | `ToolCallbackRequest`   | Execute a tool callback on the host                           |
| `onBeforeRun`    | `OnBeforeRunRequest`    | Request tools and context before running an agent             |
| `onUnauthorized` | `OnUnauthorizedRequest` | Notify parent that token is unauthorized and request handling |

### Responses (Parent → Child)[​](#responses-parent--child "Direct link to Responses (Parent → Child)")

| Response Type            | Class                    | Description                                             |
| ------------------------ | ------------------------ | ------------------------------------------------------- |
| `config`                 | `ChatUiConfigResponse`   | Configuration response containing `ChatUiConfiguration` |
| `token`                  | `ChatUiTokenResponse`    | Token response containing the auth token                |
| `toolCallbackResponse`   | `ToolCallbackResponse`   | Result of a tool callback execution                     |
| `onBeforeRunResponse`    | `OnBeforeRunResponse`    | Tools and context for agent execution                   |
| `onUnauthorizedResponse` | `OnUnauthorizedResponse` | Optional unauthorized handling message from parent      |

### UI Events (Child → Parent)[​](#ui-events-child--parent "Direct link to UI Events (Child → Parent)")

| Event Type               | Payload             | Description                        |
| ------------------------ | ------------------- | ---------------------------------- |
| `OnAgentSelect`          | `string` (agentId)  | User selected an agent             |
| `OnThreadSelect`         | `undefined`         | User selected a thread             |
| `OnNewChat`              | `undefined`         | User started a new chat            |
| `OnExploreAgents`        | `undefined`         | User clicked explore agents        |
| `OnCreateAgent`          | `undefined`         | User clicked create agent          |
| `OnSignIn`               | `undefined`         | User clicked sign in               |
| `OnMyTrimbleClick`       | `undefined`         | User clicked My Trimble            |
| `OnChatInputButtonClick` | `string` (buttonId) | User clicked a custom input button |

## SDK Methods[​](#sdk-methods "Direct link to SDK Methods")

### Parent Frame Helpers (`parent-frame.helpers.ts`)[​](#parent-frame-helpers-parent-framehelpersts "Direct link to parent-frame-helpers-parent-framehelpersts")

| Method                   | Description                                                                                         |
| ------------------------ | --------------------------------------------------------------------------------------------------- |
| `listenToChatUi()`       | Sets up message listener for config, token, tool callback, onBeforeRun, and onUnauthorized requests |
| `updateConfig()`         | Sends a configuration update to the child frame                                                     |
| `listenToChatUiEvents()` | Sets up listener for UI events from the child frame                                                 |

### Child Frame Helpers (`child-frame.helpers.ts`)[​](#child-frame-helpers-child-framehelpersts "Direct link to child-frame-helpers-child-framehelpersts")

| Method               | Description                                              |
| -------------------- | -------------------------------------------------------- |
| `requestConfig()`    | Requests configuration from the parent frame             |
| `requestToken()`     | Requests authentication token from the parent frame      |
| `onUnauthorized()`   | Requests unauthorized handling response from parent      |
| `callToolCallback()` | Executes a tool callback on the parent and awaits result |
| `callOnBeforeRun()`  | Requests tools and context before running an agent       |
| `sendChatUiEvent()`  | Sends a UI event to the parent frame                     |
| `listenToParent()`   | Sets up message listener for responses from parent       |

## Data Flow Details[​](#data-flow-details "Direct link to Data Flow Details")

### Tool Callback Flow[​](#tool-callback-flow "Direct link to Tool Callback Flow")

<!-- -->

### OnBeforeRun Flow[​](#onbeforerun-flow "Direct link to OnBeforeRun Flow")

<!-- -->

## Configuration Structure[​](#configuration-structure "Direct link to Configuration Structure")

```typescript
interface ChatUiConfiguration {
  environment: 'development' | 'stage' | 'prod';
  onBeforeRunTimeout?: number;
  uiConfig: {
    theme: 'dark' | 'light';
    contentVariant: ContentVariants;
    variant: ChatUiVariants;
    chatInput: {
      buttons: ChatInputButton[];
      hideModelSelection: boolean;
    };
    showSignIn?: boolean;
  };
  localization: {
    translations?: Translations;
    selectedLanguage?: string;
  };
  agentId: string;
  threadId?: string;
}

```

## LocalTools Structure[​](#localtools-structure "Direct link to LocalTools Structure")

```typescript
interface LocalTools {
  runTime: {
    [toolCallId: string]: {
      definition: Tool;
      callback: ToolCallCallback;
      timeOutInMs?: number;
    };
  };
  global: {
    [toolCallId: string]: {
      callback: ToolCallCallback;
      timeOutInMs?: number;
    };
  };
}

```
