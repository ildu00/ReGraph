# frozen_string_literal: true

require_relative 'base'

module ReGraph
  module Resources
    class Hardware < Base
      # Rent hardware resources
      #
      # @param gpu_type [String] Type of GPU to rent
      # @param gpu_count [Integer] Number of GPUs (default: 1)
      # @param duration_hours [Integer] Rental duration in hours (default: 1)
      # @return [Hash] Rental response
      def rent(gpu_type:, gpu_count: 1, duration_hours: 1)
        body = {
          gpu_type: gpu_type,
          gpu_count: gpu_count,
          duration_hours: duration_hours
        }

        post('/hardware/rent', body: body)
      end
    end
  end
end
