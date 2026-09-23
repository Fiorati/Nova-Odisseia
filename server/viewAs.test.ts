import { describe, expect, it } from "vitest";
import { isMutationAllowedWhileViewing, parseViewAsHeader, resolveViewAs } from "../shared/viewAs";

const admin = { id: 1, role: "admin", email: "fiorati@novaodisseia.com" };
const kaike = { id: 4159, role: "user", email: "kaike@example.com" };
const load = async (id: number) => (id === kaike.id ? kaike : id === admin.id ? admin : null);

describe("ver como usuário", () => {
  it("admin passa a ver como o usuário escolhido", async () => {
    await expect(resolveViewAs(admin, "4159", load)).resolves.toEqual({ user: kaike, viewer: admin });
  });
  it("usuário comum não consegue usar o cabeçalho", async () => {
    await expect(resolveViewAs(kaike, "1", load)).resolves.toEqual({ user: kaike, viewer: null });
  });
  it("sem sessão, nada muda", async () => {
    await expect(resolveViewAs(null, "4159", load)).resolves.toEqual({ user: null, viewer: null });
  });
  it("ignora id inválido, inexistente ou o próprio admin", async () => {
    for (const value of ["abc", "-3", "0", "999999", "1", undefined, ["x"]]) {
      await expect(resolveViewAs(admin, value, load)).resolves.toEqual({ user: admin, viewer: null });
    }
  });
  it("aceita cabeçalho repetido pegando o primeiro valor", () => {
    expect(parseViewAsHeader(["4159", "1"])).toBe(4159);
  });
  it("modo somente leitura só libera o logout", () => {
    expect(isMutationAllowedWhileViewing("auth.logout")).toBe(true);
    expect(isMutationAllowedWhileViewing("agent.saveJourney")).toBe(false);
  });
});

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function ctxFor(user: Record<string, unknown>, viewer: Record<string, unknown> | null): TrpcContext {
  const base = { openId: "x", name: "N", loginMethod: "email", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
  return {
    user: { ...base, ...user } as TrpcContext["user"],
    viewer: viewer ? ({ ...base, ...viewer } as TrpcContext["user"]) : null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as unknown as TrpcContext["res"],
  };
}

describe("ver como usuário no servidor", () => {
  it("bloqueia salvar a jornada enquanto o admin vê como outro usuário", async () => {
    const caller = appRouter.createCaller(ctxFor(kaike, admin));
    await expect(caller.agent.saveJourney({} as never)).rejects.toThrow(/somente leitura/);
  });
  it("informa quem está vendo e como quem", async () => {
    const caller = appRouter.createCaller(ctxFor({ ...kaike, name: "Kaike" }, admin));
    const status = await caller.auth.viewAsStatus();
    expect(status.viewing).toBe(true);
    expect(status.target?.id).toBe(4159);
    expect(status.viewer?.email).toBe(admin.email);
  });
  it("lista de e-mails só existe para o admin real", async () => {
    await expect(appRouter.createCaller(ctxFor(kaike, null)).admin.viewAsOptions()).rejects.toThrow();
  });
  it("logout continua liberado", async () => {
    await expect(appRouter.createCaller(ctxFor(kaike, admin)).auth.logout()).resolves.toBeTruthy();
  });
});
