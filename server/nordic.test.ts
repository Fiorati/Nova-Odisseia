import { describe, expect, it } from "vitest";
import { monthlyKpiPoints, sortByGlobalKpi, sortByNewClients, sortByTpv } from "../shared/gamification";
import { buildNordicScore, gapToTarget, isNordicHundredK, weeklyPace } from "../shared/nordic";

describe("Estratégia Nórdica", () => {
  it("calcula o GAP e o ritmo semanal sem sugerir ritmo negativo", () => {
    expect(gapToTarget(10, 4)).toBe(6);
    expect(gapToTarget(4, 10)).toBe(-6);
    expect(weeklyPace(6, 10)).toBe(3);
    expect(weeklyPace(-6, 10)).toBe(0);
    expect(weeklyPace(10, 0)).toBe(0);
  });

  it("classifica lista 100k+ e prioriza leads quentes", () => {
    expect(isNordicHundredK(99_999)).toBe(false);
    expect(isNordicHundredK(100_000)).toBe(true);
    expect(buildNordicScore({ temperature: "quente", projectedTpv: 30_000 })).toBeGreaterThan(buildNordicScore({ temperature: "frio", projectedTpv: 300_000 }));
  });

  it("prioriza segmento identificado quando temperatura, TPV e contato são equivalentes", () => {
    const common = { temperature: "frio" as const, projectedTpv: 50_000, nextContactAt: new Date("2026-08-30T12:00:00.000Z") };
    expect(buildNordicScore({ ...common, segmentLabel: "Alimentação" })).toBeGreaterThan(buildNordicScore(common));
  });
});

describe("pontuação e troféus mensais", () => {
  it("aplica faixas mutuamente exclusivas de KPI", () => {
    expect(monthlyKpiPoints(80)).toBe(0);
    expect(monthlyKpiPoints(80.1)).toBe(20);
    expect(monthlyKpiPoints(100)).toBe(40);
    expect(monthlyKpiPoints(150)).toBe(40);
    expect(monthlyKpiPoints(150.1)).toBe(100);
  });

  it("desempata troféus por TPV e depois por clientes", () => {
    const rows = [
      { name: "A", actualNewClients: 8, actualTpv: 100_000, globalKpi: 100 },
      { name: "B", actualNewClients: 8, actualTpv: 120_000, globalKpi: 100 },
      { name: "C", actualNewClients: 6, actualTpv: 120_000, globalKpi: 120 },
    ];
    expect(sortByNewClients(rows)[0]?.name).toBe("B");
    expect(sortByTpv(rows)[0]?.name).toBe("B");
    expect(sortByGlobalKpi(rows)[0]?.name).toBe("C");
  });
});
