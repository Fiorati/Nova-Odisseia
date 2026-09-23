import { describe, expect, it } from "vitest";
import { buildMapaNumerologicoMessages, computeNumerology, letterValue, mapaNumerologicoInputSchema, normalizeName, reduceNumber } from "../shared/mapaNumerologico";
import { oraculoAvailability } from "../shared/oraculo";

describe("Mapa Numerológico - cálculo pitagórico", () => {
  it("tabela A=1..I=9, J=1..R=9, S=1..Z=9", () => {
    expect(["A", "I", "J", "R", "S", "Z"].map(letterValue)).toEqual([1, 9, 1, 9, 1, 8]);
  });
  it("remove acentos e cedilha", () => {
    expect(normalizeName("Raví Peaguda-Fiorati Ção")).toBe("RAVIPEAGUDAFIORATICAO");
  });
  it("reduz preservando números mestres", () => {
    expect(reduceNumber(38)).toBe(11);
    expect(reduceNumber(29)).toBe(11);
    expect(reduceNumber(22)).toBe(22);
    expect(reduceNumber(1990)).toBe(1);
    expect(reduceNumber(29, false)).toBe(2);
  });
  it("bate com exemplo conferido à mão", () => {
    // JOHN SMITH: J1 O6 H8 N5 S1 M4 I9 T2 H8 = 44 -> 8; vogais O6 I9 = 15 -> 6; consoantes 29 -> 11
    const n = computeNumerology("John Smith", "1990-05-15", 2026);
    expect(n.expressao).toBe(8);
    expect(n.motivacao).toBe(6);
    expect(n.impressao).toBe(11);
    // 15 -> 6, 05 -> 5, 1990 -> 1 => 12 -> 3
    expect(n.caminho).toBe(3);
    expect(n.aniversario).toBe(6);
    // ano pessoal 2026: 6 + 5 + 1 = 12 -> 3
    expect(n.anoPessoal).toBe(3);
  });
  it("valida entrada e limite mensal", () => {
    expect(mapaNumerologicoInputSchema.safeParse({ fullName: "Ra", birthDate: "2026-03-27" }).success).toBe(false);
    expect(mapaNumerologicoInputSchema.parse({ fullName: "Raví Fiorati", birthDate: "2026-03-27" }).forSelf).toBe(true);
    expect(oraculoAvailability(["2026-09-23"], "2026-10-22", "mapa_numerologico")).toEqual({ canGenerate: false, nextDateKey: "2026-10-23" });
  });
  it("mapa de outra pessoa não envia a jornada para a IA", () => {
    const n = computeNumerology("John Smith", "1990-05-15", 2026);
    const own = buildMapaNumerologicoMessages({ fullName: "John Smith", forSelf: true }, n, { calling: "CHAMADO-X", cycleGoal: "META-Y" });
    const other = buildMapaNumerologicoMessages({ fullName: "John Smith", forSelf: false }, n, null);
    expect(own[1].content).toContain("CHAMADO-X");
    expect(other[1].content).not.toContain("CHAMADO-X");
    expect(other[1].content).toContain("Caminho de Vida: 3");
  });
});
