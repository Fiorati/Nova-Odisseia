import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { agentProfiles, routeAssignments, users } from "../drizzle/schema";
import { getDb, getNordicStrategy, importPoloPortfolio, saveNordicActivationPlan, saveNordicMicroRoute } from "./db";

const integrationIt = process.env.DATABASE_URL ? it : it.skip;
const ids: number[] = [];
async function user(name: string) { const db = await getDb(); const s = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; const created = await db.insert(users).values({ openId: `nordic_${s}`, name, email: `nordic_${s}@example.invalid`, loginMethod: "integration-test" }).$returningId(); const id = created[0]?.id; if (!id) throw new Error("Usuário temporário não criado."); ids.push(id); return id; }
afterAll(async () => { if (!process.env.DATABASE_URL) return; const db = await getDb(); for (const id of ids) await db.delete(users).where(eq(users.id, id)); });

describe("Estratégia Nórdica integrada", () => {
  integrationIt("consome somente carteira autorizada e preserva TPV real e status da microrrota", async () => {
    const db = await getDb(); const leaderId = await user("Líder Nórdico"); const agentId = await user("Agente Nórdico"); const route = `Rota Nórdica ${Date.now()}`;
    await db.insert(agentProfiles).values({ userId: leaderId, displayName: "Líder Nórdico", leadershipRole: "polo", polo: "Polo Nórdico" });
    await db.insert(routeAssignments).values({ route, routeKey: route.toLocaleLowerCase("pt-BR"), agentName: "Agente Nórdico", agentEmail: "", userId: agentId, polo: "Polo Nórdico", updatedByUserId: leaderId });
    await importPoloPortfolio(leaderId, { portfolioType: "route", fileName: "nordica.xlsx", fileDataBase64: Buffer.from("nordica").toString("base64"), referenceMonth: "2026-08", rows: [{ route, clientName: "Lead 100K", projectedTpv: 120000, segment: "Alimentação", stage: "Negociação", temperature: "Quente" }] });
    await saveNordicActivationPlan(agentId, { clientName: "Ativo Real", stoneCode: "", mcc: "", cnae: "", segment: "", realTpv: 80000, projectedTpv: 100000, productsReady: false, d15Complete: false, d30Complete: false, estimatedVariable: 800, status: "ativacao" });
    await saveNordicMicroRoute(agentId, { area: "Vila Nórdica", visitAt: new Date("2026-08-28T12:00:00.000Z"), clientName: "Lead 100K", priority: "cem_mais", objective: "Visita", status: "concluida" });
    const strategy = await getNordicStrategy(agentId, "2026-08");
    expect(strategy.routePortfolioLeads).toHaveLength(1);
    expect(strategy.routePortfolioLeads[0]).toMatchObject({ clientName: "Lead 100K", projectedTpv: 120000 });
    expect(strategy.activationPlans[0]).toMatchObject({ clientName: "Ativo Real", realTpv: 80000 });
    expect(strategy.microRoutes[0]).toMatchObject({ clientName: "Lead 100K", status: "concluida" });
  });
});
