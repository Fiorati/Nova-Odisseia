export type PrintSection = {
  title: string;
  text?: string;
  items?: string[];
};

const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

export function buildPrintDocumentHtml(title: string, subtitle: string, sections: PrintSection[]) {
  const sectionsHtml = sections.map(section => `<section><h2>${escapeHtml(section.title)}</h2>${section.text ? `<p>${escapeHtml(section.text).replaceAll("\n", "<br />")}</p>` : ""}${section.items?.length ? `<ul>${section.items.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}</section>`).join("");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><title>${escapeHtml(title)}</title><style>@page{size:A4;margin:16mm}*{box-sizing:border-box}body{margin:0;color:#123b2b;font-family:Arial,sans-serif;font-size:11pt;line-height:1.5}header{border-bottom:3px solid #b7ed4a;margin-bottom:18px;padding-bottom:12px}header p{color:#28724c;font-size:9pt;font-weight:700;letter-spacing:.12em;margin:0;text-transform:uppercase}h1{color:#0e3426;font-size:24pt;margin:5px 0}h2{color:#0e3426;font-size:14pt;margin:0 0 8px}section{break-inside:avoid;border:1px solid #dceade;border-radius:8px;margin:0 0 12px;padding:14px}p{margin:0;color:#2a5544}ul{margin:7px 0 0;padding-left:20px}li{margin:4px 0}footer{color:#567466;font-size:8pt;margin-top:18px}</style></head><body><header><p>Nova Odisseia: Fiorati · documento privado</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p></header>${sectionsHtml}<footer>Gerado localmente a pedido do usuário. Revise o conteúdo antes de compartilhar.</footer><script>window.onload=()=>setTimeout(()=>window.print(),250)</script></body></html>`;
}

export function exportPrivatePdf(title: string, subtitle: string, sections: PrintSection[]) {
  const popup = window.open("", "_blank", "noopener,noreferrer");
  if (!popup) return false;
  popup.document.write(buildPrintDocumentHtml(title, subtitle, sections));
  popup.document.close();
  return true;
}
