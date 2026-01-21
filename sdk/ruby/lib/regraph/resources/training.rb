# frozen_string_literal: true

require_relative 'base'

module ReGraph
  module Resources
    class Training < Base
      def jobs
        @jobs ||= TrainingJobs.new(client)
      end
    end

    class TrainingJobs < Base
      # Create a new training job
      #
      # @param model [String] Base model to fine-tune
      # @param dataset [String] Dataset URL or ID
      # @param config [Hash] Training configuration
      # @param callback_url [String] Webhook URL for status updates
      # @return [Hash] Training job response
      def create(model:, dataset:, config: nil, callback_url: nil)
        body = {
          model: model,
          dataset: dataset,
          config: config,
          callback_url: callback_url
        }.compact

        post('/training/jobs', body: body)
      end

      # Get a training job by ID
      #
      # @param job_id [String] Training job ID
      # @return [Hash] Training job details
      def retrieve(job_id)
        get("/training/jobs/#{job_id}")
      end

      # List all training jobs
      #
      # @return [Hash] List of training jobs
      def list
        get('/training/jobs')
      end

      # Cancel a training job
      #
      # @param job_id [String] Training job ID
      # @return [Hash] Cancellation response
      def cancel(job_id)
        delete("/training/jobs/#{job_id}")
      end
    end
  end
end
