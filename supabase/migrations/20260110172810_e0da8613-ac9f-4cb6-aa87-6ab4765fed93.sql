-- Add column to store the full API key for later copying
ALTER TABLE public.api_keys 
ADD COLUMN full_key TEXT;

-- Add comment explaining the purpose
COMMENT ON COLUMN public.api_keys.full_key IS 'Full API key stored for user convenience to copy later';