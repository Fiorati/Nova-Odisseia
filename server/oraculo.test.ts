import { describe, expect, it } from "vitest";
import {
  ORACULO_MODEL, answeredCount, buildOraculoMessages, oraculoAvailability, addDaysToKey, formatDateKeyBR, oraculoAnswersSchema,
  oraculoReportJsonSchema, parseOraculoReport, readingForAudience, togglePlanStep,
} from "../shared/oraculo";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const answers = oraculoAnswersSchema.parse({ verdade: "Preciso ligar antes das 10h", fato: "3 visitas, 1 decisor", escolha: "Perguntar quem decide" });
const report = { leitura: "Você já sabe o caminho.", padroes: ["a", "b", "c"], plano: [{ passo: "Ligar às 9h", quando: "Amanhã" }, { passo: "x", quando: "y" }, { passo: "z", quando: "w" }], pergunta: "O que mudou?" };

describe("Oráculo IA", () => {
  it("usa o modelo mais barato combinado", () => expect(ORACULO_MODEL).toBe("gpt-5-mini"));
  it("conta só respostas preenchidas", () => expect(answeredCount(answers)).toBe(3));
  it("leitura do momento: 1 por semana, com data de liberação", () => {
    expect(oraculoAvailability([], "2026-09-23")).toEqual({ canGenerate: true, nextDateKey: null });
    expect(oraculoAvailability(["2026-09-23"], "2026-09-23")).toEqual({ canGenerate: false, nextDateKey: "2026-09-30" });
    expect(oraculoAvailability(["2026-09-23"], "2026-09-29").canGenerate).toBe(false);
    expect(oraculoAvailability(["2026-09-23"], "2026-09-30").canGenerate).toBe(true);
    expect(oraculoAvailability(["2026-09-10", "2026-09-23"], "2026-09-25").nextDateKey).toBe("2026-09-30");
  });
  it("mapa astral e numerológico: 1 por mês (30 dias); outros tipos: 1 por semana", () => {
    expect(oraculoAvailability(["2026-09-23"], "2026-10-22", "mapa_astral")).toEqual({ canGenerate: false, nextDateKey: "2026-10-23" });
    expect(oraculoAvailability(["2026-09-23"], "2026-10-23", "mapa_numerologico").canGenerate).toBe(true);
    expect(oraculoAvailability(["2026-09-23"], "2026-09-30", "disc").canGenerate).toBe(true);
  });
  it("datas atravessam mês e ano e aparecem em pt-BR", () => {
    expect(addDaysToKey("2026-12-28", 7)).toBe("2027-01-04");
    expect(formatDateKeyBR("2026-09-30")).toBe("30/09/2026");
  });
  it("monta o prompt com Chamado, meta, PDI e respostas, sem prometer previsão", () => {
    const [system, user] = buildOraculoMessages({ calling: "Ser constante", cycleGoal: "30 dias", pdiTitle: "PDI Kaike", weakestArea: { label: "Comunidade", score: 4, focus: "f" } }, answers);
    expect(system.content).toMatch(/não faz diagnóstico/);
    expect(user.content).toContain("Chamado: Ser constante");
    expect(user.content).toContain("PDI do mentor: PDI Kaike");
    expect(user.content).toContain("Preciso ligar antes das 10h");
    expect(user.content).toContain("(sem resposta)");
  });
  it("valida a resposta da IA e rejeita formato errado", () => {
    expect(parseOraculoReport(JSON.stringify(report)).plano).toHaveLength(3);
    expect(parseOraculoReport("```json\n" + JSON.stringify(report) + "\n```").pergunta).toBe("O que mudou?");
    expect(() => parseOraculoReport("{\"leitura\":\"\"}")).toThrow();
  });
  it("schema estrito pede exatamente 3 padrões e 3 passos", () => {
    expect(oraculoReportJsonSchema.schema.properties.padroes.minItems).toBe(3);
    expect(oraculoReportJsonSchema.schema.properties.plano.maxItems).toBe(3);
  });
  it("mentor não vê as respostas escritas", () => {
    const reading = { id: 1, dateKey: "2026-09-23", report, planDone: [], answers, createdAt: "" };
    expect(readingForAudience(reading, true).answers).toBeUndefined();
    expect(readingForAudience(reading, false).answers).toEqual(answers);
  });
  it("marca e desmarca passos do plano", () => {
    expect(togglePlanStep([], 1)).toEqual([1]);
    expect(togglePlanStep([1], 1)).toEqual([]);
    expect(togglePlanStep([0], 7)).toEqual([0]);
  });
  it("mentor em 'ver como usuário' não consegue gerar nem salvar", async () => {
    const base = { openId: "x", name: "N", loginMethod: "email", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
    const ctx = { user: { ...base, id: 4159, role: "user", email: "k@x" }, viewer: { ...base, id: 1, role: "admin", email: "a@x" }, req: { protocol: "https", headers: {} }, res: {} } as unknown as TrpcContext;
    await expect(appRouter.createCaller(ctx).oraculo.generate(answers)).rejects.toThrow(/somente leitura/);
    await expect(appRouter.createCaller(ctx).oraculo.saveDraft(answers)).rejects.toThrow(/somente leitura/);
  });
});
