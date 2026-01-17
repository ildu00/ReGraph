-- Security hardening (excluding pg_cron schema move)

-- usage_logs: remove open INSERT/UPDATE policies (writes are done by backend service role)
DROP POLICY IF EXISTS "System can insert usage logs" ON public.usage_logs;
DROP POLICY IF EXISTS "System can update usage logs" ON public.usage_logs;

-- support_requests: replace permissive insert policy with basic validation + user binding
DROP POLICY IF EXISTS "Anyone can create support requests" ON public.support_requests;
CREATE POLICY "Anyone can create support requests"
ON public.support_requests
FOR INSERT
WITH CHECK (
  length(trim(name)) > 0
  AND length(trim(email)) > 0
  AND length(trim(subject)) > 0
  AND length(trim(message)) > 0
  AND (user_id IS NULL OR auth.uid() = user_id)
);

-- alchemy_webhooks: ensure admin-only access policies exist
ALTER TABLE public.alchemy_webhooks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view alchemy webhooks" ON public.alchemy_webhooks;
DROP POLICY IF EXISTS "Admins can manage alchemy webhooks" ON public.alchemy_webhooks;
CREATE POLICY "Admins can view alchemy webhooks"
ON public.alchemy_webhooks
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can manage alchemy webhooks"
ON public.alchemy_webhooks
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
