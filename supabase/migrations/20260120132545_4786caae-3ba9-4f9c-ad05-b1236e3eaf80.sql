-- Create boot_events table to store boot diagnostics
CREATE TABLE public.boot_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  reason text NOT NULL,
  url text,
  user_agent text,
  diag jsonb,
  storage_fallback boolean DEFAULT false,
  attempts integer DEFAULT 0,
  ip_address text
);

-- Enable RLS
ALTER TABLE public.boot_events ENABLE ROW LEVEL SECURITY;

-- Admins can view all boot events
CREATE POLICY "Admins can view boot events"
ON public.boot_events
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow inserts via service role (edge function will use service role)
-- No direct insert policy for anon users - they go through edge function