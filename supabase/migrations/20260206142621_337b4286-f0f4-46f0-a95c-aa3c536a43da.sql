
-- Create api_request_logs table
CREATE TABLE public.api_request_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  method TEXT NOT NULL DEFAULT 'GET',
  endpoint TEXT NOT NULL,
  status_code INTEGER NOT NULL DEFAULT 200,
  response_time_ms INTEGER NOT NULL DEFAULT 0,
  user_agent TEXT,
  ip_address TEXT,
  api_key_prefix TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_request_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view logs
CREATE POLICY "Admins can view api request logs"
  ON public.api_request_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_api_request_logs_created_at ON public.api_request_logs (created_at DESC);
CREATE INDEX idx_api_request_logs_endpoint ON public.api_request_logs (endpoint);
