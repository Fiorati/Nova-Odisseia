import { afterAll, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import { agentProfiles, users } from "../drizzle/schema";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";

const integrationIt = process.env.DATABASE_URL ? it : it.skip;
const ids: number[] = [];

async function createUser(name: string) {
  const db = await getDb(); const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const created = await db.insert(users).values({ openId: `campaign_${suffix}`, name, email: `campaign_${suffix}@example.invalid`, loginMethod: "integration-test" }).$returningId(); const id = created[0]?.id;
  if (!id) throw new Error("Falha ao criar usuário de campanha."); ids.push(id); return id;
}
function callerFor(userId: number) { return appRouter.createCaller({ user: { id: userId, role: "user" } as TrpcContext["user"], req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] }); }
const campaign = { scope: "distrital" as const, title: "Mutirão da Jornada", objective: "Aumentar a preparação de PSV.", status: "ativa" as const, startAt: new Date("2026-09-01T12:00:00.000Z"), endAt: new Date("2026-09-30T12:00:00.000Z"), targetParticipants: 0, targetParticipationRate: 75, targetPsvs: 0, targetTpv: 300000, targetNewClients: 6, actualParticipants: 0, actualPsvs: 0, actualTpv: 0, actualNewClients: 0 };

afterAll(async () => { if (!process.env.DATABASE_URL || !ids.length) return; const db = await getDb(); await db.delete(users).where(inArray(users.id, ids)); });

describe("Campanhas de engajamento", () => {
  integrationIt("aplica o escopo do polo, projeta participantes elegíveis e permite leitura distrital", async () => {
    const db = await getDb(); const poloLeader = await createUser("Líder Polo Campanha"); const districtLeader = await createUser("Distrital Campanha"); const agentA = await createUser("Agente Campanha A"); const agentB = await createUser("Agente Campanha B"); const outsider = await createUser("Líder Externo Campanha");
    await db.insert(agentProfiles).values([
      { userId: poloLeader, displayName: "Líder Polo Campanha", leadershipRole: "polo", regional: "Regional SP", district: "Distrito Jornada", polo: "Polo Heroi" },
      { userId: districtLeader, displayName: "Distrital Campanha", leadershipRole: "distrital", regional: "Regional SP", district: "Distrito Jornada", polo: "" },
      { userId: agentA, displayName: "Agente Campanha A", leadershipRole: "none", regional: "Regional SP", district: "Distrito Jornada", polo: "Polo Heroi" },
      { userId: agentB, displayName: "Agente Campanha B", leadershipRole: "none", regional: "Regional SP", district: "Distrito Jornada", polo: "Polo Heroi" },
      { userId: outsider, displayName: "Líder Externo Campanha", leadershipRole: "polo", regional: "Regional SP", district: "Outro Distrito", polo: "Outro Polo" },
    ]);
    const created = await callerFor(poloLeader).campaigns.create({ ...campaign, scope: "distrital", district: "Tentativa externa", polo: "Tentativa externa" });
    expect(created).toMatchObject({ scope: "polo", district: "Distrito Jornada", polo: "Polo Heroi", editable: true });
    expect(created.projection).toMatchObject({ eligibleAgents: 2, expectedParticipants: 2, suggestedPsvs: 2, plannedParticipationRate: 100 });
    expect((await callerFor(districtLeader).campaigns.list()).map(item => item.id)).toContain(created.id);
    expect(await callerFor(outsider).campaigns.list()).toEqual([]);
    await expect(callerFor(districtLeader).campaigns.update({ id: created.id, ...campaign })).rejects.toThrow(/criou a campanha/i);
  });

  integrationIt("bloqueia agentes sem papel de liderança", async () => {
    const db = await getDb(); const agent = await createUser("Agente sem Campanha"); await db.insert(agentProfiles).values({ userId: agent, displayName: "Agente sem Campanha", leadershipRole: "none" });
    await expect(callerFor(agent).campaigns.list()).rejects.toThrow(/líderes e distritais/i);
  });
});
