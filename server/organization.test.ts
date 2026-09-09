import { describe, expect, it } from "vitest";
import { DISTRICT_OPTIONS, isKnownOrganizationOption, matchesOrganizationFilter, POLO_OPTIONS, prepareOrganizationValues, readOrganizationValues, REGIONAL_OPTIONS } from "../shared/organization";

describe("estrutura organizacional", () => {
  it("mantém as regionais, distritos e polos fornecidos", () => {
    expect(REGIONAL_OPTIONS).toEqual(expect.arrayContaining(["Regional Sul", "Regional SP", "Regional Norte"]));
    expect(DISTRICT_OPTIONS).toEqual(expect.arrayContaining(["Distrito SP Norte", "Distrito ABC", "Distrito LP"]));
    expect(POLO_OPTIONS).toEqual(expect.arrayContaining(["Polo Vila Medeiros", "Polo Guarulhos 1 – Leste", "Polo Santana"]));
  });

  it("identifica uma seleção personalizada como opção Outros", () => {
    expect(isKnownOrganizationOption("Regional SP", REGIONAL_OPTIONS)).toBe(true);
    expect(isKnownOrganizationOption("Regional Centro", REGIONAL_OPTIONS)).toBe(false);
  });

  it("filtra a visão master por regional, distrito e polo", () => {
    const profile = { regional: "Regional SP", district: "Distrito SP Norte", polo: "Polo Vila Medeiros" };
    expect(matchesOrganizationFilter(profile, { regional: "Regional SP", district: "Distrito SP Norte", polo: "Polo Vila Medeiros" })).toBe(true);
    expect(matchesOrganizationFilter(profile, { polo: "Polo Santana" })).toBe(false);
    expect(matchesOrganizationFilter(profile, { regional: "all", district: "all", polo: "all" })).toBe(true);
  });

  it("preserva regional, distrito, polo e rota do salvamento ao carregamento", () => {
    const persisted = prepareOrganizationValues({ regional: " Regional SP ", district: "Distrito SP Norte", polo: "Polo Vila Medeiros", route: " Rota 04 " });
    expect(readOrganizationValues(persisted)).toEqual({ regional: "Regional SP", district: "Distrito SP Norte", polo: "Polo Vila Medeiros", route: "Rota 04" });
  });
});
