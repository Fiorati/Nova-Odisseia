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
  missions: z.array(z.object({ id: z.string().max(80), title: z.string().max(300), area: z.enum(["profissional", "pessoal", "emocional", "comunidade"]), done: z.boolean(), xp: z.number().int().min(0).max(10000) })).max(100),
  checkins: z.array(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), energy: z.number().int().min(1).max(5), reflection: z.string().trim().max(4000), nextAction: z.string().trim().max(1000) })).max(365),
});
export type JourneyStateInput = z.infer<typeof journeyStateSchema>;
