import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { pointEvents, users } from "../drizzle/schema";
import { getDb, getPrivatePipelineLeads, getPsvWeeklyRitual, savePipelineLead, savePsvPlan, savePsvWeeklyRitual } from "./db";

const integrationIt = process.env.DATABASE_URL ? it : it.skip;
const ids: number[] = [];
async function createUser() { const db = await getDb(); const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; const created = await db.insert(users).values({ openId: `psv_${suffix}`, name: "Agente PSV", email: `psv_${suffix}@example.invalid`, loginMethod: "integration-test" }).$returningId(); const id = created[0]?.id; if (!id) throw new Error("Usuário temporário não criado."); ids.push(id); return id; }
afterAll(async () => { if (!process.env.DATABASE_URL) return; const db = await getDb(); for (const id of ids) await db.delete(users).where(eq(users.id, id)); });

describe("pontuação mensal de PSV", () => {
  integrationIt("concede 10 pontos apenas uma vez no mês e permite nova concessão no mês seguinte", async () => {
    const userId = await createUser(); const base = { targetVariable: 10000, currentVariable: 0, plannedMultiplier: 2, weeksRemaining: 2, recommendedTpv: 300000, recommendedClients30: 2, recommendedClients50: 1, recommendedClients100: 0 };
    expect((await savePsvPlan(userId, { ...base, weekOf: "2026-08-07" })).pointsAwarded).toBe(10);
    expect((await savePsvPlan(userId, { ...base, weekOf: "2026-08-21" })).pointsAwarded).toBe(0);
    expect((await savePsvPlan(userId, { ...base, weekOf: "2026-09-04" })).pointsAwarded).toBe(10);
    const db = await getDb(); const events = await db.select().from(pointEvents).where(eq(pointEvents.userId, userId));
    expect(events.filter(event => event.kind.startsWith("psv-")).map(event => event.points)).toEqual([10, 10]);
  });

  integrationIt("salva o ritual semanal somente com leads do funil privado do agente", async () => {
    const userId = await createUser(); const outsiderId = await createUser();
    const lead = { clientName: "Lead para preparo", temperature: "quente" as const, segmentId: "alimentacao", segmentLabel: "Alimentação", mcc: "5812", cnae: "", projectedTpv: 50000, nextContactAt: new Date("2026-09-01T12:00:00.000Z"), stage: "planejado" as const };
    await savePipelineLead(userId, lead); await savePipelineLead(outsiderId, { ...lead, clientName: "Lead externo" });
    const [ownLead] = await getPrivatePipelineLeads(userId); const [outsiderLead] = await getPrivatePipelineLeads(outsiderId); if (!ownLead || !outsiderLead) throw new Error("Leads temporários não criados.");
    const ritual = await savePsvWeeklyRitual(userId, { weekOf: "2026-08-28", dailyResult: "Atualizei o pipe e avancei uma negociação.", dailyPlan: "Fazer 10 visitas de venda.", weeklyRoute: "Seg: Vila Medeiros; Ter: Santana.", preparedLeadIds: [ownLead.id, ownLead.id] });
    expect(ritual).toMatchObject({ dailyPlan: "Fazer 10 visitas de venda.", preparedLeadIds: [ownLead.id] });
    expect(await getPsvWeeklyRitual(userId, "2026-08-28")).toMatchObject({ weeklyRoute: "Seg: Vila Medeiros; Ter: Santana.", preparedLeadIds: [ownLead.id] });
    await expect(savePsvWeeklyRitual(userId, { weekOf: "2026-08-28", preparedLeadIds: [outsiderLead.id] })).rejects.toThrow(/seu próprio funil/i);
  });
});
