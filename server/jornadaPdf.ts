/**
 * Gerador de PDF mínimo, sem dependências: fontes padrão (Helvetica) com WinAnsiEncoding,
 * suficiente para textos em português. Usado pela "Jornada do Herói em PDF".
 */
export type PdfBlock =
  | { type: "cover"; tag: string; title: string; subtitle: string; cards: { label: string; text: string }[] }
  | { type: "section"; tag: string; title: string }
  | { type: "subtitle"; text: string }
  | { type: "paragraph"; text: string; label?: string; italic?: boolean }
  | { type: "bullets"; items: string[]; ordered?: boolean }
  | { type: "bar"; label: string; value: string; ratio: number }
  | { type: "footer"; text: string };

const W = 595.28, H = 841.89, M = 48, CW = W - 2 * M;
const GREEN = "0.059 0.239 0.165", GOLD = "0.788 0.655 0.290", GOLD_TEXT = "0.541 0.427 0.122", INK = "0.12 0.16 0.12", MUTED = "0.40 0.45 0.40", DARK = "0.059 0.165 0.118", CREAM = "0.953 0.851 0.545";

// Larguras Helvetica (1/1000 em) para ASCII 32..126; demais caracteres usam 556.
const HELV = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
const BOLD_EXTRA = 1.06;
const SPECIAL: Record<string, number> = { "—": 0x97, "–": 0x96, "“": 0x93, "”": 0x94, "‘": 0x91, "’": 0x92, "•": 0x95, "…": 0x85, "€": 0x80 };

function charWidth(ch: string) { const c = ch.charCodeAt(0); return c >= 32 && c <= 126 ? HELV[c - 32] : 556; }
export function textWidth(text: string, size: number, bold = false) { let w = 0; for (const ch of text) w += charWidth(ch); return (w / 1000) * size * (bold ? BOLD_EXTRA : 1); }

/** Converte para bytes WinAnsi (latin1 + especiais) e escapa para string literal PDF. */
export function pdfString(text: string) {
  let out = "";
  for (const ch of text.normalize("NFC")) {
    let code = SPECIAL[ch] ?? ch.charCodeAt(0);
    if (code > 255) code = 63; // "?" para o que a fonte padrão não cobre (ex.: emoji)
    if (code === 0x28 || code === 0x29 || code === 0x5c) out += "\\" + String.fromCharCode(code);
    else if (code < 32) out += " ";
    else out += String.fromCharCode(code);
  }
  return `(${out})`;
}

export function wrap(text: string, size: number, width: number, bold = false) {
  const lines: string[] = [];
  for (const para of String(text ?? "").split(/\n/)) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const test = line ? `${line} ${word}` : word;
      if (textWidth(test, size, bold) <= width || !line) line = test; else { lines.push(line); line = word; }
    }
    lines.push(line);
  }
  return lines;
}

class Doc {
  pages: string[] = [];
  cur = "";
  y = 0;
  newPage() { if (this.cur) this.pages.push(this.cur); this.cur = ""; this.y = H - M; }
  ensure(h: number) { if (this.y - h < M + 10) this.newPage(); }
  text(x: number, y: number, s: string, size: number, font: "F1" | "F2" | "F3", color = INK) { this.cur += `BT ${color} rg /${font} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td ${pdfString(s)} Tj ET\n`; }
  rect(x: number, y: number, w: number, h: number, color: string, stroke?: string) { this.cur += stroke ? `${stroke} RG 1 w ${color} rg ${x} ${y} ${w} ${h} re B\n` : `${color} rg ${x} ${y} ${w} ${h} re f\n`; }
  lines(ls: string[], x: number, size: number, font: "F1" | "F2" | "F3", color = INK, lead = size * 1.45) { for (const l of ls) { this.ensure(lead); this.y -= lead; this.text(x, this.y + size * 0.3, l, size, font, color); } }
  finish() { if (this.cur) this.pages.push(this.cur); }
}

function spaced(s: string) { return s.toUpperCase().split("").join(" ").replace(/ {3}/g, "   "); }

export function renderPdf(blocks: PdfBlock[]): Buffer {
  const d = new Doc();
  d.newPage();
  for (const b of blocks) {
    if (b.type === "cover") {
      d.rect(M - 12, M - 12, W - 2 * M + 24, H - 2 * M + 24, DARK, GOLD);
      d.y = H - M - 30;
      d.text(M + 14, d.y, spaced(b.tag), 7.5, "F1", CREAM); d.y -= 26;
      for (const l of wrap(b.title, 28, CW - 28, true)) { d.y -= 32; d.text(M + 14, d.y, l, 28, "F2", CREAM); }
      d.y -= 26; d.text(M + 14, d.y, b.subtitle, 11, "F1", "0.85 0.81 0.68"); d.y -= 36;
      const cw = (CW - 28 - 12) / 2;
      b.cards.forEach((c, i) => {
        const x = M + 14 + (i % 2) * (cw + 12);
        const ls = wrap(c.text, 10.5, cw - 20);
        const h = 30 + ls.length * 15;
        if (i % 2 === 0) d.y -= 0;
        const top = d.y;
        d.rect(x, top - h, cw, h, "0.08 0.21 0.15", "0.45 0.42 0.25");
        d.text(x + 10, top - 16, spaced(c.label), 7, "F1", CREAM);
        ls.forEach((l, j) => d.text(x + 10, top - 32 - j * 15, l, 10.5, "F1", "0.96 0.94 0.86"));
        if (i % 2 === 1 || i === b.cards.length - 1) d.y = top - Math.max(h, 60) - 12;
      });
      d.newPage();
    } else if (b.type === "section") {
      d.ensure(70); d.y -= 14; d.rect(M, d.y, CW, 2.5, GOLD); d.y -= 14;
      d.text(M, d.y, spaced(b.tag).slice(0, 160), 7, "F1", GOLD_TEXT); d.y -= 22;
      for (const l of wrap(b.title, 17, CW, true)) { d.text(M, d.y, l, 17, "F2", GREEN); d.y -= 20; }
    } else if (b.type === "subtitle") {
      d.ensure(30); d.y -= 8; d.text(M, d.y, b.text.toUpperCase(), 9.5, "F2", GREEN); d.y -= 4;
    } else if (b.type === "paragraph") {
      const txt = b.label ? `${b.label} ${b.text}` : b.text;
      d.lines(wrap(txt, 10.5, CW), M, 10.5, b.italic ? "F3" : "F1", b.italic ? GOLD_TEXT : INK); d.y -= 6;
    } else if (b.type === "bullets") {
      b.items.forEach((it, i) => {
        const mark = b.ordered ? `${i + 1}.` : "•";
        const ls = wrap(it, 10.5, CW - 18);
        d.ensure(16); d.y -= 15.2; d.text(M + 2, d.y + 3, mark, 10.5, "F1"); d.text(M + 18, d.y + 3, ls[0] ?? "", 10.5, "F1");
        d.lines(ls.slice(1), M + 18, 10.5, "F1", INK, 15.2);
      });
      d.y -= 6;
    } else if (b.type === "bar") {
      d.ensure(28); d.y -= 26;
      d.rect(M, d.y, CW, 22, "0.93 0.95 0.925");
      d.rect(M, d.y, Math.max(2, CW * Math.min(1, Math.max(0, b.ratio))), 3, GOLD);
      d.text(M + 8, d.y + 8, b.label, 10, "F1"); d.text(M + CW - 8 - textWidth(b.value, 10, true), d.y + 8, b.value, 10, "F2");
    } else if (b.type === "footer") {
      d.ensure(50); d.y -= 16; d.rect(M, d.y, CW, 0.6, "0.8 0.8 0.8"); d.y -= 2;
      d.lines(wrap(b.text, 8.5, CW), M, 8.5, "F1", MUTED, 12);
    }
  }
  d.finish();

  // Monta os objetos PDF.
  const objs: string[] = [];
  const add = (s: string) => { objs.push(s); return objs.length; };
  const catalog = add(""); const pagesId = add("");
  const f1 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const f2 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const f3 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>");
  const kids: number[] = [];
  d.pages.forEach((content, i) => {
    const pageNo = `BT ${MUTED} rg /F1 8 Tf ${(W - M - 30).toFixed(2)} 24 Td ${pdfString(`${i + 1}/${d.pages.length}`)} Tj ET\n`;
    const stream = content + (i > 0 ? pageNo : "");
    const c = add(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}endstream`);
    kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R /F3 ${f3} 0 R >> >> /Contents ${c} 0 R >>`));
  });
  objs[catalog - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objs[pagesId - 1] = `<< /Type /Pages /Kids [${kids.map(k => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>`;
  let out = "%PDF-1.4\n%\xe2\xe3\xcf\xd3\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => { offsets.push(Buffer.byteLength(out, "latin1")); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offsets.map(o => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  out += `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}
