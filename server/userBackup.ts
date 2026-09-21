import { and, eq, inArray } from "drizzle-orm";
import {
  agentProfiles, agentTeamProfiles, bestPracticePosts, engagementCampaigns,
  meetingLeads, meetingPeriodMetrics, monthlyFinalCards, monthlyGoals,
  newsArticles, nordicActivationPlans, nordicMicroRoutes, nordicMonthlyPlans,
  pointEvents, prospectionDossiers, prospectionSources, psvDemands,
  psvPipelineLeads, psvPlans, psvWeeklyRituals, rmrRecords,
  routePortfolioEntries, routePortfolioImports, securityAuditEvents,
  simulations, spartacusPdis, spartacusSkillProgress, teamDailyPromises,
  teamMemberRoles, teamSchedules, userNotifications, users,
} from "../drizzle/schema";
import { getDb } from "./db";

type BackupSection = { title: string; rows: Record<string, unknown>[] };

const sensitiveKeys = new Set(["passwordHash", "passwordSalt", "openId"]);

function safeRecord(row: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(row).filter(([key]) => !sensitiveKeys.has(key)));
}

function valueText(value: unknown): string {
  if (value == null || value === "") return "-";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function escapeHtml(value: unknown) {
  return valueText(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

function renderText(name: string, generatedAt: string, sections: BackupSection[]) {
  const lines = [`BACKUP DA MINHA ODISSEIA`, `Usuário: ${name}`, `Gerado em: ${generatedAt}`, ""];
  for (const section of sections) {
    lines.push(`## ${section.title} (${section.rows.length})`);
    if (!section.rows.length) lines.push("Nenhum registro.", "");
    section.rows.forEach((row, index) => {
      lines.push(`### Registro ${index + 1}`);
      Object.entries(row).forEach(([key, value]) => lines.push(`${key}: ${valueText(value)}`));
      lines.push("");
    });
  }
  return lines.join("\n");
}

function renderHtml(name: string, generatedAt: string, sections: BackupSection[]) {
  const body = sections.map(section => `<section><h2>${escapeHtml(section.title)} <small>(${section.rows.length})</small></h2>${section.rows.length ? section.rows.map((row, index) => `<article><h3>Registro ${index + 1}</h3><dl>${Object.entries(row).map(([key, value]) => `<dt>${escapeHtml(key)}</dt><dd><pre>${escapeHtml(value)}</pre></dd>`).join("")}</dl></article>`).join("") : "<p>Nenhum registro.</p>"}</section>`).join("");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Backup da Minha Odisseia</title><style>body{font-family:Arial,sans-serif;color:#123c2d;max-width:960px;margin:32px auto;padding:0 20px}h1{color:#0e3426}section{margin:28px 0}article{border:1px solid #d8eadf;border-radius:8px;padding:16px;margin:12px 0}dt{font-weight:bold;margin-top:10px}dd{margin:3px 0}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}small{font-weight:normal;color:#567}</style></head><body><h1>Backup da Minha Odisseia</h1><p><strong>Usuário:</strong> ${escapeHtml(name)}<br><strong>Gerado em:</strong> ${escapeHtml(generatedAt)}</p>${body}</body></html>`;
}

export async function buildUserBackup(userId: number) {
  const db = await getDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user?.email) throw new Error("Sua conta não possui um e-mail válido para receber o backup.");

  const dossiers = await db.select().from(prospectionDossiers).where(eq(prospectionDossiers.userId, userId));
  const dossierIds = dossiers.map(row => row.id);
  const imports = await db.select().from(routePortfolioImports).where(eq(routePortfolioImports.userId, userId));
  const importIds = imports.map(row => row.id);
  const pdis = await db.select().from(spartacusPdis).where(eq(spartacusPdis.userId, userId));

  const sections: BackupSection[] = [
    { title: "Conta", rows: [safeRecord(user as unknown as Record<string, unknown>)] },
    { title: "Perfil", rows: await db.select().from(agentProfiles).where(eq(agentProfiles.userId, userId)) },
    { title: "Papéis da equipe", rows: await db.select().from(teamMemberRoles).where(eq(teamMemberRoles.userId, userId)) },
    { title: "Metas mensais", rows: await db.select().from(monthlyGoals).where(eq(monthlyGoals.userId, userId)) },
    { title: "Simulações", rows: await db.select().from(simulations).where(eq(simulations.userId, userId)) },
    { title: "Cards finais", rows: await db.select().from(monthlyFinalCards).where(eq(monthlyFinalCards.userId, userId)) },
    { title: "Importações de carteira", rows: imports },
    { title: "Dados das carteiras importadas", rows: importIds.length ? await db.select().from(routePortfolioEntries).where(inArray(routePortfolioEntries.importId, importIds)) : [] },
    { title: "PSV - planos", rows: await db.select().from(psvPlans).where(eq(psvPlans.userId, userId)) },
    { title: "PSV - ritual semanal", rows: await db.select().from(psvWeeklyRituals).where(eq(psvWeeklyRituals.userId, userId)) },
    { title: "PSV - demandas", rows: await db.select().from(psvDemands).where(eq(psvDemands.userId, userId)) },
    { title: "PSV - pipeline", rows: await db.select().from(psvPipelineLeads).where(eq(psvPipelineLeads.userId, userId)) },
    { title: "RMR", rows: await db.select().from(rmrRecords).where(eq(rmrRecords.userId, userId)) },
    { title: "PDI Spartacus", rows: pdis },
    { title: "Progresso de competências", rows: await db.select().from(spartacusSkillProgress).where(eq(spartacusSkillProgress.userId, userId)) },
    { title: "Pontos", rows: await db.select().from(pointEvents).where(eq(pointEvents.userId, userId)) },
    { title: "Estratégia Nórdica - planos", rows: await db.select().from(nordicMonthlyPlans).where(eq(nordicMonthlyPlans.userId, userId)) },
    { title: "Estratégia Nórdica - ativações", rows: await db.select().from(nordicActivationPlans).where(eq(nordicActivationPlans.userId, userId)) },
    { title: "Estratégia Nórdica - microrrotas", rows: await db.select().from(nordicMicroRoutes).where(eq(nordicMicroRoutes.userId, userId)) },
    { title: "Dossiês de prospecção", rows: dossiers },
    { title: "Fontes dos dossiês", rows: dossierIds.length ? await db.select().from(prospectionSources).where(inArray(prospectionSources.dossierId, dossierIds)) : [] },
    { title: "Perfil de desenvolvimento", rows: await db.select().from(agentTeamProfiles).where(eq(agentTeamProfiles.userId, userId)) },
    { title: "Promessas diárias", rows: await db.select().from(teamDailyPromises).where(eq(teamDailyPromises.userId, userId)) },
    { title: "Agendas pessoais", rows: await db.select().from(teamSchedules).where(and(eq(teamSchedules.scopeType, "user"), eq(teamSchedules.scopeId, userId))) },
    { title: "Campanhas criadas", rows: await db.select().from(engagementCampaigns).where(eq(engagementCampaigns.ownerUserId, userId)) },
    { title: "Reuniões criadas", rows: await db.select().from(meetingLeads).where(eq(meetingLeads.createdByUserId, userId)) },
    { title: "Métricas de reuniões", rows: await db.select().from(meetingPeriodMetrics).where(eq(meetingPeriodMetrics.userId, userId)) },
    { title: "Melhores práticas publicadas", rows: await db.select().from(bestPracticePosts).where(eq(bestPracticePosts.authorUserId, userId)) },
    { title: "Notícias publicadas", rows: await db.select().from(newsArticles).where(eq(newsArticles.authorUserId, userId)) },
    { title: "Notificações", rows: await db.select().from(userNotifications).where(eq(userNotifications.userId, userId)) },
    { title: "Auditoria da conta", rows: await db.select().from(securityAuditEvents).where(eq(securityAuditEvents.actorUserId, userId)) },
  ].map(section => ({ ...section, rows: section.rows.map(row => safeRecord(row as unknown as Record<string, unknown>)) }));

  const generatedAt = new Date().toISOString();
  const displayName = user.name || user.email;
  const text = renderText(displayName, generatedAt, sections);
  const html = renderHtml(displayName, generatedAt, sections);
  return { email: user.email, displayName, generatedAt, sections, text, html };
}

export async function emailUserBackup(userId: number) {
  const backup = await buildUserBackup(userId);
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) throw new Error("O envio de e-mail ainda não está configurado.");
  const stamp = backup.generatedAt.slice(0, 10);
  const attachments = [
    { filename: `minha-odisseia-${stamp}.txt`, content: Buffer.from(backup.text).toString("base64") },
    { filename: `minha-odisseia-${stamp}.html`, content: Buffer.from(backup.html).toString("base64") },
    { filename: `minha-odisseia-${stamp}.doc`, content: Buffer.from(backup.html).toString("base64"), content_type: "application/msword" },
  ];
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [backup.email],
      subject: "Backup da sua Nova Odisseia",
      text: `Olá, ${backup.displayName}.\n\nSeu backup está anexado nos formatos DOC, TXT e HTML. Guarde os arquivos em um local seguro.\n\nNova Odisseia: Fiorati`,
      html: `<p>Olá, ${escapeHtml(backup.displayName)}.</p><p>Seu backup está anexado nos formatos <strong>DOC, TXT e HTML</strong>. Guarde os arquivos em um local seguro.</p><p>Nova Odisseia: Fiorati</p>`,
      attachments,
    }),
  });
  if (!response.ok) throw new Error("Não foi possível enviar o backup agora. Tente novamente em alguns minutos.");
  const result = await response.json() as { id?: string };
  return { email: backup.email, generatedAt: backup.generatedAt, resendId: result.id || "" };
}

export const __test = { renderText, renderHtml };
