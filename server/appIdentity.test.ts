import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("identidade pública da aplicação", () => {
  it("expõe o título Nova Odisseia: Fiorati pelo contrato público", async () => {
    const caller = appRouter.createCaller({ user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    await expect(caller.identity.configuration()).resolves.toEqual({ title: "Nova Odisseia: Fiorati" });
  });
});
