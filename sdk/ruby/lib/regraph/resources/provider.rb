# frozen_string_literal: true

require_relative 'base'

module ReGraph
  module Resources
    class Provider < Base
      # Register as a hardware provider
      #
      # @param device_name [String] Name of the device
      # @param device_type [String] Type of device (gpu, tpu, npu, cpu)
      # @param device_model [String] Device model (e.g., "RTX 4090")
      # @param vram_gb [Integer] VRAM in gigabytes
      # @param price_per_hour [Float] Hourly rate in USD
      # @return [Hash] Registration response
      def register(device_name:, device_type:, device_model: nil, vram_gb: nil, price_per_hour: nil)
        body = {
          device_name: device_name,
          device_type: device_type,
          device_model: device_model,
          vram_gb: vram_gb,
          price_per_hour: price_per_hour
        }.compact

        post('/provider/register', body: body)
      end

      # Get provider earnings
      #
      # @param start_date [String] Start date (YYYY-MM-DD)
      # @param end_date [String] End date (YYYY-MM-DD)
      # @return [Hash] Earnings data
      def earnings(start_date: nil, end_date: nil)
        params = {
          start_date: start_date,
          end_date: end_date
        }.compact

        get('/provider/earnings', params: params)
      end
    end
  end
end
