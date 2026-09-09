import { afterEach, describe, expect, it, vi } from "vitest";
import { applySecurityHeaders, hasTrustedMutationOrigin } from "./requestSecurity";

describe("proteção de requisições do navegador", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("aceita mutação da mesma origem e bloqueia origem externa", () => {
    expect(hasTrustedMutationOrigin({ headers: { host: "example.com", origin: "https://example.com" } } as never)).toBe(true);
    expect(hasTrustedMutationOrigin({ headers: { host: "example.com", origin: "https://origem-externa.example" } } as never)).toBe(false);
  });

  it("não bloqueia o contexto interno sem host usado pelos testes de contrato", () => {
    expect(hasTrustedMutationOrigin({ headers: {} } as never)).toBe(true);
  });

  it("publica cabeçalhos de proteção e desabilita cache para a API", () => {
    vi.stubEnv("NODE_ENV", "production");
    const headers = new Map<string, string>();
    const res = { setHeader: (name: string, value: string) => headers.set(name, value) };
    const next = vi.fn();
    applySecurityHeaders({ path: "/api/trpc/auth.login" } as never, res as never, next);

    expect(headers.get("Content-Security-Policy")).toContain("default-src 'self'");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Cache-Control")).toBe("no-store");
    expect(headers.get("Strict-Transport-Security")).toContain("max-age=31536000");
    expect(next).toHaveBeenCalledOnce();
  });
});
