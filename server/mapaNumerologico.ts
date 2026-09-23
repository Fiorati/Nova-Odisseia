import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { journeyDateKey } from "../shared/journeyDate";
import { oraculoModelFor, formatDateKeyBR, oraculoAvailability } from "../shared/oraculo";
import { buildMapaNumerologicoMessages, computeNumerology, mapaNumerologicoInputSchema, mapaNumerologicoReportJsonSchema, mapaNumerologicoReportSchema, type MapaNumerologicoInput, type MapaNumerologicoReport, type NumerologyNumbers } from "../shared/mapaNumerologico";
import { invokeLLM, resolveLLMProvider } from "./_core/llm";
import { getJourneyState } from "./journeyPersistence";
import { getOraculo } from "./oraculo";

const KIND = "mapa_numerologico";
const currentModel = () => oraculoModelFor(resolveLLMProvider(), process.env.ORACULO_MODEL);
const database = () => {
  if (!process.env.DATABASE_URL) throw new Error("Banco de dados indisponível.");
  return drizzle(process.env.DATABASE_URL);
};
const rowsOf = (result: unknown): Record<string, unknown>[] => (Array.isArray(result) ? (Array.isArray(result[0]) ? result[0] : result) : []) as Record<string, unknown>[];
const safeJson = <T>(value: unknown, fallback: T): T => { try { return JSON.parse(String(value)) as T; } catch { return fallback; } };

export type MapaNumerologicoRecord = { id: number; dateKey: string; input: MapaNumerologicoInput; numbers: NumerologyNumbers; report: MapaNumerologicoReport; createdAt: string };

export async function getMapaNumerologico(userId: number) {
  await getOraculo(userId, true); // garante as tabelas do Oráculo
  const rows = rowsOf(await database().execute(sql`SELECT id, dateKey, answersJson, reportJson, createdAt FROM oraculo_readings WHERE userId = ${userId} AND kind = ${KIND} ORDER BY id DESC LIMIT 3`));
  const records: MapaNumerologicoRecord[] = rows.map(row => {
    const stored = safeJson<{ input: MapaNumerologicoInput; numbers: NumerologyNumbers }>(row.answersJson, { input: null as any, numbers: null as any });
    return { id: Number(row.id), dateKey: String(row.dateKey), input: stored.input, numbers: stored.numbers, report: safeJson(row.reportJson, null as any), createdAt: new Date(String(row.createdAt)).toISOString() };
  }).filter(r => r.numbers && r.report);
  const availability = oraculoAvailability(records.map(r => r.dateKey).slice(0, 1), journeyDateKey(), KIND);
  return { records, ...availability };
}

export async function generateMapaNumerologico(user: { id: number }, rawInput: MapaNumerologicoInput) {
  const input = mapaNumerologicoInputSchema.parse(rawInput);
  const current = await getMapaNumerologico(user.id);
  if (!current.canGenerate) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `Você já gerou o Mapa Numerológico deste mês. O próximo libera em ${formatDateKeyBR(current.nextDateKey!)}.` });
  }
  const today = journeyDateKey();
  let numbers: NumerologyNumbers;
  try {
    numbers = computeNumerology(input.fullName, input.birthDate, Number(today.slice(0, 4)));
  } catch {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Não consegui calcular com esses dados. Confira o nome completo e a data." });
  }
  const journey = input.forSelf ? ((await getJourneyState(user.id))?.state as Record<string, any> | undefined) : undefined;
  const messages = buildMapaNumerologicoMessages(input, numbers, input.forSelf ? { calling: journey?.calling, cycleGoal: journey?.cycleGoal } : null);
  let report: MapaNumerologicoReport;
  try {
    const result = await invokeLLM({ model: currentModel(), messages, response_format: { type: "json_schema", json_schema: mapaNumerologicoReportJsonSchema as any } });
    const content = result.choices?.[0]?.message?.content;
    const text = typeof content === "string" ? content : Array.isArray(content) ? content.map((p: any) => p?.text ?? "").join("") : "";
    report = mapaNumerologicoReportSchema.parse(JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, "")));
  } catch (error) {
    console.error("Mapa Numerológico: falha ao gerar leitura", error instanceof Error ? error.message.slice(0, 300) : error);
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "O Oráculo não conseguiu interpretar os números agora. Nada foi descontado; tente de novo em alguns minutos." });
  }
  await database().execute(sql`INSERT INTO oraculo_readings (userId, dateKey, answersJson, reportJson, planDoneJson, model, kind) VALUES (${user.id}, ${today}, ${JSON.stringify({ input, numbers })}, ${JSON.stringify(report)}, ${"[]"}, ${currentModel()}, ${KIND})`);
  return { numbers, report };
}
