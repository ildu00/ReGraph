-- Add derivation_index to track HD wallet derivation path for each address
ALTER TABLE public.wallet_deposit_addresses 
ADD COLUMN derivation_index integer;

-- Create a sequence-like function to get next available index per network
CREATE OR REPLACE FUNCTION public.get_next_derivation_index(p_network blockchain_network)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_index integer;
BEGIN
  SELECT COALESCE(MAX(derivation_index), -1) + 1 INTO next_index
  FROM wallet_deposit_addresses
  WHERE network = p_network;
  
  RETURN next_index;
END;
$$;