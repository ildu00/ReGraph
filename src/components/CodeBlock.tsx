import { Copy, Check } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import json from "highlight.js/lib/languages/json";
import powershell from "highlight.js/lib/languages/powershell";

hljs.registerLanguage("bash", bash);
hljs.registerLanguage("shell", bash);
hljs.registerLanguage("sh", bash);
hljs.registerLanguage("json", json);
hljs.registerLanguage("powershell", powershell);

interface CodeBlockProps {
  code: string;
  language?: string;
  showCopy?: boolean;
}

const normalizeLanguage = (language: string) => {
  const lang = language.toLowerCase();
  if (lang === "bash" || lang === "shell" || lang === "sh") return "bash";
  if (lang === "json") return "json";
  if (lang === "powershell" || lang === "ps" || lang === "ps1") return "powershell";
  return lang;
};

const CodeBlock = ({ code, language = "bash", showCopy = true }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  const highlighted = useMemo(() => {
    const lang = normalizeLanguage(language);
    try {
      if (hljs.getLanguage(lang)) {
        return hljs.highlight(code.trim(), { language: lang }).value;
      }
      return hljs.highlightAuto(code.trim()).value;
    } catch {
      return code
        .trim()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }
  }, [code, language]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="rounded-lg p-4 overflow-x-auto text-sm font-mono hljs">
        <code
          className="hljs"
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </pre>
      {showCopy && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 bg-secondary/80 hover:bg-secondary"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-4 w-4 text-primary" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  );
};

export default CodeBlock;
