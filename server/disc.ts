import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { journeyDateKey } from "../shared/journeyDate";
import { oraculoModelFor, formatDateKeyBR, oraculoAvailability } from "../shared/oraculo";
import { buildDiscMessages, discInputSchema, discReportJsonSchema, discReportSchema, scoreDisc, type DiscInput, type DiscProfile, type DiscReport } from "../shared/disc";
import { invokeLLM, resolveLLMProvider } from "./_core/llm";
import { getJourneyState } from "./journeyPersistence";
import { getOraculo } from "./oraculo";

const KIND = "disc";
const currentModel = () => oraculoModelFor(resolveLLMProvider(), process.env.ORACULO_MODEL);
const database = () => {
  if (!process.env.DATABASE_URL) throw new Error("Banco de dados indisponível.");
  return drizzle(process.env.DATABASE_URL);
};
const rowsOf = (result: unknown): Record<string, unknown>[] => (Array.isArray(result) ? (Array.isArray(result[0]) ? result[0] : result) : []) as Record<string, unknown>[];
const safeJson = <T>(value: unknown, fallback: T): T => { try { return JSON.parse(String(value)) as T; } catch { return fallback; } };

export type DiscRecord = { id: number; dateKey: string; profile: DiscProfile; report: DiscReport; createdAt: string };

export async function getDisc(userId: number) {
  await getOraculo(userId, true); // garante as tabelas do Oráculo
  const rows = rowsOf(await database().execute(sql`SELECT id, dateKey, answersJson, reportJson, createdAt FROM oraculo_readings WHERE userId = ${userId} AND kind = ${KIND} ORDER BY id DESC LIMIT 3`));
  const records: DiscRecord[] = rows.map(row => {
    const stored = safeJson<{ answers: DiscInput["answers"]; profile: DiscProfile }>(row.answersJson, { answers: [], profile: null as any });
    return { id: Number(row.id), dateKey: String(row.dateKey), profile: stored.profile, report: safeJson(row.reportJson, null as any), createdAt: new Date(String(row.createdAt)).toISOString() };
  }).filter(r => r.profile && r.report);
  const availability = oraculoAvailability(records.map(r => r.dateKey).slice(0, 1), journeyDateKey(), KIND);
  return { records, ...availability };
}

export async function generateDisc(user: { id: number }, rawInput: DiscInput) {
  const input = discInputSchema.parse(rawInput);
  const current = await getDisc(user.id);
  if (!current.canGenerate) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `Você já fez o DISC desta semana. O próximo libera em ${formatDateKeyBR(current.nextDateKey!)}.` });
  }
  const profile = scoreDisc(input.answers);
  const journey = (await getJourneyState(user.id))?.state as Record<string, any> | undefined;
  const messages = buildDiscMessages(profile, { calling: journey?.calling, cycleGoal: journey?.cycleGoal });
  let report: DiscReport;
  try {
    const result = await invokeLLM({ model: currentModel(), messages, response_format: { type: "json_schema", json_schema: discReportJsonSchema as any } });
    const content = result.choices?.[0]?.message?.content;
    const text = typeof content === "string" ? content : Array.isArray(content) ? content.map((p: any) => p?.text ?? "").join("") : "";
    report = discReportSchema.parse(JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, "")));
  } catch (error) {
    console.error("DISC: falha ao gerar leitura", error instanceof Error ? error.message.slice(0, 300) : error);
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "O Oráculo não conseguiu interpretar o seu DISC agora. Nada foi descontado; tente de novo em alguns minutos." });
  }
  const today = journeyDateKey();
  await database().execute(sql`INSERT INTO oraculo_readings (userId, dateKey, answersJson, reportJson, planDoneJson, model, kind) VALUES (${user.id}, ${today}, ${JSON.stringify({ answers: input.answers, profile })}, ${JSON.stringify(report)}, ${"[]"}, ${currentModel()}, ${KIND})`);
  return { profile, report };
}
