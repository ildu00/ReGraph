/**
 * ReGraph SDK - Error Classes
 */

export class ReGraphError extends Error {
  public statusCode?: number;
  public response?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode?: number,
    response?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ReGraphError';
    this.statusCode = statusCode;
    this.response = response;
  }
}

export class AuthenticationError extends ReGraphError {
  constructor(message: string, statusCode?: number) {
    super(message, statusCode);
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends ReGraphError {
  constructor(message: string, statusCode?: number) {
    super(message, statusCode);
    this.name = 'RateLimitError';
  }
}
