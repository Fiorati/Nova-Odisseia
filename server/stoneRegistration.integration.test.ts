import { afterAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { users } from "../drizzle/schema";
import { appRouter } from "./routers";
import { ensureTestAdminAccount, getCredentialsForUser, getDb, getUserByEmail } from "./db";
import type { TrpcContext } from "./_core/context";

const integrationIt = process.env.DATABASE_URL ? it : it.skip;
const createdIds: number[] = [];

describe("integração de cadastro Stone", () => {
  integrationIt("aceita e-mail @stone.com.br, cria as credenciais e inicia a sessão", async () => {
    const suffix = `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
    const caller = appRouter.createCaller({
      user: null,
      req: { headers: {} } as TrpcContext["req"],
      res: { cookie: vi.fn() } as unknown as TrpcContext["res"],
    });
    const result = await caller.auth.register({ name: "Agente Stone Temporário", email: `agente.${suffix}@stone.com.br`, password: "senha-segura", leadershipRole: "none" });
    createdIds.push(result.user.id);
    expect(result.user.email).toMatch(/@stone\.com\.br$/);
    expect(await getCredentialsForUser(result.user.id)).not.toBeNull();
  });

  integrationIt("cria o acesso administrativo de testes solicitado com papel admin", async () => {
    const existing = await getUserByEmail("fioratigabriel.8@gmail.com");
    if (existing) {
      const normalized = await ensureTestAdminAccount();
      expect(normalized?.role).toBe("admin");
      return;
    }
    const caller = appRouter.createCaller({
      user: null,
      req: { headers: {} } as TrpcContext["req"],
      res: { cookie: vi.fn() } as unknown as TrpcContext["res"],
    });
    const result = await caller.auth.register({ name: "Gabriel Fiorati", email: "fioratigabriel.8@gmail.com", password: "senha-segura", leadershipRole: "none" });
    createdIds.push(result.user.id);
    expect(result.user.role).toBe("admin");
  });

  afterAll(async () => {
    if (!createdIds.length || !process.env.DATABASE_URL) return;
    const db = await getDb();
    for (const id of createdIds) await db.delete(users).where(eq(users.id, id));
  });
});
