export type PortfolioImportScope = "route" | "polo" | "district";
export type LeadershipRole = "none" | "polo" | "interino" | "distrital" | "sdr";

export function assertPortfolioImportAccess(scope: PortfolioImportScope, leadershipRole: LeadershipRole, systemRole?: "user" | "admin") {
  if (systemRole === "admin" || scope === "route") return;
  if (scope === "district" && leadershipRole !== "distrital") throw new Error("A importação distrital é exclusiva para líderes distritais.");
  if (scope === "polo" && leadershipRole !== "polo" && leadershipRole !== "interino" && leadershipRole !== "distrital") throw new Error("A importação do polo é exclusiva para Donos de Polo e Interinos.");
}
