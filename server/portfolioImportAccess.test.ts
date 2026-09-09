import { describe, expect, it } from "vitest";
import { assertPortfolioImportAccess } from "../shared/portfolioImportAccess";

describe("portfolio import access", () => {
  it("allows polo leaders to import polo portfolios but not district portfolios", () => {
    expect(() => assertPortfolioImportAccess("polo", "polo", "user")).not.toThrow();
    expect(() => assertPortfolioImportAccess("district", "polo", "user")).toThrow("líderes distritais");
  });

  it("allows district leaders and administrators in the expected scopes", () => {
    expect(() => assertPortfolioImportAccess("polo", "distrital", "user")).not.toThrow();
    expect(() => assertPortfolioImportAccess("district", "distrital", "user")).not.toThrow();
    expect(() => assertPortfolioImportAccess("district", "none", "admin")).not.toThrow();
  });
});
