// Run with: node --test supabase/functions/stripe-webhook/duplicate.test.mjs  (Node 22.18+ / 24; no Deno or install needed)
// Loads the Deno handler as-is, with its remote imports and Deno.env stubbed.
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'

const stubs = {
  'https://deno.land/std@0.190.0/http/server.ts': 'export const serve = (h) => { globalThis.__handler = h }',
  'https://esm.sh/stripe@18.5.0': 'export default class Stripe { webhooks = { constructEventAsync: async (body) => JSON.parse(body) } }',
  'npm:@supabase/supabase-js@2.57.2': 'export const createClient = () => globalThis.__db',
}
registerHooks({
  resolve(spec, ctx, next) {
    return stubs[spec] ? { url: 'stub:' + spec, shortCircuit: true } : next(spec, ctx)
  },
  load(url, ctx, next) {
    return url.startsWith('stub:')
      ? { format: 'module', source: stubs[url.slice(5)], shortCircuit: true }
      : next(url, ctx)
  },
})
const env = { STRIPE_SECRET_KEY: 'sk_test', STRIPE_WEBHOOK_SECRET: 'whsec_test', SUPABASE_URL: 'http://localhost', SUPABASE_SERVICE_ROLE_KEY: 'k' }
globalThis.Deno = { env: { get: (k) => env[k] } }
await import('./index.ts')

// In-memory stand-in for the database. Every call yields to the event loop like a network round
// trip, so two deliveries that run at the same time interleave. wallet_transactions has no unique
// key on external_id (as in the current schema); credit_wallet_deposit mirrors the SQL function in
// supabase/migrations/20261127000001_credit_wallet_deposit.sql (one atomic insert-if-new + credit).
let wallet, txs
const tick = () => new Promise((r) => setTimeout(r, 1))
function makeDb() {
  return {
    from(table) {
      const f = []
      let patch = null
      const q = {
        select: () => q,
        eq: (c, v) => (f.push([c, v]), q),
        single: async () => (await tick(), { data: table === 'wallets' ? { ...wallet } : null, error: null }),
        maybeSingle: async () => (await tick(), { data: table === 'wallet_transactions' ? txs.find((t) => f.every(([c, v]) => t[c] === v)) ?? null : null, error: null }),
        insert: async (row) => (await tick(), txs.push(row), { error: null }),
        update: (p) => ((patch = p), q),
        then(res, rej) {
          return tick().then(() => {
            if (patch && table === 'wallets') Object.assign(wallet, patch)
            return { error: null }
          }).then(res, rej)
        },
      }
      return q
    },
    async rpc(name, a) {
      assert.equal(name, 'credit_wallet_deposit')
      await tick()
      if (txs.some((t) => t.external_id === a.p_external_id)) return { data: false, error: null }
      txs.push({ external_id: a.p_external_id, amount_usd: a.p_amount_usd })
      wallet.balance_usd += a.p_amount_usd
      return { data: true, error: null }
    },
  }
}

beforeEach(() => {
  wallet = { id: 'w1', balance_usd: 0 }
  txs = []
  globalThis.__db = makeDb()
})

function deliver(sessionId) {
  const event = { id: 'evt_' + sessionId, type: 'checkout.session.completed', data: { object: { id: sessionId, metadata: { user_id: 'u1', amount_usd: '25' }, payment_intent: 'pi_1' } } }
  return globalThis.__handler(new Request('http://localhost/', { method: 'POST', headers: { 'stripe-signature': 't=1,v1=x' }, body: JSON.stringify(event) }))
}

test('a redelivered checkout session credits the wallet once', async () => {
  await deliver('cs_1')
  await deliver('cs_1')
  assert.equal(wallet.balance_usd, 25)
})

test('two deliveries of the same session at the same time credit once', async () => {
  await Promise.all([deliver('cs_1'), deliver('cs_1')])
  assert.equal(txs.length, 1)
  assert.equal(wallet.balance_usd, 25)
})

test('two different sessions at the same time are both credited', async () => {
  await Promise.all([deliver('cs_1'), deliver('cs_2')])
  assert.equal(wallet.balance_usd, 50)
})
