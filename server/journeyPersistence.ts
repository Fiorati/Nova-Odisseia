import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { journeyStates } from "../drizzle/schema";

const database = () => {
  if (!process.env.DATABASE_URL) throw new Error("Banco de dados indisponível.");
  return drizzle(process.env.DATABASE_URL);
};
export async function getJourneyState(userId: number) {
  const rows = await database().select({ stateJson: journeyStates.stateJson, updatedAt: journeyStates.updatedAt }).from(journeyStates).where(eq(journeyStates.userId, userId)).limit(1);
  if (!rows[0]) return null;
  try { return { state: JSON.parse(rows[0].stateJson), updatedAt: rows[0].updatedAt }; } catch { return null; }
}
export async function saveJourneyState(userId: number, state: unknown) {
  const stateJson = JSON.stringify(state);
  await database().insert(journeyStates).values({ userId, stateJson }).onDuplicateKeyUpdate({ set: { stateJson, updatedAt: new Date() } });
  return { success: true } as const;
}
