
-- GPU hourly pricing
CREATE TABLE public.gpu_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gpu_type TEXT NOT NULL UNIQUE,
  price_per_hour NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gpu_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage gpu pricing" ON public.gpu_pricing FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view gpu pricing" ON public.gpu_pricing FOR SELECT
  USING (true);

-- Model per-request pricing
CREATE TABLE public.model_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'chat',
  price_per_1k_input_tokens NUMERIC NOT NULL DEFAULT 0,
  price_per_1k_output_tokens NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.model_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage model pricing" ON public.model_pricing FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view model pricing" ON public.model_pricing FOR SELECT
  USING (true);

-- Seed GPU pricing from hardware-rent function
INSERT INTO public.gpu_pricing (gpu_type, price_per_hour) VALUES
  ('A100', 2.00),
  ('A100-80GB', 2.50),
  ('H100', 3.50),
  ('RTX 4090', 0.50),
  ('RTX 5090', 0.75),
  ('RTX 3090', 0.35),
  ('L40S', 1.20),
  ('V100', 0.80);

-- Seed model pricing
INSERT INTO public.model_pricing (model_id, display_name, category, price_per_1k_input_tokens, price_per_1k_output_tokens) VALUES
  ('openai/gpt-5', 'GPT-5', 'chat', 0.005, 0.015),
  ('openai/gpt-5-mini', 'GPT-5 Mini', 'chat', 0.0001, 0.0004),
  ('openai/gpt-5.1', 'GPT-5.1', 'reasoning', 0.01, 0.03),
  ('openai/gpt-5.2', 'GPT-5.2', 'reasoning', 0.012, 0.035),
  ('google/gemini-2.5-pro', 'Gemini 2.5 Pro', 'chat', 0.00125, 0.005),
  ('google/gemini-2.5-flash', 'Gemini 2.5 Flash', 'chat', 0.00015, 0.0006),
  ('anthropic/claude-4.5-sonnet', 'Claude 4.5 Sonnet', 'chat', 0.003, 0.015),
  ('anthropic/claude-4.5-opus', 'Claude 4.5 Opus', 'reasoning', 0.015, 0.075),
  ('regraph/ReGraph-LLM', 'ReGraph LLM', 'chat', 0.0002, 0.0008);

-- Triggers for updated_at
CREATE TRIGGER update_gpu_pricing_updated_at BEFORE UPDATE ON public.gpu_pricing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_model_pricing_updated_at BEFORE UPDATE ON public.model_pricing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
