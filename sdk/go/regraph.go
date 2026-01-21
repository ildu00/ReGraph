// Package regraph provides a Go client for the ReGraph decentralized AI compute marketplace API.
//
// The client is OpenAI-compatible, making it easy to integrate with existing applications.
//
// Example usage:
//
//	client := regraph.NewClient("your-api-key")
//
//	resp, err := client.Chat.Completions.Create(context.Background(), regraph.ChatCompletionRequest{
//		Model: "gpt-5",
//		Messages: []regraph.ChatMessage{
//			{Role: "user", Content: "Hello!"},
//		},
//	})
//	if err != nil {
//		log.Fatal(err)
//	}
//	fmt.Println(resp.Choices[0].Message.Content)
package regraph

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

const (
	DefaultBaseURL = "https://api.regraph.tech/v1"
	DefaultTimeout = 60 * time.Second
)

// Client is the main ReGraph API client.
type Client struct {
	apiKey     string
	baseURL    string
	httpClient *http.Client

	// API namespaces
	Chat      *ChatService
	Embeddings *EmbeddingsService
	Images    *ImagesService
	Audio     *AudioService
	Models    *ModelsService
	Training  *TrainingService
	Batch     *BatchService
	Usage     *UsageService
	Devices   *DevicesService
	Status    *StatusService
	Provider  *ProviderService
	Hardware  *HardwareService
}

// ClientOption is a function that configures the client.
type ClientOption func(*Client)

// WithBaseURL sets a custom base URL for the API.
func WithBaseURL(baseURL string) ClientOption {
	return func(c *Client) {
		c.baseURL = baseURL
	}
}

// WithTimeout sets a custom timeout for API requests.
func WithTimeout(timeout time.Duration) ClientOption {
	return func(c *Client) {
		c.httpClient.Timeout = timeout
	}
}

// WithHTTPClient sets a custom HTTP client.
func WithHTTPClient(httpClient *http.Client) ClientOption {
	return func(c *Client) {
		c.httpClient = httpClient
	}
}

// NewClient creates a new ReGraph API client.
func NewClient(apiKey string, opts ...ClientOption) *Client {
	c := &Client{
		apiKey:  apiKey,
		baseURL: DefaultBaseURL,
		httpClient: &http.Client{
			Timeout: DefaultTimeout,
		},
	}

	for _, opt := range opts {
		opt(c)
	}

	// Initialize services
	c.Chat = &ChatService{client: c}
	c.Embeddings = &EmbeddingsService{client: c}
	c.Images = &ImagesService{client: c}
	c.Audio = &AudioService{client: c}
	c.Models = &ModelsService{client: c}
	c.Training = &TrainingService{client: c}
	c.Batch = &BatchService{client: c}
	c.Usage = &UsageService{client: c}
	c.Devices = &DevicesService{client: c}
	c.Status = &StatusService{client: c}
	c.Provider = &ProviderService{client: c}
	c.Hardware = &HardwareService{client: c}

	return c
}

// request makes an HTTP request to the API.
func (c *Client) request(ctx context.Context, method, endpoint string, body, result interface{}, params map[string]string) error {
	u, err := url.Parse(c.baseURL + endpoint)
	if err != nil {
		return fmt.Errorf("invalid URL: %w", err)
	}

	if params != nil {
		q := u.Query()
		for k, v := range params {
			q.Set(k, v)
		}
		u.RawQuery = q.Encode()
	}

	var bodyReader io.Reader
	if body != nil {
		jsonBody, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("failed to marshal request body: %w", err)
		}
		bodyReader = bytes.NewReader(jsonBody)
	}

	req, err := http.NewRequestWithContext(ctx, method, u.String(), bodyReader)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response body: %w", err)
	}

	if resp.StatusCode >= 400 {
		var apiErr APIError
		if err := json.Unmarshal(respBody, &apiErr); err != nil {
			apiErr.Message = string(respBody)
		}
		apiErr.StatusCode = resp.StatusCode
		return &apiErr
	}

	if result != nil && len(respBody) > 0 {
		if err := json.Unmarshal(respBody, result); err != nil {
			return fmt.Errorf("failed to unmarshal response: %w", err)
		}
	}

	return nil
}
