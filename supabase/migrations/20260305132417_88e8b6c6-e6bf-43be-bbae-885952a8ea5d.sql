
-- Create project_wallets table for centralized deposit addresses
CREATE TABLE public.project_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  network TEXT NOT NULL,
  address TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  currency TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(network, address)
);

-- Enable RLS
ALTER TABLE public.project_wallets ENABLE ROW LEVEL SECURITY;

-- Admins can manage project wallets
CREATE POLICY "Admins can manage project wallets"
  ON public.project_wallets
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view active project wallets
CREATE POLICY "Anyone can view active project wallets"
  ON public.project_wallets
  FOR SELECT
  USING (is_active = true);

-- Trigger for updated_at
CREATE TRIGGER update_project_wallets_updated_at
  BEFORE UPDATE ON public.project_wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
