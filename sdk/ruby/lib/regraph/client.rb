# frozen_string_literal: true

module ReGraph
  class Client
    attr_reader :api_key, :base_url, :timeout

    def initialize(api_key:, base_url: nil, timeout: nil)
      @api_key = api_key || ENV['REGRAPH_API_KEY']
      @base_url = base_url || ReGraph.base_url || 'https://api.regraph.tech/v1'
      @timeout = timeout || ReGraph.timeout || 60

      raise ArgumentError, 'API key is required' if @api_key.nil? || @api_key.empty?
    end

    # Resource accessors
    def chat
      @chat ||= Resources::Chat.new(self)
    end

    def embeddings
      @embeddings ||= Resources::Embeddings.new(self)
    end

    def images
      @images ||= Resources::Images.new(self)
    end

    def audio
      @audio ||= Resources::Audio.new(self)
    end

    def models
      @models ||= Resources::Models.new(self)
    end

    def training
      @training ||= Resources::Training.new(self)
    end

    def batch
      @batch ||= Resources::Batch.new(self)
    end

    def usage
      @usage ||= Resources::Usage.new(self)
    end

    def devices
      @devices ||= Resources::Devices.new(self)
    end

    def status
      @status ||= Resources::Status.new(self)
    end

    def provider
      @provider ||= Resources::Provider.new(self)
    end

    def hardware
      @hardware ||= Resources::Hardware.new(self)
    end

    # HTTP request methods
    def get(endpoint, params: {})
      request(:get, endpoint, params: params)
    end

    def post(endpoint, body: {})
      request(:post, endpoint, body: body)
    end

    def delete(endpoint)
      request(:delete, endpoint)
    end

    private

    def request(method, endpoint, params: {}, body: nil)
      uri = build_uri(endpoint, params)
      http = build_http(uri)
      request = build_request(method, uri, body)

      response = http.request(request)
      handle_response(response)
    rescue Net::OpenTimeout, Net::ReadTimeout
      raise TimeoutError
    rescue SocketError, Errno::ECONNREFUSED, Errno::ECONNRESET
      raise ConnectionError
    end

    def build_uri(endpoint, params)
      uri = URI.parse("#{@base_url}#{endpoint}")
      uri.query = URI.encode_www_form(params) unless params.empty?
      uri
    end

    def build_http(uri)
      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = uri.scheme == 'https'
      http.open_timeout = @timeout
      http.read_timeout = @timeout
      http
    end

    def build_request(method, uri, body)
      request_class = case method
                      when :get then Net::HTTP::Get
                      when :post then Net::HTTP::Post
                      when :delete then Net::HTTP::Delete
                      else raise ArgumentError, "Unsupported HTTP method: #{method}"
                      end

      request = request_class.new(uri)
      request['Authorization'] = "Bearer #{@api_key}"
      request['Content-Type'] = 'application/json'
      request['User-Agent'] = "regraph-ruby/#{VERSION}"

      request.body = body.to_json if body && !body.empty?
      request
    end

    def handle_response(response)
      body = parse_response_body(response)

      case response.code.to_i
      when 200..299
        body
      when 401
        raise AuthenticationError, body['error'] || 'Invalid API key'
      when 429
        retry_after = response['Retry-After']&.to_i
        raise RateLimitError.new(body['error'] || 'Rate limit exceeded', retry_after: retry_after)
      when 400
        raise BadRequestError, body['error'] || 'Bad request'
      when 404
        raise NotFoundError, body['error'] || 'Resource not found'
      when 500..599
        raise ServerError.new(body['error'] || 'Server error', status_code: response.code.to_i)
      else
        raise Error.new(body['error'] || 'Unknown error', status_code: response.code.to_i, response_body: body)
      end
    end

    def parse_response_body(response)
      return {} if response.body.nil? || response.body.empty?

      JSON.parse(response.body)
    rescue JSON::ParserError
      { 'raw' => response.body }
    end
  end
end
