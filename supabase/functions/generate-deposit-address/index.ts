import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In production, you would integrate with a custodial wallet provider API
// (e.g., Fireblocks, BitGo, Coinbase Custody) to generate real addresses
// This is a placeholder that generates deterministic demo addresses
function generateDemoAddress(userId: string, network: string): string {
  // Include network in hash to ensure unique addresses per network
  const input = `${userId}-${network}-${Date.now()}`;
  const hash = btoa(input).replace(/[^a-fA-F0-9]/g, '').toLowerCase().slice(0, 40).padEnd(40, '0');
  
  switch (network) {
    case 'ethereum':
    case 'polygon':
    case 'bsc':
    case 'arbitrum':
    case 'optimism':
      return `0x${hash}`;
    case 'bitcoin':
      return `bc1q${hash.toLowerCase().slice(0, 38)}`;
    case 'solana':
      return hash.slice(0, 44);
    case 'tron':
      return `T${hash.slice(0, 33)}`;
    default:
      return `0x${hash}`;
  }
}

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

    const { network, wallet_id } = await req.json();

    if (!network || !wallet_id) {
      return new Response(
        JSON.stringify({ error: 'Missing network or wallet_id' }),
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

    // Check if address already exists
    const { data: existingAddress } = await supabase
      .from('wallet_deposit_addresses')
      .select('*')
      .eq('user_id', user.id)
      .eq('network', network)
      .single();

    if (existingAddress) {
      return new Response(
        JSON.stringify({ address: existingAddress.address, existing: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate new address
    // In production, call your custodial wallet provider API here
    const address = generateDemoAddress(user.id, network);

    // Store the address
    const { data: newAddress, error: insertError } = await supabase
      .from('wallet_deposit_addresses')
      .insert({
        user_id: user.id,
        wallet_id: wallet_id,
        network: network,
        address: address,
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return new Response(
      JSON.stringify({ address: newAddress.address, network: network }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error generating deposit address:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
