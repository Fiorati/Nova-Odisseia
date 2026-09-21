import { and, eq } from "drizzle-orm";
import { securityAuditEvents, users } from "../drizzle/schema";
import { getDb } from "./db";

export const MIGRATION_NOTICE_EVENT = "migration_notice_20260920";
export const MIGRATION_NOTICE_SUBJECT = "Nova Odisseia será atualizada até 25 de setembro";
export const MIGRATION_NOTICE_TEXT = `Olá,

A Nova Odisseia passará por uma atualização para reforçar segurança, compliance e a separação entre projetos pessoais e informações da Stone.

Após reuniões com os times de Excelência Operacional e Produto e com diretores das áreas envolvidas, recebi a orientação de reorganizar a plataforma. A Nova Odisseia seguirá como uma plataforma pessoal de Gabriel Fiorati para seus próprios desenvolvimentos e produtos, sem cruzamento com informações da Stone e sem conflito de interesses.

Os recursos voltados ao apoio de agentes e líderes distritais serão revistos conforme as diretrizes de segurança e compliance. O que puder permanecer nesse formato será disponibilizado separadamente por link, em uma aplicação web do Google, com apoio de Google AI e Google Apps Script. Nenhuma informação de cliente ou conteúdo confidencial fará parte dessa solução.

Algumas funcionalidades atuais serão mantidas e outras deixarão a plataforma. Por isso, salve até 24 de setembro qualquer informação sua que queira preservar.

Em breve, enviarei as orientações de acesso à nova experiência.

Atenciosamente,
Gabriel Fiorati`;

export async function sendApprovedMigrationNotice(actorUserId: number) {
  const db = await getDb();
  const [actor] = await db.select({ role: users.role }).from(users).where(eq(users.id, actorUserId)).limit(1);
  if (!actor || actor.role !== "admin") throw new Error("Acesso administrativo global necessário.");

  const from = process.env.EMAIL_FROM?.trim();
  const apiKey = process.env.RESEND_API_KEY;
  if (from?.toLowerCase() !== "fiorati@novaodisseia.com") {
    throw new Error("EMAIL_FROM não corresponde a fiorati@novaodisseia.com.");
  }
  if (!apiKey) throw new Error("RESEND_API_KEY não configurada.");

  const registered = await db
    .select({ email: users.email })
    .from(users)
    .orderBy(users.id)
    .limit(5000);
  const emails = Array.from(new Set(registered.map(row => row.email?.trim().toLowerCase()).filter((email): email is string => Boolean(email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)))));
  const results: Array<{ email: string; status: "sent" | "already_sent" | "failed"; resendId?: string; error?: string }> = [];

  for (const email of emails) {
    const [prior] = await db.select({ id: securityAuditEvents.id }).from(securityAuditEvents).where(and(eq(securityAuditEvents.eventType, MIGRATION_NOTICE_EVENT), eq(securityAuditEvents.targetId, email))).limit(1);
    if (prior) {
      results.push({ email, status: "already_sent" });
      continue;
    }
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [email], subject: MIGRATION_NOTICE_SUBJECT, text: MIGRATION_NOTICE_TEXT }),
      });
      const payload = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
      if (!response.ok || !payload.id) throw new Error(payload.message || `Resend HTTP ${response.status}`);
      await db.insert(securityAuditEvents).values({ actorUserId, eventType: MIGRATION_NOTICE_EVENT, targetType: "registered_user_email", targetId: email, scope: `resend:${payload.id}`.slice(0, 160) });
      results.push({ email, status: "sent", resendId: payload.id });
    } catch (error) {
      results.push({ email, status: "failed", error: error instanceof Error ? error.message : "Falha desconhecida" });
    }
  }

  return { from, registeredRows: registered.length, validUniqueRecipients: emails.length, results };
}
