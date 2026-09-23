import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { journeyDateKey } from "../shared/journeyDate";
import {
  ORACULO_MIN_ANSWERS, ORACULO_MODEL, answeredCount, buildOraculoMessages, canGenerateToday,
  oraculoAnswersSchema, oraculoReportJsonSchema, parseOraculoReport, readingForAudience, togglePlanStep,
  type OraculoAnswers, type OraculoContext, type OraculoReading,
} from "../shared/oraculo";
import { invokeLLM } from "./_core/llm";
import { getJourneyState } from "./journeyPersistence";

const database = () => {
  if (!process.env.DATABASE_URL) throw new Error("Banco de dados indisponível.");
  return drizzle(process.env.DATABASE_URL);
};

let ensured: Promise<unknown> | null = null;
function ensureTables() {
  ensured ??= (async () => {
    const db = database();
    await db.execute(sql.raw("CREATE TABLE IF NOT EXISTS `oraculo_drafts` (`userId` int NOT NULL, `answersJson` text NOT NULL, `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP, CONSTRAINT `oraculo_drafts_user` PRIMARY KEY(`userId`))"));
    await db.execute(sql.raw("CREATE TABLE IF NOT EXISTS `oraculo_readings` (`id` int AUTO_INCREMENT NOT NULL, `userId` int NOT NULL, `dateKey` varchar(10) NOT NULL, `answersJson` text NOT NULL, `reportJson` text NOT NULL, `planDoneJson` varchar(64) NOT NULL DEFAULT '[]', `model` varchar(64) NOT NULL, `createdAt` timestamp NOT NULL DEFAULT (now()), CONSTRAINT `oraculo_readings_id` PRIMARY KEY(`id`), INDEX `oraculo_readings_user_date` (`userId`, `dateKey`))"));
  })().catch(error => { ensured = null; throw error; });
  return ensured;
}

const rowsOf = (result: unknown): Record<string, unknown>[] => (Array.isArray(result) ? (Array.isArray(result[0]) ? result[0] : result) : []) as Record<string, unknown>[];
const safeJson = <T>(value: unknown, fallback: T): T => { try { return JSON.parse(String(value)) as T; } catch { return fallback; } };

async function listReadings(userId: number, limit = 10): Promise<OraculoReading[]> {
  const rows = rowsOf(await database().execute(sql`SELECT id, dateKey, answersJson, reportJson, planDoneJson, createdAt FROM oraculo_readings WHERE userId = ${userId} ORDER BY id DESC LIMIT ${sql.raw(String(Math.max(1, Math.min(50, Math.trunc(limit)))))}`));
  return rows.map(row => ({
    id: Number(row.id),
    dateKey: String(row.dateKey),
    answers: safeJson<OraculoAnswers>(row.answersJson, oraculoAnswersSchema.parse({})),
    report: safeJson(row.reportJson, { leitura: "", padroes: [], plano: [], pergunta: "" }),
    planDone: safeJson<number[]>(row.planDoneJson, []),
    createdAt: new Date(String(row.createdAt)).toISOString(),
  }));
}

/** viewingAsMentor = admin usando "ver como usuário": nada de respostas escritas, só o plano. */
export async function getOraculo(userId: number, viewingAsMentor: boolean) {
  await ensureTables();
  const today = journeyDateKey();
  const readings = await listReadings(userId);
  const draftRows = viewingAsMentor ? [] : rowsOf(await database().execute(sql`SELECT answersJson FROM oraculo_drafts WHERE userId = ${userId} LIMIT 1`));
  return {
    draft: viewingAsMentor ? null : oraculoAnswersSchema.parse(safeJson(draftRows[0]?.answersJson, {})),
    readings: readings.map(reading => readingForAudience(reading, viewingAsMentor)),
    canGenerate: canGenerateToday(readings.map(reading => reading.dateKey), today),
    privateAnswersHidden: viewingAsMentor,
  };
}

export async function saveOraculoDraft(userId: number, answers: OraculoAnswers) {
  await ensureTables();
  const json = JSON.stringify(oraculoAnswersSchema.parse(answers));
  await database().execute(sql`INSERT INTO oraculo_drafts (userId, answersJson) VALUES (${userId}, ${json}) ON DUPLICATE KEY UPDATE answersJson = VALUES(answersJson)`);
  return { success: true } as const;
}

function contextFromJourney(name: string | null | undefined, state: Record<string, any> | null): OraculoContext {
  const areas = Array.isArray(state?.areas) ? state!.areas : [];
  const weakest = [...areas].sort((a, b) => a.score - b.score)[0];
  const evidences = Array.isArray(state?.evidences) ? state!.evidences.slice(0, 3).map((e: any) => `${e.fact} -> ${e.next}`) : [];
  const checkins = Array.isArray(state?.checkins) ? state!.checkins.slice(0, 3).map((c: any) => `check-in energia ${c.energy}/5: ${c.reflection}`) : [];
  return {
    name,
    calling: state?.calling,
    cycleGoal: state?.cycleGoal,
    pdiTitle: state?.pdi?.title,
    pdiFocus: state?.pdi?.focus,
    weakestArea: weakest ? { label: weakest.label, score: weakest.score, focus: weakest.focus } : null,
    recentEvidence: [...evidences, ...checkins].slice(0, 5),
  };
}

export async function generateOraculoReading(user: { id: number; name?: string | null }, answers: OraculoAnswers) {
  await ensureTables();
  const parsed = oraculoAnswersSchema.parse(answers);
  if (answeredCount(parsed) < ORACULO_MIN_ANSWERS) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Responda pelo menos ${ORACULO_MIN_ANSWERS} perguntas para o Oráculo ter o que ler.` });
  }
  const today = journeyDateKey();
  const existing = await listReadings(user.id, 5);
  if (!canGenerateToday(existing.map(reading => reading.dateKey), today)) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Você já recebeu a leitura de hoje. O Oráculo volta a falar amanhã." });
  }
  await saveOraculoDraft(user.id, parsed);
  const journey = await getJourneyState(user.id);
  const messages = buildOraculoMessages(contextFromJourney(user.name, (journey?.state ?? null) as Record<string, any> | null), parsed);
  let report;
  try {
    const result = await invokeLLM({ model: ORACULO_MODEL, messages, response_format: { type: "json_schema", json_schema: oraculoReportJsonSchema as any } });
    report = parseOraculoReport(result.choices?.[0]?.message?.content);
  } catch (error) {
    console.error("Oráculo: falha ao gerar leitura", error instanceof Error ? error.message.slice(0, 300) : error);
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "O Oráculo não conseguiu responder agora. Suas respostas ficaram salvas; tente de novo em alguns minutos." });
  }
  await database().execute(sql`INSERT INTO oraculo_readings (userId, dateKey, answersJson, reportJson, planDoneJson, model) VALUES (${user.id}, ${today}, ${JSON.stringify(parsed)}, ${JSON.stringify(report)}, '[]', ${ORACULO_MODEL})`);
  return { report };
}

export async function toggleOraculoPlanStep(userId: number, readingId: number, index: number) {
  await ensureTables();
  const rows = rowsOf(await database().execute(sql`SELECT planDoneJson FROM oraculo_readings WHERE id = ${readingId} AND userId = ${userId} LIMIT 1`));
  if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Leitura não encontrada." });
  const next = togglePlanStep(safeJson<number[]>(rows[0].planDoneJson, []), index);
  await database().execute(sql`UPDATE oraculo_readings SET planDoneJson = ${JSON.stringify(next)} WHERE id = ${readingId} AND userId = ${userId}`);
  return { planDone: next };
}
