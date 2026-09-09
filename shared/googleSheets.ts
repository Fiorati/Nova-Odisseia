export type GoogleSheetReference = {
  spreadsheetId: string;
  gid: string;
  exportUrl: string;
};

export function parseGoogleSheetReference(value: string): GoogleSheetReference {
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new Error("Informe um link válido de Google Planilhas.");
  }

  if (parsed.protocol !== "https:" || !["docs.google.com", "www.docs.google.com"].includes(parsed.hostname)) {
    throw new Error("Use um link compartilhado de Google Planilhas (docs.google.com).");
  }

  const match = parsed.pathname.match(/^\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!match?.[1]) throw new Error("Não encontrei o identificador da planilha no link informado.");

  const hashGid = parsed.hash.match(/(?:^|[#?&])gid=(\d+)/)?.[1];
  const gid = parsed.searchParams.get("gid") ?? hashGid ?? "0";
  return {
    spreadsheetId: match[1],
    gid,
    exportUrl: `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=xlsx&gid=${encodeURIComponent(gid)}`,
  };
}
