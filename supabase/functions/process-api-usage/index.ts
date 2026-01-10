import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { 
      api_key, 
      endpoint, 
      tokens_used = 0, 
      compute_time_ms = 0,
      provider_device_id 
    } = await req.json();

    if (!api_key) {
      return new Response(
        JSON.stringify({ error: 'API key is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hash the API key to find it in the database
    const encoder = new TextEncoder();
    const data = encoder.encode(api_key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Find the API key
    const { data: apiKeyData, error: keyError } = await supabase
      .from('api_keys')
      .select('id, user_id, is_active')
      .eq('key_hash', keyHash)
      .single();

    if (keyError || !apiKeyData) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!apiKeyData.is_active) {
      return new Response(
        JSON.stringify({ error: 'API key is inactive' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const consumerId = apiKeyData.user_id;

    // Get consumer's wallet
    const { data: consumerWallet, error: consumerWalletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', consumerId)
      .single();

    if (consumerWalletError || !consumerWallet) {
      return new Response(
        JSON.stringify({ error: 'Consumer wallet not found. Please add funds first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate cost based on compute time and tokens
    // Pricing: $0.001 per 1000 tokens + $0.0001 per second of compute
    const tokenCost = (tokens_used / 1000) * 0.001;
    const computeCost = (compute_time_ms / 1000) * 0.0001;
    const totalCost = Math.max(tokenCost + computeCost, 0.0001); // Minimum $0.0001 per request

    // Check if consumer has sufficient balance
    if (parseFloat(consumerWallet.balance_usd) < totalCost) {
      return new Response(
        JSON.stringify({ error: 'Insufficient balance', required: totalCost, available: consumerWallet.balance_usd }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the provider device if specified, or select an available one
    let providerDevice = null;
    let providerId = null;

    if (provider_device_id) {
      const { data: device } = await supabase
        .from('provider_devices')
        .select('*, provider_profiles!inner(*)')
        .eq('id', provider_device_id)
        .eq('status', 'online')
        .single();
      
      providerDevice = device;
    } else {
      // Select a random online device
      const { data: devices } = await supabase
        .from('provider_devices')
        .select('*, provider_profiles!inner(*)')
        .eq('status', 'online')
        .limit(10);

      if (devices && devices.length > 0) {
        providerDevice = devices[Math.floor(Math.random() * devices.length)];
      }
    }

    if (providerDevice) {
      providerId = providerDevice.provider_profiles?.id || null;
    }

    // Calculate provider's share (80% goes to provider, 20% platform fee)
    const providerShare = totalCost * 0.8;
    const platformFee = totalCost * 0.2;

    // Start transaction: deduct from consumer
    const newConsumerBalance = parseFloat(consumerWallet.balance_usd) - totalCost;
    
    const { error: deductError } = await supabase
      .from('wallets')
      .update({ 
        balance_usd: newConsumerBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', consumerWallet.id);

    if (deductError) {
      throw new Error('Failed to deduct from consumer balance');
    }

    // Create consumer's usage charge transaction
    await supabase
      .from('wallet_transactions')
      .insert({
        user_id: consumerId,
        wallet_id: consumerWallet.id,
        transaction_type: 'usage_charge',
        status: 'confirmed',
        amount_usd: totalCost,
        metadata: {
          endpoint,
          tokens_used,
          compute_time_ms,
          provider_device_id: providerDevice?.id || null,
          platform_fee: platformFee
        }
      });

    // Credit provider if exists
    if (providerDevice && providerId) {
      // Get provider's wallet
      const providerUserId = providerDevice.user_id;
      
      let { data: providerWallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', providerUserId)
        .single();

      // Create wallet for provider if doesn't exist
      if (!providerWallet) {
        const { data: newWallet } = await supabase
          .from('wallets')
          .insert({ user_id: providerUserId })
          .select()
          .single();
        providerWallet = newWallet;
      }

      if (providerWallet) {
        // Credit provider
        const newProviderBalance = parseFloat(providerWallet.balance_usd) + providerShare;
        
        await supabase
          .from('wallets')
          .update({ 
            balance_usd: newProviderBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', providerWallet.id);

        // Create provider's earning transaction
        await supabase
          .from('wallet_transactions')
          .insert({
            user_id: providerUserId,
            wallet_id: providerWallet.id,
            transaction_type: 'provider_earning',
            status: 'confirmed',
            amount_usd: providerShare,
            metadata: {
              consumer_id: consumerId,
              endpoint,
              tokens_used,
              compute_time_ms,
              device_id: providerDevice.id,
              total_charge: totalCost
            }
          });

        // Update provider device stats
        await supabase
          .from('provider_devices')
          .update({
            total_earnings: parseFloat(providerDevice.total_earnings || 0) + providerShare,
            total_compute_hours: parseFloat(providerDevice.total_compute_hours || 0) + (compute_time_ms / 3600000),
            updated_at: new Date().toISOString()
          })
          .eq('id', providerDevice.id);

        // Update provider profile total earnings
        await supabase
          .from('provider_profiles')
          .update({
            total_earnings: parseFloat(providerDevice.provider_profiles?.total_earnings || 0) + providerShare,
            updated_at: new Date().toISOString()
          })
          .eq('id', providerId);
      }
    }

    // Log the usage
    await supabase
      .from('usage_logs')
      .insert({
        user_id: consumerId,
        api_key_id: apiKeyData.id,
        endpoint: endpoint || '/api/unknown',
        tokens_used,
        compute_time_ms,
        cost_usd: totalCost,
        provider_id: providerId,
        provider_device_id: providerDevice?.id || null
      });

    // Update API key last used
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKeyData.id);

    console.log(`Usage processed: Consumer ${consumerId} charged $${totalCost}, Provider ${providerId || 'none'} credited $${providerShare}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        charged: totalCost,
        provider_credited: providerShare,
        new_balance: newConsumerBalance,
        provider_device_id: providerDevice?.id || null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error processing API usage:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to process usage' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
