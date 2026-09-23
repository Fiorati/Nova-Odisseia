import { z } from "zod";

/**
 * DISC do Oráculo: questionário próprio de escolha forçada, inspirado no modelo DISC (Marston).
 * Não é o instrumento comercial certificado. A pontuação é feita no código; a IA só interpreta.
 */
export const DISC_FACTORS = ["D", "I", "S", "C"] as const;
export type DiscFactor = (typeof DISC_FACTORS)[number];
export const DISC_LABELS: Record<DiscFactor, { name: string; short: string }> = {
  D: { name: "Dominância", short: "foco em resultado, decisão e desafio" },
  I: { name: "Influência", short: "foco em pessoas, entusiasmo e persuasão" },
  S: { name: "Estabilidade", short: "foco em constância, cooperação e escuta" },
  C: { name: "Conformidade", short: "foco em qualidade, precisão e método" },
};

/** 12 blocos. Cada bloco tem uma palavra de cada fator, em ordem misturada para não revelar o padrão. */
export const DISC_BLOCKS: { word: string; factor: DiscFactor }[][] = [
  [{ word: "Decidido", factor: "D" }, { word: "Animado", factor: "I" }, { word: "Paciente", factor: "S" }, { word: "Cuidadoso", factor: "C" }],
  [{ word: "Preciso", factor: "C" }, { word: "Direto", factor: "D" }, { word: "Comunicativo", factor: "I" }, { word: "Calmo", factor: "S" }],
  [{ word: "Leal", factor: "S" }, { word: "Organizado", factor: "C" }, { word: "Competitivo", factor: "D" }, { word: "Otimista", factor: "I" }],
  [{ word: "Persuasivo", factor: "I" }, { word: "Colaborativo", factor: "S" }, { word: "Analítico", factor: "C" }, { word: "Ousado", factor: "D" }],
  [{ word: "Determinado", factor: "D" }, { word: "Tranquilo", factor: "S" }, { word: "Entusiasmado", factor: "I" }, { word: "Detalhista", factor: "C" }],
  [{ word: "Criterioso", factor: "C" }, { word: "Sociável", factor: "I" }, { word: "Firme", factor: "D" }, { word: "Constante", factor: "S" }],
  [{ word: "Bom ouvinte", factor: "S" }, { word: "Rápido para agir", factor: "D" }, { word: "Metódico", factor: "C" }, { word: "Expressivo", factor: "I" }],
  [{ word: "Inspirador", factor: "I" }, { word: "Cauteloso", factor: "C" }, { word: "Prestativo", factor: "S" }, { word: "Assume riscos", factor: "D" }],
  [{ word: "Focado em resultado", factor: "D" }, { word: "Perfeccionista", factor: "C" }, { word: "Espontâneo", factor: "I" }, { word: "Previsível", factor: "S" }],
  [{ word: "Lógico", factor: "C" }, { word: "Diplomático", factor: "S" }, { word: "Independente", factor: "D" }, { word: "Carismático", factor: "I" }],
  [{ word: "Gentil", factor: "S" }, { word: "Convincente", factor: "I" }, { word: "Reservado", factor: "C" }, { word: "Exigente", factor: "D" }],
  [{ word: "Divertido", factor: "I" }, { word: "Assertivo", factor: "D" }, { word: "Estável", factor: "S" }, { word: "Disciplinado", factor: "C" }],
];

const choice = z.object({ most: z.number().int().min(0).max(3), least: z.number().int().min(0).max(3) }).refine(c => c.most !== c.least, "Escolha palavras diferentes para 'mais' e 'menos'.");
export const discInputSchema = z.object({ answers: z.array(choice).length(DISC_BLOCKS.length) });
export type DiscInput = z.infer<typeof discInputSchema>;

export type DiscProfile = {
  raw: Record<DiscFactor, number>; // -12 a +12
  percent: Record<DiscFactor, number>; // 0 a 100
  primary: DiscFactor;
  secondary: DiscFactor;
};

/** Mais parecido = +1, menos parecido = -1. Percentual = (bruto + 12) / 24. */
export function scoreDisc(answers: DiscInput["answers"]): DiscProfile {
  if (answers.length !== DISC_BLOCKS.length) throw new Error("Responda todos os blocos.");
  const raw: Record<DiscFactor, number> = { D: 0, I: 0, S: 0, C: 0 };
  answers.forEach((a, i) => {
    if (a.most === a.least) throw new Error("Escolhas iguais no mesmo bloco.");
    raw[DISC_BLOCKS[i][a.most].factor] += 1;
    raw[DISC_BLOCKS[i][a.least].factor] -= 1;
  });
  const max = DISC_BLOCKS.length;
  const percent = Object.fromEntries(DISC_FACTORS.map(f => [f, Math.round(((raw[f] + max) / (2 * max)) * 100)])) as Record<DiscFactor, number>;
  const ranked = [...DISC_FACTORS].sort((a, b) => raw[b] - raw[a] || DISC_FACTORS.indexOf(a) - DISC_FACTORS.indexOf(b));
  return { raw, percent, primary: ranked[0], secondary: ranked[1] };
}

export const discReportSchema = z.object({
  essencia: z.string().min(1).max(1200),
  forcas: z.array(z.string().min(1).max(500)).length(3),
  atencao: z.array(z.string().min(1).max(500)).length(2),
  comunicacao: z.string().min(1).max(800),
  jornada: z.string().min(1).max(1200),
  pergunta: z.string().min(1).max(400),
});
export type DiscReport = z.infer<typeof discReportSchema>;

export const discReportJsonSchema = {
  name: "disc_estilo",
  strict: true,
  schema: {
    type: "object", additionalProperties: false,
    required: ["essencia", "forcas", "atencao", "comunicacao", "jornada", "pergunta"],
    properties: {
      essencia: { type: "string", description: "3 a 4 frases sobre o estilo predominante e o secundário, em segunda pessoa, citando os percentuais." },
      forcas: { type: "array", minItems: 3, maxItems: 3, items: { type: "string" }, description: "3 forças no trabalho, apoiadas nos fatores mais altos." },
      atencao: { type: "array", minItems: 2, maxItems: 2, items: { type: "string" }, description: "2 pontos de atenção, sem rótulo nem julgamento." },
      comunicacao: { type: "string", description: "Como você se comunica melhor e como adaptar a conversa com estilos diferentes." },
      jornada: { type: "string", description: "Como esse estilo conversa com o Chamado e a meta do ciclo, com uma ação pequena para a semana." },
      pergunta: { type: "string", description: "Uma pergunta para refletir na semana." },
    },
  },
} as const;

export function buildDiscMessages(profile: DiscProfile, journey: { calling?: string; cycleGoal?: string }) {
  const system = [
    "Você é o Oráculo da Nova Odisseia e interpreta um perfil comportamental DISC, em português do Brasil, segunda pessoa (você).",
    "Os percentuais já foram calculados e estão abaixo; use SOMENTE esses valores.",
    "DISC descreve estilo de comportamento preferido no trabalho, não capacidade, caráter ou valor da pessoa. Não é diagnóstico nem avaliação psicológica, e o estilo pode mudar com o contexto.",
    "Evite rótulos fixos e julgamento. Conecte o estilo ao Chamado e à meta do ciclo quando existirem. Seja concreto, caloroso e breve.",
  ].join(" ");
  const user = [
    `Chamado: ${journey.calling?.trim() || "(não declarado)"}`,
    `Meta do ciclo: ${journey.cycleGoal?.trim() || "(não declarada)"}`,
    "", "Perfil DISC calculado (12 blocos de escolha forçada):",
    ...DISC_FACTORS.map(f => `${DISC_LABELS[f].name} (${f}): ${profile.percent[f]}% - ${DISC_LABELS[f].short}`),
    `Predominante: ${DISC_LABELS[profile.primary].name}. Secundário: ${DISC_LABELS[profile.secondary].name}.`,
  ].join("\n");
  return [{ role: "system" as const, content: system }, { role: "user" as const, content: user }];
}
