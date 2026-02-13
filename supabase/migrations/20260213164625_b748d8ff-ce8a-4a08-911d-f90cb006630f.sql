
-- Update handle_new_user to also create a wallet with $1 bonus
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, display_name, email)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name', NEW.email);

    -- Create wallet with $1 signup bonus
    INSERT INTO public.wallets (user_id, balance_usd)
    VALUES (NEW.id, 1.00);

    -- Log the bonus as a transaction
    INSERT INTO public.wallet_transactions (user_id, wallet_id, transaction_type, status, amount_usd, metadata)
    VALUES (
        NEW.id,
        (SELECT id FROM public.wallets WHERE user_id = NEW.id LIMIT 1),
        'deposit',
        'confirmed',
        1.00,
        '{"source": "signup_bonus", "description": "Welcome bonus"}'::jsonb
    );

    RETURN NEW;
END;
$$;
