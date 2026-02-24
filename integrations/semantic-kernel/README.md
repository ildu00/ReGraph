# ReGraph Provider for Microsoft Semantic Kernel

Use [ReGraph](https://regraph.tech) as an AI provider in [Microsoft Semantic Kernel](https://github.com/microsoft/semantic-kernel) — the open-source SDK for building AI agents and integrating LLMs into applications.

ReGraph is a decentralized AI compute marketplace offering 50+ models (GPT-5, Claude 4, Gemini 3, Llama, Mistral, and more) at up to 90% lower cost through its distributed provider network.

Since ReGraph exposes a fully OpenAI-compatible API, it works with Semantic Kernel's OpenAI connectors by pointing to the ReGraph endpoint.

## Quick Start — Python

### 1. Install dependencies

```bash
pip install semantic-kernel
```

### 2. Set your ReGraph API key

```bash
export REGRAPH_API_KEY="rg_your_api_key_here"
```

Get your API key at [regraph.tech/dashboard](https://regraph.tech/dashboard).

### 3. Configure the Kernel

```python
import os
from semantic_kernel import Kernel
from semantic_kernel.connectors.ai.open_ai import OpenAIChatCompletion

kernel = Kernel()

chat_service = OpenAIChatCompletion(
    ai_model_id="gpt-5",
    api_key=os.environ["REGRAPH_API_KEY"],
    base_url="https://api.regraph.tech/v1",
)

kernel.add_service(chat_service)
```

### 4. Chat Completion

```python
from semantic_kernel.contents import ChatHistory

chat_history = ChatHistory()
chat_history.add_system_message("You are a helpful AI assistant.")
chat_history.add_user_message("What is decentralized AI?")

response = await chat_service.get_chat_message_contents(
    chat_history=chat_history,
)

print(response[0].content)
```

## Quick Start — C# (.NET)

### 1. Install the NuGet package

```bash
dotnet add package Microsoft.SemanticKernel
```

### 2. Configure the Kernel

```csharp
using Microsoft.SemanticKernel;

var builder = Kernel.CreateBuilder();

// Use OpenAI connector with ReGraph endpoint
builder.AddOpenAIChatCompletion(
    modelId: "gpt-5",
    apiKey: Environment.GetEnvironmentVariable("REGRAPH_API_KEY")!,
    endpoint: new Uri("https://api.regraph.tech/v1")
);

var kernel = builder.Build();
```

### 3. Chat Completion

```csharp
using Microsoft.SemanticKernel.ChatCompletion;

var chatService = kernel.GetRequiredService<IChatCompletionService>();
var history = new ChatHistory("You are a helpful AI assistant.");
history.AddUserMessage("Explain quantum computing");

var response = await chatService.GetChatMessageContentAsync(history);
Console.WriteLine(response.Content);
```

### 4. Streaming

```csharp
await foreach (var chunk in chatService.GetStreamingChatMessageContentsAsync(history))
{
    Console.Write(chunk.Content);
}
```

## Function Calling / Plugins (Python)

```python
from semantic_kernel.functions import kernel_function

class WeatherPlugin:
    @kernel_function(description="Get the weather for a city")
    def get_weather(self, city: str) -> str:
        return f"The weather in {city} is sunny, 22°C"

kernel.add_plugin(WeatherPlugin(), plugin_name="Weather")

# The model will automatically call the plugin when needed
settings = kernel.get_prompt_execution_settings_from_service_id("default")
settings.function_choice_behavior = "auto"

result = await kernel.invoke_prompt(
    "What's the weather in Tokyo?",
    settings=settings,
)
print(result)
```

## Function Calling / Plugins (C#)

```csharp
using System.ComponentModel;
using Microsoft.SemanticKernel;

public class WeatherPlugin
{
    [KernelFunction, Description("Get the weather for a city")]
    public string GetWeather(string city) => $"The weather in {city} is sunny, 22°C";
}

kernel.Plugins.AddFromType<WeatherPlugin>();

var settings = new OpenAIPromptExecutionSettings
{
    FunctionChoiceBehavior = FunctionChoiceBehavior.Auto()
};

var result = await kernel.InvokePromptAsync("What's the weather in Tokyo?", new(settings));
Console.WriteLine(result);
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
- [Semantic Kernel Documentation](https://learn.microsoft.com/en-us/semantic-kernel/)
- [Semantic Kernel GitHub](https://github.com/microsoft/semantic-kernel)

## License

MIT
