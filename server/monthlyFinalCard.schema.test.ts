import { describe, expect, it } from "vitest";
import { monthlyFinalCardInputSchema } from "./routers";

const card = {
  monthKey: "2026-07", globalKpi: 200, totalMigratedTpv: 600000, multiplier: 2,
  actualVariable: 11361, clients7To15: 4, clients15To30: 11, clients30To50: 6,
  clients50To100: 3, clients100Plus: 5,
};

describe("contrato do Card final", () => {
  it("aceita KPI acima de 150% quando há superação de meta", () => {
    expect(monthlyFinalCardInputSchema.parse(card).globalKpi).toBe(200);
  });

  it("mantém proteção contra KPI negativo e contagens fracionadas", () => {
    expect(() => monthlyFinalCardInputSchema.parse({ ...card, globalKpi: -1 })).toThrow();
    expect(() => monthlyFinalCardInputSchema.parse({ ...card, clients50To100: 2.5 })).toThrow();
  });
});
