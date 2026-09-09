import { describe, expect, it } from "vitest";
import { calculatePsvFromCommission, calculatePsvSuggestion, calculateRmrKpi } from "../shared/metrics";

describe("calculatePsvSuggestion", () => {
  it("distribui a RV faltante entre tiers e divide o plano pelas semanas restantes", () => {
    const result = calculatePsvSuggestion({ targetVariable: 10000, currentVariable: 2000, multiplier: 2, weeksRemaining: 4, conversionRate: 20 });
    expect(result.missing).toBe(8000);
    expect(result.totalClients).toBeGreaterThan(0);
    expect(result.weeklyTpv).toBeGreaterThan(0);
    expect(result.suggestedLeads).toBeGreaterThanOrEqual(result.totalClients);
  });
});

describe("calculateRmrKpi", () => {
  it("atinge 100% do KPI com os benchmarks mensais", () => {
    const result = calculateRmrKpi({ workingDays: 20, salesTasks: 200, proposals: 40, closedClients: 5, closedTpv: 300000, goalTpv: 300000 });
    expect(result.globalKpi).toBe(100);
    expect(result.pointsAwarded).toBe(175);
  });
});

describe("calculatePsvFromCommission", () => {
  it("usa a comissão selecionada na matriz em vez de um mix fixo", () => {
    const result = calculatePsvFromCommission({ targetVariable: 10000, currentVariable: 8000, multiplier: 2, weeksRemaining: 2, conversionRate: 20, commissionPerClient: 300, tpvPerClient: 50000 });
    expect(result.totalClients).toBe(4);
    expect(result.totalTpv).toBe(200000);
    expect(result.weeklyClients).toBe(2);
  });
});
