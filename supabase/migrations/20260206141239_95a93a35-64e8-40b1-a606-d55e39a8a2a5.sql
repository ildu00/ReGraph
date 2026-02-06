
-- Create notification_logs table to persist send history
CREATE TABLE public.notification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sent_by UUID NOT NULL,
  recipients_count INTEGER NOT NULL DEFAULT 0,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'success',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view and insert
CREATE POLICY "Admins can view notification logs"
  ON public.notification_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert notification logs"
  ON public.notification_logs FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
