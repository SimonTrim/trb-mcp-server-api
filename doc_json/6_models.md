# Models

The Agentic AI Platform provides access to a wide range of AI models from leading providers. All models are accessed through the Model gateway service, which ensures responsible AI practices and consistent authentication.

## Model Providers[​](#model-providers "Direct link to Model Providers")

The platform supports models from the following providers:

* **OpenAI** - Advanced language models including GPT-4 and GPT-5 series
* **Anthropic** - Claude models including Opus, Sonnet, and Haiku variants
* **Google** - Gemini models with multimodal capabilities
* **Meta** - Llama models for various use cases

## Supported Models[​](#supported-models "Direct link to Supported Models")

### OpenAI Models[​](#openai-models "Direct link to OpenAI Models")

| Model ID       | Context Window | Max Output Tokens | Input Modalities   | Status |
| -------------- | -------------- | ----------------- | ------------------ | ------ |
| `gpt-5-chat`   | 128,000        | 4,096             | text, image        | Active |
| `gpt-4o`       | 128,000        | 4,096             | text, image, audio | Active |
| `gpt-4o-mini`  | 128,000        | 4,096             | text, image, audio | Active |
| `gpt-4.1`      | 128,000        | 4,096             | text, image        | Active |
| `gpt-4.1-mini` | 128,000        | 4,096             | text, image        | Active |
| `gpt-4.1-nano` | 128,000        | 4,096             | text, image        | Active |

**Inference Provider**: AzureOpenAI<br />**Authentication**: TID (Trimble Identity)<br />**I/O Schema**: OpenAI-Compatible<br />**Documentation**: [OpenAI API Docs](https://platform.openai.com/docs)

### Anthropic Models[​](#anthropic-models "Direct link to Anthropic Models")

| Model ID                     | Context Window | Max Output Tokens | Input Modalities | Status |
| ---------------------------- | -------------- | ----------------- | ---------------- | ------ |
| `claude-opus-4-5-20251101`   | 200,000        | 64,000            | text, image      | Active |
| `claude-opus-4-1-20250805`   | 200,000        | 8,192             | text             | Active |
| `claude-opus-4-20250514`     | 200,000        | 8,192             | text             | Active |
| `claude-sonnet-4-5-20250929` | 200,000        | 64,000            | text             | Active |
| `claude-sonnet-4-20250514`   | 200,000        | 8,192             | text             | Active |
| `claude-haiku-4-5-20251001`  | 200,000        | 64,000            | text             | Active |
| `claude-3-5-haiku-20241022`  | 200,000        | 8,192             | text, image      | Active |

**Inference Provider**: Google<br />**Authentication**: TID (Trimble Identity)<br />**I/O Schema**: Anthropic-Compatible<br />**Documentation**: [Anthropic Claude API](https://docs.anthropic.com/claude/api)

### Google Models[​](#google-models "Direct link to Google Models")

| Model ID                | Context Window | Max Output Tokens | Input Modalities   | Status |
| ----------------------- | -------------- | ----------------- | ------------------ | ------ |
| `gemini-3-pro-preview`  | 1,000,000      | 64,000            | text, image, audio | Active |
| `gemini-2.5-pro`        | 1,000,000      | 8,192             | text, image, audio | Active |
| `gemini-2.5-flash`      | 1,000,000      | 8,192             | text, image, audio | Active |
| `gemini-2.5-flash-lite` | 1,000,000      | 8,192             | text, image, audio | Active |
| `gemini-embedding-001`  | 2,048          | 768               | text               | Active |

**Inference Provider**: Google<br />**Authentication**: TID (Trimble Identity)<br />**I/O Schema**: OpenAI-Compatible<br />**Documentation**: [Google AI Docs](https://ai.google.dev/docs)

**Note**: `gemini-embedding-001` outputs embeddings rather than text.

### Meta Models[​](#meta-models "Direct link to Meta Models")

| Model ID                                 | Context Window | Max Output Tokens | Input Modalities | Status |
| ---------------------------------------- | -------------- | ----------------- | ---------------- | ------ |
| `Llama-4-Maverick-17B-128E-Instruct-FP8` | 131,072        | 4,096             | text             | Active |
| `Llama-4-Scout-17B-16E-Instruct`         | 16,384         | 4,096             | text             | Active |

**Inference Provider**: AzureAI<br />**Authentication**: TID (Trimble Identity)<br />**I/O Schema**: AzureAI-Compatible<br />**Documentation**: [Azure AI Services](https://docs.azure.com/ai-services/)

## Model Capabilities[​](#model-capabilities "Direct link to Model Capabilities")

### Context Windows[​](#context-windows "Direct link to Context Windows")

Models support different context window sizes:

* **Small**: 2,048 - 16,384 tokens (embedding models, smaller Llama models)
* **Medium**: 128,000 - 131,072 tokens (most GPT-4 models, Llama models)
* **Large**: 200,000 tokens (Claude models)
* **Very Large**: 1,000,000 tokens (Gemini models)

### Multimodal Support[​](#multimodal-support "Direct link to Multimodal Support")

Many models support multiple input modalities:

* **Text**: All models support text input
* **Image**: GPT-4o, GPT-4.1 series, Claude Opus 4.5, Claude 3.5 Haiku, Gemini models
* **Audio**: GPT-4o, GPT-4o-mini, Gemini models

### Output Capabilities[​](#output-capabilities "Direct link to Output Capabilities")

* **Text Generation**: All models except embedding models
* **Embeddings**: `gemini-embedding-001` outputs vector embeddings

## Using Models[​](#using-models "Direct link to Using Models")

To use these models in your agents, you'll need:

1. **Authentication**: A valid Trimble Identity (TID) token with the `models` scope

2. **Model Selection**: Choose the appropriate model based on your requirements:

   * **Large context needs**: Gemini models (1M tokens) or Claude models (200K tokens)
   * **Multimodal tasks**: GPT-4o, Gemini, or Claude models with image/audio support
   * **Cost optimization**: Smaller models like GPT-4o-mini or Claude Haiku
   * **Embeddings**: Use `gemini-embedding-001` for semantic search

3. **API Access**: Use the [Model Control Plane API](/api/models-control-plane.md) to:

   * List available models
   * Get model details and capabilities
   * Check model health status

For more information on integrating models into your agents, see the [Agents documentation](/docs/capabilities/agents.md).
