import { boolean, double, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
}, table => ({ emailUnique: uniqueIndex("users_email_unique").on(table.email) }));

export const emailCredentials = mysqlTable("email_credentials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  passwordHash: varchar("passwordHash", { length: 256 }).notNull(),
  passwordSalt: varchar("passwordSalt", { length: 128 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ userUnique: uniqueIndex("email_credentials_user_unique").on(table.userId) }));

/** Registra somente metadados operacionais de alterações sensíveis; nunca armazena senhas ou conteúdo de carteiras. */
export const securityAuditEvents = mysqlTable("security_audit_events", {
  id: int("id").autoincrement().primaryKey(),
  actorUserId: int("actorUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
  eventType: varchar("eventType", { length: 64 }).notNull(),
  targetType: varchar("targetType", { length: 64 }).notNull(),
  targetId: varchar("targetId", { length: 120 }).notNull(),
  scope: varchar("scope", { length: 160 }).notNull().default(""),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ actorCreatedAt: index("security_audit_actor_created_at_idx").on(table.actorUserId, table.createdAt), eventCreatedAt: index("security_audit_event_created_at_idx").on(table.eventType, table.createdAt) }));

export const emailVerificationChallenges = mysqlTable("email_verification_challenges", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  leadershipRole: mysqlEnum("leadershipRole", ["none", "polo", "distrital"]).notNull().default("none"),
  codeHash: varchar("codeHash", { length: 256 }).notNull(),
  codeSalt: varchar("codeSalt", { length: 128 }).notNull(),
  verificationTokenHash: varchar("verificationTokenHash", { length: 256 }).notNull().default(""),
  verificationTokenSalt: varchar("verificationTokenSalt", { length: 128 }).notNull().default(""),
  expiresAt: timestamp("expiresAt").notNull(),
  verifiedAt: timestamp("verifiedAt"),
  consumedAt: timestamp("consumedAt"),
  attempts: int("attempts").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ emailUnique: uniqueIndex("email_verification_challenges_email_unique").on(table.email) }));

export const passwordResetChallenges = mysqlTable("password_reset_challenges", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  codeHash: varchar("codeHash", { length: 256 }).notNull(),
  codeSalt: varchar("codeSalt", { length: 128 }).notNull(),
  resetTokenHash: varchar("resetTokenHash", { length: 256 }).notNull().default(""),
  resetTokenSalt: varchar("resetTokenSalt", { length: 128 }).notNull().default(""),
  expiresAt: timestamp("expiresAt").notNull(),
  verifiedAt: timestamp("verifiedAt"),
  consumedAt: timestamp("consumedAt"),
  attempts: int("attempts").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ userUnique: uniqueIndex("password_reset_challenges_user_unique").on(table.userId) }));

export const agentProfiles = mysqlTable("agent_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  displayName: varchar("displayName", { length: 120 }).notNull(),
  targetVariable: double("targetVariable").notNull().default(0),
  defaultGoalTpv: double("defaultGoalTpv").notNull().default(300000),
  defaultGoalNewClients: int("defaultGoalNewClients").notNull().default(0),
  profileVisibleInRanking: boolean("profileVisibleInRanking").notNull().default(true),
  leadershipRole: mysqlEnum("leadershipRole", ["none", "polo", "distrital"]).notNull().default("none"),
  regional: varchar("regional", { length: 120 }).notNull().default(""),
  district: varchar("district", { length: 120 }).notNull().default(""),
  polo: varchar("polo", { length: 120 }).notNull().default(""),
  route: varchar("route", { length: 120 }).notNull().default(""),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ userUnique: uniqueIndex("agent_profiles_user_unique").on(table.userId) }));

export const monthlyGoals = mysqlTable("monthly_goals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  monthKey: varchar("monthKey", { length: 7 }).notNull(),
  targetVariable: double("targetVariable").notNull().default(0),
  targetTpv: double("targetTpv").notNull().default(0),
  targetNewClients: int("targetNewClients").notNull().default(0),
  actualTpv: double("actualTpv").notNull().default(0),
  actualVariable: double("actualVariable").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ goalUnique: uniqueIndex("monthly_goals_user_month_unique").on(table.userId, table.monthKey) }));

export const simulations = mysqlTable("simulations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  periodLabel: varchar("periodLabel", { length: 80 }).notNull(),
  goalTpv: double("goalTpv").notNull().default(0),
  eligibleTpv: double("eligibleTpv").notNull().default(0),
  hunterTpv: double("hunterTpv").notNull().default(0),
  newSalesBase: double("newSalesBase").notNull().default(0),
  multiplier: double("multiplier").notNull().default(0),
  finalVariable: double("finalVariable").notNull().default(0),
  detailsJson: text("detailsJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const monthlyFinalCards = mysqlTable("monthly_final_cards", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  monthKey: varchar("monthKey", { length: 7 }).notNull(),
  globalKpi: double("globalKpi").notNull().default(0),
  totalMigratedTpv: double("totalMigratedTpv").notNull().default(0),
  multiplier: double("multiplier").notNull().default(0),
  actualVariable: double("actualVariable").notNull().default(0),
  clients7To15: int("clients7To15").notNull().default(0),
  clients15To30: int("clients15To30").notNull().default(0),
  clients30To50: int("clients30To50").notNull().default(0),
  clients50To100: int("clients50To100").notNull().default(0),
  clients100Plus: int("clients100Plus").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ cardUnique: uniqueIndex("monthly_final_cards_user_month_unique").on(table.userId, table.monthKey) }));

export const routePortfolioImports = mysqlTable("route_portfolio_imports", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  portfolioType: mysqlEnum("portfolioType", ["base", "route"]).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  rowCount: int("rowCount").notNull().default(0),
  referenceMonth: varchar("referenceMonth", { length: 7 }).notNull().default(""),
  sourceScope: mysqlEnum("sourceScope", ["route", "polo", "district"]).notNull().default("route"),
  sourceType: varchar("sourceType", { length: 32 }).notNull().default("arquivo"),
  sourceOrigin: varchar("sourceOrigin", { length: 160 }).notNull().default("arquivo local"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const routeAssignments = mysqlTable("route_assignments", {
  id: int("id").autoincrement().primaryKey(),
  route: varchar("route", { length: 120 }).notNull(),
  routeKey: varchar("routeKey", { length: 120 }).notNull(),
  agentName: varchar("agentName", { length: 120 }).notNull().default(""),
  agentEmail: varchar("agentEmail", { length: 320 }).notNull().default(""),
  userId: int("userId").references(() => users.id, { onDelete: "set null" }),
  regional: varchar("regional", { length: 120 }).notNull().default(""),
  district: varchar("district", { length: 120 }).notNull().default(""),
  polo: varchar("polo", { length: 120 }).notNull().default(""),
  updatedByUserId: int("updatedByUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ routeUnique: uniqueIndex("route_assignments_route_key_unique").on(table.routeKey), ownerIndex: index("route_assignments_user_idx").on(table.userId) }));

export const routePortfolioEntries = mysqlTable("route_portfolio_entries", {
  id: int("id").autoincrement().primaryKey(),
  importId: int("importId").notNull().references(() => routePortfolioImports.id, { onDelete: "cascade" }),
  portfolioType: mysqlEnum("portfolioType", ["base", "route"]).notNull(),
  route: varchar("route", { length: 120 }).notNull(),
  routeKey: varchar("routeKey", { length: 120 }).notNull(),
  clientName: varchar("clientName", { length: 160 }).notNull(),
  document: varchar("document", { length: 32 }).notNull().default(""),
  mcc: varchar("mcc", { length: 8 }).notNull().default(""),
  cnae: varchar("cnae", { length: 24 }).notNull().default(""),
  segment: varchar("segment", { length: 160 }).notNull().default(""),
  projectedTpv: double("projectedTpv").notNull().default(0),
  stage: varchar("stage", { length: 80 }).notNull().default(""),
  temperature: varchar("temperature", { length: 32 }).notNull().default(""),
  phone: varchar("phone", { length: 48 }).notNull().default(""),
  city: varchar("city", { length: 120 }).notNull().default(""),
  lastInteraction: varchar("lastInteraction", { length: 160 }).notNull().default(""),
  nextAction: varchar("nextAction", { length: 320 }).notNull().default(""),
  nextContactAt: timestamp("nextContactAt"),
  notes: text("notes"),
  rawJson: text("rawJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ routeTypeIndex: index("route_portfolio_entries_route_type_idx").on(table.routeKey, table.portfolioType) }));

export const psvPlans = mysqlTable("psv_plans", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  weekOf: varchar("weekOf", { length: 10 }).notNull(),
  targetVariable: double("targetVariable").notNull().default(0),
  currentVariable: double("currentVariable").notNull().default(0),
  plannedMultiplier: double("plannedMultiplier").notNull().default(2),
  weeksRemaining: int("weeksRemaining").notNull().default(1),
  recommendedTpv: double("recommendedTpv").notNull().default(0),
  recommendedClients30: int("recommendedClients30").notNull().default(0),
  recommendedClients50: int("recommendedClients50").notNull().default(0),
  recommendedClients100: int("recommendedClients100").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const psvWeeklyRituals = mysqlTable("psv_weekly_rituals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  weekOf: varchar("weekOf", { length: 10 }).notNull(),
  dailyResult: text("dailyResult"),
  dailyPlan: text("dailyPlan"),
  weeklyRoute: text("weeklyRoute"),
  preparedLeadIdsJson: text("preparedLeadIdsJson"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ weeklyRitualUserWeekIndex: uniqueIndex("psv_weekly_rituals_user_week_uq").on(table.userId, table.weekOf) }));

export const engagementCampaigns = mysqlTable("engagement_campaigns", {
  id: int("id").autoincrement().primaryKey(),
  ownerUserId: int("ownerUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
  scope: mysqlEnum("scope", ["polo", "distrital"]).notNull(),
  regional: varchar("regional", { length: 120 }).notNull().default(""),
  district: varchar("district", { length: 120 }).notNull().default(""),
  polo: varchar("polo", { length: 120 }).notNull().default(""),
  title: varchar("title", { length: 160 }).notNull(),
  objective: text("objective"),
  status: mysqlEnum("status", ["rascunho", "ativa", "concluida", "arquivada"]).notNull().default("rascunho"),
  startAt: timestamp("startAt"),
  endAt: timestamp("endAt"),
  targetParticipants: int("targetParticipants").notNull().default(0),
  targetParticipationRate: double("targetParticipationRate").notNull().default(0),
  targetPsvs: int("targetPsvs").notNull().default(0),
  targetTpv: double("targetTpv").notNull().default(0),
  targetNewClients: int("targetNewClients").notNull().default(0),
  actualParticipants: int("actualParticipants").notNull().default(0),
  actualPsvs: int("actualPsvs").notNull().default(0),
  actualTpv: double("actualTpv").notNull().default(0),
  actualNewClients: int("actualNewClients").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ campaignOwnerIndex: index("engagement_campaigns_owner_idx").on(table.ownerUserId), campaignScopeIndex: index("engagement_campaigns_scope_idx").on(table.district, table.polo, table.status) }));

export const psvPipelineLeads = mysqlTable("psv_pipeline_leads", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientName: varchar("clientName", { length: 160 }).notNull(),
  temperature: mysqlEnum("temperature", ["quente", "frio"]).notNull().default("frio"),
  segmentId: varchar("segmentId", { length: 96 }).notNull().default(""),
  segmentLabel: varchar("segmentLabel", { length: 160 }).notNull().default(""),
  mcc: varchar("mcc", { length: 8 }).notNull().default(""),
  cnae: varchar("cnae", { length: 24 }).notNull().default(""),
  projectedTpv: double("projectedTpv").notNull().default(0),
  nextContactAt: timestamp("nextContactAt"),
  stage: mysqlEnum("stage", ["mapeado", "qualificando", "planejado", "negociacao"]).notNull().default("mapeado"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const rmrRecords = mysqlTable("rmr_records", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  periodLabel: varchar("periodLabel", { length: 80 }).notNull(),
  workingDays: int("workingDays").notNull().default(20),
  salesTasks: int("salesTasks").notNull().default(0),
  proposals: int("proposals").notNull().default(0),
  closedClients: int("closedClients").notNull().default(0),
  closedTpv: double("closedTpv").notNull().default(0),
  goalTpv: double("goalTpv").notNull().default(300000),
  globalKpi: double("globalKpi").notNull().default(0),
  variableValue: double("variableValue").notNull().default(0),
  pointsAwarded: int("pointsAwarded").notNull().default(0),
  rootCause: text("rootCause"),
  actionPlan: text("actionPlan"),
  owner: varchar("owner", { length: 120 }).notNull().default(""),
  expectedResult: text("expectedResult"),
  dueAt: timestamp("dueAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** PDIs pessoais do SPARTACUS. O conteúdo é privado e só pode ser lido pelo próprio usuário. */
export const spartacusPdis = mysqlTable("spartacus_pdis", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  learnerRole: mysqlEnum("learnerRole", ["agente", "polo", "distrital"]).notNull().default("agente"),
  developmentGoal: varchar("developmentGoal", { length: 400 }).notNull().default(""),
  hardSkillIdsJson: text("hardSkillIdsJson").notNull(),
  softSkillIdsJson: text("softSkillIdsJson").notNull(),
  studyMinutes: int("studyMinutes").notNull().default(25),
  planJson: text("planJson").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ userCreatedAt: index("spartacus_pdis_user_created_at_idx").on(table.userId, table.createdAt) }));

/** Progresso declarado pelo próprio usuário para cada competência do seu PDI. */
export const spartacusSkillProgress = mysqlTable("spartacus_skill_progress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  pdiId: int("pdiId").notNull().references(() => spartacusPdis.id, { onDelete: "cascade" }),
  skillId: varchar("skillId", { length: 80 }).notNull(),
  progressPercent: int("progressPercent").notNull().default(0),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ pdiSkillUnique: uniqueIndex("spartacus_skill_progress_pdi_skill_uq").on(table.pdiId, table.skillId), userPdiIndex: index("spartacus_skill_progress_user_pdi_idx").on(table.userId, table.pdiId) }));

/** Caixa de entrada individual; não é compartilhada com liderança nem usada para disparos externos. */
export const userNotifications = mysqlTable("user_notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: varchar("kind", { length: 48 }).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  body: varchar("body", { length: 400 }).notNull().default(""),
  resourceId: varchar("resourceId", { length: 120 }).notNull().default(""),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ userCreatedIndex: index("user_notifications_user_created_idx").on(table.userId, table.createdAt) }));

export const nordicMonthlyPlans = mysqlTable("nordic_monthly_plans", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  monthKey: varchar("monthKey", { length: 7 }).notNull(),
  targetSalesTasks: int("targetSalesTasks").notNull().default(0),
  targetProposals: int("targetProposals").notNull().default(0),
  targetClients7To15: int("targetClients7To15").notNull().default(0),
  targetClients15To30: int("targetClients15To30").notNull().default(0),
  targetClients30To50: int("targetClients30To50").notNull().default(0),
  targetClients50To100: int("targetClients50To100").notNull().default(0),
  targetClients100To200: int("targetClients100To200").notNull().default(0),
  targetClients200Plus: int("targetClients200Plus").notNull().default(0),
  targetTpv: double("targetTpv").notNull().default(0),
  averageRv7To15: double("averageRv7To15").notNull().default(50),
  averageRv15To30: double("averageRv15To30").notNull().default(80),
  averageRv30To50: double("averageRv30To50").notNull().default(150),
  averageRv50To100: double("averageRv50To100").notNull().default(300),
  averageRv100Plus: double("averageRv100Plus").notNull().default(800),
  actualSalesTasks: int("actualSalesTasks").notNull().default(0),
  actualProposals: int("actualProposals").notNull().default(0),
  actualClients7To15: int("actualClients7To15").notNull().default(0),
  actualClients15To30: int("actualClients15To30").notNull().default(0),
  actualClients30To50: int("actualClients30To50").notNull().default(0),
  actualClients50To100: int("actualClients50To100").notNull().default(0),
  actualClients100To200: int("actualClients100To200").notNull().default(0),
  actualClients200Plus: int("actualClients200Plus").notNull().default(0),
  actualTpv: double("actualTpv").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ planUnique: uniqueIndex("nordic_monthly_plan_user_month_unique").on(table.userId, table.monthKey) }));

export const nordicActivationPlans = mysqlTable("nordic_activation_plans", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientName: varchar("clientName", { length: 160 }).notNull(),
  stoneCode: varchar("stoneCode", { length: 48 }).notNull().default(""),
  mcc: varchar("mcc", { length: 8 }).notNull().default(""),
  cnae: varchar("cnae", { length: 24 }).notNull().default(""),
  segment: varchar("segment", { length: 160 }).notNull().default(""),
  realTpv: double("realTpv").notNull().default(0),
  projectedTpv: double("projectedTpv").notNull().default(0),
  productsReady: boolean("productsReady").notNull().default(false),
  d15Complete: boolean("d15Complete").notNull().default(false),
  d30Complete: boolean("d30Complete").notNull().default(false),
  estimatedVariable: double("estimatedVariable").notNull().default(0),
  status: mysqlEnum("status", ["planejado", "ativacao", "acompanhamento", "concluido"]).notNull().default("planejado"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const nordicMicroRoutes = mysqlTable("nordic_micro_routes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  area: varchar("area", { length: 160 }).notNull(),
  visitAt: timestamp("visitAt").notNull(),
  clientName: varchar("clientName", { length: 160 }).notNull(),
  pipelineLeadId: int("pipelineLeadId").references(() => psvPipelineLeads.id, { onDelete: "set null" }),
  priority: mysqlEnum("priority", ["normal", "quente", "cem_mais"]).notNull().default("normal"),
  objective: varchar("objective", { length: 240 }).notNull().default("Visita de diagnóstico"),
  status: mysqlEnum("status", ["planejada", "concluida", "remarcada"]).notNull().default("planejada"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ visitIndex: index("nordic_micro_routes_user_visit_idx").on(table.userId, table.visitAt) }));

export const pointEvents = mysqlTable("point_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: varchar("kind", { length: 48 }).notNull(),
  label: varchar("label", { length: 160 }).notNull(),
  points: int("points").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const prospectionDossiers = mysqlTable("prospection_dossiers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  routeEntryId: int("routeEntryId").references(() => routePortfolioEntries.id, { onDelete: "set null" }),
  clientName: varchar("clientName", { length: 160 }).notNull(),
  cnpj: varchar("cnpj", { length: 18 }).notNull().default(""),
  routeKey: varchar("routeKey", { length: 120 }).notNull().default(""),
  source: mysqlEnum("source", ["manual", "portfolio"]).notNull().default("manual"),
  stage: mysqlEnum("stage", ["pesquisa", "preparo", "agendamento", "visita", "negociacao", "arquivado"]).notNull().default("pesquisa"),
  publicSnapshotJson: text("publicSnapshotJson"),
  hypotheses: text("hypotheses"),
  agentNotes: text("agentNotes"),
  lastResearchedAt: timestamp("lastResearchedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ userIndex: index("prospection_dossiers_user_idx").on(table.userId), routeIndex: index("prospection_dossiers_route_idx").on(table.routeKey) }));

export const prospectionSources = mysqlTable("prospection_sources", {
  id: int("id").autoincrement().primaryKey(),
  dossierId: int("dossierId").notNull().references(() => prospectionDossiers.id, { onDelete: "cascade" }),
  sourceType: mysqlEnum("sourceType", ["cnpj", "maps", "web", "instagram", "site"]).notNull(),
  label: varchar("label", { length: 160 }).notNull(),
  url: varchar("url", { length: 1000 }).notNull(),
  accessedAt: timestamp("accessedAt").defaultNow().notNull(),
}, table => ({ dossierIndex: index("prospection_sources_dossier_idx").on(table.dossierId) }));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
