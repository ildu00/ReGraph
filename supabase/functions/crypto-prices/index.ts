import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// CoinGecko IDs for our supported currencies
const coinGeckoIds: Record<string, string> = {
  'ETH': 'ethereum',
  'BTC': 'bitcoin',
  'SOL': 'solana',
  'USDT': 'tether',
  'USDC': 'usd-coin',
  'MATIC': 'matic-network',
  'BNB': 'binancecoin',
  'TRX': 'tron',
};

// Cache for prices (5 minute TTL)
let priceCache: { prices: Record<string, number>; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchPricesFromCoinGecko(): Promise<Record<string, number>> {
  const ids = Object.values(coinGeckoIds).join(',');
  
  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
    {
      headers: {
        'Accept': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status}`);
  }

  const data = await response.json();
  
  // Map back to our currency symbols
  const prices: Record<string, number> = {};
  for (const [symbol, geckoId] of Object.entries(coinGeckoIds)) {
    if (data[geckoId] && data[geckoId].usd) {
      prices[symbol] = data[geckoId].usd;
    }
  }

  return prices;
}

// Fallback prices in case CoinGecko is unavailable
const fallbackPrices: Record<string, number> = {
  'ETH': 3500,
  'BTC': 95000,
  'SOL': 200,
  'USDT': 1,
  'USDC': 1,
  'MATIC': 0.5,
  'BNB': 600,
  'TRX': 0.25,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check cache
    const now = Date.now();
    if (priceCache && (now - priceCache.timestamp) < CACHE_TTL) {
      return new Response(
        JSON.stringify({ 
          prices: priceCache.prices, 
          cached: true,
          updated_at: new Date(priceCache.timestamp).toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch fresh prices
    let prices: Record<string, number>;
    try {
      prices = await fetchPricesFromCoinGecko();
      
      // Update cache
      priceCache = { prices, timestamp: now };
    } catch (error) {
      console.error('Error fetching from CoinGecko, using fallback:', error);
      prices = fallbackPrices;
    }

    return new Response(
      JSON.stringify({ 
        prices, 
        cached: false,
        updated_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error fetching crypto prices:', error);
    return new Response(
      JSON.stringify({ error: error.message, prices: fallbackPrices }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
