import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// RPC endpoints configuration
const getRpcUrl = (network: string, alchemyKey: string): string => {
  const rpcUrls: Record<string, string> = {
    // Alchemy-powered (more reliable)
    ethereum: `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`,
    polygon: `https://polygon-mainnet.g.alchemy.com/v2/${alchemyKey}`,
    arbitrum: `https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}`,
    optimism: `https://opt-mainnet.g.alchemy.com/v2/${alchemyKey}`,
    // Public RPCs (free but less reliable)
    bsc: 'https://bsc-dataseed1.binance.org',
    solana: 'https://api.mainnet-beta.solana.com',
    tron: 'https://api.trongrid.io',
  }
  return rpcUrls[network] || ''
}

// Convert hex string to Uint8Array
function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex
  const bytes = new Uint8Array(cleanHex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16)
  }
  return bytes
}

// Convert Uint8Array to hex string
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

// Helper to convert Uint8Array to ArrayBuffer
function toArrayBuffer(arr: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(arr.length)
  new Uint8Array(buffer).set(arr)
  return buffer
}

// Decrypt private key
async function decryptPrivateKey(encryptedData: string, encryptionKey: string): Promise<string> {
  const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const encrypted = combined.slice(12)
  
  const keyBytes = new TextEncoder().encode(encryptionKey.padEnd(32, '0').slice(0, 32))
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(keyBytes),
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  )
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    cryptoKey,
    toArrayBuffer(encrypted)
  )
  
  return new TextDecoder().decode(decrypted)
}

// Simple keccak256 hash (for Ethereum signing)
async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', toArrayBuffer(data))
  return new Uint8Array(hashBuffer)
}

// RLP encode for Ethereum transactions
function rlpEncode(input: any): Uint8Array {
  if (typeof input === 'string') {
    const bytes = hexToBytes(input)
    return rlpEncodeBytes(bytes)
  }
  if (input instanceof Uint8Array) {
    return rlpEncodeBytes(input)
  }
  if (Array.isArray(input)) {
    const encoded = input.map(item => rlpEncode(item))
    const totalLength = encoded.reduce((sum, arr) => sum + arr.length, 0)
    if (totalLength <= 55) {
      const result = new Uint8Array(1 + totalLength)
      result[0] = 0xc0 + totalLength
      let offset = 1
      for (const arr of encoded) {
        result.set(arr, offset)
        offset += arr.length
      }
      return result
    } else {
      const lengthBytes = encodeLength(totalLength)
      const result = new Uint8Array(1 + lengthBytes.length + totalLength)
      result[0] = 0xf7 + lengthBytes.length
      result.set(lengthBytes, 1)
      let offset = 1 + lengthBytes.length
      for (const arr of encoded) {
        result.set(arr, offset)
        offset += arr.length
      }
      return result
    }
  }
  return new Uint8Array([0x80])
}

function rlpEncodeBytes(bytes: Uint8Array): Uint8Array {
  if (bytes.length === 1 && bytes[0] < 0x80) {
    return bytes
  }
  if (bytes.length <= 55) {
    const result = new Uint8Array(1 + bytes.length)
    result[0] = 0x80 + bytes.length
    result.set(bytes, 1)
    return result
  }
  const lengthBytes = encodeLength(bytes.length)
  const result = new Uint8Array(1 + lengthBytes.length + bytes.length)
  result[0] = 0xb7 + lengthBytes.length
  result.set(lengthBytes, 1)
  result.set(bytes, 1 + lengthBytes.length)
  return result
}

function encodeLength(length: number): Uint8Array {
  const hex = length.toString(16)
  const paddedHex = hex.length % 2 ? '0' + hex : hex
  return hexToBytes(paddedHex)
}

// Convert number to minimal hex bytes
function numberToBytes(num: bigint | number): Uint8Array {
  if (num === 0 || num === 0n) return new Uint8Array([])
  const hex = (typeof num === 'bigint' ? num : BigInt(num)).toString(16)
  const paddedHex = hex.length % 2 ? '0' + hex : hex
  return hexToBytes(paddedHex)
}

// Send EVM transaction
async function sendEvmTransaction(
  rpcUrl: string,
  privateKey: string,
  toAddress: string,
  amountWei: bigint,
  fromAddress: string
): Promise<{ txHash: string }> {
  // Get nonce
  const nonceResponse = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_getTransactionCount',
      params: [fromAddress, 'pending'],
      id: 1
    })
  })
  const nonceData = await nonceResponse.json()
  const nonce = parseInt(nonceData.result, 16)

  // Get gas price
  const gasPriceResponse = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_gasPrice',
      params: [],
      id: 2
    })
  })
  const gasPriceData = await gasPriceResponse.json()
  const gasPrice = BigInt(gasPriceData.result)

  // Get chain ID
  const chainIdResponse = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_chainId',
      params: [],
      id: 3
    })
  })
  const chainIdData = await chainIdResponse.json()
  const chainId = parseInt(chainIdData.result, 16)

  const gasLimit = 21000n // Standard ETH transfer

  // Create unsigned transaction for EIP-155
  const txData = [
    numberToBytes(nonce),
    numberToBytes(gasPrice),
    numberToBytes(gasLimit),
    hexToBytes(toAddress),
    numberToBytes(amountWei),
    new Uint8Array([]), // data
    numberToBytes(chainId),
    new Uint8Array([]),
    new Uint8Array([])
  ]

  const rlpEncoded = rlpEncode(txData)
  const txHash = await sha256(rlpEncoded)

  // Note: Full ECDSA signing requires secp256k1 library
  // For production, use a proper signing library
  // This is a simplified placeholder that would need proper implementation
  
  console.log('Transaction prepared:', {
    nonce,
    gasPrice: gasPrice.toString(),
    gasLimit: gasLimit.toString(),
    to: toAddress,
    value: amountWei.toString(),
    chainId
  })

  // For now, return error indicating signing library needed
  throw new Error('Full ECDSA signing requires secp256k1 library. Consider using ethers.js or web3.js in production.')
}

// Send Solana transaction
async function sendSolanaTransaction(
  rpcUrl: string,
  privateKey: string,
  toAddress: string,
  amountLamports: bigint
): Promise<{ txHash: string }> {
  // Solana requires ed25519 signing which is complex to implement manually
  // In production, use @solana/web3.js
  console.log('Solana transaction requested:', {
    to: toAddress,
    amount: amountLamports.toString()
  })
  
  throw new Error('Solana transactions require @solana/web3.js library for proper signing')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const encryptionKey = Deno.env.get('WALLET_ENCRYPTION_KEY')!
    const alchemyKey = Deno.env.get('ALCHEMY_API_KEY')!

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { network, to_address, amount, currency, deposit_address_id } = await req.json()

    // Validate required fields
    if (!network || !to_address || !amount || !deposit_address_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: network, to_address, amount, deposit_address_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get deposit address with encrypted private key
    const { data: depositAddress, error: addressError } = await supabaseAdmin
      .from('wallet_deposit_addresses')
      .select('*')
      .eq('id', deposit_address_id)
      .eq('user_id', user.id)
      .single()

    if (addressError || !depositAddress) {
      return new Response(
        JSON.stringify({ error: 'Deposit address not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!depositAddress.encrypted_private_key) {
      return new Response(
        JSON.stringify({ error: 'Private key not available for this address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Decrypt private key
    const privateKey = await decryptPrivateKey(depositAddress.encrypted_private_key, encryptionKey)

    // Get RPC URL
    const rpcUrl = getRpcUrl(network, alchemyKey)
    if (!rpcUrl) {
      return new Response(
        JSON.stringify({ error: `Unsupported network: ${network}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let result: { txHash: string }

    // Execute transaction based on network type
    const evmNetworks = ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism']
    
    if (evmNetworks.includes(network)) {
      // Convert amount to wei (assuming ETH-like decimals)
      const amountWei = BigInt(Math.floor(parseFloat(amount) * 1e18))
      result = await sendEvmTransaction(rpcUrl, privateKey, to_address, amountWei, depositAddress.address)
    } else if (network === 'solana') {
      const amountLamports = BigInt(Math.floor(parseFloat(amount) * 1e9))
      result = await sendSolanaTransaction(rpcUrl, privateKey, to_address, amountLamports)
    } else if (network === 'tron') {
      return new Response(
        JSON.stringify({ error: 'Tron transactions not yet implemented' }),
        { status: 501, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else if (network === 'bitcoin') {
      return new Response(
        JSON.stringify({ error: 'Bitcoin transactions require specialized libraries' }),
        { status: 501, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      return new Response(
        JSON.stringify({ error: `Unsupported network: ${network}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user wallet
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('id')
      .eq('user_id', user.id)
      .single()

    // Record transaction
    if (wallet) {
      await supabaseAdmin
        .from('wallet_transactions')
        .insert({
          wallet_id: wallet.id,
          user_id: user.id,
          transaction_type: 'withdrawal',
          amount_crypto: parseFloat(amount),
          amount_usd: 0, // Would need price lookup
          currency: currency || 'ETH',
          network,
          status: 'pending',
          tx_hash: result.txHash,
          metadata: { to_address }
        })
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        txHash: result.txHash,
        network,
        amount,
        to_address
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Transaction error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Transaction failed'
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: 'For production use, integrate ethers.js or similar library for proper transaction signing'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
