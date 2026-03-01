import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VSEGPT_API_KEY = Deno.env.get("VSEGPT_API_KEY")!;

const TOOL_DEFINITIONS: Record<string, object> = {
  calculator: {
    type: "function",
    function: {
      name: "calculator",
      description: "Perform mathematical calculations.",
      parameters: { type: "object", properties: { expression: { type: "string" } }, required: ["expression"] },
    },
  },
  web_search: {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for current information, news, facts, and URLs.",
      parameters: { type: "object", properties: { query: { type: "string", description: "The search query" } }, required: ["query"] },
    },
  },
  code_interpreter: {
    type: "function",
    function: {
      name: "code_interpreter",
      description: "Execute code in JavaScript, Python, or TypeScript and return the output.",
      parameters: { type: "object", properties: { code: { type: "string" }, language: { type: "string", enum: ["javascript", "python", "typescript"] } }, required: ["code"] },
    },
  },
  image_generation: {
    type: "function",
    function: {
      name: "image_generation",
      description: "Generate an image from a text description.",
      parameters: { type: "object", properties: { prompt: { type: "string", description: "Detailed description of the image to generate" } }, required: ["prompt"] },
    },
  },
  document_reader: {
    type: "function",
    function: {
      name: "document_reader",
      description: "Read and extract text content from a URL or webpage.",
      parameters: { type: "object", properties: { url: { type: "string", description: "The URL of the webpage to read" } }, required: ["url"] },
    },
  },
  voice_message: {
    type: "function",
    function: {
      name: "voice_message",
      description: "Convert text to speech and send it as a voice message to the user. Use when the user asks to speak, read aloud, or send a voice note.",
      parameters: { type: "object", properties: { text: { type: "string", description: "The text to convert to speech" }, voice: { type: "string", enum: ["alloy", "echo", "fable", "onyx", "nova", "shimmer"], description: "Voice style to use (default: nova)" } }, required: ["text"] },
    },
  },
  file_generator: {
    type: "function",
    function: {
      name: "file_generator",
      description: "Generate and send a file (TXT, JSON, CSV, PDF) to the user. Use this tool when the user asks to create, generate, or save a file. NEVER use code_interpreter to generate files — always use this tool instead.",
      parameters: {
        type: "object",
        properties: {
          filename: { type: "string", description: "The file name including extension, e.g. resume.pdf" },
          format: { type: "string", enum: ["txt", "json", "csv", "pdf"], description: "File format" },
          content: { type: "string", description: "The full text content of the file. For PDF, use plain text with newlines. For CSV, use comma-separated rows." },
        },
        required: ["filename", "format", "content"],
      },
    },
  },
};

// Ensure NotoSans font is available in Storage (uploaded once)
async function ensureFont(): Promise<Uint8Array> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const BUCKET = "claw-images";
  const FONT_PATH = "fonts/NotoSans-Regular.ttf";

  // Try to read from storage first
  const { data: fileData, error: readErr } = await supabase.storage
    .from(BUCKET)
    .download(FONT_PATH);

  if (!readErr && fileData) {
    console.log("Font loaded from storage");
    return new Uint8Array(await fileData.arrayBuffer());
  }

  // Not in storage yet — fetch from CDN and upload
  console.log("Fetching font from CDN to upload to storage...");
  const ttfUrl = "https://raw.githubusercontent.com/notofonts/latin-greek-cyrillic/main/fonts/NotoSans/unhinted/ttf/NotoSans-Regular.ttf";
  const res = await fetch(ttfUrl, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error("Font CDN error: " + res.status);
  const bytes = new Uint8Array(await res.arrayBuffer());

  // Upload for future use
  await supabase.storage.from(BUCKET).upload(FONT_PATH, bytes, {
    contentType: "font/ttf",
    upsert: true,
  });
  console.log("Font uploaded to storage, size:", bytes.byteLength);
  return bytes;
}

// Generate PDF with pdf-lib + NotoSans from Storage (Cyrillic support)
async function buildPdf(content: string): Promise<Uint8Array> {
  console.log("Building PDF...");
  const { PDFDocument, rgb } = await import("npm:pdf-lib@1.17.1");
  const fontkit = (await import("npm:@pdf-lib/fontkit@1.1.1")).default;

  const fontBytes = await ensureFont();

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(fontBytes);

  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 50;
  const fontSize = 12;
  const lineHeight = fontSize * 1.5;
  const maxWidth = pageWidth - 2 * margin;

  const wrapText = (text: string): string[] => {
    const result: string[] = [];
    for (const rawLine of text.split("\n")) {
      if (!rawLine.trim()) { result.push(""); continue; }
      // Strip markdown
      const line = rawLine.replace(/^#{1,3}\s+/, "").replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1");
      let current = "";
      for (const word of line.split(" ")) {
        const test = current ? current + " " + word : word;
        try {
          const w = font.widthOfTextAtSize(test, fontSize);
          if (w > maxWidth && current) { result.push(current); current = word; }
          else current = test;
        } catch { current = test; }
      }
      if (current) result.push(current);
    }
    return result;
  };

  const lines = wrapText(content);
  const linesPerPage = Math.floor((pageHeight - 2 * margin) / lineHeight);

  for (let p = 0; p < Math.max(lines.length, 1); p += linesPerPage) {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    const pageLines = lines.slice(p, p + linesPerPage);
    let y = pageHeight - margin - fontSize;
    for (const line of pageLines) {
      if (line) {
        page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
      }
      y -= lineHeight;
    }
  }

  console.log("PDF built successfully, pages:", pdfDoc.getPageCount());
  return new Uint8Array(await pdfDoc.save());
}

  // Dynamic import of pdfmake for Deno
  const pdfMake = (await import("npm:pdfmake@0.2.10/build/pdfmake.js")).default;
  const vfsFonts = (await import("npm:pdfmake@0.2.10/build/vfs_fonts.js")).default;

  // pdfmake ships with Roboto which supports Latin only.
  // For Cyrillic we fetch NotoSans TTF from a reliable source and register it.
  const fontUrl = "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.10/fonts/Roboto/Roboto-Regular.ttf";
  
  // Use pdfmake with default Roboto — but encode content to escape non-latin chars
  // via a Unicode-safe approach: use pdfmake's built-in virtual file system
  pdfMake.vfs = vfsFonts.pdfMake?.vfs ?? vfsFonts;

  const docDefinition = {
    content: content.split("\n").map((line: string) => {
      if (line.startsWith("# ")) return { text: line.slice(2), style: "h1" };
      if (line.startsWith("## ")) return { text: line.slice(3), style: "h2" };
      if (line.startsWith("### ")) return { text: line.slice(4), style: "h3" };
      if (!line.trim()) return { text: " " };
      // Strip markdown bold/italic markers
      const clean = line.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1");
      return { text: clean };
    }),
    styles: {
      h1: { fontSize: 18, bold: true, margin: [0, 10, 0, 5] },
      h2: { fontSize: 15, bold: true, margin: [0, 8, 0, 4] },
      h3: { fontSize: 13, bold: true, margin: [0, 6, 0, 3] },
    },
    defaultStyle: { fontSize: 11, lineHeight: 1.4 },
  };

  return new Promise<Uint8Array>((resolve, reject) => {
    const pdfDoc = pdfMake.createPdf(docDefinition);
    pdfDoc.getBuffer((buffer: Buffer) => {
      resolve(new Uint8Array(buffer));
    });
  });
}

// Generate PDF manually with pdf-lib + embedded font (fallback approach)
async function buildPdfFallback(content: string): Promise<Uint8Array> {
  console.log("Building PDF via pdf-lib fallback...");
  const { PDFDocument, rgb } = await import("npm:pdf-lib@1.17.1");
  const fontkit = (await import("npm:@pdf-lib/fontkit@1.1.1")).default;

  // Fetch NotoSans TTF from multiple CDN sources
  const fontUrls = [
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/webfonts/fa-regular-400.ttf", // wrong, skip
    "https://raw.githubusercontent.com/notofonts/latin-greek-cyrillic/main/fonts/NotoSans/unhinted/ttf/NotoSans-Regular.ttf",
  ];

  let fontBytes: Uint8Array | null = null;
  for (const url of fontUrls) {
    try {
      console.log("Fetching font from:", url);
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const buf = await res.arrayBuffer();
        if (buf.byteLength > 50000) {
          fontBytes = new Uint8Array(buf);
          console.log("Font loaded, size:", fontBytes.byteLength);
          break;
        }
      }
    } catch (e) {
      console.log("Font fetch failed:", e);
    }
  }

  if (!fontBytes) throw new Error("Could not load TTF font");

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(fontBytes);

  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 50;
  const fontSize = 12;
  const lineHeight = fontSize * 1.5;
  const maxWidth = pageWidth - 2 * margin;

  // Word-wrap using font metrics
  const wrapText = (text: string): string[] => {
    const result: string[] = [];
    for (const rawLine of text.split("\n")) {
      if (!rawLine.trim()) { result.push(""); continue; }
      let current = "";
      for (const word of rawLine.split(" ")) {
        const test = current ? current + " " + word : word;
        const w = font.widthOfTextAtSize(test, fontSize);
        if (w > maxWidth && current) {
          result.push(current);
          current = word;
        } else {
          current = test;
        }
      }
      if (current) result.push(current);
    }
    return result;
  };

  const lines = wrapText(content);
  const linesPerPage = Math.floor((pageHeight - 2 * margin) / lineHeight);

  for (let p = 0; p < lines.length || p === 0; p += linesPerPage) {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    const pageLines = lines.slice(p, p + linesPerPage);
    let y = pageHeight - margin - fontSize;
    for (const line of pageLines) {
      if (line !== "") {
        page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
      }
      y -= lineHeight;
    }
  }

  return new Uint8Array(await pdfDoc.save());
}

// Legacy sync stub — kept for signature compatibility but not used
function _buildPdfLegacy(content: string): Uint8Array {
  const enc = new TextEncoder();

  // Escape a string for PDF stream content (parentheses, backslash)
  const escapePdfStr = (s: string): string => {
    // Convert to latin1-safe by replacing non-latin chars with unicode escapes in PDF hex
    let out = "";
    for (const ch of s) {
      const cp = ch.codePointAt(0)!;
      if (cp === 40) out += "\\(";
      else if (cp === 41) out += "\\)";
      else if (cp === 92) out += "\\\\";
      else if (cp < 128) out += ch;
      else {
        // Encode as PDF octal escape (latin1 range) or replace
        if (cp <= 255) {
          out += `\\${cp.toString(8).padStart(3, "0")}`;
        } else {
          // For characters outside latin1 (e.g. Cyrillic), use replacement
          // We'll use UTF-16 hex encoding in the actual text stream below
          out += "?";
        }
      }
    }
    return out;
  };

  // Better approach: use hex strings for all text content
  // Encode text to windows-1252/latin1 via Unicode replacement where possible
  // For Cyrillic: use PDF hex strings with CP1251 encoding declared in font
  const textToHex = (s: string): string => {
    // Map Cyrillic Unicode to CP1251 byte values
    const cyrMap: Record<number, number> = {};
    // Cyrillic uppercase А-Я: U+0410–U+042F → 0xC0–0xDF
    for (let i = 0; i < 32; i++) cyrMap[0x0410 + i] = 0xC0 + i;
    // Cyrillic lowercase а-я: U+0430–U+044F → 0xE0–0xFF
    for (let i = 0; i < 32; i++) cyrMap[0x0430 + i] = 0xE0 + i;
    // Common Cyrillic extras
    cyrMap[0x0401] = 0xA8; // Ё
    cyrMap[0x0451] = 0xB8; // ё
    cyrMap[0x0406] = 0xB2; // І (Ukrainian)
    cyrMap[0x0456] = 0xB3;
    cyrMap[0x0404] = 0xAA;
    cyrMap[0x0454] = 0xBA;
    cyrMap[0x0407] = 0xAF;
    cyrMap[0x0457] = 0xBF;

    let hex = "";
    for (const ch of s) {
      const cp = ch.codePointAt(0)!;
      if (cp < 128) {
        hex += cp.toString(16).padStart(2, "0");
      } else if (cyrMap[cp] !== undefined) {
        hex += cyrMap[cp].toString(16).padStart(2, "0");
      } else if (cp <= 255) {
        hex += cp.toString(16).padStart(2, "0");
      } else {
        hex += "3f"; // '?'
      }
    }
    return hex;
  };

  // Word-wrap lines to fit page width (~85 chars at font size 12)
  const wrapLines = (text: string, maxLen = 85): string[] => {
    const result: string[] = [];
    for (const rawLine of text.split("\n")) {
      if (rawLine.length === 0) { result.push(""); continue; }
      let line = rawLine;
      while (line.length > maxLen) {
        let breakAt = line.lastIndexOf(" ", maxLen);
        if (breakAt < 0) breakAt = maxLen;
        result.push(line.slice(0, breakAt));
        line = line.slice(breakAt + (line[breakAt] === " " ? 1 : 0));
      }
      result.push(line);
    }
    return result;
  };

  const lines = wrapLines(content);
  const pageHeight = 842; // A4 pt
  const pageWidth = 595;
  const margin = 50;
  const fontSize = 12;
  const lineHeight = fontSize * 1.4;
  const linesPerPage = Math.floor((pageHeight - 2 * margin) / lineHeight);

  // Split into pages
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += linesPerPage) {
    pages.push(lines.slice(i, i + linesPerPage));
  }
  if (pages.length === 0) pages.push([""]);

  // Build PDF objects
  const objects: string[] = [];
  const offsets: number[] = [];
  let offset = 0;

  const addObj = (content: string): number => {
    const idx = objects.length + 1;
    offsets.push(offset);
    const obj = `${idx} 0 obj\n${content}\nendobj\n`;
    objects.push(obj);
    offset += enc.encode(obj).length;
    return idx;
  };

  // We need to add header first
  const header = "%PDF-1.4\n";
  offset += enc.encode(header).length;

  // Font object (Helvetica with CP1251 encoding for Cyrillic)
  const fontId = addObj(`<<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n/Encoding /WinAnsiEncoding\n>>`);

  // Build page content streams
  const contentIds: number[] = [];
  for (const pageLines of pages) {
    let stream = "BT\n";
    stream += `/F1 ${fontSize} Tf\n`;
    stream += `${margin} ${pageHeight - margin - fontSize} Td\n`;
    stream += `${lineHeight} TL\n`;
    for (const line of pageLines) {
      if (line === "") {
        stream += "T*\n";
      } else {
        stream += `<${textToHex(line)}> Tj T*\n`;
      }
    }
    stream += "ET\n";
    const streamBytes = enc.encode(stream);
    const contentId = addObj(`<<\n/Length ${streamBytes.length}\n>>\nstream\n${stream}endstream`);
    contentIds.push(contentId);
  }

  // Page objects
  const pageIds: number[] = [];
  for (let i = 0; i < pages.length; i++) {
    const pageId = addObj(`<<\n/Type /Page\n/Parent 999 0 R\n/MediaBox [0 0 ${pageWidth} ${pageHeight}]\n/Contents ${contentIds[i]} 0 R\n/Resources << /Font << /F1 ${fontId} 0 R >> >>\n>>`);
    pageIds.push(pageId);
  }

  // Pages dictionary (placeholder id 999 → we'll replace)
  const pagesKids = pageIds.map(id => `${id} 0 R`).join(" ");
  const pagesId = addObj(`<<\n/Type /Pages\n/Kids [${pagesKids}]\n/Count ${pageIds.length}\n>>`);

  // Fix up page /Parent references: re-build page objects with correct pagesId
  // We'll rebuild the entire PDF with correct references
  // Simpler: just use the actual pagesId we got
  const catalogId = addObj(`<<\n/Type /Catalog\n/Pages ${pagesId} 0 R\n>>`);

  // Now rebuild properly — the page objects reference "999 0 R" for parent
  // We need to fix this. Let's rebuild from scratch with known IDs.

  // === CLEAN REBUILD ===
  const parts: Uint8Array[] = [];
  const xrefOffsets: number[] = [];
  let pos = 0;

  const write = (s: string) => {
    const b = enc.encode(s);
    parts.push(b);
    pos += b.length;
  };

  write("%PDF-1.4\n");

  // Object IDs plan:
  // 1 = Font
  // 2..N+1 = content streams (N = pages.length)
  // N+2..2N+1 = page objects
  // 2N+2 = pages dict
  // 2N+3 = catalog
  const N = pages.length;
  const fontObjId = 1;
  const contentObjBase = 2;
  const pageObjBase = 2 + N;
  const pagesDictId = 2 + 2 * N;
  const catalogObjId = 3 + 2 * N;
  const totalObjs = catalogObjId;

  const writeObj = (id: number, body: string) => {
    xrefOffsets[id] = pos;
    write(`${id} 0 obj\n${body}\nendobj\n`);
  };

  // Font
  writeObj(fontObjId, `<<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n/Encoding /WinAnsiEncoding\n>>`);

  // Content streams
  for (let i = 0; i < N; i++) {
    const pageLines = pages[i];
    let stream = "BT\n";
    stream += `/F1 ${fontSize} Tf\n`;
    stream += `${margin} ${pageHeight - margin - fontSize} Td\n`;
    stream += `${lineHeight} TL\n`;
    for (const line of pageLines) {
      if (line === "") {
        stream += "T*\n";
      } else {
        stream += `<${textToHex(line)}> Tj T*\n`;
      }
    }
    stream += "ET\n";
    const streamBody = `<<\n/Length ${enc.encode(stream).length}\n>>\nstream\n${stream}endstream`;
    writeObj(contentObjBase + i, streamBody);
  }

  // Page objects
  for (let i = 0; i < N; i++) {
    writeObj(pageObjBase + i, `<<\n/Type /Page\n/Parent ${pagesDictId} 0 R\n/MediaBox [0 0 ${pageWidth} ${pageHeight}]\n/Contents ${contentObjBase + i} 0 R\n/Resources << /Font << /F1 ${fontObjId} 0 R >> >>\n>>`);
  }

  // Pages dict
  const kids = Array.from({ length: N }, (_, i) => `${pageObjBase + i} 0 R`).join(" ");
  writeObj(pagesDictId, `<<\n/Type /Pages\n/Kids [${kids}]\n/Count ${N}\n>>`);

  // Catalog
  writeObj(catalogObjId, `<<\n/Type /Catalog\n/Pages ${pagesDictId} 0 R\n>>`);

  // xref table
  const xrefPos = pos;
  write(`xref\n0 ${totalObjs + 1}\n`);
  write(`0000000000 65535 f \n`);
  for (let i = 1; i <= totalObjs; i++) {
    write(`${String(xrefOffsets[i]).padStart(10, "0")} 00000 n \n`);
  }

  // trailer
  write(`trailer\n<<\n/Size ${totalObjs + 1}\n/Root ${catalogObjId} 0 R\n>>\n`);
  write(`startxref\n${xrefPos}\n%%EOF\n`);

  // Merge all parts
  const total = parts.reduce((s, p) => s + p.length, 0);
  const result = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { result.set(p, off); off += p.length; }
  return result;
} // end _buildPdfLegacy

async function executeTool(name: string, input: any): Promise<string> {
  console.log(`Executing tool: ${name}`, JSON.stringify(input));
  switch (name) {
    case "calculator": {
      try {
        const expr = String(input?.expression || "").replace(/[^0-9+\-*/().%\s]/g, "");
        const result = Function('"use strict"; return (' + expr + ')')();
        return JSON.stringify({ result: String(result) });
      } catch {
        return JSON.stringify({ error: "Invalid expression" });
      }
    }
    case "web_search": {
      const query = input?.query || "";
      try {
        // Call claw-web-search exactly like the website does
        const res = await fetch(`${SUPABASE_URL}/functions/v1/claw-web-search`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
          body: JSON.stringify({ query }),
        });
        const data = await res.json();
        console.log("Web search status:", res.status);
        if (data.results?.length) {
          const formatted = data.results.map((r: any) => `${r.title}\n${r.url}\n${r.description || ""}`).join("\n\n");
          return JSON.stringify({ results: formatted });
        }
        return JSON.stringify({ results: "No results found." });
      } catch (e) {
        return JSON.stringify({ error: "Web search failed: " + String(e) });
      }
    }
    case "code_interpreter": {
      const code = input?.code || "";
      const language = input?.language || "javascript";
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/claw-code-interpreter`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
          body: JSON.stringify({ code, language }),
        });
        const data = await res.json();
        return JSON.stringify(data.error ? { error: data.error } : { output: data.output });
      } catch {
        return JSON.stringify({ error: "Code execution failed." });
      }
    }
    case "image_generation": {
      const prompt = input?.prompt || "";
      try {
        // Call model-inference exactly like the website Claw agent does
        const res = await fetch(`${SUPABASE_URL}/functions/v1/model-inference`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
          body: JSON.stringify({ model: "sdxl-turbo", prompt, category: "image-gen" }),
        });
        const data = await res.json();
        console.log("Image generation status:", res.status, JSON.stringify(data).slice(0, 400));
        const rawUrl: string | undefined = data?.imageUrl || data?.data?.[0]?.url || data?.url;
        if (!rawUrl) return JSON.stringify({ error: data?.error || "Image generation failed" });
        // If base64 — upload to claw-images storage bucket and return public URL
        if (rawUrl.startsWith("data:")) {
          try {
            const [meta, base64] = rawUrl.split(",");
            const mimeMatch = meta.match(/data:([^;]+);/);
            const mimeType = mimeMatch?.[1] || "image/png";
            const ext = mimeType.split("/")[1] || "png";
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
            const storageRes = await fetch(
              `${SUPABASE_URL}/storage/v1/object/claw-images/${fileName}`,
              { method: "POST", headers: { "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": mimeType, "x-upsert": "false" }, body: bytes }
            );
            if (storageRes.ok) {
              const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/claw-images/${fileName}`;
              return JSON.stringify({ imageUrl: publicUrl, message: "Image generated" });
            }
          } catch (e) {
            console.warn("Storage upload failed:", e);
          }
          // Fallback: send raw base64
          const b64 = rawUrl.split(",")[1];
          return JSON.stringify({ imageBase64: b64, message: "Image generated" });
        }
        return JSON.stringify({ imageUrl: rawUrl, message: "Image generated" });
      } catch (e) {
        return JSON.stringify({ error: "Image generation failed: " + String(e) });
      }
    }
    case "document_reader": {
      const url = input?.url || "";
      try {
        const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
        if (!firecrawlKey) return JSON.stringify({ error: "Document reader not configured" });
        const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: { "Authorization": `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
        });
        const data = await res.json();
        console.log("Document reader response status:", res.status, "ok:", res.ok);
        const content = data?.data?.markdown || data?.markdown || "";
        if (!content) return JSON.stringify({ error: "Could not extract content from URL. Response: " + JSON.stringify(data).slice(0, 200) });
        return JSON.stringify({ content: content.slice(0, 8000) });
      } catch (e) {
        return JSON.stringify({ error: "Document reading failed: " + String(e) });
      }
    }
    case "voice_message": {
      const text = input?.text || "";
      const voice = input?.voice || "nova";
      try {
        const res = await fetch("https://api.vsegpt.ru/v1/audio/speech", {
          method: "POST",
          headers: { "Authorization": `Bearer ${VSEGPT_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "tts-openai/tts-1", input: text, voice, response_format: "mp3" }),
        });
        if (!res.ok) {
          const err = await res.text();
          console.error("TTS error:", res.status, err);
          return JSON.stringify({ error: "TTS failed: " + err.slice(0, 200) });
        }
        const audioBuffer = await res.arrayBuffer();
        console.log("TTS audio generated, bytes:", audioBuffer.byteLength);

        // Upload to storage so web chat can also show the player
        try {
          const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
          const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false },
          });
          const fileName = `voice_${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`;
          const { data: uploadData, error: uploadErr } = await adminClient.storage
            .from("claw-images")
            .upload(fileName, new Uint8Array(audioBuffer), { contentType: "audio/mpeg", upsert: false });
          if (!uploadErr && uploadData?.path) {
            const { data: { publicUrl } } = adminClient.storage.from("claw-images").getPublicUrl(uploadData.path);
            console.log("TTS uploaded to storage:", publicUrl);
            // Store buffer for direct Telegram send AND return URL for web chat
            const audioKey = `audio_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            if (!(globalThis as any).__audioBuffers) (globalThis as any).__audioBuffers = {};
            (globalThis as any).__audioBuffers[audioKey] = audioBuffer;
            return JSON.stringify({ audioKey, audioUrl: publicUrl, audioFormat: "mp3", message: "Voice message generated" });
          }
          console.warn("Storage upload failed:", uploadErr);
        } catch (uploadEx) {
          console.warn("Storage upload exception:", uploadEx);
        }

        // Fallback: send via multipart only (no web chat URL)
        const audioKey = `audio_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        if (!(globalThis as any).__audioBuffers) (globalThis as any).__audioBuffers = {};
        (globalThis as any).__audioBuffers[audioKey] = audioBuffer;
        return JSON.stringify({ audioKey, audioFormat: "mp3", message: "Voice message generated" });
      } catch (e) {
        return JSON.stringify({ error: "TTS failed: " + String(e) });
      }
    }
    case "file_generator": {
      const { filename, format, content } = input as { filename: string; format: string; content: string };
      try {
        let fileBytes: Uint8Array;
        let mimeType: string;
        let outFilename = filename;

        if (format === "pdf") {
          console.log("Generating PDF with pdf-lib + NotoSans (Cyrillic support)...");
          fileBytes = await buildPdf(content);
          mimeType = "application/pdf";
          outFilename = filename.endsWith(".pdf") ? filename : filename.replace(/\.[^.]+$/, "") + ".pdf";
          console.log("PDF generated, bytes:", fileBytes.byteLength);
        } else {
          mimeType = format === "json" ? "application/json" : "text/plain;charset=utf-8";
          fileBytes = new TextEncoder().encode(content);
        }

        // Store file bytes in global map and return key — main handler sends via multipart
        const fileKey = `file_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        if (!(globalThis as any).__fileBuffers) (globalThis as any).__fileBuffers = {};
        (globalThis as any).__fileBuffers[fileKey] = { bytes: fileBytes, filename: outFilename, mimeType };

        return JSON.stringify({ fileKey, filename: outFilename, format, size: fileBytes.byteLength, message: "File generated successfully" });
      } catch (e) {
        return JSON.stringify({ error: "File generation failed: " + String(e) });
      }
    }
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const botToken = pathParts[pathParts.length - 1];

    if (!botToken) {
      return new Response(JSON.stringify({ error: "Missing bot token" }), { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: bot, error: botError } = await supabase
      .from("claw_telegram_bots")
      .select("*, claw_agents(*)")
      .eq("bot_token", botToken)
      .eq("is_active", true)
      .single();

    if (botError || !bot) {
      return new Response(JSON.stringify({ error: "Bot not found" }), { status: 404, headers: corsHeaders });
    }

    const update = await req.json();
    const message = update?.message || update?.edited_message;
    const hasVoice = !!message?.voice;
    if (!message?.text && !hasVoice) {
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    const chatId = message.chat.id;
    let userText = message.text || "";

    // Transcribe incoming voice message via VseGPT Whisper
    if (hasVoice) {
      try {
        const fileId = message.voice.file_id;
        const fileInfoRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
        const fileInfo = await fileInfoRes.json();
        const filePath = fileInfo?.result?.file_path;
        if (filePath) {
          const audioRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`);
          const audioBuffer = await audioRes.arrayBuffer();
          console.log("Audio buffer size:", audioBuffer.byteLength, "file_path:", filePath);

          // Use our own audio-transcriptions edge function (has correct model mapping)
          try {
            const formData = new FormData();
            formData.append("file", new Blob([audioBuffer], { type: "audio/ogg" }), "voice.ogg");
            formData.append("model", "stt-openai/whisper-v3");
            const transcribeRes = await fetch(`${SUPABASE_URL}/functions/v1/audio-transcriptions`, {
              method: "POST",
              headers: { "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
              body: formData,
            });
            const rawText = await transcribeRes.text();
            console.log("Transcribe status:", transcribeRes.status, "body preview:", rawText.slice(0, 300));
            if (transcribeRes.ok) {
              try {
                const transcribeData = JSON.parse(rawText);
                userText = transcribeData?.text || rawText.trim();
              } catch {
                userText = rawText.trim();
              }
              console.log("Transcription success:", userText.slice(0, 100));
            } else {
              console.error("Transcription failed:", transcribeRes.status, rawText.slice(0, 300));
            }
          } catch (transcribeErr) {
            console.error("Transcription request error:", transcribeErr);
          }
        }
      } catch (e) {
        console.error("Voice transcription failed:", e);
      }
      if (!userText) {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: message.chat.id, text: "⚠️ Could not transcribe your voice message. Please try again." }),
        });
        return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
      }
    }
    const agent = (bot as any).claw_agents;

    if (!agent) {
      return new Response(JSON.stringify({ error: "Agent not found" }), { status: 404, headers: corsHeaders });
    }

    // Send typing action
    await fetch(`https://api.telegram.org/bot${botToken}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action: "typing" }),
    });

    // Find or create conversation for this Telegram chat
    const telegramConvTitle = `Telegram ${chatId}`;
    let conversationId: string;
    const { data: existingConv } = await supabase
      .from("claw_conversations")
      .select("id")
      .eq("agent_id", agent.id)
      .eq("user_id", bot.user_id)
      .eq("title", telegramConvTitle)
      .single();

    if (existingConv) {
      conversationId = existingConv.id;
    } else {
      const { data: newConv } = await supabase
        .from("claw_conversations")
        .insert({ agent_id: agent.id, user_id: bot.user_id, title: telegramConvTitle })
        .select("id")
        .single();
      conversationId = newConv!.id;
    }

    // Load last 50 messages from history
    const { data: historyRows } = await supabase
      .from("claw_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .in("role", ["user", "assistant"])
      .order("created_at", { ascending: false })
      .limit(50);

    const historyMessages = (historyRows || []).reverse().map((m: any) => ({
      role: m.role,
      content: m.content || "",
    }));

    // Save incoming user message
    await supabase.from("claw_messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: userText,
    });
    // Touch conversation so web chat sees it as latest
    await supabase.from("claw_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);

    // Build tools list from agent config
    const agentTools: string[] = Array.isArray(agent.tools) ? agent.tools : [];
    const toolDefs = agentTools
      .filter((t: string) => TOOL_DEFINITIONS[t])
      .map((t: string) => TOOL_DEFINITIONS[t]);

    console.log(`Agent tools: ${agentTools.join(", ")}, toolDefs count: ${toolDefs.length}`);

    // Model mapping
    const modelMapping: Record<string, string> = {
      "llama-3.1-70b": "meta-llama/llama-3.1-70b-instruct",
      "llama-3.1-8b": "meta-llama/llama-3.1-8b-instruct",
      "mistral-large": "mistralai/mistral-large",
      "qwen-72b": "qwen/qwen-2.5-72b-instruct",
      "gpt-4-turbo": "openai/gpt-4-turbo",
      "claude-3-sonnet": "anthropic/claude-sonnet-4",
      "deepseek-r1": "deepseek/deepseek-r1",
      "regraph-llm": "openai/gpt-4o-mini",
    };
    const vsegptModel = modelMapping[agent.model_id] || agent.model_id || "openai/gpt-4o-mini";

    // Agentic loop
    const toolCapabilities: string[] = [];
    if (agentTools.includes("voice_message")) toolCapabilities.push("You CAN send voice messages using the voice_message tool. When the user asks you to speak, read aloud, reply with audio, or send a voice note — you MUST call the voice_message tool with the text.");
    if (agentTools.includes("voice_transcription")) toolCapabilities.push("You can receive and understand voice messages from the user (they are transcribed automatically).");
    const systemSuffix = toolCapabilities.length > 0 ? "\n\n" + toolCapabilities.join("\n") : "";

    const messages: any[] = [
      { role: "system", content: (agent.system_prompt || "You are a helpful assistant.") + systemSuffix },
      ...historyMessages,
      { role: "user", content: userText },
    ];

    // Check balance before inference
    const { data: wallet } = await supabase
      .from("wallets")
      .select("id, balance_usd")
      .eq("user_id", bot.user_id)
      .single();

    if (!wallet || wallet.balance_usd <= 0) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: "⚠️ Insufficient balance. Please top up your ReGraph wallet." }),
      });
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    let finalReply = "Sorry, I couldn't process your request.";
    const MAX_ITERATIONS = 5;
    let generatedImageUrl: string | null = null;
    let generatedImageBase64: string | null = null;
    let generatedAudioUrl: string | null = null;
    let generatedAudioBuffer: ArrayBuffer | null = null;
    let generatedFileKey: string | null = null;
    let totalTokensUsed = 0;
    const startTime = Date.now();

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const reqBody: any = {
        model: vsegptModel,
        messages,
        temperature: 0.7,
        max_tokens: 2048,
      };
      if (toolDefs.length > 0) {
        reqBody.tools = toolDefs;
        reqBody.tool_choice = "auto";
      }

      const inferenceRes = await fetch("https://api.vsegpt.ru/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${VSEGPT_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reqBody),
      });

      if (!inferenceRes.ok) {
        const errText = await inferenceRes.text();
        console.error("Inference error:", inferenceRes.status, errText);
        break;
      }

      const data = await inferenceRes.json();
      const choice = data.choices?.[0];
      const assistantMessage = choice?.message;

      // Accumulate token usage
      if (data.usage?.total_tokens) totalTokensUsed += data.usage.total_tokens;

      if (!assistantMessage) break;

      messages.push(assistantMessage);

      // No tool calls — we have a final answer
      if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
        finalReply = assistantMessage.content || finalReply;
        break;
      }

      // Execute all tool calls
      await fetch(`https://api.telegram.org/bot${botToken}/sendChatAction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, action: "typing" }),
      });

      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function?.name;
        let toolInput: any = {};
        try { toolInput = JSON.parse(toolCall.function?.arguments || "{}"); } catch { /* */ }

        const toolResult = await executeTool(toolName, toolInput);

        // Check for image/audio/file in tool result
        try {
          const parsed = JSON.parse(toolResult);
          if (parsed.imageUrl) {
            generatedImageUrl = parsed.imageUrl;
            finalReply = "🎨 Here's your image!";
          }
          if (parsed.imageBase64) {
            generatedImageBase64 = parsed.imageBase64;
            finalReply = "🎨 Here's your image!";
          }
          if (parsed.fileUrl) {
            // legacy: URL-based (not used anymore)
          }
          if (parsed.fileKey) {
            generatedFileKey = parsed.fileKey;
            finalReply = `📄 ${parsed.filename || "File"} готов`;
          }
          if (parsed.audioUrl) {
            generatedAudioUrl = parsed.audioUrl;
            // Save proper __AUDIO__: prefix so web chat shows audio player
            finalReply = `__AUDIO__:${parsed.audioUrl}`;
          }
          if (parsed.audioKey) {
            // Retrieve raw buffer for direct Telegram multipart send
            const buf = (globalThis as any).__audioBuffers?.[parsed.audioKey];
            if (buf) {
              generatedAudioBuffer = buf;
              delete (globalThis as any).__audioBuffers[parsed.audioKey];
            }
            // If we also have a URL (from storage upload), use it
            if (parsed.audioUrl) {
              finalReply = `__AUDIO__:${parsed.audioUrl}`;
            } else {
              finalReply = "🔊";
            }
          }
        } catch { /* */ }

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: toolResult,
        });
      }

      // If image/audio/file was generated — no need for another LLM call, just exit loop
      if (generatedImageUrl || generatedImageBase64 || generatedAudioBuffer || generatedAudioUrl || generatedFileKey) break;
    }

    // Billing: charge user and log usage
    if (totalTokensUsed > 0) {
      // ~$0.001 per 1k tokens (approximate blended rate)
      const costUsd = Math.max(0.000001, (totalTokensUsed / 1000) * 0.001);
      const computeMs = Date.now() - startTime;
      const newBalance = Math.max(0, wallet.balance_usd - costUsd);

      await Promise.all([
        supabase.from("wallets").update({ balance_usd: newBalance }).eq("user_id", bot.user_id),
        supabase.from("usage_logs").insert({
          user_id: bot.user_id,
          endpoint: "telegram-bot",
          tokens_used: totalTokensUsed,
          compute_time_ms: computeMs,
          cost_usd: costUsd,
        }),
      ]);
    }

    // Send reply to Telegram
    // Save assistant reply to history and touch conversation timestamp
    await supabase.from("claw_messages").insert({
      conversation_id: conversationId,
      role: "assistant",
      content: finalReply,
    });
    await supabase.from("claw_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);

    if (generatedFileKey) {
      // Send file via multipart FormData (no URL — Telegram can't fetch from Supabase Storage)
      try {
        const fileData = (globalThis as any).__fileBuffers?.[generatedFileKey];
        if (fileData) {
          delete (globalThis as any).__fileBuffers[generatedFileKey];
          const blob = new Blob([fileData.bytes], { type: fileData.mimeType });
          const formData = new FormData();
          formData.append("chat_id", String(chatId));
          formData.append("document", blob, fileData.filename);
          formData.append("caption", `📄 ${fileData.filename}`);
          const docRes = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
            method: "POST",
            body: formData,
          });
          if (!docRes.ok) {
            const err = await docRes.text();
            console.error("sendDocument multipart error:", docRes.status, err);
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: chatId, text: "⚠️ Не удалось отправить файл." }),
            });
          } else {
            console.log("sendDocument multipart success:", fileData.filename);
          }
        } else {
          console.error("File buffer not found for key:", generatedFileKey);
        }
      } catch (e) {
        console.error("File send exception:", e);
      }
    } else if (generatedAudioBuffer || generatedAudioUrl) {
      // Always send raw buffer via multipart for proper Telegram voice message
      // generatedAudioBuffer is the raw mp3, generatedAudioUrl is stored for web chat
      const bufferToSend = generatedAudioBuffer;
      if (bufferToSend) {
        try {
          const blob = new Blob([bufferToSend], { type: "audio/mpeg" });
          const formData = new FormData();
          formData.append("chat_id", String(chatId));
          formData.append("voice", blob, "voice.mp3");
          const voiceRes = await fetch(`https://api.telegram.org/bot${botToken}/sendVoice`, {
            method: "POST",
            body: formData,
          });
          const voiceResText = await voiceRes.text();
          if (!voiceRes.ok) {
            console.error("sendVoice buffer error:", voiceRes.status, voiceResText);
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: chatId, text: "🔊 Не удалось отправить голосовое сообщение." }),
            });
          } else {
            console.log("sendVoice success via multipart buffer");
          }
        } catch (e) {
          console.error("Voice buffer send exception:", e);
        }
      } else {
        // No buffer available, fallback to URL (may arrive as file in some clients)
        try {
          const voiceRes = await fetch(`https://api.telegram.org/bot${botToken}/sendVoice`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, voice: generatedAudioUrl }),
          });
          if (!voiceRes.ok) {
            const voiceResText = await voiceRes.text();
            console.error("sendVoice URL error:", voiceRes.status, voiceResText);
          }
        } catch (e) {
          console.error("Voice URL send exception:", e);
        }
      }
    } else if (generatedImageUrl) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, photo: generatedImageUrl, caption: finalReply.slice(0, 1024) }),
      });
    } else if (generatedImageBase64) {
      // Send base64 image via multipart
      const boundary = "----FormBoundary" + Math.random().toString(36).slice(2);
      const caption = finalReply.slice(0, 1024);
      const imgBytes = Uint8Array.from(atob(generatedImageBase64), c => c.charCodeAt(0));
      const enc = new TextEncoder();
      const parts: Uint8Array[] = [
        enc.encode(`--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${chatId}\r\n`),
        enc.encode(`--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n${caption}\r\n`),
        enc.encode(`--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="image.png"\r\nContent-Type: image/png\r\n\r\n`),
        imgBytes,
        enc.encode(`\r\n--${boundary}--\r\n`),
      ];
      const totalLen = parts.reduce((s, p) => s + p.length, 0);
      const body = new Uint8Array(totalLen);
      let offset = 0;
      for (const p of parts) { body.set(p, offset); offset += p.length; }
      await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: "POST",
        headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
        body,
      });
    } else {
      // Send text message with Markdown fallback to plain text
      // Sanitize text for Markdown: escape special chars to avoid parse errors
      const safeText = finalReply.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
      const msgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: safeText, parse_mode: "MarkdownV2" }),
      });
      if (!msgRes.ok) {
        // Fallback: send as plain text (NO retry with Markdown to avoid duplicates)
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: finalReply }),
        });
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
  } catch (err) {
    console.error("Telegram webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: corsHeaders });
  }
});
