# frozen_string_literal: true

require_relative 'base'

module ReGraph
  module Resources
    class Devices < Base
      # List all available devices
      #
      # @return [Hash] List of devices
      def list
        get('/devices')
      end
    end
  end
end
