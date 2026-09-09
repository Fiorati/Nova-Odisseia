import { randomUUID } from "node:crypto";
import { z } from "zod";
import { COOKIE_NAME } from "../shared/const";
import { calculateRmrKpi } from "../shared/metrics";
import {
  assignRouteOwner,
  createEngagementCampaign,
  createProspectionDossier,
  createSpartacusPdi,
  listAdminProfiles,
  createEmailAccount,
  ensureTestAdminAccount,
  ensureUlissesAdminAccount,
  getEmailVerificationChallenge,
  getCredentialsForUser,
  getDashboard,
  getDistrictLeaderOverview,
  getSalesPipelineForLeader,
  getSharedGoogleSheetFile,
  getPasswordResetChallenge,
  getLeaderboard,
  getLeaderOverview,
  getMonthlyFinalCard,
  getMonthlyFinalCardSuggestion,
  getMonthlyTrophies,
  getPrivateGoal,
  getPrivatePipelineLeads,
  getPrivatePlanHistory,
  getPsvWeeklyRitual,
  getProspectionRecommendations,
  getRoutePortfolioForUser,
  importStoneLeadList,
  getNordicStrategy,
  importDistrictPortfolio,
  importPoloPortfolio,
  importRoutePortfolio,
  listRouteAssignmentsForLeader,
  listSpartacusPdis,
  getSpartacusProgressSummary,
  updateSpartacusSkillProgress,
  listUserNotifications,
  markUserNotificationRead,
  listEngagementCampaigns,
  listProspectionDossiers,
  getUserByEmail,
  getTioPatinhasLeaderboard,
  saveMonthlyGoal,
  saveMonthlyFinalCard,
  savePipelineLead,
  savePsvPlan,
  savePsvWeeklyRitual,
  saveRmrRecord,
  saveSimulation,
  saveEmailVerificationChallenge,
  savePasswordResetChallenge,
  replaceEmailPassword,
  updateProfile,
  removePipelineLead,
  removeNordicActivationPlan,
  removeNordicMicroRoute,
  saveNordicActivationPlan,
  saveNordicMicroRoute,
  saveNordicMonthlyPlan,
  setLeadershipRole,
  updateEmailVerificationChallenge,
  updateAdminProfile,
  updateEngagementCampaign,
  updatePasswordResetChallenge,
  updateProspectionDossier,
  researchProspectionCnpj,
} from "./db";
import { createPassword, normalizedEmail, verifyPassword } from "./credentials";
import { getDailyItakaMessage } from "./itakaDailyMessage";
import { createVerificationCode, createVerificationToken, isAllowedRegistrationEmail, sendPasswordResetCode, sendRegistrationCode } from "./registration";
import { getSessionCookieOptions } from "./_core/cookies";
import { createSessionToken } from "./_core/session";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

const passwordSchema = z.string().min(8, "A senha precisa ter pelo menos 8 caracteres.").max(128);
const campaignInputSchema = z.object({
  scope: z.enum(["polo", "distrital"]), regional: z.string().trim().max(120).optional(), district: z.string().trim().max(120).optional(), polo: z.string().trim().max(120).optional(),
  title: z.string().trim().min(2).max(160), objective: z.string().trim().max(3000).optional(), status: z.enum(["rascunho", "ativa", "concluida", "arquivada"]),
  startAt: z.date().nullable().optional(), endAt: z.date().nullable().optional(), targetParticipants: z.number().int().min(0).max(10000), targetParticipationRate: z.number().min(0).max(100), targetPsvs: z.number().int().min(0).max(10000), targetTpv: z.number().min(0), targetNewClients: z.number().int().min(0).max(100000),
  actualParticipants: z.number().int().min(0).max(10000).optional(), actualPsvs: z.number().int().min(0).max(10000).optional(), actualTpv: z.number().min(0).optional(), actualNewClients: z.number().int().min(0).max(100000).optional(),
});
const accountSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(120),
  email: z.string().trim().email("Informe um e-mail válido."),
  leadershipRole: z.enum(["none", "polo", "distrital"]).default("none"),
});
const directAccountSchema = accountSchema.extend({ password: passwordSchema });

async function setSession(ctx: { req: Parameters<typeof getSessionCookieOptions>[0]; res: { cookie: (name: string, value: string, options: Record<string, unknown>) => void } }, openId: string, name: string) {
  const token = await createSessionToken(openId, name);
  ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: 1000 * 60 * 60 * 24 * 365 });
}

const simulationSchema = z.object({
  periodLabel: z.string().trim().min(2).max(80),
  goalTpv: z.number().min(0),
  eligibleTpv: z.number().min(0),
  hunterTpv: z.number().min(0),
  newSalesBase: z.number().min(0),
  multiplier: z.number().min(0).max(3),
  finalVariable: z.number().min(0),
  detailsJson: z.string().max(65000).optional(),
});

export const monthlyFinalCardInputSchema = z.object({
  monthKey: z.string().regex(/^\d{4}-\d{2}$/),
  // O KPI pode ultrapassar 150% em meses de superação; não há teto artificial.
  globalKpi: z.number().min(0),
  totalMigratedTpv: z.number().min(0),
  multiplier: z.number().min(0).max(3),
  actualVariable: z.number().min(0),
  clients7To15: z.number().int().min(0),
  clients15To30: z.number().int().min(0),
  clients30To50: z.number().int().min(0),
  clients50To100: z.number().int().min(0),
  clients100Plus: z.number().int().min(0),
});

export const appRouter = router({
  system: systemRouter,
  identity: router({
    configuration: publicProcedure.query(() => ({
  title: process.env.VITE_APP_TITLE ?? "Nova Odisseia: Fiorati",
})),
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),
    register: publicProcedure.input(directAccountSchema).mutation(async ({ ctx, input }) => {
      const email = normalizedEmail(input.email);
      if (!isAllowedRegistrationEmail(email) || email === "sistemaulisses@gmail.com") {
        throw new Error("Apenas é possível viajar na Odisseia com e-mail corporativo Stone");
      }
      const exists = await getUserByEmail(email);
      if (exists) throw new Error("Já existe uma conta com este e-mail.");
      const credentials = await createPassword(input.password);
      const user = await createEmailAccount({ name: input.name, email, openId: `email_${randomUUID().replaceAll("-", "")}`, leadershipRole: input.leadershipRole, ...credentials });
      if (!user) throw new Error("Não foi possível criar a conta.");
      await setSession(ctx, user.openId, user.name ?? input.name);
      return { user };
    }),
    requestRegistrationCode: publicProcedure.input(accountSchema).mutation(async ({ input }) => {
      const email = normalizedEmail(input.email);
      if (!isAllowedRegistrationEmail(email)) throw new Error("Novos cadastros são exclusivos para e-mails @stone.com.br.");
      const exists = await getUserByEmail(email);
      if (exists) throw new Error("Já existe uma conta com este e-mail.");
      const verification = await createVerificationCode();
      await saveEmailVerificationChallenge({ email, name: input.name, leadershipRole: input.leadershipRole, codeHash: verification.passwordHash, codeSalt: verification.passwordSalt, expiresAt: new Date(Date.now() + 15 * 60 * 1000) });
      await sendRegistrationCode({ email, name: input.name, code: verification.code });
      return { success: true };
    }),
    verifyRegistrationCode: publicProcedure.input(z.object({ email: z.string().email(), code: z.string().regex(/^\d{6}$/, "Informe o código de seis dígitos.") })).mutation(async ({ input }) => {
      const email = normalizedEmail(input.email);
      const challenge = await getEmailVerificationChallenge(email);
      if (!challenge || challenge.consumedAt || challenge.expiresAt.getTime() < Date.now()) throw new Error("O código expirou. Solicite um novo código.");
      if (challenge.attempts >= 5) throw new Error("Você excedeu as tentativas. Solicite um novo código.");
      if (!(await verifyPassword(input.code, challenge.codeSalt, challenge.codeHash))) {
        await updateEmailVerificationChallenge(email, { attempts: challenge.attempts + 1 });
        throw new Error("Código incorreto. Verifique o e-mail e tente novamente.");
      }
      const token = await createVerificationToken();
      await updateEmailVerificationChallenge(email, { verificationTokenHash: token.passwordHash, verificationTokenSalt: token.passwordSalt, verifiedAt: new Date() });
      return { verificationToken: token.token };
    }),
    completeRegistration: publicProcedure.input(z.object({ email: z.string().email(), password: passwordSchema, verificationToken: z.string().uuid() })).mutation(async ({ ctx, input }) => {
      const email = normalizedEmail(input.email);
      const challenge = await getEmailVerificationChallenge(email);
      if (!challenge?.verifiedAt || challenge.consumedAt || challenge.expiresAt.getTime() < Date.now()) throw new Error("Confirmação inválida ou expirada. Solicite um novo código.");
      if (!(await verifyPassword(input.verificationToken, challenge.verificationTokenSalt, challenge.verificationTokenHash))) throw new Error("Confirmação inválida. Solicite um novo código.");
      const exists = await getUserByEmail(email);
      if (exists) throw new Error("Já existe uma conta com este e-mail.");
      const credentials = await createPassword(input.password);
      const user = await createEmailAccount({
        name: challenge.name,
        email,
        openId: `email_${randomUUID().replaceAll("-", "")}`,
        leadershipRole: challenge.leadershipRole,
        ...credentials,
      });
      if (!user) throw new Error("Não foi possível criar a conta.");
      await updateEmailVerificationChallenge(email, { consumedAt: new Date() });
      await setSession(ctx, user.openId, user.name ?? challenge.name);
      return { user };
    }),
    requestPasswordReset: publicProcedure.input(z.object({ email: z.string().email() })).mutation(async ({ input }) => {
      const email = normalizedEmail(input.email);
      const user = await getUserByEmail(email);
      // A resposta é neutra para não confirmar se um endereço possui conta.
      if (!user) return { success: true };
      const verification = await createVerificationCode();
      await savePasswordResetChallenge({ userId: user.id, codeHash: verification.passwordHash, codeSalt: verification.passwordSalt, expiresAt: new Date(Date.now() + 15 * 60 * 1000) });
      await sendPasswordResetCode({ email, name: user.name ?? "agente", code: verification.code });
      return { success: true };
    }),
    verifyPasswordReset: publicProcedure.input(z.object({ email: z.string().email(), code: z.string().regex(/^\d{6}$/, "Informe o código de seis dígitos.") })).mutation(async ({ input }) => {
      const user = await getUserByEmail(normalizedEmail(input.email));
      if (!user) throw new Error("Código inválido, expirado ou indisponível.");
      const challenge = await getPasswordResetChallenge(user.id);
      if (!challenge || challenge.consumedAt || challenge.expiresAt.getTime() < Date.now() || challenge.attempts >= 5) throw new Error("Código inválido, expirado ou indisponível.");
      if (!(await verifyPassword(input.code, challenge.codeSalt, challenge.codeHash))) {
        await updatePasswordResetChallenge(user.id, { attempts: challenge.attempts + 1 });
        throw new Error("Código inválido, expirado ou indisponível.");
      }
      const token = await createVerificationToken();
      await updatePasswordResetChallenge(user.id, { resetTokenHash: token.passwordHash, resetTokenSalt: token.passwordSalt, verifiedAt: new Date() });
      return { resetToken: token.token };
    }),
    resetPassword: publicProcedure.input(z.object({ email: z.string().email(), password: passwordSchema, resetToken: z.string().uuid() })).mutation(async ({ ctx, input }) => {
      const user = await getUserByEmail(normalizedEmail(input.email));
      if (!user) throw new Error("Redefinição inválida ou expirada.");
      const challenge = await getPasswordResetChallenge(user.id);
      if (!challenge?.verifiedAt || challenge.consumedAt || challenge.expiresAt.getTime() < Date.now()) throw new Error("Redefinição inválida ou expirada.");
      if (!(await verifyPassword(input.resetToken, challenge.resetTokenSalt, challenge.resetTokenHash))) throw new Error("Redefinição inválida ou expirada.");
      const credentials = await createPassword(input.password);
      await replaceEmailPassword(user.id, credentials.passwordHash, credentials.passwordSalt);
      await updatePasswordResetChallenge(user.id, { consumedAt: new Date() });
      await setSession(ctx, user.openId, user.name ?? user.email ?? "Agente");
      return { success: true };
    }),
    login: publicProcedure.input(z.object({ email: z.string().email(), password: passwordSchema })).mutation(async ({ ctx, input }) => {
      await ensureUlissesAdminAccount();
      await ensureTestAdminAccount();
      const user = await getUserByEmail(normalizedEmail(input.email));
      if (!user) throw new Error("E-mail ou senha incorretos.");
      const credentials = await getCredentialsForUser(user.id);
      if (!credentials || !(await verifyPassword(input.password, credentials.passwordSalt, credentials.passwordHash))) {
        throw new Error("E-mail ou senha incorretos.");
      }
      await setSession(ctx, user.openId, user.name ?? user.email ?? "Agente");
      return { user };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  agent: router({
    dashboard: protectedProcedure.query(({ ctx }) => getDashboard(ctx.user.id)),
    dailyItakaMessage: protectedProcedure.query(() => getDailyItakaMessage()),
    profile: protectedProcedure.input(z.object({
      displayName: z.string().trim().min(2).max(120),
      targetVariable: z.number().min(0),
      defaultGoalTpv: z.number().min(0),
      defaultGoalNewClients: z.number().int().min(0).optional(),
      profileVisibleInRanking: z.boolean(),
      leadershipRole: z.enum(["none", "polo", "distrital"]).optional(),
      regional: z.string().trim().max(120),
      district: z.string().trim().max(120),
      polo: z.string().trim().max(120),
      route: z.string().trim().max(120),
    })).mutation(async ({ ctx, input }) => {
      await updateProfile(ctx.user.id, input);
      return { success: true };
    }),
    goal: protectedProcedure.input(z.object({
      monthKey: z.string().regex(/^\d{4}-\d{2}$/),
      targetVariable: z.number().min(0), targetTpv: z.number().min(0), targetNewClients: z.number().int().min(0), actualTpv: z.number().min(0), actualVariable: z.number().min(0),
    })).mutation(async ({ ctx, input }) => {
      await saveMonthlyGoal(ctx.user.id, input);
      return { success: true };
    }),
    currentGoal: protectedProcedure.input(z.object({ monthKey: z.string().regex(/^\d{4}-\d{2}$/) })).query(({ ctx, input }) => getPrivateGoal(ctx.user.id, input.monthKey)),
    leadership: protectedProcedure.input(z.object({ role: z.enum(["none", "polo", "distrital"]) })).mutation(async ({ ctx, input }) => {
      await setLeadershipRole(ctx.user.id, input.role);
      return { success: true };
    }),
  }),
  monthlyCard: router({
    get: protectedProcedure.input(z.object({ monthKey: z.string().regex(/^\d{4}-\d{2}$/) })).query(async ({ ctx, input }) => {
      const [card, suggestion] = await Promise.all([
        getMonthlyFinalCard(ctx.user.id, input.monthKey),
        getMonthlyFinalCardSuggestion(ctx.user.id),
      ]);
      return { card, suggestion };
    }),
    save: protectedProcedure.input(monthlyFinalCardInputSchema).mutation(async ({ ctx, input }) => {
      await saveMonthlyFinalCard(ctx.user.id, input);
      return { success: true };
    }),
  }),
  portfolio: router({
    assignments: protectedProcedure.query(({ ctx }) => listRouteAssignmentsForLeader(ctx.user.id)),
    assignRoute: protectedProcedure.input(z.object({ route: z.string().trim().min(2).max(120), agentName: z.string().trim().max(120), agentEmail: z.string().trim().email(), regional: z.string().trim().max(120).optional(), district: z.string().trim().max(120).optional(), polo: z.string().trim().max(120).optional() })).mutation(({ ctx, input }) => assignRouteOwner(ctx.user.id, input)),
    getForMyRoute: protectedProcedure.input(z.object({ portfolioType: z.enum(["base", "route"]), referenceMonth: z.string().regex(/^\d{4}-\d{2}$/).optional() })).query(({ ctx, input }) => getRoutePortfolioForUser(ctx.user.id, input.portfolioType, input.referenceMonth)),
    importStoneLeadList: protectedProcedure.input(z.object({ url: z.string().url().max(12_000), referenceMonth: z.string().regex(/^\d{4}-\d{2}$/).optional() })).mutation(({ ctx, input }) => importStoneLeadList(ctx.user.id, input)),
    googleSheet: protectedProcedure.input(z.object({ url: z.string().url().max(2000), scope: z.enum(["polo", "district"]) })).mutation(({ ctx, input }) => getSharedGoogleSheetFile(ctx.user.id, input)),
    import: protectedProcedure.input(z.object({
      portfolioType: z.enum(["base", "route"]),
      fileName: z.string().trim().min(1).max(255),
      fileDataBase64: z.string().min(8).max(17_000_000),
      fileMimeType: z.string().max(128).optional(),
      referenceMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
      rows: z.array(z.object({
        route: z.string().max(120),
        clientName: z.string().max(160),
        document: z.string().max(32).optional(),
        mcc: z.string().max(8).optional(),
        cnae: z.string().max(24).optional(),
        segment: z.string().max(160).optional(),
        projectedTpv: z.number().min(0).optional(),
        stage: z.string().max(80).optional(),
        temperature: z.string().max(32).optional(),
        nextContactAt: z.date().nullable().optional(),
        notes: z.string().max(4000).optional(),
        rawJson: z.string().max(6000).optional(),
      })).min(1).max(5000),
    })).mutation(({ ctx, input }) => importRoutePortfolio(ctx.user.id, input)),
    importPolo: protectedProcedure.input(z.object({
      portfolioType: z.enum(["base", "route"]),
      fileName: z.string().trim().min(1).max(255),
      fileDataBase64: z.string().min(8).max(17_000_000),
      fileMimeType: z.string().max(128).optional(),
      referenceMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
      rows: z.array(z.object({
        route: z.string().max(120), clientName: z.string().max(160), document: z.string().max(32).optional(), mcc: z.string().max(8).optional(), cnae: z.string().max(24).optional(), segment: z.string().max(160).optional(), projectedTpv: z.number().min(0).optional(), stage: z.string().max(80).optional(), temperature: z.string().max(32).optional(), nextContactAt: z.date().nullable().optional(), notes: z.string().max(4000).optional(), rawJson: z.string().max(6000).optional(),
      })).min(1).max(5000),
    })).mutation(({ ctx, input }) => importPoloPortfolio(ctx.user.id, input)),
    importDistrict: protectedProcedure.input(z.object({
      portfolioType: z.enum(["base", "route"]),
      fileName: z.string().trim().min(1).max(255),
      fileDataBase64: z.string().min(8).max(17_000_000),
      fileMimeType: z.string().max(128).optional(),
      referenceMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
      rows: z.array(z.object({
        route: z.string().max(120), clientName: z.string().max(160), document: z.string().max(32).optional(), mcc: z.string().max(8).optional(), cnae: z.string().max(24).optional(), segment: z.string().max(160).optional(), projectedTpv: z.number().min(0).optional(), stage: z.string().max(80).optional(), temperature: z.string().max(32).optional(), nextContactAt: z.date().nullable().optional(), notes: z.string().max(4000).optional(), rawJson: z.string().max(6000).optional(),
      })).min(1).max(5000),
    })).mutation(({ ctx, input }) => importDistrictPortfolio(ctx.user.id, input)),
  }),
  simulation: router({
    save: protectedProcedure.input(simulationSchema).mutation(async ({ ctx, input }) => {
      await saveSimulation(ctx.user.id, input);
      return { success: true };
    }),
  }),
  campaigns: router({
    list: protectedProcedure.query(({ ctx }) => listEngagementCampaigns(ctx.user.id)),
    create: protectedProcedure.input(campaignInputSchema).mutation(({ ctx, input }) => createEngagementCampaign(ctx.user.id, input)),
    update: protectedProcedure.input(campaignInputSchema.extend({ id: z.number().int().positive() })).mutation(({ ctx, input }) => { const { id, ...campaign } = input; return updateEngagementCampaign(ctx.user.id, id, campaign); }),
  }),
  psv: router({
    history: protectedProcedure.query(({ ctx }) => getPrivatePlanHistory(ctx.user.id)),
    pipeline: protectedProcedure.query(({ ctx }) => getPrivatePipelineLeads(ctx.user.id)),
    weeklyRitual: protectedProcedure.input(z.object({ weekOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })).query(({ ctx, input }) => getPsvWeeklyRitual(ctx.user.id, input.weekOf)),
    saveLead: protectedProcedure.input(z.object({
      id: z.number().int().positive().optional(), clientName: z.string().trim().min(2).max(160), temperature: z.enum(["quente", "frio"]),
      segmentId: z.string().max(96), segmentLabel: z.string().max(160), mcc: z.string().max(8), cnae: z.string().max(24), projectedTpv: z.number().min(0),
      nextContactAt: z.date().nullable().optional(), stage: z.enum(["mapeado", "qualificando", "planejado", "negociacao"]),
    })).mutation(async ({ ctx, input }) => {
      await savePipelineLead(ctx.user.id, input);
      return { success: true };
    }),
    removeLead: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await removePipelineLead(ctx.user.id, input.id);
      return { success: true };
    }),
    saveWeeklyRitual: protectedProcedure.input(z.object({ weekOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), dailyResult: z.string().max(3000).optional(), dailyPlan: z.string().max(3000).optional(), weeklyRoute: z.string().max(3000).optional(), preparedLeadIds: z.array(z.number().int().positive()).max(30).optional() })).mutation(({ ctx, input }) => savePsvWeeklyRitual(ctx.user.id, input)),
    save: protectedProcedure.input(z.object({
      weekOf: z.string().min(8).max(10), targetVariable: z.number().min(0), currentVariable: z.number().min(0), plannedMultiplier: z.number().min(0.1).max(3), weeksRemaining: z.number().int().min(1).max(8),
      recommendedTpv: z.number().min(0), recommendedClients30: z.number().int().min(0), recommendedClients50: z.number().int().min(0), recommendedClients100: z.number().int().min(0), notes: z.string().max(2000).optional(),
    })).mutation(async ({ ctx, input }) => {
      const result = await savePsvPlan(ctx.user.id, input);
      return { success: true, ...result };
    }),
  }),
  rmr: router({
    save: protectedProcedure.input(z.object({
      periodLabel: z.string().trim().min(2).max(80), workingDays: z.number().int().min(1).max(31), salesTasks: z.number().int().min(0), proposals: z.number().int().min(0), closedClients: z.number().int().min(0),
      closedTpv: z.number().min(0), goalTpv: z.number().min(0), variableValue: z.number().min(0), rootCause: z.string().trim().max(3000).optional(), actionPlan: z.string().trim().max(3000).optional(), owner: z.string().trim().max(120).optional(), expectedResult: z.string().trim().max(3000).optional(), dueAt: z.date().nullable().optional(),
    })).mutation(async ({ ctx, input }) => {
      const { globalKpi } = calculateRmrKpi(input);
      const pointsAwarded = await saveRmrRecord(ctx.user.id, { ...input, globalKpi, pointsAwarded: 0 });
      return { globalKpi, pointsAwarded };
    }),
  }),
  prospection: router({
    list: protectedProcedure.query(({ ctx }) => listProspectionDossiers(ctx.user.id)),
    recommendations: protectedProcedure.query(({ ctx }) => getProspectionRecommendations(ctx.user.id)),
    create: protectedProcedure.input(z.object({ clientName: z.string().trim().min(2).max(160), cnpj: z.string().max(24).optional(), routeEntryId: z.number().int().positive().optional(), hypotheses: z.string().max(3000).optional(), agentNotes: z.string().max(3000).optional() })).mutation(({ ctx, input }) => createProspectionDossier(ctx.user.id, input)),
    update: protectedProcedure.input(z.object({ id: z.number().int().positive(), stage: z.enum(["pesquisa", "preparo", "agendamento", "visita", "negociacao", "arquivado"]).optional(), hypotheses: z.string().max(3000).optional(), agentNotes: z.string().max(3000).optional() })).mutation(({ ctx, input }) => updateProspectionDossier(ctx.user.id, input)),
    researchCnpj: protectedProcedure.input(z.object({ dossierId: z.number().int().positive(), cnpj: z.string().max(24).optional() })).mutation(({ ctx, input }) => researchProspectionCnpj(ctx.user.id, input)),
  }),
  nordic: router({
    get: protectedProcedure.input(z.object({ monthKey: z.string().regex(/^\d{4}-\d{2}$/), semesterKey: z.string().regex(/^\d{4}-S[12]$/).optional() })).query(({ ctx, input }) => getNordicStrategy(ctx.user.id, input.monthKey, input.semesterKey)),
    savePlan: protectedProcedure.input(z.object({
      monthKey: z.string().regex(/^\d{4}-\d{2}$/), targetSalesTasks: z.number().int().min(0), targetProposals: z.number().int().min(0),
      targetClients7To15: z.number().int().min(0), targetClients15To30: z.number().int().min(0), targetClients30To50: z.number().int().min(0), targetClients50To100: z.number().int().min(0), targetClients100To200: z.number().int().min(0), targetClients200Plus: z.number().int().min(0), targetTpv: z.number().min(0),
      averageRv7To15: z.number().min(0), averageRv15To30: z.number().min(0), averageRv30To50: z.number().min(0), averageRv50To100: z.number().min(0), averageRv100Plus: z.number().min(0),
      actualSalesTasks: z.number().int().min(0), actualProposals: z.number().int().min(0), actualClients7To15: z.number().int().min(0), actualClients15To30: z.number().int().min(0), actualClients30To50: z.number().int().min(0), actualClients50To100: z.number().int().min(0), actualClients100To200: z.number().int().min(0), actualClients200Plus: z.number().int().min(0), actualTpv: z.number().min(0),
    })).mutation(async ({ ctx, input }) => {
      await saveNordicMonthlyPlan(ctx.user.id, input);
      return { success: true };
    }),
    saveActivation: protectedProcedure.input(z.object({
      id: z.number().int().positive().optional(), clientName: z.string().trim().min(2).max(160), stoneCode: z.string().max(48), mcc: z.string().max(8), cnae: z.string().max(24), segment: z.string().max(160), realTpv: z.number().min(0), projectedTpv: z.number().min(0),
      productsReady: z.boolean(), d15Complete: z.boolean(), d30Complete: z.boolean(), estimatedVariable: z.number().min(0), status: z.enum(["planejado", "ativacao", "acompanhamento", "concluido"]), notes: z.string().max(4000).optional(),
    })).mutation(async ({ ctx, input }) => {
      await saveNordicActivationPlan(ctx.user.id, input);
      return { success: true };
    }),
    removeActivation: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await removeNordicActivationPlan(ctx.user.id, input.id);
      return { success: true };
    }),
    saveMicroRoute: protectedProcedure.input(z.object({
      id: z.number().int().positive().optional(), area: z.string().trim().min(2).max(160), visitAt: z.date(), clientName: z.string().trim().min(2).max(160), pipelineLeadId: z.number().int().positive().nullable().optional(), priority: z.enum(["normal", "quente", "cem_mais"]), objective: z.string().trim().min(2).max(240), status: z.enum(["planejada", "concluida", "remarcada"]), notes: z.string().max(4000).optional(),
    })).mutation(async ({ ctx, input }) => {
      await saveNordicMicroRoute(ctx.user.id, input);
      return { success: true };
    }),
    removeMicroRoute: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await removeNordicMicroRoute(ctx.user.id, input.id);
      return { success: true };
    }),
  }),
  ranking: router({
    list: protectedProcedure.query(() => getLeaderboard()),
    tioPatinhas: protectedProcedure.input(z.object({ monthKey: z.string().regex(/^\d{4}-\d{2}$/) })).query(({ input }) => getTioPatinhasLeaderboard(input.monthKey)),
    trophies: protectedProcedure.input(z.object({ monthKey: z.string().regex(/^\d{4}-\d{2}$/) })).query(({ input }) => getMonthlyTrophies(input.monthKey)),
  }),
  spartacus: router({
    list: protectedProcedure.query(({ ctx }) => listSpartacusPdis(ctx.user.id)),
    progress: protectedProcedure.query(({ ctx }) => getSpartacusProgressSummary(ctx.user.id)),
    updateProgress: protectedProcedure.input(z.object({ pdiId: z.number().int().positive(), skillId: z.string().trim().min(1).max(80), progressPercent: z.number().int().min(0).max(100) })).mutation(({ ctx, input }) => updateSpartacusSkillProgress(ctx.user.id, input)),
    create: protectedProcedure.input(z.object({
      hardSkillIds: z.array(z.string().trim().min(1).max(80)).length(3),
      softSkillIds: z.array(z.string().trim().min(1).max(80)).length(3),
      developmentGoal: z.string().trim().max(400).optional(),
      studyMinutes: z.number().int().min(10).max(45),
    })).mutation(({ ctx, input }) => createSpartacusPdi(ctx.user.id, input)),
  }),
  notifications: router({
    list: protectedProcedure.query(({ ctx }) => listUserNotifications(ctx.user.id)),
    markRead: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => markUserNotificationRead(ctx.user.id, input.id)),
  }),
  admin: router({
    profiles: protectedProcedure.query(({ ctx }) => listAdminProfiles(ctx.user.id)),
    updateProfile: protectedProcedure.input(z.object({
      userId: z.number().int().positive(), displayName: z.string().trim().min(2).max(120), leadershipRole: z.enum(["none", "polo", "distrital"]),
      regional: z.string().trim().max(120), district: z.string().trim().max(120), polo: z.string().trim().max(120), route: z.string().trim().max(120),
      targetVariable: z.number().min(0).max(100_000_000), defaultGoalTpv: z.number().min(0).max(1_000_000_000), defaultGoalNewClients: z.number().int().min(0).max(1_000_000),
    })).mutation(({ ctx, input }) => updateAdminProfile(ctx.user.id, input)),
  }),
  leadership: router({
    districtLeaders: protectedProcedure.query(({ ctx }) => getDistrictLeaderOverview(ctx.user.id)),
    salesPipeline: protectedProcedure.input(z.object({ monthKey: z.string().regex(/^\d{4}-\d{2}$/).optional(), query: z.string().max(120).optional(), regional: z.string().max(120).optional(), district: z.string().max(120).optional(), polo: z.string().max(120).optional(), agent: z.string().max(120).optional() })).query(({ ctx, input }) => getSalesPipelineForLeader(ctx.user.id, input)),
    overview: protectedProcedure.input(z.object({ query: z.string().max(120).optional(), stage: z.enum(["all", "mapeado", "qualificando", "planejado", "negociacao"]).optional(), temperature: z.enum(["all", "quente", "frio"]).optional(), regional: z.string().max(120).optional(), district: z.string().max(120).optional(), polo: z.string().max(120).optional() })).query(({ ctx, input }) => getLeaderOverview(ctx.user.id, input)),
  }),
});

export type AppRouter = typeof appRouter;
