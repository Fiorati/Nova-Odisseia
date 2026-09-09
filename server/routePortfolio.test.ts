import { describe, expect, it } from "vitest";
import { normalizeRouteKey, readPortfolioNumber } from "../shared/routePortfolio";

describe("carteiras por rota", () => {
  it("normaliza a rota para que agente e líder encontrem a mesma carteira", () => {
    expect(normalizeRouteKey("  Rota   04 ")).toBe("rota 04");
    expect(normalizeRouteKey("ROTA 04")).toBe("rota 04");
  });

  it("lê números de TPV no formato brasileiro", () => {
    expect(readPortfolioNumber("R$ 50.000,00")).toBe(50000);
    expect(readPortfolioNumber("12.500")).toBe(12500);
  });
});
