
CREATE POLICY "Admins can update all wallets"
ON public.wallets
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update test users"
ON public.test_users
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));
