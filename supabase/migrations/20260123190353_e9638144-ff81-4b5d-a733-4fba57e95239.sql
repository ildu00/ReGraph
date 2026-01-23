-- Allow admins to view all provider devices
CREATE POLICY "Admins can view all devices"
ON public.provider_devices
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to manage all provider devices
CREATE POLICY "Admins can update all devices"
ON public.provider_devices
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete all devices"
ON public.provider_devices
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));