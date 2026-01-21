package regraph

import "fmt"

// APIError represents an error returned by the ReGraph API.
type APIError struct {
	Message    string `json:"error"`
	StatusCode int    `json:"-"`
}

// Error implements the error interface.
func (e *APIError) Error() string {
	return fmt.Sprintf("regraph: %s (status %d)", e.Message, e.StatusCode)
}

// IsAuthenticationError returns true if the error is an authentication error (401).
func (e *APIError) IsAuthenticationError() bool {
	return e.StatusCode == 401
}

// IsRateLimitError returns true if the error is a rate limit error (429).
func (e *APIError) IsRateLimitError() bool {
	return e.StatusCode == 429
}

// IsNotFoundError returns true if the error is a not found error (404).
func (e *APIError) IsNotFoundError() bool {
	return e.StatusCode == 404
}

// IsBadRequestError returns true if the error is a bad request error (400).
func (e *APIError) IsBadRequestError() bool {
	return e.StatusCode == 400
}
