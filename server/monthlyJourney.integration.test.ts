import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { agentProfiles, users } from "../drizzle/schema";
import { getDb, getMonthlyFinalCardSuggestion, getNordicStrategy, saveMonthlyFinalCard, saveNordicMonthlyPlan, saveRmrRecord, saveSimulation } from "./db";

const integrationIt = process.env.DATABASE_URL ? it : it.skip;
const ids: number[] = [];
async function createUser() { const db = await getDb(); const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; const created = await db.insert(users).values({ openId: `journey_${suffix}`, name: "Agente Jornada", email: `journey_${suffix}@example.invalid`, loginMethod: "integration-test" }).$returningId(); const id = created[0]?.id; if (!id) throw new Error("Usuário temporário não criado."); ids.push(id); return id; }
afterAll(async () => { if (!process.env.DATABASE_URL) return; const db = await getDb(); for (const id of ids) await db.delete(users).where(eq(users.id, id)); });

describe("jornada mensal integrada", () => {
  integrationIt("propaga registros reais de Período, RMR, simulação e Card Final para a Estratégia Nórdica", async () => {
    const userId = await createUser(); const db = await getDb(); const monthKey = "2026-08";
    await db.insert(agentProfiles).values({ userId, displayName: "Agente Jornada", leadershipRole: "none" });
    await saveNordicMonthlyPlan(userId, { monthKey, targetSalesTasks: 200, targetProposals: 40, targetClients7To15: 2, targetClients15To30: 3, targetClients30To50: 2, targetClients50To100: 1, targetClients100To200: 1, targetClients200Plus: 0, targetTpv: 300000, averageRv7To15: 50, averageRv15To30: 80, averageRv30To50: 150, averageRv50To100: 300, averageRv100Plus: 800, actualSalesTasks: 160, actualProposals: 32, actualClients7To15: 1, actualClients15To30: 2, actualClients30To50: 1, actualClients50To100: 1, actualClients100To200: 0, actualClients200Plus: 0, actualTpv: 210000 });
    await saveNordicMonthlyPlan(userId, { monthKey: "2026-07", targetSalesTasks: 200, targetProposals: 40, targetClients7To15: 1, targetClients15To30: 2, targetClients30To50: 1, targetClients50To100: 1, targetClients100To200: 0, targetClients200Plus: 0, targetTpv: 250000, averageRv7To15: 50, averageRv15To30: 80, averageRv30To50: 150, averageRv50To100: 300, averageRv100Plus: 800, actualSalesTasks: 140, actualProposals: 28, actualClients7To15: 1, actualClients15To30: 1, actualClients30To50: 1, actualClients50To100: 0, actualClients100To200: 0, actualClients200Plus: 0, actualTpv: 175000 });
    await saveRmrRecord(userId, { periodLabel: "Agosto 2026", workingDays: 20, salesTasks: 160, proposals: 32, closedClients: 5, closedTpv: 210000, goalTpv: 300000, globalKpi: 80, variableValue: 4000, pointsAwarded: 0 });
    await saveSimulation(userId, { periodLabel: "Agosto", goalTpv: 300000, eligibleTpv: 210000, hunterTpv: 0, newSalesBase: 2000, multiplier: 1.4, finalVariable: 4000, detailsJson: JSON.stringify({ clients: [{ tpv: 20000, eligible: true }, { tpv: 40000, eligible: true }, { tpv: 110000, eligible: true }] }) });
    const suggestion = await getMonthlyFinalCardSuggestion(userId);
    expect(suggestion).toMatchObject({ globalKpi: 80, totalMigratedTpv: 210000, actualVariable: 4000, clients15To30: 1, clients30To50: 1, clients100Plus: 1 });
    await saveMonthlyFinalCard(userId, { monthKey, ...suggestion });
    const strategy = await getNordicStrategy(userId, monthKey);
    expect(strategy.plan).toMatchObject({ targetTpv: 300000, actualSalesTasks: 160, actualTpv: 210000 });
    expect(strategy.latestRmr).toMatchObject({ proposals: 32, globalKpi: 80 });
    expect(strategy.latestSimulation).toMatchObject({ finalVariable: 4000 });
    expect(strategy.finalCard).toMatchObject({ totalMigratedTpv: 210000, clients100Plus: 1 });
    expect(strategy.semesterComparison).toEqual([
      { monthKey: "2026-07", targetTpv: 250000, actualTpv: 175000, hasRecord: true },
      { monthKey: "2026-08", targetTpv: 300000, actualTpv: 210000, hasRecord: true },
      { monthKey: "2026-09", targetTpv: null, actualTpv: null, hasRecord: false },
      { monthKey: "2026-10", targetTpv: null, actualTpv: null, hasRecord: false },
      { monthKey: "2026-11", targetTpv: null, actualTpv: null, hasRecord: false },
      { monthKey: "2026-12", targetTpv: null, actualTpv: null, hasRecord: false },
    ]);
  });
});
