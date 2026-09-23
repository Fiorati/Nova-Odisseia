import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { journeyStates } from "../drizzle/schema";

const database = () => {
  if (!process.env.DATABASE_URL) throw new Error("Banco de dados indisponível.");
  return drizzle(process.env.DATABASE_URL);
};
// A migração 0033 não foi aplicada em produção; garante a tabela sem apagar nada.
let ensured: Promise<unknown> | null = null;
function ensureJourneyTable() {
  ensured ??= database().execute(sql.raw("CREATE TABLE IF NOT EXISTS `journey_states` (`id` int AUTO_INCREMENT NOT NULL, `userId` int NOT NULL, `stateJson` text NOT NULL, `createdAt` timestamp NOT NULL DEFAULT (now()), `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP, CONSTRAINT `journey_states_id` PRIMARY KEY(`id`), CONSTRAINT `journey_states_user_unique` UNIQUE(`userId`))")).catch(error => { ensured = null; throw error; });
  return ensured;
}
export async function getJourneyState(userId: number) {
  await ensureJourneyTable();
  const rows = await database().select({ stateJson: journeyStates.stateJson, updatedAt: journeyStates.updatedAt }).from(journeyStates).where(eq(journeyStates.userId, userId)).limit(1);
  if (!rows[0]) return null;
  try { return { state: JSON.parse(rows[0].stateJson), updatedAt: rows[0].updatedAt }; } catch { return null; }
}
export async function saveJourneyState(userId: number, state: unknown) {
  await ensureJourneyTable();
  const stateJson = JSON.stringify(state);
  await database().insert(journeyStates).values({ userId, stateJson }).onDuplicateKeyUpdate({ set: { stateJson, updatedAt: new Date() } });
  return { success: true } as const;
}
