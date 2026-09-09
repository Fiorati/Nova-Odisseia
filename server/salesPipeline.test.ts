import { describe, expect, it } from "vitest";
import { calculateSalesPipeline, getSuperPipeStage, type SalesPipeEntry } from "../shared/salesPipeline";

const entry = (id: number, sourceStage: string, temperature = "Frio"): SalesPipeEntry => ({ id, date: "2026-08-01", subchannel: "", ownHub: "", regional: "SP", district: "SP Norte", polo: "Polo A", agent: "Agente A", activeTeam: "", effectiveTeam: "", route: "Rota A", clientName: `Cliente ${id}`, document: "", segment: "", mcc: "", projectedTpv: id * 10_000, sourceStage, temperature });

describe("Super Pipe", () => {
  it("normaliza etapas comerciais e destaca oportunidades quentes", () => {
    expect(getSuperPipeStage("Proposta em negociação")).toBe("negotiation");
    const result = calculateSalesPipeline([entry(1, "Planejado"), entry(2, "Qualificação", "Quente"), entry(3, "Negociação", "Quente"), entry(4, "Cliente fechado")]);
    expect(result.summary.totalOpportunities).toBe(4);
    expect(result.summary.hotOpportunities).toBe(2);
    expect(result.hotOpportunities[0]?.superStage).toBe("negotiation");
  });
});
