import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Address validation patterns per network
const addressPatterns: Record<string, RegExp> = {
  ethereum: /^0x[a-fA-F0-9]{40}$/,
  polygon: /^0x[a-fA-F0-9]{40}$/,
  bsc: /^0x[a-fA-F0-9]{40}$/,
  arbitrum: /^0x[a-fA-F0-9]{40}$/,
  optimism: /^0x[a-fA-F0-9]{40}$/,
  solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
  bitcoin: /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}$/,
  tron: /^T[a-zA-Z0-9]{33}$/,
};

const validCurrencies = ['ETH', 'BTC', 'SOL', 'USDT', 'USDC', 'MATIC', 'BNB', 'TRX'];
const validNetworks = ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'solana', 'bitcoin', 'tron'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify the user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { wallet_id, network, currency, address, amount_usd } = await req.json();

    // Validate required fields
    if (!wallet_id || !network || !currency || !address || !amount_usd) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate network
    if (!validNetworks.includes(network)) {
      return new Response(
        JSON.stringify({ error: 'Invalid network' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate currency
    if (!validCurrencies.includes(currency)) {
      return new Response(
        JSON.stringify({ error: 'Invalid currency' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate address format
    const addressPattern = addressPatterns[network];
    if (!addressPattern || !addressPattern.test(address)) {
      return new Response(
        JSON.stringify({ error: 'Invalid wallet address format for the selected network' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate amount
    const amount = parseFloat(amount_usd);
    if (isNaN(amount) || amount < 1) {
      return new Response(
        JSON.stringify({ error: 'Minimum withdrawal amount is $1' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify wallet belongs to user and has sufficient balance
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('id', wallet_id)
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      return new Response(
        JSON.stringify({ error: 'Wallet not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (parseFloat(wallet.balance_usd) < amount) {
      return new Response(
        JSON.stringify({ error: 'Insufficient balance' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for pending withdrawals to prevent double-spend
    const { data: pendingWithdrawals } = await supabase
      .from('wallet_transactions')
      .select('amount_usd')
      .eq('user_id', user.id)
      .eq('transaction_type', 'withdrawal')
      .eq('status', 'pending');

    const pendingTotal = (pendingWithdrawals || []).reduce(
      (sum, tx) => sum + parseFloat(tx.amount_usd), 
      0
    );

    if (parseFloat(wallet.balance_usd) - pendingTotal < amount) {
      return new Response(
        JSON.stringify({ error: 'Insufficient available balance (pending withdrawals considered)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create withdrawal transaction (pending status)
    const { data: transaction, error: txError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: user.id,
        wallet_id: wallet_id,
        transaction_type: 'withdrawal',
        status: 'pending',
        amount_usd: amount,
        currency: currency,
        network: network,
        metadata: {
          destination_address: address,
          requested_at: new Date().toISOString(),
        }
      })
      .select()
      .single();

    if (txError) {
      throw txError;
    }

    // Deduct from balance immediately (will be refunded if withdrawal fails)
    const newBalance = parseFloat(wallet.balance_usd) - amount;
    await supabase
      .from('wallets')
      .update({ 
        balance_usd: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', wallet_id);

    console.log(`Withdrawal request created: ${transaction.id} for $${amount} to ${address} on ${network}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        transaction_id: transaction.id,
        message: 'Withdrawal request submitted. It will be processed within 24 hours.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error processing withdrawal:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to process withdrawal' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
