
-- Task status enum for provider tasks
CREATE TYPE public.provider_task_status AS ENUM ('pending', 'assigned', 'running', 'completed', 'failed', 'cancelled');
CREATE TYPE public.provider_task_type AS ENUM ('inference', 'training_shard', 'embedding', 'health_check');

-- Provider tasks table
CREATE TABLE public.provider_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID REFERENCES public.provider_devices(id) ON DELETE SET NULL,
  task_type public.provider_task_type NOT NULL DEFAULT 'inference',
  status public.provider_task_status NOT NULL DEFAULT 'pending',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB,
  error_message TEXT,
  assigned_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  timeout_sec INT NOT NULL DEFAULT 300,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add agent-related columns to provider_devices
ALTER TABLE public.provider_devices
  ADD COLUMN IF NOT EXISTS agent_version TEXT,
  ADD COLUMN IF NOT EXISTS hardware_info JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS metrics JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ;

-- Index for task polling (find pending tasks for a device)
CREATE INDEX idx_provider_tasks_device_status ON public.provider_tasks(device_id, status);
CREATE INDEX idx_provider_tasks_status ON public.provider_tasks(status) WHERE status IN ('pending', 'assigned');

-- Update trigger for provider_tasks
CREATE TRIGGER update_provider_tasks_updated_at
  BEFORE UPDATE ON public.provider_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.provider_tasks ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (edge functions use service role)
CREATE POLICY "Service role full access on provider_tasks"
  ON public.provider_tasks
  FOR ALL
  USING (true)
  WITH CHECK (true);
