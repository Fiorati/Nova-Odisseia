import { inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { agentProfiles, routeAssignments, users } from "../drizzle/schema";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { assignRouteOwner, createEmailAccount, getDashboard, getDb, getDistrictLeaderOverview, getLeaderOverview, getRoutePortfolioForUser, getSalesPipelineForLeader, importDistrictPortfolio, importPoloPortfolio, importRoutePortfolio, updateProfile } from "./db";

const integrationIt = process.env.DATABASE_URL ? it : it.skip;
const ids: number[] = [];

async function createUser(name: string) {
  const db = await getDb();
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const created = await db.insert(users).values({ openId: `integration_${suffix}`, name, email: `integration_${suffix}@example.invalid`, loginMethod: "integration-test" }).$returningId();
  const id = created[0]?.id;
  if (!id) throw new Error("Falha ao criar usuário temporário de integração.");
  ids.push(id);
  return id;
}

function callerFor(userId: number) {
  return appRouter.createCaller({
    user: { id: userId } as TrpcContext["user"],
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  });
}

describe("integração de perfil organizacional e visão master", () => {
  integrationIt("persiste a estrutura no perfil, filtra a visão master e bloqueia perfil comum", async () => {
    const db = await getDb();
    const leaderId = await createUser("Líder de Integração");
    const matchingAgentId = await createUser("Agente de Integração A");
    const otherAgentId = await createUser("Agente de Integração B");
    await db.insert(agentProfiles).values([
      { userId: leaderId, displayName: "Líder de Integração", leadershipRole: "polo", regional: "Regional SP", district: "Distrito SP Norte", polo: "Polo Vila Medeiros" },
      { userId: matchingAgentId, displayName: "Agente de Integração A", leadershipRole: "none" },
      { userId: otherAgentId, displayName: "Agente de Integração B", leadershipRole: "none" },
    ]);

    await callerFor(matchingAgentId).agent.profile({
      displayName: "Agente de Integração A", targetVariable: 12000, defaultGoalTpv: 300000, profileVisibleInRanking: true,
      regional: "Regional SP", district: "Distrito SP Norte", polo: "Polo Vila Medeiros", route: "Rota 04",
    });
    await updateProfile(otherAgentId, {
      displayName: "Agente de Integração B", targetVariable: 8000, defaultGoalTpv: 300000, profileVisibleInRanking: true,
      regional: "Regional Sul", district: "Distrito ABC", polo: "Polo Lapa", route: "Rota 99",
    });

    const dashboard = await callerFor(matchingAgentId).agent.dashboard();
    expect(dashboard.profile).toMatchObject({ regional: "Regional SP", district: "Distrito SP Norte", polo: "Polo Vila Medeiros", route: "Rota 04" });

    const overview = await callerFor(leaderId).leadership.overview({ regional: "Regional SP", district: "Distrito SP Norte", polo: "Polo Vila Medeiros" });
    expect(overview.map(agent => agent.displayName)).toContain("Agente de Integração A");
    expect(overview.map(agent => agent.displayName)).not.toContain("Agente de Integração B");
    await expect(callerFor(matchingAgentId).leadership.overview({})).rejects.toThrow("Acesso exclusivo para líderes autorizados");
  });

  integrationIt("compartilha carteira formalmente atribuída e bloqueia rota declarada apenas no perfil", async () => {
    const db = await getDb();
    const leaderId = await createUser("Líder de Carteira de Integração");
    const agentId = await createUser("Agente de Carteira de Integração");
    const unassignedAgentId = await createUser("Agente sem Titularidade de Integração");
    await db.insert(agentProfiles).values([
      { userId: leaderId, displayName: "Líder de Carteira de Integração", leadershipRole: "polo", polo: "Polo Integração" },
      { userId: agentId, displayName: "Agente de Carteira de Integração", leadershipRole: "none", route: "ROTA   INTEGRAÇÃO", polo: "Polo Integração" },
      { userId: unassignedAgentId, displayName: "Agente sem Titularidade de Integração", leadershipRole: "none", route: "Rota integração", polo: "Polo Integração" },
    ]);
    await db.insert(routeAssignments).values({ route: "Rota integração", routeKey: "rota integração", agentName: "Agente de Carteira de Integração", agentEmail: "", userId: agentId, polo: "Polo Integração", updatedByUserId: leaderId });
    await importPoloPortfolio(leaderId, {
      portfolioType: "route",
      fileName: "carteira_integracao.xlsx",
      fileDataBase64: Buffer.from("arquivo de integração temporário").toString("base64"),
      referenceMonth: "2026-08",
      rows: [{ route: "Rota integração", clientName: "Cliente temporário de integração", projectedTpv: 50000, stage: "Mapeado", temperature: "Frio" }],
    });

    const shared = await getRoutePortfolioForUser(agentId, "route", "2026-08");
    expect(shared.entries).toHaveLength(1);
    expect(shared.entries[0]).toMatchObject({ clientName: "Cliente temporário de integração", projectedTpv: 50000, stage: "Mapeado" });
    await expect(importRoutePortfolio(unassignedAgentId, { portfolioType: "route", fileName: "sem_titularidade.xlsx", fileDataBase64: Buffer.from("arquivo").toString("base64"), rows: [{ route: "Rota integração", clientName: "Acesso indevido" }] })).rejects.toThrow("atribuída formalmente");
    expect((await getRoutePortfolioForUser(unassignedAgentId, "route")).entries).toHaveLength(0);
  });

  integrationIt("permite ao Dono de Polo importar rotas do próprio polo e bloqueia rota de outro polo", async () => {
    const db = await getDb();
    const leaderId = await createUser("Dono de Polo de Integração");
    const ownAgentId = await createUser("Agente do Polo de Integração");
    const otherAgentId = await createUser("Agente de Outro Polo de Integração");
    await db.insert(agentProfiles).values([
      { userId: leaderId, displayName: "Dono de Polo de Integração", leadershipRole: "polo", polo: "Polo Integração" },
      { userId: ownAgentId, displayName: "Agente do Polo de Integração", leadershipRole: "none", polo: "Polo Integração", route: "Rota Polo 01" },
      { userId: otherAgentId, displayName: "Agente de Outro Polo de Integração", leadershipRole: "none", polo: "Outro Polo", route: "Rota Outro 01" },
    ]);
    await db.insert(routeAssignments).values([
      { route: "Rota Polo 01", routeKey: "rota polo 01", agentName: "Agente do Polo de Integração", agentEmail: "", userId: ownAgentId, polo: "Polo Integração", updatedByUserId: leaderId },
      { route: "Rota Outro 01", routeKey: "rota outro 01", agentName: "Agente de Outro Polo de Integração", agentEmail: "", userId: otherAgentId, polo: "Outro Polo", updatedByUserId: leaderId },
    ]);
    await importPoloPortfolio(leaderId, {
      portfolioType: "route", fileName: "carteira_polo.xlsx", fileDataBase64: Buffer.from("arquivo polo temporário").toString("base64"),
      rows: [{ route: "Rota Polo 01", clientName: "Cliente do polo", projectedTpv: 40000 }],
    });
    const shared = await getRoutePortfolioForUser(ownAgentId, "route");
    expect(shared.entries[0]?.clientName).toBe("Cliente do polo");
    await expect(importPoloPortfolio(leaderId, {
      portfolioType: "route", fileName: "fora_do_polo.xlsx", fileDataBase64: Buffer.from("arquivo polo temporário").toString("base64"),
      rows: [{ route: "Rota Outro 01", clientName: "Cliente fora do polo", projectedTpv: 40000 }],
    })).rejects.toThrow("outro polo");
  });

  integrationIt("salva e relê Card final com KPI de 200% sem teto artificial", async () => {
    const agentId = await createUser("Agente de Card Final de Integração");
    const caller = callerFor(agentId);
    await caller.monthlyCard.save({
      monthKey: "2026-07", globalKpi: 200, totalMigratedTpv: 600000, multiplier: 2,
      actualVariable: 11361, clients7To15: 4, clients15To30: 11, clients30To50: 6,
      clients50To100: 3, clients100Plus: 5,
    });

    const result = await caller.monthlyCard.get({ monthKey: "2026-07" });
    expect(result.card).toMatchObject({ globalKpi: 200, actualVariable: 11361, clients100Plus: 5 });
  });

  integrationIt("distribui carteira distrital por rota e mantém rotas ainda não cadastradas em espera", async () => {
    const db = await getDb();
    const districtLeaderId = await createUser("Distrital de Integração");
    const matchingAgentId = await createUser("Agente Rota Distrital");
    await db.insert(agentProfiles).values([
      { userId: districtLeaderId, displayName: "Distrital de Integração", leadershipRole: "distrital", district: "Distrito SP Norte" },
      { userId: matchingAgentId, displayName: "Agente Rota Distrital", leadershipRole: "none", route: "Rota 21", district: "Distrito SP Norte" },
    ]);
    await db.insert(routeAssignments).values({ route: "Rota 21", routeKey: "rota 21", agentName: "Agente Rota Distrital", agentEmail: "", userId: matchingAgentId, district: "Distrito SP Norte", updatedByUserId: districtLeaderId });
    const result = await importDistrictPortfolio(districtLeaderId, {
      portfolioType: "base", fileName: "carteira_distrital.xlsx", fileDataBase64: Buffer.from("arquivo distrital temporário").toString("base64"),
      rows: [
        { route: "Rota 21", clientName: "Cliente da rota cadastrada", projectedTpv: 1 },
        { route: "Rota sem agente", clientName: "Cliente aguardando rota", projectedTpv: 1 },
      ],
    });
    expect(result.waitingRoutes).toContain("rota sem agente");
    const agentPortfolio = await getRoutePortfolioForUser(matchingAgentId, "base");
    expect(agentPortfolio.entries).toHaveLength(1);
    expect(agentPortfolio.entries[0]?.clientName).toBe("Cliente da rota cadastrada");
  });

  integrationIt("retém seis competências de Base e Funil do Pipe para a rota formalmente atribuída", async () => {
    const db = await getDb();
    const leaderId = await createUser("Líder de Histórico de Integração");
    const agentId = await createUser("Agente de Histórico de Integração");
    await db.insert(agentProfiles).values([
      { userId: leaderId, displayName: "Líder de Histórico de Integração", leadershipRole: "polo", polo: "Polo Histórico" },
      { userId: agentId, displayName: "Agente de Histórico de Integração", leadershipRole: "none", polo: "Polo Histórico", route: "Rota Histórico 01" },
    ]);
    await db.insert(routeAssignments).values({ route: "Rota Histórico 01", routeKey: "rota histórico 01", agentName: "Agente de Histórico de Integração", agentEmail: "", userId: agentId, polo: "Polo Histórico", updatedByUserId: leaderId });
    const months = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"];
    for (const month of months) {
      await importPoloPortfolio(leaderId, { portfolioType: "base", fileName: `base-${month}.xlsx`, fileDataBase64: Buffer.from(`base-${month}`).toString("base64"), referenceMonth: month, rows: [{ route: "Rota Histórico 01", clientName: `Base ${month}`, projectedTpv: 10000 }] });
      await importPoloPortfolio(leaderId, { portfolioType: "route", fileName: `pipe-${month}.xlsx`, fileDataBase64: Buffer.from(`pipe-${month}`).toString("base64"), referenceMonth: month, rows: [{ route: "Rota Histórico 01", clientName: `Pipe ${month}`, projectedTpv: 20000, stage: "Negociação", temperature: "Quente" }] });
    }
    const baseHistory = await getRoutePortfolioForUser(agentId, "base");
    expect(baseHistory.referenceMonths).toEqual([...months].reverse());
    for (const month of months) {
      const [base, pipe] = await Promise.all([getRoutePortfolioForUser(agentId, "base", month), getRoutePortfolioForUser(agentId, "route", month)]);
      expect(base.entries.map(item => item.clientName)).toEqual([`Base ${month}`]);
      expect(pipe.entries.map(item => item.clientName)).toEqual([`Pipe ${month}`]);
    }
  });

  integrationIt("calcula o Super Pipe somente com o Funil do Pipe das rotas do escopo", async () => {
    const db = await getDb();
    const leaderId = await createUser("Líder de Super Pipe");
    const ownAgentId = await createUser("Agente Super Pipe Próprio");
    const otherAgentId = await createUser("Agente Super Pipe Externo");
    await db.insert(agentProfiles).values([
      { userId: leaderId, displayName: "Líder de Super Pipe", leadershipRole: "polo", polo: "Polo Super Pipe" },
      { userId: ownAgentId, displayName: "Agente Super Pipe Próprio", leadershipRole: "none", polo: "Polo Super Pipe" },
      { userId: otherAgentId, displayName: "Agente Super Pipe Externo", leadershipRole: "none", polo: "Outro Polo" },
    ]);
    await db.insert(routeAssignments).values([
      { route: "Rota Super Pipe 01", routeKey: "rota super pipe 01", agentName: "Agente Super Pipe Próprio", agentEmail: "", userId: ownAgentId, polo: "Polo Super Pipe", updatedByUserId: leaderId },
      { route: "Rota Super Pipe 02", routeKey: "rota super pipe 02", agentName: "Agente Super Pipe Externo", agentEmail: "", userId: otherAgentId, polo: "Outro Polo", updatedByUserId: leaderId },
    ]);
    await importPoloPortfolio(leaderId, { portfolioType: "route", fileName: "super-pipe.xlsx", fileDataBase64: Buffer.from("super-pipe").toString("base64"), referenceMonth: "2026-08", rows: [{ route: "Rota Super Pipe 01", clientName: "Oportunidade autorizada", projectedTpv: 100000, stage: "Negociação", temperature: "Quente" }] });
    const result = await getSalesPipelineForLeader(leaderId, { monthKey: "2026-08" });
    expect(result.entries.map(item => item.clientName)).toEqual(["Oportunidade autorizada"]);
    expect(result.summary).toMatchObject({ totalOpportunities: 1, projectedTpv: 100000, hotOpportunities: 1, proposalTpv: 100000 });
  });

  integrationIt("lista na visão distrital somente lideranças do próprio distrito", async () => {
    const db = await getDb();
    const districtId = await createUser("Distrital de Líderes");
    const ownLeaderId = await createUser("Dono de Polo do Distrito");
    const otherLeaderId = await createUser("Dono de Polo Externo");
    await db.insert(agentProfiles).values([
      { userId: districtId, displayName: "Distrital de Líderes", leadershipRole: "distrital", district: "Distrito de Teste" },
      { userId: ownLeaderId, displayName: "Dono de Polo do Distrito", leadershipRole: "polo", district: "Distrito de Teste", polo: "Polo de Teste" },
      { userId: otherLeaderId, displayName: "Dono de Polo Externo", leadershipRole: "polo", district: "Outro Distrito", polo: "Outro Polo" },
    ]);
    const leaders = await getDistrictLeaderOverview(districtId);
    expect(leaders.map(item => item.displayName)).toContain("Dono de Polo do Distrito");
    expect(leaders.map(item => item.displayName)).not.toContain("Dono de Polo Externo");
  });

  integrationIt("vincula automaticamente a rota atribuída por e-mail quando o agente cria sua conta", async () => {
    const db = await getDb();
    const leaderId = await createUser("Líder de Atribuição por E-mail");
    await db.insert(agentProfiles).values({ userId: leaderId, displayName: "Líder de Atribuição por E-mail", leadershipRole: "polo", polo: "Polo E-mail" });
    const email = `agente.vinculo.${Date.now()}@stone.com.br`;
    await assignRouteOwner(leaderId, { route: "Rota Pré-Cadastro", agentName: "Agente Pré-Cadastro", agentEmail: email, polo: "Polo E-mail" });
    const account = await createEmailAccount({ name: "Agente Pré-Cadastro", email, openId: `email_assignment_${Date.now()}_${Math.random().toString(36).slice(2)}`, passwordHash: "hash-teste", passwordSalt: "salt-teste" });
    if (!account) throw new Error("Conta de teste não foi criada.");
    ids.push(account.id);
    const portfolio = await getRoutePortfolioForUser(account.id, "base");
    expect(portfolio.routes.map(item => item.route)).toEqual(["Rota Pré-Cadastro"]);
  });
});

afterAll(async () => {
  if (!ids.length || !process.env.DATABASE_URL) return;
  const db = await getDb();
  await db.delete(users).where(inArray(users.id, ids));
});
