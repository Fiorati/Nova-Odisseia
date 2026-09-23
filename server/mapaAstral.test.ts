import { describe, expect, it } from "vitest";
import { computeNatalChart, placidusCusps, angles } from "./astroChart";
import { findAspects, houseOf, localToUtc, mapaAstralInputSchema, signOf, formatPosition } from "../shared/mapaAstral";
import { oraculoAvailability } from "../shared/oraculo";

const sp = { latitude: -23.5505, longitude: -46.6333, timezone: "America/Sao_Paulo" };

describe("Mapa Astral - cálculo", () => {
  it("converte hora local para UTC com fuso e horário de verão históricos", () => {
    expect(localToUtc("1990-05-15", "14:30", "America/Sao_Paulo").toISOString()).toBe("1990-05-15T17:30:00.000Z");
    expect(localToUtc("2015-01-10", "12:00", "America/Sao_Paulo").toISOString()).toBe("2015-01-10T14:00:00.000Z"); // horário de verão (-02)
    expect(localToUtc("1985-01-10", "23:10", "America/New_York").toISOString()).toBe("1985-01-11T04:10:00.000Z");
  });
  it("bate com referência conhecida (15/05/1990 14:30 São Paulo)", () => {
    const chart = computeNatalChart("1990-05-15", "14:30", sp);
    const byKey = Object.fromEntries(chart.bodies.map(b => [b.key, b]));
    expect(byKey.Sun.longitude).toBeCloseTo(54.62, 1);
    expect(byKey.Moon.longitude).toBeCloseTo(300.0, 0);
    expect(chart.ascendant.longitude).toBeCloseTo(178.72, 1);
    expect(chart.ascendant.sign).toBe("Virgem");
    expect(byKey.Sun.sign).toBe("Touro");
    expect(byKey.Mercury.retrograde).toBe(true);
    expect(byKey.Venus.retrograde).toBe(false);
    expect(chart.houseSystem).toBe("placidus");
    expect(chart.houses).toHaveLength(12);
  });
  it("casas: cúspide 1 = Ascendente e 10 = Meio do Céu; latitude polar cai para Porfírio", () => {
    const date = new Date("1990-05-15T17:30:00Z");
    const a = angles(date, sp.latitude, sp.longitude);
    const { cusps } = placidusCusps(a.ramc, a.eps, sp.latitude, a.asc, a.mc);
    expect(cusps[0]).toBeCloseTo(a.asc, 6);
    expect(cusps[9]).toBeCloseTo(a.mc, 6);
    expect(placidusCusps(a.ramc, a.eps, 70, a.asc, a.mc).system).toBe("porfirio");
  });
  it("helpers de signo, casa e aspecto", () => {
    expect(signOf(0)).toBe("Áries");
    expect(signOf(359.9)).toBe("Peixes");
    expect(formatPosition(54.62)).toBe("24°37' Touro");
    expect(houseOf(5, [350, 20, 50, 80, 110, 140, 170, 200, 230, 260, 290, 320])).toBe(1);
    expect(findAspects([{ key: "A", longitude: 10 }, { key: "B", longitude: 190 }])[0].type).toBe("oposicao");
  });
  it("valida os dados de entrada e limita a 1 por mês", () => {
    expect(mapaAstralInputSchema.safeParse({ fullName: "Ana", birthDate: "2026-03-27", birthTime: "25:00", city: "X", place: { name: "X", latitude: 0, longitude: 0, timezone: "UTC" } }).success).toBe(false);
    expect(oraculoAvailability(["2026-09-23"], "2026-10-22", "mapa_astral").canGenerate).toBe(false);
  });
});

import { resolveLLMProvider } from "./_core/llm";
import { oraculoModelFor } from "../shared/oraculo";
describe("Provedor de IA do Oráculo", () => {
  it("usa Gemini por padrão quando a chave existe e OpenAI como alternativa", () => {
    expect(resolveLLMProvider({ GEMINI_API_KEY: "g", OPENAI_API_KEY: "o" } as any)).toBe("gemini");
    expect(resolveLLMProvider({ GEMINI_API_KEY: "g", OPENAI_API_KEY: "o", LLM_PROVIDER: "openai" } as any)).toBe("openai");
    expect(resolveLLMProvider({ OPENAI_API_KEY: "o" } as any)).toBe("openai");
    expect(resolveLLMProvider({ LLM_PROVIDER: "openai", GEMINI_API_KEY: "g" } as any)).toBe("gemini");
    expect(oraculoModelFor("gemini")).toBe("gemini-3.8-flash");
    expect(oraculoModelFor("openai")).toBe("gpt-5-mini");
    expect(oraculoModelFor("gemini", "gemini-2.5-flash")).toBe("gemini-2.5-flash");
  });
});

import { buildMapaAstralMessages } from "../shared/mapaAstral";
describe("Mapa Astral - de quem é o mapa", () => {
  const chart = computeNatalChart("2026-03-27", "05:23", { latitude: -23.36417, longitude: -46.74056, timezone: "America/Sao_Paulo" });
  it("mapa próprio leva Chamado e meta para a IA", () => {
    const [, user] = buildMapaAstralMessages({ fullName: "Ana", forSelf: true }, chart, { calling: "Ser consultor", cycleGoal: "Meta X" });
    expect(user.content).toContain("Chamado: Ser consultor");
  });
  it("mapa de outra pessoa não leva a jornada de quem pediu", () => {
    const [system, user] = buildMapaAstralMessages({ fullName: "Bebê", forSelf: false }, chart, null);
    expect(user.content).not.toContain("Chamado");
    expect(user.content).not.toContain("Meta do ciclo");
    expect(system.content).toContain("outra pessoa");
  });
  it("schema assume mapa próprio por padrão", () => {
    const parsed = mapaAstralInputSchema.parse({ fullName: "Ana Lima", birthDate: "2026-03-27", birthTime: "05:23", city: "Caieiras", place: { name: "Caieiras", latitude: -23.36, longitude: -46.74, timezone: "America/Sao_Paulo" } });
    expect(parsed.forSelf).toBe(true);
  });
});
