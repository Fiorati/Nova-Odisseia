import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { rmrRecords, users } from "../drizzle/schema";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";

const integrationIt = process.env.DATABASE_URL ? it : it.skip;
const ids: number[] = [];

async function createUser() {
  const db = await getDb(); const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const created = await db.insert(users).values({ openId: `rmr_${suffix}`, name: "Agente RMR", email: `rmr_${suffix}@example.invalid`, loginMethod: "integration-test" }).$returningId();
  const id = created[0]?.id; if (!id) throw new Error("Falha ao criar usuário temporário."); ids.push(id); return id;
}

function callerFor(userId: number) { return appRouter.createCaller({ user: { id: userId } as TrpcContext["user"], req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] }); }

afterAll(async () => { if (!process.env.DATABASE_URL || !ids.length) return; const db = await getDb(); for (const id of ids) await db.delete(users).where(eq(users.id, id)); });

describe("RMR com plano de ação", () => {
  integrationIt("persiste causa-raiz, ação, responsável, resultado e prazo junto aos indicadores", async () => {
    const userId = await createUser(); const dueAt = new Date("2026-09-05T12:00:00.000Z");
    await callerFor(userId).rmr.save({ periodLabel: "Agosto 2026", workingDays: 20, salesTasks: 150, proposals: 30, closedClients: 8, closedTpv: 210000, goalTpv: 300000, variableValue: 5200, rootCause: "Baixa cadência de propostas", actionPlan: "Executar duas propostas por dia", owner: "Agente RMR", expectedResult: "Atingir 40 propostas", dueAt });
    const db = await getDb(); const [record] = await db.select().from(rmrRecords).where(eq(rmrRecords.userId, userId)).limit(1);
    expect(record).toMatchObject({ rootCause: "Baixa cadência de propostas", actionPlan: "Executar duas propostas por dia", owner: "Agente RMR", expectedResult: "Atingir 40 propostas" });
    expect(record?.dueAt?.toISOString()).toBe(dueAt.toISOString());
  });
});
