// Small helper for Meta Pixel + Conversions API (server-side) dedup.
// Browser fbq fires immediately; the same eventID is forwarded to the
// meta-capi Edge Function so Meta dedupes browser + server events.

type FbqArgs = unknown[];

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : undefined;
}

function uuid(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return (crypto as Crypto).randomUUID();
    }
  } catch {
    /* ignore */
  }
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

interface TrackOpts {
  email?: string;
  customData?: Record<string, unknown>;
}

const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  "https://rwzyvgralronyuzqwyhu.supabase.co";
const SUPABASE_ANON =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ?? "";

export async function trackMetaEvent(eventName: string, opts: TrackOpts = {}) {
  const eventId = uuid();
  const sourceUrl =
    typeof window !== "undefined" ? window.location.href : undefined;
  const fbp = getCookie("_fbp");
  const fbc = getCookie("_fbc");

  // 1. Browser pixel
  try {
    const w = window as unknown as { fbq?: (...a: FbqArgs) => void };
    w.fbq?.("track", eventName, opts.customData ?? {}, { eventID: eventId });
  } catch {
    /* ignore */
  }

  // 2. Server CAPI (fire-and-forget)
  try {
    void fetch(`${SUPABASE_URL}/functions/v1/meta-capi`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(SUPABASE_ANON ? { Authorization: `Bearer ${SUPABASE_ANON}`, apikey: SUPABASE_ANON } : {}),
      },
      body: JSON.stringify({
        eventName,
        eventId,
        sourceUrl,
        email: opts.email,
        fbp,
        fbc,
        customData: opts.customData,
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore */
  }

  return eventId;
}
