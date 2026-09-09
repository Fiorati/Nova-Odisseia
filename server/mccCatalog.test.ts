import { describe, expect, it } from "vitest";
import { findCnaeEntry, findMccEntry, MCC_CATALOG } from "../shared/mccCatalog";

describe("catálogo de MCC e regras agressivas", () => {
  it("encontra o segmento da oficina pelo MCC 7538", () => {
    expect(findMccEntry("7538")?.segmentId).toBe("servicos-automotivos");
  });

  it("associa o CNAE de restaurante ao segmento correspondente", () => {
    expect(findCnaeEntry("5611-2/01")?.segmentId).toBe("alimentacao-restaurantes");
  });

  it("preserva as comissões agressivas confirmadas nos cards", () => {
    const oficina = MCC_CATALOG.find(item => item.id === "servicos-automotivos")!;
    const supermercado = MCC_CATALOG.find(item => item.id === "supermercados")!;
    const bebidas = MCC_CATALOG.find(item => item.id === "adegas-bebidas")!;
    expect(oficina.rates["100-200k"].agressiva).toBe(1080);
    expect(supermercado.rates["100-200k"].agressiva).toBe(800);
    expect(bebidas.rates["30-50k"].agressiva).toBe(125);
    expect(oficina.evidence?.["100-200k:agressiva"]?.status).toBe("confirmada");
    expect(bebidas.evidence?.["30-50k:agressiva"]?.status).toBe("confirmada");
  });

  it("marca como correlação os valores de alimentação derivados de atividades próximas", () => {
    const alimentacao = MCC_CATALOG.find(item => item.id === "alimentacao-restaurantes")!;
    expect(alimentacao.evidence?.["15-30k:agressiva"]?.status).toBe("correlacao");
  });

  it("exige origem explícita para toda alíquota pré-carregada", () => {
    for (const segment of MCC_CATALOG) {
      for (const [tier, proposals] of Object.entries(segment.rates)) {
        for (const [proposal, rate] of Object.entries(proposals)) {
          if (rate > 0) {
            const key = `${tier}:${proposal}` as const;
            expect(segment.evidence?.[key]?.status).toMatch(/confirmada|correlacao/);
            expect(segment.evidence?.[key]?.source.length).toBeGreaterThan(0);
          }
        }
      }
    }
  });
});
