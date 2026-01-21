# frozen_string_literal: true

require_relative 'base'

module ReGraph
  module Resources
    class Images < Base
      # Generate images from a text prompt
      #
      # @param prompt [String] Text description of the desired image
      # @param model [String] Model ID to use (default: dall-e-3)
      # @param n [Integer] Number of images to generate
      # @param size [String] Image size (e.g., "1024x1024")
      # @param quality [String] Image quality ("standard" or "hd")
      # @param style [String] Image style ("natural" or "vivid")
      # @return [Hash] Image generation response
      def generate(prompt:, model: 'dall-e-3', **options)
        body = {
          model: model,
          prompt: prompt,
          category: 'image'
        }.merge(options.compact)

        post('/inference', body: body)
      end
    end
  end
end
