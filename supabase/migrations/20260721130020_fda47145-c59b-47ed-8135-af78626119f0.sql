
CREATE TABLE public.try_trial_usage (
  ip_hash text PRIMARY KEY,
  count integer NOT NULL DEFAULT 0,
  first_at timestamptz NOT NULL DEFAULT now(),
  last_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.try_trial_usage TO service_role;
ALTER TABLE public.try_trial_usage ENABLE ROW LEVEL SECURITY;
-- No policies: only the service role (edge function) may read/write.
