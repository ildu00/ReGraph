# ReGraph Provider for Maxim Bifrost

Use [ReGraph](https://regraph.tech) as an AI provider in [Bifrost](https://www.getmaxim.ai/bifrost) — the open-source AI gateway by Maxim AI.

ReGraph is a decentralized AI compute marketplace offering 50+ models (GPT-5, Claude 4, Gemini 3, Llama, Mistral, and more) at up to 90% lower cost through its distributed provider network.

## Quick Start

### 1. Set your ReGraph API key

```bash
export REGRAPH_API_KEY="rg_your_api_key_here"
```

Get your API key at [regraph.tech/dashboard](https://regraph.tech/dashboard).

### 2. Add the provider config

Copy `config.json` from this directory into your Bifrost configuration, or add the `regraph` provider block to your existing `config.json`:

```json
{
  "providers": {
    "regraph": {
      "keys": [
        {
          "name": "regraph-key-1",
          "value": "env.REGRAPH_API_KEY",
          "models": [],
          "weight": 1.0
        }
      ],
      "network_config": {
        "base_url": "https://api.regraph.tech/v1",
        "default_request_timeout_in_seconds": 120
      },
      "custom_provider_config": {
        "base_provider_type": "openai",
        "allowed_requests": {
          "chat_completion": true,
          "chat_completion_stream": true,
          "embedding": true,
          "list_models": true,
          "text_completion": false
        }
      }
    }
  }
}
```

### 3. Add via API (alternative)

```bash
curl --location 'http://localhost:8080/api/providers' \
  --header 'Content-Type: application/json' \
  --data '{
    "provider": "regraph",
    "keys": [
      {
        "name": "regraph-key-1",
        "value": "env.REGRAPH_API_KEY",
        "models": [],
        "weight": 1.0
      }
    ],
    "network_config": {
      "base_url": "https://api.regraph.tech/v1",
      "default_request_timeout_in_seconds": 120
    },
    "custom_provider_config": {
      "base_provider_type": "openai",
      "allowed_requests": {
        "chat_completion": true,
        "chat_completion_stream": true,
        "embedding": true,
        "list_models": true,
        "text_completion": false
      }
    }
  }'
```

### 4. Make requests

Once configured, send requests through Bifrost specifying ReGraph as the provider:

```bash
curl --location 'http://localhost:8080/v1/chat/completions' \
  --header 'Content-Type: application/json' \
  --data '{
    "model": "gpt-5",
    "messages": [
      {"role": "user", "content": "Hello from Bifrost!"}
    ],
    "extra_body": {
      "provider": "regraph"
    }
  }'
```

#### Python (OpenAI SDK)

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8080/v1",
    api_key="bifrost"  # Bifrost manages actual keys
)

response = client.chat.completions.create(
    model="gpt-5",
    messages=[{"role": "user", "content": "Hello from Bifrost!"}],
    extra_body={"provider": "regraph"}
)

print(response.choices[0].message.content)
```

#### JavaScript (OpenAI SDK)

```javascript
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "http://localhost:8080/v1",
  apiKey: "bifrost",
});

const response = await client.chat.completions.create({
  model: "gpt-5",
  messages: [{ role: "user", content: "Hello from Bifrost!" }],
  // @ts-ignore — provider routing
  provider: "regraph",
});

console.log(response.choices[0].message.content);
```

## Supported Capabilities

| Capability | Supported |
|---|---|
| Chat Completions | ✅ |
| Streaming (SSE) | ✅ |
| Embeddings | ✅ |
| List Models | ✅ |
| Function Calling | ✅ |
| Vision (multimodal) | ✅ |
| Image Generation | ✅ (via `/v1/images/generations`) |
| Audio TTS | ✅ (via `/v1/audio/speech`) |
| Audio STT | ✅ (via `/v1/audio/transcriptions`) |
| Moderation | ✅ (via `/v1/moderations`) |

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

## Multi-Provider Fallback

Combine ReGraph with other providers for automatic failover:

```json
{
  "providers": {
    "openai": {
      "keys": [{ "name": "openai-key", "value": "env.OPENAI_API_KEY", "models": [], "weight": 1.0 }]
    },
    "regraph": {
      "keys": [{ "name": "regraph-key", "value": "env.REGRAPH_API_KEY", "models": [], "weight": 1.0 }],
      "network_config": {
        "base_url": "https://api.regraph.tech/v1"
      },
      "custom_provider_config": {
        "base_provider_type": "openai",
        "allowed_requests": {
          "chat_completion": true,
          "chat_completion_stream": true,
          "embedding": true
        }
      }
    }
  }
}
```

This lets Bifrost route traffic between OpenAI directly and ReGraph for cost optimization or redundancy.

## Links

- [ReGraph Platform](https://regraph.tech)
- [ReGraph API Docs](https://regraph.tech/docs)
- [ReGraph Models](https://regraph.tech/models)
- [Get API Key](https://regraph.tech/dashboard)
- [Bifrost Documentation](https://www.getmaxim.ai/bifrost/docs)
- [Bifrost Custom Providers](https://docs.getbifrost.ai/providers/custom-providers)

## License

MIT
