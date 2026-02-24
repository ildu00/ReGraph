# frozen_string_literal: true

require_relative 'base'

module ReGraph
  module Resources
    class Embeddings < Base
      # Create embeddings for the given input
      #
      # @param model [String] Model ID to use
      # @param input [String, Array<String>] Text to embed
      # @return [Hash] Embedding response
      def create(model:, input:, **options)
        body = {
          model: model,
          input: input
        }.merge(options.compact)

        post('/embeddings', body: body)
      end
    end
  end
end
