import mammoth from "npm:mammoth@1.8.0";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    for (let j = 0; j < chunk.length; j++) binary += String.fromCharCode(chunk[j]);
  }
  return btoa(binary);
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const contentType = req.headers.get('content-type') || '';
    let file: File | null = null;
    let urlToFetch: string | null = null;

    if (contentType.includes('application/json')) {
      const body = await req.json();
      urlToFetch = body?.url || null;
    } else {
      const formData = await req.formData();
      file = formData.get('file') as File | null;
    }

    // ── URL mode: fetch remote file ─────────────────────────────────────
    if (urlToFetch) {
      let fetchRes: Response;
      try {
        fetchRes = await fetch(urlToFetch, { headers: { 'User-Agent': 'Mozilla/5.0 ReGraph-Agent/1.0' } });
      } catch (e) {
        return new Response(JSON.stringify({ error: `Failed to fetch URL: ${e instanceof Error ? e.message : String(e)}` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (!fetchRes.ok) {
        return new Response(JSON.stringify({ error: `URL returned HTTP ${fetchRes.status}` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const mime = fetchRes.headers.get('content-type') || '';
      const urlPath = new URL(urlToFetch).pathname;
      const ext = urlPath.split('.').pop()?.toLowerCase() || '';
      const arrayBuffer = await fetchRes.arrayBuffer();
      const guessedExt = ext || (mime.includes('pdf') ? 'pdf' : mime.includes('word') ? 'docx' : 'txt');
      file = new File([arrayBuffer], `document.${guessedExt}`, { type: mime });
    }

    if (!file) return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const arrayBuffer = await file.arrayBuffer();

    // DOCX — use mammoth
    if (ext === 'docx') {
      const result = await mammoth.extractRawText({ buffer: Buffer.from(arrayBuffer) });
      const text = result.value.trim();
      return new Response(JSON.stringify({ content: `File: ${file.name}\n\n${text.slice(0, 12000)}${text.length > 12000 ? '\n\n[Truncated]' : ''}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PDF — use Lovable AI gateway (Gemini multimodal via OpenAI-compatible API)
    if (ext === 'pdf') {
      const apiKey = Deno.env.get('LOVABLE_API_KEY');
      if (!apiKey) return new Response(JSON.stringify({ error: 'AI not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const base64 = arrayBufferToBase64(arrayBuffer);
      const dataUrl = `data:application/pdf;base64,${base64}`;

      const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Extract all the text content from this PDF document. Return only the extracted text content, preserving structure as much as possible.',
                },
                {
                  type: 'image_url',
                  image_url: { url: dataUrl },
                },
              ],
            },
          ],
          max_tokens: 8192,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('Lovable AI error:', res.status, errText);
        return new Response(JSON.stringify({ error: `AI gateway error: ${res.status}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content || '';
      if (!text) return new Response(JSON.stringify({ error: 'Could not extract PDF content' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      return new Response(JSON.stringify({ content: `File: ${file.name}\n\n${text}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: `Unsupported format: .${ext}. Supported: PDF, DOCX` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error('Document reader error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
