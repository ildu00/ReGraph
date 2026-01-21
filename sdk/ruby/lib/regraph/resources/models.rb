# frozen_string_literal: true

require_relative 'base'

module ReGraph
  module Resources
    class Models < Base
      # List available models
      #
      # @param category [String] Filter by category (llm, image, embeddings, tts)
      # @param provider [String] Filter by provider
      # @param search [String] Search query
      # @param page [Integer] Page number
      # @param limit [Integer] Results per page
      # @return [Hash] Models list response
      def list(category: nil, provider: nil, search: nil, page: nil, limit: nil)
        params = {
          category: category,
          provider: provider,
          search: search,
          page: page,
          limit: limit
        }.compact

        get('/models', params: params)
      end

      # Deploy a custom model
      #
      # @param model_name [String] Name for the deployed model
      # @param base_model [String] Base model ID
      # @param model_type [String] Type of model (lora, full)
      # @param weights_url [String] URL to model weights
      # @return [Hash] Deployment response
      def deploy(model_name:, base_model:, model_type: 'lora', **options)
        body = {
          model_name: model_name,
          base_model: base_model,
          model_type: model_type
        }.merge(options.compact)

        post('/models/deploy', body: body)
      end
    end
  end
end
