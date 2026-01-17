-- Allow admins to view all wallets
CREATE POLICY "Admins can view all wallets" 
ON public.wallets 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));