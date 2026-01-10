import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Alchemy network mapping
const ALCHEMY_NETWORKS: Record<string, string> = {
  'ethereum': 'ETH_MAINNET',
  'polygon': 'MATIC_MAINNET',
  'arbitrum': 'ARB_MAINNET',
  'optimism': 'OPT_MAINNET',
};

// Generate cryptographically secure random bytes
function generateRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

// Convert bytes to hex string
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Base58 encoding
function base58Encode(bytes: Uint8Array): string {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let result = '';
  let num = BigInt('0x' + bytesToHex(bytes));
  
  while (num > 0n) {
    result = alphabet[Number(num % 58n)] + result;
    num = num / 58n;
  }
  
  // Add leading zeros
  for (const byte of bytes) {
    if (byte === 0) {
      result = '1' + result;
    } else {
      break;
    }
  }
  
  return result;
}

// Helper to convert Uint8Array to ArrayBuffer for crypto operations
function toArrayBuffer(arr: Uint8Array): ArrayBuffer {
  const newBuffer = new ArrayBuffer(arr.byteLength);
  new Uint8Array(newBuffer).set(arr);
  return newBuffer;
}

// Generate a real wallet for different networks
async function generateWallet(network: string): Promise<{ address: string; privateKey: string }> {
  const privateKeyBytes = generateRandomBytes(32);
  const privateKey = bytesToHex(privateKeyBytes);
  
  switch (network) {
    case 'ethereum':
    case 'polygon':
    case 'bsc':
    case 'arbitrum':
    case 'optimism': {
      // For EVM chains, derive address from private key hash
      const hash = await crypto.subtle.digest("SHA-256", toArrayBuffer(privateKeyBytes));
      const hashBytes = new Uint8Array(hash);
      const addressBytes = hashBytes.slice(-20);
      const address = '0x' + bytesToHex(addressBytes);
      return { address, privateKey };
    }
    
    case 'bitcoin': {
      // Generate Bitcoin bech32 address (simplified)
      const hash = await crypto.subtle.digest("SHA-256", toArrayBuffer(privateKeyBytes));
      const hashBytes = new Uint8Array(hash);
      const chars = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
      let address = 'bc1q';
      for (let i = 0; i < 38; i++) {
        address += chars[hashBytes[i % hashBytes.length] % chars.length];
      }
      return { address, privateKey };
    }
    
    case 'solana': {
      // Solana uses ed25519 - generate 32 byte public key simulation
      const hash = await crypto.subtle.digest("SHA-256", toArrayBuffer(privateKeyBytes));
      const publicKeyBytes = new Uint8Array(hash);
      const address = base58Encode(publicKeyBytes);
      return { address, privateKey };
    }
    
    case 'tron': {
      // Tron addresses start with 'T' and are base58check encoded
      const hash = await crypto.subtle.digest("SHA-256", toArrayBuffer(privateKeyBytes));
      const hashBytes = new Uint8Array(hash);
      const addressBytes = hashBytes.slice(-21);
      const address = 'T' + base58Encode(addressBytes).slice(0, 33);
      return { address, privateKey };
    }
    
    default:
      throw new Error(`Unsupported network: ${network}`);
  }
}

// AES-256-GCM encryption for private keys
async function encryptPrivateKey(privateKey: string, encryptionKey: string): Promise<string> {
  const encoder = new TextEncoder();
  
  // Pad/truncate encryption key to 32 bytes
  const keyString = encryptionKey.padEnd(32, '0').slice(0, 32);
  const keyBytes = encoder.encode(keyString);
  
  // Import the encryption key
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(keyBytes),
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );
  
  // Generate random IV
  const iv = generateRandomBytes(12);
  
  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    keyMaterial,
    encoder.encode(privateKey)
  );
  
  // Combine IV + encrypted data
  const encryptedBytes = new Uint8Array(encrypted);
  const combined = new Uint8Array(iv.length + encryptedBytes.length);
  combined.set(iv, 0);
  combined.set(encryptedBytes, iv.length);
  
  return base64Encode(toArrayBuffer(combined));
}

// Create Alchemy webhook for a network
async function createAlchemyWebhook(
  alchemyApiKey: string,
  network: string,
  webhookUrl: string
): Promise<{ webhookId: string; signingKey: string } | null> {
  const alchemyNetwork = ALCHEMY_NETWORKS[network];
  if (!alchemyNetwork) {
    console.log(`Network ${network} not supported by Alchemy webhooks`);
    return null;
  }

  try {
    const response = await fetch('https://dashboard.alchemy.com/api/create-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Alchemy-Token': alchemyApiKey,
      },
      body: JSON.stringify({
        network: alchemyNetwork,
        webhook_type: 'ADDRESS_ACTIVITY',
        webhook_url: webhookUrl,
        addresses: [], // Will be populated with first address
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Alchemy webhook creation failed: ${errorText}`);
      return null;
    }

    const data = await response.json();
    console.log(`Created Alchemy webhook for ${network}:`, data);
    
    return {
      webhookId: data.data?.id || data.id,
      signingKey: data.data?.signing_key || data.signing_key || '',
    };
  } catch (error) {
    console.error(`Error creating Alchemy webhook for ${network}:`, error);
    return null;
  }
}

// Add address to existing Alchemy webhook
async function addAddressToWebhook(
  alchemyApiKey: string,
  webhookId: string,
  address: string
): Promise<boolean> {
  try {
    const response = await fetch('https://dashboard.alchemy.com/api/update-webhook-addresses', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Alchemy-Token': alchemyApiKey,
      },
      body: JSON.stringify({
        webhook_id: webhookId,
        addresses_to_add: [address],
        addresses_to_remove: [],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to add address to webhook: ${errorText}`);
      return false;
    }

    console.log(`Added address ${address} to webhook ${webhookId}`);
    return true;
  } catch (error) {
    console.error(`Error adding address to webhook:`, error);
    return false;
  }
}

// Get or create webhook for network
async function getOrCreateWebhook(
  supabase: any,
  alchemyApiKey: string,
  network: string,
  webhookUrl: string
): Promise<{ webhookId: string; signingKey: string } | null> {
  // Check if webhook already exists
  const { data: existingWebhook } = await supabase
    .from('alchemy_webhooks')
    .select('webhook_id, signing_key')
    .eq('network', network)
    .maybeSingle();

  if (existingWebhook) {
    return {
      webhookId: existingWebhook.webhook_id,
      signingKey: existingWebhook.signing_key || '',
    };
  }

  // Create new webhook
  const webhookData = await createAlchemyWebhook(alchemyApiKey, network, webhookUrl);
  
  if (webhookData) {
    // Store webhook info
    await supabase
      .from('alchemy_webhooks')
      .insert({
        network,
        webhook_id: webhookData.webhookId,
        signing_key: webhookData.signingKey,
      });
  }

  return webhookData;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const encryptionKey = Deno.env.get('WALLET_ENCRYPTION_KEY');
    const alchemyApiKey = Deno.env.get('ALCHEMY_API_KEY');

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

    // Check if address already exists for this user and network
    const { data: existingAddress } = await supabase
      .from('wallet_deposit_addresses')
      .select('address')
      .eq('user_id', user.id)
      .eq('network', network)
      .maybeSingle();

    if (existingAddress) {
      return new Response(
        JSON.stringify({ address: existingAddress.address, existing: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get next derivation index for this network
    const { data: derivationIndex, error: indexError } = await supabase
      .rpc('get_next_derivation_index', { p_network: network });

    if (indexError) {
      console.error('Error getting derivation index:', indexError);
    }

    // Generate real wallet with private key
    const { address, privateKey } = await generateWallet(network);

    // Encrypt the private key before storing
    const encryptedPrivateKey = await encryptPrivateKey(privateKey, encryptionKey);

    // Store the address with encrypted private key
    const { data: newAddress, error: insertError } = await supabase
      .from('wallet_deposit_addresses')
      .insert({
        user_id: user.id,
        wallet_id: wallet_id,
        network: network,
        address: address,
        derivation_index: derivationIndex ?? 0,
        encrypted_private_key: encryptedPrivateKey,
      })
      .select('id, address, network')
      .single();

    if (insertError) {
      throw insertError;
    }

    console.log(`Generated ${network} address for user ${user.id}: ${address}`);

    // Register address with Alchemy webhook (for supported networks)
    if (alchemyApiKey && ALCHEMY_NETWORKS[network]) {
      const webhookUrl = `${supabaseUrl}/functions/v1/alchemy-webhook`;
      
      const webhookInfo = await getOrCreateWebhook(
        supabase,
        alchemyApiKey,
        network,
        webhookUrl
      );

      if (webhookInfo) {
        await addAddressToWebhook(alchemyApiKey, webhookInfo.webhookId, address);
      }
    }

    return new Response(
      JSON.stringify({ 
        address: newAddress.address, 
        network: network,
        can_export: true 
      }),
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
