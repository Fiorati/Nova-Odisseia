import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { journeyDateKey } from "../shared/journeyDate";
import { oraculoModelFor, formatDateKeyBR, oraculoAvailability } from "../shared/oraculo";
import { buildMapaAstralMessages, mapaAstralInputSchema, mapaAstralReportJsonSchema, mapaAstralReportSchema, type MapaAstralInput, type MapaAstralReport, type NatalChart } from "../shared/mapaAstral";
import { computeNatalChart } from "./astroChart";
import { invokeLLM, resolveLLMProvider } from "./_core/llm";

const currentModel = () => oraculoModelFor(resolveLLMProvider(), process.env.ORACULO_MODEL);
import { getJourneyState } from "./journeyPersistence";
import { getOraculo } from "./oraculo";

const KIND = "mapa_astral";
const database = () => {
  if (!process.env.DATABASE_URL) throw new Error("Banco de dados indisponível.");
  return drizzle(process.env.DATABASE_URL);
};
const rowsOf = (result: unknown): Record<string, unknown>[] => (Array.isArray(result) ? (Array.isArray(result[0]) ? result[0] : result) : []) as Record<string, unknown>[];
const safeJson = <T>(value: unknown, fallback: T): T => { try { return JSON.parse(String(value)) as T; } catch { return fallback; } };

export type CityOption = { name: string; admin1: string; admin2: string; country: string; latitude: number; longitude: number; timezone: string };

/** Busca de cidade (Open-Meteo, sem chave). A pessoa escolhe a cidade certa entre homônimos. */
export async function searchBirthCity(query: string): Promise<CityOption[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=pt&format=json`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = (await response.json()) as { results?: Record<string, unknown>[] };
    return (data.results ?? []).filter(r => typeof r.timezone === "string").map(r => ({
      name: String(r.name), admin1: String(r.admin1 ?? ""), admin2: String(r.admin2 ?? ""), country: String(r.country ?? ""),
      latitude: Number(r.latitude), longitude: Number(r.longitude), timezone: String(r.timezone),
    }));
  } catch (error) {
    console.error("Mapa Astral: falha na busca de cidade", error instanceof Error ? error.message : error);
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não consegui buscar a cidade agora. Tente de novo em instantes." });
  }
}

export type MapaAstralRecord = { id: number; dateKey: string; input: Omit<MapaAstralInput, "place"> & { place: CityOption }; chart: NatalChart; report: MapaAstralReport; createdAt: string };

export async function getMapaAstral(userId: number) {
  await getOraculo(userId, true); // garante as tabelas do Oráculo
  const rows = rowsOf(await database().execute(sql`SELECT id, dateKey, answersJson, reportJson, createdAt FROM oraculo_readings WHERE userId = ${userId} AND kind = ${KIND} ORDER BY id DESC LIMIT 3`));
  const records: MapaAstralRecord[] = rows.map(row => {
    const stored = safeJson<{ input: MapaAstralRecord["input"]; chart: NatalChart }>(row.answersJson, { input: null as any, chart: null as any });
    return { id: Number(row.id), dateKey: String(row.dateKey), input: stored.input, chart: stored.chart, report: safeJson(row.reportJson, null as any), createdAt: new Date(String(row.createdAt)).toISOString() };
  }).filter(r => r.chart && r.report);
  const availability = oraculoAvailability(records.map(r => r.dateKey).slice(0, 1), journeyDateKey(), KIND);
  return { records, ...availability };
}

export async function generateMapaAstral(user: { id: number }, rawInput: MapaAstralInput) {
  const input = mapaAstralInputSchema.parse(rawInput);
  const current = await getMapaAstral(user.id);
  if (!current.canGenerate) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `Você já gerou o Mapa Astral deste mês. O próximo libera em ${formatDateKeyBR(current.nextDateKey!)}.` });
  }
  let chart: NatalChart;
  try {
    chart = computeNatalChart(input.birthDate, input.birthTime, input.place);
  } catch (error) {
    console.error("Mapa Astral: falha no cálculo", error instanceof Error ? error.message : error);
    throw new TRPCError({ code: "BAD_REQUEST", message: "Não consegui calcular o mapa com esses dados. Confira data, hora e cidade." });
  }
  const journey = input.forSelf ? ((await getJourneyState(user.id))?.state as Record<string, any> | undefined) : undefined;
  const messages = buildMapaAstralMessages(input, chart, input.forSelf ? { calling: journey?.calling, cycleGoal: journey?.cycleGoal } : null);
  let report: MapaAstralReport;
  try {
    const result = await invokeLLM({ model: currentModel(), messages, response_format: { type: "json_schema", json_schema: mapaAstralReportJsonSchema as any } });
    const content = result.choices?.[0]?.message?.content;
    const text = typeof content === "string" ? content : Array.isArray(content) ? content.map((p: any) => p?.text ?? "").join("") : "";
    report = mapaAstralReportSchema.parse(JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, "")));
  } catch (error) {
    console.error("Mapa Astral: falha ao gerar leitura", error instanceof Error ? error.message.slice(0, 300) : error);
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "O Oráculo não conseguiu interpretar o mapa agora. Nada foi descontado; tente de novo em alguns minutos." });
  }
  const today = journeyDateKey();
  await database().execute(sql`INSERT INTO oraculo_readings (userId, dateKey, answersJson, reportJson, planDoneJson, model, kind) VALUES (${user.id}, ${today}, ${JSON.stringify({ input, chart })}, ${JSON.stringify(report)}, ${"[]"}, ${currentModel()}, ${KIND})`);
  return { chart, report };
}
