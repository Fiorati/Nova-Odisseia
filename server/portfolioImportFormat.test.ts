import { describe, expect, it } from "vitest";
import { getPortfolioImportFormat } from "../shared/portfolioImportFormat";

describe("portfolio import formats", () => {
  it("recognizes CSV, XLSX, XLS and PDF files", () => {
    expect(getPortfolioImportFormat("carteira.csv")).toBe("csv");
    expect(getPortfolioImportFormat("carteira.XLSX")).toBe("xlsx");
    expect(getPortfolioImportFormat("carteira.xls")).toBe("xls");
    expect(getPortfolioImportFormat("carteira.pdf")).toBe("pdf");
  });

  it("rejects files outside the supported portfolio formats", () => {
    expect(() => getPortfolioImportFormat("carteira.docx")).toThrow("Formato não suportado");
  });
});
