CREATE POLICY "Anyone can view provider devices status and model"
ON public.provider_devices FOR SELECT
TO anon
USING (true);