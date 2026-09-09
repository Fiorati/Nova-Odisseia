import { describe, expect, it } from "vitest";
import { createPassword, normalizedEmail, verifyPassword } from "./credentials";

describe("credenciais de e-mail", () => {
  it("normaliza o e-mail e valida apenas a senha correta", async () => {
    const credentials = await createPassword("SenhaForte2026");
    expect(normalizedEmail("  AGENTE@STONE.COM.BR ")).toBe("agente@stone.com.br");
    await expect(verifyPassword("SenhaForte2026", credentials.passwordSalt, credentials.passwordHash)).resolves.toBe(true);
    await expect(verifyPassword("senha-errada", credentials.passwordSalt, credentials.passwordHash)).resolves.toBe(false);
  });
});
