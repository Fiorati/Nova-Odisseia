import { z } from "zod";

export const journeyStageSchema = z.enum(["Chamado", "Provação", "Maestria", "Retorno"]);
export const journeyStateSchema = z.object({
  calling: z.string().trim().max(1000),
  cycleGoal: z.string().trim().max(2000),
  stage: journeyStageSchema,
  xp: z.number().int().min(0).max(1_000_000),
  streak: z.number().int().min(0).max(100_000),
  areas: z.array(z.object({
    key: z.enum(["profissional", "pessoal", "emocional", "comunidade"]),
    label: z.string().max(80), score: z.number().int().min(1).max(10), focus: z.string().max(300),
  })).length(4),
  missions: z.array(z.object({ id: z.string().max(80), title: z.string().max(300), area: z.enum(["profissional", "pessoal", "emocional", "comunidade"]), done: z.boolean(), xp: z.number().int().min(0).max(10000), kind: z.literal("prova").optional(), dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), doneAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), reflection: z.object({ fact: z.string().max(1000), meaning: z.string().max(1000), next: z.string().max(1000) }).optional() })).max(100),
  checkins: z.array(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), energy: z.number().int().min(1).max(5), reflection: z.string().trim().max(4000), nextAction: z.string().trim().max(1000), detail: z.object({ mood: z.number().int().min(1).max(5), factors: z.array(z.enum(["trabalho", "saude", "relacoes", "dinheiro", "sono", "nada"])).max(6), plan: z.enum(["abaixo", "dentro", "acima"]), next: z.enum(["descansar", "clientes", "ajuda", "repetir", "planejar", "corpo", "outro"]), nextOther: z.string().trim().max(300).optional(), when: z.enum(["hoje", "amanha-cedo", "amanha-tarde", "semana"]), note: z.string().trim().max(2000).optional() }).optional() })).max(365),
  pdi: z.object({ mentor: z.string().max(120), title: z.string().max(200), summary: z.string().max(4000), focus: z.array(z.string().max(300)).max(12), createdAt: z.string().max(40) }).optional(),
  evidences: z.array(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), context: z.string().max(200), fact: z.string().max(1000), meaning: z.string().max(1000), next: z.string().max(1000) })).max(365).optional(),
  forge: z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), area: z.enum(["profissional", "pessoal", "emocional", "comunidade"]), done: z.array(z.number().int().min(0).max(2)).max(3) }).optional(),
});
export type JourneyStateInput = z.infer<typeof journeyStateSchema>;
