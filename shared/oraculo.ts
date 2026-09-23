import { z } from "zod";

/** Modelo definido com o Gabriel: o mais barato (centavos por relatório). */
export const ORACULO_MODEL = "gpt-5-mini";
export const ORACULO_DAILY_LIMIT = 1;

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

export function canGenerateToday(generatedDateKeys: string[], todayKey: string, limit = ORACULO_DAILY_LIMIT): boolean {
  return generatedDateKeys.filter(key => key === todayKey).length < limit;
}

export function togglePlanStep(done: number[], index: number): number[] {
  if (!Number.isInteger(index) || index < 0 || index > 2) return done;
  return done.includes(index) ? done.filter(item => item !== index) : [...done, index].sort();
}
