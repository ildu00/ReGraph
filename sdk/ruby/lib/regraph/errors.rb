# frozen_string_literal: true

module ReGraph
  # Base error class for all ReGraph errors
  class Error < StandardError
    attr_reader :status_code, :response_body

    def initialize(message = nil, status_code: nil, response_body: nil)
      @status_code = status_code
      @response_body = response_body
      super(message)
    end
  end

  # Raised when authentication fails (401)
  class AuthenticationError < Error
    def initialize(message = 'Invalid API key')
      super(message, status_code: 401)
    end
  end

  # Raised when rate limit is exceeded (429)
  class RateLimitError < Error
    attr_reader :retry_after

    def initialize(message = 'Rate limit exceeded', retry_after: nil)
      @retry_after = retry_after
      super(message, status_code: 429)
    end
  end

  # Raised for bad requests (400)
  class BadRequestError < Error
    def initialize(message = 'Bad request')
      super(message, status_code: 400)
    end
  end

  # Raised when resource is not found (404)
  class NotFoundError < Error
    def initialize(message = 'Resource not found')
      super(message, status_code: 404)
    end
  end

  # Raised for server errors (500+)
  class ServerError < Error
    def initialize(message = 'Internal server error', status_code: 500)
      super(message, status_code: status_code)
    end
  end

  # Raised for connection/network errors
  class ConnectionError < Error
    def initialize(message = 'Connection failed')
      super(message)
    end
  end

  # Raised for timeout errors
  class TimeoutError < Error
    def initialize(message = 'Request timed out')
      super(message)
    end
  end
end
