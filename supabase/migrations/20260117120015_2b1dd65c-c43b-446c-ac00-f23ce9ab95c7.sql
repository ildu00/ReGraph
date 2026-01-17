-- Allow admins to view platform-wide analytics

-- usage_logs: admins can view all rows
CREATE POLICY "Admins can view all usage logs"
ON public.usage_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- wallet_transactions: admins can view all rows
CREATE POLICY "Admins can view all transactions"
ON public.wallet_transactions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::public.app_role));
