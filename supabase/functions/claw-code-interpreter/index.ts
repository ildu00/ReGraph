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
      // Use Piston API for Python execution
      try {
        const pistonRes = await fetch('https://emkc.org/api/v2/piston/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            language: 'python',
            version: '3.10.0',
            files: [{ content: code }],
          }),
        });
        const pistonData = await pistonRes.json();
        const run = pistonData?.run;
        if (run?.stderr) {
          error = run.stderr;
        } else {
          output = run?.stdout || '(no output)';
        }
      } catch (e: any) {
        error = 'Python execution failed: ' + (e instanceof Error ? e.message : String(e));
      }
    } else if (lang === 'json') {
      try {
        const parsed = JSON.parse(code);
        output = JSON.stringify(parsed, null, 2);
      } catch (e: any) {
        error = 'Invalid JSON: ' + e.message;
      }
    } else {
      // Try Piston API for other languages (bash, ruby, go, rust, etc.)
      const pistonLangMap: Record<string, { language: string; version: string }> = {
        bash: { language: 'bash', version: '5.2.0' },
        sh: { language: 'bash', version: '5.2.0' },
        ruby: { language: 'ruby', version: '3.0.1' },
        go: { language: 'go', version: '1.16.2' },
        rust: { language: 'rust', version: '1.50.0' },
        java: { language: 'java', version: '15.0.2' },
        cpp: { language: 'c++', version: '10.2.0' },
        c: { language: 'c', version: '10.2.0' },
        php: { language: 'php', version: '8.0.2' },
      };
      const pistonLang = pistonLangMap[lang];
      if (pistonLang) {
        try {
          const pistonRes = await fetch('https://emkc.org/api/v2/piston/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ language: pistonLang.language, version: pistonLang.version, files: [{ content: code }] }),
          });
          const pistonData = await pistonRes.json();
          const run = pistonData?.run;
          if (run?.stderr) error = run.stderr;
          else output = run?.stdout || '(no output)';
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
