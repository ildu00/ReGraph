
-- Add advanced pricing fields to model_pricing
ALTER TABLE public.model_pricing
  ADD COLUMN IF NOT EXISTS price_per_1k_cache_write_tokens numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_per_1k_cache_read_tokens numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS context_window integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS provider text DEFAULT '',
  ADD COLUMN IF NOT EXISTS description text DEFAULT '',
  ADD COLUMN IF NOT EXISTS supports_cache boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS supports_vision boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS supports_function_calling boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_output_tokens integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes text DEFAULT '';

-- Update existing models with richer data based on screenshot prices
-- GPT-5 Mini: Input $0.10/1M = $0.0001/1K, Output $0.40/1M = $0.0004/1K
UPDATE public.model_pricing SET
  price_per_1k_input_tokens = 0.0001,
  price_per_1k_output_tokens = 0.0004,
  price_per_1k_cache_write_tokens = 0.000125,
  price_per_1k_cache_read_tokens = 0.000005,
  context_window = 128000,
  provider = 'openai',
  description = 'Fast, affordable small model for focused tasks',
  supports_cache = true,
  supports_vision = true,
  supports_function_calling = true,
  max_output_tokens = 16384
WHERE model_id ILIKE '%gpt-5-mini%' OR model_id ILIKE '%gpt5-mini%';

-- GPT-5: Input $5.00/1M = $0.005/1K, Output $15.00/1M = $0.015/1K (ReGraph price from screenshot)
UPDATE public.model_pricing SET
  price_per_1k_input_tokens = 0.005,
  price_per_1k_output_tokens = 0.015,
  price_per_1k_cache_write_tokens = 0.00625,
  price_per_1k_cache_read_tokens = 0.0005,
  context_window = 128000,
  provider = 'openai',
  description = 'Powerful all-rounder with excellent reasoning and multimodal capabilities',
  supports_cache = true,
  supports_vision = true,
  supports_function_calling = true,
  max_output_tokens = 16384
WHERE model_id ILIKE '%gpt-5%' AND model_id NOT ILIKE '%mini%' AND model_id NOT ILIKE '%nano%' AND model_id NOT ILIKE '%1%' AND model_id NOT ILIKE '%2%';

-- Gemini 2.5 Flash: Input $0.10/1M, Output $0.60/1M
UPDATE public.model_pricing SET
  price_per_1k_input_tokens = 0.0001,
  price_per_1k_output_tokens = 0.0006,
  price_per_1k_cache_write_tokens = 0.000025,
  price_per_1k_cache_read_tokens = 0.0000025,
  context_window = 1000000,
  provider = 'google',
  description = 'Fast and efficient model balanced for speed and quality',
  supports_cache = true,
  supports_vision = true,
  supports_function_calling = true,
  max_output_tokens = 8192
WHERE model_id ILIKE '%gemini%flash%' AND model_id NOT ILIKE '%lite%';

-- Gemini 2.5 Pro: Input $1.30/1M, Output $5.00/1M
UPDATE public.model_pricing SET
  price_per_1k_input_tokens = 0.0013,
  price_per_1k_output_tokens = 0.005,
  price_per_1k_cache_write_tokens = 0.003125,
  price_per_1k_cache_read_tokens = 0.0003125,
  context_window = 1000000,
  provider = 'google',
  description = 'Top-tier Gemini model with strongest reasoning and multimodal capabilities',
  supports_cache = true,
  supports_vision = true,
  supports_function_calling = true,
  max_output_tokens = 8192
WHERE model_id ILIKE '%gemini%pro%' AND model_id NOT ILIKE '%flash%';

-- Claude 4.5 Sonnet: Input $3.00/1M, Output $15.00/1M
UPDATE public.model_pricing SET
  price_per_1k_input_tokens = 0.003,
  price_per_1k_output_tokens = 0.015,
  price_per_1k_cache_write_tokens = 0.00375,
  price_per_1k_cache_read_tokens = 0.0003,
  context_window = 200000,
  provider = 'anthropic',
  description = 'Intelligent model ideal for complex tasks requiring deep reasoning',
  supports_cache = true,
  supports_vision = true,
  supports_function_calling = true,
  max_output_tokens = 8192
WHERE model_id ILIKE '%claude%sonnet%';

-- Claude 4.5 Opus: Input $15.00/1M, Output $75.00/1M
UPDATE public.model_pricing SET
  price_per_1k_input_tokens = 0.015,
  price_per_1k_output_tokens = 0.075,
  price_per_1k_cache_write_tokens = 0.01875,
  price_per_1k_cache_read_tokens = 0.0015,
  context_window = 200000,
  provider = 'anthropic',
  description = 'Most intelligent Claude model for building agents and complex coding',
  supports_cache = true,
  supports_vision = true,
  supports_function_calling = true,
  max_output_tokens = 32768
WHERE model_id ILIKE '%claude%opus%';
