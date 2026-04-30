-- Add referral fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);

-- Allow anyone to look up a referral code (only id/code, not other PII) — needed so the signup
-- trigger and public referral landing pages can resolve a code to its owner.
CREATE POLICY "Anyone can resolve referral codes"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (referral_code IS NOT NULL);

-- Replace handle_new_user to also persist referral attribution from auth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ref_code text;
  v_referrer uuid;
BEGIN
  v_ref_code := NULLIF(NEW.raw_user_meta_data->>'referral_code', '');

  IF v_ref_code IS NOT NULL THEN
    SELECT user_id INTO v_referrer
    FROM public.profiles
    WHERE referral_code = v_ref_code
    LIMIT 1;
  END IF;

  INSERT INTO public.profiles (user_id, display_name, email, referred_by)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name', NEW.email, v_referrer);

  INSERT INTO public.wallets (user_id, balance_usd)
  VALUES (NEW.id, 1.00);

  INSERT INTO public.wallet_transactions (user_id, wallet_id, transaction_type, status, amount_usd, metadata)
  VALUES (
    NEW.id,
    (SELECT id FROM public.wallets WHERE user_id = NEW.id LIMIT 1),
    'deposit',
    'confirmed',
    1.00,
    jsonb_build_object(
      'source', 'signup_bonus',
      'description', 'Welcome bonus',
      'referral_code', v_ref_code,
      'referred_by', v_referrer
    )
  );

  RETURN NEW;
END;
$function$;

-- Ensure the trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();