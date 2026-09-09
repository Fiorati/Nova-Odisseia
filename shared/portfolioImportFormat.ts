export type PortfolioImportFormat = "csv" | "xlsx" | "xls" | "pdf";

export function getPortfolioImportFormat(fileName: string, mimeType = ""): PortfolioImportFormat {
  const extension = fileName.split(".").pop()?.trim().toLocaleLowerCase("pt-BR");
  if (extension === "csv" || mimeType === "text/csv") return "csv";
  if (extension === "xlsx" || mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") return "xlsx";
  if (extension === "xls" || mimeType === "application/vnd.ms-excel") return "xls";
  if (extension === "pdf" || mimeType === "application/pdf") return "pdf";
  throw new Error("Formato não suportado. Use CSV, XLSX, XLS ou PDF.");
}
