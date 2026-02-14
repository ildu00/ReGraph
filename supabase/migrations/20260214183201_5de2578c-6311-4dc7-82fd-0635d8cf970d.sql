CREATE POLICY "Admins can view all api keys"
ON public.api_keys
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));