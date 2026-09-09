export const ITAKA_MESSAGES_ASSET_URL = "/storage/banco_mensagens_itaka_cb4b8909.xlsx";

export const ITAKA_MESSAGE_COLUMNS = {
  day: "Dia do Ano (1-365)",
  phrase: "Frase Motivacional (ÍTAKA)",
  passage: "Passagem da Odisseia (resumo)",
  citation: "Citação",
  theme: "Tema",
} as const;

export type ItakaDailyMessage = {
  dayOfYear: number;
  phrase: string;
  passage: string;
  citation: string;
  theme: string;
};

type SpreadsheetRow = Record<string, unknown>;

const isLeapYear = (year: number) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

/**
 * Converts the user's local calendar date into one of the 365 available keys.
 * On 29 February, key 365 is deliberately repeated as instructed by the source workbook.
 */
export function getItakaDayOfYear(date: Date): number {
  const localMidday = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  const yearStart = new Date(date.getFullYear(), 0, 1, 12);
  const calendarDay = Math.floor((localMidday.getTime() - yearStart.getTime()) / 86_400_000) + 1;

  if (!isLeapYear(date.getFullYear())) return calendarDay;
  if (date.getMonth() === 1 && date.getDate() === 29) return 365;
  return calendarDay > 60 ? calendarDay - 1 : calendarDay;
}

export function formatItakaDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function parseItakaDailyMessages(rows: SpreadsheetRow[]): ItakaDailyMessage[] {
  const messages = new Map<number, ItakaDailyMessage>();
  const phrases = new Set<string>();

  for (const row of rows) {
    const dayOfYear = Number(row[ITAKA_MESSAGE_COLUMNS.day]);
    const phrase = String(row[ITAKA_MESSAGE_COLUMNS.phrase] ?? "").trim();
    const passage = String(row[ITAKA_MESSAGE_COLUMNS.passage] ?? "").trim();
    const citation = String(row[ITAKA_MESSAGE_COLUMNS.citation] ?? "").trim();
    const theme = String(row[ITAKA_MESSAGE_COLUMNS.theme] ?? "").trim();

    if (!Number.isInteger(dayOfYear) || dayOfYear < 1 || dayOfYear > 365) continue;
    if (!phrase || !passage || !citation || !theme) continue;
    if (messages.has(dayOfYear)) throw new Error("A base ÍTAKA contém dias duplicados.");
    if (phrases.has(phrase)) throw new Error("A base ÍTAKA contém frases motivacionais duplicadas.");

    messages.set(dayOfYear, { dayOfYear, phrase, passage, citation, theme });
    phrases.add(phrase);
  }

  if (messages.size !== 365) {
    throw new Error("A base ÍTAKA precisa conter uma mensagem válida para cada dia de 1 a 365.");
  }

  return Array.from(messages.values()).sort((first, second) => first.dayOfYear - second.dayOfYear);
}

export function getItakaMessageForDate(messages: ItakaDailyMessage[], date: Date): ItakaDailyMessage | null {
  const dayOfYear = getItakaDayOfYear(date);
  return messages.find(message => message.dayOfYear === dayOfYear) ?? null;
}
