import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { inArray } from "drizzle-orm";
import { agentProfiles, routeAssignments, users } from "../drizzle/schema";
import { getDb, getRoutePortfolioForUser, importStoneLeadList } from "./db";

const integrationIt = process.env.DATABASE_URL ? it : it.skip;
const ids: number[] = [];

async function createUser(name: string) {
  const db = await getDb(); const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const created = await db.insert(users).values({ openId: `stone_list_${suffix}`, name, email: `stone_list_${suffix}@example.invalid`, loginMethod: "integration-test" }).$returningId();
  const id = created[0]?.id; if (!id) throw new Error("Falha ao criar usuário temporário."); ids.push(id); return id;
}

afterEach(() => vi.unstubAllGlobals());
afterAll(async () => { if (!process.env.DATABASE_URL || !ids.length) return; const db = await getDb(); await db.delete(users).where(inArray(users.id, ids)); });

describe("importação de Lista Inteligente Stone", () => {
  integrationIt("normaliza, remove duplicidades e mantém a origem dentro da rota formalmente atribuída", async () => {
    const db = await getDb(); const ownerId = await createUser("Agente Lista Stone"); const outsiderId = await createUser("Outro Agente Lista Stone");
    await db.insert(agentProfiles).values([
      { userId: ownerId, displayName: "Agente Lista Stone", route: "Rota Lista Stone" },
      { userId: outsiderId, displayName: "Outro Agente Lista Stone", route: "Outra Rota" },
    ]);
    await db.insert(routeAssignments).values([
      { route: "Rota Lista Stone", routeKey: "rota lista stone", agentName: "Agente Lista Stone", agentEmail: "", userId: ownerId, updatedByUserId: ownerId },
      { route: "Outra Rota", routeKey: "outra rota", agentName: "Outro Agente Lista Stone", agentEmail: "", userId: outsiderId, updatedByUserId: outsiderId },
    ]);
    const nativeFetch = globalThis.fetch;
    vi.stubGlobal("fetch", vi.fn((resource: string | URL | Request, init?: RequestInit) => {
      const url = typeof resource === "string" ? resource : resource.toString();
      if (url.includes("-apidata.googleusercontent.com/")) return Promise.resolve(new Response("<html><body><table><tr><th>Cliente</th><th>Telefone</th><th>Cidade</th><th>Etapa</th><th>Valor</th><th>Última Interação</th><th>Próxima Ação</th></tr><tr><td>Loja Inteligente</td><td>(11)99999-8888</td><td>São Paulo</td><td>Negociação</td><td>R$ 50.000,00</td><td>Ligação 26/08</td><td>Enviar proposta</td></tr><tr><td>Loja Inteligente</td><td>(11)99999-8888</td><td>São Paulo</td><td>Negociação</td><td>R$ 50.000,00</td><td>Ligação 26/08</td><td>Enviar proposta</td></tr></table></body></html>", { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }));
      return nativeFetch(resource, init);
    }));
    const result = await importStoneLeadList(ownerId, { url: `https://${"a".repeat(56)}-apidata.googleusercontent.com/download/storage/v1/b/cartao-super-zap-1/o/tam-leads-report%2Ftam-leads---agente.teste---2026-08-27-1249.html?jk=${"B".repeat(64)}&isca=1`, referenceMonth: "2026-08" });
    expect(globalThis.fetch).toHaveBeenCalledWith(expect.any(URL), expect.objectContaining({ redirect: "manual" }));
    expect(result).toMatchObject({ rowCount: 1, duplicateCount: 1 });
    const ownPortfolio = await getRoutePortfolioForUser(ownerId, "route", "2026-08");
    expect(ownPortfolio.entries).toHaveLength(1);
    expect(ownPortfolio.entries[0]).toMatchObject({ clientName: "Loja Inteligente", phone: "(11)99999-8888", city: "São Paulo", stage: "Negociação", projectedTpv: 50000, lastInteraction: "Ligação 26/08", nextAction: "Enviar proposta" });
    expect(ownPortfolio.importInfo).toMatchObject({ sourceType: "lista_inteligente", sourceOrigin: "apidata.googleusercontent.com" });
    expect(JSON.stringify(ownPortfolio.importInfo)).not.toContain("BBBBBBBB");
    expect((await getRoutePortfolioForUser(outsiderId, "route", "2026-08")).entries).toEqual([]);
  });
});
