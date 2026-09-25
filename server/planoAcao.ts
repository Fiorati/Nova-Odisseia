import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { journeyDateKey } from "../shared/journeyDate";
import { oraculoModelFor, togglePlanStep } from "../shared/oraculo";
import { buildPlanoMessages, hasGoals, planoInputSchema, planoReportJsonSchema, planoReportSchema, type PlanoContext, type PlanoGoals, type PlanoInput, type PlanoReport, type PlanoSource } from "../shared/planoAcao";
import { invokeLLM, resolveLLMProvider } from "./_core/llm";
import { getJourneyState } from "./journeyPersistence";
import { getOraculo } from "./oraculo";

const KIND = "plano_acao";
const currentModel = () => oraculoModelFor(resolveLLMProvider(), process.env.ORACULO_MODEL);
const database = () => {
  if (!process.env.DATABASE_URL) throw new Error("Banco de dados indisponível.");
  return drizzle(process.env.DATABASE_URL);
};
const rowsOf = (result: unknown): Record<string, unknown>[] => (Array.isArray(result) ? (Array.isArray(result[0]) ? result[0] : result) : []) as Record<string, unknown>[];
const safeJson = <T>(value: unknown, fallback: T): T => { try { return JSON.parse(String(value)) as T; } catch { return fallback; } };

export type PlanoRecord = { id: number; source: PlanoSource; sourceId: number; goals: PlanoGoals | null; report: PlanoReport; planDone: number[]; dateKey: string };

async function listPlanos(userId: number): Promise<PlanoRecord[]> {
  const rows = rowsOf(await database().execute(sql`SELECT id, dateKey, answersJson, reportJson, planDoneJson FROM oraculo_readings WHERE userId = ${userId} AND kind = ${KIND} ORDER BY id DESC LIMIT 30`));
  return rows.map(row => {
    const meta = safeJson<{ source: PlanoSource; sourceId: number; goals: PlanoGoals | null }>(row.answersJson, { source: "disc", sourceId: 0, goals: null });
    return { id: Number(row.id), dateKey: String(row.dateKey), ...meta, report: safeJson(row.reportJson, null as any), planDone: safeJson<number[]>(row.planDoneJson, []) };
  }).filter(p => p.report && p.sourceId);
}

async function contextFor(userId: number, planos: PlanoRecord[]): Promise<PlanoContext> {
  const journey = (await getJourneyState(userId))?.state as Record<string, any> | undefined;
  return { calling: journey?.calling, cycleGoal: journey?.cycleGoal, pdiFocus: journey?.pdi?.focus, savedGoals: planos.find(p => p.goals)?.goals ?? null };
}

/** Planos já criados e se a odisseia tem objetivo suficiente para gerar sem perguntar. */
export async function getPlanos(userId: number) {
  await getOraculo(userId, true); // garante as tabelas do Oráculo
  const planos = await listPlanos(userId);
  const ctx = await contextFor(userId, planos);
  return { planos, hasGoals: hasGoals(ctx) };
}

/** Um plano por leitura: se já existe, devolve o mesmo, sem gastar outra chamada de IA. */
export async function generatePlano(user: { id: number }, raw: PlanoInput) {
  const input = planoInputSchema.parse(raw);
  await getOraculo(user.id, true);
  const planos = await listPlanos(user.id);
  const existing = planos.find(p => p.source === input.source && p.sourceId === input.readingId);
  if (existing) return existing;
  const source = rowsOf(await database().execute(sql`SELECT answersJson, reportJson FROM oraculo_readings WHERE id = ${input.readingId} AND userId = ${user.id} AND kind = ${input.source} LIMIT 1`))[0];
  if (!source) throw new TRPCError({ code: "NOT_FOUND", message: "Leitura não encontrada." });
  // Leitura feita para outra pessoa: os objetivos da odisseia do usuário não valem para ela; pergunta sempre.
  const forSelf = safeJson<{ input?: { forSelf?: boolean } }>(source.answersJson, {}).input?.forSelf !== false;
  const ctx: PlanoContext = forSelf ? await contextFor(user.id, planos) : {};
  if (!input.goals && !hasGoals(ctx)) throw new TRPCError({ code: "BAD_REQUEST", message: "Conte seu objetivo e suas 3 prioridades para o plano ter direção." });
  const messages = buildPlanoMessages(input.source, safeJson(source.reportJson, {}), ctx, input.goals);
  let report: PlanoReport;
  try {
    const result = await invokeLLM({ model: currentModel(), messages, response_format: { type: "json_schema", json_schema: planoReportJsonSchema as any } });
    const content = result.choices?.[0]?.message?.content;
    const text = typeof content === "string" ? content : Array.isArray(content) ? content.map((p: any) => p?.text ?? "").join("") : "";
    report = planoReportSchema.parse(JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, "")));
  } catch (error) {
    console.error("Plano de ação: falha ao gerar", error instanceof Error ? error.message.slice(0, 300) : error);
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "O Oráculo não conseguiu montar o plano agora. Tente de novo em alguns minutos." });
  }
  const goals = input.goals ?? null;
  const today = journeyDateKey();
  await database().execute(sql`INSERT INTO oraculo_readings (userId, dateKey, answersJson, reportJson, planDoneJson, model, kind) VALUES (${user.id}, ${today}, ${JSON.stringify({ source: input.source, sourceId: input.readingId, goals })}, ${JSON.stringify(report)}, ${"[]"}, ${currentModel()}, ${KIND})`);
  return (await listPlanos(user.id)).find(p => p.source === input.source && p.sourceId === input.readingId)!;
}

export async function togglePlanoStep(userId: number, planoId: number, index: number) {
  const rows = rowsOf(await database().execute(sql`SELECT planDoneJson FROM oraculo_readings WHERE id = ${planoId} AND userId = ${userId} AND kind = ${KIND} LIMIT 1`));
  if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Plano não encontrado." });
  const next = togglePlanStep(safeJson<number[]>(rows[0].planDoneJson, []), index);
  await database().execute(sql`UPDATE oraculo_readings SET planDoneJson = ${JSON.stringify(next)} WHERE id = ${planoId} AND userId = ${userId}`);
  return { planDone: next };
}
