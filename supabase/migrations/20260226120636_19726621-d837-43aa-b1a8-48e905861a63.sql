
ALTER TABLE public.model_pricing
  ADD COLUMN IF NOT EXISTS price_per_image numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_per_minute numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_per_video numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pricing_unit text DEFAULT 'token';

COMMENT ON COLUMN public.model_pricing.pricing_unit IS 'token | image | minute | video';

-- Populate from existing notes
UPDATE public.model_pricing SET pricing_unit = 'image', price_per_image = 0.0032 WHERE model_id = 'stability/sdxl-1.0';
UPDATE public.model_pricing SET pricing_unit = 'image', price_per_image = 0.0016 WHERE model_id = 'stability/sdxl-turbo';
UPDATE public.model_pricing SET pricing_unit = 'image', price_per_image = 0.0024 WHERE model_id IN ('playground/playground-v2.5','sber/kandinsky-3');
UPDATE public.model_pricing SET pricing_unit = 'image', price_per_image = 0.0032 WHERE model_id = 'stability/controlnet-sdxl';
UPDATE public.model_pricing SET pricing_unit = 'image', price_per_image = 0.0024 WHERE model_id = 'stability/instruct-pix2pix';
UPDATE public.model_pricing SET pricing_unit = 'minute', price_per_minute = 0.0048 WHERE model_id = 'openai/whisper-large-v3';
UPDATE public.model_pricing SET pricing_unit = 'minute', price_per_minute = 0.0024 WHERE model_id = 'nvidia/canary-1b';
UPDATE public.model_pricing SET pricing_unit = 'minute', price_per_minute = 0.0032 WHERE model_id = 'meta/seamless-m4t';
UPDATE public.model_pricing SET pricing_unit = 'minute', price_per_minute = 0.008 WHERE model_id = 'suno/bark';
UPDATE public.model_pricing SET pricing_unit = 'minute', price_per_minute = 0.0064 WHERE model_id = 'coqui/xtts-v2';
UPDATE public.model_pricing SET pricing_unit = 'minute', price_per_minute = 0.012 WHERE model_id = 'elevenlabs/eleven-turbo';
UPDATE public.model_pricing SET pricing_unit = 'video', price_per_video = 0.04 WHERE model_id = 'stability/stable-video';
UPDATE public.model_pricing SET pricing_unit = 'video', price_per_video = 0.024 WHERE model_id = 'community/animatediff';
