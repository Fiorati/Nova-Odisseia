import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { agentProfiles, securityAuditEvents, users } from "../drizzle/schema";
import { getDb, getUserByEmail } from "./db";

export async function createPendingNavigatorInvite(actorUserId: number, input: { name: string; email: string }) {
  const db = await getDb();
  const actor = (await db.select({ role: users.role }).from(users).where(eq(users.id, actorUserId)).limit(1))[0];
  if (actor?.role !== "admin") throw new Error("Apenas ADMIN pode convidar navegantes.");
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim().slice(0, 120);
  const existing = await getUserByEmail(email);
  if (existing && existing.loginMethod !== "team-invite") throw new Error("Já existe uma conta ativa com este e-mail.");
  let userId = existing?.id;
  if (!userId) {
    const created = await db.insert(users).values({ openId: `pending_${randomUUID().replaceAll("-", "")}`, name, email, loginMethod: "team-invite", role: "user" }).$returningId();
    userId = created[0]?.id;
    if (!userId) throw new Error("Não foi possível criar o convite.");
    await db.insert(agentProfiles).values({ userId, displayName: name, leadershipRole: "none", profileVisibleInRanking: false });
  } else await db.update(users).set({ name }).where(eq(users.id, userId));
  await db.insert(securityAuditEvents).values({ actorUserId, eventType: existing ? "navigator_invite_resent" : "navigator_invite_created", targetType: "user", targetId: String(userId), scope: email });
  return { userId, name, email, status: "pending" as const };
}
