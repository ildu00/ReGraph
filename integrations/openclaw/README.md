# ReGraph Provider for OpenClaw

Use [ReGraph](https://regraph.tech) as a model provider in [OpenClaw](https://openclaw.ai) — the open-source AI agent platform that runs on your machine and works across WhatsApp, Telegram, Discord, Slack, and more.

ReGraph is a decentralized AI compute marketplace offering 50+ models (GPT-5, Claude 4, Gemini 3, Llama, DeepSeek, and more) at up to 90% lower cost through its distributed provider network. Since ReGraph exposes a fully OpenAI-compatible API, it integrates with OpenClaw as a custom `models.providers` entry.

---

## Quick Start

### 1. Get your ReGraph API key

Sign up and generate an API key at [regraph.tech/dashboard](https://regraph.tech/dashboard).
Your key starts with `rg_`.

### 2. Set the environment variable

```bash
export REGRAPH_API_KEY="rg_your_api_key_here"
```

Or add it to your shell profile (`~/.bashrc`, `~/.zshrc`) for persistence.

### 3. Add ReGraph to your OpenClaw config

Edit `~/.config/openclaw/openclaw.json` (or `openclaw.json` in your project root):

```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "regraph/gpt-5"
      }
    }
  },
  "models": {
    "mode": "merge",
    "providers": {
      "regraph": {
        "baseUrl": "https://api.regraph.tech/v1",
        "apiKey": "${REGRAPH_API_KEY}",
        "api": "openai-completions",
        "models": [
          { "id": "gpt-5",             "name": "GPT-5",                  "contextWindow": 128000, "maxTokens": 16384, "input": ["text", "image"] },
          { "id": "gpt-5-mini",        "name": "GPT-5 Mini",             "contextWindow": 128000, "maxTokens": 16384, "input": ["text", "image"] },
          { "id": "gpt-5.2",           "name": "GPT-5.2",                "contextWindow": 128000, "maxTokens": 16384, "input": ["text", "image"] },
          { "id": "claude-opus-4-5",   "name": "Claude Opus 4.5",        "contextWindow": 200000, "maxTokens": 8192,  "input": ["text", "image"] },
          { "id": "claude-sonnet-4-5", "name": "Claude Sonnet 4.5",      "contextWindow": 200000, "maxTokens": 8192,  "input": ["text", "image"] },
          { "id": "gemini-3-pro",      "name": "Gemini 3 Pro",           "contextWindow": 1000000, "maxTokens": 8192, "input": ["text", "image"] },
          { "id": "gemini-3-flash",    "name": "Gemini 3 Flash",         "contextWindow": 1000000, "maxTokens": 8192, "input": ["text", "image"] },
          { "id": "deepseek-r1",       "name": "DeepSeek R1",            "contextWindow": 64000,  "maxTokens": 8192,  "reasoning": true },
          { "id": "llama-3.1-70b",     "name": "Llama 3.1 70B",         "contextWindow": 128000, "maxTokens": 8192 },
          { "id": "mistral-large",     "name": "Mistral Large",          "contextWindow": 128000, "maxTokens": 8192 }
        ]
      }
    }
  }
}
```

### 4. Verify the setup

```bash
openclaw models list
```

You should see all `regraph/*` models in the output.

### 5. Set as default (optional)

```bash
openclaw models set regraph/gpt-5
```

---

## CLI Onboarding

OpenClaw's onboarding wizard doesn't have a built-in ReGraph option yet, but you can set it up via environment variable and config directly:

```bash
# Set the key
export REGRAPH_API_KEY="rg_your_key_here"

# Verify models are available
openclaw models list | grep regraph

# Switch to a specific ReGraph model
openclaw models set regraph/claude-opus-4-5
```

---

## Key Rotation (Multiple API Keys)

OpenClaw supports automatic key rotation on rate-limit errors. Configure multiple ReGraph keys:

```bash
export REGRAPH_API_KEYS="rg_key1,rg_key2,rg_key3"
```

Or in `openclaw.json`:

```json
{
  "env": {
    "REGRAPH_API_KEY": "rg_primary_key",
    "REGRAPH_API_KEYS": "rg_key1,rg_key2,rg_key3"
  }
}
```

---

## Model Failover

Use ReGraph as a fallback when primary providers hit rate limits:

```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "anthropic/claude-opus-4-6",
        "fallbacks": [
          "regraph/claude-opus-4-5",
          "regraph/gpt-5"
        ]
      }
    }
  }
}
```

This routes to ReGraph automatically when Anthropic returns 429 or 529 errors.

---

## Use with Specific Agents

Apply ReGraph to a specific agent only:

```json
{
  "agents": {
    "my-research-agent": {
      "model": {
        "primary": "regraph/gemini-3-pro"
      }
    }
  }
}
```

---

## Cost Configuration

ReGraph pricing is pay-per-token. Add cost hints for the OpenClaw cost tracker:

```json
{
  "models": {
    "mode": "merge",
    "providers": {
      "regraph": {
        "baseUrl": "https://api.regraph.tech/v1",
        "apiKey": "${REGRAPH_API_KEY}",
        "api": "openai-completions",
        "models": [
          {
            "id": "gpt-5",
            "name": "GPT-5",
            "contextWindow": 128000,
            "maxTokens": 16384,
            "input": ["text", "image"],
            "cost": {
              "input":  0.0025,
              "output": 0.01,
              "cacheRead":  0.00025,
              "cacheWrite": 0.0025
            }
          }
        ]
      }
    }
  }
}
```

Current pricing: [regraph.tech/pricing](https://regraph.tech/pricing)

---

## Available Models

| Model ID | Name | Context | Vision | Reasoning |
|---|---|---|---|---|
| `regraph/gpt-5` | GPT-5 | 128K | ✅ | — |
| `regraph/gpt-5-mini` | GPT-5 Mini | 128K | ✅ | — |
| `regraph/gpt-5.2` | GPT-5.2 | 128K | ✅ | — |
| `regraph/claude-opus-4-5` | Claude Opus 4.5 | 200K | ✅ | — |
| `regraph/claude-sonnet-4-5` | Claude Sonnet 4.5 | 200K | ✅ | — |
| `regraph/gemini-3-pro` | Gemini 3 Pro | 1M | ✅ | — |
| `regraph/gemini-3-flash` | Gemini 3 Flash | 1M | ✅ | — |
| `regraph/deepseek-r1` | DeepSeek R1 | 64K | — | ✅ |
| `regraph/llama-3.1-70b` | Llama 3.1 70B | 128K | — | — |
| `regraph/mistral-large` | Mistral Large | 128K | — | — |

Full model list: [regraph.tech/models](https://regraph.tech/models)

---

## Supported Capabilities

| Feature | Status |
|---|---|
| Chat Completions | ✅ |
| Streaming (SSE) | ✅ |
| Function / Tool calling | ✅ |
| Vision (image input) | ✅ GPT-5, Claude, Gemini |
| Reasoning models | ✅ DeepSeek R1 |
| Key rotation | ✅ |
| Model failover | ✅ |
| Cost tracking | ✅ (with cost hints) |

---

## Contributing to OpenClaw

To add ReGraph as a built-in provider in OpenClaw (no `models.providers` config needed), submit a PR to [openclaw/openclaw](https://github.com/openclaw/openclaw) adding a `regraph` entry to the pi-ai catalog.

The provider definition follows the pattern in `src/providers/`:

```typescript
// src/providers/regraph.ts (proposed)
export const regraphProvider = {
  id: "regraph",
  name: "ReGraph",
  baseUrl: "https://api.regraph.tech/v1",
  authEnvKey: "REGRAPH_API_KEY",
  api: "openai-completions",
  website: "https://regraph.tech",
  docsUrl: "https://regraph.tech/docs",
  description: "Decentralized AI compute marketplace — 50+ models at up to 90% lower cost",
  models: [
    { id: "gpt-5",           name: "GPT-5",           contextWindow: 128000, input: ["text", "image"] },
    { id: "gpt-5-mini",      name: "GPT-5 Mini",      contextWindow: 128000, input: ["text", "image"] },
    { id: "claude-opus-4-5", name: "Claude Opus 4.5", contextWindow: 200000, input: ["text", "image"] },
    { id: "gemini-3-pro",    name: "Gemini 3 Pro",    contextWindow: 1000000, input: ["text", "image"] },
    { id: "deepseek-r1",     name: "DeepSeek R1",     contextWindow: 64000, reasoning: true },
  ],
};
```

---

## Troubleshooting

| Issue | Solution |
|---|---|
| `REGRAPH_API_KEY not set` | Run `export REGRAPH_API_KEY="rg_..."` or add to `openclaw.json` env block |
| Models not listed | Check `openclaw models list` and confirm `models.mode: "merge"` in config |
| 401 Unauthorized | Verify the key at [regraph.tech/dashboard](https://regraph.tech/dashboard) |
| Rate limit (429) | Add multiple keys via `REGRAPH_API_KEYS` for automatic rotation |
| Slow responses | Switch to `regraph/gpt-5-mini` or `regraph/gemini-3-flash` for faster inference |

---

## Links

- [ReGraph Platform](https://regraph.tech)
- [ReGraph API Docs](https://regraph.tech/docs)
- [ReGraph Models & Pricing](https://regraph.tech/models)
- [Get API Key](https://regraph.tech/dashboard)
- [OpenClaw Docs — Model Providers](https://docs.openclaw.ai/concepts/model-providers)
- [OpenClaw GitHub](https://github.com/openclaw/openclaw)

## License

MIT
