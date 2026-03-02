/**
 * Browser-side Markdown-aware PDF builder — mirrors the Telegram edge-function logic.
 * Uses pdf-lib + @pdf-lib/fontkit to embed NotoSans for Unicode/Cyrillic support.
 */

// ── Inline segment ────────────────────────────────────────────────────────────
type Segment = { text: string; bold: boolean };

function parseInlineSegments(text: string): Segment[] {
  const segments: Segment[] = [];
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

function stripInline(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

type ParsedLine = {
  text: string;
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

export async function buildPdf(content: string): Promise<Uint8Array> {
  const { PDFDocument, rgb } = await import("pdf-lib");
  const fontkit = (await import("@pdf-lib/fontkit")).default;

  // Load font from public folder
  const fontRes = await fetch("/fonts/NotoSans-Regular.ttf");
  if (!fontRes.ok) throw new Error(`Font fetch failed: ${fontRes.status}`);
  const fontBytes = new Uint8Array(await fontRes.arrayBuffer());

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(fontBytes);

  const pageWidth = 595;
  const pageHeight = 842;
  const marginX = 55;
  const marginY = 55;
  const bodySize = 11;
  const boldSize = 11.5;
  const h1Size = 20;
  const h2Size = 16;
  const h3Size = 13;
  const lineHeightBody = bodySize * 1.6;
  const maxWidth = pageWidth - 2 * marginX;

  const colorBlack  = rgb(0.08, 0.08, 0.08);
  const colorBold   = rgb(0.05, 0.05, 0.05);
  const colorGray   = rgb(0.45, 0.45, 0.45);
  const colorAccent = rgb(0.12, 0.29, 0.69);
  const colorRule   = rgb(0.8, 0.8, 0.8);
  const colorCode   = rgb(0.95, 0.95, 0.95);

  const measureW = (text: string, size: number) => {
    try { return font.widthOfTextAtSize(text, size); } catch { return text.length * size * 0.55; }
  };

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

  type TaggedWord = { word: string; bold: boolean };

  const mergeTagged = (tagged: TaggedWord[]): Segment[] => {
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

  const wrapSegments = (rawText: string, maxW: number, size: number): Segment[][] => {
    const segs = parseInlineSegments(rawText);
    const tagged: TaggedWord[] = [];
    for (const seg of segs) {
      const words = seg.text.split(" ");
      for (let i = 0; i < words.length; i++) {
        if (words[i]) tagged.push({ word: words[i], bold: seg.bold });
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Page = ReturnType<typeof pdfDoc.addPage>;

  const drawSegments = (page: Page, segments: Segment[], startX: number, startY: number, size: number, color: ReturnType<typeof rgb>) => {
    let cx = startX;
    for (const seg of segments) {
      if (!seg.text) continue;
      if (seg.bold) {
        page.drawText(seg.text, { x: cx, y: startY, size: boldSize, font, color: colorBold });
        page.drawText(seg.text, { x: cx + 0.35, y: startY, size: boldSize, font, color: colorBold });
        cx += measureW(seg.text, boldSize);
      } else {
        page.drawText(seg.text, { x: cx, y: startY, size, font, color });
        cx += measureW(seg.text, size);
      }
    }
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

    // body — inline bold support
    for (const lineSegs of wrapSegments(parsed.text, maxWidth, bodySize)) {
      ensureSpace(lineHeightBody);
      drawSegments(currentPage, lineSegs, marginX, y, bodySize, colorBlack);
      y -= lineHeightBody;
    }
  }

  const pageNum = pdfDoc.getPageCount();
  currentPage.drawText(`— ${pageNum} —`, { x: pageWidth / 2 - 15, y: marginY / 2, size: 9, font, color: colorGray });

  return pdfDoc.save();
}
