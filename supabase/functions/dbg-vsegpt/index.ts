async function probe(name: string, url: string, init: RequestInit = {}) {
  const t = Date.now();
  const c = new AbortController();
  const timer = setTimeout(() => c.abort(), 8000);
  try {
    const r = await fetch(url, { ...init, signal: c.signal });
    const body = (await r.text()).slice(0, 120);
    return { name, status: r.status, body, ms: Date.now() - t };
  } catch (e) {
    return { name, error: String(e), ms: Date.now() - t };
  } finally { clearTimeout(timer); }
}
Deno.serve(async () => {
  const key = Deno.env.get("VSEGPT_API_KEY") ?? "";
  const results = await Promise.all([
    probe("vsegpt-get-models", "https://api.vsegpt.ru/v1/models"),
    probe("vsegpt-chat", "https://api.vsegpt.ru/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "openai/gpt-4o-mini", messages: [{ role: "user", content: "hi" }], max_tokens: 5 }) }),
    probe("vsegpt-root", "https://vsegpt.ru/"),
    probe("openai", "https://api.openai.com/v1/models"),
    probe("lovable-gw", "https://ai.gateway.lovable.dev/v1/models"),
  ]);
  return Response.json(results);
});
