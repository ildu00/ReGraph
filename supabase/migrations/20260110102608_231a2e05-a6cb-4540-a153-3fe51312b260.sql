-- Create enum for supported blockchain networks
CREATE TYPE public.blockchain_network AS ENUM (
  'ethereum',
  'polygon',
  'bsc',
  'arbitrum',
  'optimism',
  'solana',
  'bitcoin',
  'tron'
);

-- Create enum for supported tokens/currencies
CREATE TYPE public.crypto_currency AS ENUM (
  'ETH',
  'BTC',
  'SOL',
  'USDT',
  'USDC',
  'MATIC',
  'BNB',
  'TRX'
);

-- Create enum for transaction types
CREATE TYPE public.wallet_transaction_type AS ENUM (
  'deposit',
  'withdrawal',
  'usage_charge',
  'refund',
  'wert_purchase'
);

-- Create enum for transaction status
CREATE TYPE public.wallet_transaction_status AS ENUM (
  'pending',
  'confirmed',
  'failed',
  'cancelled'
);

-- Create wallets table (main balance tracking)
CREATE TABLE public.wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  balance_usd NUMERIC(18, 8) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create deposit addresses table (per-user addresses for each network)
CREATE TABLE public.wallet_deposit_addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  network blockchain_network NOT NULL,
  address TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, network)
);

-- Create transactions table
CREATE TABLE public.wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  transaction_type wallet_transaction_type NOT NULL,
  status wallet_transaction_status NOT NULL DEFAULT 'pending',
  amount_crypto NUMERIC(24, 12) NOT NULL DEFAULT 0,
  currency crypto_currency,
  network blockchain_network,
  amount_usd NUMERIC(18, 8) NOT NULL DEFAULT 0,
  tx_hash TEXT,
  external_id TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_deposit_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Wallets policies
CREATE POLICY "Users can view their own wallet"
ON public.wallets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallet"
ON public.wallets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet"
ON public.wallets FOR UPDATE
USING (auth.uid() = user_id);

-- Deposit addresses policies
CREATE POLICY "Users can view their own deposit addresses"
ON public.wallet_deposit_addresses FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own deposit addresses"
ON public.wallet_deposit_addresses FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can view their own transactions"
ON public.wallet_transactions FOR SELECT
USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_wallets_updated_at
BEFORE UPDATE ON public.wallets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wallet_transactions_updated_at
BEFORE UPDATE ON public.wallet_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();