import { z } from "zod";

/** Plano de ação criado a partir de uma leitura do Oráculo (mapa astral, numerologia, DISC), ancorado nos objetivos da pessoa. */
export const PLANO_SOURCES = ["mapa_astral", "mapa_numerologico", "disc"] as const;
export type PlanoSource = (typeof PLANO_SOURCES)[number];
export const PLANO_SOURCE_LABEL: Record<PlanoSource, string> = { mapa_astral: "Mapa Astral", mapa_numerologico: "Mapa Numerológico", disc: "Perfil DISC" };

export const planoGoalsSchema = z.object({
  area: z.string().trim().min(1).max(80),
  objetivo: z.string().trim().min(1).max(300),
  prioridades: z.array(z.string().trim().min(1).max(200)).length(3),
});
export type PlanoGoals = z.infer<typeof planoGoalsSchema>;

export const planoInputSchema = z.object({
  source: z.enum(PLANO_SOURCES),
  readingId: z.number().int().positive(),
  goals: planoGoalsSchema.optional(),
});
export type PlanoInput = z.infer<typeof planoInputSchema>;

export const planoReportSchema = z.object({
  titulo: z.string().min(1).max(160),
  foco: z.string().min(1).max(600),
  passos: z.array(z.object({ passo: z.string().min(1).max(300), quando: z.string().min(1).max(120), porque: z.string().min(1).max(300) })).length(3),
  indicador: z.string().min(1).max(300),
});
export type PlanoReport = z.infer<typeof planoReportSchema>;

export const planoReportJsonSchema = {
  name: "plano_de_acao",
  strict: true,
  schema: {
    type: "object", additionalProperties: false, required: ["titulo", "foco", "passos", "indicador"],
    properties: {
      titulo: { type: "string", description: "Nome curto do plano, ligado ao objetivo." },
      foco: { type: "string", description: "2 a 3 frases: como a leitura se conecta ao objetivo e às prioridades declaradas." },
      passos: { type: "array", minItems: 3, maxItems: 3, description: "3 passos pequenos, concretos e verificáveis nos próximos 7 dias, um por prioridade quando fizer sentido.",
        items: { type: "object", additionalProperties: false, required: ["passo", "quando", "porque"], properties: { passo: { type: "string" }, quando: { type: "string" }, porque: { type: "string", description: "Qual trecho da leitura ou prioridade justifica o passo." } } } },
      indicador: { type: "string", description: "Como a pessoa vai saber, em 7 dias, que o plano funcionou (algo contável)." },
    },
  },
} as const;

/** Onde a odisseia já tem objetivo: Chamado, meta do ciclo, PDI ou objetivos informados num plano anterior. */
export type PlanoContext = { calling?: string; cycleGoal?: string; pdiFocus?: string[]; savedGoals?: PlanoGoals | null };
export function hasGoals(ctx: PlanoContext) {
  return !!(ctx.calling?.trim() || ctx.cycleGoal?.trim() || ctx.pdiFocus?.some(f => f.trim()) || ctx.savedGoals);
}

export function buildPlanoMessages(source: PlanoSource, report: unknown, ctx: PlanoContext, goals?: PlanoGoals) {
  const system = [
    "Você é o Oráculo de Delfos da Nova Odisseia. Transforme uma leitura já feita em um plano de ação de 7 dias.",
    "Baseie-se SOMENTE na leitura e nos objetivos declarados. Não prevê o futuro, não faz diagnóstico psicológico ou médico, não promete resultado e não inventa fatos sobre a pessoa.",
    "A leitura é ponto de reflexão, não determinação: use-a para escolher o jeito de agir, e os objetivos para escolher o que fazer.",
    "Passos pequenos, possíveis mesmo num dia difícil, com quando fazer. Português do Brasil, segunda pessoa (você), tom sereno e direto.",
  ].join(" ");
  const lines: string[] = [`Leitura de origem: ${PLANO_SOURCE_LABEL[source]}`, JSON.stringify(report), ""];
  const g = goals ?? ctx.savedGoals ?? null;
  lines.push(`Chamado: ${ctx.calling?.trim() || "(não declarado)"}`);
  lines.push(`Meta do ciclo: ${ctx.cycleGoal?.trim() || "(não declarada)"}`);
  if (ctx.pdiFocus?.length) lines.push(`Foco do PDI: ${ctx.pdiFocus.join("; ")}`);
  if (g) lines.push(`Objetivo declarado (${g.area}): ${g.objetivo}`, `3 prioridades: ${g.prioridades.join(" | ")}`);
  return [{ role: "system" as const, content: system }, { role: "user" as const, content: lines.join("\n") }];
}

/** Opções da pergunta "objetivo + 3 prioridades", por área (Vida 360). Sempre há campo livre. */
export const PLANO_AREAS = {
  profissional: { label: "Carreira e trabalho", emoji: "🏛️", objetivos: ["Crescer no cargo ou ser promovido", "Aumentar a renda", "Mudar de área ou de emprego", "Empreender ou fazer o negócio crescer", "Ser mais reconhecido pelo que entrego"], prioridades: ["Organizar a rotina e o foco", "Aprender uma habilidade nova", "Ampliar minha rede de contatos", "Conseguir mais clientes", "Comunicar melhor minhas ideias", "Cuidar melhor do tempo", "Pedir e usar feedback"] },
  financas: { label: "Dinheiro", emoji: "🪙", objetivos: ["Sair das dívidas", "Montar uma reserva", "Ganhar mais por mês", "Investir com constância"], prioridades: ["Mapear para onde vai o dinheiro", "Cortar gastos que não importam", "Criar uma fonte de renda extra", "Negociar dívidas", "Guardar todo mês um valor fixo", "Aprender sobre investimentos"] },
  pessoal: { label: "Saúde e corpo", emoji: "🏺", objetivos: ["Ter mais energia no dia a dia", "Criar rotina de exercício", "Dormir melhor", "Comer melhor"], prioridades: ["Dormir num horário fixo", "Mexer o corpo 3x por semana", "Beber mais água", "Reduzir telas à noite", "Fazer exames em dia", "Planejar as refeições"] },
  emocional: { label: "Mente e emoções", emoji: "🦉", objetivos: ["Ter mais calma e menos ansiedade", "Me conhecer melhor", "Confiar mais em mim", "Terminar o que começo"], prioridades: ["Parar alguns minutos por dia para refletir", "Dizer não sem culpa", "Registrar o que sinto", "Buscar apoio profissional", "Celebrar pequenas vitórias", "Diminuir a autocobrança"] },
  comunidade: { label: "Relações e comunidade", emoji: "🤝", objetivos: ["Estar mais presente com a família", "Fazer novas amizades", "Melhorar um relacionamento", "Contribuir com a comunidade"], prioridades: ["Reservar tempo de qualidade", "Conversas difíceis que estou adiando", "Ouvir mais do que falo", "Participar de um grupo", "Ajudar alguém toda semana", "Reatar um contato importante"] },
} as const;
export type PlanoAreaKey = keyof typeof PLANO_AREAS;
export function planoOptionsFor(area: PlanoAreaKey) { const a = PLANO_AREAS[area]; return { objetivos: [...a.objetivos], prioridades: [...a.prioridades] }; }
