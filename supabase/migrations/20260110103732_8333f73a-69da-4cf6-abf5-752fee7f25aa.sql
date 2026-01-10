-- Add provider_id to usage_logs to track which provider served the request
ALTER TABLE public.usage_logs 
ADD COLUMN provider_id UUID REFERENCES public.provider_profiles(id);

-- Add provider_device_id to track which specific device was used
ALTER TABLE public.usage_logs 
ADD COLUMN provider_device_id UUID REFERENCES public.provider_devices(id);

-- Add new transaction type for provider earnings
ALTER TYPE public.wallet_transaction_type ADD VALUE 'provider_earning';

-- Create index for faster provider earnings queries
CREATE INDEX idx_usage_logs_provider_id ON public.usage_logs(provider_id);
CREATE INDEX idx_usage_logs_created_at ON public.usage_logs(created_at);

-- Allow system to insert usage logs (for the edge function with service role)
CREATE POLICY "System can insert usage logs"
ON public.usage_logs FOR INSERT
WITH CHECK (true);

-- Allow system to update usage logs
CREATE POLICY "System can update usage logs"
ON public.usage_logs FOR UPDATE
USING (true);