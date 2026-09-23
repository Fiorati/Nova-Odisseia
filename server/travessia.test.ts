import { describe, expect, it } from "vitest";
import { activeProva, activeProvaForArea, completeProva, createProva, forgeDone, journeyDefaults, lastVictory, toggleForgeMove } from "../shared/travessia";
import { journeyStateSchema } from "./journeyState";

const base = { ...journeyDefaults, missions: journeyDefaults.missions.map(item => ({ ...item, done: true })) };

describe("travessia", () => {
  it("cria a prova como missão ativa", () => {
    const state = createProva(base, { title: "Fazer 5 PaP antes das 10h", area: "profissional", today: "2026-09-23", id: "p1" });
    expect(activeProva(state)?.id).toBe("p1");
    expect(journeyStateSchema.safeParse(state).success).toBe(true);
  });
  it("concluir a prova soma XP, prova e ritmo na hora", () => {
    const created = createProva(base, { title: "Ligar para 3 clientes", area: "profissional", today: "2026-09-23", id: "p1" });
    const { state, reward } = completeProva(created, { id: "p1", today: "2026-09-23", reflection: { fact: "Liguei para 3", meaning: "Rendo cedo", next: "Amanhã às 9h" } });
    expect(reward).toMatchObject({ xp: 50, done: 4, total: 4, streak: 1, gainedStreak: true });
    expect(state.xp).toBe(50);
    expect(lastVictory(state)?.reflection?.next).toBe("Amanhã às 9h");
    expect(journeyStateSchema.parse(state).missions[0].reflection?.fact).toBe("Liguei para 3");
  });
  it("não conta o ritmo duas vezes no mesmo dia", () => {
    const withCheckin = { ...base, streak: 1, checkins: [{ date: "2026-09-23", energy: 4, reflection: "r", nextAction: "a" }] };
    const created = createProva(withCheckin, { title: "x", area: "pessoal", today: "2026-09-23", id: "p1" });
    expect(completeProva(created, { id: "p1", today: "2026-09-23", reflection: { fact: "f", meaning: "", next: "" } }).state.streak).toBe(1);
  });
  it("forja marca e desmarca movimentos do dia", () => {
    const one = toggleForgeMove(base, { area: "pessoal", index: 0, today: "2026-09-23" });
    expect(forgeDone(one, "pessoal", "2026-09-23")).toEqual([0]);
    expect(one.xp).toBe(10);
    expect(forgeDone(one, "pessoal", "2026-09-24")).toEqual([]);
    const undone = toggleForgeMove(one, { area: "pessoal", index: 0, today: "2026-09-23" });
    expect(undone.xp).toBe(0);
    expect(journeyStateSchema.safeParse(one).success).toBe(true);
  });
});

describe("provas por área da Vida 360", () => {
  const base = { ...journeyDefaults, missions: [] };
  it("aceita uma prova em cada uma das 4 áreas ao mesmo tempo", () => {
    let state = base;
    for (const area of ["profissional", "pessoal", "emocional", "comunidade"] as const) state = createProva(state, { title: `Prova ${area}`, area, today: "2026-09-23", id: `p-${area}` });
    expect(activeProvaForArea(state, "profissional")?.id).toBe("p-profissional");
    expect(activeProvaForArea(state, "comunidade")?.id).toBe("p-comunidade");
    expect(state.missions.filter(item => item.kind === "prova" && !item.done)).toHaveLength(4);
  });
  it("não deixa abrir duas provas na mesma área até concluir a atual", () => {
    const one = createProva(base, { title: "Ligar para 3 clientes parados da carteira", area: "profissional", today: "2026-09-23", id: "a" });
    expect(() => createProva(one, { title: "Outra", area: "profissional", today: "2026-09-23", id: "b" })).toThrow(/já tem uma prova/);
    const done = completeProva(one, { id: "a", today: "2026-09-23", reflection: { fact: "Liguei", meaning: "", next: "" } }).state;
    expect(createProva(done, { title: "Outra", area: "profissional", today: "2026-09-23", id: "b" }).missions[0].id).toBe("b");
  });
  it("prova criada vale 50 XP e tem prioridade sobre missão antiga da área", () => {
    const withLegacy = { ...journeyDefaults };
    expect(activeProvaForArea(withLegacy, "pessoal")?.id).toBe("m1");
    const state = createProva(withLegacy, { title: "Treinar 20 minutos", area: "pessoal", today: "2026-09-23", id: "p" });
    expect(activeProvaForArea(state, "pessoal")?.id).toBe("p");
    expect(activeProvaForArea(state, "pessoal")?.xp).toBe(50);
  });
});
