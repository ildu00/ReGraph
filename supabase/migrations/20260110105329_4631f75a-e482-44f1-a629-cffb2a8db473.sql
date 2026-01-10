-- Add encrypted private key storage to deposit addresses
ALTER TABLE public.wallet_deposit_addresses 
ADD COLUMN encrypted_private_key text,
ADD COLUMN key_exported boolean DEFAULT false,
ADD COLUMN key_exported_at timestamp with time zone;

-- Add comment for security clarity
COMMENT ON COLUMN public.wallet_deposit_addresses.encrypted_private_key IS 'AES-256-GCM encrypted private key, only decryptable by platform';

-- Update RLS to ensure private keys are never exposed via client queries
-- Private keys should ONLY be accessible through edge functions