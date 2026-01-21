# ReGraph JavaScript/TypeScript SDK

Official JavaScript/TypeScript SDK for [ReGraph](https://regraph.tech) - the decentralized AI compute marketplace.

Access 50+ AI models including GPT-5, Claude, Gemini, and Llama at up to 80% lower cost through our global network of compute providers.

## Features

- 🚀 **OpenAI-compatible API** - Drop-in replacement for existing workflows
- 💰 **Up to 80% cost savings** - Decentralized compute at competitive rates
- 🌐 **50+ AI models** - LLMs, image generation, embeddings, TTS, and more
- 📘 **Full TypeScript support** - Complete type definitions included
- 📦 **Zero dependencies** - Uses native fetch API
- ⚡ **Simple integration** - Get started in minutes

## Installation

```bash
npm install regraph
```

Or with yarn/pnpm:

```bash
yarn add regraph
pnpm add regraph
```

## Quick Start

```typescript
import { ReGraph } from 'regraph';

// Initialize the client
const client = new ReGraph({ apiKey: 'your-api-key' });

// Chat completion (OpenAI-compatible)
const response = await client.chat.completions.create({
  model: 'gpt-5',
  messages: [
    { role: 'user', content: 'Hello, ReGraph!' }
  ]
});

console.log(response.choices[0].message.content);
```

## Usage Examples

### Chat Completions

```typescript
import { ReGraph } from 'regraph';

const client = new ReGraph({ apiKey: 'your-api-key' });

// Basic chat completion
const response = await client.chat.completions.create({
  model: 'gpt-5',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Explain quantum computing in simple terms.' }
  ],
  temperature: 0.7,
  max_tokens: 500
});

console.log(response.choices[0].message.content);
console.log(`Tokens used: ${response.usage.total_tokens}`);
```

### Image Generation

```typescript
// Generate images
const result = await client.images.generate({
  model: 'dall-e-3',
  prompt: 'A futuristic city with flying cars at sunset',
  size: '1024x1024',
  quality: 'hd'
});

for (const image of result.data) {
  console.log(`Image URL: ${image.url}`);
}
```

### Embeddings

```typescript
// Create embeddings
const embeddings = await client.embeddings.create({
  model: 'text-embedding-3-large',
  input: ['Hello world', 'How are you?']
});

for (const item of embeddings.data) {
  console.log(`Vector dimension: ${item.embedding.length}`);
}
```

### Text-to-Speech

```typescript
// Generate speech
const audio = await client.audio.speech({
  model: 'tts-1',
  input: 'Welcome to ReGraph, the future of AI compute.',
  voice: 'alloy'
});

// In Node.js, save to file
import { writeFileSync } from 'fs';
writeFileSync('speech.mp3', Buffer.from(audio.audio_base64, 'base64'));
```

### Fine-tuning / Training

```typescript
// Create a training job
const job = await client.training.jobs.create({
  model: 'llama-3-8b',
  dataset: 'https://your-bucket.s3.amazonaws.com/training-data.jsonl',
  config: {
    epochs: 3,
    learning_rate: 0.0001,
    batch_size: 4
  }
});

console.log(`Job ID: ${job.job_id}`);
console.log(`Estimated cost: $${job.estimated_cost_usd}`);

// Check job status
const status = await client.training.jobs.get(job.job_id);
console.log(`Status: ${status.status}, Progress: ${status.progress}%`);

// List all jobs
const { jobs } = await client.training.jobs.list();
for (const j of jobs) {
  console.log(`${j.job_id}: ${j.status}`);
}

// Cancel a job
await client.training.jobs.cancel(job.job_id);
```

### Batch Processing

```typescript
// Process multiple requests efficiently
const batch = await client.batch.create({
  requests: [
    { model: 'gpt-5', prompt: 'Translate to French: Hello' },
    { model: 'gpt-5', prompt: 'Translate to French: Goodbye' },
    { model: 'gpt-5', prompt: 'Translate to French: Thank you' }
  ],
  webhook_url: 'https://your-app.com/webhook'
});

console.log(`Batch ID: ${batch.batch_id}`);
console.log(`Total requests: ${batch.total_requests}`);

// Check batch status
const result = await client.batch.get(batch.batch_id);
console.log(`Completed: ${result.completed_requests}/${result.total_requests}`);
```

### Usage Statistics

```typescript
// Get usage stats
const usage = await client.usage.get({
  startDate: '2025-01-01',
  endDate: '2025-01-31'
});

console.log(`Total cost: $${usage.total_cost}`);
console.log(`Total tokens: ${usage.total_tokens}`);

for (const day of usage.daily) {
  console.log(`  ${day.date}: $${day.total_cost}`);
}
```

### List Available Models

```typescript
// List all models
const result = await client.models.list();
for (const model of result.models) {
  console.log(`${model.id} (${model.category}) - $${model.price_per_1k_tokens}/1K tokens`);
}

// Filter by category
const llmModels = await client.models.list({ category: 'llm' });
const imageModels = await client.models.list({ category: 'image' });

// Search models
const gptModels = await client.models.list({ search: 'gpt' });
```

### Deploy Custom Models

```typescript
// Deploy a fine-tuned model
const deployment = await client.models.deploy({
  model_name: 'my-custom-model',
  base_model: 'llama-3-8b',
  model_type: 'lora',
  weights_url: 'https://your-bucket.s3.amazonaws.com/weights.safetensors'
});

console.log(`Deployment ID: ${deployment.deployment_id}`);
```

### Hardware Rental

```typescript
// Rent GPU compute
const rental = await client.hardware.rent({
  gpu_type: 'a100',
  gpu_count: 4,
  duration_hours: 24
});

console.log(`Rental ID: ${rental.rental_id}`);
console.log(`Total cost: $${rental.total_cost_usd}`);
```

### Provider Registration

```typescript
// Register as a compute provider
const result = await client.provider.register({
  name: 'My GPU Rig',
  hardware_type: 'gpu',
  compute_units: 8,
  location: 'US-West'
});

// Get earnings
const earnings = await client.provider.earnings({
  startDate: '2025-01-01',
  endDate: '2025-01-31'
});
console.log(`Total earned: $${earnings.total_earned_usd}`);
```

### Platform Status

```typescript
// Check platform health
const status = await client.status.get();

console.log(`Platform status: ${status.status}`);
console.log(`Active providers: ${status.active_providers}`);
console.log(`Uptime: ${status.uptime_percentage}%`);

for (const [service, state] of Object.entries(status.services)) {
  console.log(`  ${service}: ${state}`);
}
```

## Error Handling

```typescript
import { ReGraph, ReGraphError, AuthenticationError, RateLimitError } from 'regraph';

const client = new ReGraph({ apiKey: 'your-api-key' });

try {
  const response = await client.chat.completions.create({
    model: 'gpt-5',
    messages: [{ role: 'user', content: 'Hello!' }]
  });
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error(`Invalid API key: ${error.message}`);
  } else if (error instanceof RateLimitError) {
    console.error(`Rate limited, please retry: ${error.message}`);
  } else if (error instanceof ReGraphError) {
    console.error(`API error (${error.statusCode}): ${error.message}`);
  }
}
```

## Configuration

```typescript
// Custom configuration
const client = new ReGraph({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.regraph.tech/v1',  // Custom endpoint
  timeout: 120000  // Request timeout in milliseconds
});
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

## TypeScript Support

This SDK is written in TypeScript and includes complete type definitions. All types are exported from the main package:

```typescript
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatMessage,
  Model,
  TrainingJobResponse,
  // ... and many more
} from 'regraph';
```

## Requirements

- Node.js 18+ (for native fetch support)
- Or any modern browser with fetch API

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
