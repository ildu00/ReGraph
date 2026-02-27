const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { code, language = 'javascript' } = await req.json();
    if (!code) return new Response(JSON.stringify({ error: 'Code required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const lang = language.toLowerCase();
    let output = '';
    let error = '';

    if (lang === 'javascript' || lang === 'js' || lang === 'typescript' || lang === 'ts') {
      // Capture console.log output
      const logs: string[] = [];
      const originalLog = console.log;
      const originalError = console.error;
      const originalWarn = console.warn;

      console.log = (...args: any[]) => logs.push(args.map(String).join(' '));
      console.error = (...args: any[]) => logs.push('ERROR: ' + args.map(String).join(' '));
      console.warn = (...args: any[]) => logs.push('WARN: ' + args.map(String).join(' '));

      try {
        // Wrap in async IIFE to support await
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
    } else if (lang === 'python' || lang === 'py') {
      // Python not directly runnable in Deno — use a simple expression evaluator approach
      // For basic math/logic we can attempt via a simple approach
      output = `Python execution is not supported in this sandbox. Consider rewriting in JavaScript:\n\n${code}`;
    } else if (lang === 'json') {
      try {
        const parsed = JSON.parse(code);
        output = JSON.stringify(parsed, null, 2);
      } catch (e: any) {
        error = 'Invalid JSON: ' + e.message;
      }
    } else {
      // For other languages, return helpful message
      output = `Language "${language}" is not supported in this sandbox. Supported: JavaScript, TypeScript, JSON.`;
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
