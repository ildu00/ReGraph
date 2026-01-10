import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { ethers } from 'https://esm.sh/ethers@6.13.4'

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
  }
  return rpcUrls[network] || ''
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

// Send EVM transaction using ethers.js
async function sendEvmTransaction(
  rpcUrl: string,
  privateKey: string,
  toAddress: string,
  amount: string,
  isToken: boolean = false,
  tokenAddress?: string,
  tokenDecimals: number = 18
): Promise<{ txHash: string; gasUsed: string; effectiveGasPrice: string }> {
  // Create provider and wallet
  const provider = new ethers.JsonRpcProvider(rpcUrl)
  
  // Ensure private key has 0x prefix
  const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`
  const wallet = new ethers.Wallet(formattedKey, provider)

  console.log('Sending transaction from:', wallet.address)

  if (isToken && tokenAddress) {
    // ERC-20 token transfer
    const erc20Abi = [
      'function transfer(address to, uint256 amount) returns (bool)',
      'function balanceOf(address owner) view returns (uint256)',
      'function decimals() view returns (uint8)'
    ]
    
    const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, wallet)
    const amountInWei = ethers.parseUnits(amount, tokenDecimals)
    
    // Check balance
    const balance = await tokenContract.balanceOf(wallet.address)
    if (balance < amountInWei) {
      throw new Error(`Insufficient token balance. Have: ${ethers.formatUnits(balance, tokenDecimals)}, Need: ${amount}`)
    }

    // Estimate gas
    const gasEstimate = await tokenContract.transfer.estimateGas(toAddress, amountInWei)
    
    // Send transaction
    const tx = await tokenContract.transfer(toAddress, amountInWei, {
      gasLimit: gasEstimate * 120n / 100n // Add 20% buffer
    })
    
    console.log('Token transfer tx hash:', tx.hash)
    
    // Wait for confirmation
    const receipt = await tx.wait(1)
    
    return {
      txHash: receipt.hash,
      gasUsed: receipt.gasUsed.toString(),
      effectiveGasPrice: receipt.gasPrice?.toString() || '0'
    }
  } else {
    // Native token transfer (ETH, MATIC, BNB, etc.)
    const amountInWei = ethers.parseEther(amount)
    
    // Check balance
    const balance = await provider.getBalance(wallet.address)
    const feeData = await provider.getFeeData()
    const estimatedGas = 21000n
    const estimatedFee = estimatedGas * (feeData.gasPrice || 0n)
    
    if (balance < amountInWei + estimatedFee) {
      throw new Error(`Insufficient balance. Have: ${ethers.formatEther(balance)} ETH, Need: ${amount} ETH + gas`)
    }

    // Send transaction
    const tx = await wallet.sendTransaction({
      to: toAddress,
      value: amountInWei,
      gasLimit: estimatedGas
    })
    
    console.log('Native transfer tx hash:', tx.hash)
    
    // Wait for confirmation
    const receipt = await tx.wait(1)
    
    return {
      txHash: receipt!.hash,
      gasUsed: receipt!.gasUsed.toString(),
      effectiveGasPrice: receipt!.gasPrice?.toString() || '0'
    }
  }
}

// Get current gas price for estimation
async function getGasEstimate(rpcUrl: string): Promise<{ gasPrice: string; maxFeePerGas?: string; maxPriorityFeePerGas?: string }> {
  const provider = new ethers.JsonRpcProvider(rpcUrl)
  const feeData = await provider.getFeeData()
  
  return {
    gasPrice: feeData.gasPrice?.toString() || '0',
    maxFeePerGas: feeData.maxFeePerGas?.toString(),
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString()
  }
}

// Get wallet balance
async function getWalletBalance(rpcUrl: string, address: string): Promise<{ balance: string; balanceFormatted: string }> {
  const provider = new ethers.JsonRpcProvider(rpcUrl)
  const balance = await provider.getBalance(address)
  
  return {
    balance: balance.toString(),
    balanceFormatted: ethers.formatEther(balance)
  }
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

    const body = await req.json()
    const { action } = body

    // Handle different actions
    if (action === 'get_balance') {
      const { network, address } = body
      const rpcUrl = getRpcUrl(network, alchemyKey)
      if (!rpcUrl) {
        return new Response(
          JSON.stringify({ error: `Unsupported network: ${network}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      const balance = await getWalletBalance(rpcUrl, address)
      return new Response(
        JSON.stringify({ success: true, ...balance }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'get_gas_estimate') {
      const { network } = body
      const rpcUrl = getRpcUrl(network, alchemyKey)
      if (!rpcUrl) {
        return new Response(
          JSON.stringify({ error: `Unsupported network: ${network}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      const gasData = await getGasEstimate(rpcUrl)
      return new Response(
        JSON.stringify({ success: true, ...gasData }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Default action: send transaction
    const { network, to_address, amount, currency, deposit_address_id, token_address, token_decimals } = body

    // Validate required fields
    if (!network || !to_address || !amount || !deposit_address_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: network, to_address, amount, deposit_address_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate network is EVM
    const evmNetworks = ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism']
    if (!evmNetworks.includes(network)) {
      return new Response(
        JSON.stringify({ error: `Network ${network} is not supported for EVM transactions. Supported: ${evmNetworks.join(', ')}` }),
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

    // Determine if token transfer
    const isToken = !!token_address
    const decimals = token_decimals || 18

    // Execute transaction
    console.log(`Executing ${isToken ? 'token' : 'native'} transfer on ${network}`)
    const result = await sendEvmTransaction(
      rpcUrl,
      privateKey,
      to_address,
      amount,
      isToken,
      token_address,
      decimals
    )

    // Get user wallet
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('id')
      .eq('user_id', user.id)
      .single()

    // Record transaction in database
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
          status: 'confirmed',
          tx_hash: result.txHash,
          metadata: { 
            to_address,
            gas_used: result.gasUsed,
            effective_gas_price: result.effectiveGasPrice,
            is_token: isToken,
            token_address
          }
        })
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        txHash: result.txHash,
        network,
        amount,
        to_address,
        gasUsed: result.gasUsed,
        effectiveGasPrice: result.effectiveGasPrice
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Transaction error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Transaction failed'
    return new Response(
      JSON.stringify({ 
        error: errorMessage
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
