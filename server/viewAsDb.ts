import { eq } from "drizzle-orm";
import { users } from "../drizzle/schema";
import { getDb } from "./db";

export async function getUserById(id: number) {
  const db = await getDb();
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

/** Lista enxuta de e-mails para o seletor "ver como usuário" (só Admin). */
export async function listUsersForViewAs() {
  const db = await getDb();
  const rows = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .orderBy(users.email)
    .limit(2000);
  return rows.filter(row => Boolean(row.email));
}
