import { desc, eq, sql } from "drizzle-orm";
import { agentProfiles, spartacusPdis, users } from "../drizzle/schema";
import { getDb } from "./db";
import { getJourneyState } from "./journeyPersistence";
import { getOraculo } from "./oraculo";
import { renderPdf, type PdfBlock } from "./jornadaPdf";

/** "Gerar a minha jornada do herói em PDF": foto do momento da plataforma, enviada por e-mail ao dono da conta. */
type Reading = { id: number; kind: string; dateKey: string; answers: any; report: any; planDone: number[] };
export type JornadaData = {
  name: string;
  generatedAt: Date;
  journey: any | null;
  profile: { regional?: string; district?: string; polo?: string; route?: string } | null;
  readings: Reading[];
  pdi: any | null;
};

const safe = <T>(v: unknown, f: T): T => { try { return JSON.parse(String(v)) as T; } catch { return f; } };
const dmy = (k?: string) => { if (!k) return ""; const [y, m, d] = k.split("-"); return `${d}/${m}/${y}`; };
const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : typeof v === "object" ? Object.values(v as object).filter(x => typeof x === "string" || typeof x === "number").join(" · ") : String(v));
const AREA: Record<string, string> = { profissional: "profissional", pessoal: "pessoal", emocional: "emocional", comunidade: "comunidade" };
const SOURCE: Record<string, string> = { mapa_astral: "Mapa Astral", mapa_numerologico: "Mapa Numerológico", disc: "Perfil DISC" };

function readingBlocks(r: any, extra: PdfBlock[] = []): PdfBlock[] {
  const out: PdfBlock[] = [];
  if (r?.essencia) out.push({ type: "paragraph", text: r.essencia });
  out.push(...extra);
  if (r?.forcas?.length) out.push({ type: "subtitle", text: "Forças" }, { type: "bullets", items: r.forcas.map(str) });
  if (r?.atencao?.length) out.push({ type: "subtitle", text: "Pontos de atenção" }, { type: "bullets", items: r.atencao.map(str) });
  if (r?.jornada) out.push({ type: "paragraph", label: "Na sua jornada:", text: r.jornada });
  if (r?.pergunta) out.push({ type: "paragraph", text: r.pergunta, italic: true });
  return out;
}

export function buildJornadaBlocks(data: JornadaData): PdfBlock[] {
  const j = data.journey ?? {};
  const latest = (kind: string) => data.readings.filter(r => r.kind === kind).sort((a, b) => b.id - a.id)[0];
  const date = data.generatedAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const p = data.profile;
  const route = p ? [p.district, p.polo && `Polo ${p.polo}`, p.route].filter(Boolean).join(" · ") : "";
  const cards = [
    { label: "Chamado", text: j.calling || "Ainda não definido" },
    { label: "Meta do ciclo", text: j.cycleGoal || "Ainda não definida" },
    { label: "Estágio", text: `${j.stage || "Início"} · ${j.xp ?? 0} XP · sequência de ${j.streak ?? 0} dias` },
  ];
  if (route) cards.push({ label: "Rota", text: route });
  const b: PdfBlock[] = [{ type: "cover", tag: "Nova Odisseia · Foto do momento", title: `A Jornada do Herói de ${data.name}`, subtitle: `Retrato da plataforma em ${date}`, cards }];

  if (j.areas?.length) {
    b.push({ type: "section", tag: "Ítaca · Onde você está", title: "Vida 360" });
    for (const a of j.areas) b.push({ type: "bar", label: `${a.label} - ${a.focus ?? ""}`, value: `${a.score}/10`, ratio: Number(a.score) / 10 });
  }
  if (j.missions?.length || j.checkins?.length) {
    b.push({ type: "section", tag: "Ulisses · Provas e registros", title: "Missões e check-ins" });
    if (j.missions?.length) b.push({ type: "subtitle", text: "Missões" }, { type: "bullets", items: j.missions.map((m: any) => `${m.done ? "[feita]" : "[aberta]"} ${m.title} (${AREA[m.area] ?? m.area}${m.dueDate ? `, prazo ${dmy(m.dueDate)}` : ""})`) });
    if (j.checkins?.length) b.push({ type: "subtitle", text: "Check-ins" }, { type: "bullets", items: j.checkins.slice(0, 10).map((c: any) => `${dmy(c.date)} · energia ${c.energy}/5 - ${c.reflection}${c.nextAction ? ` Próxima ação: ${c.nextAction}` : ""}`) });
  }
  if (j.pdi?.title) {
    b.push({ type: "section", tag: `Mentoria · ${j.pdi.mentor ?? ""}`, title: j.pdi.title }, { type: "paragraph", text: j.pdi.summary ?? "" });
    if (j.pdi.focus?.length) b.push({ type: "bullets", items: j.pdi.focus });
  }
  const leitura = latest("leitura");
  if (leitura?.report) {
    const r = leitura.report;
    b.push({ type: "section", tag: `Oráculo de Delfos · ${dmy(leitura.dateKey)}`, title: "Leitura do momento" });
    if (r.leitura) b.push({ type: "paragraph", text: r.leitura });
    if (r.padroes?.length) b.push({ type: "subtitle", text: "Padrões que você revelou" }, { type: "bullets", items: r.padroes.map(str) });
    if (r.plano?.length) b.push({ type: "subtitle", text: "Plano de 7 dias" }, { type: "bullets", ordered: true, items: r.plano.map((s: unknown, i: number) => `${str(s)}${leitura.planDone.includes(i) ? " (feito)" : ""}`) });
    if (r.pergunta) b.push({ type: "paragraph", text: r.pergunta, italic: true });
  }
  const astral = latest("mapa_astral");
  if (astral?.report) {
    const i = astral.answers?.input ?? {}; const t = astral.report.tripe ?? {};
    b.push({ type: "section", tag: `Oráculo · ${dmy(astral.dateKey)} · ${[i.fullName, dmy(i.birthDate), i.birthTime, i.city].filter(Boolean).join(", ")}`, title: "Mapa Astral" });
    b.push(...readingBlocks(astral.report, [{ type: "paragraph", label: "Sol:", text: str(t.sol) }, { type: "paragraph", label: "Lua:", text: str(t.lua) }, { type: "paragraph", label: "Ascendente:", text: str(t.ascendente) }]));
  }
  const num = latest("mapa_numerologico");
  if (num?.report) {
    const n = num.report.numeros ?? {}; const lab: Record<string, string> = { caminho: "Caminho de vida:", expressao: "Expressão:", motivacao: "Motivação:", impressao: "Impressão:", anoPessoal: "Ano pessoal:" };
    b.push({ type: "section", tag: `Oráculo · ${dmy(num.dateKey)}`, title: "Mapa Numerológico" });
    b.push(...readingBlocks(num.report, Object.entries(n).map(([k, v]) => ({ type: "paragraph" as const, label: lab[k] ?? k, text: str(v) }))));
  }
  const disc = latest("disc");
  if (disc?.report) {
    const pf = disc.answers?.profile; const names: Record<string, string> = { D: "Dominância", I: "Influência", S: "Estabilidade", C: "Conformidade" };
    b.push({ type: "section", tag: `Oráculo · ${dmy(disc.dateKey)}`, title: "Perfil DISC" });
    if (pf?.percent) for (const f of ["D", "I", "S", "C"]) b.push({ type: "bar", label: `${f} · ${names[f]}${f === pf.primary ? " · predominante" : f === pf.secondary ? " · secundário" : ""}`, value: `${pf.percent[f]}%`, ratio: pf.percent[f] / 100 });
    b.push(...readingBlocks(disc.report, disc.report.comunicacao ? [{ type: "paragraph", label: "Comunicação:", text: disc.report.comunicacao }] : []));
  }
  const pl = data.pdi;
  if (pl) {
    b.push({ type: "section", tag: "Esparta · PDI Spartacus", title: pl.title || "PDI" });
    b.push({ type: "paragraph", label: "Objetivo:", text: [pl.goal, pl.roleLabel, pl.studyMinutes && `${pl.studyMinutes} min de estudo por dia`].filter(Boolean).join(" · ") });
    const skills = [...(pl.hardSkills ?? []), ...(pl.softSkills ?? [])];
    if (skills.length) b.push({ type: "subtitle", text: "Competências" }, { type: "bullets", items: skills.map((s: any) => `${s.title} - ${s.summary ?? ""}${s.practice ? ` Prática: ${s.practice}` : ""}`) });
    if (pl.weeklyMissions?.length) b.push({ type: "subtitle", text: "Missões semanais" }, { type: "bullets", ordered: true, items: pl.weeklyMissions.map(str) });
  }
  const planos = data.readings.filter(r => r.kind === "plano_acao" && r.report);
  b.push({ type: "section", tag: "Oráculo · Salvar e criar plano", title: "Planos de ação" });
  if (!planos.length) b.push({ type: "paragraph", text: "Ainda não há planos de ação salvos. Use \"Salvar e criar plano de ação\" no fim do Mapa Astral, do Numerológico ou do DISC." });
  for (const pa of planos) {
    const r = pa.report;
    b.push({ type: "subtitle", text: `${r.titulo} (${SOURCE[pa.answers?.source] ?? "Oráculo"}, ${dmy(pa.dateKey)})` }, { type: "paragraph", text: r.foco });
    if (pa.answers?.goals) b.push({ type: "paragraph", label: "Objetivo:", text: `${pa.answers.goals.objetivo} · Prioridades: ${pa.answers.goals.prioridades.join(" · ")}` });
    b.push({ type: "bullets", ordered: true, items: (r.passos ?? []).map((s: any, i: number) => `${s.passo} (${s.quando})${pa.planDone.includes(i) ? " (feito)" : ""} - Por quê: ${s.porque}`) });
    b.push({ type: "paragraph", label: "Como saber se funcionou:", text: r.indicador });
  }
  b.push({ type: "footer", text: `Gerado em ${date} a partir do que foi registrado na Nova Odisseia (www.novaodisseia.com). As leituras do Oráculo são geradas por IA como ponto de reflexão: não preveem o futuro, não são diagnóstico e não garantem resultado. Documento pessoal.` });
  return b;
}

async function loadJornada(userId: number) {
  const db = await getDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user?.email) throw new Error("Sua conta não possui um e-mail válido para receber o PDF.");
  await getOraculo(userId, true); // garante as tabelas do Oráculo
  const [profile] = await db.select().from(agentProfiles).where(eq(agentProfiles.userId, userId)).limit(1);
  const [pdiRow] = await db.select().from(spartacusPdis).where(eq(spartacusPdis.userId, userId)).orderBy(desc(spartacusPdis.createdAt)).limit(1);
  const result = await db.execute(sql`SELECT id, kind, dateKey, answersJson, reportJson, planDoneJson FROM oraculo_readings WHERE userId = ${userId} ORDER BY id DESC LIMIT 60`);
  const rows = (Array.isArray(result) ? (Array.isArray(result[0]) ? result[0] : result) : []) as Record<string, unknown>[];
  const readings: Reading[] = rows.map(r => ({ id: Number(r.id), kind: String(r.kind), dateKey: String(r.dateKey), answers: safe(r.answersJson, {}), report: safe(r.reportJson, null), planDone: safe<number[]>(r.planDoneJson, []) }));
  const journey = (await getJourneyState(userId))?.state ?? null;
  const astral = readings.find(r => r.kind === "mapa_astral" && r.answers?.input?.forSelf !== false)?.answers?.input?.fullName;
  const looksEmail = (s?: string | null) => !s || s.includes("@");
  const name = [astral, !looksEmail(profile?.displayName) && profile?.displayName, !looksEmail(user.name) && user.name].find(Boolean) || user.email.split("@")[0];
  return { email: user.email, data: { name, generatedAt: new Date(), journey, profile: profile ?? null, readings, pdi: pdiRow ? safe(pdiRow.planJson, null) : null } as JornadaData };
}

const lastSent = new Map<number, number>();
export async function emailJornadaPdf(userId: number) {
  const now = Date.now();
  if (now - (lastSent.get(userId) ?? 0) < 60_000) throw new Error("Seu PDF acabou de ser enviado. Confira seu e-mail em instantes.");
  const apiKey = process.env.RESEND_API_KEY; const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) throw new Error("O envio de e-mail ainda não está configurado.");
  const { email, data } = await loadJornada(userId);
  const pdf = renderPdf(buildJornadaBlocks(data));
  const stamp = data.generatedAt.toISOString().slice(0, 10);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from, to: [email],
      subject: "Sua Jornada do Herói - Nova Odisseia",
      text: `Olá, ${data.name}.\n\nSua Jornada do Herói está anexada em PDF: uma foto do momento com seu Chamado, meta, Vida 360, missões, leituras do Oráculo, PDI e planos de ação.\n\nNova Odisseia`,
      html: `<p>Olá, ${data.name.replace(/[<>&]/g, "")}.</p><p>Sua <strong>Jornada do Herói</strong> está anexada em PDF: uma foto do momento com seu Chamado, meta, Vida 360, missões, leituras do Oráculo, PDI e planos de ação.</p><p>Nova Odisseia</p>`,
      attachments: [{ filename: `jornada-do-heroi-${stamp}.pdf`, content: pdf.toString("base64"), content_type: "application/pdf" }],
    }),
  });
  if (!response.ok) throw new Error("Não foi possível enviar o PDF agora. Tente novamente em alguns minutos.");
  lastSent.set(userId, now);
  const result = await response.json() as { id?: string };
  return { email, pages: (pdf.toString("latin1").match(/\/Type \/Page /g) ?? []).length, resendId: result.id || "" };
}
