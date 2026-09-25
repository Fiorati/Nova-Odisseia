import { describe, expect, it } from "vitest";
import { readCheckin, suggestNextSteps, summarizeCheckin } from "@shared/checkinFlow";
import { journeyStateSchema } from "./journeyState";

describe("check-in guiado", () => {
  it("dia pesado com energia baixa pede recuperação, sem tom clínico", () => {
    const r = readCheckin({ mood: 1, energy: 1, factors: ["sono"], plan: "abaixo" });
    expect(r.tone).toBe("cuidado");
    expect(r.body).toContain("sono / cansaço");
    expect(r.body.toLowerCase()).not.toMatch(/depress|ansiedade|transtorno/);
  });
  it("dia acima do plano com energia alta vira embalo", () => {
    expect(readCheckin({ mood: 5, energy: 5, factors: ["trabalho"], plan: "acima" }).tone).toBe("impulso");
  });
  it("sugere descanso primeiro quando a energia está baixa e repetir quando foi bem", () => {
    expect(suggestNextSteps({ mood: 2, energy: 1, factors: ["sono"], plan: "abaixo" })[0]).toBe("descansar");
    expect(suggestNextSteps({ mood: 5, energy: 5, factors: [], plan: "acima" })[0]).toBe("repetir");
    expect(suggestNextSteps({ mood: 3, energy: 3, factors: [], plan: "dentro" })).toHaveLength(4);
  });
  it("gera resumo para os campos antigos e o esquema aceita o detalhe", () => {
    const detail = { mood: 4 as const, factors: ["trabalho" as const], plan: "dentro" as const, next: "outro" as const, nextOther: "Visitar a padaria", when: "amanha-cedo" as const, note: "Cliente elogiou" };
    const s = summarizeCheckin(detail);
    expect(s.reflection).toBe("Me sinto bem; dia dentro do planejado. Pesou/ajudou: trabalho / vendas. Cliente elogiou");
    expect(s.nextAction).toBe("Visitar a padaria - amanhã cedo");
    const areas = ["profissional", "pessoal", "emocional", "comunidade"].map(key => ({ key, label: key, score: 5, focus: "f" }));
    const parsed = journeyStateSchema.parse({ calling: "c", cycleGoal: "g", stage: "Chamado", xp: 0, streak: 0, areas, missions: [], checkins: [{ date: "2026-09-24", energy: 3, ...s, detail }] });
    expect(parsed.checkins[0].detail?.nextOther).toBe("Visitar a padaria");
    const legacy = journeyStateSchema.parse({ calling: "c", cycleGoal: "g", stage: "Chamado", xp: 0, streak: 0, areas, missions: [], checkins: [{ date: "2026-09-20", energy: 3, reflection: "texto antigo", nextAction: "a" }] });
    expect(legacy.checkins[0].detail).toBeUndefined();
  });
});
