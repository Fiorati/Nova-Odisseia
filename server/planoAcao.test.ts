import { describe, expect, it } from "vitest";
import { buildPlanoMessages, hasGoals, planoInputSchema, planoOptionsFor, planoReportSchema, PLANO_AREAS } from "../shared/planoAcao";

describe("plano de ação do Oráculo", () => {
  it("só pergunta objetivos quando a odisseia não tem referência", () => {
    expect(hasGoals({})).toBe(false);
    expect(hasGoals({ calling: "  ", cycleGoal: "", pdiFocus: [""] })).toBe(false);
    expect(hasGoals({ cycleGoal: "Fechar 3 clientes" })).toBe(true);
    expect(hasGoals({ pdiFocus: ["Comunicação"] })).toBe(true);
    expect(hasGoals({ savedGoals: { area: "Dinheiro", objetivo: "Reserva", prioridades: ["a", "b", "c"] } })).toBe(true);
  });
  it("exige exatamente 3 prioridades", () => {
    const base = { source: "disc", readingId: 1 } as const;
    expect(planoInputSchema.safeParse(base).success).toBe(true);
    expect(planoInputSchema.safeParse({ ...base, goals: { area: "x", objetivo: "y", prioridades: ["a", "b"] } }).success).toBe(false);
    expect(planoInputSchema.safeParse({ ...base, goals: { area: "x", objetivo: "y", prioridades: ["a", "b", "c"] } }).success).toBe(true);
  });
  it("o plano tem 3 passos com justificativa", () => {
    const passo = { passo: "p", quando: "segunda", porque: "leitura" };
    expect(planoReportSchema.safeParse({ titulo: "t", foco: "f", passos: [passo, passo, passo], indicador: "i" }).success).toBe(true);
    expect(planoReportSchema.safeParse({ titulo: "t", foco: "f", passos: [passo], indicador: "i" }).success).toBe(false);
  });
  it("o prompt leva leitura, objetivos e limites de transparência", () => {
    const [system, user] = buildPlanoMessages("mapa_astral", { essencia: "E" }, { calling: "Ensinar" }, { area: "Dinheiro", objetivo: "Montar reserva", prioridades: ["a", "b", "c"] });
    expect(system.content).toMatch(/não faz diagnóstico/);
    expect(system.content).toMatch(/não promete resultado/);
    expect(user.content).toContain("Mapa Astral");
    expect(user.content).toContain("Chamado: Ensinar");
    expect(user.content).toContain("Montar reserva");
    expect(user.content).toContain("a | b | c");
  });
  it("cada área tem objetivos e ao menos 3 prioridades", () => {
    for (const k of Object.keys(PLANO_AREAS) as (keyof typeof PLANO_AREAS)[]) { const o = planoOptionsFor(k); expect(o.objetivos.length).toBeGreaterThan(2); expect(o.prioridades.length).toBeGreaterThanOrEqual(3); }
  });
});
