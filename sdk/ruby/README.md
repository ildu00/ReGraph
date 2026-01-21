# ReGraph Ruby SDK

Official Ruby SDK for [ReGraph](https://regraph.tech) - the decentralized AI compute marketplace.

## Features

- 🔌 **OpenAI-compatible API** - Drop-in replacement for OpenAI Ruby clients
- 💰 **Up to 90% cost savings** - Access AI models at a fraction of the cost
- 🤖 **50+ AI models** - GPT-4, Claude, Llama, Mistral, and more
- 💎 **Pure Ruby** - Zero dependencies, works with any Ruby version 2.7+
- 🛡️ **Type-safe** - Well-documented method signatures

## Installation

Add to your Gemfile:

```ruby
gem 'regraph'
```

Then run:

```bash
bundle install
```

Or install directly:

```bash
gem install regraph
```

## Quick Start

```ruby
require 'regraph'

# Initialize client
client = ReGraph::Client.new(api_key: 'your-api-key')

# Create a chat completion
response = client.chat.completions.create(
  model: 'gpt-4o',
  messages: [
    { role: 'user', content: 'Hello, how are you?' }
  ]
)

puts response['choices'][0]['message']['content']
```

## Configuration

### Global Configuration

```ruby
ReGraph.configure do |config|
  config.api_key = 'your-api-key'
  config.base_url = 'https://api.regraph.tech/v1'  # optional
  config.timeout = 60  # optional, in seconds
end

# Use the global client
response = ReGraph.client.chat.create(
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }]
)
```

### Environment Variable

```ruby
# Set REGRAPH_API_KEY environment variable
client = ReGraph::Client.new(api_key: ENV['REGRAPH_API_KEY'])
```

## Usage Examples

### Chat Completions

```ruby
client = ReGraph::Client.new(api_key: 'your-api-key')

# Basic chat
response = client.chat.completions.create(
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'What is the capital of France?' }
  ]
)

puts response['choices'][0]['message']['content']

# With parameters
response = client.chat.completions.create(
  model: 'claude-3-opus',
  messages: [{ role: 'user', content: 'Write a haiku about Ruby.' }],
  temperature: 0.7,
  max_tokens: 100
)
```

### Image Generation

```ruby
response = client.images.generate(
  prompt: 'A beautiful sunset over mountains',
  model: 'dall-e-3',
  size: '1024x1024',
  quality: 'hd'
)

puts response['data'][0]['url']
```

### Embeddings

```ruby
response = client.embeddings.create(
  model: 'text-embedding-ada-002',
  input: 'Hello, world!'
)

embedding = response['data'][0]['embedding']
puts "Embedding dimension: #{embedding.length}"
```

### Text-to-Speech

```ruby
response = client.audio.speech(
  input: 'Hello, welcome to ReGraph!',
  model: 'tts-1',
  voice: 'alloy'
)

# response contains base64 encoded audio
audio_base64 = response['audio']
```

### Training Jobs

```ruby
# Create a training job
job = client.training.jobs.create(
  model: 'llama-3-8b',
  dataset: 'https://example.com/dataset.jsonl',
  config: {
    epochs: 3,
    learning_rate: 0.0001,
    batch_size: 4
  }
)

puts "Job ID: #{job['job_id']}"
puts "Status: #{job['status']}"

# Check job status
job = client.training.jobs.retrieve(job['job_id'])
puts "Current status: #{job['status']}"

# List all jobs
jobs = client.training.jobs.list
jobs['jobs'].each do |j|
  puts "#{j['job_id']}: #{j['status']}"
end

# Cancel a job
client.training.jobs.cancel(job['job_id'])
```

### Batch Processing

```ruby
# Create a batch job
batch = client.batch.create(
  requests: [
    {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Summarize: AI is transforming...' }]
    },
    {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Translate to Spanish: Hello world' }]
    }
  ],
  webhook_url: 'https://your-app.com/webhook'
)

puts "Batch ID: #{batch['batch_id']}"

# Check batch status
batch = client.batch.retrieve(batch['batch_id'])
puts "Status: #{batch['status']}"
```

### Usage Statistics

```ruby
usage = client.usage.get(
  start_date: '2024-01-01',
  end_date: '2024-01-31'
)

puts "Total tokens: #{usage['total_tokens']}"
puts "Total cost: $#{usage['total_cost_usd']}"
```

### Model Management

```ruby
# List all models
models = client.models.list
models['models'].each do |model|
  puts "#{model['id']}: #{model['category']}"
end

# Filter by category
llm_models = client.models.list(category: 'llm')

# Search models
results = client.models.list(search: 'gpt')

# Deploy a custom model
deployment = client.models.deploy(
  model_name: 'my-finetuned-model',
  base_model: 'llama-3-8b',
  model_type: 'lora',
  weights_url: 'https://example.com/weights.safetensors'
)
```

### Hardware Rental

```ruby
# Rent GPU resources
rental = client.hardware.rent(
  gpu_type: 'A100',
  gpu_count: 2,
  duration_hours: 4
)

puts "Rental ID: #{rental['rental_id']}"
puts "SSH Access: #{rental['ssh_command']}"
puts "Total cost: $#{rental['total_cost_usd']}"
```

### Provider Operations

```ruby
# Register as a provider
registration = client.provider.register(
  device_name: 'GPU Server 1',
  device_type: 'gpu',
  device_model: 'RTX 4090',
  vram_gb: 24,
  price_per_hour: 0.50
)

puts "Provider ID: #{registration['provider_id']}"
puts "Connection Key: #{registration['connection_key']}"

# Check earnings
earnings = client.provider.earnings(
  start_date: '2024-01-01',
  end_date: '2024-01-31'
)

puts "Total earnings: $#{earnings['total_earnings_usd']}"
```

### Platform Status

```ruby
status = client.status.get

puts "Platform: #{status['status']}"
puts "Active devices: #{status['active_devices']}"
puts "Total compute TFLOPS: #{status['total_compute_tflops']}"
```

### Device Information

```ruby
devices = client.devices.list

devices['devices'].each do |device|
  puts "#{device['name']}: #{device['status']} (#{device['gpu_type']})"
end
```

## Error Handling

```ruby
begin
  response = client.chat.create(
    model: 'gpt-4o',
    messages: [{ role: 'user', content: 'Hello!' }]
  )
rescue ReGraph::AuthenticationError => e
  puts "Invalid API key: #{e.message}"
rescue ReGraph::RateLimitError => e
  puts "Rate limited. Retry after: #{e.retry_after} seconds"
rescue ReGraph::BadRequestError => e
  puts "Bad request: #{e.message}"
rescue ReGraph::NotFoundError => e
  puts "Resource not found: #{e.message}"
rescue ReGraph::ServerError => e
  puts "Server error (#{e.status_code}): #{e.message}"
rescue ReGraph::ConnectionError => e
  puts "Connection failed: #{e.message}"
rescue ReGraph::TimeoutError => e
  puts "Request timed out"
rescue ReGraph::Error => e
  puts "Unknown error: #{e.message}"
end
```

## Available Models

| Category | Models |
|----------|--------|
| **LLM** | gpt-4o, gpt-4o-mini, claude-3-opus, claude-3-sonnet, llama-3-70b, llama-3-8b, mistral-large, mixtral-8x7b |
| **Image** | dall-e-3, stable-diffusion-xl, midjourney-v6, flux-pro |
| **Embeddings** | text-embedding-ada-002, text-embedding-3-large, voyage-2 |
| **TTS** | tts-1, tts-1-hd, elevenlabs-v2 |

## Requirements

- Ruby 2.7 or higher
- No additional dependencies

## Links

- [Documentation](https://regraph.tech/docs)
- [API Reference](https://regraph.tech/docs#api-reference)
- [GitHub](https://github.com/ildu00/ReGraph)
- [Support](https://regraph.tech/support)

## License

MIT License - see [LICENSE](LICENSE) for details.
