# frozen_string_literal: true

require_relative 'base'

module ReGraph
  module Resources
    class Status < Base
      # Get platform status
      #
      # @return [Hash] Platform status information
      def get
        client.get('/status')
      end
    end
  end
end
