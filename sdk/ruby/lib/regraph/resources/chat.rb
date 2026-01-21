# frozen_string_literal: true

require_relative 'base'

module ReGraph
  module Resources
    class Chat < Base
      def completions
        @completions ||= Completions.new(client)
      end

      # Convenience method
      def create(**params)
        completions.create(**params)
      end
    end

    class Completions < Base
      # Create a chat completion
      #
      # @param model [String] Model ID to use
      # @param messages [Array<Hash>] Array of message objects
      # @param temperature [Float] Sampling temperature (0-2)
      # @param max_tokens [Integer] Maximum tokens to generate
      # @param top_p [Float] Nucleus sampling parameter
      # @param frequency_penalty [Float] Frequency penalty (-2 to 2)
      # @param presence_penalty [Float] Presence penalty (-2 to 2)
      # @param stop [String, Array<String>] Stop sequences
      # @return [Hash] Chat completion response
      def create(model:, messages:, **options)
        body = {
          model: model,
          messages: messages,
          category: 'llm'
        }.merge(options.compact)

        post('/inference', body: body)
      end
    end
  end
end
