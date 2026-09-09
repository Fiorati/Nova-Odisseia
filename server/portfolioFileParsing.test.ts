import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parsePortfolioHtmlTable, parsePortfolioPdfTableLines, parsePortfolioSpreadsheetBuffer } from "../shared/portfolioFileParsing";

function workbookBuffer(bookType: "xlsx" | "biff8") {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["Rota", "Cliente", "TPV", "Etapa"], ["Rota 01", "Loja Teste", 12500, "Negociação"]]), "Carteira");
  return XLSX.write(workbook, { type: "array", bookType });
}

describe("portfolio file parsing", () => {
  it("parses CSV, XLSX and XLS files into portfolio rows", () => {
    const csv = new TextEncoder().encode("Rota;Cliente;TPV;Etapa\nRota 02;Loja CSV;R$ 8.500,00;Qualificação");
    const csvRows = parsePortfolioSpreadsheetBuffer(csv);
    const xlsxRows = parsePortfolioSpreadsheetBuffer(workbookBuffer("xlsx"));
    const xlsRows = parsePortfolioSpreadsheetBuffer(workbookBuffer("biff8"));
    expect(csvRows[0]).toMatchObject({ route: "Rota 02", clientName: "Loja CSV", projectedTpv: 8500, stage: "Qualificação" });
    expect(xlsxRows[0]).toMatchObject({ route: "Rota 01", clientName: "Loja Teste", projectedTpv: 12500, stage: "Negociação" });
    expect(xlsRows[0]).toMatchObject({ route: "Rota 01", clientName: "Loja Teste", projectedTpv: 12500, stage: "Negociação" });
  });

  it("parses a selectable-text PDF table that contains route and client columns", () => {
    const rows = parsePortfolioPdfTableLines(["Rota  Cliente  TPV  Etapa", "Rota 03  Loja PDF  20.000  Novos planejados"]);
    expect(rows[0]).toMatchObject({ route: "Rota 03", clientName: "Loja PDF", projectedTpv: 20000, stage: "Novos planejados" });
  });

  it("normaliza os campos operacionais da Lista Inteligente", () => {
    const csv = new TextEncoder().encode("Rota;Cliente;Telefone;Cidade;Etapa;Valor;Última Interação;Próxima Ação\nRota 02;Loja Lista;(11)99999-9999;São Paulo;Negociação;R$ 50.000,00;Ligação em 25/08;Enviar proposta");
    expect(parsePortfolioSpreadsheetBuffer(csv)[0]).toMatchObject({ route: "Rota 02", clientName: "Loja Lista", phone: "(11)99999-9999", city: "São Paulo", stage: "Negociação", projectedTpv: 50000, lastInteraction: "Ligação em 25/08", nextAction: "Enviar proposta" });
  });

  it("extrai uma tabela HTML estática sem executar scripts", () => {
    const html = `<html><head><script>throw new Error("não executar")</script></head><body><table><thead><tr><th>Cliente</th><th>Telefone</th><th>Cidade</th><th>Etapa</th><th>Valor</th><th>Última Interação</th><th>Próxima Ação</th></tr></thead><tbody><tr><td>Loja &amp; Cia</td><td>(11) 98888-7777</td><td>São Paulo</td><td>Qualificação</td><td>R$ 64.000,00</td><td>Visita em 27/08</td><td>Enviar proposta</td></tr></tbody></table></body></html>`;
    expect(parsePortfolioHtmlTable(html)[0]).toMatchObject({ clientName: "Loja & Cia", phone: "(11) 98888-7777", city: "São Paulo", stage: "Qualificação", projectedTpv: 64000, lastInteraction: "Visita em 27/08", nextAction: "Enviar proposta" });
    expect(() => parsePortfolioHtmlTable("<html><body>Sem tabela de leads</body></html>")).toThrow(/tabela reconhecível/i);
  });
});
