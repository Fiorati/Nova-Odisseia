import { describe, expect, it } from "vitest";
import {
  getItakaDayOfYear,
  getItakaMessageForDate,
  parseItakaDailyMessages,
  type ItakaDailyMessage,
} from "../shared/itakaDailyMessage";

const buildMessage = (dayOfYear: number): ItakaDailyMessage => ({
  dayOfYear,
  phrase: `Frase ${dayOfYear}`,
  passage: `Paráfrase original ${dayOfYear}`,
  citation: "Canto I",
  theme: "foco",
});

describe("ÍTAKA — mensagem diária", () => {
  it("usa uma chave de 1 a 365 e repete a última mensagem somente em 29 de fevereiro", () => {
    expect(getItakaDayOfYear(new Date(2026, 0, 1, 12))).toBe(1);
    expect(getItakaDayOfYear(new Date(2026, 11, 31, 12))).toBe(365);
    expect(getItakaDayOfYear(new Date(2024, 1, 29, 12))).toBe(365);
    expect(getItakaDayOfYear(new Date(2024, 2, 1, 12))).toBe(60);
    expect(getItakaDayOfYear(new Date(2024, 11, 31, 12))).toBe(365);
  });

  it("exige uma base completa e seleciona a mensagem correspondente ao dia", () => {
    const rows = Array.from({ length: 365 }, (_, index) => buildMessage(index + 1)).map(message => ({
      "Dia do Ano (1-365)": message.dayOfYear,
      "Frase Motivacional (ÍTAKA)": message.phrase,
      "Passagem da Odisseia (resumo)": message.passage,
      Citação: message.citation,
      Tema: message.theme,
    }));
    const messages = parseItakaDailyMessages(rows);

    expect(messages).toHaveLength(365);
    expect(getItakaMessageForDate(messages, new Date(2026, 0, 2, 12))?.phrase).toBe("Frase 2");
    expect(() => parseItakaDailyMessages(rows.slice(0, 364))).toThrow(/365/i);
    rows[364]["Frase Motivacional (ÍTAKA)"] = "Frase 1";
    expect(() => parseItakaDailyMessages(rows)).toThrow(/duplicadas/i);
  });
});
