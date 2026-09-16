import { describe, expect, it } from "vitest";
import { canAccessTeamMember, canEditTeamProfile, type TeamAccessIdentity } from "../shared/teamAccess";

const identity = (overrides: Partial<TeamAccessIdentity> = {}): TeamAccessIdentity => ({
  id: 1,
  role: "user",
  leadershipRole: "none",
  regional: "Regional SP",
  district: "Distrito Norte",
  polo: "Polo Santana",
  ...overrides,
});

describe("autorização da Gestão do Time", () => {
  it("permite ao agente acessar o próprio perfil", () => {
    const agent = identity();
    expect(canAccessTeamMember(agent, agent)).toBe(true);
    expect(canEditTeamProfile(agent, agent)).toBe(true);
  });

  it("nega ao agente acesso e edição do perfil de outro agente", () => {
    const agent = identity();
    const otherAgent = identity({ id: 2, polo: "Polo Lapa" });
    expect(canAccessTeamMember(agent, otherAgent)).toBe(false);
    expect(canEditTeamProfile(agent, otherAgent)).toBe(false);
  });

  it("mantém a hierarquia fora dos campos editáveis do perfil de time", () => {
    const agent = identity();
    expect(canEditTeamProfile(agent, agent)).toBe(true);
    expect(agent.leadershipRole).toBe("none");
  });

  it("permite ao Dono de Polo acessar agente do próprio polo", () => {
    const leader = identity({ id: 10, leadershipRole: "polo" });
    const agent = identity({ id: 11 });
    expect(canAccessTeamMember(leader, agent)).toBe(true);
    expect(canEditTeamProfile(leader, agent)).toBe(true);
  });

  it("nega ao Dono de Polo acesso a agente fora do polo", () => {
    const leader = identity({ id: 10, leadershipRole: "polo" });
    const externalAgent = identity({ id: 11, polo: "Polo Lapa" });
    expect(canAccessTeamMember(leader, externalAgent)).toBe(false);
  });

  it("permite ao admin acessar qualquer agente", () => {
    const admin = identity({ id: 99, role: "admin", leadershipRole: "distrital" });
    const agent = identity({ id: 11, regional: "Regional Norte", district: "Distrito Sul", polo: "Polo Guarulhos" });
    expect(canAccessTeamMember(admin, agent)).toBe(true);
    expect(canEditTeamProfile(admin, agent)).toBe(true);
  });

  it("permite ao interino editar pessoas do próprio polo", () => {
    const interim = identity({ id: 20, teamRoles: ["agente", "interino"] });
    const agent = identity({ id: 21 });
    expect(canAccessTeamMember(interim, agent)).toBe(true);
    expect(canEditTeamProfile(interim, agent)).toBe(true);
  });

  it("permite ao responsável por agendamento ver o polo inteiro", () => {
    const scheduler = identity({ id: 30, teamRoles: ["agente", "agendamento"] });
    const agent = identity({ id: 31 });
    expect(canAccessTeamMember(scheduler, agent)).toBe(true);
    expect(canEditTeamProfile(scheduler, agent)).toBe(true);
  });
});