import { describe, expect, it } from "vitest";
import { countMonthlyFinalCardTiers, getSimulationClients } from "../shared/monthlyFinalCard";

describe("card finalizado mensal", () => {
  it("usa as mesmas fronteiras da Migração M1 e ignora clientes inelegíveis", () => {
    const counts = countMonthlyFinalCardTiers([
      { tpv: 7000, eligible: true },
      { tpv: 15000, eligible: true },
      { tpv: 30000, eligible: true },
      { tpv: 50000, eligible: true },
      { tpv: 100000, eligible: true },
      { tpv: 250000, eligible: true },
      { tpv: 50000, eligible: false },
    ]);

    expect(counts).toEqual({
      clients7To15: 1,
      clients15To30: 1,
      clients30To50: 1,
      clients50To100: 1,
      clients100Plus: 2,
    });
  });

  it("lê somente a lista de clientes dos detalhes da simulação", () => {
    expect(getSimulationClients(JSON.stringify({ clients: [{ tpv: 30000, eligible: true }] }))).toEqual([{ tpv: 30000, eligible: true }]);
    expect(getSimulationClients("dados inválidos")).toEqual([]);
  });
});
