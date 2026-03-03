# ReGraph Provider for Open WebUI

Use [ReGraph](https://regraph.tech) as an AI provider in [Open WebUI](https://openwebui.com) — the popular open-source web interface for LLMs that supports any OpenAI-compatible backend.

ReGraph is a decentralized AI compute marketplace offering 50+ models (GPT-5, Claude 4, Gemini 3, Llama, DeepSeek, and more) at up to 90% lower cost through its distributed provider network.

---

## Quick Start (2 minutes)

### Option A — Automated setup script

```bash
# Linux / macOS
curl -fsSL https://regraph.tech/scripts/install-openwebui.sh | bash
```

Or run the bundled script from this repo:

```bash
chmod +x install.sh && ./install.sh
```

### Option B — Manual setup

Follow the steps below.

---

## Manual Setup

### Prerequisites

- Docker & Docker Compose installed
- A ReGraph API key → [regraph.tech/dashboard](https://regraph.tech/dashboard)

### Step 1 — Start Open WebUI

```bash
docker run -d \
  --name open-webui \
  -p 3000:8080 \
  -v open-webui:/app/backend/data \
  --restart always \
  ghcr.io/open-webui/open-webui:main
```

Open [http://localhost:3000](http://localhost:3000) and complete the initial setup (create admin account).

### Step 2 — Add ReGraph as a connection

1. Go to **Settings → Admin → Connections**
2. Under **OpenAI API**, click **➕ Add connection**
3. Fill in:

   | Field | Value |
   |---|---|
   | **Name** | `ReGraph` |
   | **Base URL** | `https://api.regraph.tech/v1` |
   | **API Key** | `rg_your_api_key_here` |

4. Click **Save** — Open WebUI will verify the connection and auto-fetch the model list.

### Step 3 — Select a model

In the chat interface, open the model selector and choose any ReGraph model:

- `gpt-5` — OpenAI GPT-5
- `gpt-5-mini` — Fast & cost-effective
- `claude-sonnet-4.5` — Anthropic Claude 4.5 Sonnet
- `claude-opus-4.5` — Anthropic Claude 4.5 Opus
- `gemini-3-pro` — Google Gemini 3 Pro
- `gemini-3-flash` — Google Gemini 3 Flash
- `deepseek-r1` — DeepSeek R1 Reasoning
- `llama-3.1-70b` — Meta Llama 3.1 70B
- And 40+ more → [regraph.tech/models](https://regraph.tech/models)

---

## Docker Compose (Recommended)

Use the provided `docker-compose.yml` to run Open WebUI pre-configured with ReGraph:

```bash
# 1. Set your API key
export REGRAPH_API_KEY="rg_your_api_key_here"

# 2. Start
docker compose up -d

# 3. Open http://localhost:3000
```

Or with an inline env variable:

```bash
REGRAPH_API_KEY=rg_your_key docker compose up -d
```

---

## Environment Variable Configuration

Open WebUI supports pre-seeding connections via environment variables (v0.3.35+):

```yaml
# docker-compose.yml or docker run -e ...
environment:
  - OPENAI_API_BASE_URLS=https://api.regraph.tech/v1
  - OPENAI_API_KEYS=rg_your_api_key_here
  - OPENAI_API_BASE_URL=https://api.regraph.tech/v1
  - OPENAI_API_KEY=rg_your_api_key_here
```

This pre-configures ReGraph on first launch — no manual UI setup needed.

---

## Features Available in Open WebUI with ReGraph

| Feature | Status |
|---|---|
| Chat Completions | ✅ |
| Streaming responses | ✅ |
| Function / Tool calling | ✅ |
| Vision (image input) | ✅ GPT-5, Claude, Gemini |
| Web search integration | ✅ (via Open WebUI RAG) |
| Document RAG | ✅ with ReGraph embeddings |
| Multi-model arena | ✅ compare models side-by-side |
| Image generation | ✅ (via Open WebUI image gen settings) |
| Voice input / TTS | ✅ |
| Multi-user / Teams | ✅ (Open WebUI built-in) |

---

## Using ReGraph Embeddings for RAG

To enable document retrieval with ReGraph embeddings:

1. Go to **Settings → Admin → Documents**
2. Under **Embedding Model**, select **OpenAI** provider
3. Set:
   - **API Base URL**: `https://api.regraph.tech/v1`
   - **API Key**: `rg_your_api_key_here`
   - **Model**: `text-embedding-3-large`

---

## Pipelines / Functions

Open WebUI Pipelines let you add middleware logic between the UI and ReGraph. Example use cases:

- **Cost monitoring** — log token usage and cost per request
- **Model routing** — route complex queries to Claude, fast queries to GPT-5 Mini
- **Content filtering** — add moderation before/after LLM calls
- **RAG augmentation** — inject retrieved context into prompts

Install pipelines:

```bash
docker run -d \
  --name pipelines \
  -p 9099:9099 \
  --add-host=host.docker.internal:host-gateway \
  -v pipelines:/app/pipelines \
  --restart always \
  ghcr.io/open-webui/pipelines:main
```

Then add `http://host.docker.internal:9099` as a connection in Open WebUI.

---

## Troubleshooting

| Issue | Solution |
|---|---|
| "Connection failed" on save | Check that your API key starts with `rg_` and has no extra spaces |
| Models not appearing | Click the refresh icon next to the connection in Admin → Connections |
| Slow responses | Try `gpt-5-mini` or `gemini-3-flash` for faster inference |
| Image input not working | Ensure model supports vision — try `gpt-5` or `claude-opus-4.5` |
| Rate limit errors | Upgrade your ReGraph plan or reduce concurrent requests |

---

## Links

- [ReGraph Platform](https://regraph.tech)
- [ReGraph API Docs](https://regraph.tech/docs)
- [ReGraph Models](https://regraph.tech/models)
- [Get API Key](https://regraph.tech/dashboard)
- [Open WebUI Docs](https://docs.openwebui.com)
- [Open WebUI GitHub](https://github.com/open-webui/open-webui)

## License

MIT
