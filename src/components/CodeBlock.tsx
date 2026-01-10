import { Copy, Check } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import json from "highlight.js/lib/languages/json";
import powershell from "highlight.js/lib/languages/powershell";

const safeRegister = (name: string, lang: any) => {
  // Vite HMR can evaluate this module multiple times; highlight.js throws on duplicate registration.
  if (!hljs.getLanguage(name)) {
    try {
      hljs.registerLanguage(name, lang);
    } catch {
      // Ignore duplicate/registration errors to avoid breaking highlighting.
    }
  }
};

safeRegister("bash", bash);
safeRegister("shell", bash);
safeRegister("sh", bash);
safeRegister("json", json);
safeRegister("powershell", powershell);

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
    const codeTrim = code.trim();
    const lang = normalizeLanguage(language);

    try {
      const direct = hljs.getLanguage(lang)
        ? hljs.highlight(codeTrim, { language: lang, ignoreIllegals: true }).value
        : "";

      // Если подсветка не дала токенов (иногда бывает на bash), пробуем авто-режим.
      const value = direct && direct.includes("hljs-")
        ? direct
        : hljs.highlightAuto(codeTrim, [lang, "bash", "json"]).value;

      return value;
    } catch {
      return codeTrim
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

  const langClass = `language-${normalizeLanguage(language)}`;

  return (
    <div className="relative group overflow-hidden">
      <pre className={`rounded-lg p-4 overflow-x-auto text-sm font-mono hljs ${langClass} max-w-full`}>
        <code
          className={`hljs ${langClass} break-all whitespace-pre-wrap`}
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
