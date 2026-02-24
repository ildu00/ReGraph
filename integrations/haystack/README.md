# ReGraph Provider for Haystack

Use [ReGraph](https://regraph.tech) as an LLM provider in [Haystack](https://haystack.deepset.ai/) — the open-source AI framework by deepset for building production-ready RAG pipelines, agents, and search systems.

ReGraph is a decentralized AI compute marketplace offering 50+ models (GPT-5, Claude 4, Gemini 3, Llama, Mistral, and more) at up to 90% lower cost through its distributed provider network.

Since ReGraph exposes a fully OpenAI-compatible API, it works out of the box with Haystack's `OpenAIChatGenerator` and `OpenAITextEmbedder` — no custom components needed.

## Quick Start

### 1. Install dependencies

```bash
pip install haystack-ai
```

### 2. Set your ReGraph API key

```bash
export REGRAPH_API_KEY="rg_your_api_key_here"
```

Get your API key at [regraph.tech/dashboard](https://regraph.tech/dashboard).

### 3. Use with OpenAIChatGenerator

```python
from haystack.components.generators.chat import OpenAIChatGenerator
from haystack.dataclasses import ChatMessage

generator = OpenAIChatGenerator(
    api_base_url="https://api.regraph.tech/v1",
    api_key=Secret.from_env_var("REGRAPH_API_KEY"),
    model="gpt-5",
)

messages = [ChatMessage.from_user("What is decentralized AI?")]
response = generator.run(messages=messages)
print(response["replies"][0].text)
```

## Streaming

```python
from haystack.components.generators.chat import OpenAIChatGenerator
from haystack.dataclasses import ChatMessage

def stream_callback(chunk):
    print(chunk.content, end="", flush=True)

generator = OpenAIChatGenerator(
    api_base_url="https://api.regraph.tech/v1",
    api_key=Secret.from_env_var("REGRAPH_API_KEY"),
    model="gpt-5",
    streaming_callback=stream_callback,
)

messages = [ChatMessage.from_user("Explain quantum computing")]
generator.run(messages=messages)
```

## Embeddings

```python
from haystack.components.embedders import OpenAITextEmbedder, OpenAIDocumentEmbedder

# For queries
text_embedder = OpenAITextEmbedder(
    api_base_url="https://api.regraph.tech/v1",
    api_key=Secret.from_env_var("REGRAPH_API_KEY"),
    model="text-embedding-3-large",
)

result = text_embedder.run(text="What is decentralized AI?")
print(f"Dimensions: {len(result['embedding'])}")

# For documents
doc_embedder = OpenAIDocumentEmbedder(
    api_base_url="https://api.regraph.tech/v1",
    api_key=Secret.from_env_var("REGRAPH_API_KEY"),
    model="text-embedding-3-large",
)
```

## RAG Pipeline

```python
from haystack import Pipeline
from haystack.components.generators.chat import OpenAIChatGenerator
from haystack.components.builders import ChatPromptBuilder
from haystack.components.embedders import OpenAITextEmbedder
from haystack.components.retrievers.in_memory import InMemoryEmbeddingRetriever
from haystack.document_stores.in_memory import InMemoryDocumentStore
from haystack.dataclasses import ChatMessage

# Set up document store
document_store = InMemoryDocumentStore()

# Build the RAG pipeline
rag = Pipeline()

rag.add_component("embedder", OpenAITextEmbedder(
    api_base_url="https://api.regraph.tech/v1",
    api_key=Secret.from_env_var("REGRAPH_API_KEY"),
    model="text-embedding-3-large",
))

rag.add_component("retriever", InMemoryEmbeddingRetriever(document_store=document_store))

rag.add_component("prompt", ChatPromptBuilder(
    template=[ChatMessage.from_user(
        "Answer based on context:\n{% for doc in documents %}{{ doc.content }}\n{% endfor %}\nQuestion: {{ query }}"
    )]
))

rag.add_component("llm", OpenAIChatGenerator(
    api_base_url="https://api.regraph.tech/v1",
    api_key=Secret.from_env_var("REGRAPH_API_KEY"),
    model="gpt-5",
))

rag.connect("embedder.embedding", "retriever.query_embedding")
rag.connect("retriever.documents", "prompt.documents")
rag.connect("prompt.messages", "llm.messages")

result = rag.run({
    "embedder": {"text": "What is ReGraph?"},
    "prompt": {"query": "What is ReGraph?"},
})
print(result["llm"]["replies"][0].text)
```

## Tool / Function Calling

```python
from haystack.components.generators.chat import OpenAIChatGenerator
from haystack.dataclasses import ChatMessage

tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get the current weather for a city",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {"type": "string", "description": "The city name"}
                },
                "required": ["city"]
            }
        }
    }
]

generator = OpenAIChatGenerator(
    api_base_url="https://api.regraph.tech/v1",
    api_key=Secret.from_env_var("REGRAPH_API_KEY"),
    model="gpt-5",
    generation_kwargs={"tools": tools},
)

messages = [ChatMessage.from_user("What's the weather in Tokyo?")]
response = generator.run(messages=messages)
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
- [Haystack Documentation](https://docs.haystack.deepset.ai/)
- [Haystack GitHub](https://github.com/deepset-ai/haystack)
- [OpenAIChatGenerator Reference](https://docs.haystack.deepset.ai/docs/openaichatgenerator)

## License

MIT
