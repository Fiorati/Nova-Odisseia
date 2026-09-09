import { afterAll, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import { agentProfiles, users } from "../drizzle/schema";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { ensureUlissesAdminAccount, getCredentialsForUser, getDb } from "./db";
import { verifyPassword } from "./credentials";
import { isAllowedRegistrationEmail, SYSTEM_ADMIN_EMAIL } from "./registration";

const integrationIt = process.env.DATABASE_URL && process.env.ULISSES_ADMIN_PASSWORD ? it : it.skip;
const ids: number[] = [];

async function createUser(name: string) {
  const db = await getDb(); const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const created = await db.insert(users).values({ openId: `admin_target_${suffix}`, name, email: `admin_target_${suffix}@example.invalid`, loginMethod: "integration-test" }).$returningId(); const id = created[0]?.id;
  if (!id) throw new Error("Falha ao criar perfil de teste administrativo."); ids.push(id); return id;
}
function callerFor(userId: number, role: "user" | "admin") { return appRouter.createCaller({ user: { id: userId, role } as TrpcContext["user"], req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] }); }
afterAll(async () => { if (!process.env.DATABASE_URL || !ids.length) return; const db = await getDb(); await db.delete(users).where(inArray(users.id, ids)); });

describe("integração do administrador Nova Odisseia", () => {
  integrationIt("mantém a conta administrativa persistida com papel admin e perfil distrital", async () => {
    const admin = await ensureUlissesAdminAccount();
    expect(admin).toMatchObject({ email: SYSTEM_ADMIN_EMAIL, role: "admin" });
    const credentials = await getCredentialsForUser(admin!.id);
    expect(credentials).not.toBeNull();
    await expect(verifyPassword(process.env.ULISSES_ADMIN_PASSWORD!, credentials!.passwordSalt, credentials!.passwordHash)).resolves.toBe(true);
    expect(isAllowedRegistrationEmail("fiorati@novaodisseia.com")).toBe(true);
  });

  integrationIt("permite ao admin alterar hierarquia e metas-base, mas bloqueia usuário comum", async () => {
    const admin = await ensureUlissesAdminAccount(); const userId = await createUser("Agente para gestão"); const db = await getDb();
    await db.insert(agentProfiles).values({ userId, displayName: "Agente para gestão", leadershipRole: "none", targetVariable: 0, defaultGoalTpv: 0, defaultGoalNewClients: 0 });
    const input = { userId, displayName: "Líder promovido", leadershipRole: "polo" as const, regional: "Regional SP", district: "Distrito Norte", polo: "Polo Heroi", route: "Rota 01", targetVariable: 6000, defaultGoalTpv: 350000, defaultGoalNewClients: 7 };
    await expect(callerFor(userId, "user").admin.updateProfile(input)).rejects.toThrow(/administrativo global/i);
    const updated = await callerFor(admin!.id, "admin").admin.updateProfile(input);
    expect(updated).toMatchObject({ userId, displayName: "Líder promovido", leadershipRole: "polo", defaultGoalTpv: 350000, targetVariable: 6000 });
    expect((await callerFor(admin!.id, "admin").admin.profiles()).map(profile => profile.userId)).toContain(userId);
  });
});
