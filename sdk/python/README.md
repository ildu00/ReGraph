# ReGraph Python SDK

Official Python SDK for [ReGraph](https://regraph.tech) - the decentralized AI compute marketplace.

Access 50+ AI models including GPT-5, Claude, Gemini, and Llama at up to 80% lower cost through our global network of compute providers.

## Features

- 🚀 **OpenAI-compatible API** - Drop-in replacement for existing workflows
- 💰 **Up to 80% cost savings** - Decentralized compute at competitive rates
- 🌐 **50+ AI models** - LLMs, image generation, embeddings, TTS, and more
- 🔒 **Type-safe** - Full type hints and dataclass models
- 📦 **Zero dependencies** - Uses Python standard library only
- ⚡ **Simple integration** - Get started in minutes

## Installation

```bash
pip install regraph
```

Or install from source:

```bash
git clone https://github.com/ildu00/ReGraph.git
cd ReGraph/sdk/python
pip install -e .
```

## Quick Start

```python
from regraph import ReGraph

# Initialize the client
client = ReGraph(api_key="your-api-key")

# Chat completion (OpenAI-compatible)
response = client.chat.completions.create(
    model="gpt-5",
    messages=[
        {"role": "user", "content": "Hello, ReGraph!"}
    ]
)
print(response.choices[0].message.content)
```

## Usage Examples

### Chat Completions

```python
from regraph import ReGraph, ChatMessage

client = ReGraph(api_key="your-api-key")

# Using dict messages
response = client.chat.completions.create(
    model="gpt-5",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Explain quantum computing in simple terms."}
    ],
    temperature=0.7,
    max_tokens=500
)

print(response.choices[0].message.content)
print(f"Tokens used: {response.usage.total_tokens}")

# Using ChatMessage objects
messages = [
    ChatMessage(role="system", content="You are a Python expert."),
    ChatMessage(role="user", content="How do I use async/await?")
]

response = client.chat.completions.create(
    model="claude-3-opus",
    messages=messages
)
```

### Image Generation

```python
# Generate images
result = client.images.generate(
    model="dall-e-3",
    prompt="A futuristic city with flying cars at sunset",
    size="1024x1024",
    quality="hd"
)

for image in result.data:
    print(f"Image URL: {image.url}")
```

### Embeddings

```python
# Create embeddings
embeddings = client.embeddings.create(
    model="text-embedding-3-large",
    input=["Hello world", "How are you?"]
)

for item in embeddings.data:
    print(f"Vector dimension: {len(item.embedding)}")
```

### Text-to-Speech

```python
# Generate speech
audio = client.audio.speech(
    model="tts-1",
    input="Welcome to ReGraph, the future of AI compute.",
    voice="alloy"
)

# Save to file
import base64
with open("speech.mp3", "wb") as f:
    f.write(base64.b64decode(audio.audio_base64))
```

### Fine-tuning / Training

```python
# Create a training job
job = client.training.jobs.create(
    model="llama-3-8b",
    dataset="https://your-bucket.s3.amazonaws.com/training-data.jsonl",
    config={
        "epochs": 3,
        "learning_rate": 0.0001,
        "batch_size": 4
    }
)

print(f"Job ID: {job.job_id}")
print(f"Estimated cost: ${job.estimated_cost_usd}")

# Check job status
status = client.training.jobs.get(job.job_id)
print(f"Status: {status.status}, Progress: {status.progress}%")

# List all jobs
jobs = client.training.jobs.list()
for j in jobs:
    print(f"{j.job_id}: {j.status}")

# Cancel a job
client.training.jobs.cancel(job.job_id)
```

### Batch Processing

```python
# Process multiple requests efficiently
batch = client.batch.create(
    requests=[
        {"model": "gpt-5", "prompt": "Translate to French: Hello"},
        {"model": "gpt-5", "prompt": "Translate to French: Goodbye"},
        {"model": "gpt-5", "prompt": "Translate to French: Thank you"}
    ],
    webhook_url="https://your-app.com/webhook"
)

print(f"Batch ID: {batch.batch_id}")
print(f"Total requests: {batch.total_requests}")

# Check batch status
result = client.batch.get(batch.batch_id)
print(f"Completed: {result.completed_requests}/{result.total_requests}")
```

### Usage Statistics

```python
# Get usage stats
usage = client.usage.get(
    start_date="2025-01-01",
    end_date="2025-01-31"
)

print(f"Total cost: ${usage.total_cost}")
print(f"Total tokens: {usage.total_tokens}")

for day in usage.daily:
    print(f"  {day.date}: ${day.total_cost}")
```

### List Available Models

```python
# List all models
result = client.models.list()
for model in result["models"]:
    print(f"{model.id} ({model.category}) - ${model.price_per_1k_tokens}/1K tokens")

# Filter by category
llm_models = client.models.list(category="llm")
image_models = client.models.list(category="image")

# Search models
result = client.models.list(search="gpt")
```

### Deploy Custom Models

```python
# Deploy a fine-tuned model
deployment = client.models.deploy(
    model_name="my-custom-model",
    base_model="llama-3-8b",
    model_type="lora",
    weights_url="https://your-bucket.s3.amazonaws.com/weights.safetensors"
)

print(f"Deployment ID: {deployment['deployment_id']}")
```

### Hardware Rental

```python
# Rent GPU compute
rental = client.hardware.rent(
    gpu_type="a100",
    gpu_count=4,
    duration_hours=24
)

print(f"Rental ID: {rental['rental_id']}")
print(f"Total cost: ${rental['total_cost_usd']}")
```

### Provider Registration

```python
# Register as a compute provider
result = client.provider.register(
    name="My GPU Rig",
    hardware_type="gpu",
    compute_units=8,
    location="US-West"
)

# Get earnings
earnings = client.provider.earnings(
    start_date="2025-01-01",
    end_date="2025-01-31"
)
print(f"Total earned: ${earnings['total_earned_usd']}")
```

### Platform Status

```python
# Check platform health
status = client.status.get()

print(f"Platform status: {status.status}")
print(f"Active providers: {status.active_providers}")
print(f"Uptime: {status.uptime_percentage}%")

for service, state in status.services.items():
    print(f"  {service}: {state}")
```

## Error Handling

```python
from regraph import ReGraph, ReGraphError, AuthenticationError, RateLimitError

client = ReGraph(api_key="your-api-key")

try:
    response = client.chat.completions.create(
        model="gpt-5",
        messages=[{"role": "user", "content": "Hello!"}]
    )
except AuthenticationError as e:
    print(f"Invalid API key: {e}")
except RateLimitError as e:
    print(f"Rate limited, please retry: {e}")
except ReGraphError as e:
    print(f"API error ({e.status_code}): {e}")
```

## Configuration

```python
# Custom configuration
client = ReGraph(
    api_key="your-api-key",
    base_url="https://api.regraph.tech/v1",  # Custom endpoint
    timeout=120  # Request timeout in seconds
)
```

## Supported Models

| Category | Models |
|----------|--------|
| **LLM** | gpt-5, gpt-4-turbo, claude-3-opus, claude-3-sonnet, gemini-pro, llama-3-70b, llama-3-8b, mistral-large, mixtral-8x22b |
| **Image** | dall-e-3, stable-diffusion-xl, midjourney-v6, flux-pro |
| **Embeddings** | text-embedding-3-large, text-embedding-3-small, voyage-large-2 |
| **Audio** | tts-1, tts-1-hd, eleven-multilingual, whisper-large-v3 |
| **Code** | codellama-70b, starcoder2-15b, deepseek-coder-33b |
| **Vision** | gpt-4-vision, claude-3-opus-vision, gemini-pro-vision |

[View all 50+ models →](https://regraph.tech/models)

## API Reference

Full API documentation available at [regraph.tech/docs](https://regraph.tech/docs)

## License

MIT License - see [LICENSE](https://github.com/ildu00/ReGraph/blob/main/LICENSE) for details.

## Links

- **Website**: [regraph.tech](https://regraph.tech)
- **Documentation**: [regraph.tech/docs](https://regraph.tech/docs)
- **GitHub**: [github.com/ildu00/ReGraph](https://github.com/ildu00/ReGraph)
- **Issues**: [github.com/ildu00/ReGraph/issues](https://github.com/ildu00/ReGraph/issues)
- **Support**: [regraph.tech/support](https://regraph.tech/support)
