# frozen_string_literal: true

require_relative 'base'

module ReGraph
  module Resources
    class Audio < Base
      # Generate speech from text
      #
      # @param input [String] Text to convert to speech
      # @param model [String] Model ID to use (default: tts-1)
      # @param voice [String] Voice to use (default: alloy)
      # @param response_format [String] Audio format (default: mp3)
      # @param speed [Float] Speech speed (0.25 to 4.0)
      # @return [Hash] Audio response with base64 encoded audio
      def speech(input:, model: 'tts-1', voice: 'alloy', response_format: 'mp3', speed: 1.0)
        body = {
          model: model,
          input: input,
          voice: voice,
          response_format: response_format,
          speed: speed
        }

        post('/audio/speech', body: body)
      end
    end
  end
end
