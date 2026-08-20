Deno.serve(async () => {
  const key = Deno.env.get("VSEGPT_API_KEY") ?? "";
  const out: Record<string, unknown> = { keyLen: key.length, keyPrefix: key.slice(0,3) };
  const t = Date.now();
  try {
    const c = new AbortController();
    const timer = setTimeout(() => c.abort(), 15000);
    const r = await fetch("https://api.vsegpt.ru/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "openai/gpt-4o-mini", messages: [{ role: "user", content: "hi" }], max_tokens: 5 }),
      signal: c.signal,
    });
    clearTimeout(timer);
    out.status = r.status;
    out.body = (await r.text()).slice(0, 300);
  } catch (e) {
    out.error = String(e);
  }
  out.ms = Date.now() - t;
  return Response.json(out);
});
