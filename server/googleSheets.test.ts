import { describe, expect, it } from "vitest";
import { parseGoogleSheetReference } from "../shared/googleSheets";

describe("Google Sheets import links", () => {
  it("converts a shared spreadsheet URL into its XLSX export endpoint", () => {
    expect(parseGoogleSheetReference("https://docs.google.com/spreadsheets/d/abc_123-XYZ/edit#gid=345")).toEqual({
      spreadsheetId: "abc_123-XYZ",
      gid: "345",
      exportUrl: "https://docs.google.com/spreadsheets/d/abc_123-XYZ/export?format=xlsx&gid=345",
    });
    expect(parseGoogleSheetReference("https://docs.google.com/spreadsheets/d/abc_123-XYZ/edit?gid=345#gid=0").exportUrl).toContain("gid=345");
  });

  it("rejects links that are not Google Planilhas documents", () => {
    expect(() => parseGoogleSheetReference("https://example.com/arquivo.xlsx")).toThrow("Google Planilhas");
  });
});
