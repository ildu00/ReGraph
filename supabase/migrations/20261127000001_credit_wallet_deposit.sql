-- A Stripe checkout session must credit a wallet once, even when the event is delivered twice
-- or two deliveries run at the same time. wallet_transactions.external_id was not unique and the
-- webhook read the balance, added to it and wrote it back (a lost update under concurrency).
--
-- Note: if existing rows share an external_id, resolve them before applying the unique index.
CREATE UNIQUE INDEX IF NOT EXISTS wallet_transactions_external_id_key
  ON public.wallet_transactions (external_id)
  WHERE external_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.credit_wallet_deposit(
  p_user_id uuid,
  p_wallet_id uuid,
  p_amount_usd numeric,
  p_external_id text,
  p_metadata jsonb DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted integer;
BEGIN
  INSERT INTO public.wallet_transactions
    (user_id, wallet_id, transaction_type, status, amount_usd, external_id, metadata)
  VALUES
    (p_user_id, p_wallet_id, 'deposit', 'confirmed', p_amount_usd, p_external_id, p_metadata)
  ON CONFLICT (external_id) WHERE external_id IS NOT NULL DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted = 0 THEN
    RETURN false;
  END IF;

  UPDATE public.wallets SET balance_usd = balance_usd + p_amount_usd WHERE id = p_wallet_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.credit_wallet_deposit(uuid, uuid, numeric, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_wallet_deposit(uuid, uuid, numeric, text, jsonb) TO service_role;
