package regraph

import (
	"context"
	"strconv"
)

// ============ Chat Service ============

// ChatService handles chat completion operations.
type ChatService struct {
	client      *Client
	Completions *CompletionsService
}

// CompletionsService handles chat completion operations.
type CompletionsService struct {
	client *Client
}

func init() {}

// Create creates a new chat completion.
func (s *ChatService) Create(ctx context.Context, req ChatCompletionRequest) (*ChatCompletionResponse, error) {
	return s.client.Chat.Completions.Create(ctx, req)
}

// ============ Completions Service ============

// Create creates a new chat completion.
func (s *CompletionsService) Create(ctx context.Context, req ChatCompletionRequest) (*ChatCompletionResponse, error) {
	var resp ChatCompletionResponse
	err := s.client.request(ctx, "POST", "/inference", req, &resp, nil)
	if err != nil {
		return nil, err
	}
	return &resp, nil
}

// ============ Embeddings Service ============

// EmbeddingsService handles embedding operations.
type EmbeddingsService struct {
	client *Client
}

// Create creates embeddings for the given input.
func (s *EmbeddingsService) Create(ctx context.Context, req EmbeddingRequest) (*EmbeddingResponse, error) {
	payload := map[string]interface{}{
		"model":    req.Model,
		"input":    req.Input,
		"category": "embeddings",
	}
	var resp EmbeddingResponse
	err := s.client.request(ctx, "POST", "/inference", payload, &resp, nil)
	if err != nil {
		return nil, err
	}
	return &resp, nil
}

// ============ Images Service ============

// ImagesService handles image generation operations.
type ImagesService struct {
	client *Client
}

// Generate generates images from a text prompt.
func (s *ImagesService) Generate(ctx context.Context, req ImageGenerationRequest) (*ImageGenerationResponse, error) {
	if req.Model == "" {
		req.Model = "dall-e-3"
	}
	payload := map[string]interface{}{
		"model":    req.Model,
		"prompt":   req.Prompt,
		"category": "image",
	}
	if req.N != nil {
		payload["n"] = *req.N
	}
	if req.Size != "" {
		payload["size"] = req.Size
	}
	if req.Quality != "" {
		payload["quality"] = req.Quality
	}
	if req.Style != "" {
		payload["style"] = req.Style
	}
	var resp ImageGenerationResponse
	err := s.client.request(ctx, "POST", "/inference", payload, &resp, nil)
	if err != nil {
		return nil, err
	}
	return &resp, nil
}

// ============ Audio Service ============

// AudioService handles audio operations.
type AudioService struct {
	client *Client
}

// Speech generates speech from text.
func (s *AudioService) Speech(ctx context.Context, req AudioSpeechRequest) (*AudioSpeechResponse, error) {
	if req.Model == "" {
		req.Model = "tts-1"
	}
	if req.Voice == "" {
		req.Voice = "alloy"
	}
	if req.ResponseFormat == "" {
		req.ResponseFormat = "mp3"
	}
	if req.Speed == nil {
		speed := 1.0
		req.Speed = &speed
	}
	var resp AudioSpeechResponse
	err := s.client.request(ctx, "POST", "/audio/speech", req, &resp, nil)
	if err != nil {
		return nil, err
	}
	return &resp, nil
}

// ============ Models Service ============

// ModelsService handles model operations.
type ModelsService struct {
	client *Client
}

// List lists available models.
func (s *ModelsService) List(ctx context.Context, opts *ModelsListOptions) (*ModelsResponse, error) {
	params := make(map[string]string)
	if opts != nil {
		if opts.Category != "" {
			params["category"] = opts.Category
		}
		if opts.Provider != "" {
			params["provider"] = opts.Provider
		}
		if opts.Search != "" {
			params["search"] = opts.Search
		}
		if opts.Page > 0 {
			params["page"] = strconv.Itoa(opts.Page)
		}
		if opts.Limit > 0 {
			params["limit"] = strconv.Itoa(opts.Limit)
		}
	}
	var resp ModelsResponse
	err := s.client.request(ctx, "GET", "/models", nil, &resp, params)
	if err != nil {
		return nil, err
	}
	return &resp, nil
}

// Deploy deploys a custom model.
func (s *ModelsService) Deploy(ctx context.Context, req ModelDeployRequest) (*ModelDeployResponse, error) {
	var resp ModelDeployResponse
	err := s.client.request(ctx, "POST", "/models/deploy", req, &resp, nil)
	if err != nil {
		return nil, err
	}
	return &resp, nil
}

// ============ Training Service ============

// TrainingService handles training operations.
type TrainingService struct {
	client *Client
	Jobs   *TrainingJobsService
}

// TrainingJobsService handles training job operations.
type TrainingJobsService struct {
	client *Client
}

// Create creates a new training job.
func (s *TrainingJobsService) Create(ctx context.Context, req TrainingJobRequest) (*TrainingJobResponse, error) {
	var resp TrainingJobResponse
	err := s.client.request(ctx, "POST", "/training/jobs", req, &resp, nil)
	if err != nil {
		return nil, err
	}
	return &resp, nil
}

// Get gets a training job by ID.
func (s *TrainingJobsService) Get(ctx context.Context, jobID string) (*TrainingJobResponse, error) {
	var resp TrainingJobResponse
	err := s.client.request(ctx, "GET", "/training/jobs/"+jobID, nil, &resp, nil)
	if err != nil {
		return nil, err
	}
	return &resp, nil
}

// List lists all training jobs.
func (s *TrainingJobsService) List(ctx context.Context) (*TrainingJobsListResponse, error) {
	var resp TrainingJobsListResponse
	err := s.client.request(ctx, "GET", "/training/jobs", nil, &resp, nil)
	if err != nil {
		return nil, err
	}
	return &resp, nil
}

// Cancel cancels a training job.
func (s *TrainingJobsService) Cancel(ctx context.Context, jobID string) error {
	return s.client.request(ctx, "DELETE", "/training/jobs/"+jobID, nil, nil, nil)
}

// ============ Batch Service ============

// BatchService handles batch processing operations.
type BatchService struct {
	client *Client
}

// Create creates a new batch job.
func (s *BatchService) Create(ctx context.Context, req BatchRequest) (*BatchResponse, error) {
	var resp BatchResponse
	err := s.client.request(ctx, "POST", "/batch", req, &resp, nil)
	if err != nil {
		return nil, err
	}
	return &resp, nil
}

// Get gets a batch job by ID.
func (s *BatchService) Get(ctx context.Context, batchID string) (*BatchResponse, error) {
	var resp BatchResponse
	err := s.client.request(ctx, "GET", "/batch/"+batchID, nil, &resp, nil)
	if err != nil {
		return nil, err
	}
	return &resp, nil
}

// ============ Usage Service ============

// UsageService handles usage statistics operations.
type UsageService struct {
	client *Client
}

// Get gets usage statistics.
func (s *UsageService) Get(ctx context.Context, opts *UsageOptions) (*UsageStats, error) {
	params := make(map[string]string)
	if opts != nil {
		if opts.StartDate != "" {
			params["start_date"] = opts.StartDate
		}
		if opts.EndDate != "" {
			params["end_date"] = opts.EndDate
		}
	}
	var resp UsageStats
	err := s.client.request(ctx, "GET", "/usage", nil, &resp, params)
	if err != nil {
		return nil, err
	}
	return &resp, nil
}

// ============ Devices Service ============

// DevicesService handles device operations.
type DevicesService struct {
	client *Client
}

// List lists all devices.
func (s *DevicesService) List(ctx context.Context) (*DevicesResponse, error) {
	var resp DevicesResponse
	err := s.client.request(ctx, "GET", "/devices", nil, &resp, nil)
	if err != nil {
		return nil, err
	}
	return &resp, nil
}

// ============ Status Service ============

// StatusService handles platform status operations.
type StatusService struct {
	client *Client
}

// Get gets the platform status.
func (s *StatusService) Get(ctx context.Context) (*PlatformStatus, error) {
	var resp PlatformStatus
	err := s.client.request(ctx, "GET", "/status", nil, &resp, nil)
	if err != nil {
		return nil, err
	}
	return &resp, nil
}

// ============ Provider Service ============

// ProviderService handles provider operations.
type ProviderService struct {
	client *Client
}

// Register registers as a hardware provider.
func (s *ProviderService) Register(ctx context.Context, req ProviderRegistration) (*ProviderRegistrationResponse, error) {
	var resp ProviderRegistrationResponse
	err := s.client.request(ctx, "POST", "/provider/register", req, &resp, nil)
	if err != nil {
		return nil, err
	}
	return &resp, nil
}

// Earnings gets provider earnings.
func (s *ProviderService) Earnings(ctx context.Context, opts *ProviderEarningsOptions) (*ProviderEarnings, error) {
	params := make(map[string]string)
	if opts != nil {
		if opts.StartDate != "" {
			params["start_date"] = opts.StartDate
		}
		if opts.EndDate != "" {
			params["end_date"] = opts.EndDate
		}
	}
	var resp ProviderEarnings
	err := s.client.request(ctx, "GET", "/provider/earnings", nil, &resp, params)
	if err != nil {
		return nil, err
	}
	return &resp, nil
}

// ============ Hardware Service ============

// HardwareService handles hardware rental operations.
type HardwareService struct {
	client *Client
}

// Rent rents hardware resources.
func (s *HardwareService) Rent(ctx context.Context, req HardwareRentalRequest) (*HardwareRentalResponse, error) {
	if req.GPUCount == nil {
		count := 1
		req.GPUCount = &count
	}
	if req.DurationHours == nil {
		hours := 1
		req.DurationHours = &hours
	}
	var resp HardwareRentalResponse
	err := s.client.request(ctx, "POST", "/hardware/rent", req, &resp, nil)
	if err != nil {
		return nil, err
	}
	return &resp, nil
}
