import { randomUUID } from "node:crypto";
import { securityAuditEvents } from "../drizzle/schema";
import { createPassword } from "./credentials";
import { activatePendingEmailAccount, getDb } from "./db";
import { saveJourneyState } from "./journeyPersistence";
import { createPendingNavigatorInvite } from "./navigatorInvites";
import type { JourneyStateInput } from "./journeyState";

/** ADMIN cria o acesso com senha inicial e entrega a jornada já preenchida. Não envia e-mail. */
export async function createMentoredNavigator(actorUserId: number, input: { name: string; email: string; password: string; journey: JourneyStateInput }) {
  const pending = await createPendingNavigatorInvite(actorUserId, { name: input.name, email: input.email });
  const credentials = await createPassword(input.password);
  const user = await activatePendingEmailAccount(pending.userId, { name: pending.name, openId: `email_${randomUUID().replaceAll("-", "")}`, ...credentials });
  if (!user) throw new Error("Não foi possível ativar o acesso.");
  await saveJourneyState(user.id, input.journey);
  const db = await getDb();
  await db.insert(securityAuditEvents).values({ actorUserId, eventType: "navigator_created_with_pdi", targetType: "user", targetId: String(user.id), scope: pending.email });
  return { userId: user.id, name: pending.name, email: pending.email };
}
