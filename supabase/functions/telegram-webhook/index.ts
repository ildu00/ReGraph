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
      description: "Generate and send a file (TXT, JSON, CSV, PDF, DOCX) to the user. Use this tool when the user asks to create, generate, or save a file. NEVER use code_interpreter to generate files — always use this tool instead. For PDF and DOCX, always format the content using Markdown: use # for titles, ## for sections, ### for subsections, **bold** for emphasis, - for bullet lists, numbered lists, and --- for dividers. This produces beautifully formatted documents.",
      parameters: {
        type: "object",
        properties: {
          filename: { type: "string", description: "The file name including extension, e.g. resume.pdf" },
          format: { type: "string", enum: ["txt", "json", "csv", "xlsx", "pdf", "docx"], description: "File format. For tabular data use xlsx. For xlsx, content must be CSV text with comma-separated values and newline-separated rows." },
          content: { type: "string", description: "The full text content of the file. For PDF, use plain text with newlines. For CSV, use comma-separated rows." },
        },
        required: ["filename", "format", "content"],
      },
    },
  },
};

// ─── PDF generation ────────────────────────────────────────────────────────────

async function getNotoSansFont(): Promise<Uint8Array> {
  const FONT_URL = `${SUPABASE_URL}/storage/v1/object/public/claw-images/fonts%2FNotoSans-Regular.ttf`;
  const res = await fetch(FONT_URL, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Font fetch failed: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

// Inline segment: plain text or bold (**text**)
type Segment = { text: string; bold: boolean };

function parseInlineSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  // Strip links, keep display text
  const t = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  const regex = /\*\*(.*?)\*\*|__(.*?)__|([^*_]+|[*_])/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(t)) !== null) {
    if (m[1] !== undefined) segments.push({ text: m[1], bold: true });
    else if (m[2] !== undefined) segments.push({ text: m[2], bold: true });
    else if (m[3]) segments.push({ text: m[3].replace(/\*(.*?)\*/g, "$1").replace(/`(.*?)`/g, "$1"), bold: false });
  }
  return segments.length ? segments : [{ text: t, bold: false }];
}

// Strip all inline markdown to plain text
function stripInline(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

type ParsedLine = {
  text: string;          // raw text (may contain **)
  type: "h1" | "h2" | "h3" | "bullet" | "numbered" | "code" | "hr" | "blank" | "body";
  indent: number;
};

function parseMarkdownLines(content: string): ParsedLine[] {
  const result: ParsedLine[] = [];
  for (const raw of content.split("\n")) {
    if (/^---+$/.test(raw.trim()) || /^\*\*\*+$/.test(raw.trim())) {
      result.push({ text: "", type: "hr", indent: 0 });
    } else if (/^# (.+)/.test(raw)) {
      result.push({ text: raw.replace(/^# /, ""), type: "h1", indent: 0 });
    } else if (/^## (.+)/.test(raw)) {
      result.push({ text: raw.replace(/^## /, ""), type: "h2", indent: 0 });
    } else if (/^### (.+)/.test(raw)) {
      result.push({ text: raw.replace(/^### /, ""), type: "h3", indent: 0 });
    } else if (/^(\s*)[*\-+] (.+)/.test(raw)) {
      const m = raw.match(/^(\s*)[*\-+] (.+)/);
      result.push({ text: m ? m[2] : raw, type: "bullet", indent: m ? Math.floor(m[1].length / 2) : 0 });
    } else if (/^(\s*)\d+\. (.+)/.test(raw)) {
      const m = raw.match(/^(\s*)\d+\. (.+)/);
      result.push({ text: m ? m[2] : raw, type: "numbered", indent: 0 });
    } else if (/^`{3}/.test(raw.trim())) {
      result.push({ text: "", type: "code", indent: 0 });
    } else if (/^\s*$/.test(raw)) {
      result.push({ text: "", type: "blank", indent: 0 });
    } else {
      result.push({ text: raw, type: "body", indent: 0 });
    }
  }
  return result;
}

async function buildPdf(content: string): Promise<Uint8Array> {
  const { PDFDocument, rgb } = await import("npm:pdf-lib@1.17.1");
  const fontkit = (await import("npm:@pdf-lib/fontkit@1.1.1")).default;
  const fontBytes = await getNotoSansFont();

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(fontBytes);

  const pageWidth = 595;
  const pageHeight = 842;
  const marginX = 55;
  const marginY = 55;
  const bodySize = 11;
  const boldSize = 11.5;    // slightly larger to visually distinguish bold
  const h1Size = 20;
  const h2Size = 16;
  const h3Size = 13;
  const lineHeightBody = bodySize * 1.6;
  const maxWidth = pageWidth - 2 * marginX;

  const colorBlack = rgb(0.08, 0.08, 0.08);
  const colorBold  = rgb(0.05, 0.05, 0.05);  // near-black, same font drawn twice for fake-bold
  const colorGray  = rgb(0.45, 0.45, 0.45);
  const colorAccent = rgb(0.12, 0.29, 0.69);
  const colorRule  = rgb(0.8, 0.8, 0.8);
  const colorCode  = rgb(0.95, 0.95, 0.95);

  // Measure text width (strips markdown first)
  const measureW = (text: string, size: number) => {
    try { return font.widthOfTextAtSize(text, size); } catch { return text.length * size * 0.55; }
  };

  // Word-wrap plain text
  const wrapPlain = (text: string, maxW: number, size: number): string[] => {
    const plain = stripInline(text);
    if (!plain.trim()) return [""];
    const words = plain.split(" ");
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const test = cur ? cur + " " + w : w;
      if (measureW(test, size) > maxW && cur) { lines.push(cur); cur = w; }
      else cur = test;
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [""];
  };

  // Draw a line of text with inline bold support, returns advance x
  // Fake-bold: draw text, then shift 0.35px right and draw again
  const drawSegments = (
    page: ReturnType<typeof pdfDoc.addPage>,
    segments: Segment[],
    startX: number, startY: number, size: number, color: ReturnType<typeof rgb>
  ) => {
    let cx = startX;
    for (const seg of segments) {
      if (!seg.text) continue;
      if (seg.bold) {
        page.drawText(seg.text, { x: cx, y: startY, size: boldSize, font, color: colorBold });
        // Fake bold: redraw shifted slightly
        page.drawText(seg.text, { x: cx + 0.35, y: startY, size: boldSize, font, color: colorBold });
        cx += measureW(seg.text, boldSize);
      } else {
        page.drawText(seg.text, { x: cx, y: startY, size, font, color });
        cx += measureW(seg.text, size);
      }
    }
  };

  // Word-wrap with inline segments, splitting bold/plain at word boundaries
  const wrapSegments = (rawText: string, maxW: number, size: number): Segment[][] => {
    // Flatten all segments into words tagged with bold
    const segments = parseInlineSegments(rawText);
    type TaggedWord = { word: string; bold: boolean };
    const tagged: TaggedWord[] = [];
    for (const seg of segments) {
      const words = seg.text.split(" ");
      for (let i = 0; i < words.length; i++) {
        if (words[i]) tagged.push({ word: words[i], bold: seg.bold });
        // restore inter-word space as a plain segment (except last word in segment)
        if (i < words.length - 1) tagged.push({ word: " ", bold: seg.bold });
      }
    }

    const lines: Segment[][] = [];
    let currentLine: TaggedWord[] = [];
    let currentW = 0;

    for (const tw of tagged) {
      const wSize = tw.bold ? boldSize : size;
      const ww = measureW(tw.word, wSize);
      if (currentW + ww > maxW && currentLine.length > 0 && tw.word !== " ") {
        // flush line
        lines.push(mergeTagged(currentLine));
        currentLine = [tw];
        currentW = ww;
      } else {
        currentLine.push(tw);
        currentW += ww;
      }
    }
    if (currentLine.length) lines.push(mergeTagged(currentLine));
    return lines.length ? lines : [[{ text: stripInline(rawText), bold: false }]];
  };

  const mergeTagged = (tagged: { word: string; bold: boolean }[]): Segment[] => {
    const out: Segment[] = [];
    for (const tw of tagged) {
      if (out.length && out[out.length - 1].bold === tw.bold) {
        out[out.length - 1].text += tw.word;
      } else {
        out.push({ text: tw.word, bold: tw.bold });
      }
    }
    return out;
  };

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - marginY;

  const ensureSpace = (needed: number) => {
    if (y - needed < marginY) {
      const pageNum = pdfDoc.getPageCount();
      currentPage.drawText(`— ${pageNum} —`, { x: pageWidth / 2 - 15, y: marginY / 2, size: 9, font, color: colorGray });
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - marginY;
    }
  };

  for (const parsed of parseMarkdownLines(content)) {
    if (parsed.type === "blank") { y -= lineHeightBody * 0.4; continue; }

    if (parsed.type === "hr") {
      ensureSpace(20); y -= 6;
      currentPage.drawLine({ start: { x: marginX, y }, end: { x: pageWidth - marginX, y }, thickness: 0.8, color: colorRule });
      y -= 12; continue;
    }

    if (parsed.type === "h1") {
      ensureSpace(h1Size * 2.5); y -= 14;
      currentPage.drawRectangle({ x: marginX - 5, y: y - 4, width: pageWidth - 2 * marginX + 10, height: h1Size + 10, color: rgb(0.92, 0.95, 1.0) });
      currentPage.drawRectangle({ x: marginX - 5, y: y - 4, width: 4, height: h1Size + 10, color: colorAccent });
      for (const line of wrapPlain(parsed.text, maxWidth - 20, h1Size)) {
        ensureSpace(h1Size * 1.5);
        currentPage.drawText(line, { x: marginX + 8, y, size: h1Size, font, color: colorAccent });
        y -= h1Size * 1.5;
      }
      y -= 6; continue;
    }

    if (parsed.type === "h2") {
      ensureSpace(h2Size * 2.2); y -= 10;
      for (const line of wrapPlain(parsed.text, maxWidth, h2Size)) {
        ensureSpace(h2Size * 1.4);
        currentPage.drawText(line, { x: marginX, y, size: h2Size, font, color: colorAccent });
        y -= h2Size * 1.4;
      }
      y -= 4; continue;
    }

    if (parsed.type === "h3") {
      ensureSpace(h3Size * 2); y -= 8;
      for (const line of wrapPlain(parsed.text, maxWidth, h3Size)) {
        ensureSpace(h3Size * 1.3);
        currentPage.drawText(line, { x: marginX, y, size: h3Size, font, color: colorBlack });
        y -= h3Size * 1.3;
      }
      y -= 4; continue;
    }

    if (parsed.type === "bullet") {
      const indentOffset = parsed.indent * 16;
      const bulletX = marginX + indentOffset;
      const textX = bulletX + 14;
      const lines = wrapSegments(parsed.text, maxWidth - indentOffset - 14, bodySize);
      for (let i = 0; i < lines.length; i++) {
        ensureSpace(lineHeightBody);
        if (i === 0) currentPage.drawCircle({ x: bulletX + 3, y: y + 3, size: 2.5, color: colorAccent });
        drawSegments(currentPage, lines[i], textX, y, bodySize, colorBlack);
        y -= lineHeightBody;
      }
      continue;
    }

    if (parsed.type === "numbered") {
      for (const lineSegs of wrapSegments(parsed.text, maxWidth - 20, bodySize)) {
        ensureSpace(lineHeightBody);
        drawSegments(currentPage, lineSegs, marginX + 16, y, bodySize, colorBlack);
        y -= lineHeightBody;
      }
      continue;
    }

    if (parsed.type === "code") {
      ensureSpace(lineHeightBody);
      currentPage.drawRectangle({ x: marginX - 4, y: y - 2, width: maxWidth + 8, height: lineHeightBody, color: colorCode });
      y -= lineHeightBody * 0.5; continue;
    }

    // body — support inline bold
    for (const lineSegs of wrapSegments(parsed.text, maxWidth, bodySize)) {
      ensureSpace(lineHeightBody);
      drawSegments(currentPage, lineSegs, marginX, y, bodySize, colorBlack);
      y -= lineHeightBody;
    }
  }

  const pageNum = pdfDoc.getPageCount();
  currentPage.drawText(`— ${pageNum} —`, { x: pageWidth / 2 - 15, y: marginY / 2, size: 9, font, color: colorGray });

  return new Uint8Array(await pdfDoc.save());
}

// ─── DOCX generation ────────────────────────────────────────────────────────────

async function buildDocx(content: string): Promise<Uint8Array> {
  // Build a minimal .docx (Open XML) with markdown-aware formatting
  // DOCX = ZIP with word/document.xml inside
  const JSZip = (await import("npm:jszip@3.10.1")).default;

  const parseInline = (text: string): string => {
    // Convert inline markdown to plain text for XML (we'll use runs with styles)
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  };

  const boldRun = (text: string) =>
    `<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${parseInline(text)}</w:t></w:r>`;
  const normalRun = (text: string) =>
    `<w:r><w:t xml:space="preserve">${parseInline(text)}</w:t></w:r>`;

  const parseInlineRuns = (text: string): string => {
    // Handle **bold**, *italic*, `code`
    const parts: string[] = [];
    const regex = /\*\*(.*?)\*\*|\*(.*?)\*|`(.*?)`|([^*`]+)/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      if (m[1]) parts.push(`<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${parseInline(m[1])}</w:t></w:r>`);
      else if (m[2]) parts.push(`<w:r><w:rPr><w:i/></w:rPr><w:t xml:space="preserve">${parseInline(m[2])}</w:t></w:r>`);
      else if (m[3]) parts.push(`<w:r><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/><w:sz w:val="18"/><w:shd w:val="clear" w:fill="F0F0F0"/></w:rPr><w:t xml:space="preserve">${parseInline(m[3])}</w:t></w:r>`);
      else if (m[4]) parts.push(normalRun(m[4]));
    }
    return parts.join("");
  };

  const paragraphs: string[] = [];
  const lines = content.split("\n");

  for (const raw of lines) {
    if (/^# (.+)/.test(raw)) {
      const text = raw.replace(/^# /, "");
      paragraphs.push(`<w:p><w:pPr><w:pStyle w:val="Heading1"/><w:spacing w:before="240" w:after="120"/></w:pPr>${boldRun(text)}</w:p>`);
    } else if (/^## (.+)/.test(raw)) {
      const text = raw.replace(/^## /, "");
      paragraphs.push(`<w:p><w:pPr><w:pStyle w:val="Heading2"/><w:spacing w:before="180" w:after="80"/></w:pPr>${boldRun(text)}</w:p>`);
    } else if (/^### (.+)/.test(raw)) {
      const text = raw.replace(/^### /, "");
      paragraphs.push(`<w:p><w:pPr><w:pStyle w:val="Heading3"/><w:spacing w:before="120" w:after="60"/></w:pPr>${boldRun(text)}</w:p>`);
    } else if (/^[*\-+] (.+)/.test(raw)) {
      const text = raw.replace(/^[*\-+] /, "");
      paragraphs.push(`<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>${parseInlineRuns(text)}</w:p>`);
    } else if (/^\d+\. (.+)/.test(raw)) {
      const text = raw.replace(/^\d+\. /, "");
      paragraphs.push(`<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr></w:pPr>${parseInlineRuns(text)}</w:p>`);
    } else if (/^---+$/.test(raw.trim())) {
      paragraphs.push(`<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="AAAAAA"/></w:pBdr></w:pPr></w:p>`);
    } else if (/^\s*$/.test(raw)) {
      paragraphs.push(`<w:p><w:pPr><w:spacing w:after="80"/></w:pPr></w:p>`);
    } else {
      paragraphs.push(`<w:p><w:pPr><w:spacing w:after="80"/></w:pPr>${parseInlineRuns(raw)}</w:p>`);
    }
  }

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<w:body>
${paragraphs.join("\n")}
<w:sectPr>
  <w:pgSz w:w="12240" w:h="15840"/>
  <w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="709" w:footer="709" w:gutter="0"/>
</w:sectPr>
</w:body>
</w:document>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:keepNext/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="36"/><w:color w:val="1F4DB7"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:keepNext/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="28"/><w:color w:val="1F4DB7"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:basedOn w:val="Normal"/>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="24"/><w:color w:val="374151"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="ListParagraph">
    <w:name w:val="List Paragraph"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr><w:ind w:left="720"/></w:pPr>
  </w:style>
</w:styles>`;

  const numberingXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="0">
    <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl>
  </w:abstractNum>
  <w:abstractNum w:abstractNumId="1">
    <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl>
  </w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
  <w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>
</w:numbering>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
</Relationships>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
</Types>`;

  const appRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const zip = new JSZip();
  zip.file("word/document.xml", documentXml);
  zip.file("word/styles.xml", stylesXml);
  zip.file("word/numbering.xml", numberingXml);
  zip.file("word/_rels/document.xml.rels", relsXml);
  zip.file("[Content_Types].xml", contentTypesXml);
  zip.file("_rels/.rels", appRelsXml);

  const blob = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 } });
  return blob;
}

// ─── End document generation ───────────────────────────────────────────────────

// In-memory buffer for file tool results (per-request)
const __fileBuffers: Map<string, { bytes: Uint8Array; filename: string; mimeType: string }> = new Map();

async function executeTool(name: string, input: any): Promise<string> {
  console.log(`Executing tool: ${name}`, JSON.stringify(input));
  switch (name) {
    case "calculator": {
      const expr = input?.expression || "";
      try {
        const result = Function(`"use strict"; return (${expr})`)();
        return String(result);
      } catch (e: any) {
        return "Error: " + e.message;
      }
    }
    case "web_search": {
      const query = input?.query || "";
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/claw-web-search`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
          body: JSON.stringify({ query }),
        });
        if (!res.ok) return "Search failed: " + res.status;
        const data = await res.json();
        return typeof data === "string" ? data : JSON.stringify(data);
      } catch (e: any) {
        return "Search error: " + e.message;
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
        if (!res.ok) return "Code error: " + res.status;
        const data = await res.json();
        return data?.output || data?.result || JSON.stringify(data);
      } catch (e: any) {
        return "Code error: " + e.message;
      }
    }
    case "image_generation": {
      const prompt = input?.prompt || "";
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/model-inference`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
          body: JSON.stringify({ model: "dall-e-3", prompt, category: "image-gen" }),
        });
        const data = await res.json();
        if (!res.ok) {
          console.error("Image generation error:", JSON.stringify(data));
          return "Image generation failed: " + (data?.error || res.status);
        }
        const url = data?.imageUrl || data?.url || data?.data?.[0]?.url || data?.response;
        if (!url) {
          console.error("Image generation: no URL in response", JSON.stringify(data));
          return "Image generation failed: no URL in response";
        }
        return `__IMAGE__:${url}`;
      } catch (e: any) {
        return "Image error: " + e.message;
      }
    }
    case "document_reader": {
      const url = input?.url || "";
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/claw-document-reader`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
          body: JSON.stringify({ url }),
        });
        if (!res.ok) return "Document read failed: " + res.status;
        const data = await res.json();
        return data?.content || data?.text || JSON.stringify(data);
      } catch (e: any) {
        return "Document error: " + e.message;
      }
    }
    case "voice_message": {
      const text = input?.text || "";
      const voice = input?.voice || "nova";
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/audio-speech`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
          body: JSON.stringify({ input: text, voice, model: "tts-1", response_format: "opus" }),
        });
        if (!res.ok) return "Voice generation failed: " + res.status;
        const audioBytes = new Uint8Array(await res.arrayBuffer());
        const key = `voice_${Date.now()}`;
        __fileBuffers.set(key, { bytes: audioBytes, filename: "voice.ogg", mimeType: "audio/ogg; codecs=opus" });
        return `__VOICE__:${key}`;
      } catch (e: any) {
        return "Voice error: " + e.message;
      }
    }
// ─── XLSX generation ─────────────────────────────────────────────────────────

async function buildXlsx(content: string): Promise<Uint8Array> {
  const JSZip = (await import("npm:jszip@3.10.1")).default;

  // Parse content into rows: supports markdown tables, CSV, and plain lines
  const rawRows = content.trim().split("\n").map(line => {
    const t = line.trim();
    if (t.startsWith("|")) {
      return t.split("|").map(c => c.trim()).filter((_, i, a) => i > 0 && i < a.length - 1);
    }
    // CSV row — handle quoted values
    const cells: string[] = [];
    let cur = "", inQ = false;
    for (const ch of t + ",") {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === "," && !inQ) { cells.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    return cells;
  });
  // Filter separator rows (e.g. |---|---|)
  const rows = rawRows.filter(r => r.length > 0 && !r.every(c => /^[-:]+$/.test(c) || c === ""));

  const numCols = Math.max(...rows.map(r => r.length));
  const isHeader = (ri: number) => ri === 0; // first row = header

  // Calculate max char width per column for auto-fit
  const colWidths = Array.from({ length: numCols }, (_, ci) =>
    Math.max(10, ...rows.map(r => (r[ci] ?? "").length + 2))
  );

  // Build shared strings
  const allStrings: string[] = [];
  const strIndex: Map<string, number> = new Map();
  const getStrIdx = (s: string) => {
    if (!strIndex.has(s)) { strIndex.set(s, allStrings.length); allStrings.push(s); }
    return strIndex.get(s)!;
  };

  // Number-to-column letter (A, B, ..., Z, AA, ...)
  const colLetter = (ci: number): string => {
    let s = "";
    let n = ci;
    do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; } while (n >= 0);
    return s;
  };

  // Build sheet rows XML — header row uses style 1 (bold)
  const sheetRows = rows.map((cols, ri) => {
    const cells = Array.from({ length: numCols }, (_, ci) => {
      const val = cols[ci] ?? "";
      const ref = `${colLetter(ci)}${ri + 1}`;
      const styleAttr = isHeader(ri) ? ` s="1"` : "";
      const num = Number(val.replace(/\s/g, "").replace(",", "."));
      if (!isNaN(num) && val.trim() !== "" && !isHeader(ri)) {
        return `<c r="${ref}"${styleAttr}><v>${num}</v></c>`;
      }
      const si = getStrIdx(val);
      return `<c r="${ref}" t="s"${styleAttr}><v>${si}</v></c>`;
    }).join("");
    return `<row r="${ri + 1}">${cells}</row>`;
  }).join("");

  // Column widths XML
  const colsXml = `<cols>${colWidths.map((w, ci) =>
    `<col min="${ci + 1}" max="${ci + 1}" width="${w}" customWidth="1" bestFit="1"/>`
  ).join("")}</cols>`;

  const sharedStringsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${allStrings.length}" uniqueCount="${allStrings.length}">
${allStrings.map(s => `<si><t xml:space="preserve">${s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}</t></si>`).join("\n")}
</sst>`;

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" mc:Ignorable="x14ac" xmlns:x14ac="http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac">
  <sheetFormatPr defaultRowHeight="15" x14ac:dyDescent="0.25"/>
  ${colsXml}
  <sheetData>${sheetRows}</sheetData>
  <autoFilter ref="A1:${colLetter(numCols - 1)}1"/>
</worksheet>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="3">
    <font><sz val="11"/><name val="Calibri"/><color theme="1"/></font>
    <font><b/><sz val="11"/><name val="Calibri"/><color rgb="FFFFFFFF"/></font>
    <font><sz val="11"/><name val="Calibri"/><color theme="1"/></font>
  </fonts>
  <fills count="4">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF2563EB"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF0F4FF"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFBFDBFE"/></left>
      <right style="thin"><color rgb="FFBFDBFE"/></right>
      <top style="thin"><color rgb="FFBFDBFE"/></top>
      <bottom style="thin"><color rgb="FFBFDBFE"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="3">
    <xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyFont="1"><alignment wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyFont="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
  </cellXfs>
</styleSheet>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const topRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  const zip = new JSZip();
  zip.file("[Content_Types].xml", contentTypes);
  zip.file("_rels/.rels", topRels);
  zip.file("xl/workbook.xml", workbookXml);
  zip.file("xl/_rels/workbook.xml.rels", workbookRels);
  zip.file("xl/worksheets/sheet1.xml", sheetXml);
  zip.file("xl/sharedStrings.xml", sharedStringsXml);
  zip.file("xl/styles.xml", stylesXml);

  return await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
  const allStrings: string[] = [];
  const strIndex: Map<string, number> = new Map();
  const getStrIdx = (s: string) => {
    if (!strIndex.has(s)) { strIndex.set(s, allStrings.length); allStrings.push(s); }
    return strIndex.get(s)!;
  };

  // Build sheet data XML
  const sheetRows = rows.map((cols, ri) => {
    const cells = cols.map((val, ci) => {
      const colLetter = String.fromCharCode(65 + ci);
      const ref = `${colLetter}${ri + 1}`;
      const num = Number(val.replace(/,/g, "."));
      if (!isNaN(num) && val.trim() !== "") {
        return `<c r="${ref}"><v>${num}</v></c>`;
      }
      const si = getStrIdx(val);
      return `<c r="${ref}" t="s"><v>${si}</v></c>`;
    }).join("");
    return `<row r="${ri + 1}">${cells}</row>`;
  }).join("");

  const sharedStringsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${allStrings.length}" uniqueCount="${allStrings.length}">
${allStrings.map(s => `<si><t xml:space="preserve">${s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</t></si>`).join("\n")}
</sst>`;

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${sheetRows}</sheetData>
</worksheet>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><name val="Calibri"/></font>
  </fonts>
  <fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0"/>
  </cellXfs>
</styleSheet>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const topRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  const zip = new JSZip();
  zip.file("[Content_Types].xml", contentTypes);
  zip.file("_rels/.rels", topRels);
  zip.file("xl/workbook.xml", workbookXml);
  zip.file("xl/_rels/workbook.xml.rels", workbookRels);
  zip.file("xl/worksheets/sheet1.xml", sheetXml);
  zip.file("xl/sharedStrings.xml", sharedStringsXml);
  zip.file("xl/styles.xml", stylesXml);



    case "file_generator": {
      const { filename, format, content } = input as { filename: string; format: string; content: string };
      try {
        let bytes: Uint8Array;
        let mimeType: string;

        if (format === "pdf") {
          bytes = await buildPdf(content);
          mimeType = "application/pdf";
        } else if (format === "docx") {
          bytes = await buildDocx(content);
          mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        } else if (format === "xlsx") {
          bytes = await buildXlsx(content);
          mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        } else if (format === "csv") {
          bytes = new TextEncoder().encode(content);
          mimeType = "text/csv";
        } else if (format === "json") {
          bytes = new TextEncoder().encode(content);
          mimeType = "application/json";
        } else {
          bytes = new TextEncoder().encode(content);
          mimeType = "text/plain";
        }

        const key = `file_${Date.now()}`;
        __fileBuffers.set(key, { bytes, filename, mimeType });
        return `__FILE__:${key}`;
      } catch (e: any) {
        console.error("file_generator error:", e);
        return "File generation error: " + e.message;
      }
    }
    default:
      return `Unknown tool: ${name}`;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response("OK");
  }

  // Extract bot token from URL path: /telegram-webhook/{bot_token}
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/");
  const botToken = pathParts[pathParts.length - 1];

  if (!botToken || botToken === "telegram-webhook") {
    return new Response(JSON.stringify({ error: "No bot token in path" }), { status: 400, headers: corsHeaders });
  }

  const message = body?.message;
  if (!message) return new Response("OK");

  const chatId = message?.chat?.id;
  const voiceFileId = message?.voice?.file_id;
  const userText_raw = message?.text || "";

  // Transcribe voice if present
  let userText = userText_raw;
  if (voiceFileId && !userText) {
    try {
      const fileInfoRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${voiceFileId}`);
      const fileInfo = await fileInfoRes.json();
      const filePath = fileInfo?.result?.file_path;
      if (filePath) {
        const audioRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`);
        const audioBytes = new Uint8Array(await audioRes.arrayBuffer());
        const audioFormData = new FormData();
        audioFormData.append("file", new Blob([audioBytes], { type: "audio/ogg" }), "voice.ogg");
        audioFormData.append("model", "stt-openai/whisper-v3");
        const transcribeRes = await fetch(`${SUPABASE_URL}/functions/v1/audio-transcriptions`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
          body: audioFormData,
        });
        if (transcribeRes.ok) {
          const td = await transcribeRes.json();
          userText = td?.text || "";
          console.log("Voice transcribed:", userText.slice(0, 100));
        } else {
          const errText = await transcribeRes.text();
          console.error("Transcription error:", transcribeRes.status, errText);
        }
      }
    } catch (e) {
      console.error("Voice transcription failed:", e);
    }
  }

  if (!userText) {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: "Пожалуйста, отправьте текстовое или голосовое сообщение." }),
    });
    return new Response("OK");
  }

  // Find bot configuration in DB
  const { data: botConfig } = await supabase
    .from("claw_telegram_bots")
    .select("agent_id, user_id, allowed_user_ids")
    .eq("bot_token", botToken)
    .eq("is_active", true)
    .single();

  if (!botConfig) {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: "Бот не настроен. Подключите его в панели управления ReGraph." }),
    });
    return new Response("OK");
  }

  const { agent_id, user_id, allowed_user_ids } = botConfig;

  // Check allowed user IDs restriction
  if (allowed_user_ids && allowed_user_ids.trim()) {
    const allowedIds = allowed_user_ids.split(",").map((id: string) => id.trim()).filter(Boolean);
    const tgUserId = String(message?.from?.id ?? "");
    if (allowedIds.length > 0 && !allowedIds.includes(tgUserId)) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: "⛔ Access denied. You are not authorized to use this bot." }),
      });
      return new Response("OK");
    }
  }

  // Get agent config
  const { data: agent } = await supabase
    .from("claw_agents")
    .select("*")
    .eq("id", agent_id)
    .single();

  if (!agent) return new Response("OK");

  const agentToolsList: string[] = Array.isArray(agent.tools) ? agent.tools : [];

  // Handle slash commands if the commands skill is enabled
  if (agentToolsList.includes("commands") && userText.startsWith("/")) {
    const cmd = userText.trim().toLowerCase().split(/\s+/)[0];
    let replyText = "";

    if (cmd === "/help") {
      replyText =
        "Available commands:\n\n" +
        "/help — show this help message\n" +
        "/model — show the current model\n" +
        "/verbose — toggle verbose mode\n" +
        "/new — start a new conversation\n" +
        "/usage — show balance & usage stats";
    } else if (cmd === "/model") {
      replyText = `Current model: ${agent.model_id}`;
    } else if (cmd === "/verbose") {
      replyText = "Verbose mode toggle is available in the web interface.";
    } else if (cmd === "/new") {
      // Create a new conversation for this Telegram chat
      const newTitle = `Telegram ${chatId} ${Date.now()}`;
      await supabase.from("claw_conversations").insert({ agent_id, user_id, title: newTitle });
      replyText = "✅ New conversation started.";
    } else if (cmd === "/usage") {
      const { data: walletUsage } = await supabase.from("wallets").select("balance_usd").eq("user_id", user_id).single();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: logs } = await supabase.from("usage_logs").select("cost_usd, tokens_used").eq("user_id", user_id).gte("created_at", thirtyDaysAgo);
      const totalCost = (logs || []).reduce((s: number, l: any) => s + Number(l.cost_usd), 0);
      const totalTokens = (logs || []).reduce((s: number, l: any) => s + Number(l.tokens_used), 0);
      replyText =
        `Billing & Usage (last 30 days)\n\n` +
        `💰 Balance: $${Number(walletUsage?.balance_usd ?? 0).toFixed(4)}\n` +
        `📊 Spent: $${totalCost.toFixed(4)}\n` +
        `🔢 Tokens: ${totalTokens.toLocaleString()}\n` +
        `📅 Requests: ${(logs || []).length}`;
    }

    if (replyText) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: replyText }),
      });
      return new Response("OK");
    }
  }

  // Check wallet balance
  const { data: wallet } = await supabase
    .from("wallets")
    .select("balance_usd")
    .eq("user_id", user_id)
    .single();

  if (!wallet || wallet.balance_usd <= 0) {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: "⚠️ Insufficient balance. Top up your account at regraph.tech" }),
    });
    return new Response("OK");
  }

  // Get or create conversation for this chat
  const convTitle = `Telegram ${chatId}`;
  let { data: conv } = await supabase
    .from("claw_conversations")
    .select("id")
    .eq("agent_id", agent_id)
    .eq("user_id", user_id)
    .eq("title", convTitle)
    .single();

  if (!conv) {
    const { data: newConv } = await supabase
      .from("claw_conversations")
      .insert({ agent_id, user_id, title: convTitle })
      .select("id")
      .single();
    conv = newConv;
  }

  if (conv) {
    await supabase.from("claw_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conv.id);
  }

  const convId = conv?.id;

  // Load last 50 messages for context
  const { data: history } = convId ? await supabase
    .from("claw_messages")
    .select("role, content")
    .eq("conversation_id", convId)
    .order("created_at", { ascending: false })
    .limit(50) : { data: [] };

  // Only keep user/assistant messages — tool/function roles break OpenAI API without paired tool_calls
  const sanitizeContentForLLM = (content: string): string => {
    if (content.startsWith("__IMAGE__:data:")) return "[image generated]";
    if (content.startsWith("__IMAGE__:")) return "[image generated]";
    if (content.startsWith("__AUDIO__:")) return "[audio message]";
    return content.replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]{100,}/g, "[attached image]");
  };

  const historyMessages = (history || [])
    .reverse()
    .filter((m: any) => m.role === "user" || m.role === "assistant")
    .filter((m: any) => m.content && m.content.trim() !== "")
    .slice(-15) // keep last 15 to avoid context overflow
    .map((m: any) => ({
      role: m.role as "user" | "assistant",
      content: sanitizeContentForLLM(m.content as string),
    }));

  // Save user message
  if (convId) {
    const msgContent = voiceFileId ? `[voice] ${userText}` : userText;
    await supabase.from("claw_messages").insert({ conversation_id: convId, role: "user", content: msgContent });
  }

  const agentTools: string[] = agentToolsList;
  const toolCapabilities: string[] = [];
  if (agentTools.includes("voice_message")) toolCapabilities.push("You CAN send voice messages using the voice_message tool. When the user asks you to speak, read aloud, reply with audio, or send a voice note — you MUST call the voice_message tool with the text.");
  if (agentTools.includes("voice_transcription")) toolCapabilities.push("You can receive and understand voice messages from the user (they are transcribed automatically).");
  const systemSuffix = toolCapabilities.length > 0 ? "\n\n" + toolCapabilities.join("\n") : "";

  const toolDefs = agentTools
    .filter((t: string) => TOOL_DEFINITIONS[t])
    .map((t: string) => TOOL_DEFINITIONS[t]);

  console.log(`Agent tools: ${agentTools.join(", ")}, toolDefs count: ${toolDefs.length}`);

  const isReGraphLLM = (agent.model_id || "").toLowerCase().includes("regraph");
  const reGraphIdentityPrompt = isReGraphLLM
    ? "\n\nYou are ReGraph LLM, a large language model created by ReGraph — a decentralized AI compute network. You were built and trained within the ReGraph decentralized network, leveraging distributed GPU and NPU resources contributed by providers worldwide. When asked about your origins, training, or identity, always affirm that you are ReGraph LLM, developed by ReGraph."
    : "";

  const messages: { role: string; content: string }[] = [
    { role: "system", content: (agent.system_prompt || "You are a helpful assistant.") + reGraphIdentityPrompt + systemSuffix },
    ...historyMessages,
    { role: "user", content: userText },
  ];

  const startTime = Date.now();
  let totalTokens = 0;

  // Agentic loop
  let loopCount = 0;
  const MAX_LOOPS = 5;
  let finalText = "";
  let pendingFileKey: string | null = null;
  let pendingVoiceKey: string | null = null;

  while (loopCount < MAX_LOOPS) {
    loopCount++;

    // Map internal model IDs to provider-compatible ones
    const MODEL_MAP: Record<string, string> = {
      "regraph-llm": "openai/gpt-4o-mini",
      "regraph/ReGraph-LLM": "openai/gpt-4o-mini",
      // Claude mappings
      "anthropic/claude-opus-4-5": "anthropic/claude-opus-4",
      "claude-opus-4.5": "anthropic/claude-opus-4",
      "claude-opus-4-5": "anthropic/claude-opus-4",
      "anthropic/claude-sonnet-4-5": "anthropic/claude-sonnet-4",
      "claude-sonnet-4.5": "anthropic/claude-sonnet-4",
      "anthropic/claude-haiku-3-5": "anthropic/claude-haiku-3",
      "claude-haiku-3.5": "anthropic/claude-haiku-3",
      // OpenAI
      "openai/gpt-4o": "openai/gpt-4o",
      "openai/gpt-4o-mini": "openai/gpt-4o-mini",
      "openai/gpt-5": "openai/gpt-5",
      "openai/gpt-5-mini": "openai/gpt-5-mini",
      // Gemini
      "google/gemini-2.5-pro": "google/gemini-2.5-pro",
      "google/gemini-2.5-flash": "google/gemini-2.5-flash",
      // DeepSeek
      "deepseek/deepseek-r1": "deepseek/deepseek-r1",
      "deepseek/deepseek-chat": "deepseek/deepseek-chat",
    };
    const rawModel = agent.model_id || "openai/gpt-4o-mini";
    const resolvedModel = MODEL_MAP[rawModel] || rawModel;

    const reqBody: any = {
      model: resolvedModel,
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    };
    if (toolDefs.length > 0) {
      reqBody.tools = toolDefs;
      reqBody.tool_choice = "auto";
    }

    const aiRes = await fetch("https://api.vsegpt.ru/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${VSEGPT_API_KEY}`,
      },
      body: JSON.stringify(reqBody),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI API error:", errText);
      let errMsg = "An error occurred while contacting the AI model. Please try again later.";
      try {
        const errJson = JSON.parse(errText);
        const detail = errJson?.error?.message || "";
        if (aiRes.status === 429) errMsg = "Rate limit exceeded. Please try again in a moment.";
        else if (aiRes.status === 402) errMsg = "Insufficient AI credits. Please contact support.";
        else if (detail.toLowerCase().includes("not found")) errMsg = `AI model not found: ${resolvedModel}. Please update the agent's model in settings.`;
      } catch { /* use default message */ }
      finalText = errMsg;
      break;
    }

    const aiData = await aiRes.json();
    totalTokens += aiData?.usage?.total_tokens || 0;

    const choice = aiData?.choices?.[0];
    const assistantMsg = choice?.message;

    if (!assistantMsg) { finalText = "No response received from AI. Please try again."; break; }

    // Check for tool calls
    if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
      // MUST push full assistant message with tool_calls, otherwise tool role messages fail validation
      messages.push({ role: "assistant", content: assistantMsg.content || "", tool_calls: assistantMsg.tool_calls } as any);

      for (const toolCall of assistantMsg.tool_calls) {
        const toolName = toolCall.function.name;
        let toolInput: any = {};
        try { toolInput = JSON.parse(toolCall.function.arguments || "{}"); } catch {}

        const toolResult = await executeTool(toolName, toolInput);

        // Handle special file/voice results
        if (toolResult.startsWith("__FILE__:")) {
          pendingFileKey = toolResult.replace("__FILE__:", "");
          // Stop loop immediately — no need for a follow-up AI response
          loopCount = MAX_LOOPS;
        } else if (toolResult.startsWith("__VOICE__:")) {
          pendingVoiceKey = toolResult.replace("__VOICE__:", "");
          // Stop loop immediately — no need for a follow-up AI response
          loopCount = MAX_LOOPS;
        } else if (toolResult.startsWith("__IMAGE__:")) {
          // Send image immediately and stop loop
          let imgUrl = toolResult.replace("__IMAGE__:", "");

          // If it's a base64 data URL — upload to storage first (Telegram 413 error otherwise)
          if (imgUrl.startsWith("data:")) {
            try {
              const [meta, base64] = imgUrl.split(",");
              const mimeMatch = meta.match(/data:([^;]+);/);
              const mimeType = mimeMatch?.[1] || "image/png";
              const ext = mimeType.split("/")[1] || "png";
              const binary = atob(base64);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
              const fileName = `tg_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
              const { data: uploadData, error: uploadErr } = await supabase.storage
                .from("claw-images")
                .upload(fileName, bytes, { contentType: mimeType, upsert: false });
              if (uploadData?.path) {
                const { data: { publicUrl } } = supabase.storage.from("claw-images").getPublicUrl(uploadData.path);
                imgUrl = publicUrl;
              } else {
                console.error("Image upload to storage failed:", uploadErr);
              }
            } catch (uploadErr) {
              console.error("Image base64 upload error:", uploadErr);
            }
          }

          const sendPhotoRes = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, photo: imgUrl }),
          });
          const sendPhotoData = await sendPhotoRes.json();
          console.log("sendPhoto result:", JSON.stringify(sendPhotoData));
          // Save to DB
          if (convId) {
            await supabase.from("claw_messages").insert({ conversation_id: convId, role: "assistant", content: `__IMAGE__:${imgUrl}` });
            await supabase.from("claw_conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
          }
          loopCount = MAX_LOOPS; // Stop loop — image sent, no text needed
        }

        messages.push({
          role: "tool",
          content: toolResult.startsWith("__") ? "File/audio generated successfully." : toolResult,
          // @ts-ignore
          tool_call_id: toolCall.id,
        });
      }

      // Continue loop to get final response
      continue;
    }

    // No tool calls — this is the final text response
    finalText = assistantMsg.content || "";
    break;
  }

  // Send voice if pending
  if (pendingVoiceKey) {
    const fileData = __fileBuffers.get(pendingVoiceKey);
    __fileBuffers.delete(pendingVoiceKey);
    if (fileData) {
      try {
        // Upload to storage using SDK (handles auth correctly)
        const fileName = `voice_${Date.now()}_${Math.random().toString(36).slice(2)}.ogg`;
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from("claw-images")
          .upload(fileName, fileData.bytes, { contentType: "audio/ogg; codecs=opus", upsert: false });
        let storedAudioUrl = "";
        if (uploadData?.path) {
          const { data: { publicUrl } } = supabase.storage.from("claw-images").getPublicUrl(uploadData.path);
          storedAudioUrl = publicUrl;
          console.log("Voice uploaded to storage:", storedAudioUrl);
        } else {
          console.error("Voice storage upload failed:", uploadErr);
        }

        // Send to Telegram
        const formData = new FormData();
        const blob = new Blob([fileData.bytes], { type: fileData.mimeType });
        formData.append("voice", blob, "voice.ogg");
        formData.append("chat_id", String(chatId));
        const voiceRes = await fetch(`https://api.telegram.org/bot${botToken}/sendVoice`, {
          method: "POST",
          body: formData,
        });
        const voiceResData = await voiceRes.json();
        console.log("sendVoice result:", JSON.stringify(voiceResData));

        // Save audio message to DB with real storage URL
        if (convId && storedAudioUrl) {
          await supabase.from("claw_messages").insert({
            conversation_id: convId,
            role: "assistant",
            content: `__AUDIO__:${storedAudioUrl}`,
          });
        }
      } catch (e) {
        console.error("Voice send error:", e);
      }
    }
  }

  // Send file if pending
  if (pendingFileKey) {
    const fileData = __fileBuffers.get(pendingFileKey);
    __fileBuffers.delete(pendingFileKey);
    if (fileData) {
      try {
        const blob = new Blob([fileData.bytes], { type: fileData.mimeType });
        const formData = new FormData();
        formData.append("chat_id", String(chatId));
        formData.append("document", blob, fileData.filename);
        formData.append("caption", `📄 ${fileData.filename}`);
        const docRes = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
          method: "POST",
          body: formData,
        });
        const docResData = await docRes.json();
        console.log("sendDocument result:", JSON.stringify(docResData));
        if (convId) {
          await supabase.from("claw_messages").insert({
            conversation_id: convId,
            role: "assistant",
            content: `📄 Файл отправлен: ${fileData.filename}`,
          });
        }
      } catch (e) {
        console.error("File send error:", e);
      }
    }
  }

  // Send text response
  if (finalText) {
    const chunks = finalText.match(/[\s\S]{1,4000}/g) || [finalText];
    for (const chunk of chunks) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: chunk }),
      });
    }
    if (convId) {
      await supabase.from("claw_messages").insert({
        conversation_id: convId,
        role: "assistant",
        content: finalText,
      });
    }
  }

  // Billing
  const computeMs = Date.now() - startTime;
  const costUsd = (totalTokens / 1000) * 0.001;
  if (totalTokens > 0) {
    try {
      await supabase.from("usage_logs").insert({
        user_id,
        endpoint: "telegram-bot",
        tokens_used: totalTokens,
        compute_time_ms: computeMs,
        cost_usd: costUsd,
      });
      await supabase.rpc("deduct_wallet_balance" as any, { p_user_id: user_id, p_amount: costUsd }).catch(() => {
        supabase.from("wallets").update({ balance_usd: Math.max(0, wallet.balance_usd - costUsd) }).eq("user_id", user_id);
      });
    } catch (e) {
      console.error("Billing error:", e);
    }
  }

  return new Response("OK");
});
