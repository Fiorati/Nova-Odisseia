import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/mysql2";
import {
  agentProfiles,
  agentTeamProfiles,
  bestPracticePosts,
  emailCredentials,
  emailVerificationChallenges,
  engagementCampaigns,
  monthlyFinalCards,
  monthlyGoals,
  meetingLeads,
  meetingPeriodMetrics,
  newsArticles,
  nordicActivationPlans,
  nordicMicroRoutes,
  nordicMonthlyPlans,
  passwordResetChallenges,
  pointEvents,
  prospectionDossiers,
  prospectionSources,
  psvPipelineLeads,
  psvPlans,
  psvDemands,
  psvWeeklyRituals,
  rmrRecords,
  routePortfolioEntries,
  routePortfolioImports,
  routeAssignments,
  securityAuditEvents,
  spartacusPdis,
  spartacusSkillProgress,
  simulations,
  teamDailyPromises,
  teamMemberRoles,
  teamSchedules,
  userNotifications,
  users,
  type InsertUser,
} from "../drizzle/schema";
import { parseGoogleSheetReference } from "../shared/googleSheets";
import {
  parsePortfolioHtmlTable,
  parsePortfolioSpreadsheetBuffer,
} from "../shared/portfolioFileParsing";
import { assertPortfolioImportAccess } from "../shared/portfolioImportAccess";
import {
  countMonthlyFinalCardTiers,
  getSimulationClients,
} from "../shared/monthlyFinalCard";
import {
  matchesOrganizationFilter,
  normalizeOrganizationKey,
  prepareOrganizationValues,
} from "../shared/organization";
import {
  cleanPortfolioText,
  normalizeRouteKey,
  type PortfolioType,
  type RoutePortfolioRow,
} from "../shared/routePortfolio";
import {
  deduplicateLeadListRows,
  isAuthorizedStoneGoogleHtmlUrl,
  parseAuthorizedStoneLeadListUrl,
  stoneLeadListSourceOrigin,
} from "../shared/stoneLeadList";
import { buildNordicScore, isNordicHundredK } from "../shared/nordic";
import {
  semesterKeyForMonth,
  semesterMonths,
} from "../shared/semesterComparison";
import {
  monthlyKpiPoints,
  sortByGlobalKpi,
  sortByNewClients,
  sortByTpv,
} from "../shared/gamification";
import { tioPatinhasAlias } from "../shared/tioPatinhas";
import { pickAutoNewsItem } from "../shared/newsAutoContent";
import {
  calculateSalesPipeline,
  listSalesPipeFilterOptions,
  type SalesPipeFilters,
  type SalesPipeEntry,
} from "../shared/salesPipeline";
import {
  buildSpartacusPdi,
  type SpartacusPlanInput,
} from "../shared/spartacus";
import {
  canAccessTeamMember,
  canEditTeamProfile,
  type TeamAccessIdentity,
  type TeamMemberRole,
} from "../shared/teamAccess";
import { storagePut } from "./storage";
import { createPassword } from "./credentials";
import {
  isSystemAdminEmail,
  SYSTEM_ADMIN_EMAIL,
  TEST_ADMIN_EMAIL,
} from "./registration";

let database: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!database && process.env.DATABASE_URL)
    database = drizzle(process.env.DATABASE_URL);
  if (!database) throw new Error("Banco de dados indisponível.");
  return database;
}

/** Mantém uma trilha enxuta de alterações de gestão, sem copiar dados pessoais ou valores de carteira. */
async function recordSecurityAuditEvent(input: {
  actorUserId: number;
  eventType: string;
  targetType: string;
  targetId: string | number;
  scope?: string;
}) {
  const db = await getDb();
  await db.insert(securityAuditEvents).values({
    actorUserId: input.actorUserId,
    eventType: input.eventType.slice(0, 64),
    targetType: input.targetType.slice(0, 64),
    targetId: String(input.targetId).slice(0, 120),
    scope: (input.scope ?? "").slice(0, 160),
  });
}

type PublicCnpjSnapshot = {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  situacaoCadastral: string;
  porte: string;
  cnae: string;
  atividade: string;
  municipio: string;
  uf: string;
  bairro: string;
  inicioAtividade: string;
};
function sanitizeCnpj(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .slice(0, 14);
}
function parsePublicSnapshot(value: string | null) {
  try {
    return value ? (JSON.parse(value) as PublicCnpjSnapshot) : null;
  } catch {
    return null;
  }
}

async function assertOwnedProspectionDossier(
  userId: number,
  dossierId: number
) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(prospectionDossiers)
    .where(
      and(
        eq(prospectionDossiers.id, dossierId),
        eq(prospectionDossiers.userId, userId)
      )
    )
    .limit(1);
  if (!rows[0]) throw new Error("Dossiê não encontrado ou sem acesso.");
  return rows[0];
}

async function assertRouteEntryAccess(userId: number, routeEntryId: number) {
  const db = await getDb();
  const [entry] = await db
    .select()
    .from(routePortfolioEntries)
    .where(eq(routePortfolioEntries.id, routeEntryId))
    .limit(1);
  if (!entry) throw new Error("Entrada de carteira não encontrada.");
  const [assignment] = await db
    .select()
    .from(routeAssignments)
    .where(
      and(
        eq(routeAssignments.routeKey, entry.routeKey),
        eq(routeAssignments.userId, userId)
      )
    )
    .limit(1);
  if (!assignment)
    throw new Error(
      "Apenas leads de rotas formalmente atribuídas podem ser adicionados ao dossiê."
    );
  return entry;
}

export async function listProspectionDossiers(userId: number) {
  const db = await getDb();
  const dossiers = await db
    .select()
    .from(prospectionDossiers)
    .where(eq(prospectionDossiers.userId, userId))
    .orderBy(desc(prospectionDossiers.updatedAt));
  const sources = dossiers.length
    ? await db
        .select()
        .from(prospectionSources)
        .where(
          inArray(
            prospectionSources.dossierId,
            dossiers.map(item => item.id)
          )
        )
        .orderBy(desc(prospectionSources.accessedAt))
    : [];
  return dossiers.map(dossier => ({
    ...dossier,
    publicSnapshot: parsePublicSnapshot(dossier.publicSnapshotJson),
    sources: sources.filter(source => source.dossierId === dossier.id),
  }));
}

export async function createProspectionDossier(
  userId: number,
  input: {
    clientName: string;
    cnpj?: string;
    routeEntryId?: number;
    hypotheses?: string;
    agentNotes?: string;
  }
) {
  const db = await getDb();
  const entry = input.routeEntryId
    ? await assertRouteEntryAccess(userId, input.routeEntryId)
    : null;
  const clientName = cleanPortfolioText(
    input.clientName || entry?.clientName,
    160
  );
  if (!clientName) throw new Error("Informe o nome do estabelecimento.");
  const inserted = await db.insert(prospectionDossiers).values({
    userId,
    routeEntryId: entry?.id ?? null,
    clientName,
    cnpj: sanitizeCnpj(input.cnpj ?? entry?.document ?? ""),
    routeKey: entry?.routeKey ?? "",
    source: entry ? "portfolio" : "manual",
    hypotheses: cleanPortfolioText(input.hypotheses, 3000) || null,
    agentNotes: cleanPortfolioText(input.agentNotes, 3000) || null,
  });
  return assertOwnedProspectionDossier(userId, Number(inserted[0].insertId));
}

export async function updateProspectionDossier(
  userId: number,
  input: {
    id: number;
    stage?:
      | "pesquisa"
      | "preparo"
      | "agendamento"
      | "visita"
      | "negociacao"
      | "arquivado";
    hypotheses?: string;
    agentNotes?: string;
  }
) {
  const db = await getDb();
  await assertOwnedProspectionDossier(userId, input.id);
  await db
    .update(prospectionDossiers)
    .set({
      ...(input.stage ? { stage: input.stage } : {}),
      ...(input.hypotheses !== undefined
        ? { hypotheses: cleanPortfolioText(input.hypotheses, 3000) || null }
        : {}),
      ...(input.agentNotes !== undefined
        ? { agentNotes: cleanPortfolioText(input.agentNotes, 3000) || null }
        : {}),
    })
    .where(
      and(
        eq(prospectionDossiers.id, input.id),
        eq(prospectionDossiers.userId, userId)
      )
    );
  return assertOwnedProspectionDossier(userId, input.id);
}

export async function researchProspectionCnpj(
  userId: number,
  input: { dossierId: number; cnpj?: string }
) {
  const db = await getDb();
  const dossier = await assertOwnedProspectionDossier(userId, input.dossierId);
  const cnpj = sanitizeCnpj(input.cnpj ?? dossier.cnpj);
  if (cnpj.length !== 14)
    throw new Error("Informe um CNPJ com 14 caracteres antes de pesquisar.");
  const result = await fetchPublicCnpjSnapshot(cnpj);
  if (!result)
    throw new Error("Não foi possível consultar a fonte pública no momento.");
  const { snapshot, sourceUrl, sourceLabel } = result;
  await db
    .update(prospectionDossiers)
    .set({
      cnpj,
      clientName:
        dossier.clientName || snapshot.nomeFantasia || snapshot.razaoSocial,
      publicSnapshotJson: JSON.stringify(snapshot),
      lastResearchedAt: new Date(),
    })
    .where(
      and(
        eq(prospectionDossiers.id, dossier.id),
        eq(prospectionDossiers.userId, userId)
      )
    );
  await db
    .delete(prospectionSources)
    .where(
      and(
        eq(prospectionSources.dossierId, dossier.id),
        eq(prospectionSources.sourceType, "cnpj")
      )
    );
  await db.insert(prospectionSources).values({
    dossierId: dossier.id,
    sourceType: "cnpj",
    label: sourceLabel,
    url: sourceUrl,
  });
  return { snapshot, sourceUrl, researchedAt: new Date() };
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 8_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Encadeia fontes públicas e gratuitas de CNPJ (sem scraping) para reduzir falhas por indisponibilidade/limite de uma única fonte. */
async function fetchPublicCnpjSnapshot(
  cnpj: string
): Promise<{ snapshot: PublicCnpjSnapshot; sourceUrl: string; sourceLabel: string } | null> {
  const brasilApiUrl = `https://brasilapi.com.br/api/cnpj/v1/${encodeURIComponent(cnpj)}`;
  const brasilApiBody = await fetchJsonWithTimeout(brasilApiUrl);
  if (brasilApiBody) {
    return {
      snapshot: {
        cnpj: typeof brasilApiBody.cnpj === "string" ? brasilApiBody.cnpj : cnpj,
        razaoSocial: typeof brasilApiBody.razao_social === "string" ? brasilApiBody.razao_social : "",
        nomeFantasia: typeof brasilApiBody.nome_fantasia === "string" ? brasilApiBody.nome_fantasia : "",
        situacaoCadastral:
          typeof brasilApiBody.descricao_situacao_cadastral === "string"
            ? brasilApiBody.descricao_situacao_cadastral
            : "",
        porte: typeof brasilApiBody.porte === "string" ? brasilApiBody.porte : "",
        cnae: brasilApiBody.cnae_fiscal ? String(brasilApiBody.cnae_fiscal) : "",
        atividade:
          typeof brasilApiBody.cnae_fiscal_descricao === "string"
            ? brasilApiBody.cnae_fiscal_descricao
            : "",
        municipio: typeof brasilApiBody.municipio === "string" ? brasilApiBody.municipio : "",
        uf: typeof brasilApiBody.uf === "string" ? brasilApiBody.uf : "",
        bairro: typeof brasilApiBody.bairro === "string" ? brasilApiBody.bairro : "",
        inicioAtividade:
          typeof brasilApiBody.data_inicio_atividade === "string"
            ? brasilApiBody.data_inicio_atividade
            : "",
      },
      sourceUrl: brasilApiUrl,
      sourceLabel: "BrasilAPI · CNPJ público",
    };
  }
  const receitaWsUrl = `https://www.receitaws.com.br/v1/cnpj/${encodeURIComponent(cnpj)}`;
  const receitaWsBody = await fetchJsonWithTimeout(receitaWsUrl);
  if (receitaWsBody && receitaWsBody.status !== "ERROR") {
    const primaryActivity = Array.isArray(receitaWsBody.atividade_principal)
      ? (receitaWsBody.atividade_principal[0] as Record<string, unknown> | undefined)
      : undefined;
    return {
      snapshot: {
        cnpj,
        razaoSocial: typeof receitaWsBody.nome === "string" ? receitaWsBody.nome : "",
        nomeFantasia: typeof receitaWsBody.fantasia === "string" ? receitaWsBody.fantasia : "",
        situacaoCadastral: typeof receitaWsBody.situacao === "string" ? receitaWsBody.situacao : "",
        porte: typeof receitaWsBody.porte === "string" ? receitaWsBody.porte : "",
        cnae: typeof primaryActivity?.code === "string" ? primaryActivity.code : "",
        atividade: typeof primaryActivity?.text === "string" ? primaryActivity.text : "",
        municipio: typeof receitaWsBody.municipio === "string" ? receitaWsBody.municipio : "",
        uf: typeof receitaWsBody.uf === "string" ? receitaWsBody.uf : "",
        bairro: typeof receitaWsBody.bairro === "string" ? receitaWsBody.bairro : "",
        inicioAtividade: typeof receitaWsBody.abertura === "string" ? receitaWsBody.abertura : "",
      },
      sourceUrl: receitaWsUrl,
      sourceLabel: "ReceitaWS · CNPJ público",
    };
  }
  return null;
}

export async function getProspectionRecommendations(userId: number) {
  const db = await getDb();
  const monthKey = new Date().toISOString().slice(0, 7);
  const [portfolio, profileRows, goalRows, simulationRows] = await Promise.all([
    getRoutePortfolioForUser(userId, "route"),
    db
      .select()
      .from(agentProfiles)
      .where(eq(agentProfiles.userId, userId))
      .limit(1),
    db
      .select()
      .from(monthlyGoals)
      .where(
        and(
          eq(monthlyGoals.userId, userId),
          eq(monthlyGoals.monthKey, monthKey)
        )
      )
      .limit(1),
    db
      .select()
      .from(simulations)
      .where(eq(simulations.userId, userId))
      .orderBy(desc(simulations.createdAt))
      .limit(1),
  ]);
  const profile = profileRows[0];
  const goal = goalRows[0];
  const latestSimulation = simulationRows[0];
  const targetVariable = goal?.targetVariable ?? profile?.targetVariable ?? 0;
  const currentVariable =
    goal?.actualVariable ?? latestSimulation?.finalVariable ?? 0;
  const targetTpv = goal?.targetTpv ?? profile?.defaultGoalTpv ?? 0;
  const currentTpv = goal?.actualTpv ?? latestSimulation?.eligibleTpv ?? 0;
  const rvGap = Math.max(0, targetVariable - currentVariable);
  const tpvGap = Math.max(0, targetTpv - currentTpv);
  const now = Date.now();
  const ranked = portfolio.entries
    .map(entry => {
      const contactAt = entry.nextContactAt?.getTime() ?? null;
      const contactScore =
        contactAt === null
          ? 0
          : contactAt <= now
            ? 24
            : contactAt <= now + 7 * 86_400_000
              ? 12
              : 0;
      const stageScore = /negocia/i.test(entry.stage)
        ? 50
        : /qualific/i.test(entry.stage)
          ? 30
          : /planeja/i.test(entry.stage)
            ? 20
            : 10;
      const priorityScore =
        stageScore +
        (/quent/i.test(entry.temperature) ? 40 : 0) +
        Math.min(entry.projectedTpv / 10_000, 30) +
        contactScore +
        (entry.segment?.trim() ? 5 : 0);
      return { ...entry, priorityScore };
    })
    .sort((left, right) => right.priorityScore - left.priorityScore)
    .slice(0, 30);
  const suggested =
    tpvGap > 0
      ? ranked.reduce<{ ids: Set<number>; total: number }>(
          (acc, item) =>
            acc.total >= tpvGap
              ? acc
              : {
                  ids: acc.ids.add(item.id),
                  total: acc.total + item.projectedTpv,
                },
          { ids: new Set<number>(), total: 0 }
        )
      : { ids: new Set<number>(), total: 0 };
  return {
    referenceMonth: portfolio.referenceMonth,
    targetVariable,
    currentVariable,
    rvGap,
    targetTpv,
    currentTpv,
    tpvGap,
    suggestedCoverageTpv: suggested.total,
    items: ranked.map(item => ({
      id: item.id,
      clientName: item.clientName,
      route: item.route,
      segment: item.segment,
      mcc: item.mcc,
      projectedTpv: item.projectedTpv,
      stage: item.stage,
      temperature: item.temperature,
      nextContactAt: item.nextContactAt,
      priorityScore: item.priorityScore,
      suggestedForGoal: suggested.ids.has(item.id),
    })),
  };
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return rows[0] ?? null;
}

export async function saveEmailVerificationChallenge(input: {
  email: string;
  name: string;
  leadershipRole: "none" | "polo" | "distrital";
  codeHash: string;
  codeSalt: string;
  expiresAt: Date;
}) {
  const db = await getDb();
  await db
    .insert(emailVerificationChallenges)
    .values({
      ...input,
      verificationTokenHash: "",
      verificationTokenSalt: "",
      attempts: 0,
    })
    .onDuplicateKeyUpdate({
      set: {
        name: input.name,
        leadershipRole: input.leadershipRole,
        codeHash: input.codeHash,
        codeSalt: input.codeSalt,
        verificationTokenHash: "",
        verificationTokenSalt: "",
        expiresAt: input.expiresAt,
        verifiedAt: null,
        consumedAt: null,
        attempts: 0,
      },
    });
}

export async function getEmailVerificationChallenge(email: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(emailVerificationChallenges)
    .where(eq(emailVerificationChallenges.email, email))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateEmailVerificationChallenge(
  email: string,
  input: {
    attempts?: number;
    verificationTokenHash?: string;
    verificationTokenSalt?: string;
    verifiedAt?: Date;
    consumedAt?: Date;
  }
) {
  const db = await getDb();
  await db
    .update(emailVerificationChallenges)
    .set(input)
    .where(eq(emailVerificationChallenges.email, email));
}

export async function savePasswordResetChallenge(input: {
  userId: number;
  codeHash: string;
  codeSalt: string;
  expiresAt: Date;
}) {
  const db = await getDb();
  await db
    .insert(passwordResetChallenges)
    .values({ ...input, resetTokenHash: "", resetTokenSalt: "", attempts: 0 })
    .onDuplicateKeyUpdate({
      set: {
        codeHash: input.codeHash,
        codeSalt: input.codeSalt,
        resetTokenHash: "",
        resetTokenSalt: "",
        expiresAt: input.expiresAt,
        verifiedAt: null,
        consumedAt: null,
        attempts: 0,
      },
    });
}

export async function getPasswordResetChallenge(userId: number) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(passwordResetChallenges)
    .where(eq(passwordResetChallenges.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function updatePasswordResetChallenge(
  userId: number,
  input: {
    attempts?: number;
    resetTokenHash?: string;
    resetTokenSalt?: string;
    verifiedAt?: Date;
    consumedAt?: Date;
  }
) {
  const db = await getDb();
  await db
    .update(passwordResetChallenges)
    .set(input)
    .where(eq(passwordResetChallenges.userId, userId));
}

export async function replaceEmailPassword(
  userId: number,
  passwordHash: string,
  passwordSalt: string
) {
  const db = await getDb();
  await db
    .insert(emailCredentials)
    .values({ userId, passwordHash, passwordSalt })
    .onDuplicateKeyUpdate({ set: { passwordHash, passwordSalt } });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  const db = await getDb();
  await db
    .insert(users)
    .values(user)
    .onDuplicateKeyUpdate({
      set: {
        name: user.name,
        email: user.email,
        loginMethod: user.loginMethod,
        lastSignedIn: new Date(),
      },
    });
}

export async function createEmailAccount(input: {
  name: string;
  email: string;
  openId: string;
  passwordHash: string;
  passwordSalt: string;
  leadershipRole?: "none" | "polo" | "distrital";
  role?: "user" | "admin";
}) {
  const db = await getDb();
  const role =
    input.role ?? (isSystemAdminEmail(input.email) ? "admin" : "user");
  const created = await db
    .insert(users)
    .values({
      openId: input.openId,
      name: input.name,
      email: input.email,
      loginMethod: "email-password",
      role,
    })
    .$returningId();
  const userId = created[0]!.id;
  await db.insert(emailCredentials).values({
    userId,
    passwordHash: input.passwordHash,
    passwordSalt: input.passwordSalt,
  });
  // Novos cadastros começam como agentes. Hierarquia é provisionada fora do fluxo público.
  const leadershipRole = role === "admin" ? "distrital" : "none";
  await db
    .insert(agentProfiles)
    .values({ userId, displayName: input.name, leadershipRole });
  await db
    .update(routeAssignments)
    .set({ userId })
    .where(
      eq(routeAssignments.agentEmail, normalizeAssignmentEmail(input.email))
    );
  return getUserByOpenId(input.openId);
}

export async function activatePendingEmailAccount(
  userId: number,
  input: {
    name: string;
    openId: string;
    passwordHash: string;
    passwordSalt: string;
  }
) {
  const db = await getDb();
  const existing = (
    await db.select().from(users).where(eq(users.id, userId)).limit(1)
  )[0];
  if (
    !existing ||
    existing.loginMethod !== "team-invite" ||
    (await getCredentialsForUser(userId))
  )
    throw new Error("Esta pessoa já possui acesso ou não está pendente.");
  await db
    .update(users)
    .set({
      name: input.name.trim().slice(0, 120),
      openId: input.openId,
      loginMethod: "email-password",
      lastSignedIn: new Date(),
    })
    .where(eq(users.id, userId));
  await db.insert(emailCredentials).values({
    userId,
    passwordHash: input.passwordHash,
    passwordSalt: input.passwordSalt,
  });
  return getUserByOpenId(input.openId);
}

export async function ensureUlissesAdminAccount() {
  const password = process.env.ULISSES_ADMIN_PASSWORD;
  if (!password) return null;
  const db = await getDb();
  const existing = await getUserByEmail(SYSTEM_ADMIN_EMAIL);
  if (!existing) {
    const credentials = await createPassword(password);
    return createEmailAccount({
      name: "Administração Nova Odisseia",
      email: SYSTEM_ADMIN_EMAIL,
      openId: "admin_novaodisseia_fiorati",
      leadershipRole: "distrital",
      role: "admin",
      ...credentials,
    });
  }
  await db
    .update(users)
    .set({ role: "admin", loginMethod: "email-password" })
    .where(eq(users.id, existing.id));
  const credentials = await getCredentialsForUser(existing.id);
  if (!credentials) {
    const nextCredentials = await createPassword(password);
    await db
      .insert(emailCredentials)
      .values({ userId: existing.id, ...nextCredentials });
  }
  const profile = (
    await db
      .select()
      .from(agentProfiles)
      .where(eq(agentProfiles.userId, existing.id))
      .limit(1)
  )[0];
  if (profile)
    await db
      .update(agentProfiles)
      .set({ leadershipRole: "distrital" })
      .where(eq(agentProfiles.id, profile.id));
  else
    await db.insert(agentProfiles).values({
      userId: existing.id,
      displayName: existing.name ?? "Administração Nova Odisseia",
      leadershipRole: "distrital",
    });
  return getUserByEmail(SYSTEM_ADMIN_EMAIL);
}

export async function ensureTestAdminAccount() {
  const db = await getDb();
  const existing = await getUserByEmail(TEST_ADMIN_EMAIL);
  if (!existing) return null;
  await db
    .update(users)
    .set({ role: "admin", loginMethod: "email-password" })
    .where(eq(users.id, existing.id));
  const profile = (
    await db
      .select()
      .from(agentProfiles)
      .where(eq(agentProfiles.userId, existing.id))
      .limit(1)
  )[0];
  if (profile)
    await db
      .update(agentProfiles)
      .set({ leadershipRole: "distrital" })
      .where(eq(agentProfiles.id, profile.id));
  else
    await db.insert(agentProfiles).values({
      userId: existing.id,
      displayName: existing.name ?? "Gabriel Fiorati",
      leadershipRole: "distrital",
    });
  return getUserByEmail(TEST_ADMIN_EMAIL);
}

export async function getCredentialsForUser(userId: number) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(emailCredentials)
    .where(eq(emailCredentials.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

async function assertGlobalAdministrator(userId: number) {
  const db = await getDb();
  const [actor] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!actor || actor.role !== "admin")
    throw new Error("Acesso administrativo global necessário.");
  return db;
}

/** Lista de gestão global; acessível somente para contas com papel administrativo. */
export async function listAdminProfiles(adminUserId: number) {
  const db = await assertGlobalAdministrator(adminUserId);
  return db
    .select({
      userId: agentProfiles.userId,
      email: users.email,
      displayName: agentProfiles.displayName,
      leadershipRole: agentProfiles.leadershipRole,
      regional: agentProfiles.regional,
      district: agentProfiles.district,
      polo: agentProfiles.polo,
      route: agentProfiles.route,
      targetVariable: agentProfiles.targetVariable,
      defaultGoalTpv: agentProfiles.defaultGoalTpv,
      defaultGoalNewClients: agentProfiles.defaultGoalNewClients,
    })
    .from(agentProfiles)
    .innerJoin(users, eq(users.id, agentProfiles.userId))
    .orderBy(agentProfiles.displayName)
    .limit(500);
}

/** Alteração organizacional global, isolada do fluxo de autoedição do perfil comum. */
export async function updateAdminProfile(
  adminUserId: number,
  input: {
    userId: number;
    displayName: string;
    leadershipRole: "none" | "polo" | "distrital";
    regional: string;
    district: string;
    polo: string;
    route: string;
    targetVariable: number;
    defaultGoalTpv: number;
    defaultGoalNewClients: number;
  }
) {
  const db = await assertGlobalAdministrator(adminUserId);
  const [target] = await db
    .select()
    .from(agentProfiles)
    .where(eq(agentProfiles.userId, input.userId))
    .limit(1);
  if (!target) throw new Error("Perfil não encontrado.");
  const organization = prepareOrganizationValues({
    regional: input.regional,
    district: input.district,
    polo: input.polo,
    route: input.route,
  });
  const values = {
    displayName: cleanPortfolioText(input.displayName, 120),
    leadershipRole: input.leadershipRole,
    ...organization,
    targetVariable: Math.max(0, input.targetVariable),
    defaultGoalTpv: Math.max(0, input.defaultGoalTpv),
    defaultGoalNewClients: Math.max(0, Math.floor(input.defaultGoalNewClients)),
  };
  if (values.displayName.length < 2)
    throw new Error("Informe um nome de exibição válido.");
  await db
    .update(agentProfiles)
    .set(values)
    .where(eq(agentProfiles.userId, input.userId));
  await db
    .update(users)
    .set({ name: values.displayName })
    .where(eq(users.id, input.userId));
  await recordSecurityAuditEvent({
    actorUserId: adminUserId,
    eventType: "admin_profile_update",
    targetType: "agent_profile",
    targetId: input.userId,
    scope: `${values.district || "sem distrito"} · ${values.polo || "sem polo"}`,
  });
  return (
    (await listAdminProfiles(adminUserId)).find(
      profile => profile.userId === input.userId
    ) ?? null
  );
}

const normalizeAssignmentEmail = (value: string) =>
  value.trim().toLocaleLowerCase("pt-BR");
async function getFormalRoutes(userId: number) {
  const db = await getDb();
  return db
    .select({
      routeKey: routeAssignments.routeKey,
      route: routeAssignments.route,
    })
    .from(routeAssignments)
    .where(eq(routeAssignments.userId, userId));
}
export async function assignRouteOwner(
  userId: number,
  input: {
    route: string;
    agentName: string;
    agentEmail: string;
    regional?: string;
    district?: string;
    polo?: string;
  }
) {
  const db = await getDb();
  const [profile, actor] = await Promise.all([
    db
      .select()
      .from(agentProfiles)
      .where(eq(agentProfiles.userId, userId))
      .limit(1)
      .then(rows => rows[0]),
    db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .then(rows => rows[0]),
  ]);
  if (
    !profile ||
    (profile.leadershipRole === "none" && actor?.role !== "admin")
  )
    throw new Error("Atribuição de rota exclusiva para liderança.");
  const route = cleanPortfolioText(input.route, 120);
  const routeKey = normalizeRouteKey(route);
  if (!routeKey) throw new Error("Informe uma rota válida.");
  const { route: _normalizedRoute, ...organization } =
    prepareOrganizationValues({
      route,
      regional: input.regional ?? profile.regional,
      district: input.district ?? profile.district,
      polo: input.polo ?? profile.polo,
    });
  if (
    actor?.role !== "admin" &&
    profile.leadershipRole === "polo" &&
    normalizeOrganizationKey(organization.polo) !==
      normalizeOrganizationKey(profile.polo)
  )
    throw new Error("Um Dono de Polo só pode atribuir rotas do próprio polo.");
  if (
    actor?.role !== "admin" &&
    profile.leadershipRole === "distrital" &&
    normalizeOrganizationKey(organization.district) !==
      normalizeOrganizationKey(profile.district)
  )
    throw new Error("Um Distrital só pode atribuir rotas do próprio distrito.");
  const agentEmail = normalizeAssignmentEmail(input.agentEmail);
  const target = agentEmail ? await getUserByEmail(agentEmail) : null;
  const targetProfile = target
    ? (
        await db
          .select()
          .from(agentProfiles)
          .where(eq(agentProfiles.userId, target.id))
          .limit(1)
      )[0]
    : null;
  if (actor?.role !== "admin" && targetProfile) {
    const targetScope =
      profile.leadershipRole === "distrital"
        ? targetProfile.district
        : targetProfile.polo;
    const actorScope =
      profile.leadershipRole === "distrital"
        ? organization.district
        : organization.polo;
    // Perfis ainda sem organização podem ser atribuídos durante o onboarding; perfis de outro escopo não.
    if (
      targetScope.trim() &&
      normalizeOrganizationKey(targetScope) !==
        normalizeOrganizationKey(actorScope)
    ) {
      throw new Error(
        "A rota só pode ser atribuída a agentes do mesmo escopo de liderança."
      );
    }
  }
  await db
    .insert(routeAssignments)
    .values({
      route,
      routeKey,
      agentName: cleanPortfolioText(input.agentName, 120),
      agentEmail,
      userId: target?.id ?? null,
      updatedByUserId: userId,
      ...organization,
    })
    .onDuplicateKeyUpdate({
      set: {
        agentName: cleanPortfolioText(input.agentName, 120),
        agentEmail,
        userId: target?.id ?? null,
        updatedByUserId: userId,
        ...organization,
      },
    });
  await recordSecurityAuditEvent({
    actorUserId: userId,
    eventType: "route_assignment_upsert",
    targetType: "route",
    targetId: routeKey,
    scope:
      profile.leadershipRole === "distrital"
        ? organization.district
        : organization.polo,
  });
  return { route, assignedUserId: target?.id ?? null };
}
export async function listRouteAssignmentsForLeader(userId: number) {
  const db = await getDb();
  const [profile, actor] = await Promise.all([
    db
      .select()
      .from(agentProfiles)
      .where(eq(agentProfiles.userId, userId))
      .limit(1)
      .then(rows => rows[0]),
    db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .then(rows => rows[0]),
  ]);
  if (
    !profile ||
    (profile.leadershipRole === "none" && actor?.role !== "admin")
  )
    throw new Error("Acesso exclusivo para liderança.");
  const rows = await db
    .select()
    .from(routeAssignments)
    .orderBy(routeAssignments.route);
  return actor?.role === "admin"
    ? rows
    : rows.filter(row =>
        profile.leadershipRole === "distrital"
          ? normalizeOrganizationKey(row.district) ===
            normalizeOrganizationKey(profile.district)
          : normalizeOrganizationKey(row.polo) ===
            normalizeOrganizationKey(profile.polo)
      );
}

function teamIdentity(
  user: typeof users.$inferSelect,
  profile: typeof agentProfiles.$inferSelect,
  teamRoles: TeamMemberRole[] = []
): TeamAccessIdentity {
  return {
    id: user.id,
    role: user.role,
    leadershipRole: profile.leadershipRole,
    regional: profile.regional,
    district: profile.district,
    polo: profile.polo,
    teamRoles,
  };
}

function defaultTeamRoles(
  profile: typeof agentProfiles.$inferSelect
): TeamMemberRole[] {
  if (profile.leadershipRole === "polo") return ["polo"];
  if (profile.leadershipRole === "distrital") return ["distrital"];
  return ["agente"];
}

function cleanTeamRoles(roles: string[]): TeamMemberRole[] {
  const ordered = Array.from(new Set(roles));
  return (
    ordered.includes("agente") ? ordered : ["agente", ...ordered]
  ) as TeamMemberRole[];
}

async function getTeamRoleMap(
  db: Awaited<ReturnType<typeof getDb>>,
  userIds: number[]
) {
  if (!userIds.length) return new Map<number, TeamMemberRole[]>();
  const rows = await db
    .select()
    .from(teamMemberRoles)
    .where(inArray(teamMemberRoles.userId, userIds));
  return new Map<number, TeamMemberRole[]>(
    userIds.map(userId => [
      userId,
      cleanTeamRoles(
        rows
          .filter(row => row.userId === userId)
          .map(row => row.role as TeamMemberRole)
      ),
    ])
  );
}

async function assertTeamProfileAccess(
  actorUserId: number,
  targetUserId: number
) {
  const db = await getDb();
  const [actorRows, targetRows] = await Promise.all([
    db
      .select({ user: users, profile: agentProfiles })
      .from(users)
      .innerJoin(agentProfiles, eq(agentProfiles.userId, users.id))
      .where(eq(users.id, actorUserId))
      .limit(1),
    db
      .select({ user: users, profile: agentProfiles })
      .from(users)
      .innerJoin(agentProfiles, eq(agentProfiles.userId, users.id))
      .where(eq(users.id, targetUserId))
      .limit(1),
  ]);
  const actor = actorRows[0];
  const target = targetRows[0];
  const roleMap = await getTeamRoleMap(db, [actorUserId, targetUserId]);
  if (
    !actor ||
    !target ||
    !canAccessTeamMember(
      teamIdentity(
        actor.user,
        actor.profile,
        roleMap.get(actorUserId) ?? defaultTeamRoles(actor.profile)
      ),
      teamIdentity(
        target.user,
        target.profile,
        roleMap.get(targetUserId) ?? defaultTeamRoles(target.profile)
      )
    )
  ) {
    throw new Error("Agente fora do seu escopo de Gestão do Time.");
  }
  return {
    db,
    actor,
    target,
    actorRoles: roleMap.get(actorUserId) ?? defaultTeamRoles(actor.profile),
    targetRoles: roleMap.get(targetUserId) ?? defaultTeamRoles(target.profile),
  };
}

async function assertTeamManagementAccess(
  actorUserId: number,
  targetUserId: number
) {
  const access = await assertTeamProfileAccess(actorUserId, targetUserId);
  if (
    !canEditTeamProfile(
      teamIdentity(access.actor.user, access.actor.profile, access.actorRoles),
      teamIdentity(
        access.target.user,
        access.target.profile,
        access.targetRoles
      )
    )
  ) {
    throw new Error("Você não pode administrar este agente.");
  }
  return access;
}

export async function listTeamProfiles(actorUserId: number) {
  const db = await getDb();
  const rows = await db
    .select({ user: users, profile: agentProfiles })
    .from(users)
    .innerJoin(agentProfiles, eq(agentProfiles.userId, users.id))
    .orderBy(agentProfiles.displayName)
    .limit(500);
  const actor = rows.find(row => row.user.id === actorUserId);
  if (!actor) throw new Error("Perfil do usuário não encontrado.");
  const roleMap = await getTeamRoleMap(
    db,
    rows.map(row => row.user.id)
  );
  const credentials = rows.length
    ? await db
        .select({ userId: emailCredentials.userId })
        .from(emailCredentials)
        .where(
          inArray(
            emailCredentials.userId,
            rows.map(row => row.user.id)
          )
        )
    : [];
  const accessSet = new Set(credentials.map(row => row.userId));
  const actorIdentity = teamIdentity(
    actor.user,
    actor.profile,
    roleMap.get(actorUserId) ?? defaultTeamRoles(actor.profile)
  );
  const visible = rows.filter(row =>
    canAccessTeamMember(
      actorIdentity,
      teamIdentity(
        row.user,
        row.profile,
        roleMap.get(row.user.id) ?? defaultTeamRoles(row.profile)
      )
    )
  );
  const userIds = visible.map(row => row.user.id);
  const [teamProfiles, assignments] = await Promise.all([
    userIds.length
      ? db
          .select()
          .from(agentTeamProfiles)
          .where(inArray(agentTeamProfiles.userId, userIds))
      : [],
    userIds.length
      ? db
          .select()
          .from(routeAssignments)
          .where(inArray(routeAssignments.userId, userIds))
      : [],
  ]);
  return visible.map(row => ({
    userId: row.user.id,
    email: row.user.email,
    displayName: row.profile.displayName,
    leadershipRole: row.profile.leadershipRole,
    regional: row.profile.regional,
    district: row.profile.district,
    polo: row.profile.polo,
    route: row.profile.route,
    formalRoutes: assignments
      .filter(assignment => assignment.userId === row.user.id)
      .map(assignment => assignment.route),
    teamProfile:
      teamProfiles.find(profile => profile.userId === row.user.id) ?? null,
    teamRoles: roleMap.get(row.user.id) ?? defaultTeamRoles(row.profile),
    hasAccess: accessSet.has(row.user.id),
  }));
}

type TeamMemberOrganizationInput = {
  displayName: string;
  roles: string[];
  regional: string;
  district: string;
  polo: string;
  routes: string[];
};

async function assertTeamOrganizationManagement(
  actorUserId: number,
  targetUserId?: number
) {
  const db = await getDb();
  const [actorRow] = await db
    .select({ user: users, profile: agentProfiles })
    .from(users)
    .innerJoin(agentProfiles, eq(agentProfiles.userId, users.id))
    .where(eq(users.id, actorUserId))
    .limit(1);
  if (!actorRow) throw new Error("Perfil do usuário não encontrado.");
  const roleMap = await getTeamRoleMap(db, [actorUserId]);
  const actorIdentity = teamIdentity(
    actorRow.user,
    actorRow.profile,
    roleMap.get(actorUserId) ?? defaultTeamRoles(actorRow.profile)
  );
  if (
    actorRow.user.role !== "admin" &&
    actorRow.profile.leadershipRole === "none" &&
    !actorIdentity.teamRoles?.some(role =>
      ["polo", "distrital", "interino", "agendamento", "assistente", "auxiliar"].includes(role)
    )
  ) {
    throw new Error(
      "Somente ADMIN, Distrital, Dono de Polo, Interino ou Agendamento podem administrar funções."
    );
  }
  if (!targetUserId) return { db, actor: actorRow, actorIdentity };
  const access = await assertTeamManagementAccess(actorUserId, targetUserId);
  return { ...access, actorIdentity };
}

function leadershipFromRoles(roles: TeamMemberRole[]) {
  if (roles.includes("distrital")) return "distrital" as const;
  if (roles.includes("polo")) return "polo" as const;
  return "none" as const;
}

function assertOrganizationWithinActorScope(
  actor: TeamAccessIdentity,
  organization: { district: string; polo: string }
) {
  const roles = actor.teamRoles ?? [];
  if (actor.role === "admin") return;
  if (actor.leadershipRole === "distrital" || roles.includes("distrital")) {
    if (
      normalizeOrganizationKey(actor.district) !==
      normalizeOrganizationKey(organization.district)
    )
      throw new Error("Você só pode administrar pessoas do seu distrito.");
    return;
  }
  if (
    actor.leadershipRole === "polo" ||
    roles.some(role => ["polo", "interino", "agendamento", "assistente", "auxiliar"].includes(role))
  ) {
    if (
      normalizeOrganizationKey(actor.polo) !==
      normalizeOrganizationKey(organization.polo)
    )
      throw new Error("Você só pode administrar pessoas do seu polo.");
    return;
  }
  throw new Error("Você não possui escopo para administrar funções.");
}

async function saveTeamMemberOrganization(
  actorUserId: number,
  targetUserId: number,
  input: TeamMemberOrganizationInput
) {
  const access = await assertTeamOrganizationManagement(
    actorUserId,
    targetUserId
  );
  const roles = cleanTeamRoles(input.roles);
  if (
    access.actor.user.role !== "admin" &&
    roles.some(role => role === "polo" || role === "distrital")
  )
    throw new Error(
      "Somente ADMIN pode atribuir funções de liderança estrutural."
    );
  const organization = prepareOrganizationValues({
    regional: input.regional,
    district: input.district,
    polo: input.polo,
    route: input.routes[0] ?? "",
  });
  assertOrganizationWithinActorScope(access.actorIdentity, organization);
  const displayName = cleanPortfolioText(input.displayName, 120);
  if (displayName.length < 2) throw new Error("Informe um nome válido.");
  await access.db
    .update(agentProfiles)
    .set({
      displayName,
      leadershipRole: leadershipFromRoles(roles),
      ...organization,
    })
    .where(eq(agentProfiles.userId, targetUserId));
  await access.db
    .update(users)
    .set({ name: displayName })
    .where(eq(users.id, targetUserId));
  await access.db
    .delete(teamMemberRoles)
    .where(eq(teamMemberRoles.userId, targetUserId));
  await access.db
    .insert(teamMemberRoles)
    .values(roles.map(role => ({ userId: targetUserId, role })));
  await access.db
    .delete(routeAssignments)
    .where(eq(routeAssignments.userId, targetUserId));
  const targetEmail =
    (
      await access.db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, targetUserId))
        .limit(1)
    )[0]?.email ?? "";
  for (const route of Array.from(
    new Set(
      input.routes.map(value => cleanPortfolioText(value, 120)).filter(Boolean)
    )
  )) {
    await access.db
      .insert(routeAssignments)
      .values({
        route,
        routeKey: normalizeRouteKey(route),
        agentName: displayName,
        agentEmail: targetEmail,
        userId: targetUserId,
        regional: organization.regional,
        district: organization.district,
        polo: organization.polo,
        updatedByUserId: actorUserId,
      })
      .onDuplicateKeyUpdate({
        set: {
          agentName: displayName,
          agentEmail: targetEmail,
          userId: targetUserId,
          regional: organization.regional,
          district: organization.district,
          polo: organization.polo,
          updatedByUserId: actorUserId,
        },
      });
  }
  await recordSecurityAuditEvent({
    actorUserId,
    eventType: "team_member_organization_update",
    targetType: "user",
    targetId: targetUserId,
    scope: `${organization.district} · ${organization.polo}`,
  });
  return (
    (await listTeamProfiles(actorUserId)).find(
      member => member.userId === targetUserId
    ) ?? null
  );
}

export async function updateTeamMemberOrganization(
  actorUserId: number,
  targetUserId: number,
  input: TeamMemberOrganizationInput
) {
  return saveTeamMemberOrganization(actorUserId, targetUserId, input);
}

export async function createTeamMember(
  actorUserId: number,
  input: TeamMemberOrganizationInput & { email: string }
) {
  const access = await assertTeamOrganizationManagement(actorUserId);
  const email = input.email.trim().toLocaleLowerCase("pt-BR");
  const existing = await getUserByEmail(email);
  if (existing)
    throw new Error("Já existe uma pessoa ou conta com este e-mail.");
  const roles = cleanTeamRoles(input.roles);
  if (
    access.actor.user.role !== "admin" &&
    roles.some(role => role === "polo" || role === "distrital")
  )
    throw new Error(
      "Somente ADMIN pode atribuir funções de liderança estrutural."
    );
  const displayName = cleanPortfolioText(input.displayName, 120);
  const organization = prepareOrganizationValues({
    regional: input.regional,
    district: input.district,
    polo: input.polo,
    route: input.routes[0] ?? "",
  });
  assertOrganizationWithinActorScope(access.actorIdentity, organization);
  const created = await access.db
    .insert(users)
    .values({
      openId: `pending_${randomUUID().replaceAll("-", "")}`,
      name: displayName,
      email,
      loginMethod: "team-invite",
      role: "user",
    })
    .$returningId();
  const userId = created[0]?.id;
  if (!userId) throw new Error("Não foi possível criar a pessoa.");
  await access.db.insert(agentProfiles).values({
    userId,
    displayName,
    leadershipRole: leadershipFromRoles(roles),
    ...organization,
  });
  await access.db
    .insert(teamMemberRoles)
    .values(roles.map(role => ({ userId, role })));
  for (const route of Array.from(
    new Set(
      input.routes.map(value => cleanPortfolioText(value, 120)).filter(Boolean)
    )
  ))
    await access.db
      .insert(routeAssignments)
      .values({
        route,
        routeKey: normalizeRouteKey(route),
        agentName: displayName,
        agentEmail: email,
        userId,
        regional: organization.regional,
        district: organization.district,
        polo: organization.polo,
        updatedByUserId: actorUserId,
      })
      .onDuplicateKeyUpdate({
        set: {
          agentName: displayName,
          agentEmail: email,
          userId,
          regional: organization.regional,
          district: organization.district,
          polo: organization.polo,
          updatedByUserId: actorUserId,
        },
      });
  await recordSecurityAuditEvent({
    actorUserId,
    eventType: "team_member_created_pending",
    targetType: "user",
    targetId: userId,
    scope: `${organization.district} · ${organization.polo}`,
  });
  return { userId, hasAccess: false };
}

export async function updateTeamProfile(
  actorUserId: number,
  targetUserId: number,
  input: {
    about?: string | null;
    strengths?: string | null;
    developmentAreas?: string | null;
    careerObjective?: string | null;
    currentFocus?: string | null;
    personalCommitment?: string | null;
    professionalCommitment?: string | null;
  }
) {
  const { db, target } = await assertTeamManagementAccess(
    actorUserId,
    targetUserId
  );
  const values = {
    userId: targetUserId,
    about: input.about ?? null,
    strengths: input.strengths ?? null,
    developmentAreas: input.developmentAreas ?? null,
    careerObjective: input.careerObjective ?? null,
    currentFocus: input.currentFocus ?? null,
    personalCommitment: input.personalCommitment ?? null,
    professionalCommitment: input.professionalCommitment ?? null,
  };
  await db
    .insert(agentTeamProfiles)
    .values(values)
    .onDuplicateKeyUpdate({ set: { ...values, updatedAt: new Date() } });
  return (
    (
      await db
        .select()
        .from(agentTeamProfiles)
        .where(eq(agentTeamProfiles.userId, targetUserId))
        .limit(1)
    )[0] ?? null
  );
}

export async function getTeamDailyPromises(
  actorUserId: number,
  targetUserId: number,
  promiseDate?: string
) {
  const { db } = await assertTeamProfileAccess(actorUserId, targetUserId);
  return db
    .select()
    .from(teamDailyPromises)
    .where(
      and(
        eq(teamDailyPromises.userId, targetUserId),
        ...(promiseDate ? [eq(teamDailyPromises.promiseDate, promiseDate)] : [])
      )
    )
    .orderBy(desc(teamDailyPromises.promiseDate))
    .limit(60);
}

export async function saveTeamDailyPromise(
  actorUserId: number,
  targetUserId: number,
  input: {
    promiseDate: string;
    salesTasks?: number;
    proposals: number;
    newClients: number;
    newClientsTpv: number;
    closedTpv?: number;
    notes?: string | null;
  }
) {
  const { db } = await assertTeamManagementAccess(actorUserId, targetUserId);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.promiseDate))
    throw new Error("Informe a data no formato AAAA-MM-DD.");
  const values = {
    userId: targetUserId,
    promiseDate: input.promiseDate,
    salesTasks: Math.max(0, Math.floor(input.salesTasks ?? 0)),
    proposals: Math.max(0, Math.floor(input.proposals)),
    newClients: Math.max(0, Math.floor(input.newClients)),
    newClientsTpv: Math.max(0, input.newClientsTpv),
    closedTpv: Math.max(0, input.closedTpv ?? 0),
    notes: input.notes?.trim().slice(0, 4000) || null,
  };
  await db
    .insert(teamDailyPromises)
    .values(values)
    .onDuplicateKeyUpdate({ set: { ...values, updatedAt: new Date() } });
  return (
    (
      await db
        .select()
        .from(teamDailyPromises)
        .where(
          and(
            eq(teamDailyPromises.userId, targetUserId),
            eq(teamDailyPromises.promiseDate, input.promiseDate)
          )
        )
        .limit(1)
    )[0] ?? null
  );
}

export async function listPsvDemands(userId: number) {
  const db = await getDb();
  return db
    .select()
    .from(psvDemands)
    .where(eq(psvDemands.userId, userId))
    .orderBy(psvDemands.dueDate, psvDemands.createdAt)
    .limit(500);
}

export async function savePsvDemand(
  userId: number,
  input: {
    id?: number;
    title: string;
    category: string;
    dueDate: string;
    completed?: boolean;
  }
) {
  const db = await getDb();
  const title = cleanPortfolioText(input.title, 240);
  if (!title) throw new Error("Informe a demanda.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate))
    throw new Error("Informe uma data válida.");
  const values = {
    userId,
    title,
    category: cleanPortfolioText(input.category, 80) || "Comercial",
    dueDate: input.dueDate,
    completed: input.completed ?? false,
  };
  if (input.id) {
    const existing = (
      await db
        .select()
        .from(psvDemands)
        .where(and(eq(psvDemands.id, input.id), eq(psvDemands.userId, userId)))
        .limit(1)
    )[0];
    if (!existing) throw new Error("Demanda não encontrada.");
    await db
      .update(psvDemands)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(psvDemands.id, input.id));
  } else await db.insert(psvDemands).values(values);
  return listPsvDemands(userId);
}

export async function removePsvDemand(userId: number, id: number) {
  const db = await getDb();
  await db
    .delete(psvDemands)
    .where(and(eq(psvDemands.id, id), eq(psvDemands.userId, userId)));
  return { success: true };
}

export async function listBestPracticePosts() {
  const db = await getDb();
  await ensureBestPracticeTable(db);
  let rows: Array<typeof bestPracticePosts.$inferSelect>;
  try {
    rows = await db.select().from(bestPracticePosts).orderBy(desc(bestPracticePosts.createdAt)).limit(100);
  } catch {
    const legacyRows = await db.select({
      id: bestPracticePosts.id,
      authorUserId: bestPracticePosts.authorUserId,
      authorName: bestPracticePosts.authorName,
      title: bestPracticePosts.title,
      content: bestPracticePosts.content,
      createdAt: bestPracticePosts.createdAt,
    }).from(bestPracticePosts).orderBy(desc(bestPracticePosts.createdAt)).limit(100);
    rows = legacyRows.map(row => ({ ...row, imageKey: null })) as Array<typeof bestPracticePosts.$inferSelect>;
  }
  return rows.map(row => ({
    ...row,
    imageUrl: row.imageKey ? `/storage/${row.imageKey}` : null,
    attachmentUrl: row.imageKey ? `/storage/${row.imageKey}` : null,
    attachmentMimeType: row.imageKey && /\.pdf$/i.test(row.imageKey) ? "application/pdf" : row.imageKey ? "image/*" : null,
  }));
}

async function ensureBestPracticeTable(db: Awaited<ReturnType<typeof getDb>>) {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS best_practice_posts (
    id int AUTO_INCREMENT NOT NULL,
    authorUserId int NOT NULL,
    authorName varchar(160) NOT NULL,
    title varchar(160) NOT NULL,
    content text NOT NULL,
    createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  )`);
  try {
    await db.execute(sql`ALTER TABLE best_practice_posts ADD COLUMN imageKey varchar(512) NULL`);
  } catch {
    // The column already exists on databases that ran the attachment migration.
  }
}

export async function createBestPracticePost(
  userId: number,
  authorName: string,
  input: {
    title: string;
    content: string;
    imageDataBase64?: string;
    imageMimeType?: string;
    imageFileName?: string;
  }
) {
  const db = await getDb();
  await ensureBestPracticeTable(db);
  const title = cleanPortfolioText(input.title, 160);
  const content = cleanPortfolioText(input.content, 8000);
  const normalizedAuthorName = cleanPortfolioText(authorName, 160);
  const displayAuthorName = normalizedAuthorName.includes("@")
    ? normalizedAuthorName.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, letter => letter.toUpperCase())
    : normalizedAuthorName;
  if (!title) throw new Error("Informe um título para a boa prática.");
  if (!content) throw new Error("Descreva a boa prática antes de publicar.");
  let imageKey: string | null = null;
  if (input.imageDataBase64) {
    const buffer = Buffer.from(input.imageDataBase64, "base64");
    if (!buffer.length || buffer.byteLength > 8 * 1024 * 1024)
      throw new Error("Envie uma imagem de até 8 MB.");
    const isImage = input.imageMimeType?.startsWith("image/");
    const isPdf = input.imageMimeType === "application/pdf";
    if (!isImage && !isPdf)
      throw new Error("O anexo precisa ser uma imagem ou PDF.");
    const safeName =
      (input.imageFileName ?? "imagem")
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .slice(-180) || "imagem";
    const stored = await storagePut(
      `best-practices/${userId}/${Date.now()}-${safeName}`,
      buffer,
      input.imageMimeType
    );
    imageKey = stored.key;
  }
  try {
    await db.insert(bestPracticePosts).values({ authorUserId: userId, authorName: displayAuthorName || "Agente", title, content, imageKey });
  } catch {
    await db.insert(bestPracticePosts).values({ authorUserId: userId, authorName: displayAuthorName || "Agente", title, content });
  }
  return listBestPracticePosts();
}

export async function removeBestPracticePost(
  userId: number,
  isAdmin: boolean,
  id: number
) {
  const db = await getDb();
  if (isAdmin) {
    await db.delete(bestPracticePosts).where(eq(bestPracticePosts.id, id));
  } else {
    await db
      .delete(bestPracticePosts)
      .where(
        and(
          eq(bestPracticePosts.id, id),
          eq(bestPracticePosts.authorUserId, userId)
        )
      );
  }
  return listBestPracticePosts();
}

const DEFAULT_NEWS_ARTICLES = [
  {
    id: -4,
    authorUserId: 0,
    authorName: "Nova Odisseia",
    title: "Radar de negócios de 17/09/2026: converse sobre eficiência e caixa",
    category: "Mercado e vendas",
    content: "Notícia editorial do dia: em um cenário de decisão mais racional, o agente deve investigar fluxo de caixa, prazo de recebimento, custo total dos meios de pagamento e capacidade de giro antes de discutir taxa. Na conversa com o cliente, transforme a análise em perguntas: onde há perda operacional, qual produto melhora o controle e qual próximo passo pode ser medido?",
    publishedAt: new Date("2026-09-17T08:00:00Z"),
  },
  {
    id: -1,
    authorUserId: 0,
    authorName: "Nova Odisseia",
    title: "Nova Odisseia 2.0: a jornada da meta à Ítaka",
    category: "Atualização da plataforma",
    content: "A Nova Odisseia 2.0 reúne preparação, prospecção, execução, medição e desenvolvimento em uma rotina única. Comece pelo painel inicial, acompanhe seus indicadores, registre Boas Práticas e use os módulos de PSV, Estratégia, RMR e SPARTACUS para transformar dados em próximas ações.",
    publishedAt: new Date("2026-09-16T08:00:00Z"),
  },
  {
    id: -2,
    authorUserId: 0,
    authorName: "Nova Odisseia",
    title: "Tutorial: como usar a plataforma no dia a dia",
    category: "Tutorial",
    content: "1) Confira a mensagem de Ítaka e os KPIs no painel inicial. 2) Planeje tarefas, propostas e TPV no Plano semanal. 3) Prepare clientes no Cavalo de Tróia e registre visitas na Estratégia Nórdica. 4) Use Gerar descrição da tarefa para documentar a reunião e os próximos passos do MEGA. 5) Registre o resultado no RMR e desenvolva competências no SPARTACUS.",
    publishedAt: new Date("2026-09-16T09:00:00Z"),
  },
  {
    id: -3,
    authorUserId: 0,
    authorName: "Nova Odisseia",
    title: "Radar do agente Stone: o que observar em uma conversa de negócio",
    category: "Mercado e vendas",
    content: "Para conversar com qualidade, entenda o segmento e o fluxo de caixa do cliente, TPV, mix de débito/crédito/PIX, prazo de recebimento, custo de aluguel, conciliação, suporte e concentração no concorrente. Pergunte antes de propor: uma boa recomendação conecta a dor observada ao ecossistema, ao atendimento e ao ganho operacional, sem reduzir a conversa apenas à taxa.",
    publishedAt: new Date("2026-09-16T10:00:00Z"),
  },
];

export async function canManageNews(userId: number) {
  const db = await getDb();
  const row = (await db.select({ role: users.role, leadershipRole: agentProfiles.leadershipRole }).from(users).leftJoin(agentProfiles, eq(agentProfiles.userId, users.id)).where(eq(users.id, userId)).limit(1))[0];
  return row?.role === "admin" || row?.leadershipRole === "polo";
}

const AUTO_NEWS_AUTHOR_NAME = "Nova Odisseia";
const AUTO_NEWS_INTERVAL_MS = 12 * 60 * 60 * 1000;

/** Publica automaticamente o próximo item da rotação editorial quando passam 12h desde a última publicação do sistema. */
export async function publishScheduledNewsIfDue() {
  const db = await getDb();
  await ensureNewsArticlesSchema(db);
  const systemAuthor = (
    await db.select({ id: users.id }).from(users).where(eq(users.role, "admin")).limit(1)
  )[0];
  if (!systemAuthor) return;
  const previousSystemPosts = await db
    .select({ id: newsArticles.id, publishedAt: newsArticles.publishedAt })
    .from(newsArticles)
    .where(eq(newsArticles.authorName, AUTO_NEWS_AUTHOR_NAME))
    .orderBy(desc(newsArticles.publishedAt))
    .limit(1);
  const lastPost = previousSystemPosts[0];
  if (lastPost && Date.now() - new Date(lastPost.publishedAt).getTime() < AUTO_NEWS_INTERVAL_MS) return;
  const totalSystemPosts = (
    await db.select({ id: newsArticles.id }).from(newsArticles).where(eq(newsArticles.authorName, AUTO_NEWS_AUTHOR_NAME))
  ).length;
  const item = pickAutoNewsItem(totalSystemPosts);
  await db.insert(newsArticles).values({
    authorUserId: systemAuthor.id,
    authorName: AUTO_NEWS_AUTHOR_NAME,
    title: item.title,
    category: item.category,
    content: item.content,
  });
}

let newsSchemaReady: Promise<void> | null = null;

/** Garante a tabela e a coluna `pinned` (migração 0032) uma vez por processo; bancos antigos ficaram sem a coluna. */
export async function ensureNewsArticlesSchema(db: { execute: (query: any) => Promise<unknown> }) {
  newsSchemaReady ??= (async () => {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS news_articles (
    id int AUTO_INCREMENT NOT NULL,
    authorUserId int NOT NULL,
    authorName varchar(160) NOT NULL,
    title varchar(200) NOT NULL,
    category varchar(80) NOT NULL DEFAULT 'Negócios',
    content text NOT NULL,
    pinned boolean NOT NULL DEFAULT false,
    publishedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  )`);
    try {
      await db.execute(sql`ALTER TABLE news_articles ADD COLUMN pinned boolean NOT NULL DEFAULT false`);
    } catch (error) {
      // Coluna já existe (bancos que rodaram a migração 0032). Outros erros sobem.
      if (!/duplicate column/i.test(String((error as any)?.cause?.message ?? (error as any)?.message ?? error))) throw error;
    }
  })().catch(error => { newsSchemaReady = null; throw error; });
  return newsSchemaReady;
}

export async function listNewsArticles() {
  const db = await getDb();
  await ensureNewsArticlesSchema(db);
  try {
    await publishScheduledNewsIfDue();
  } catch (error) {
    console.error("Falha ao publicar notícia automática", error);
  }
  const articles = await db.select().from(newsArticles).orderBy(desc(newsArticles.pinned), desc(newsArticles.publishedAt)).limit(100);
  return [...DEFAULT_NEWS_ARTICLES, ...articles];
}

export async function saveNewsArticle(userId: number, input: { id?: number; title: string; category: string; content: string }) {
  if (!(await canManageNews(userId))) throw new Error("Apenas admin e donos de polo podem editar notícias.");
  const db = await getDb();
  await listNewsArticles();
  const values = {
    authorUserId: userId,
    authorName: "",
    title: cleanPortfolioText(input.title, 200),
    category: cleanPortfolioText(input.category, 80) || "Negócios",
    content: cleanPortfolioText(input.content, 8000),
  };
  const profile = (await db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1))[0];
  values.authorName = profile?.name || "Editor Nova Odisseia";
  if (!values.title || !values.content) throw new Error("Informe título e conteúdo da matéria.");
  if (input.id) {
    await db.update(newsArticles).set({ ...values, updatedAt: new Date() }).where(eq(newsArticles.id, input.id));
  } else {
    await db.insert(newsArticles).values(values);
  }
  return listNewsArticles();
}

export async function toggleNewsPin(userId: number, id: number, pinned: boolean) {
  if (!(await canManageNews(userId))) throw new Error("Apenas admin e donos de polo podem fixar notícias.");
  const db = await getDb();
  await ensureNewsArticlesSchema(db);
  await db.update(newsArticles).set({ pinned }).where(eq(newsArticles.id, id));
  return listNewsArticles();
}

export async function removeNewsArticle(userId: number, id: number) {
  if (!(await canManageNews(userId))) throw new Error("Apenas admin e donos de polo podem remover notícias.");
  const db = await getDb();
  await db.delete(newsArticles).where(eq(newsArticles.id, id));
  return listNewsArticles();
}

export async function listMeetingLeads() {
  const db = await getDb();
  return db.select().from(meetingLeads).orderBy(desc(meetingLeads.updatedAt)).limit(500);
}

export async function saveMeetingLead(userId: number, input: {
  id?: number;
  polo?: string;
  cnpj: string;
  tradeName: string;
  tpv: number;
  segment: string;
  route: string;
  decisionMaker: string;
  contact: string;
  notes?: string;
  status: "novo" | "contato" | "agendada" | "realizada" | "cancelada";
}) {
  const db = await getDb();
  const values = {
    createdByUserId: userId,
    polo: cleanPortfolioText(input.polo, 120),
    cnpj: cleanPortfolioText(input.cnpj, 40),
    tradeName: cleanPortfolioText(input.tradeName, 160),
    tpv: Math.max(input.tpv, 0),
    segment: cleanPortfolioText(input.segment, 160),
    route: cleanPortfolioText(input.route, 120),
    decisionMaker: cleanPortfolioText(input.decisionMaker, 160),
    contact: cleanPortfolioText(input.contact, 160),
    notes: cleanPortfolioText(input.notes, 4000) || null,
    status: input.status,
  };
  if (!values.tradeName) throw new Error("Informe o nome do cliente.");
  if (input.id) {
    const existing = (await db.select({ id: meetingLeads.id }).from(meetingLeads).where(eq(meetingLeads.id, input.id)).limit(1))[0];
    if (!existing) throw new Error("Agendamento não encontrado.");
    await db.update(meetingLeads).set(values).where(eq(meetingLeads.id, input.id));
  } else {
    await db.insert(meetingLeads).values(values);
  }
  return listMeetingLeads();
}

export async function listMeetingPeriod(userId: number, periodKey: string) {
  const db = await getDb();
  return (await db.select().from(meetingPeriodMetrics).where(and(eq(meetingPeriodMetrics.userId, userId), eq(meetingPeriodMetrics.periodKey, periodKey))).limit(1))[0] ?? {
    callsMade: 0,
    callsAnswered: 0,
    meetingsBooked: 0,
    clientsCredited: 0,
  };
}

export async function saveMeetingPeriod(userId: number, input: { periodKey: string; callsMade: number; callsAnswered: number; meetingsBooked: number; clientsCredited: number }) {
  const db = await getDb();
  await db.insert(meetingPeriodMetrics).values({ userId, ...input }).onDuplicateKeyUpdate({ set: input });
  return listMeetingPeriod(userId, input.periodKey);
}

async function canAccessScheduleScope(
  actorUserId: number,
  schedule: typeof teamSchedules.$inferSelect
) {
  const db = await getDb();
  const [actorRow, ownerRow] = await Promise.all([
    db
      .select({ user: users, profile: agentProfiles })
      .from(users)
      .innerJoin(agentProfiles, eq(agentProfiles.userId, users.id))
      .where(eq(users.id, actorUserId))
      .limit(1),
    schedule.scopeId
      ? db
          .select({ user: users, profile: agentProfiles })
          .from(users)
          .innerJoin(agentProfiles, eq(agentProfiles.userId, users.id))
          .where(eq(users.id, schedule.scopeId))
          .limit(1)
      : [],
  ]);
  const actor = actorRow[0];
  const owner = ownerRow[0];
  if (!actor) return false;
  if (actor.user.role === "admin") return true;
  if (!owner) return false;
  if (actor.user.id === owner.user.id) return true;
  if (schedule.scopeType === "user")
    return canAccessTeamMember(
      teamIdentity(actor.user, actor.profile),
      teamIdentity(owner.user, owner.profile)
    );
  if (schedule.scopeType === "polo")
    return (
      owner.profile.leadershipRole === "polo" &&
      normalizeOrganizationKey(actor.profile.polo) ===
        normalizeOrganizationKey(owner.profile.polo)
    );
  if (schedule.scopeType === "district")
    return (
      owner.profile.leadershipRole === "distrital" &&
      normalizeOrganizationKey(actor.profile.district) ===
        normalizeOrganizationKey(owner.profile.district)
    );
  if (schedule.scopeType === "regional")
    return (
      owner.profile.leadershipRole === "distrital" &&
      normalizeOrganizationKey(actor.profile.regional) ===
        normalizeOrganizationKey(owner.profile.regional)
    );
  return false;
}

async function assertScheduleManagementAccess(
  actorUserId: number,
  schedule: typeof teamSchedules.$inferSelect
) {
  if (schedule.scopeType !== "user" || !schedule.scopeId) {
    const db = await getDb();
    const [actor] = await db
      .select()
      .from(users)
      .where(eq(users.id, actorUserId))
      .limit(1);
    if (actor?.role === "admin") return { db, actor };
    throw new Error(
      "Somente administradores podem administrar rotinas sem agente responsável."
    );
  }
  return assertTeamManagementAccess(actorUserId, schedule.scopeId);
}

export async function listTeamSchedules(
  actorUserId: number,
  targetUserId?: number
) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(teamSchedules)
    .orderBy(teamSchedules.weekday, teamSchedules.startTime)
    .limit(500);
  const filtered = targetUserId
    ? rows.filter(
        row => row.scopeType === "user" && row.scopeId === targetUserId
      )
    : rows;
  const allowed = [] as typeof rows;
  for (const row of filtered)
    if (await canAccessScheduleScope(actorUserId, row)) allowed.push(row);
  return allowed;
}

export async function saveTeamSchedule(
  actorUserId: number,
  input: {
    id?: number;
    scopeType: "user" | "polo" | "district" | "regional";
    scopeId?: number | null;
    dupla?: string | null;
    weekday: number;
    startTime: string;
    endTime: string;
    activity: string;
    description?: string | null;
    active?: boolean;
  }
) {
  const db = await getDb();
  const actor = (
    await db
      .select({ user: users, profile: agentProfiles })
      .from(users)
      .innerJoin(agentProfiles, eq(agentProfiles.userId, users.id))
      .where(eq(users.id, actorUserId))
      .limit(1)
  )[0];
  if (!actor) throw new Error("Perfil do usuário não encontrado.");
  const requestedScopeId = input.scopeId ?? actorUserId;
  const scopeOwner = (
    await db
      .select({ user: users, profile: agentProfiles })
      .from(users)
      .innerJoin(agentProfiles, eq(agentProfiles.userId, users.id))
      .where(eq(users.id, requestedScopeId))
      .limit(1)
  )[0];
  if (!scopeOwner) throw new Error("Responsável pelo escopo não encontrado.");
  const isAdmin = actor.user.role === "admin";
  if (!isAdmin) await assertTeamManagementAccess(actorUserId, requestedScopeId);
  if (!isAdmin && input.scopeType !== "user")
    throw new Error(
      "Líderes devem configurar rotinas vinculadas a um agente real."
    );
  if (
    !Number.isInteger(input.weekday) ||
    input.weekday < 0 ||
    input.weekday > 6
  )
    throw new Error("Informe um dia da semana válido.");
  if (
    !/^\d{2}:\d{2}$/.test(input.startTime) ||
    !/^\d{2}:\d{2}$/.test(input.endTime)
  )
    throw new Error("Informe horários válidos.");
  const existing = input.id
    ? (
        await db
          .select()
          .from(teamSchedules)
          .where(eq(teamSchedules.id, input.id))
          .limit(1)
      )[0]
    : null;
  if (input.id && !existing) throw new Error("Rotina não encontrada.");
  if (existing) {
    await assertScheduleManagementAccess(actorUserId, existing);
  }
  const scopeType = existing && !isAdmin ? existing.scopeType : input.scopeType;
  const scopeId = existing && !isAdmin ? existing.scopeId : requestedScopeId;
  const values = {
    scopeType,
    scopeId,
    dupla: input.dupla?.trim().slice(0, 120) || null,
    weekday: input.weekday,
    startTime: input.startTime,
    endTime: input.endTime,
    activity: input.activity.trim().slice(0, 160),
    description: input.description?.trim().slice(0, 4000) || null,
    active: input.active ?? existing?.active ?? true,
  };
  if (!values.activity) throw new Error("Informe a atividade da rotina.");
  if (input.id)
    await db
      .update(teamSchedules)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(teamSchedules.id, input.id));
  else await db.insert(teamSchedules).values(values);
  return listTeamSchedules(
    actorUserId,
    input.scopeType === "user" ? (scopeId ?? undefined) : undefined
  );
}

export async function deactivateTeamSchedule(actorUserId: number, id: number) {
  const db = await getDb();
  const schedule = (
    await db
      .select()
      .from(teamSchedules)
      .where(eq(teamSchedules.id, id))
      .limit(1)
  )[0];
  if (!schedule) throw new Error("Rotina fora do seu escopo.");
  await assertScheduleManagementAccess(actorUserId, schedule);
  await db
    .update(teamSchedules)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(teamSchedules.id, id));
  return { success: true };
}

export async function getDashboard(userId: number) {
  const db = await getDb();
  const [
    profileRows,
    goalRows,
    simulationRows,
    rmrRows,
    pointRows,
    pipelineRows,
  ] = await Promise.all([
    db
      .select()
      .from(agentProfiles)
      .where(eq(agentProfiles.userId, userId))
      .limit(1),
    db
      .select()
      .from(monthlyGoals)
      .where(eq(monthlyGoals.userId, userId))
      .orderBy(desc(monthlyGoals.monthKey))
      .limit(1),
    db
      .select()
      .from(simulations)
      .where(eq(simulations.userId, userId))
      .orderBy(desc(simulations.createdAt))
      .limit(8),
    db
      .select()
      .from(rmrRecords)
      .where(eq(rmrRecords.userId, userId))
      .orderBy(desc(rmrRecords.createdAt))
      .limit(6),
    db
      .select({ total: sql<number>`coalesce(sum(${pointEvents.points}), 0)` })
      .from(pointEvents)
      .where(eq(pointEvents.userId, userId)),
    db
      .select()
      .from(psvPipelineLeads)
      .where(eq(psvPipelineLeads.userId, userId))
      .orderBy(desc(psvPipelineLeads.updatedAt))
      .limit(50),
  ]);
  return {
    profile: profileRows[0] ?? null,
    latestGoal: goalRows[0] ?? null,
    simulations: simulationRows,
    rmrRecords: rmrRows,
    pipelineLeads: pipelineRows,
    points: Number(pointRows[0]?.total ?? 0),
  };
}

export async function saveMonthlyGoal(
  userId: number,
  input: {
    monthKey: string;
    targetVariable: number;
    targetTpv: number;
    targetNewClients: number;
    actualTpv: number;
    actualVariable: number;
  }
) {
  const db = await getDb();
  await db
    .insert(monthlyGoals)
    .values({ userId, ...input })
    .onDuplicateKeyUpdate({ set: { ...input } });
}

export async function saveSimulation(
  userId: number,
  input: {
    periodLabel: string;
    goalTpv: number;
    eligibleTpv: number;
    hunterTpv: number;
    newSalesBase: number;
    multiplier: number;
    finalVariable: number;
    detailsJson?: string;
  }
) {
  const db = await getDb();
  await db.insert(simulations).values({ userId, ...input });
  await db.insert(pointEvents).values({
    userId,
    kind: "simulation",
    label: "Simulação registrada",
    points: 10,
  });
}

export type MonthlyFinalCardInput = {
  monthKey: string;
  globalKpi: number;
  totalMigratedTpv: number;
  multiplier: number;
  actualVariable: number;
  clients7To15: number;
  clients15To30: number;
  clients30To50: number;
  clients50To100: number;
  clients100Plus: number;
};

export async function getMonthlyFinalCard(userId: number, monthKey: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(monthlyFinalCards)
    .where(
      and(
        eq(monthlyFinalCards.userId, userId),
        eq(monthlyFinalCards.monthKey, monthKey)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function getMonthlyFinalCardSuggestion(
  userId: number
): Promise<Omit<MonthlyFinalCardInput, "monthKey">> {
  const db = await getDb();
  const [simulationRows, rmrRows] = await Promise.all([
    db
      .select()
      .from(simulations)
      .where(eq(simulations.userId, userId))
      .orderBy(desc(simulations.createdAt))
      .limit(1),
    db
      .select()
      .from(rmrRecords)
      .where(eq(rmrRecords.userId, userId))
      .orderBy(desc(rmrRecords.createdAt))
      .limit(1),
  ]);
  const simulation = simulationRows[0];
  const tiers = countMonthlyFinalCardTiers(
    getSimulationClients(simulation?.detailsJson)
  );
  return {
    globalKpi: rmrRows[0]?.globalKpi ?? 0,
    totalMigratedTpv: simulation?.eligibleTpv ?? 0,
    multiplier: simulation?.multiplier ?? 0,
    actualVariable: simulation?.finalVariable ?? 0,
    ...tiers,
  };
}

export async function saveMonthlyFinalCard(
  userId: number,
  input: MonthlyFinalCardInput
) {
  const db = await getDb();
  await db
    .insert(monthlyFinalCards)
    .values({ userId, ...input })
    .onDuplicateKeyUpdate({ set: { ...input } });
}

export async function importRoutePortfolio(
  userId: number,
  input: {
    portfolioType: PortfolioType;
    fileName: string;
    fileDataBase64: string;
    fileMimeType?: string;
    referenceMonth?: string;
    rows: RoutePortfolioRow[];
    sourceType?: string;
    sourceOrigin?: string;
  },
  scope: "route" | "polo" | "district" = "route"
) {
  const db = await getDb();
  const profile = (
    await db
      .select()
      .from(agentProfiles)
      .where(eq(agentProfiles.userId, userId))
      .limit(1)
  )[0];
  const actor = (
    await db.select().from(users).where(eq(users.id, userId)).limit(1)
  )[0];
  const formalRoutes = await getFormalRoutes(userId);
  const isDistrictUpload = scope === "district";
  const isPoloUpload = scope === "polo";
  if (!profile) throw new Error("Perfil não encontrado.");
  assertPortfolioImportAccess(scope, profile.leadershipRole, actor?.role);
  if (isPoloUpload && !profile.polo.trim() && actor?.role !== "admin")
    throw new Error(
      "Informe o polo no perfil antes de subir a carteira do polo."
    );
  if (
    !isDistrictUpload &&
    !isPoloUpload &&
    actor?.role !== "admin" &&
    !formalRoutes.length
  )
    throw new Error(
      "Sua rota precisa ser atribuída formalmente por uma liderança antes de anexar ou consultar carteiras."
    );
  const routeFromProfile = normalizeRouteKey(profile.route);
  const defaultRoute =
    formalRoutes.find(item => item.routeKey === routeFromProfile) ??
    (formalRoutes.length === 1 ? formalRoutes[0] : undefined);
  const ownRoute = defaultRoute?.route ?? "";
  const ownRouteKeys = new Set(formalRoutes.map(item => item.routeKey));
  const allAssignments = await db
    .select({
      routeKey: routeAssignments.routeKey,
      polo: routeAssignments.polo,
    })
    .from(routeAssignments);
  const actorPoloKey = normalizeOrganizationKey(profile.polo);
  const routesOutsidePolo = new Set(
    allAssignments
      .filter(
        item =>
          normalizeOrganizationKey(item.polo) &&
          normalizeOrganizationKey(item.polo) !== actorPoloKey
      )
      .map(item => item.routeKey)
      .filter(Boolean)
  );
  const referenceMonth =
    input.referenceMonth ?? new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(referenceMonth))
    throw new Error("Informe uma competência no formato AAAA-MM.");
  const deduplicated = deduplicateLeadListRows(input.rows);
  const parsedRows = deduplicated.uniqueRows
    .map(row => {
      const route =
        cleanPortfolioText(row.route, 120) ||
        (isDistrictUpload || isPoloUpload ? "" : ownRoute);
      const routeKey = normalizeRouteKey(route);
      if ((isDistrictUpload || isPoloUpload) && !routeKey)
        throw new Error(
          `A carteira ${isDistrictUpload ? "distrital" : "do polo"} precisa ter a coluna Rota preenchida em todas as linhas.`
        );
      if (
        !isDistrictUpload &&
        !isPoloUpload &&
        actor?.role !== "admin" &&
        (!routeKey || !ownRouteKeys.has(routeKey))
      )
        throw new Error(
          "Agentes só podem anexar carteiras de rotas sob sua titularidade formal."
        );
      if (
        isPoloUpload &&
        actor?.role !== "admin" &&
        routesOutsidePolo.has(routeKey)
      )
        throw new Error(
          "A planilha contém uma rota cadastrada em outro polo. Revise a coluna Rota antes de importar."
        );
      return {
        portfolioType: input.portfolioType,
        route,
        routeKey,
        clientName: cleanPortfolioText(row.clientName, 160),
        document: cleanPortfolioText(row.document, 32),
        mcc: cleanPortfolioText(row.mcc, 8),
        cnae: cleanPortfolioText(row.cnae, 24),
        segment: cleanPortfolioText(row.segment, 160),
        projectedTpv:
          typeof row.projectedTpv === "number"
            ? Math.max(row.projectedTpv, 0)
            : 0,
        stage: cleanPortfolioText(row.stage, 80),
        temperature: cleanPortfolioText(row.temperature, 32),
        phone: cleanPortfolioText(row.phone, 48),
        city: cleanPortfolioText(row.city, 120),
        lastInteraction: cleanPortfolioText(row.lastInteraction, 160),
        nextAction: cleanPortfolioText(row.nextAction, 320),
        nextContactAt: row.nextContactAt ?? null,
        notes: cleanPortfolioText(row.notes, 4000) || null,
        rawJson: cleanPortfolioText(row.rawJson, 6000) || null,
      };
    })
    .filter(row => row.clientName && row.routeKey);
  if (!parsedRows.length)
    throw new Error("A planilha não contém linhas com cliente e rota válidos.");
  if (parsedRows.length > 5000)
    throw new Error("A importação aceita até 5.000 linhas por planilha.");

  const buffer = Buffer.from(input.fileDataBase64, "base64");
  if (!buffer.length || buffer.byteLength > 12 * 1024 * 1024)
    throw new Error("Envie uma planilha de até 12 MB.");
  const safeName =
    input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-180) ||
    "carteira.xlsx";
  const allowedMimeTypes = new Set([
    "text/csv",
    "application/pdf",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ]);
  const stored = await storagePut(
    `route-portfolios/${userId}/${Date.now()}-${safeName}`,
    buffer,
    allowedMimeTypes.has(input.fileMimeType ?? "")
      ? input.fileMimeType
      : "application/octet-stream"
  );
  const created = await db
    .insert(routePortfolioImports)
    .values({
      userId,
      portfolioType: input.portfolioType,
      fileName: input.fileName.slice(0, 255),
      fileKey: stored.key,
      rowCount: parsedRows.length,
      referenceMonth,
      sourceScope: scope,
      sourceType:
        cleanPortfolioText(input.sourceType ?? "arquivo", 32) || "arquivo",
      sourceOrigin:
        cleanPortfolioText(input.sourceOrigin ?? "arquivo local", 160) ||
        "arquivo local",
    })
    .$returningId();
  const importId = created[0]?.id;
  if (!importId)
    throw new Error("Não foi possível registrar a importação da carteira.");
  await recordSecurityAuditEvent({
    actorUserId: userId,
    eventType: "portfolio_import",
    targetType:
      input.portfolioType === "base" ? "base_portfolio" : "route_portfolio",
    targetId: importId,
    scope:
      scope === "district"
        ? profile.district
        : scope === "polo"
          ? profile.polo
          : "route",
  });
  for (let index = 0; index < parsedRows.length; index += 200) {
    await db
      .insert(routePortfolioEntries)
      .values(
        parsedRows.slice(index, index + 200).map(row => ({ importId, ...row }))
      );
  }
  const registeredRouteKeys = new Set(
    allAssignments.map(item => item.routeKey).filter(Boolean)
  );
  const waitingRoutes = Array.from(
    new Set(
      parsedRows
        .map(row => row.routeKey)
        .filter(routeKey => !registeredRouteKeys.has(routeKey))
    )
  );
  return {
    importId,
    rowCount: parsedRows.length,
    duplicateCount: deduplicated.duplicates,
    fileName: input.fileName,
    fileKey: stored.key,
    referenceMonth,
    waitingRoutes,
  };
}

/** Baixa uma única exportação autorizada da Stone; não segue redirecionamentos nem grava a URL completa. */
export async function importStoneLeadList(
  userId: number,
  input: { url: string; referenceMonth?: string }
) {
  const db = await getDb();
  const [profile, actor, routes] = await Promise.all([
    db
      .select()
      .from(agentProfiles)
      .where(eq(agentProfiles.userId, userId))
      .limit(1)
      .then(rows => rows[0]),
    db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .then(rows => rows[0]),
    getFormalRoutes(userId),
  ]);
  if (!profile) throw new Error("Perfil não encontrado.");
  if (actor?.role !== "admin" && !routes.length)
    throw new Error(
      "Sua rota precisa ser atribuída formalmente antes de importar a Lista Inteligente."
    );
  const source = parseAuthorizedStoneLeadListUrl(input.url);
  const isGoogleHtml = isAuthorizedStoneGoogleHtmlUrl(source);
  let response: Response;
  try {
    response = await fetch(source, {
      redirect: "manual",
      signal: AbortSignal.timeout(20_000),
      headers: {
        Accept: isGoogleHtml
          ? "text/html,application/xhtml+xml"
          : "text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel",
      },
    });
  } catch {
    throw new Error(
      "Não foi possível acessar a Lista Inteligente. Confirme se o link exportável está ativo."
    );
  }
  if (response.status >= 300 && response.status < 400)
    throw new Error(
      "O link não pode redirecionar para outro domínio. Use o endereço final de exportação da Stone."
    );
  if (!response.ok)
    throw new Error(
      "Não foi possível baixar a Lista Inteligente. Confirme a validade do link exportável."
    );
  const declaredSize = Number(response.headers.get("content-length") ?? 0);
  if (declaredSize > 12 * 1024 * 1024)
    throw new Error("A Lista Inteligente ultrapassa o limite de 12 MB.");
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length || buffer.byteLength > 12 * 1024 * 1024)
    throw new Error(
      "A Lista Inteligente está vazia ou ultrapassa o limite de 12 MB."
    );
  const contentType = response.headers.get("content-type") ?? "";
  if (
    isGoogleHtml
      ? !/text\/html|application\/xhtml\+xml|octet-stream/i.test(contentType)
      : !/csv|excel|spreadsheet|octet-stream|text\/plain/i.test(contentType)
  )
    throw new Error(
      isGoogleHtml
        ? "O link oficial precisa fornecer o relatório HTML da Lista Inteligente."
        : "O link deve fornecer uma exportação CSV ou XLSX, e não uma página de navegação."
    );
  let rows: RoutePortfolioRow[];
  try {
    rows = isGoogleHtml
      ? parsePortfolioHtmlTable(buffer.toString("utf8"))
      : parsePortfolioSpreadsheetBuffer(buffer);
  } catch {
    throw new Error(
      isGoogleHtml
        ? "Não foi possível reconhecer a tabela do relatório HTML. Gere um novo link oficial da Lista Inteligente."
        : "Não foi possível ler o arquivo exportado. Use CSV, XLSX ou XLS com cabeçalhos de carteira."
    );
  }
  const isSpreadsheet = buffer.subarray(0, 2).toString() === "PK";
  const safeCsv = isGoogleHtml
    ? Buffer.from(
        [
          "Rota;Cliente;Documento;Telefone;Cidade;Etapa;Valor;Última Interação;Próxima Ação",
          ...rows.map(row =>
            [
              row.route,
              row.clientName,
              row.document,
              row.phone,
              row.city,
              row.stage,
              row.projectedTpv,
              row.lastInteraction,
              row.nextAction,
            ]
              .map(value => `"${String(value ?? "").replace(/"/g, '""')}"`)
              .join(";")
          ),
        ].join("\n"),
        "utf8"
      )
    : buffer;
  return importRoutePortfolio(
    userId,
    {
      portfolioType: "route",
      fileName: `lista-inteligente-stone-${new Date().toISOString().slice(0, 10)}.${isSpreadsheet && !isGoogleHtml ? "xlsx" : "csv"}`,
      fileDataBase64: safeCsv.toString("base64"),
      fileMimeType:
        isSpreadsheet && !isGoogleHtml
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "text/csv",
      referenceMonth: input.referenceMonth,
      rows,
      sourceType: "lista_inteligente",
      sourceOrigin: stoneLeadListSourceOrigin(source),
    },
    "route"
  );
}

export async function importDistrictPortfolio(
  userId: number,
  input: {
    portfolioType: PortfolioType;
    fileName: string;
    fileDataBase64: string;
    fileMimeType?: string;
    rows: RoutePortfolioRow[];
  }
) {
  return importRoutePortfolio(userId, input, "district");
}

export async function importPoloPortfolio(
  userId: number,
  input: {
    portfolioType: PortfolioType;
    fileName: string;
    fileDataBase64: string;
    fileMimeType?: string;
    rows: RoutePortfolioRow[];
  }
) {
  return importRoutePortfolio(userId, input, "polo");
}

export async function getSharedGoogleSheetFile(
  userId: number,
  input: { url: string; scope: "polo" | "district" }
) {
  const db = await getDb();
  const [profile] = await db
    .select()
    .from(agentProfiles)
    .where(eq(agentProfiles.userId, userId))
    .limit(1);
  const [actor] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!profile) throw new Error("Perfil não encontrado.");
  assertPortfolioImportAccess(input.scope, profile.leadershipRole, actor?.role);

  const reference = parseGoogleSheetReference(input.url);
  let response: Response;
  try {
    response = await fetch(reference.exportUrl, {
      headers: {
        Accept:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch {
    throw new Error(
      "Não foi possível acessar a Google Planilha. Verifique sua conexão e o link compartilhado."
    );
  }
  if (!response.ok)
    throw new Error(
      "Não foi possível baixar a Google Planilha. Configure o compartilhamento como 'Qualquer pessoa com o link pode visualizar'."
    );
  const declaredSize = Number(response.headers.get("content-length") ?? 0);
  if (declaredSize > 12 * 1024 * 1024)
    throw new Error(
      "A Google Planilha exportada ultrapassa o limite de 12 MB."
    );
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length || buffer.byteLength > 12 * 1024 * 1024)
    throw new Error(
      "A Google Planilha exportada ultrapassa o limite de 12 MB."
    );
  if (buffer.subarray(0, 2).toString() !== "PK")
    throw new Error(
      "Não foi possível abrir a planilha. Confirme que o link está compartilhado para visualização sem login."
    );
  return {
    fileName: `google-planilha-${reference.spreadsheetId}.xlsx`,
    fileDataBase64: buffer.toString("base64"),
  };
}

export async function getRoutePortfolioForUser(
  userId: number,
  portfolioType: PortfolioType,
  requestedReferenceMonth?: string
) {
  const db = await getDb();
  const [actor, formalRoutes] = await Promise.all([
    db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .then(rows => rows[0]),
    getFormalRoutes(userId),
  ]);
  if (requestedReferenceMonth && !/^\d{4}-\d{2}$/.test(requestedReferenceMonth))
    throw new Error("Competência inválida.");
  if (actor?.role !== "admin" && !formalRoutes.length)
    return {
      route: "",
      routes: [],
      entries: [],
      importInfo: null,
      referenceMonth: null,
      referenceMonths: [],
    };
  const routeScope =
    actor?.role === "admin"
      ? undefined
      : inArray(
          routePortfolioEntries.routeKey,
          formalRoutes.map(item => item.routeKey)
        );
  const importRows = await db
    .select({
      id: routePortfolioImports.id,
      routeKey: routePortfolioEntries.routeKey,
      fileName: routePortfolioImports.fileName,
      referenceMonth: routePortfolioImports.referenceMonth,
      sourceScope: routePortfolioImports.sourceScope,
      sourceType: routePortfolioImports.sourceType,
      sourceOrigin: routePortfolioImports.sourceOrigin,
      importedAt: routePortfolioImports.createdAt,
    })
    .from(routePortfolioEntries)
    .innerJoin(
      routePortfolioImports,
      eq(routePortfolioEntries.importId, routePortfolioImports.id)
    )
    .where(
      and(
        eq(routePortfolioEntries.portfolioType, portfolioType),
        ...(routeScope ? [routeScope] : [])
      )
    )
    .groupBy(
      routePortfolioImports.id,
      routePortfolioEntries.routeKey,
      routePortfolioImports.fileName,
      routePortfolioImports.referenceMonth,
      routePortfolioImports.sourceScope,
      routePortfolioImports.sourceType,
      routePortfolioImports.sourceOrigin,
      routePortfolioImports.createdAt
    )
    .orderBy(desc(routePortfolioImports.createdAt));
  const normalizedMonth = (row: (typeof importRows)[number]) =>
    row.referenceMonth || row.importedAt.toISOString().slice(0, 7);
  const referenceMonths = Array.from(new Set(importRows.map(normalizedMonth)))
    .sort()
    .reverse();
  const referenceMonth = requestedReferenceMonth ?? referenceMonths[0] ?? null;
  const selectedImports = new Map<string, (typeof importRows)[number]>();
  for (const row of importRows)
    if (
      referenceMonth &&
      normalizedMonth(row) === referenceMonth &&
      !selectedImports.has(row.routeKey)
    )
      selectedImports.set(row.routeKey, row);
  const selectedImportIds = Array.from(selectedImports.values()).map(
    row => row.id
  );
  if (!selectedImportIds.length)
    return {
      route: formalRoutes.map(item => item.route).join(", "),
      routes: formalRoutes,
      entries: [],
      importInfo: null,
      referenceMonth,
      referenceMonths,
    };
  const entryRouteScope =
    actor?.role === "admin"
      ? undefined
      : inArray(
          routePortfolioEntries.routeKey,
          formalRoutes.map(item => item.routeKey)
        );
  const rows = await db
    .select({
      id: routePortfolioEntries.id,
      importId: routePortfolioEntries.importId,
      route: routePortfolioEntries.route,
      clientName: routePortfolioEntries.clientName,
      document: routePortfolioEntries.document,
      mcc: routePortfolioEntries.mcc,
      cnae: routePortfolioEntries.cnae,
      segment: routePortfolioEntries.segment,
      projectedTpv: routePortfolioEntries.projectedTpv,
      stage: routePortfolioEntries.stage,
      temperature: routePortfolioEntries.temperature,
      phone: routePortfolioEntries.phone,
      city: routePortfolioEntries.city,
      lastInteraction: routePortfolioEntries.lastInteraction,
      nextAction: routePortfolioEntries.nextAction,
      nextContactAt: routePortfolioEntries.nextContactAt,
      notes: routePortfolioEntries.notes,
      fileName: routePortfolioImports.fileName,
      referenceMonth: routePortfolioImports.referenceMonth,
      sourceScope: routePortfolioImports.sourceScope,
      sourceType: routePortfolioImports.sourceType,
      sourceOrigin: routePortfolioImports.sourceOrigin,
      importedAt: routePortfolioImports.createdAt,
    })
    .from(routePortfolioEntries)
    .innerJoin(
      routePortfolioImports,
      eq(routePortfolioEntries.importId, routePortfolioImports.id)
    )
    .where(
      and(
        eq(routePortfolioEntries.portfolioType, portfolioType),
        inArray(routePortfolioEntries.importId, selectedImportIds),
        ...(entryRouteScope ? [entryRouteScope] : [])
      )
    )
    .orderBy(routePortfolioEntries.route, routePortfolioEntries.clientName)
    .limit(10_000);
  return {
    route: formalRoutes.map(item => item.route).join(", "),
    routes: formalRoutes,
    entries: rows,
    importInfo: rows[0]
      ? {
          fileName: rows[0].fileName,
          importedAt: rows[0].importedAt,
          rowCount: rows.length,
          sourceScope: rows[0].sourceScope,
          sourceType: rows[0].sourceType,
          sourceOrigin: rows[0].sourceOrigin,
        }
      : null,
    referenceMonth,
    referenceMonths,
  };
}

export async function removeRoutePortfolioEntries(userId: number, ids: number[]) {
  const db = await getDb();
  const requestedIds = Array.from(new Set(ids)).filter(id => Number.isInteger(id) && id > 0).slice(0, 500);
  if (!requestedIds.length) return { success: true, removed: 0 };
  const [actor, formalRoutes] = await Promise.all([
    db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1).then(rows => rows[0]),
    getFormalRoutes(userId),
  ]);
  const scope = actor?.role === "admin"
    ? undefined
    : inArray(routePortfolioEntries.routeKey, formalRoutes.map(route => route.routeKey));
  const result = await db.delete(routePortfolioEntries).where(and(inArray(routePortfolioEntries.id, requestedIds), ...(scope ? [scope] : [])));
  return { success: true, removed: result[0]?.affectedRows ?? requestedIds.length };
}

export async function savePsvPlan(
  userId: number,
  input: {
    weekOf: string;
    targetVariable: number;
    currentVariable: number;
    plannedMultiplier: number;
    weeksRemaining: number;
    recommendedTpv: number;
    recommendedClients30: number;
    recommendedClients50: number;
    recommendedClients100: number;
    notes?: string;
  }
) {
  const db = await getDb();
  await db.insert(psvPlans).values({ userId, ...input });
  const monthKey = input.weekOf.slice(0, 7);
  const kind = `psv-${monthKey}`;
  const existingReward = (
    await db
      .select({ id: pointEvents.id })
      .from(pointEvents)
      .where(and(eq(pointEvents.userId, userId), eq(pointEvents.kind, kind)))
      .limit(1)
  )[0];
  if (!existingReward)
    await db
      .insert(pointEvents)
      .values({ userId, kind, label: `PSV realizada ${monthKey}`, points: 10 });
  return { pointsAwarded: existingReward ? 0 : 10 };
}

export async function saveRmrRecord(
  userId: number,
  input: {
    periodLabel: string;
    workingDays: number;
    salesTasks: number;
    proposals: number;
    closedClients: number;
    closedTpv: number;
    goalTpv: number;
    globalKpi: number;
    variableValue: number;
    pointsAwarded: number;
    rootCause?: string;
    actionPlan?: string;
    owner?: string;
    expectedResult?: string;
    dueAt?: Date | null;
  }
) {
  const db = await getDb();
  const monthKey = new Date().toISOString().slice(0, 7);
  const computedPoints = monthlyKpiPoints(input.globalKpi);
  const kind = `kpi-${monthKey}`;
  const existingReward = (
    await db
      .select({ id: pointEvents.id })
      .from(pointEvents)
      .where(and(eq(pointEvents.userId, userId), eq(pointEvents.kind, kind)))
      .limit(1)
  )[0];
  const pointsAwarded = existingReward ? 0 : computedPoints;
  await db.insert(rmrRecords).values({ userId, ...input, pointsAwarded });
  if (pointsAwarded)
    await db.insert(pointEvents).values({
      userId,
      kind,
      label: `KPI global ${monthKey}`,
      points: pointsAwarded,
    });
  return pointsAwarded;
}

export async function getLeaderboard() {
  const db = await getDb();
  const rows = await db
    .select({
      displayName: agentProfiles.displayName,
      polo: agentProfiles.polo,
      district: agentProfiles.district,
      points: sql<number>`coalesce(sum(${pointEvents.points}), 0)`,
    })
    .from(agentProfiles)
    .leftJoin(pointEvents, eq(agentProfiles.userId, pointEvents.userId))
    .where(eq(agentProfiles.profileVisibleInRanking, true))
    .groupBy(
      agentProfiles.id,
      agentProfiles.displayName,
      agentProfiles.polo,
      agentProfiles.district
    )
    .orderBy(desc(sql`coalesce(sum(${pointEvents.points}), 0)`))
    .limit(20);
  return rows.map(row => ({ ...row, points: Number(row.points) }));
}

export async function getTioPatinhasLeaderboard(monthKey: string) {
  const db = await getDb();
  const rows = await db
    .select({
      actualVariable: monthlyFinalCards.actualVariable,
      totalMigratedTpv: monthlyFinalCards.totalMigratedTpv,
      clients15To30: monthlyFinalCards.clients15To30,
      clients30To50: monthlyFinalCards.clients30To50,
      clients50To100: monthlyFinalCards.clients50To100,
      clients100Plus: monthlyFinalCards.clients100Plus,
    })
    .from(monthlyFinalCards)
    .innerJoin(
      agentProfiles,
      eq(monthlyFinalCards.userId, agentProfiles.userId)
    )
    .where(
      and(
        eq(monthlyFinalCards.monthKey, monthKey),
        eq(agentProfiles.profileVisibleInRanking, true)
      )
    )
    .orderBy(
      desc(monthlyFinalCards.actualVariable),
      desc(monthlyFinalCards.totalMigratedTpv)
    )
    .limit(20);
  return rows.map((row, position) => ({
    ...row,
    alias: tioPatinhasAlias(position),
  }));
}

export async function getMonthlyTrophies(monthKey: string) {
  const db = await getDb();
  const rows = await db
    .select({
      displayName: agentProfiles.displayName,
      polo: agentProfiles.polo,
      district: agentProfiles.district,
      actualTpv: monthlyFinalCards.totalMigratedTpv,
      globalKpi: monthlyFinalCards.globalKpi,
      clients7To15: monthlyFinalCards.clients7To15,
      clients15To30: monthlyFinalCards.clients15To30,
      clients30To50: monthlyFinalCards.clients30To50,
      clients50To100: monthlyFinalCards.clients50To100,
      clients100Plus: monthlyFinalCards.clients100Plus,
    })
    .from(monthlyFinalCards)
    .innerJoin(
      agentProfiles,
      eq(monthlyFinalCards.userId, agentProfiles.userId)
    )
    .where(
      and(
        eq(monthlyFinalCards.monthKey, monthKey),
        eq(agentProfiles.leadershipRole, "none")
      )
    );
  const candidates = rows.map(row => ({
    ...row,
    actualTpv: Number(row.actualTpv),
    globalKpi: Number(row.globalKpi),
    actualNewClients:
      row.clients7To15 +
      row.clients15To30 +
      row.clients30To50 +
      row.clients50To100 +
      row.clients100Plus,
  }));
  return {
    newClients: sortByNewClients(candidates).slice(0, 3),
    tpv: sortByTpv(candidates).slice(0, 3),
    kpi: sortByGlobalKpi(candidates).slice(0, 3),
  };
}

export async function updateProfile(
  userId: number,
  input: {
    displayName: string;
    targetVariable: number;
    defaultGoalTpv: number;
    defaultGoalNewClients?: number;
    profileVisibleInRanking: boolean;
    leadershipRole?: "none" | "polo" | "distrital";
    regional: string;
    district: string;
    polo: string;
    route: string;
  }
) {
  const db = await getDb();
  const existing = (
    await db
      .select()
      .from(agentProfiles)
      .where(eq(agentProfiles.userId, userId))
      .limit(1)
  )[0];
  const leadershipRole =
    input.leadershipRole ?? existing?.leadershipRole ?? "none";
  const defaultGoalNewClients =
    input.defaultGoalNewClients ?? existing?.defaultGoalNewClients ?? 0;
  if (
    input.leadershipRole &&
    input.leadershipRole !== (existing?.leadershipRole ?? "none")
  ) {
    throw new Error(
      "A hierarquia é definida por um administrador autorizado e não pode ser alterada pelo próprio perfil."
    );
  }
  if (existing && existing.leadershipRole !== "none") {
    const requestedOrganization = prepareOrganizationValues(input);
    const currentOrganization = prepareOrganizationValues(existing);
    if (
      requestedOrganization.regional !== currentOrganization.regional ||
      requestedOrganization.district !== currentOrganization.district ||
      requestedOrganization.polo !== currentOrganization.polo ||
      requestedOrganization.route !== currentOrganization.route
    ) {
      throw new Error(
        "O escopo organizacional de uma liderança é definido por um administrador autorizado e não pode ser alterado pelo próprio perfil."
      );
    }
  }
  const organization = existing
    ? {
        regional: existing.regional,
        district: existing.district,
        polo: existing.polo,
        route: existing.route,
      }
    : {
        regional: "",
        district: "",
        polo: "",
        route: "",
      };

  await db
    .insert(agentProfiles)
    .values({
      userId,
      displayName: input.displayName,
      targetVariable: input.targetVariable,
      defaultGoalTpv: input.defaultGoalTpv,
      defaultGoalNewClients,
      profileVisibleInRanking: input.profileVisibleInRanking,
      leadershipRole,
      ...organization,
    })
    .onDuplicateKeyUpdate({
      set: {
        displayName: input.displayName,
        targetVariable: input.targetVariable,
        defaultGoalTpv: input.defaultGoalTpv,
        defaultGoalNewClients,
        profileVisibleInRanking: input.profileVisibleInRanking,
        leadershipRole,
        ...organization,
      },
    });
}

export async function getPrivatePlanHistory(userId: number) {
  const db = await getDb();
  return db
    .select()
    .from(psvPlans)
    .where(eq(psvPlans.userId, userId))
    .orderBy(desc(psvPlans.createdAt))
    .limit(8);
}

export async function getPrivateGoal(userId: number, monthKey: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(monthlyGoals)
    .where(
      and(eq(monthlyGoals.userId, userId), eq(monthlyGoals.monthKey, monthKey))
    )
    .limit(1);
  return rows[0] ?? null;
}

export type NordicMonthlyPlanInput = {
  monthKey: string;
  targetSalesTasks: number;
  targetProposals: number;
  targetClients7To15: number;
  targetClients15To30: number;
  targetClients30To50: number;
  targetClients50To100: number;
  targetClients100To200: number;
  targetClients200Plus: number;
  targetTpv: number;
  averageRv7To15: number;
  averageRv15To30: number;
  averageRv30To50: number;
  averageRv50To100: number;
  averageRv100Plus: number;
  actualSalesTasks: number;
  actualProposals: number;
  actualClients7To15: number;
  actualClients15To30: number;
  actualClients30To50: number;
  actualClients50To100: number;
  actualClients100To200: number;
  actualClients200Plus: number;
  actualTpv: number;
};

export async function saveNordicMonthlyPlan(
  userId: number,
  input: NordicMonthlyPlanInput
) {
  const db = await getDb();
  await db
    .insert(nordicMonthlyPlans)
    .values({ userId, ...input })
    .onDuplicateKeyUpdate({ set: { ...input } });
}

export async function saveNordicActivationPlan(
  userId: number,
  input: {
    id?: number;
    clientName: string;
    stoneCode: string;
    mcc: string;
    cnae: string;
    segment: string;
    realTpv: number;
    projectedTpv: number;
    productsReady: boolean;
    d15Complete: boolean;
    d30Complete: boolean;
    estimatedVariable: number;
    status: "planejado" | "ativacao" | "acompanhamento" | "concluido";
    notes?: string;
  }
) {
  const db = await getDb();
  if (input.id) {
    const { id, ...updates } = input;
    await db
      .update(nordicActivationPlans)
      .set(updates)
      .where(
        and(
          eq(nordicActivationPlans.id, id),
          eq(nordicActivationPlans.userId, userId)
        )
      );
    return;
  }
  await db.insert(nordicActivationPlans).values({ userId, ...input });
}

export async function removeNordicActivationPlan(userId: number, id: number) {
  const db = await getDb();
  await db
    .delete(nordicActivationPlans)
    .where(
      and(
        eq(nordicActivationPlans.id, id),
        eq(nordicActivationPlans.userId, userId)
      )
    );
}

export async function saveNordicMicroRoute(
  userId: number,
  input: {
    id?: number;
    area: string;
    visitAt: Date;
    clientName: string;
    pipelineLeadId?: number | null;
    priority: "normal" | "quente" | "cem_mais";
    objective: string;
    status: "planejada" | "concluida" | "remarcada";
    notes?: string;
  }
) {
  const db = await getDb();
  if (input.pipelineLeadId) {
    const lead = (
      await db
        .select({ id: psvPipelineLeads.id })
        .from(psvPipelineLeads)
        .where(
          and(
            eq(psvPipelineLeads.id, input.pipelineLeadId),
            eq(psvPipelineLeads.userId, userId)
          )
        )
        .limit(1)
    )[0];
    if (!lead) throw new Error("O lead selecionado não pertence ao seu funil.");
  }
  if (input.id) {
    const { id, ...updates } = input;
    await db
      .update(nordicMicroRoutes)
      .set(updates)
      .where(
        and(eq(nordicMicroRoutes.id, id), eq(nordicMicroRoutes.userId, userId))
      );
    return;
  }
  await db.insert(nordicMicroRoutes).values({ userId, ...input });
}

export async function removeNordicMicroRoute(userId: number, id: number) {
  const db = await getDb();
  await db
    .delete(nordicMicroRoutes)
    .where(
      and(eq(nordicMicroRoutes.id, id), eq(nordicMicroRoutes.userId, userId))
    );
}

export async function getNordicStrategy(
  userId: number,
  monthKey: string,
  requestedSemesterKey?: string
) {
  const db = await getDb();
  const semesterKey = requestedSemesterKey ?? semesterKeyForMonth(monthKey);
  const months = semesterMonths(semesterKey);
  const [
    plan,
    activationPlans,
    microRoutes,
    pipelineLeads,
    rmr,
    simulation,
    finalCard,
    semesterPlans,
    semesterCards,
  ] = await Promise.all([
    db
      .select()
      .from(nordicMonthlyPlans)
      .where(
        and(
          eq(nordicMonthlyPlans.userId, userId),
          eq(nordicMonthlyPlans.monthKey, monthKey)
        )
      )
      .limit(1),
    db
      .select()
      .from(nordicActivationPlans)
      .where(eq(nordicActivationPlans.userId, userId))
      .orderBy(desc(nordicActivationPlans.updatedAt))
      .limit(100),
    db
      .select()
      .from(nordicMicroRoutes)
      .where(eq(nordicMicroRoutes.userId, userId))
      .orderBy(nordicMicroRoutes.visitAt)
      .limit(100),
    db
      .select()
      .from(psvPipelineLeads)
      .where(eq(psvPipelineLeads.userId, userId))
      .orderBy(desc(psvPipelineLeads.updatedAt))
      .limit(100),
    db
      .select()
      .from(rmrRecords)
      .where(eq(rmrRecords.userId, userId))
      .orderBy(desc(rmrRecords.createdAt))
      .limit(1),
    db
      .select()
      .from(simulations)
      .where(eq(simulations.userId, userId))
      .orderBy(desc(simulations.createdAt))
      .limit(1),
    db
      .select()
      .from(monthlyFinalCards)
      .where(
        and(
          eq(monthlyFinalCards.userId, userId),
          eq(monthlyFinalCards.monthKey, monthKey)
        )
      )
      .limit(1),
    db
      .select({
        monthKey: nordicMonthlyPlans.monthKey,
        targetTpv: nordicMonthlyPlans.targetTpv,
        actualTpv: nordicMonthlyPlans.actualTpv,
      })
      .from(nordicMonthlyPlans)
      .where(
        and(
          eq(nordicMonthlyPlans.userId, userId),
          inArray(nordicMonthlyPlans.monthKey, months)
        )
      ),
    db
      .select({
        monthKey: monthlyFinalCards.monthKey,
        totalMigratedTpv: monthlyFinalCards.totalMigratedTpv,
      })
      .from(monthlyFinalCards)
      .where(
        and(
          eq(monthlyFinalCards.userId, userId),
          inArray(monthlyFinalCards.monthKey, months)
        )
      ),
  ]);
  const portfolio = await getRoutePortfolioForUser(userId, "route", monthKey);
  const prioritizedPipeline = [...pipelineLeads].sort(
    (left, right) => buildNordicScore(right) - buildNordicScore(left)
  );
  const plansByMonth = new Map(
    semesterPlans.map(item => [item.monthKey, item])
  );
  const cardsByMonth = new Map(
    semesterCards.map(item => [item.monthKey, item])
  );
  return {
    plan: plan[0] ?? null,
    activationPlans,
    microRoutes,
    hotLeads: prioritizedPipeline.filter(lead => lead.temperature === "quente"),
    hundredKLeads: prioritizedPipeline.filter(lead =>
      isNordicHundredK(lead.projectedTpv)
    ),
    pipelineLeads: prioritizedPipeline,
    routePortfolioLeads: portfolio.entries,
    latestRmr: rmr[0] ?? null,
    latestSimulation: simulation[0] ?? null,
    finalCard: finalCard[0] ?? null,
    semesterComparison: months.map(comparisonMonth => {
      const savedPlan = plansByMonth.get(comparisonMonth);
      const savedCard = cardsByMonth.get(comparisonMonth);
      return {
        monthKey: comparisonMonth,
        targetTpv: savedPlan?.targetTpv ?? null,
        actualTpv: savedCard?.totalMigratedTpv ?? savedPlan?.actualTpv ?? null,
        hasRecord: Boolean(savedPlan || savedCard),
      };
    }),
  };
}

export async function savePipelineLead(
  userId: number,
  input: {
    id?: number;
    clientName: string;
    temperature: "quente" | "frio";
    segmentId: string;
    segmentLabel: string;
    mcc: string;
    cnae: string;
    projectedTpv: number;
    nextContactAt?: Date | null;
    stage: "mapeado" | "qualificando" | "planejado" | "negociacao";
  }
) {
  const db = await getDb();
  if (input.id) {
    const { id, ...updates } = input;
    await db
      .update(psvPipelineLeads)
      .set(updates)
      .where(
        and(eq(psvPipelineLeads.id, id), eq(psvPipelineLeads.userId, userId))
      );
    return;
  }
  await db.insert(psvPipelineLeads).values({ userId, ...input });
}

export async function removePipelineLead(userId: number, id: number) {
  const db = await getDb();
  await db
    .delete(psvPipelineLeads)
    .where(
      and(eq(psvPipelineLeads.id, id), eq(psvPipelineLeads.userId, userId))
    );
}

export async function getPrivatePipelineLeads(userId: number) {
  const db = await getDb();
  return db
    .select()
    .from(psvPipelineLeads)
    .where(eq(psvPipelineLeads.userId, userId))
    .orderBy(desc(psvPipelineLeads.updatedAt))
    .limit(1000);
}

function parsePreparedLeadIds(value: string | null) {
  try {
    const ids = JSON.parse(value ?? "[]") as unknown;
    return Array.isArray(ids)
      ? ids
          .filter((id): id is number => Number.isInteger(id) && id > 0)
          .slice(0, 30)
      : [];
  } catch {
    return [];
  }
}

function parsePreparedPortfolioIds(value: string | null) {
  try {
    const ids = JSON.parse(value ?? "[]") as unknown;
    return Array.isArray(ids) ? ids.filter((id): id is number => Number.isInteger(id) && id > 0).slice(0, 30) : [];
  } catch {
    return [];
  }
}

export async function getPsvWeeklyRitual(userId: number, weekOf: string) {
  const db = await getDb();
  const row = (
    await db
      .select()
      .from(psvWeeklyRituals)
      .where(
        and(
          eq(psvWeeklyRituals.userId, userId),
          eq(psvWeeklyRituals.weekOf, weekOf)
        )
      )
      .limit(1)
  )[0];
  return row
    ? { ...row, preparedLeadIds: parsePreparedLeadIds(row.preparedLeadIdsJson), preparedPortfolioIds: parsePreparedPortfolioIds(row.preparedPortfolioIdsJson) }
    : null;
}

export async function savePsvWeeklyRitual(
  userId: number,
  input: {
    weekOf: string;
    dailyResult?: string;
    dailyPlan?: string;
    weeklyRoute?: string;
    preparedLeadIds?: number[];
    preparedPortfolioIds?: number[];
  }
) {
  const db = await getDb();
  const requestedIds = Array.from(new Set(input.preparedLeadIds ?? []))
    .filter(id => Number.isInteger(id) && id > 0)
    .slice(0, 30);
  const ownLeads = requestedIds.length
    ? await db
        .select({ id: psvPipelineLeads.id })
        .from(psvPipelineLeads)
        .where(
          and(
            eq(psvPipelineLeads.userId, userId),
            inArray(psvPipelineLeads.id, requestedIds)
          )
        )
    : [];
  if (ownLeads.length !== requestedIds.length)
    throw new Error("A preparação só pode incluir leads do seu próprio funil.");
  const requestedPortfolioIds = Array.from(new Set(input.preparedPortfolioIds ?? []))
    .filter(id => Number.isInteger(id) && id > 0)
    .slice(0, 30);
  const formalRoutes = await getFormalRoutes(userId);
  const ownPortfolioEntries = requestedPortfolioIds.length && formalRoutes.length
    ? await db.select({ id: routePortfolioEntries.id }).from(routePortfolioEntries).where(and(inArray(routePortfolioEntries.id, requestedPortfolioIds), inArray(routePortfolioEntries.routeKey, formalRoutes.map(route => route.routeKey))))
    : [];
  if (ownPortfolioEntries.length !== requestedPortfolioIds.length)
    throw new Error("A preparação só pode incluir clientes importados das suas rotas.");
  const value = {
    userId,
    weekOf: input.weekOf,
    dailyResult: cleanPortfolioText(input.dailyResult, 3000) || null,
    dailyPlan: cleanPortfolioText(input.dailyPlan, 3000) || null,
    weeklyRoute: cleanPortfolioText(input.weeklyRoute, 3000) || null,
    preparedLeadIdsJson: JSON.stringify(requestedIds),
    preparedPortfolioIdsJson: JSON.stringify(requestedPortfolioIds),
  };
  await db
    .insert(psvWeeklyRituals)
    .values(value)
    .onDuplicateKeyUpdate({
      set: {
        dailyResult: value.dailyResult,
        dailyPlan: value.dailyPlan,
        weeklyRoute: value.weeklyRoute,
        preparedLeadIdsJson: value.preparedLeadIdsJson,
        preparedPortfolioIdsJson: value.preparedPortfolioIdsJson,
      },
    });
  return getPsvWeeklyRitual(userId, input.weekOf);
}

type CampaignScope = "polo" | "distrital";
type CampaignStatus = "rascunho" | "ativa" | "concluida" | "arquivada";
type CampaignInput = {
  scope: CampaignScope;
  regional?: string;
  district?: string;
  polo?: string;
  title: string;
  objective?: string;
  status: CampaignStatus;
  startAt?: Date | null;
  endAt?: Date | null;
  targetParticipants: number;
  targetParticipationRate: number;
  targetPsvs: number;
  targetTpv: number;
  targetNewClients: number;
  actualParticipants?: number;
  actualPsvs?: number;
  actualTpv?: number;
  actualNewClients?: number;
};

async function getCampaignActor(userId: number) {
  const db = await getDb();
  const [profile, actor] = await Promise.all([
    db
      .select()
      .from(agentProfiles)
      .where(eq(agentProfiles.userId, userId))
      .limit(1)
      .then(rows => rows[0]),
    db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .then(rows => rows[0]),
  ]);
  if (
    !profile ||
    (profile.leadershipRole === "none" && actor?.role !== "admin")
  )
    throw new Error("Acesso exclusivo para líderes e distritais.");
  return { db, profile, actor };
}

function campaignScopeForActor(
  actor: Awaited<ReturnType<typeof getCampaignActor>>,
  input: CampaignInput
) {
  if (actor.actor?.role === "admin") {
    const regional = cleanPortfolioText(input.regional, 120);
    const district = cleanPortfolioText(input.district, 120);
    const polo =
      input.scope === "polo" ? cleanPortfolioText(input.polo, 120) : "";
    if (!district)
      throw new Error(
        "O administrador precisa informar o distrito da campanha."
      );
    if (input.scope === "polo" && !polo)
      throw new Error("O administrador precisa informar o polo da campanha.");
    return { scope: input.scope, regional, district, polo };
  }
  const scope: CampaignScope =
    actor.profile.leadershipRole === "distrital" ? "distrital" : "polo";
  return {
    scope,
    regional: actor.profile.regional,
    district: actor.profile.district,
    polo: scope === "polo" ? actor.profile.polo : "",
  };
}

function canReadCampaign(
  actor: Awaited<ReturnType<typeof getCampaignActor>>,
  campaign: typeof engagementCampaigns.$inferSelect
) {
  if (actor.actor?.role === "admin") return true;
  if (actor.profile.leadershipRole === "distrital")
    return (
      normalizeOrganizationKey(campaign.district) ===
      normalizeOrganizationKey(actor.profile.district)
    );
  return (
    campaign.scope === "polo" &&
    normalizeOrganizationKey(campaign.polo) ===
      normalizeOrganizationKey(actor.profile.polo)
  );
}

async function campaignProjection(
  actor: Awaited<ReturnType<typeof getCampaignActor>>,
  campaign: typeof engagementCampaigns.$inferSelect
) {
  const eligible = (
    await actor.db
      .select()
      .from(agentProfiles)
      .where(eq(agentProfiles.leadershipRole, "none"))
      .limit(400)
  ).filter(profile =>
    campaign.scope === "polo"
      ? normalizeOrganizationKey(profile.polo) ===
        normalizeOrganizationKey(campaign.polo)
      : normalizeOrganizationKey(profile.district) ===
        normalizeOrganizationKey(campaign.district)
  );
  const eligibleAgents = eligible.length;
  const rate = Math.max(0, Math.min(100, campaign.targetParticipationRate));
  const byRate = Math.round((eligibleAgents * rate) / 100);
  const expectedParticipants = Math.min(
    eligibleAgents,
    campaign.targetParticipants > 0 ? campaign.targetParticipants : byRate
  );
  const suggestedPsvs =
    campaign.targetPsvs > 0 ? campaign.targetPsvs : expectedParticipants;
  const percentage = (actual: number, target: number) =>
    target > 0 ? Math.min(100, (actual / target) * 100) : null;
  return {
    eligibleAgents,
    expectedParticipants,
    suggestedPsvs,
    plannedParticipationRate: eligibleAgents
      ? (expectedParticipants / eligibleAgents) * 100
      : 0,
    participationProgress: percentage(
      campaign.actualParticipants,
      campaign.targetParticipants || expectedParticipants
    ),
    psvProgress: percentage(campaign.actualPsvs, suggestedPsvs),
    tpvProgress: percentage(campaign.actualTpv, campaign.targetTpv),
    newClientsProgress: percentage(
      campaign.actualNewClients,
      campaign.targetNewClients
    ),
  };
}

export async function listEngagementCampaigns(userId: number) {
  const actor = await getCampaignActor(userId);
  const campaigns = (
    await actor.db
      .select()
      .from(engagementCampaigns)
      .orderBy(desc(engagementCampaigns.updatedAt))
      .limit(100)
  ).filter(campaign => canReadCampaign(actor, campaign));
  return Promise.all(
    campaigns.map(async campaign => ({
      ...campaign,
      projection: await campaignProjection(actor, campaign),
      editable:
        actor.actor?.role === "admin" || campaign.ownerUserId === userId,
    }))
  );
}

export async function createEngagementCampaign(
  userId: number,
  input: CampaignInput
) {
  const actor = await getCampaignActor(userId);
  const organization = campaignScopeForActor(actor, input);
  const title = cleanPortfolioText(input.title, 160);
  if (!title) throw new Error("Informe o nome da campanha.");
  const values = {
    ownerUserId: userId,
    ...organization,
    title,
    objective: cleanPortfolioText(input.objective, 3000) || null,
    status: input.status,
    startAt: input.startAt ?? null,
    endAt: input.endAt ?? null,
    targetParticipants: Math.max(0, Math.floor(input.targetParticipants)),
    targetParticipationRate: Math.max(
      0,
      Math.min(100, input.targetParticipationRate)
    ),
    targetPsvs: Math.max(0, Math.floor(input.targetPsvs)),
    targetTpv: Math.max(0, input.targetTpv),
    targetNewClients: Math.max(0, Math.floor(input.targetNewClients)),
    actualParticipants: Math.max(0, Math.floor(input.actualParticipants ?? 0)),
    actualPsvs: Math.max(0, Math.floor(input.actualPsvs ?? 0)),
    actualTpv: Math.max(0, input.actualTpv ?? 0),
    actualNewClients: Math.max(0, Math.floor(input.actualNewClients ?? 0)),
  };
  const inserted = await actor.db.insert(engagementCampaigns).values(values);
  const id = Number(inserted[0].insertId);
  await recordSecurityAuditEvent({
    actorUserId: userId,
    eventType: "campaign_create",
    targetType: "campaign",
    targetId: id,
    scope:
      organization.scope === "polo" ? organization.polo : organization.district,
  });
  const campaign = (
    await actor.db
      .select()
      .from(engagementCampaigns)
      .where(eq(engagementCampaigns.id, id))
      .limit(1)
  )[0];
  if (!campaign) throw new Error("Não foi possível criar a campanha.");
  return {
    ...campaign,
    projection: await campaignProjection(actor, campaign),
    editable: true,
  };
}

export async function updateEngagementCampaign(
  userId: number,
  id: number,
  input: CampaignInput
) {
  const actor = await getCampaignActor(userId);
  const existing = (
    await actor.db
      .select()
      .from(engagementCampaigns)
      .where(eq(engagementCampaigns.id, id))
      .limit(1)
  )[0];
  if (!existing || !canReadCampaign(actor, existing))
    throw new Error("Campanha não encontrada no seu escopo.");
  if (actor.actor?.role !== "admin" && existing.ownerUserId !== userId)
    throw new Error("Somente a liderança que criou a campanha pode editá-la.");
  const organization =
    actor.actor?.role === "admin"
      ? campaignScopeForActor(actor, input)
      : {
          scope: existing.scope,
          regional: existing.regional,
          district: existing.district,
          polo: existing.polo,
        };
  const title = cleanPortfolioText(input.title, 160);
  if (!title) throw new Error("Informe o nome da campanha.");
  await actor.db
    .update(engagementCampaigns)
    .set({
      ...organization,
      title,
      objective: cleanPortfolioText(input.objective, 3000) || null,
      status: input.status,
      startAt: input.startAt ?? null,
      endAt: input.endAt ?? null,
      targetParticipants: Math.max(0, Math.floor(input.targetParticipants)),
      targetParticipationRate: Math.max(
        0,
        Math.min(100, input.targetParticipationRate)
      ),
      targetPsvs: Math.max(0, Math.floor(input.targetPsvs)),
      targetTpv: Math.max(0, input.targetTpv),
      targetNewClients: Math.max(0, Math.floor(input.targetNewClients)),
      actualParticipants: Math.max(
        0,
        Math.floor(input.actualParticipants ?? 0)
      ),
      actualPsvs: Math.max(0, Math.floor(input.actualPsvs ?? 0)),
      actualTpv: Math.max(0, input.actualTpv ?? 0),
      actualNewClients: Math.max(0, Math.floor(input.actualNewClients ?? 0)),
    })
    .where(eq(engagementCampaigns.id, id));
  await recordSecurityAuditEvent({
    actorUserId: userId,
    eventType: "campaign_update",
    targetType: "campaign",
    targetId: id,
    scope:
      organization.scope === "polo" ? organization.polo : organization.district,
  });
  const campaign = (
    await actor.db
      .select()
      .from(engagementCampaigns)
      .where(eq(engagementCampaigns.id, id))
      .limit(1)
  )[0];
  if (!campaign) throw new Error("Campanha não encontrada.");
  return {
    ...campaign,
    projection: await campaignProjection(actor, campaign),
    editable: true,
  };
}

export async function setLeadershipRole(
  userId: number,
  role: "none" | "polo" | "distrital"
) {
  const db = await getDb();
  const profile = (
    await db
      .select()
      .from(agentProfiles)
      .where(eq(agentProfiles.userId, userId))
      .limit(1)
  )[0];
  if (!profile) throw new Error("Perfil não encontrado.");
  if (role !== profile.leadershipRole)
    throw new Error(
      "A hierarquia é definida por um administrador autorizado e não pode ser alterada pelo próprio perfil."
    );
  return { leadershipRole: profile.leadershipRole };
}

export async function getLeaderOverview(
  userId: number,
  filters: {
    query?: string;
    stage?: "all" | "mapeado" | "qualificando" | "planejado" | "negociacao";
    temperature?: "all" | "quente" | "frio";
    regional?: string;
    district?: string;
    polo?: string;
  }
) {
  const db = await getDb();
  const leader = (
    await db
      .select()
      .from(agentProfiles)
      .where(eq(agentProfiles.userId, userId))
      .limit(1)
  )[0];
  const actor = (
    await db.select().from(users).where(eq(users.id, userId)).limit(1)
  )[0];
  if (!leader || (leader.leadershipRole === "none" && actor?.role !== "admin"))
    throw new Error("Acesso exclusivo para líderes autorizados.");
  const sameOrganization = (profile: typeof leader) => {
    if (actor?.role === "admin") return true;
    if (leader.leadershipRole === "polo")
      return (
        profile.leadershipRole === "none" &&
        normalizeOrganizationKey(profile.polo) ===
          normalizeOrganizationKey(leader.polo)
      );
    return (
      normalizeOrganizationKey(profile.district) ===
      normalizeOrganizationKey(leader.district)
    );
  };
  const profiles = (
    await db
      .select()
      .from(agentProfiles)
      .orderBy(agentProfiles.displayName)
      .limit(300)
  ).filter(
    profile =>
      profile.userId !== userId &&
      sameOrganization(profile) &&
      matchesOrganizationFilter(profile, filters)
  );
  const query = filters.query?.trim().toLocaleLowerCase("pt-BR") ?? "";
  const agents = await Promise.all(
    profiles.map(async profile => {
      const [goal, simulation, rmr, points, pipeline, card] = await Promise.all(
        [
          db
            .select()
            .from(monthlyGoals)
            .where(eq(monthlyGoals.userId, profile.userId))
            .orderBy(desc(monthlyGoals.monthKey))
            .limit(1),
          db
            .select()
            .from(simulations)
            .where(eq(simulations.userId, profile.userId))
            .orderBy(desc(simulations.createdAt))
            .limit(1),
          db
            .select()
            .from(rmrRecords)
            .where(eq(rmrRecords.userId, profile.userId))
            .orderBy(desc(rmrRecords.createdAt))
            .limit(1),
          db
            .select({
              total: sql<number>`coalesce(sum(${pointEvents.points}), 0)`,
            })
            .from(pointEvents)
            .where(eq(pointEvents.userId, profile.userId)),
          db
            .select()
            .from(psvPipelineLeads)
            .where(eq(psvPipelineLeads.userId, profile.userId)),
          db
            .select()
            .from(monthlyFinalCards)
            .where(eq(monthlyFinalCards.userId, profile.userId))
            .orderBy(desc(monthlyFinalCards.monthKey))
            .limit(1),
        ]
      );
      const filteredPipeline = pipeline.filter(
        lead =>
          (filters.stage === undefined ||
            filters.stage === "all" ||
            lead.stage === filters.stage) &&
          (filters.temperature === undefined ||
            filters.temperature === "all" ||
            lead.temperature === filters.temperature)
      );
      return {
        displayName: profile.displayName,
        leadershipRole: profile.leadershipRole,
        regional: profile.regional,
        district: profile.district,
        polo: profile.polo,
        route: profile.route,
        targetVariable: profile.targetVariable,
        targetTpv: goal[0]?.targetTpv ?? profile.defaultGoalTpv,
        actualTpv: goal[0]?.actualTpv ?? simulation[0]?.eligibleTpv ?? 0,
        targetNewClients:
          goal[0]?.targetNewClients ?? profile.defaultGoalNewClients,
        actualNewClients: card[0]
          ? card[0].clients7To15 +
            card[0].clients15To30 +
            card[0].clients30To50 +
            card[0].clients50To100 +
            card[0].clients100Plus
          : (rmr[0]?.closedClients ?? 0),
        actualVariable:
          goal[0]?.actualVariable ?? simulation[0]?.finalVariable ?? 0,
        points: Number(points[0]?.total ?? 0),
        pipelineCount: filteredPipeline.length,
        pipelineTpv: filteredPipeline.reduce(
          (sum, lead) => sum + lead.projectedTpv,
          0
        ),
        latestRmrKpi: rmr[0]?.globalKpi ?? 0,
      };
    })
  );
  return agents
    .filter(
      agent =>
        !query || agent.displayName.toLocaleLowerCase("pt-BR").includes(query)
    )
    .sort((a, b) => b.points - a.points);
}

export async function getDistrictLeaderOverview(userId: number) {
  const db = await getDb();
  const profile = (
    await db
      .select()
      .from(agentProfiles)
      .where(eq(agentProfiles.userId, userId))
      .limit(1)
  )[0];
  const actor = (
    await db.select().from(users).where(eq(users.id, userId)).limit(1)
  )[0];
  if (
    !profile ||
    (profile.leadershipRole !== "distrital" && actor?.role !== "admin")
  )
    throw new Error("Acesso exclusivo para líderes distritais.");
  const overview = await getLeaderOverview(userId, {});
  return overview.filter(item => item.leadershipRole !== "none");
}

export async function getSalesPipelineForLeader(
  userId: number,
  filters: SalesPipeFilters = {}
) {
  const db = await getDb();
  const [leader, actor] = await Promise.all([
    db
      .select()
      .from(agentProfiles)
      .where(eq(agentProfiles.userId, userId))
      .limit(1)
      .then(rows => rows[0]),
    db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .then(rows => rows[0]),
  ]);
  if (!leader || (leader.leadershipRole === "none" && actor?.role !== "admin"))
    throw new Error("Acesso exclusivo para líderes autorizados.");
  const routeScope = await db
    .select()
    .from(routeAssignments)
    .orderBy(routeAssignments.route);
  const allowedRoutes = routeScope.filter(
    item =>
      actor?.role === "admin" ||
      (leader.leadershipRole === "distrital"
        ? normalizeOrganizationKey(item.district) ===
          normalizeOrganizationKey(leader.district)
        : normalizeOrganizationKey(item.polo) ===
          normalizeOrganizationKey(leader.polo))
  );
  if (!allowedRoutes.length)
    return {
      ...calculateSalesPipeline([], filters),
      filterOptions: listSalesPipeFilterOptions([]),
    };
  const allowedKeys = allowedRoutes.map(item => item.routeKey);
  const imported = await db
    .select({
      importId: routePortfolioImports.id,
      routeKey: routePortfolioEntries.routeKey,
      referenceMonth: routePortfolioImports.referenceMonth,
      importedAt: routePortfolioImports.createdAt,
    })
    .from(routePortfolioEntries)
    .innerJoin(
      routePortfolioImports,
      eq(routePortfolioEntries.importId, routePortfolioImports.id)
    )
    .where(
      and(
        eq(routePortfolioEntries.portfolioType, "route"),
        inArray(routePortfolioEntries.routeKey, allowedKeys)
      )
    )
    .groupBy(
      routePortfolioImports.id,
      routePortfolioEntries.routeKey,
      routePortfolioImports.referenceMonth,
      routePortfolioImports.createdAt
    )
    .orderBy(desc(routePortfolioImports.createdAt));
  const latestImportByRouteAndMonth = new Map<
    string,
    (typeof imported)[number]
  >();
  for (const item of imported) {
    const monthKey =
      item.referenceMonth || item.importedAt.toISOString().slice(0, 7);
    const key = `${item.routeKey}::${monthKey}`;
    if (!latestImportByRouteAndMonth.has(key))
      latestImportByRouteAndMonth.set(key, item);
  }
  const importIds = Array.from(latestImportByRouteAndMonth.values()).map(
    item => item.importId
  );
  if (!importIds.length)
    return {
      ...calculateSalesPipeline([], filters),
      filterOptions: listSalesPipeFilterOptions([]),
    };
  const assignmentByRouteKey = new Map(
    allowedRoutes.map(item => [item.routeKey, item])
  );
  const rows = await db
    .select({
      id: routePortfolioEntries.id,
      routeKey: routePortfolioEntries.routeKey,
      route: routePortfolioEntries.route,
      clientName: routePortfolioEntries.clientName,
      document: routePortfolioEntries.document,
      segment: routePortfolioEntries.segment,
      mcc: routePortfolioEntries.mcc,
      projectedTpv: routePortfolioEntries.projectedTpv,
      stage: routePortfolioEntries.stage,
      temperature: routePortfolioEntries.temperature,
      city: routePortfolioEntries.city,
      lastInteraction: routePortfolioEntries.lastInteraction,
      nextAction: routePortfolioEntries.nextAction,
      nextContactAt: routePortfolioEntries.nextContactAt,
      notes: routePortfolioEntries.notes,
      referenceMonth: routePortfolioImports.referenceMonth,
      importedAt: routePortfolioImports.createdAt,
    })
    .from(routePortfolioEntries)
    .innerJoin(
      routePortfolioImports,
      eq(routePortfolioEntries.importId, routePortfolioImports.id)
    )
    .where(
      and(
        eq(routePortfolioEntries.portfolioType, "route"),
        inArray(routePortfolioEntries.importId, importIds),
        inArray(routePortfolioEntries.routeKey, allowedKeys)
      )
    )
    .orderBy(routePortfolioEntries.route, routePortfolioEntries.clientName);
  const entries: SalesPipeEntry[] = rows.map(row => {
    const assignment = assignmentByRouteKey.get(row.routeKey)!;
    return {
      id: row.id,
      date: row.referenceMonth || row.importedAt.toISOString().slice(0, 7),
      subchannel: "",
      ownHub: "",
      regional: assignment.regional,
      district: assignment.district,
      polo: assignment.polo,
      agent: assignment.agentName,
      activeTeam: "",
      effectiveTeam: "",
      route: row.route,
      clientName: row.clientName,
      document: row.document,
      segment: row.segment,
      mcc: row.mcc,
      projectedTpv: row.projectedTpv,
      sourceStage: row.stage,
      temperature: row.temperature,
      city: row.city,
      lastInteraction: row.lastInteraction,
      nextAction: row.nextAction,
      nextContactAt: row.nextContactAt,
      notes: row.notes,
    };
  });
  return {
    ...calculateSalesPipeline(entries, filters),
    filterOptions: listSalesPipeFilterOptions(entries),
  };
}

function spartacusLearnerRole(
  profile: typeof agentProfiles.$inferSelect | undefined
): SpartacusPlanInput["learnerRole"] {
  if (profile?.leadershipRole === "polo") return "polo";
  if (profile?.leadershipRole === "distrital") return "distrital";
  return "agente";
}

/** Retorna apenas PDIs pertencentes ao próprio usuário autenticado. */
export async function listSpartacusPdis(userId: number) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(spartacusPdis)
    .where(eq(spartacusPdis.userId, userId))
    .orderBy(desc(spartacusPdis.createdAt))
    .limit(12);
  return rows.map(row => {
    try {
      return { ...row, plan: JSON.parse(row.planJson) };
    } catch {
      return { ...row, plan: null };
    }
  });
}

export async function getSpartacusProgressSummary(userId: number) {
  const db = await getDb();
  const [pdi] = await db
    .select()
    .from(spartacusPdis)
    .where(eq(spartacusPdis.userId, userId))
    .orderBy(desc(spartacusPdis.createdAt))
    .limit(1);
  if (!pdi)
    return {
      pdiId: null,
      title: "",
      plan: null,
      skills: [],
      overallProgress: 0,
    };
  let plan: any = null;
  try {
    plan = JSON.parse(pdi.planJson);
  } catch {
    return {
      pdiId: pdi.id,
      title: "",
      plan: null,
      skills: [],
      overallProgress: 0,
    };
  }
  const selected = [
    ...(plan.hardSkills ?? []),
    ...(plan.softSkills ?? []),
  ] as Array<{ id: string; title: string; category: "hard" | "soft" }>;
  const records = await db
    .select()
    .from(spartacusSkillProgress)
    .where(
      and(
        eq(spartacusSkillProgress.userId, userId),
        eq(spartacusSkillProgress.pdiId, pdi.id)
      )
    );
  const progressBySkill = new Map(
    records.map(row => [
      row.skillId,
      Math.max(0, Math.min(100, row.progressPercent)),
    ])
  );
  const skills = selected.map(skill => ({
    ...skill,
    progressPercent: progressBySkill.get(skill.id) ?? 0,
  }));
  const overallProgress = skills.length
    ? Math.round(
        skills.reduce((sum, skill) => sum + skill.progressPercent, 0) /
          skills.length
      )
    : 0;
  return {
    pdiId: pdi.id,
    title: plan.title ?? "PDI SPARTACUS",
    plan,
    skills,
    overallProgress,
  };
}

export async function updateSpartacusSkillProgress(
  userId: number,
  input: { pdiId: number; skillId: string; progressPercent: number }
) {
  const db = await getDb();
  const [pdi] = await db
    .select()
    .from(spartacusPdis)
    .where(
      and(eq(spartacusPdis.id, input.pdiId), eq(spartacusPdis.userId, userId))
    )
    .limit(1);
  if (!pdi) throw new Error("PDI não encontrado.");
  let plan: any;
  try {
    plan = JSON.parse(pdi.planJson);
  } catch {
    throw new Error("PDI indisponível para atualização.");
  }
  const selectedIds = new Set(
    [...(plan.hardSkills ?? []), ...(plan.softSkills ?? [])].map(
      (skill: { id: string }) => skill.id
    )
  );
  if (!selectedIds.has(input.skillId))
    throw new Error("Esta competência não pertence ao seu PDI.");
  const progressPercent = Math.max(
    0,
    Math.min(100, Math.round(input.progressPercent / 25) * 25)
  );
  await db
    .insert(spartacusSkillProgress)
    .values({ userId, pdiId: pdi.id, skillId: input.skillId, progressPercent })
    .onDuplicateKeyUpdate({ set: { progressPercent, updatedAt: new Date() } });
  return getSpartacusProgressSummary(userId);
}

export async function listUserNotifications(userId: number) {
  const db = await getDb();
  return db
    .select()
    .from(userNotifications)
    .where(eq(userNotifications.userId, userId))
    .orderBy(desc(userNotifications.createdAt))
    .limit(16);
}

export async function markUserNotificationRead(
  userId: number,
  notificationId: number
) {
  const db = await getDb();
  await db
    .update(userNotifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(userNotifications.id, notificationId),
        eq(userNotifications.userId, userId)
      )
    );
  return { success: true };
}

/** Gera e persiste um PDI declarativo sem transmitir dados de perfil ou clientes a serviços externos. */
export async function createSpartacusPdi(
  userId: number,
  input: Omit<SpartacusPlanInput, "learnerRole">
) {
  const db = await getDb();
  const [profile] = await db
    .select()
    .from(agentProfiles)
    .where(eq(agentProfiles.userId, userId))
    .limit(1);
  const planInput: SpartacusPlanInput = {
    ...input,
    learnerRole: spartacusLearnerRole(profile),
  };
  const plan = buildSpartacusPdi(planInput);
  const created = await db
    .insert(spartacusPdis)
    .values({
      userId,
      learnerRole: planInput.learnerRole,
      developmentGoal: planInput.developmentGoal?.trim().slice(0, 400) ?? "",
      hardSkillIdsJson: JSON.stringify(planInput.hardSkillIds),
      softSkillIdsJson: JSON.stringify(planInput.softSkillIds),
      studyMinutes: planInput.studyMinutes,
      planJson: JSON.stringify(plan),
    })
    .$returningId();
  const id = created[0]?.id;
  if (!id) throw new Error("Não foi possível salvar o PDI.");
  const selectedSkills = [...plan.hardSkills, ...plan.softSkills];
  await db.insert(spartacusSkillProgress).values(
    selectedSkills.map(skill => ({
      userId,
      pdiId: id,
      skillId: skill.id,
      progressPercent: 0,
    }))
  );
  await db.insert(userNotifications).values({
    userId,
    kind: "pdi_generated",
    title: "Seu PDI SPARTACUS está pronto",
    body: "Seu plano de quatro semanas foi criado e já pode ser acompanhado na Academia de Campo.",
    resourceId: String(id),
  });
  const [row] = await db
    .select()
    .from(spartacusPdis)
    .where(and(eq(spartacusPdis.id, id), eq(spartacusPdis.userId, userId)))
    .limit(1);
  if (!row) throw new Error("PDI não encontrado.");
  return { ...row, plan };
}
