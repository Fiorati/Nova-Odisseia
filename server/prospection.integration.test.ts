import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { inArray } from "drizzle-orm";
import { agentProfiles, routeAssignments, users } from "../drizzle/schema";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb, importPoloPortfolio } from "./db";

const integrationIt = process.env.DATABASE_URL ? it : it.skip;
const ids: number[] = [];

async function createUser(name: string) {
  const db = await getDb();
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const created = await db.insert(users).values({ openId: `prospection_${suffix}`, name, email: `prospection_${suffix}@example.invalid`, loginMethod: "integration-test" }).$returningId();
  const id = created[0]?.id;
  if (!id) throw new Error("Falha ao criar usuário temporário de prospecção.");
  ids.push(id);
  return id;
}

function callerFor(userId: number) {
  return appRouter.createCaller({ user: { id: userId } as TrpcContext["user"], req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
}

afterEach(() => vi.unstubAllGlobals());

afterAll(async () => {
  if (!process.env.DATABASE_URL || !ids.length) return;
  const db = await getDb();
  await db.delete(users).where(inArray(users.id, ids));
});

describe("Prospecção Cavalo de Tróia", () => {
  integrationIt("cria dossiê apenas a partir de lead de rota formalmente atribuída", async () => {
    const db = await getDb();
    const leaderId = await createUser("Líder Cavalo de Tróia");
    const agentId = await createUser("Agente Cavalo de Tróia");
    const outsiderId = await createUser("Agente Fora da Rota");
    const routeSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const route = `Rota Troia ${routeSuffix}`;
    await db.insert(agentProfiles).values([
      { userId: leaderId, displayName: "Líder Cavalo de Tróia", leadershipRole: "polo", polo: "Polo Troia" },
      { userId: agentId, displayName: "Agente Cavalo de Tróia", leadershipRole: "none", polo: "Polo Troia" },
      { userId: outsiderId, displayName: "Agente Fora da Rota", leadershipRole: "none", polo: "Outro Polo" },
    ]);
    await db.insert(routeAssignments).values({ route, routeKey: route.toLocaleLowerCase("pt-BR"), agentName: "Agente Cavalo de Tróia", agentEmail: "", userId: agentId, polo: "Polo Troia", updatedByUserId: leaderId });
    const monthKey = new Date().toISOString().slice(0, 7);
    await importPoloPortfolio(leaderId, { portfolioType: "route", fileName: "troia.xlsx", fileDataBase64: Buffer.from("troia").toString("base64"), referenceMonth: monthKey, rows: [{ route, clientName: "Padaria Pública", document: "19131243000197", projectedTpv: 120000, stage: "Negociação", temperature: "Quente", segment: "Alimentação" }] });
    await callerFor(agentId).agent.goal({ monthKey, targetVariable: 10000, targetTpv: 100000, targetNewClients: 2, actualTpv: 0, actualVariable: 0 });

    const recommendations = await callerFor(agentId).prospection.recommendations();
    expect(recommendations.items[0]).toMatchObject({ clientName: "Padaria Pública", projectedTpv: 120000 });
    expect(recommendations).toMatchObject({ targetVariable: 10000, rvGap: 10000, targetTpv: 100000, tpvGap: 100000, suggestedCoverageTpv: 120000 });
    expect(recommendations.items[0]?.suggestedForGoal).toBe(true);

    const dossier = await callerFor(agentId).prospection.create({ clientName: "Padaria Pública", routeEntryId: recommendations.items[0]!.id, hypotheses: "Hipótese editável pelo agente." });
    expect(dossier).toMatchObject({ clientName: "Padaria Pública", source: "portfolio" });
    await expect(callerFor(outsiderId).prospection.create({ clientName: "Padaria Pública", routeEntryId: recommendations.items[0]!.id })).rejects.toThrow(/rotas formalmente atribuídas/i);
  });

  integrationIt("consulta CNPJ público sob ação do agente e registra fonte rastreável", async () => {
    const agentId = await createUser("Agente Consulta CNPJ");
    const db = await getDb();
    await db.insert(agentProfiles).values({ userId: agentId, displayName: "Agente Consulta CNPJ", leadershipRole: "none" });
    const dossier = await callerFor(agentId).prospection.create({ clientName: "Lead Manual", cnpj: "19.131.243/0001-97" });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ cnpj: "19131243000197", razao_social: "OPEN KNOWLEDGE BRASIL", nome_fantasia: "REDE PELO CONHECIMENTO LIVRE", descricao_situacao_cadastral: "ATIVA", porte: "DEMAIS", cnae_fiscal: 9430800, cnae_fiscal_descricao: "Atividades de associações", municipio: "SAO PAULO", uf: "SP", bairro: "BELA VISTA", data_inicio_atividade: "2013-10-03" }), { status: 200, headers: { "Content-Type": "application/json" } })));

    const result = await callerFor(agentId).prospection.researchCnpj({ dossierId: dossier.id });
    expect(result.snapshot).toMatchObject({ razaoSocial: "OPEN KNOWLEDGE BRASIL", uf: "SP", situacaoCadastral: "ATIVA" });
    await callerFor(agentId).prospection.update({ id: dossier.id, hypotheses: "Hipótese temporária", agentNotes: "Nota temporária" });
    await callerFor(agentId).prospection.update({ id: dossier.id, hypotheses: "", agentNotes: "" });
    const [stored] = await callerFor(agentId).prospection.list();
    expect(stored.publicSnapshot).toMatchObject({ atividade: "Atividades de associações" });
    expect(stored.sources.map(source => source.label)).toContain("BrasilAPI · CNPJ público");
    expect(stored.hypotheses).toBeNull();
    expect(stored.agentNotes).toBeNull();
  });
});
