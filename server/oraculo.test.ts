import { describe, expect, it } from "vitest";
import {
  ORACULO_MODEL, answeredCount, buildOraculoMessages, canGenerateToday, oraculoAnswersSchema,
  oraculoReportJsonSchema, parseOraculoReport, readingForAudience, togglePlanStep,
} from "../shared/oraculo";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const answers = oraculoAnswersSchema.parse({ verdade: "Preciso ligar antes das 10h", fato: "3 visitas, 1 decisor", escolha: "Perguntar quem decide" });
const report = { leitura: "Você já sabe o caminho.", padroes: ["a", "b", "c"], plano: [{ passo: "Ligar às 9h", quando: "Amanhã" }, { passo: "x", quando: "y" }, { passo: "z", quando: "w" }], pergunta: "O que mudou?" };

describe("Oráculo IA", () => {
  it("usa o modelo mais barato combinado", () => expect(ORACULO_MODEL).toBe("gpt-5-mini"));
  it("conta só respostas preenchidas", () => expect(answeredCount(answers)).toBe(3));
  it("limita a 1 leitura por dia", () => {
    expect(canGenerateToday([], "2026-09-23")).toBe(true);
    expect(canGenerateToday(["2026-09-22"], "2026-09-23")).toBe(true);
    expect(canGenerateToday(["2026-09-23"], "2026-09-23")).toBe(false);
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
