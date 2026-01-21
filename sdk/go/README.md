# ReGraph Go SDK

Official Go SDK for the [ReGraph](https://regraph.tech) decentralized AI compute marketplace.

## Installation

```bash
go get github.com/ildu00/regraph-go
```

## Quick Start

```go
package main

import (
	"context"
	"fmt"
	"log"

	"github.com/ildu00/regraph-go"
)

func main() {
	client := regraph.NewClient("your-api-key")

	resp, err := client.Chat.Completions.Create(context.Background(), regraph.ChatCompletionRequest{
		Model: "gpt-5",
		Messages: []regraph.ChatMessage{
			{Role: "user", Content: "Hello!"},
		},
	})
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println(resp.Choices[0].Message.Content)
}
```

## Features

- **OpenAI-compatible API** - Drop-in replacement for OpenAI client
- **Full API coverage** - Chat, embeddings, images, audio, training, and more
- **Context support** - All methods accept `context.Context` for cancellation
- **Type-safe** - Strongly typed request/response structures
- **Error handling** - Structured errors with status code helpers

## Configuration

```go
// Custom base URL
client := regraph.NewClient("api-key", regraph.WithBaseURL("https://custom.api.endpoint"))

// Custom timeout
client := regraph.NewClient("api-key", regraph.WithTimeout(120*time.Second))

// Custom HTTP client
httpClient := &http.Client{
	Transport: &http.Transport{
		MaxIdleConns: 100,
	},
}
client := regraph.NewClient("api-key", regraph.WithHTTPClient(httpClient))
```

## Usage Examples

### Chat Completions

```go
resp, err := client.Chat.Completions.Create(ctx, regraph.ChatCompletionRequest{
	Model: "gpt-5",
	Messages: []regraph.ChatMessage{
		{Role: "system", Content: "You are a helpful assistant."},
		{Role: "user", Content: "What is the capital of France?"},
	},
	Temperature: ptr(0.7),
	MaxTokens:   ptr(500),
})
```

### Embeddings

```go
resp, err := client.Embeddings.Create(ctx, regraph.EmbeddingRequest{
	Model: "text-embedding-3-large",
	Input: []string{"Hello world", "How are you?"},
})
fmt.Println(resp.Data[0].Embedding)
```

### Image Generation

```go
resp, err := client.Images.Generate(ctx, regraph.ImageGenerationRequest{
	Model:  "dall-e-3",
	Prompt: "A sunset over mountains",
	Size:   "1024x1024",
})
fmt.Println(resp.Data[0].URL)
```

### Audio (Text-to-Speech)

```go
resp, err := client.Audio.Speech(ctx, regraph.AudioSpeechRequest{
	Model: "tts-1",
	Input: "Hello, this is a test.",
	Voice: "alloy",
})
// resp.AudioBase64 contains the audio data
```

### List Models

```go
resp, err := client.Models.List(ctx, &regraph.ModelsListOptions{
	Category: "llm",
	Limit:    10,
})
for _, model := range resp.Models {
	fmt.Printf("%s (%s)\n", model.ID, model.Provider)
}
```

### Training Jobs

```go
// Create a training job
job, err := client.Training.Jobs.Create(ctx, regraph.TrainingJobRequest{
	Model:   "llama-3.1-8b",
	Dataset: "https://example.com/dataset.jsonl",
	Config: &regraph.TrainingConfig{
		Epochs:       ptr(3),
		LearningRate: ptr(1e-4),
	},
})
fmt.Printf("Job ID: %s, Estimated cost: $%.2f\n", job.JobID, job.EstimatedCostUSD)

// Check job status
status, err := client.Training.Jobs.Get(ctx, job.JobID)
fmt.Printf("Status: %s, Progress: %.1f%%\n", status.Status, *status.Progress)
```

### Batch Processing

```go
batch, err := client.Batch.Create(ctx, regraph.BatchRequest{
	Requests: []regraph.BatchRequestItem{
		{Model: "gpt-5", Prompt: "Summarize: ..."},
		{Model: "gpt-5", Prompt: "Translate: ..."},
	},
})
fmt.Printf("Batch ID: %s\n", batch.BatchID)
```

### Usage Statistics

```go
usage, err := client.Usage.Get(ctx, &regraph.UsageOptions{
	StartDate: "2025-01-01",
	EndDate:   "2025-01-31",
})
fmt.Printf("Total cost: $%.2f, Total tokens: %d\n", usage.TotalCost, usage.TotalTokens)
```

### Hardware Rental

```go
rental, err := client.Hardware.Rent(ctx, regraph.HardwareRentalRequest{
	GPUType:       "A100-80GB",
	GPUCount:      ptr(2),
	DurationHours: ptr(4),
})
fmt.Printf("Rental ID: %s, Cost: $%.2f\n", rental.RentalID, rental.TotalCostUSD)
```

### Provider Registration

```go
provider, err := client.Provider.Register(ctx, regraph.ProviderRegistration{
	Name:         "My GPU Server",
	HardwareType: "NVIDIA RTX 4090",
	ComputeUnits: 24,
	Location:     "US-East",
})
fmt.Printf("Provider ID: %s\n", provider.ProviderID)

// Check earnings
earnings, err := client.Provider.Earnings(ctx, nil)
fmt.Printf("Total earned: $%.2f\n", earnings.TotalEarnedUSD)
```

### Platform Status

```go
status, err := client.Status.Get(ctx)
fmt.Printf("Status: %s, Uptime: %.2f%%\n", status.Status, status.UptimePercentage)
```

## Error Handling

```go
resp, err := client.Chat.Completions.Create(ctx, req)
if err != nil {
	if apiErr, ok := err.(*regraph.APIError); ok {
		if apiErr.IsAuthenticationError() {
			log.Fatal("Invalid API key")
		}
		if apiErr.IsRateLimitError() {
			log.Println("Rate limited, retrying...")
		}
		log.Printf("API error: %s (status %d)", apiErr.Message, apiErr.StatusCode)
	}
	log.Fatal(err)
}
```

## Helper Function

For optional pointer values:

```go
func ptr[T any](v T) *T {
	return &v
}
```

## Supported Models

| Category | Models |
|----------|--------|
| LLM | gpt-5, gpt-5-mini, claude-4-sonnet, llama-3.1-405b, gemini-2.5-pro |
| Embeddings | text-embedding-3-large, text-embedding-3-small |
| Image | dall-e-3, stable-diffusion-xl, midjourney-v6 |
| Audio | tts-1, tts-1-hd, whisper-1 |

## Links

- [API Documentation](https://regraph.tech/docs)
- [Dashboard](https://regraph.tech/dashboard)
- [GitHub](https://github.com/ildu00/ReGraph)

## License

MIT License - see [LICENSE](LICENSE) for details.
