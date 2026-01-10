-- Table to store Alchemy webhook IDs per network
CREATE TABLE public.alchemy_webhooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  network TEXT NOT NULL UNIQUE,
  webhook_id TEXT NOT NULL,
  signing_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Only edge functions can access this table (service role)
ALTER TABLE public.alchemy_webhooks ENABLE ROW LEVEL SECURITY;

-- No RLS policies = only service role can access