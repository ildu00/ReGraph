
-- Allow admins to view all support requests
CREATE POLICY "Admins can view all support requests"
ON public.support_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update support requests (for status changes)
CREATE POLICY "Admins can update support requests"
ON public.support_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));
