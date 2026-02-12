import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const wertPartnerId = Deno.env.get('WERT_PARTNER_ID');
    const wertPrivateKey = Deno.env.get('WERT_PRIVATE_KEY');

    if (!wertPartnerId || !wertPrivateKey) {
      throw new Error('Wert.io credentials not configured');
    }

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

    const { wallet_id, user_email } = await req.json();

    if (!wallet_id) {
      return new Response(
        JSON.stringify({ error: 'Missing wallet_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify wallet belongs to user
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

    // Generate a unique click_id for tracking
    const click_id = crypto.randomUUID();
    
    // Create a pending transaction for tracking
    await supabase
      .from('wallet_transactions')
      .insert({
        user_id: user.id,
        wallet_id: wallet_id,
        transaction_type: 'wert_purchase',
        status: 'pending',
        external_id: click_id,
        metadata: { initiated_at: new Date().toISOString() }
      });

    // Create session via Wert Partner API
    const sessionPayload: Record<string, unknown> = {
      flow_type: 'simple',
      commodity: 'USDC',
      network: 'polygon',
      commodities: JSON.stringify([
        { commodity: 'ETH', network: 'ethereum' },
        { commodity: 'USDC', network: 'polygon' },
        { commodity: 'USDT', network: 'polygon' },
        { commodity: 'MATIC', network: 'polygon' },
        { commodity: 'SOL', network: 'solana' },
        { commodity: 'BTC', network: 'bitcoin' },
      ]),
    };

    if (user_email) {
      sessionPayload.email = user_email;
    }

    const sessionRes = await fetch('https://partner.wert.io/api/external/hpp/create-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': wertPrivateKey,
      },
      body: JSON.stringify(sessionPayload),
    });

    if (!sessionRes.ok) {
      const errBody = await sessionRes.text();
      console.error('Wert create-session error:', sessionRes.status, errBody);
      throw new Error(`Wert session creation failed: ${sessionRes.status}`);
    }

    const sessionData = await sessionRes.json();
    const sessionId = sessionData.sessionId;

    if (!sessionId) {
      console.error('Wert response missing sessionId:', sessionData);
      throw new Error('Wert session creation did not return a sessionId');
    }

    return new Response(
      JSON.stringify({ 
        session_id: sessionId,
        partner_id: wertPartnerId,
        click_id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in wert-widget function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
