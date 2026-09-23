import { describe, expect, it } from "vitest";
import { buildDiscMessages, DISC_BLOCKS, DISC_FACTORS, discInputSchema, scoreDisc, type DiscFactor } from "../shared/disc";
import { oraculoAvailability } from "../shared/oraculo";

const answersFor = (most: DiscFactor, least: DiscFactor) => DISC_BLOCKS.map(block => ({ most: block.findIndex(o => o.factor === most), least: block.findIndex(o => o.factor === least) }));

describe("DISC - pontuação", () => {
  it("cada bloco tem exatamente um fator de cada, sem palavra repetida", () => {
    expect(DISC_BLOCKS).toHaveLength(12);
    for (const block of DISC_BLOCKS) expect(block.map(o => o.factor).sort()).toEqual([...DISC_FACTORS].sort());
    const words = DISC_BLOCKS.flat().map(o => o.word);
    expect(new Set(words).size).toBe(words.length);
  });
  it("perfil extremo: D sempre mais, C sempre menos", () => {
    const p = scoreDisc(answersFor("D", "C"));
    expect(p.raw).toEqual({ D: 12, I: 0, S: 0, C: -12 });
    expect(p.percent).toEqual({ D: 100, I: 50, S: 50, C: 0 });
    expect(p.primary).toBe("D");
  });
  it("secundário e empate seguem a ordem D, I, S, C", () => {
    const answers = [...answersFor("S", "D").slice(0, 8), ...answersFor("I", "D").slice(8)];
    const p = scoreDisc(answers);
    expect(p.primary).toBe("S");
    expect(p.secondary).toBe("I");
    const tie = scoreDisc(DISC_BLOCKS.map((_, i) => answersFor(i % 2 ? "S" : "I", "D")[i]));
    expect(tie.raw).toEqual({ D: -12, I: 6, S: 6, C: 0 });
    expect([tie.primary, tie.secondary]).toEqual(["I", "S"]);
  });
  it("valida entrada e limite semanal", () => {
    expect(discInputSchema.safeParse({ answers: answersFor("D", "D") }).success).toBe(false);
    expect(discInputSchema.safeParse({ answers: answersFor("D", "C").slice(0, 11) }).success).toBe(false);
    expect(discInputSchema.safeParse({ answers: answersFor("I", "C") }).success).toBe(true);
    expect(oraculoAvailability(["2026-09-23"], "2026-09-29", "disc")).toEqual({ canGenerate: false, nextDateKey: "2026-09-30" });
  });
  it("prompt usa só os percentuais calculados e a jornada", () => {
    const msgs = buildDiscMessages(scoreDisc(answersFor("D", "C")), { calling: "CHAMADO-X" });
    expect(msgs[1].content).toContain("Dominância (D): 100%");
    expect(msgs[1].content).toContain("CHAMADO-X");
    expect(msgs[0].content).toContain("não é diagnóstico".replace("não é", "Não é"));
  });
});
