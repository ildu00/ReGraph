import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decode as base64Decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// AES-256-GCM decryption for private keys
async function decryptPrivateKey(encryptedData: string, encryptionKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  // Decode from base64
  const combined = base64Decode(encryptedData);
  
  // Extract IV (first 12 bytes) and encrypted content
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  
  // Pad/truncate encryption key to 32 bytes
  const keyString = encryptionKey.padEnd(32, '0').slice(0, 32);
  const keyBytes = encoder.encode(keyString);
  
  // Import the decryption key
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    keyBytes.buffer,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );
  
  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv.buffer },
    keyMaterial,
    encrypted.buffer
  );
  
  return decoder.decode(decrypted);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const encryptionKey = Deno.env.get('WALLET_ENCRYPTION_KEY');

    if (!encryptionKey) {
      throw new Error('WALLET_ENCRYPTION_KEY not configured');
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

    const { address_id } = await req.json();

    if (!address_id) {
      return new Response(
        JSON.stringify({ error: 'Missing address_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the deposit address with encrypted private key
    const { data: depositAddress, error: fetchError } = await supabase
      .from('wallet_deposit_addresses')
      .select('*')
      .eq('id', address_id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !depositAddress) {
      return new Response(
        JSON.stringify({ error: 'Address not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!depositAddress.encrypted_private_key) {
      return new Response(
        JSON.stringify({ error: 'No private key available for this address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decrypt the private key
    const privateKey = await decryptPrivateKey(
      depositAddress.encrypted_private_key,
      encryptionKey
    );

    // Mark as exported
    await supabase
      .from('wallet_deposit_addresses')
      .update({
        key_exported: true,
        key_exported_at: new Date().toISOString(),
      })
      .eq('id', address_id);

    console.log(`User ${user.id} exported keys for address ${depositAddress.address}`);

    return new Response(
      JSON.stringify({
        network: depositAddress.network,
        address: depositAddress.address,
        private_key: privateKey,
        warning: 'Keep this private key secure. Anyone with access to it can control your funds.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error exporting wallet keys:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
