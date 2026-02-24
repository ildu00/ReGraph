# ReGraph Provider for Dify

Use [ReGraph](https://regraph.tech) as a model provider in [Dify](https://dify.ai) — the open-source platform for building LLM-powered applications with visual workflows, RAG pipelines, and AI agents.

ReGraph is a decentralized AI compute marketplace offering 50+ models (GPT-5, Claude 4, Gemini 3, Llama, Mistral, and more) at up to 90% lower cost through its distributed provider network.

Since ReGraph exposes a fully OpenAI-compatible API, it integrates seamlessly with Dify's **OpenAI-API-compatible** model provider plugin.

## Quick Start

### 1. Get your ReGraph API key

Sign up and generate an API key at [regraph.tech/dashboard](https://regraph.tech/dashboard).

### 2. Install the OpenAI-API-compatible plugin

In your Dify instance, go to **Plugins** and install the **OpenAI-API-compatible** plugin (`langgenius/openai_api_compatible`) from the [Dify Marketplace](https://marketplace.dify.ai/plugin/langgenius/openai_api_compatible).

### 3. Add ReGraph as a model provider

1. Navigate to **Settings → Model Providers**
2. Click **Add Model** under the **OpenAI-API-compatible** provider
3. Fill in the configuration:

| Field | Value |
|---|---|
| **Model Name** | `gpt-5` (or any model from the catalog) |
| **Model Type** | `LLM` |
| **API Key** | `rg_your_api_key_here` |
| **API Endpoint URL** | `https://api.regraph.tech/v1` |
| **Context Size** | `128000` (adjust per model) |
| **Max Tokens** | `4096` |
| **Stream Mode** | ✅ Enabled |
| **Function Calling** | ✅ Supported |
| **Vision** | ✅ Supported (for multimodal models) |

4. Click **Save** to validate the connection

### 4. Add more models

Repeat step 3 to add additional ReGraph models. Each model requires a separate entry:

**Chat / Reasoning models** (Model Type: `LLM`):

| Model Name | Context Size | Notes |
|---|---|---|
| `gpt-5` | 128000 | OpenAI GPT-5 |
| `gpt-5-mini` | 128000 | Fast & cost-effective |
| `claude-4.5-sonnet` | 200000 | Anthropic Claude 4.5 |
| `gemini-3-pro` | 1000000 | Google Gemini 3 Pro |
| `gemini-3-flash` | 1000000 | Google Gemini 3 Flash |
| `deepseek-r1` | 64000 | DeepSeek R1 reasoning |
| `llama-3.1-70b` | 128000 | Meta Llama 3.1 |

**Embedding models** (Model Type: `Text Embedding`):

| Model Name | Notes |
|---|---|
| `text-embedding-3-large` | 3072 dimensions |
| `text-embedding-3-small` | 1536 dimensions |

**TTS models** (Model Type: `TTS`):

| Model Name | Notes |
|---|---|
| `tts-1` | Standard quality |
| `tts-1-hd` | High definition |

**STT models** (Model Type: `Speech2Text`):

| Model Name | Notes |
|---|---|
| `whisper-1` | OpenAI Whisper |

## Using in Workflows

Once configured, ReGraph models appear in the model selector across all Dify features:

- **Chatbot / Agent apps** — select ReGraph models as the LLM
- **Workflow nodes** — use in LLM, Knowledge Retrieval, and Question Classifier nodes
- **RAG pipelines** — use ReGraph embeddings for document indexing and retrieval
- **Tool calling** — ReGraph models support function calling for agent tool use

### Example: Chatbot with ReGraph

1. Create a new **Chatbot** app
2. In the orchestration panel, select **gpt-5** (ReGraph) as the model
3. Configure system prompt, temperature, and other parameters
4. Publish and test

### Example: RAG Workflow

1. Create a **Knowledge Base** using `text-embedding-3-large` (ReGraph) as the embedding model
2. Upload your documents
3. In your workflow, add a **Knowledge Retrieval** node connected to your knowledge base
4. Use an **LLM** node with `gpt-5` (ReGraph) to generate answers based on retrieved context

## API Access via Dify

Dify also exposes its own API for programmatic access. Once ReGraph is configured as a provider, all Dify API calls can use ReGraph models:

```bash
curl -X POST 'https://your-dify-instance/v1/chat-messages' \
  -H 'Authorization: Bearer {dify-api-key}' \
  -H 'Content-Type: application/json' \
  -d '{
    "inputs": {},
    "query": "What is decentralized AI?",
    "response_mode": "streaming",
    "user": "user-123"
  }'
```

## Docker Compose (Self-Hosted)

For self-hosted Dify installations, you can pre-configure ReGraph via environment variables:

```yaml
# docker-compose.override.yml
services:
  api:
    environment:
      - REGRAPH_API_KEY=rg_your_api_key_here
```

Then add the model provider through the Dify UI using the API key from the environment.

## Supported Capabilities

| Capability | Supported |
|---|---|
| Chat Completions (LLM) | ✅ |
| Streaming (SSE) | ✅ |
| Function Calling / Tools | ✅ |
| Vision (Multimodal) | ✅ |
| Embeddings | ✅ |
| Text-to-Speech (TTS) | ✅ |
| Speech-to-Text (STT) | ✅ |
| Moderation | ✅ |
| Image Generation | ✅ |

## Available Models

ReGraph provides access to 50+ models across multiple categories:

| Category | Example Models |
|---|---|
| **Chat / Reasoning** | `gpt-5`, `gpt-5-mini`, `gpt-5.1`, `gpt-5.2`, `claude-4.5-sonnet`, `claude-4.5-opus`, `gemini-3-pro`, `gemini-3-flash` |
| **Code** | `grok-code-fast-1`, `claude-4.5-haiku` |
| **Embeddings** | `text-embedding-3-large`, `text-embedding-3-small` |
| **Image Generation** | `dall-e-3`, `stable-diffusion-xl`, `flux-pro` |
| **Audio** | `tts-1`, `tts-1-hd`, `whisper-1` |

Full model list: [regraph.tech/models](https://regraph.tech/models)

## Troubleshooting

| Issue | Solution |
|---|---|
| "Model not found" | Ensure the model name exactly matches the ReGraph catalog (case-sensitive) |
| Timeout errors | Increase timeout in Dify model settings (recommended: 120s for large models) |
| Embedding dimension mismatch | Verify the `dimensions` parameter matches the model output |
| TTS not working | Ensure model type is set to `TTS`, not `LLM` |

## Links

- [ReGraph Platform](https://regraph.tech)
- [ReGraph API Docs](https://regraph.tech/docs)
- [ReGraph Models](https://regraph.tech/models)
- [Get API Key](https://regraph.tech/dashboard)
- [Dify Documentation](https://docs.dify.ai)
- [Dify GitHub](https://github.com/langgenius/dify)
- [OpenAI-API-compatible Plugin](https://marketplace.dify.ai/plugin/langgenius/openai_api_compatible)

## License

MIT
