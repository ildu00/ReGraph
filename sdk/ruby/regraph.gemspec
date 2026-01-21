# frozen_string_literal: true

require_relative 'lib/regraph/version'

Gem::Specification.new do |spec|
  spec.name          = 'regraph'
  spec.version       = ReGraph::VERSION
  spec.authors       = ['ReGraph']
  spec.email         = ['support@regraph.tech']

  spec.summary       = 'Ruby SDK for ReGraph - Decentralized AI Compute Marketplace'
  spec.description   = 'OpenAI-compatible Ruby client for the ReGraph API. Access 50+ AI models with up to 90% cost savings through decentralized compute.'
  spec.homepage      = 'https://github.com/ildu00/ReGraph'
  spec.license       = 'MIT'
  spec.required_ruby_version = '>= 2.7.0'

  spec.metadata['homepage_uri'] = spec.homepage
  spec.metadata['source_code_uri'] = 'https://github.com/ildu00/ReGraph/tree/main/sdk/ruby'
  spec.metadata['documentation_uri'] = 'https://regraph.tech/docs'
  spec.metadata['changelog_uri'] = 'https://github.com/ildu00/ReGraph/blob/main/sdk/ruby/CHANGELOG.md'

  spec.files = Dir.chdir(__dir__) do
    Dir['{lib}/**/*', 'LICENSE', 'README.md', 'CHANGELOG.md']
  end

  spec.require_paths = ['lib']

  # No runtime dependencies - zero-deps design
end
