import { z } from "zod";

/**
 * Modelo do Oráculo. Padrão: Gemini Flash (plano gratuito da API do Google); gpt-5-mini se o provedor for OpenAI.
 * ORACULO_MODEL no ambiente sobrescreve.
 */
export const ORACULO_GEMINI_MODEL = "gemini-3.8-flash";
export const ORACULO_OPENAI_MODEL = "gpt-5-mini";
export const oraculoModelFor = (provider: "gemini" | "openai", override?: string) => override?.trim() || (provider === "gemini" ? ORACULO_GEMINI_MODEL : ORACULO_OPENAI_MODEL);
/**
 * Limites combinados com o Gabriel (23/09): Oráculo aberto a todos.
 * Mapa Astral e Mapa Numerológico: 1 por mês (30 dias). Todas as outras gerações: 1 por semana (7 dias).
 * A janela conta a partir da última geração do mesmo tipo.
 */
export type OraculoKind = "leitura" | "mapa_astral" | "mapa_numerologico" | "disc";
export const ORACULO_LIMIT_DAYS: Record<string, number> = { mapa_astral: 30, mapa_numerologico: 30 };
export const ORACULO_DEFAULT_LIMIT_DAYS = 7;
export const oraculoLimitDays = (kind: string) => ORACULO_LIMIT_DAYS[kind] ?? ORACULO_DEFAULT_LIMIT_DAYS;
export const oraculoLimitLabel = (kind: string) => (oraculoLimitDays(kind) >= 30 ? "1 por mês" : "1 por semana");

export const oraculoPrompts = [
  { key: "verdade", group: "pergunta", label: "Que verdade você já percebeu, mas ainda não transformou em escolha?" },
  { key: "manter", group: "pergunta", label: "O que merece continuar igual na sua rota?" },
  { key: "ruido", group: "pergunta", label: "Qual ruído precisa baixar para você ouvir o essencial?" },
  { key: "fato", group: "ritual", label: "Fato: o que aconteceu sem interpretação?" },
  { key: "sentido", group: "ritual", label: "Sentido: o que isso desperta ou revela?" },
  { key: "escolha", group: "ritual", label: "Escolha: qual ação pequena respeita o que você percebeu?" },
  { key: "tensao", group: "tensao", label: "Tensão a observar: o que depende de você agora e o que precisa de tempo, ajuda ou limite?" },
] as const;

export type OraculoKey = (typeof oraculoPrompts)[number]["key"];

const answer = z.string().trim().max(2000).default("");
export const oraculoAnswersSchema = z.object({
  verdade: answer, manter: answer, ruido: answer,
  fato: answer, sentido: answer, escolha: answer,
  tensao: answer,
});
export type OraculoAnswers = z.infer<typeof oraculoAnswersSchema>;

export const oraculoReportSchema = z.object({
  leitura: z.string().min(1).max(1500),
  padroes: z.array(z.string().min(1).max(400)).min(1).max(3),
  plano: z.array(z.object({ passo: z.string().min(1).max(300), quando: z.string().max(120) })).min(1).max(3),
  pergunta: z.string().min(1).max(400),
});
export type OraculoReport = z.infer<typeof oraculoReportSchema>;

export const oraculoReportJsonSchema = {
  name: "leitura_do_oraculo",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["leitura", "padroes", "plano", "pergunta"],
    properties: {
      leitura: { type: "string", description: "Leitura do momento: 3 a 5 frases, segunda pessoa, tom sereno e direto." },
      padroes: { type: "array", minItems: 3, maxItems: 3, items: { type: "string" }, description: "3 padrões observados nas respostas, cada um citando o que a pessoa escreveu." },
      plano: {
        type: "array", minItems: 3, maxItems: 3,
        items: { type: "object", additionalProperties: false, required: ["passo", "quando"], properties: { passo: { type: "string" }, quando: { type: "string" } } },
        description: "Plano de 7 dias com 3 passos pequenos, concretos e verificáveis.",
      },
      pergunta: { type: "string", description: "Uma pergunta para o próximo check-in." },
    },
  },
} as const;

export function answeredCount(answers: Partial<OraculoAnswers>): number {
  return oraculoPrompts.filter(item => (answers[item.key] ?? "").trim().length > 0).length;
}

/** Precisa de pelo menos 3 respostas para a leitura não virar adivinhação. */
export const ORACULO_MIN_ANSWERS = 3;

export type OraculoContext = {
  name?: string | null;
  calling?: string;
  cycleGoal?: string;
  pdiTitle?: string;
  pdiFocus?: string[];
  weakestArea?: { label: string; score: number; focus: string } | null;
  recentEvidence?: string[];
};

export function buildOraculoMessages(context: OraculoContext, answers: OraculoAnswers) {
  const system = [
    "Você é o Oráculo de Delfos da Nova Odisseia, uma plataforma de desenvolvimento pessoal e profissional com linguagem da jornada do herói grega.",
    "Leia SOMENTE o que a pessoa declarou. Não prevê o futuro, não faz diagnóstico psicológico ou médico, não promete resultado e não inventa fatos.",
    "Conecte as respostas ao Chamado e à meta do ciclo. Seja concreto, caloroso e breve. Português do Brasil, segunda pessoa (você).",
    "O plano deve ter 3 passos pequenos, possíveis mesmo num dia difícil, com quando fazer dentro dos próximos 7 dias.",
    "Se algo indicar sofrimento intenso ou risco, sugira com cuidado procurar apoio profissional ou o CVV (188).",
  ].join(" ");
  const lines: string[] = [];
  if (context.name) lines.push(`Nome: ${context.name}`);
  lines.push(`Chamado: ${context.calling?.trim() || "(não declarado)"}`);
  lines.push(`Meta do ciclo: ${context.cycleGoal?.trim() || "(não declarada)"}`);
  if (context.pdiTitle) lines.push(`PDI do mentor: ${context.pdiTitle}${context.pdiFocus?.length ? ` - foco: ${context.pdiFocus.join("; ")}` : ""}`);
  if (context.weakestArea) lines.push(`Área com menor nota na Vida 360: ${context.weakestArea.label} (${context.weakestArea.score}/10 - ${context.weakestArea.focus})`);
  if (context.recentEvidence?.length) lines.push(`Evidências recentes: ${context.recentEvidence.join(" | ")}`);
  lines.push("", "Respostas escritas:");
  for (const item of oraculoPrompts) {
    const value = answers[item.key]?.trim();
    lines.push(`- ${item.label}\n  ${value || "(sem resposta)"}`);
  }
  return [
    { role: "system" as const, content: system },
    { role: "user" as const, content: lines.join("\n") },
  ];
}

export function parseOraculoReport(raw: unknown): OraculoReport {
  const text = typeof raw === "string" ? raw : Array.isArray(raw) ? raw.map(part => (part && typeof part === "object" && "text" in part ? String((part as { text: unknown }).text) : "")).join("") : "";
  const json = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  return oraculoReportSchema.parse(json);
}

export type OraculoReading = {
  id: number;
  dateKey: string;
  report: OraculoReport;
  planDone: number[];
  answers?: OraculoAnswers;
  createdAt: string;
};

/** Respostas escritas são privadas: o mentor (admin em "ver como usuário") vê só o plano. */
export function readingForAudience(reading: OraculoReading, viewingAsMentor: boolean): OraculoReading {
  if (!viewingAsMentor) return reading;
  const { answers: _hidden, ...rest } = reading;
  return rest;
}

export function addDaysToKey(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Pode gerar agora? Se não, devolve a data (AAAA-MM-DD) em que a próxima geração libera. */
export function oraculoAvailability(generatedDateKeys: string[], todayKey: string, kind: string = "leitura"): { canGenerate: boolean; nextDateKey: string | null } {
  const last = [...generatedDateKeys].sort().pop();
  if (!last) return { canGenerate: true, nextDateKey: null };
  const next = addDaysToKey(last, oraculoLimitDays(kind));
  return todayKey >= next ? { canGenerate: true, nextDateKey: null } : { canGenerate: false, nextDateKey: next };
}

export function formatDateKeyBR(dateKey: string): string {
  const [y, m, d] = dateKey.split("-");
  return `${d}/${m}/${y}`;
}

export function togglePlanStep(done: number[], index: number): number[] {
  if (!Number.isInteger(index) || index < 0 || index > 2) return done;
  return done.includes(index) ? done.filter(item => item !== index) : [...done, index].sort();
}
