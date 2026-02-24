# ReGraph Provider for LangChain

Use [ReGraph](https://regraph.tech) as an LLM provider in [LangChain](https://python.langchain.com/) — the leading open-source framework for building LLM-powered applications.

ReGraph is a decentralized AI compute marketplace offering 50+ models (GPT-5, Claude 4, Gemini 3, Llama, Mistral, and more) at up to 90% lower cost through its distributed provider network.

Since ReGraph exposes a fully OpenAI-compatible API, it works out of the box with LangChain's `ChatOpenAI` wrapper — no custom classes needed.

## Quick Start

### 1. Install dependencies

```bash
pip install langchain-openai
```

### 2. Set your ReGraph API key

```bash
export REGRAPH_API_KEY="rg_your_api_key_here"
```

Get your API key at [regraph.tech/dashboard](https://regraph.tech/dashboard).

### 3. Use with ChatOpenAI

```python
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    base_url="https://api.regraph.tech/v1",
    api_key="rg_your_api_key_here",  # or use REGRAPH_API_KEY env var
    model="gpt-5",
)

response = llm.invoke("What is decentralized AI?")
print(response.content)
```

## Streaming

```python
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    base_url="https://api.regraph.tech/v1",
    api_key="rg_your_api_key_here",
    model="gpt-5",
    streaming=True,
)

for chunk in llm.stream("Explain quantum computing in simple terms"):
    print(chunk.content, end="", flush=True)
```

## Chat with Message History

```python
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

llm = ChatOpenAI(
    base_url="https://api.regraph.tech/v1",
    api_key="rg_your_api_key_here",
    model="claude-4.5-sonnet",
)

messages = [
    SystemMessage(content="You are a helpful coding assistant."),
    HumanMessage(content="Write a Python function to calculate Fibonacci numbers"),
]

response = llm.invoke(messages)
print(response.content)
```

## Function Calling / Tool Use

```python
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool

@tool
def get_weather(city: str) -> str:
    """Get the current weather for a city."""
    return f"The weather in {city} is sunny, 22°C"

llm = ChatOpenAI(
    base_url="https://api.regraph.tech/v1",
    api_key="rg_your_api_key_here",
    model="gpt-5",
)

llm_with_tools = llm.bind_tools([get_weather])
response = llm_with_tools.invoke("What's the weather in Tokyo?")
print(response)
```

## Embeddings

```python
from langchain_openai import OpenAIEmbeddings

embeddings = OpenAIEmbeddings(
    base_url="https://api.regraph.tech/v1",
    api_key="rg_your_api_key_here",
    model="text-embedding-3-large",
)

vectors = embeddings.embed_documents(["Hello world", "Decentralized AI"])
print(f"Dimensions: {len(vectors[0])}")
```

## RAG Pipeline

```python
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

llm = ChatOpenAI(
    base_url="https://api.regraph.tech/v1",
    api_key="rg_your_api_key_here",
    model="gpt-5",
)

embeddings = OpenAIEmbeddings(
    base_url="https://api.regraph.tech/v1",
    api_key="rg_your_api_key_here",
    model="text-embedding-3-large",
)

prompt = ChatPromptTemplate.from_template(
    "Answer based on the context:\n\n{context}\n\nQuestion: {question}"
)

chain = prompt | llm | StrOutputParser()

response = chain.invoke({
    "context": "ReGraph is a decentralized AI compute marketplace.",
    "question": "What is ReGraph?"
})
print(response)
```

## Using with LangGraph Agents

```python
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent
from langchain_core.tools import tool

@tool
def search(query: str) -> str:
    """Search for information."""
    return f"Results for: {query}"

llm = ChatOpenAI(
    base_url="https://api.regraph.tech/v1",
    api_key="rg_your_api_key_here",
    model="gpt-5",
)

agent = create_react_agent(llm, [search])

result = agent.invoke({"messages": [("user", "Search for latest AI news")]})
print(result["messages"][-1].content)
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

## Environment Variables

You can configure ReGraph via environment variables for cleaner code:

```bash
export OPENAI_API_BASE="https://api.regraph.tech/v1"
export OPENAI_API_KEY="rg_your_api_key_here"
```

Then simply use:

```python
llm = ChatOpenAI(model="gpt-5")  # picks up env vars automatically
```

## Links

- [ReGraph Platform](https://regraph.tech)
- [ReGraph API Docs](https://regraph.tech/docs)
- [ReGraph Models](https://regraph.tech/models)
- [Get API Key](https://regraph.tech/dashboard)
- [LangChain Documentation](https://python.langchain.com/)
- [LangChain ChatOpenAI Reference](https://python.langchain.com/docs/integrations/chat/openai/)

## License

MIT
