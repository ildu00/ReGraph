# frozen_string_literal: true

module ReGraph
  module Resources
    class Base
      attr_reader :client

      def initialize(client)
        @client = client
      end

      protected

      def get(endpoint, params: {})
        client.get(endpoint, params: params)
      end

      def post(endpoint, body: {})
        client.post(endpoint, body: body)
      end

      def delete(endpoint)
        client.delete(endpoint)
      end
    end
  end
end
