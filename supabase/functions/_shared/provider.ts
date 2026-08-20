/**
 * Upstream inference provider access.
 *
 * The provider host (api.vsegpt.ru) drops traffic from our backend egress IPs —
 * direct requests hang until they abort. All provider calls therefore go through
 * our own API edge relay (Cloudflare Worker at api.regraph.tech/_provider),
 * which forwards the request untouched, including the Authorization header.
 *
 * Override with the PROVIDER_PROXY_BASE env var (e.g. to call the provider
 * directly again once the block is lifted: https://api.vsegpt.ru).
 */
export const PROVIDER_BASE = (
  Deno.env.get("PROVIDER_PROXY_BASE") ?? "https://api.regraph.tech/_provider"
).replace(/\/$/, "");

/** Literal provider host, bypassing the relay. */
export const PROVIDER_DIRECT_BASE = "https://api.vsegpt.ru";
