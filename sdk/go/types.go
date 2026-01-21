package regraph

// ============ Common Types ============

// Usage represents token usage information.
type Usage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

// ============ Chat Completions ============

// ChatMessage represents a message in a chat conversation.
type ChatMessage struct {
	Role    string `json:"role"`    // "system", "user", or "assistant"
	Content string `json:"content"`
	Name    string `json:"name,omitempty"`
}

// ChatChoice represents a single completion choice.
type ChatChoice struct {
	Index        int         `json:"index"`
	Message      ChatMessage `json:"message"`
	FinishReason string      `json:"finish_reason"`
}

// ChatCompletionRequest is the request for creating a chat completion.
type ChatCompletionRequest struct {
	Model            string        `json:"model"`
	Messages         []ChatMessage `json:"messages"`
	Temperature      *float64      `json:"temperature,omitempty"`
	MaxTokens        *int          `json:"max_tokens,omitempty"`
	TopP             *float64      `json:"top_p,omitempty"`
	FrequencyPenalty *float64      `json:"frequency_penalty,omitempty"`
	PresencePenalty  *float64      `json:"presence_penalty,omitempty"`
	Stop             []string      `json:"stop,omitempty"`
}

// ChatCompletionResponse is the response from creating a chat completion.
type ChatCompletionResponse struct {
	ID      string       `json:"id"`
	Object  string       `json:"object"`
	Created int64        `json:"created"`
	Model   string       `json:"model"`
	Choices []ChatChoice `json:"choices"`
	Usage   Usage        `json:"usage"`
}

// ============ Embeddings ============

// EmbeddingRequest is the request for creating embeddings.
type EmbeddingRequest struct {
	Model string   `json:"model"`
	Input []string `json:"input"`
}

// EmbeddingData represents a single embedding result.
type EmbeddingData struct {
	Object    string    `json:"object"`
	Embedding []float64 `json:"embedding"`
	Index     int       `json:"index"`
}

// EmbeddingResponse is the response from creating embeddings.
type EmbeddingResponse struct {
	Object string          `json:"object"`
	Data   []EmbeddingData `json:"data"`
	Model  string          `json:"model"`
	Usage  Usage           `json:"usage"`
}

// ============ Images ============

// ImageGenerationRequest is the request for generating images.
type ImageGenerationRequest struct {
	Model   string `json:"model,omitempty"`
	Prompt  string `json:"prompt"`
	N       *int   `json:"n,omitempty"`
	Size    string `json:"size,omitempty"`
	Quality string `json:"quality,omitempty"` // "standard" or "hd"
	Style   string `json:"style,omitempty"`   // "natural" or "vivid"
}

// ImageData represents a generated image.
type ImageData struct {
	URL           string `json:"url,omitempty"`
	B64JSON       string `json:"b64_json,omitempty"`
	RevisedPrompt string `json:"revised_prompt,omitempty"`
}

// ImageGenerationResponse is the response from generating images.
type ImageGenerationResponse struct {
	Created int64       `json:"created"`
	Data    []ImageData `json:"data"`
}

// ============ Audio ============

// AudioSpeechRequest is the request for generating speech.
type AudioSpeechRequest struct {
	Model          string   `json:"model,omitempty"`
	Input          string   `json:"input"`
	Voice          string   `json:"voice,omitempty"`
	ResponseFormat string   `json:"response_format,omitempty"` // "mp3", "opus", "aac", "flac"
	Speed          *float64 `json:"speed,omitempty"`
}

// AudioSpeechResponse is the response from generating speech.
type AudioSpeechResponse struct {
	AudioBase64 string `json:"audio_base64"`
	Format      string `json:"format"`
}

// ============ Training ============

// TrainingConfig represents training configuration.
type TrainingConfig struct {
	Epochs       *int     `json:"epochs,omitempty"`
	LearningRate *float64 `json:"learning_rate,omitempty"`
	BatchSize    *int     `json:"batch_size,omitempty"`
	LoraRank     *int     `json:"lora_rank,omitempty"`
}

// TrainingJobRequest is the request for creating a training job.
type TrainingJobRequest struct {
	Model       string          `json:"model"`
	Dataset     string          `json:"dataset"`
	Config      *TrainingConfig `json:"config,omitempty"`
	CallbackURL string          `json:"callback_url,omitempty"`
}

// TrainingJobResponse is the response from a training job operation.
type TrainingJobResponse struct {
	JobID            string         `json:"job_id"`
	Status           string         `json:"status"`
	Model            string         `json:"model"`
	Dataset          string         `json:"dataset"`
	Config           TrainingConfig `json:"config"`
	EstimatedCostUSD float64        `json:"estimated_cost_usd"`
	CreatedAt        string         `json:"created_at"`
	Progress         *float64       `json:"progress,omitempty"`
	ETAMinutes       *int           `json:"eta_minutes,omitempty"`
}

// TrainingJobsListResponse is the response from listing training jobs.
type TrainingJobsListResponse struct {
	Jobs []TrainingJobResponse `json:"jobs"`
}

// ============ Batch Processing ============

// BatchRequestItem represents a single request in a batch.
type BatchRequestItem struct {
	Model     string `json:"model"`
	Prompt    string `json:"prompt"`
	MaxTokens *int   `json:"max_tokens,omitempty"`
}

// BatchRequest is the request for creating a batch job.
type BatchRequest struct {
	Requests   []BatchRequestItem `json:"requests"`
	WebhookURL string             `json:"webhook_url,omitempty"`
}

// BatchResponse is the response from a batch operation.
type BatchResponse struct {
	BatchID           string                   `json:"batch_id"`
	Status            string                   `json:"status"`
	TotalRequests     int                      `json:"total_requests"`
	CompletedRequests int                      `json:"completed_requests"`
	FailedRequests    int                      `json:"failed_requests"`
	CreatedAt         string                   `json:"created_at"`
	Results           []map[string]interface{} `json:"results,omitempty"`
}

// ============ Models ============

// Model represents an available model.
type Model struct {
	ID              string   `json:"id"`
	Category        string   `json:"category"`
	Provider        string   `json:"provider"`
	ContextLength   *int     `json:"context_length,omitempty"`
	Price1kTokens   *float64 `json:"price_per_1k_tokens,omitempty"`
	LatencyMS       *int     `json:"latency_ms,omitempty"`
}

// ModelsMeta represents metadata about available models.
type ModelsMeta struct {
	Categories  []string `json:"categories"`
	Providers   []string `json:"providers"`
	TotalModels int      `json:"total_models"`
}

// ModelsResponse is the response from listing models.
type ModelsResponse struct {
	Models     []Model    `json:"models"`
	Total      int        `json:"total"`
	Page       int        `json:"page"`
	Limit      int        `json:"limit"`
	TotalPages int        `json:"total_pages"`
	Meta       ModelsMeta `json:"meta"`
}

// ModelsListOptions are options for listing models.
type ModelsListOptions struct {
	Category string
	Provider string
	Search   string
	Page     int
	Limit    int
}

// ModelDeployRequest is the request for deploying a custom model.
type ModelDeployRequest struct {
	ModelName  string                 `json:"model_name"`
	BaseModel  string                 `json:"base_model"`
	ModelType  string                 `json:"model_type,omitempty"` // "lora", "full", "quantized"
	WeightsURL string                 `json:"weights_url,omitempty"`
	Config     map[string]interface{} `json:"config,omitempty"`
}

// ModelDeployResponse is the response from deploying a model.
type ModelDeployResponse struct {
	DeploymentID         string `json:"deployment_id"`
	Status               string `json:"status"`
	ModelName            string `json:"model_name"`
	BaseModel            string `json:"base_model"`
	EstimatedTimeMinutes int    `json:"estimated_time_minutes"`
	CreatedAt            string `json:"created_at"`
}

// ============ Usage ============

// UsageDay represents usage statistics for a single day.
type UsageDay struct {
	Date         string  `json:"date"`
	TotalCost    float64 `json:"total_cost"`
	TotalTokens  int     `json:"total_tokens"`
	RequestCount int     `json:"request_count"`
}

// UsageStats represents usage statistics.
type UsageStats struct {
	PeriodStart   string     `json:"period_start"`
	PeriodEnd     string     `json:"period_end"`
	TotalCost     float64    `json:"total_cost"`
	TotalTokens   int        `json:"total_tokens"`
	TotalRequests int        `json:"total_requests"`
	Daily         []UsageDay `json:"daily"`
}

// UsageOptions are options for getting usage statistics.
type UsageOptions struct {
	StartDate string
	EndDate   string
}

// ============ Devices ============

// Device represents a compute device.
type Device struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	HardwareType string `json:"hardware_type"`
	Status       string `json:"status"`
	ComputeUnits int    `json:"compute_units"`
	Location     string `json:"location,omitempty"`
}

// DevicesResponse is the response from listing devices.
type DevicesResponse struct {
	Devices []Device `json:"devices"`
	Total   int      `json:"total"`
}

// ============ Status ============

// PlatformStatus represents the platform status.
type PlatformStatus struct {
	Status            string            `json:"status"`
	UptimePercentage  float64           `json:"uptime_percentage"`
	ActiveProviders   int               `json:"active_providers"`
	TotalComputeUnits int               `json:"total_compute_units"`
	AvgLatencyMS      int               `json:"avg_latency_ms"`
	Services          map[string]string `json:"services"`
}

// ============ Provider ============

// ProviderRegistration is the request for registering as a provider.
type ProviderRegistration struct {
	Name         string `json:"name"`
	HardwareType string `json:"hardware_type"`
	ComputeUnits int    `json:"compute_units"`
	Location     string `json:"location,omitempty"`
}

// ProviderRegistrationResponse is the response from registering as a provider.
type ProviderRegistrationResponse struct {
	Success    bool   `json:"success"`
	ProviderID string `json:"provider_id"`
	DeviceID   string `json:"device_id"`
}

// ProviderDailyEarnings represents daily earnings for a provider.
type ProviderDailyEarnings struct {
	Date           string  `json:"date"`
	EarnedUSD      float64 `json:"earned_usd"`
	RequestsServed int     `json:"requests_served"`
}

// ProviderEarnings represents provider earnings.
type ProviderEarnings struct {
	TotalEarnedUSD float64                 `json:"total_earned_usd"`
	PendingUSD     float64                 `json:"pending_usd"`
	PaidUSD        float64                 `json:"paid_usd"`
	Daily          []ProviderDailyEarnings `json:"daily"`
}

// ProviderEarningsOptions are options for getting provider earnings.
type ProviderEarningsOptions struct {
	StartDate string
	EndDate   string
}

// ============ Hardware Rental ============

// HardwareRentalRequest is the request for renting hardware.
type HardwareRentalRequest struct {
	GPUType       string `json:"gpu_type"`
	GPUCount      *int   `json:"gpu_count,omitempty"`
	DurationHours *int   `json:"duration_hours,omitempty"`
}

// HardwareRentalResponse is the response from renting hardware.
type HardwareRentalResponse struct {
	RentalID      string  `json:"rental_id"`
	Status        string  `json:"status"`
	GPUType       string  `json:"gpu_type"`
	GPUCount      int     `json:"gpu_count"`
	DurationHours int     `json:"duration_hours"`
	TotalCostUSD  float64 `json:"total_cost_usd"`
	StartedAt     string  `json:"started_at"`
	ExpiresAt     string  `json:"expires_at"`
}
