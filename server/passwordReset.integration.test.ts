import { afterAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { users } from "../drizzle/schema";
import { createPassword, verifyPassword } from "./credentials";
import { getCredentialsForUser, getDb, getPasswordResetChallenge, replaceEmailPassword, savePasswordResetChallenge, updatePasswordResetChallenge } from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const resetMail = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("./registration", async importOriginal => ({
  ...(await importOriginal<typeof import("./registration")>()),
  createVerificationCode: async () => {
    const credentials = await createPassword("123456");
    return { code: "123456", ...credentials };
  },
  sendPasswordResetCode: resetMail,
}));

const integrationIt = process.env.DATABASE_URL ? it : it.skip;
const ids: number[] = [];
function caller() { return appRouter.createCaller({ user: null, req: { headers: {}, protocol: "https" } as unknown as TrpcContext["req"], res: { cookie: () => undefined } as unknown as TrpcContext["res"] }); }

describe("recuperação de senha", () => {
  integrationIt("troca a senha após desafio válido e consome o desafio", async () => {
    const db = await getDb();
    const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const password = await createPassword("senha-antiga");
    const created = await db.insert(users).values({ openId: `reset_${suffix}`, name: "Agente Reset", email: `reset_${suffix}@stone.com.br`, loginMethod: "email-password" }).$returningId();
    const userId = created[0]?.id;
    if (!userId) throw new Error("Falha ao criar usuário temporário.");
    ids.push(userId);
    await replaceEmailPassword(userId, password.passwordHash, password.passwordSalt);
    const code = await createPassword("123456");
    await savePasswordResetChallenge({ userId, codeHash: code.passwordHash, codeSalt: code.passwordSalt, expiresAt: new Date(Date.now() + 15 * 60 * 1000) });
    const challenge = await getPasswordResetChallenge(userId);
    expect(challenge).not.toBeNull();
    expect(await verifyPassword("123456", challenge!.codeSalt, challenge!.codeHash)).toBe(true);
    const replacement = await createPassword("senha-nova");
    await replaceEmailPassword(userId, replacement.passwordHash, replacement.passwordSalt);
    await updatePasswordResetChallenge(userId, { consumedAt: new Date() });
    const credentials = await getCredentialsForUser(userId);
    expect(await verifyPassword("senha-nova", credentials!.passwordSalt, credentials!.passwordHash)).toBe(true);
    expect((await getPasswordResetChallenge(userId))?.consumedAt).not.toBeNull();
  });

  integrationIt("valida o código e redefine a senha pelo contrato tRPC com token de uso único", async () => {
    const db = await getDb(); const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; const email = `reset_rpc_${suffix}@stone.com.br`;
    const oldPassword = await createPassword("senha-antiga");
    const created = await db.insert(users).values({ openId: `reset_rpc_${suffix}`, name: "Agente Reset RPC", email, loginMethod: "email-password" }).$returningId();
    const userId = created[0]?.id; if (!userId) throw new Error("Falha ao criar usuário temporário."); ids.push(userId);
    await replaceEmailPassword(userId, oldPassword.passwordHash, oldPassword.passwordSalt);
    const code = await createPassword("123456"); await savePasswordResetChallenge({ userId, codeHash: code.passwordHash, codeSalt: code.passwordSalt, expiresAt: new Date(Date.now() + 15 * 60 * 1000) });
    const verified = await caller().auth.verifyPasswordReset({ email, code: "123456" });
    await caller().auth.resetPassword({ email, password: "senha-nova", resetToken: verified.resetToken });
    const credentials = await getCredentialsForUser(userId);
    expect(await verifyPassword("senha-nova", credentials!.passwordSalt, credentials!.passwordHash)).toBe(true);
    await expect(caller().auth.resetPassword({ email, password: "senha-outra", resetToken: verified.resetToken })).rejects.toThrow("Redefinição inválida ou expirada.");
  });

  integrationIt("solicita o reset por tRPC sem enumerar contas e completa o fluxo com entrega simulada", async () => {
    const db = await getDb(); const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; const email = `reset_request_${suffix}@stone.com.br`;
    const password = await createPassword("senha-antiga"); const created = await db.insert(users).values({ openId: `reset_request_${suffix}`, name: "Agente Solicitação", email, loginMethod: "email-password" }).$returningId(); const userId = created[0]?.id; if (!userId) throw new Error("Falha ao criar usuário temporário."); ids.push(userId);
    await replaceEmailPassword(userId, password.passwordHash, password.passwordSalt);
    resetMail.mockClear(); expect(await caller().auth.requestPasswordReset({ email })).toEqual({ success: true });
    expect(resetMail).toHaveBeenCalledWith(expect.objectContaining({ email, name: "Agente Solicitação", code: "123456" }));
    expect(await getPasswordResetChallenge(userId)).toMatchObject({ attempts: 0 });
    expect(await caller().auth.requestPasswordReset({ email: `naoexiste_${suffix}@stone.com.br` })).toEqual({ success: true });
    expect(resetMail).toHaveBeenCalledTimes(1);
    const verified = await caller().auth.verifyPasswordReset({ email, code: "123456" });
    await caller().auth.resetPassword({ email, password: "senha-nova", resetToken: verified.resetToken });
    expect(await verifyPassword("senha-nova", (await getCredentialsForUser(userId))!.passwordSalt, (await getCredentialsForUser(userId))!.passwordHash)).toBe(true);
  });
});

afterAll(async () => {
  if (!ids.length || !process.env.DATABASE_URL) return;
  const db = await getDb();
  await db.delete(users).where(eq(users.id, ids[0]!));
});
