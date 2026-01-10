import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as hexEncode } from "https://deno.land/std@0.168.0/encoding/hex.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-alchemy-signature',
};

// Verify Alchemy webhook signature
async function verifyAlchemySignature(
  body: string,
  signature: string,
  signingKey: string
): Promise<boolean> {
  if (!signingKey) {
    console.warn('No signing key configured, skipping signature verification');
    return true; // Allow if no signing key (for testing)
  }

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(signingKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const expectedSignature = new TextDecoder().decode(hexEncode(new Uint8Array(signatureBytes)));

    return signature === expectedSignature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

// Map Alchemy network to our network enum
function mapAlchemyNetwork(alchemyNetwork: string): string | null {
  const networkMap: Record<string, string> = {
    'ETH_MAINNET': 'ethereum',
    'MATIC_MAINNET': 'polygon',
    'ARB_MAINNET': 'arbitrum',
    'OPT_MAINNET': 'optimism',
  };
  return networkMap[alchemyNetwork] || null;
}

// Get token info from asset
function getTokenInfo(asset: string): { currency: string; isNative: boolean } {
  const tokenMap: Record<string, { currency: string; isNative: boolean }> = {
    'ETH': { currency: 'ETH', isNative: true },
    'MATIC': { currency: 'MATIC', isNative: true },
    // USDT contract addresses
    '0xdac17f958d2ee523a2206206994597c13d831ec7': { currency: 'USDT', isNative: false },
    '0xc2132d05d31c914a87c6611c10748aeb04b58e8f': { currency: 'USDT', isNative: false }, // Polygon USDT
    // USDC contract addresses  
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': { currency: 'USDC', isNative: false },
    '0x2791bca1f2de4661ed88a30c99a7a9449aa84174': { currency: 'USDC', isNative: false }, // Polygon USDC
    '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359': { currency: 'USDC', isNative: false }, // Polygon native USDC
  };
  
  const lowerAsset = asset.toLowerCase();
  return tokenMap[lowerAsset] || tokenMap[asset] || { currency: asset, isNative: false };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.text();
    const signature = req.headers.get('x-alchemy-signature') || '';

    // Parse the webhook payload
    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Received Alchemy webhook:', JSON.stringify(payload, null, 2));

    // Handle test/ping webhooks
    if (payload.type === 'ADDRESS_ACTIVITY' && (!payload.event || !payload.event.activity)) {
      console.log('Test webhook received');
      return new Response(
        JSON.stringify({ success: true, message: 'Test webhook acknowledged' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const network = mapAlchemyNetwork(payload.event?.network);
    if (!network) {
      console.log('Unknown network:', payload.event?.network);
      return new Response(
        JSON.stringify({ success: true, message: 'Unknown network, ignored' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get signing key for this network to verify signature
    const { data: webhookConfig } = await supabase
      .from('alchemy_webhooks')
      .select('signing_key')
      .eq('network', network)
      .maybeSingle();

    if (webhookConfig?.signing_key) {
      const isValid = await verifyAlchemySignature(body, signature, webhookConfig.signing_key);
      if (!isValid) {
        console.error('Invalid webhook signature');
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Process each activity
    const activities = payload.event?.activity || [];
    let processedCount = 0;

    for (const activity of activities) {
      // We only care about incoming transfers (where toAddress is one of our deposit addresses)
      const toAddress = activity.toAddress?.toLowerCase();
      
      if (!toAddress) continue;

      // Find the deposit address in our database
      const { data: depositAddress } = await supabase
        .from('wallet_deposit_addresses')
        .select('id, user_id, wallet_id, network')
        .eq('network', network)
        .ilike('address', toAddress)
        .maybeSingle();

      if (!depositAddress) {
        console.log(`Address ${toAddress} not found in our database`);
        continue;
      }

      // Get token info
      const tokenInfo = getTokenInfo(activity.asset || 'ETH');
      const amountCrypto = parseFloat(activity.value || '0');

      // Skip zero or negative amounts
      if (amountCrypto <= 0) continue;

      // Check for duplicate transaction
      const txHash = activity.hash;
      const { data: existingTx } = await supabase
        .from('wallet_transactions')
        .select('id')
        .eq('tx_hash', txHash)
        .maybeSingle();

      if (existingTx) {
        console.log(`Transaction ${txHash} already processed`);
        continue;
      }

      // Get current crypto price for USD conversion
      let amountUsd = 0;
      try {
        // For stablecoins, 1:1 USD
        if (tokenInfo.currency === 'USDT' || tokenInfo.currency === 'USDC') {
          amountUsd = amountCrypto;
        } else {
          // Fetch price from our crypto-prices function or use a default
          const priceResponse = await supabase.functions.invoke('crypto-prices');
          const prices = priceResponse.data?.prices || {};
          const price = prices[tokenInfo.currency] || 0;
          amountUsd = amountCrypto * price;
        }
      } catch (error) {
        console.error('Error fetching crypto price:', error);
      }

      // Create deposit transaction
      const { error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: depositAddress.user_id,
          wallet_id: depositAddress.wallet_id,
          transaction_type: 'deposit',
          amount_crypto: amountCrypto,
          amount_usd: amountUsd,
          currency: tokenInfo.currency,
          network: network,
          status: 'confirmed',
          tx_hash: txHash,
          metadata: {
            from_address: activity.fromAddress,
            block_number: activity.blockNum,
            asset: activity.asset,
            category: activity.category,
          },
        });

      if (txError) {
        console.error('Error creating transaction:', txError);
        continue;
      }

      // Update wallet balance
      const { error: walletError } = await supabase
        .from('wallets')
        .update({ 
          balance_usd: supabase.rpc('increment_balance', { 
            wallet_id: depositAddress.wallet_id, 
            amount: amountUsd 
          })
        })
        .eq('id', depositAddress.wallet_id);

      // Alternative: direct update with current balance
      const { data: currentWallet } = await supabase
        .from('wallets')
        .select('balance_usd')
        .eq('id', depositAddress.wallet_id)
        .single();

      if (currentWallet) {
        await supabase
          .from('wallets')
          .update({ 
            balance_usd: (currentWallet.balance_usd || 0) + amountUsd,
            updated_at: new Date().toISOString()
          })
          .eq('id', depositAddress.wallet_id);
      }

      console.log(`Processed deposit: ${amountCrypto} ${tokenInfo.currency} for user ${depositAddress.user_id}`);
      processedCount++;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: processedCount,
        total: activities.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
