# frozen_string_literal: true

require_relative 'base'

module ReGraph
  module Resources
    class Usage < Base
      # Get usage statistics
      #
      # @param start_date [String] Start date (YYYY-MM-DD)
      # @param end_date [String] End date (YYYY-MM-DD)
      # @return [Hash] Usage statistics
      def get(start_date: nil, end_date: nil)
        params = {
          start_date: start_date,
          end_date: end_date
        }.compact

        client.get('/usage', params: params)
      end
    end
  end
end
