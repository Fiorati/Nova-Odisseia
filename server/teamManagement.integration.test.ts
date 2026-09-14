import { afterAll, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import { agentProfiles, teamDailyPromises, teamSchedules, users } from "../drizzle/schema";
import { getDb } from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const integrationIt = process.env.DATABASE_URL ? it : it.skip;
const ids: number[] = [];

async function createUser(name: string, role: "user" | "admin" = "user") {
  const db = await getDb();
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const [created] = await db.insert(users).values({ openId: `team_${suffix}`, name, email: `team_${suffix}@example.invalid`, loginMethod: "integration-test", role }).$returningId();
  if (!created?.id) throw new Error("Falha ao criar usuário de Gestão do Time.");
  ids.push(created.id);
  return created.id;
}

function callerFor(userId: number, role: "user" | "admin" = "user") {
  return appRouter.createCaller({ user: { id: userId, role } as TrpcContext["user"], req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
}

afterAll(async () => {
  if (!process.env.DATABASE_URL || !ids.length) return;
  const db = await getDb();
  await db.delete(teamSchedules).where(inArray(teamSchedules.scopeId, ids));
  await db.delete(teamDailyPromises).where(inArray(teamDailyPromises.userId, ids));
  await db.delete(users).where(inArray(users.id, ids));
});

describe("procedures da Gestão do Time", () => {
  integrationIt("aplica escopo de agente, polo, distrito e admin no backend", async () => {
    const db = await getDb();
    const agent = await createUser("Agente Time");
    const otherAgent = await createUser("Agente Outro Polo");
    const poloLeader = await createUser("Dono Polo");
    const districtLeader = await createUser("Líder Distrital");
    const outsideDistrict = await createUser("Líder Outro Distrito");
    const admin = await createUser("Admin Time", "admin");
    await db.insert(agentProfiles).values([
      { userId: agent, displayName: "Agente Time", leadershipRole: "none", regional: "Regional SP", district: "Distrito Norte", polo: "Polo A", route: "Rota A" },
      { userId: otherAgent, displayName: "Agente Outro Polo", leadershipRole: "none", regional: "Regional SP", district: "Distrito Norte", polo: "Polo B" },
      { userId: poloLeader, displayName: "Dono Polo", leadershipRole: "polo", regional: "Regional SP", district: "Distrito Norte", polo: "Polo A" },
      { userId: districtLeader, displayName: "Líder Distrital", leadershipRole: "distrital", regional: "Regional SP", district: "Distrito Norte" },
      { userId: outsideDistrict, displayName: "Líder Outro Distrito", leadershipRole: "distrital", regional: "Regional Sul", district: "Distrito Sul" },
      { userId: admin, displayName: "Admin Time", leadershipRole: "distrital" },
    ]);

    expect((await callerFor(agent).team.list()).map(item => item.userId)).toEqual([agent]);
    await expect(callerFor(agent).team.updateProfile({ targetUserId: otherAgent, about: "ataque" })).rejects.toThrow(/fora do seu escopo/i);
    await callerFor(agent).team.updateProfile({ targetUserId: agent, about: "Meu foco" });
    await callerFor(agent).team.savePromise({ targetUserId: agent, promiseDate: "2026-09-14", proposals: 2, newClients: 1, newClientsTpv: 1000, notes: "rotina" });
    await expect(callerFor(agent).team.updateProfile({ targetUserId: agent, about: "seguro", role: "admin", leadershipRole: "distrital", regional: "Outro", district: "Outro", polo: "Outro", route: "Outra" } as never)).resolves.toBeTruthy();
    const protectedAgent = (await db.select().from(agentProfiles).where(inArray(agentProfiles.userId, [agent])))[0];
    expect(protectedAgent).toMatchObject({ leadershipRole: "none", regional: "Regional SP", district: "Distrito Norte", polo: "Polo A", route: "Rota A" });

    expect((await callerFor(poloLeader).team.list()).map(item => item.userId)).toEqual([agent, poloLeader]);
    await callerFor(poloLeader).team.updateProfile({ targetUserId: agent, strengths: "escuta" });
    await expect(callerFor(poloLeader).team.updateProfile({ targetUserId: otherAgent, strengths: "não" })).rejects.toThrow(/fora do seu escopo/i);
    const createdSchedule = await callerFor(poloLeader).team.saveSchedule({ scopeType: "user", scopeId: agent, weekday: 2, startTime: "09:00", endTime: "12:00", activity: "P.A.P." });
    const agentSchedule = createdSchedule.find(item => item.scopeId === agent);
    if (!agentSchedule) throw new Error("Rotina de teste não criada.");
    await callerFor(poloLeader).team.saveSchedule({ id: agentSchedule.id, scopeType: "user", scopeId: agent, weekday: 2, startTime: "10:00", endTime: "13:00", activity: "P.A.P. atualizada" });
    await expect(callerFor(outsideDistrict).team.saveSchedule({ id: agentSchedule.id, scopeType: "user", scopeId: outsideDistrict, weekday: 2, startTime: "11:00", endTime: "14:00", activity: "IDOR" })).rejects.toThrow();
    await expect(callerFor(poloLeader).team.saveSchedule({ id: agentSchedule.id, scopeType: "user", scopeId: otherAgent, weekday: 2, startTime: "11:00", endTime: "14:00", activity: "IDOR" })).rejects.toThrow();
    await expect(callerFor(poloLeader).team.deactivateSchedule({ id: agentSchedule.id })).resolves.toMatchObject({ success: true });
    const persistedSchedule = (await db.select().from(teamSchedules).where(inArray(teamSchedules.id, [agentSchedule.id])))[0];
    expect(persistedSchedule).toMatchObject({ scopeId: agent, startTime: "10:00", activity: "P.A.P. atualizada", active: false });
    await expect(callerFor(poloLeader).team.savePromise({ targetUserId: otherAgent, promiseDate: "2026-09-14", proposals: 9, newClients: 9, newClientsTpv: 9000 })).rejects.toThrow(/fora do seu escopo/i);

    expect((await callerFor(districtLeader).team.list()).map(item => item.userId)).toEqual(expect.arrayContaining([agent, districtLeader, poloLeader]));
    await callerFor(districtLeader).team.saveSchedule({ scopeType: "user", scopeId: agent, weekday: 3, startTime: "08:00", endTime: "11:00", activity: "Reunião distrital" });
    await expect(callerFor(outsideDistrict).team.updateProfile({ targetUserId: agent, currentFocus: "não" })).rejects.toThrow(/fora do seu escopo/i);
    expect((await callerFor(admin, "admin").team.list()).map(item => item.userId)).toEqual(expect.arrayContaining(ids));
  });
});
