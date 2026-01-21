# frozen_string_literal: true

require 'net/http'
require 'uri'
require 'json'

require_relative 'regraph/version'
require_relative 'regraph/errors'
require_relative 'regraph/client'
require_relative 'regraph/resources/chat'
require_relative 'regraph/resources/embeddings'
require_relative 'regraph/resources/images'
require_relative 'regraph/resources/audio'
require_relative 'regraph/resources/models'
require_relative 'regraph/resources/training'
require_relative 'regraph/resources/batch'
require_relative 'regraph/resources/usage'
require_relative 'regraph/resources/devices'
require_relative 'regraph/resources/status'
require_relative 'regraph/resources/provider'
require_relative 'regraph/resources/hardware'

module ReGraph
  class << self
    attr_accessor :api_key, :base_url, :timeout

    def configure
      yield self
    end

    def client
      @client ||= Client.new(
        api_key: api_key,
        base_url: base_url,
        timeout: timeout
      )
    end

    def reset_client!
      @client = nil
    end
  end

  self.base_url = 'https://api.regraph.tech/v1'
  self.timeout = 60
end
