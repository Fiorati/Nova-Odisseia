import { normalizeRouteKey, type RoutePortfolioRow } from "./routePortfolio";

const GOOGLE_EXPORT_BASE_HOST = "apidata.googleusercontent.com";
const GOOGLE_EXPORT_PATH = /^\/download\/storage\/v1\/b\/cartao-super-zap-1\/o\/tam-leads-report%2Ftam-leads---[a-z0-9._@+-]+---\d{4}-\d{2}-\d{2}-\d{4}\.html$/i;

export function isAuthorizedStoneGoogleHtmlUrl(url: URL) {
  const host = url.hostname.toLocaleLowerCase("pt-BR");
  const isGoogleExportHost = new RegExp(`^[a-f0-9]{32,96}-${GOOGLE_EXPORT_BASE_HOST.replaceAll(".", "\\.")}$`, "i").test(host);
  const signature = url.searchParams.get("jk") ?? "";
  const queryIsExpected = Array.from(url.searchParams.keys()).every(key => key === "jk" || key === "isca");
  return isGoogleExportHost && GOOGLE_EXPORT_PATH.test(url.pathname) && /^[a-z0-9_-]{32,10000}$/i.test(signature) && url.searchParams.get("isca") === "1" && queryIsExpected;
}

export function stoneLeadListSourceOrigin(url: URL) {
  return isAuthorizedStoneGoogleHtmlUrl(url) ? GOOGLE_EXPORT_BASE_HOST : url.hostname.toLocaleLowerCase("pt-BR");
}

export function parseAuthorizedStoneLeadListUrl(value: string) {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("Informe um link válido da Lista Inteligente."); }
  const host = url.hostname.toLocaleLowerCase("pt-BR");
  const isStoneHost = host === "stone.com.br" || host.endsWith(".stone.com.br");
  if (url.protocol !== "https:" || url.port || url.username || url.password || url.hash) throw new Error("Use um link HTTPS exportável Stone, sem porta, credenciais ou fragmento.");
  if (!isStoneHost && !isAuthorizedStoneGoogleHtmlUrl(url)) throw new Error("Use um link exportável Stone ou o relatório HTML temporário oficial da Lista Inteligente.");
  return url;
}

function leadIdentity(row: RoutePortfolioRow) {
  const route = normalizeRouteKey(row.route);
  const document = (row.document ?? "").replace(/\D/g, "");
  const phone = (row.phone ?? "").replace(/\D/g, "");
  const client = `${row.clientName ?? ""}|${row.city ?? ""}`.trim().toLocaleLowerCase("pt-BR").replace(/\s+/g, " ");
  return document ? `${route}|documento:${document}` : phone ? `${route}|telefone:${phone}` : `${route}|cliente:${client}`;
}

/** Remove duplicidades na importação atual; a primeira ocorrência é preservada para tornar o resultado auditável. */
export function deduplicateLeadListRows(rows: RoutePortfolioRow[]) {
  const seen = new Set<string>(); let duplicates = 0;
  const uniqueRows = rows.filter(row => { const key = leadIdentity(row); if (seen.has(key)) { duplicates += 1; return false; } seen.add(key); return true; });
  return { uniqueRows, duplicates };
}
