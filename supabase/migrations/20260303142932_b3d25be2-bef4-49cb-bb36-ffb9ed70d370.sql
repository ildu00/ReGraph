
-- Atomic wallet balance deduction to prevent race conditions
CREATE OR REPLACE FUNCTION public.deduct_wallet_balance(p_wallet_id uuid, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.wallets
  SET 
    balance_usd = GREATEST(balance_usd - p_amount, 0),
    updated_at = now()
  WHERE id = p_wallet_id;
END;
$$;

-- Fix the balance for mr.mike.ceo@gmail.com: sync with actual usage_logs
DO $$
DECLARE
  v_user_id uuid;
  v_wallet_id uuid;
  v_total_deposits numeric;
  v_total_usage numeric;
  v_total_charged numeric;
  v_correct_balance numeric;
  v_missing_charge numeric;
BEGIN
  SELECT p.user_id INTO v_user_id
  FROM profiles p WHERE p.email = 'mr.mike.ceo@gmail.com';
  IF v_user_id IS NULL THEN RETURN; END IF;

  SELECT id INTO v_wallet_id FROM wallets WHERE user_id = v_user_id;

  SELECT COALESCE(SUM(amount_usd), 0) INTO v_total_deposits
  FROM wallet_transactions 
  WHERE user_id = v_user_id 
    AND transaction_type IN ('deposit', 'wert_purchase', 'refund', 'provider_earning')
    AND status = 'confirmed';

  SELECT COALESCE(SUM(cost_usd), 0) INTO v_total_usage
  FROM usage_logs WHERE user_id = v_user_id;

  SELECT COALESCE(SUM(amount_usd), 0) INTO v_total_charged
  FROM wallet_transactions 
  WHERE user_id = v_user_id 
    AND transaction_type = 'usage_charge'
    AND status = 'confirmed';

  -- signup bonus 1.00 + deposits - actual usage
  v_correct_balance := GREATEST(1.00 + v_total_deposits - v_total_usage, 0);
  v_missing_charge := v_total_usage - v_total_charged;

  -- Update wallet to correct balance
  UPDATE wallets SET balance_usd = v_correct_balance, updated_at = now()
  WHERE user_id = v_user_id;

  -- Insert correction transaction if there's a gap
  IF v_missing_charge > 0 THEN
    INSERT INTO wallet_transactions (user_id, wallet_id, transaction_type, status, amount_usd, metadata)
    VALUES (
      v_user_id, v_wallet_id, 'usage_charge', 'confirmed', v_missing_charge,
      jsonb_build_object('source', 'balance_correction', 'reason', 'Race condition fix - backfill missing charges', 'missing_amount', v_missing_charge)
    );
  END IF;
END $$;
