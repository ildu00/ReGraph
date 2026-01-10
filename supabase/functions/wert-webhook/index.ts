import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wert-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    console.log('Wert webhook received:', JSON.stringify(payload, null, 2));

    const {
      click_id,
      status,
      commodity,
      commodity_amount,
      network,
      fiat_amount,
      fiat_currency,
      tx_id,
    } = payload;

    if (!click_id) {
      return new Response(
        JSON.stringify({ error: 'Missing click_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the pending transaction by click_id
    const { data: transaction, error: txError } = await supabase
      .from('wallet_transactions')
      .select('*, wallets!inner(*)')
      .eq('external_id', click_id)
      .single();

    if (txError || !transaction) {
      console.error('Transaction not found for click_id:', click_id);
      return new Response(
        JSON.stringify({ error: 'Transaction not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map Wert status to our status
    let newStatus: 'pending' | 'confirmed' | 'failed' | 'cancelled';
    switch (status) {
      case 'success':
      case 'completed':
        newStatus = 'confirmed';
        break;
      case 'failed':
        newStatus = 'failed';
        break;
      case 'cancelled':
        newStatus = 'cancelled';
        break;
      default:
        newStatus = 'pending';
    }

    // Calculate USD amount (use fiat_amount if USD, otherwise convert)
    const amountUsd = fiat_currency === 'USD' ? parseFloat(fiat_amount || '0') : parseFloat(commodity_amount || '0');

    // Update the transaction
    await supabase
      .from('wallet_transactions')
      .update({
        status: newStatus,
        amount_crypto: parseFloat(commodity_amount || '0'),
        currency: commodity?.toUpperCase(),
        network: network?.toLowerCase(),
        amount_usd: amountUsd,
        tx_hash: tx_id,
        metadata: payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transaction.id);

    // If confirmed, update the wallet balance
    if (newStatus === 'confirmed') {
      const newBalance = parseFloat(transaction.wallets.balance_usd) + amountUsd;
      
      await supabase
        .from('wallets')
        .update({ 
          balance_usd: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.wallet_id);

      console.log(`Wallet ${transaction.wallet_id} credited with $${amountUsd}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in wert-webhook function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
