import { afterAll, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import { agentProfiles, users } from "../drizzle/schema";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";

const integrationIt = process.env.DATABASE_URL ? it : it.skip;
const ids: number[] = [];
const selection = { hardSkillIds: ["closing-techniques", "pipeline-crm", "conversion-analytics"], softSkillIds: ["active-listening", "commercial-empathy", "clear-communication"], developmentGoal: "Aprimorar reuniões de descoberta.", studyMinutes: 25 };

async function createUser(name: string) {
  const db = await getDb(); const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const created = await db.insert(users).values({ openId: `spartacus_${suffix}`, name, email: `spartacus_${suffix}@example.invalid`, loginMethod: "integration-test" }).$returningId(); const id = created[0]?.id;
  if (!id) throw new Error("Falha ao criar usuário SPARTACUS."); ids.push(id); return id;
}
function callerFor(userId: number) { return appRouter.createCaller({ user: { id: userId, role: "user" } as TrpcContext["user"], req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] }); }

afterAll(async () => { if (!process.env.DATABASE_URL || !ids.length) return; const db = await getDb(); await db.delete(users).where(inArray(users.id, ids)); });

describe("PDI SPARTACUS", () => {
  integrationIt("salva um plano somente para seu criador e deriva o perfil de liderança do servidor", async () => {
    const db = await getDb(); const owner = await createUser("Líder SPARTACUS"); const outsider = await createUser("Outro SPARTACUS");
    await db.insert(agentProfiles).values({ userId: owner, displayName: "Líder SPARTACUS", leadershipRole: "polo", polo: "Polo SPARTACUS" });
    const created = await callerFor(owner).spartacus.create(selection);
    expect(created.learnerRole).toBe("polo");
    expect(created.plan).toMatchObject({ title: "PDI SPARTACUS — 4 semanas", studyMinutes: 25 });
    expect((await callerFor(owner).spartacus.list()).map(item => item.id)).toContain(created.id);
    expect(await callerFor(outsider).spartacus.list()).toEqual([]);
    const progress = await callerFor(owner).spartacus.progress();
    expect(progress).toMatchObject({ pdiId: created.id, overallProgress: 0 });
    expect(progress.skills).toHaveLength(6);
    await callerFor(owner).spartacus.updateProgress({ pdiId: created.id, skillId: "closing-techniques", progressPercent: 26 });
    expect((await callerFor(owner).spartacus.progress()).skills.find(skill => skill.id === "closing-techniques")?.progressPercent).toBe(25);
    expect((await callerFor(owner).notifications.list()).some(item => item.kind === "pdi_generated")).toBe(true);
    await expect(callerFor(outsider).spartacus.updateProgress({ pdiId: created.id, skillId: "closing-techniques", progressPercent: 25 })).rejects.toThrow(/PDI/i);
    expect(await callerFor(outsider).notifications.list()).toEqual([]);
  });

  integrationIt("bloqueia duplicidade de competência mesmo com três campos enviados", async () => {
    const userId = await createUser("Seleção SPARTACUS");
    await expect(callerFor(userId).spartacus.create({ ...selection, hardSkillIds: ["closing-techniques", "closing-techniques", "pipeline-crm"] })).rejects.toThrow(/três/i);
  });
});
