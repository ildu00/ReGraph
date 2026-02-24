# ReGraph Provider for Vespa

Use [ReGraph](https://regraph.tech) as an external LLM provider in [Vespa](https://vespa.ai/) — the open-source big data and AI serving engine for search, recommendation, and RAG at scale.

ReGraph is a decentralized AI compute marketplace offering 50+ models (GPT-5, Claude 4, Gemini 3, Llama, Mistral, and more) at up to 90% lower cost through its distributed provider network.

Vespa natively supports OpenAI-compatible LLM clients, making ReGraph a drop-in replacement.

## Quick Start

### 1. Get your ReGraph API key

Get your API key at [regraph.tech/dashboard](https://regraph.tech/dashboard).

### 2. Configure `services.xml`

Add the ReGraph LLM client to your Vespa application's `services.xml`:

```xml
<services version="1.0">
  <container id="default" version="1.0">

    <!-- ReGraph LLM client (OpenAI-compatible) -->
    <component id="regraph" class="ai.vespa.llm.clients.OpenAI">
      <config name="ai.vespa.llm.clients.llm-client">
        <apiKeySecretRef>regraph-api-key</apiKeySecretRef>
        <endpoint>https://api.regraph.tech/v1/chat/completions</endpoint>
      </config>
    </component>

    <!-- RAG searcher using ReGraph -->
    <search>
      <chain id="rag" inherits="vespa">
        <searcher id="ai.vespa.search.llm.RAGSearcher">
          <config name="ai.vespa.search.llm.llm-searcher">
            <providerId>regraph</providerId>
          </config>
        </searcher>
      </chain>
    </search>

  </container>
</services>
```

### 3. Store the API key as a secret

For **Vespa Cloud**, add the secret via the Vespa console or CLI:

```bash
vespa secret set regraph-api-key "rg_your_api_key_here"
```

For **self-hosted Vespa**, set the secret in your environment or use the secret store mechanism available in your deployment.

### 4. Query with RAG

Once deployed, send queries that use the ReGraph-powered RAG chain:

```bash
curl -s "http://localhost:8080/search/" \
  --data-urlencode "searchChain=rag" \
  --data-urlencode "query=what is decentralized AI" \
  --data-urlencode "llm.model=gpt-5" \
  --data-urlencode "llm.prompt=Answer the question based on the search results: {context}"
```

## RAG with Custom Prompt

```xml
<search>
  <chain id="rag" inherits="vespa">
    <searcher id="ai.vespa.search.llm.RAGSearcher">
      <config name="ai.vespa.search.llm.llm-searcher">
        <providerId>regraph</providerId>
      </config>
    </searcher>
  </chain>
</search>
```

Query with a custom prompt template:

```bash
curl -s "http://localhost:8080/search/" \
  --data-urlencode "searchChain=rag" \
  --data-urlencode "query=latest developments in AI" \
  --data-urlencode "llm.model=claude-4.5-sonnet" \
  --data-urlencode "llm.prompt=You are a research assistant. Summarize these search results:\n\n{context}\n\nProvide a concise answer."
```

## Document Enrichment

Use ReGraph to enrich documents at indexing time:

```xml
<document-processing>
  <chain id="enrich">
    <documentprocessor id="ai.vespa.docproc.llm.LLMDocumentProcessor">
      <config name="ai.vespa.search.llm.llm-searcher">
        <providerId>regraph</providerId>
      </config>
    </documentprocessor>
  </chain>
</document-processing>
```

## Multiple Models

You can configure multiple ReGraph clients for different models or use cases:

```xml
<component id="regraph-fast" class="ai.vespa.llm.clients.OpenAI">
  <config name="ai.vespa.llm.clients.llm-client">
    <apiKeySecretRef>regraph-api-key</apiKeySecretRef>
    <endpoint>https://api.regraph.tech/v1/chat/completions</endpoint>
  </config>
</component>

<component id="regraph-reasoning" class="ai.vespa.llm.clients.OpenAI">
  <config name="ai.vespa.llm.clients.llm-client">
    <apiKeySecretRef>regraph-api-key</apiKeySecretRef>
    <endpoint>https://api.regraph.tech/v1/chat/completions</endpoint>
  </config>
</component>
```

Then specify the model per query:

```bash
# Fast responses
curl "http://localhost:8080/search/?searchChain=rag&query=hello&llm.model=gpt-5-mini"

# Deep reasoning
curl "http://localhost:8080/search/?searchChain=rag&query=complex+question&llm.model=gpt-5"
```

## Streaming Responses

Vespa supports streaming LLM responses via Server-Sent Events:

```bash
curl -N "http://localhost:8080/search/" \
  --data-urlencode "searchChain=rag" \
  --data-urlencode "query=explain quantum computing" \
  --data-urlencode "llm.model=gpt-5" \
  --data-urlencode "llm.stream=true"
```

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

## Links

- [ReGraph Platform](https://regraph.tech)
- [ReGraph API Docs](https://regraph.tech/docs)
- [ReGraph Models](https://regraph.tech/models)
- [Get API Key](https://regraph.tech/dashboard)
- [Vespa Documentation](https://docs.vespa.ai/)
- [Vespa External LLMs](https://docs.vespa.ai/en/rag/external-llms.html)
- [Vespa RAG Guide](https://docs.vespa.ai/en/rag/llms-in-vespa.html)
- [Vespa GitHub](https://github.com/vespa-engine/vespa)

## License

MIT
