const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Judge0 language IDs
const judge0LangMap: Record<string, number> = {
  python: 71,   // Python 3.8
  py: 71,
  bash: 46,
  sh: 46,
  ruby: 72,
  go: 60,
  rust: 73,
  java: 62,
  cpp: 54,      // C++ (GCC 9.2.0)
  c: 50,        // C (GCC 9.2.0)
  php: 68,
};

async function judge0Execute(languageId: number, code: string): Promise<{ output: string; error: string }> {
  const JUDGE0_URL = 'https://judge0-ce.p.rapidapi.com';
  const apiKey = Deno.env.get('RAPIDAPI_KEY');

  // Try public judge0 instance first (no auth needed for basic usage)
  const submitUrl = apiKey
    ? `${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`
    : 'https://ce.judge0.com/submissions?base64_encoded=false&wait=true';

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers['X-RapidAPI-Key'] = apiKey;
    headers['X-RapidAPI-Host'] = 'judge0-ce.p.rapidapi.com';
  }

  const res = await fetch(submitUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ language_id: languageId, source_code: code }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.log('Judge0 error:', res.status, text);
    return { output: '', error: `Execution service error: ${res.status}` };
  }

  const data = await res.json();
  console.log('Judge0 response:', JSON.stringify(data));

  const stdout = (data.stdout || '').trim();
  const stderr = (data.stderr || data.compile_output || '').trim();

  if (stdout) return { output: stderr ? `${stdout}\n${stderr}` : stdout, error: '' };
  if (stderr) return { output: '', error: stderr };
  return { output: '(no output)', error: '' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { code, language = 'javascript' } = await req.json();
    if (!code) return new Response(JSON.stringify({ error: 'Code required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const lang = language.toLowerCase();
    let output = '';
    let error = '';

    if (lang === 'javascript' || lang === 'js' || lang === 'typescript' || lang === 'ts') {
      const logs: string[] = [];
      const originalLog = console.log;
      const originalError = console.error;
      const originalWarn = console.warn;

      console.log = (...args: any[]) => logs.push(args.map(String).join(' '));
      console.error = (...args: any[]) => logs.push('ERROR: ' + args.map(String).join(' '));
      console.warn = (...args: any[]) => logs.push('WARN: ' + args.map(String).join(' '));

      try {
        const wrappedCode = `(async () => { ${code} })()`;
        const result = await eval(wrappedCode);
        console.log = originalLog;
        console.error = originalError;
        console.warn = originalWarn;

        if (logs.length > 0) {
          output = logs.join('\n');
        } else if (result !== undefined) {
          output = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
        } else {
          output = '(no output)';
        }
      } catch (e: any) {
        console.log = originalLog;
        console.error = originalError;
        console.warn = originalWarn;
        error = e instanceof Error ? e.message : String(e);
      }
    } else if (lang === 'json') {
      try {
        const parsed = JSON.parse(code);
        output = JSON.stringify(parsed, null, 2);
      } catch (e: any) {
        error = 'Invalid JSON: ' + e.message;
      }
    } else {
      const langId = judge0LangMap[lang];
      if (langId) {
        try {
          const result = await judge0Execute(langId, code);
          output = result.output;
          error = result.error;
        } catch (e: any) {
          error = `Execution failed: ${e instanceof Error ? e.message : String(e)}`;
        }
      } else {
        output = `Language "${language}" is not supported. Supported: JavaScript, TypeScript, Python, Bash, Ruby, Go, Rust, Java, C, C++, PHP, JSON.`;
      }
    }

    return new Response(
      JSON.stringify({ output: output || undefined, error: error || undefined }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
