import { afterAll, describe, expect, it } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import { agentProfiles, securityAuditEvents, users } from "../drizzle/schema";
import { createEmailAccount, getDb } from "./db";
import { createPassword } from "./credentials";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const integrationIt = process.env.DATABASE_URL ? it : it.skip;
const ids: number[] = [];

async function createUser(name: string, role: "user" | "admin" = "user") {
  const db = await getDb();
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const created = await db.insert(users).values({ openId: `security_${suffix}`, name, email: `security_${suffix}@example.invalid`, loginMethod: "integration-test", role }).$returningId();
  const id = created[0]?.id;
  if (!id) throw new Error("Falha ao criar usuário de segurança.");
  ids.push(id);
  return id;
}

function callerFor(userId: number, role: "user" | "admin" = "user") {
  return appRouter.createCaller({ user: { id: userId, role } as TrpcContext["user"], req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
}

afterAll(async () => {
  if (!process.env.DATABASE_URL || !ids.length) return;
  const db = await getDb();
  await db.delete(users).where(inArray(users.id, ids));
});

describe("endurecimento de acesso", () => {
  integrationIt("impede que um agente transforme o próprio perfil em liderança", async () => {
    const db = await getDb();
    const agentId = await createUser("Agente Segurança");
    await db.insert(agentProfiles).values({ userId: agentId, displayName: "Agente Segurança", leadershipRole: "none" });

    await expect(callerFor(agentId).agent.leadership({ role: "polo" })).rejects.toThrow(/hierarquia é definida/i);
    await expect(callerFor(agentId).agent.profile({ displayName: "Agente Segurança", targetVariable: 0, defaultGoalTpv: 0, defaultGoalNewClients: 0, profileVisibleInRanking: true, leadershipRole: "distrital", regional: "", district: "", polo: "", route: "" })).rejects.toThrow(/hierarquia é definida/i);
  });

  integrationIt("cria novos cadastros como agentes mesmo quando há tentativa de declarar liderança", async () => {
    const db = await getDb();
    const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const credentials = await createPassword("senha-segura-para-teste");
    const account = await createEmailAccount({ name: "Cadastro Segurança", email: `cadastro.${suffix}@stone.com.br`, openId: `security_account_${suffix}`, leadershipRole: "distrital", ...credentials });
    if (!account) throw new Error("Conta de teste não criada.");
    ids.push(account.id);
    const profile = (await db.select().from(agentProfiles).where(eq(agentProfiles.userId, account.id)).limit(1))[0];
    expect(profile?.leadershipRole).toBe("none");
  });

  integrationIt("bloqueia atribuição de rota a agente cadastrado em outro polo", async () => {
    const db = await getDb();
    const leaderId = await createUser("Líder Segurança");
    const externalAgentId = await createUser("Agente Externo Segurança");
    await db.insert(agentProfiles).values([
      { userId: leaderId, displayName: "Líder Segurança", leadershipRole: "polo", regional: "SP", district: "Distrito A", polo: "Polo A" },
      { userId: externalAgentId, displayName: "Agente Externo Segurança", leadershipRole: "none", regional: "SP", district: "Distrito B", polo: "Polo B" },
    ]);
    const external = (await db.select().from(users).where(eq(users.id, externalAgentId)).limit(1))[0];
    if (!external?.email) throw new Error("E-mail de teste indisponível.");

    await expect(callerFor(leaderId).portfolio.assignRoute({ route: "Rota Segurança", agentName: "Agente Externo Segurança", agentEmail: external.email, regional: "SP", district: "Distrito A", polo: "Polo A" })).rejects.toThrow(/mesmo escopo/i);
  });

  integrationIt("impede que uma liderança altere o próprio distrito ou polo", async () => {
    const db = await getDb();
    const leaderId = await createUser("Líder Escopo Imutável");
    await db.insert(agentProfiles).values({ userId: leaderId, displayName: "Líder Escopo Imutável", leadershipRole: "polo", regional: "SP", district: "Distrito Original", polo: "Polo Original", route: "Rota Original" });

    await expect(callerFor(leaderId).agent.profile({ displayName: "Líder Escopo Imutável", targetVariable: 0, defaultGoalTpv: 0, defaultGoalNewClients: 0, profileVisibleInRanking: true, leadershipRole: "polo", regional: "SP", district: "Distrito Externo", polo: "Polo Externo", route: "Rota Externa" })).rejects.toThrow(/escopo organizacional/i);
  });

  integrationIt("registra metadados de criação de campanha, sem gravar o conteúdo da campanha", async () => {
    const db = await getDb();
    const leaderId = await createUser("Líder Auditoria");
    await db.insert(agentProfiles).values({ userId: leaderId, displayName: "Líder Auditoria", leadershipRole: "polo", regional: "SP", district: "Distrito Auditoria", polo: "Polo Auditoria" });
    const created = await callerFor(leaderId).campaigns.create({ scope: "polo", title: "Campanha confidencial", objective: "Texto que não deve ir para a trilha.", status: "rascunho", targetParticipants: 1, targetParticipationRate: 100, targetPsvs: 1, targetTpv: 0, targetNewClients: 0 });
    const events = await db.select().from(securityAuditEvents).where(and(eq(securityAuditEvents.actorUserId, leaderId), eq(securityAuditEvents.targetId, String(created.id))));
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ eventType: "campaign_create", targetType: "campaign", scope: "Polo Auditoria" });
  });
});
