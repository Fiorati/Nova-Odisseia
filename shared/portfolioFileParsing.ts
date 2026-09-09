import * as XLSX from "xlsx";

export type ParsedPortfolioRow = {
  route: string;
  clientName: string;
  document?: string;
  mcc?: string;
  cnae?: string;
  segment?: string;
  projectedTpv?: number;
  stage?: string;
  temperature?: string;
  phone?: string;
  city?: string;
  lastInteraction?: string;
  nextAction?: string;
  notes?: string;
  rawJson?: string;
};

const headerKey = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]/g, "");
const valueFrom = (row: Record<string, unknown>, candidates: string[]) => { const key = Object.keys(row).find((column) => candidates.includes(headerKey(column))); return key ? row[key] : undefined; };
const textFrom = (row: Record<string, unknown>, candidates: string[]) => { const value = valueFrom(row, candidates); return value === null || value === undefined ? "" : String(value).trim(); };
const numericFrom = (row: Record<string, unknown>, candidates: string[]) => { const value = valueFrom(row, candidates); if (typeof value === "number" && Number.isFinite(value)) return Math.max(value, 0); const parsed = Number(String(value ?? "").replace(/R\$\s?/gi, "").replace(/\./g, "").replace(",", ".").replace(/[^0-9.-]/g, "")); return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0; };

export function toParsedPortfolioRows(records: Record<string, unknown>[]): ParsedPortfolioRow[] {
  return records.map((row) => ({
    route: textFrom(row, ["rota", "nomedarota", "route", "codigorota"]),
    clientName: textFrom(row, ["cliente", "nomecliente", "nomefantasia", "razaosocial", "nomedoestabelecimento", "nomedocomercio", "estabelecimento", "nome", "lojista", "merchant"]),
    document: textFrom(row, ["cnpj", "cpf", "documento"]), mcc: textFrom(row, ["mcc", "codigomcc"]), cnae: textFrom(row, ["cnae", "codigocnae"]), segment: textFrom(row, ["segmento", "atividade", "ramo"]),
    projectedTpv: numericFrom(row, ["tpv", "tpvestimado", "tpvprojetado", "tpvpotencial", "tpvcomprometido", "tpvmensal", "faturamento", "volume", "valor", "valorpotencial"]), stage: textFrom(row, ["etapa", "status", "stage", "fase", "etapaatual", "etapapipeline", "etapadopipe", "pipe"]),
    temperature: textFrom(row, ["temperatura", "temperature", "prioridade"]), phone: textFrom(row, ["telefone", "telefoneprincipal", "celular", "telefonecelular", "fone", "whatsapp", "contato"]), city: textFrom(row, ["cidade", "municipio", "localidade", "cidadeuf"]), lastInteraction: textFrom(row, ["ultimainteracao", "ultimocontato", "dataultimaatividade", "dataultimainteracao", "dataultimocontato"]), nextAction: textFrom(row, ["proximaacao", "proximainteracao", "acao", "nextaction", "proximopasso"]), notes: textFrom(row, ["observacao", "observacoes", "notas", "nota", "comentario", "comentarios", "obs"]), rawJson: JSON.stringify(row),
  })).filter((row) => row.clientName);
}

export function parsePortfolioSpreadsheetBuffer(buffer: ArrayBuffer | Uint8Array) {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true, codepage: 65001 });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
  if (!firstSheet) throw new Error("A planilha não possui uma aba com dados.");
  return toParsedPortfolioRows(XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "", raw: false }));
}

export function parsePortfolioPdfTableLines(lines: string[]) {
  const headerIndex = lines.findIndex((line) => /cliente|razao social|estabelecimento/i.test(line) && /rota|route/i.test(line));
  if (headerIndex < 0) throw new Error("Não localizamos uma tabela com as colunas Cliente e Rota no PDF. Para PDF, use um arquivo com texto selecionável e cabeçalhos de tabela.");
  const headers = lines[headerIndex]!.split(/\s{2,}|\t+|;/).map((item) => item.trim()).filter(Boolean);
  const clientIndex = headers.findIndex((item) => /cliente|razao social|estabelecimento/i.test(item));
  const routeIndex = headers.findIndex((item) => /rota|route/i.test(item));
  if (clientIndex < 0 || routeIndex < 0) throw new Error("O PDF precisa trazer as colunas Cliente e Rota.");
  const records = lines.slice(headerIndex + 1).map((line) => line.split(/\s{2,}|\t+|;/).map((item) => item.trim())).filter((cells) => cells.length >= Math.max(clientIndex, routeIndex) + 1).map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])));
  return toParsedPortfolioRows(records);
}

const HTML_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decodeHtmlText(value: string) {
  return value
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&([a-z]+);/gi, (entity, name: string) => HTML_ENTITIES[name.toLocaleLowerCase("pt-BR")] ?? entity)
    .replace(/\s+/g, " ")
    .trim();
}

/** Extrai somente uma tabela estática; scripts, estilos e templates são descartados e nunca executados. */
export function parsePortfolioHtmlTable(html: string) {
  const sanitized = html.replace(/<(script|style|template)\b[\s\S]*?<\/\1>/gi, "");
  const tables = Array.from(sanitized.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi), match => match[1] ?? "");
  for (const table of tables) {
    const rows = Array.from(table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi), match =>
      Array.from((match[1] ?? "").matchAll(/<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/gi), cell => decodeHtmlText(cell[1] ?? "")),
    ).filter(cells => cells.length > 0);
    const headerIndex = rows.findIndex(cells => cells.some(cell => /cliente|raz[aã]o social|estabelecimento|lojista|merchant/i.test(cell)));
    if (headerIndex < 0) continue;
    const headers = rows[headerIndex]!;
    const records = rows.slice(headerIndex + 1)
      .filter(cells => cells.some(Boolean))
      .map(cells => Object.fromEntries(headers.map((header, index) => [header || `coluna_${index + 1}`, cells[index] ?? ""])));
    const parsed = toParsedPortfolioRows(records);
    if (parsed.length) return parsed;
  }
  throw new Error("O relatório HTML não contém uma tabela reconhecível com a coluna Cliente.");
}
