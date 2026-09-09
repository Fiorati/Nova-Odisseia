import { describe, expect, it } from "vitest";
import { verifyPassword } from "./credentials";
import { createVerificationCode, createVerificationToken, isAllowedRegistrationEmail, SYSTEM_ADMIN_EMAIL } from "./registration";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("regras de cadastro confirmado", () => {
  it("aceita Stone e a exceção administrativa, mas bloqueia domínios externos", () => {
    expect(isAllowedRegistrationEmail("agente@stone.com.br")).toBe(true);
    expect(isAllowedRegistrationEmail(SYSTEM_ADMIN_EMAIL)).toBe(true);
    expect(isAllowedRegistrationEmail("agente@gmail.com")).toBe(false);
    expect(isAllowedRegistrationEmail("agente@stone.com.br.evil.com")).toBe(false);
  });

  it("gera código e token apenas verificáveis pelos hashes persistidos", async () => {
    const code = await createVerificationCode();
    const token = await createVerificationToken();
    await expect(verifyPassword(code.code, code.passwordSalt, code.passwordHash)).resolves.toBe(true);
    await expect(verifyPassword("000000", code.passwordSalt, code.passwordHash)).resolves.toBe(false);
    await expect(verifyPassword(token.token, token.passwordSalt, token.passwordHash)).resolves.toBe(true);
  });

  it("informa a mensagem temática ao bloquear um domínio não corporativo", async () => {
    const caller = appRouter.createCaller({ user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    await expect(caller.auth.register({ name: "Agente Externo", email: "agente@gmail.com", password: "senha-segura", leadershipRole: "none" })).rejects.toThrow("Apenas é possível viajar na Odisseia com e-mail corporativo Stone");
  });
});
