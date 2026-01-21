# frozen_string_literal: true

require_relative 'base'

module ReGraph
  module Resources
    class Batch < Base
      # Create a new batch job
      #
      # @param requests [Array<Hash>] Array of request objects
      # @param webhook_url [String] URL for completion notification
      # @return [Hash] Batch job response
      def create(requests:, webhook_url: nil)
        body = {
          requests: requests,
          webhook_url: webhook_url
        }.compact

        post('/batch', body: body)
      end

      # Get a batch job by ID
      #
      # @param batch_id [String] Batch job ID
      # @return [Hash] Batch job details
      def retrieve(batch_id)
        get("/batch/#{batch_id}")
      end
    end
  end
end
