import { describe, expect, it } from "vitest";
import { buildSpartacusPdi, SPARTACUS_SKILLS, selectedSpartacusSkills } from "./spartacus";

const hardSkillIds = ["closing-techniques", "pipeline-crm", "conversion-analytics"];
const softSkillIds = ["active-listening", "commercial-empathy", "clear-communication"];

describe("SPARTACUS", () => {
  it("mantém o catálogo completo com 20 hard skills e 20 soft skills", () => {
    expect(SPARTACUS_SKILLS.filter(skill => skill.category === "hard")).toHaveLength(20);
    expect(SPARTACUS_SKILLS.filter(skill => skill.category === "soft")).toHaveLength(20);
    expect(SPARTACUS_SKILLS.every(skill => skill.reference.url.startsWith("https://"))).toBe(true);
  });

  it("exige três competências distintas em cada grupo", () => {
    expect(() => selectedSpartacusSkills(["closing-techniques", "pipeline-crm"], "hard")).toThrow(/três/i);
    expect(() => selectedSpartacusSkills(["closing-techniques", "closing-techniques", "pipeline-crm"], "hard")).toThrow(/três/i);
  });

  it("gera quatro semanas, referências e um prompt conversacional com limites de privacidade", () => {
    const plan = buildSpartacusPdi({ hardSkillIds, softSkillIds, developmentGoal: "Melhorar a descoberta de necessidades.", studyMinutes: 25, learnerRole: "agente" });
    expect(plan.weeklyMissions).toHaveLength(4);
    expect(plan.references.length).toBeGreaterThanOrEqual(2);
    expect(plan.conversationPrompt).toContain("Não solicite senha, dados pessoais, informações sigilosas de clientes");
    expect(plan.conversationPrompt).toContain("Não responda pela pessoa antes que ela tente");
    expect(plan.audioScript).toContain("25 minutos");
  });
});
