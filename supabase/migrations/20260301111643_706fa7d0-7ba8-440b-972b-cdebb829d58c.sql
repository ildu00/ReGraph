
-- Create table for Telegram bot integrations
CREATE TABLE public.claw_telegram_bots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  agent_id UUID NOT NULL REFERENCES public.claw_agents(id) ON DELETE CASCADE,
  bot_token TEXT NOT NULL,
  bot_username TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  webhook_set BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(bot_token)
);

ALTER TABLE public.claw_telegram_bots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own telegram bots"
ON public.claw_telegram_bots
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_claw_telegram_bots_updated_at
BEFORE UPDATE ON public.claw_telegram_bots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
