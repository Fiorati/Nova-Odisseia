export type PortfolioType = "base" | "route";

export type RoutePortfolioRow = {
  route: string;
  clientName: string;
  document?: string;
  mcc?: string;
  cnae?: string;
  segment?: string;
  projectedTpv?: number;
  stage?: string;
  temperature?: string;
  phone?: string;
  city?: string;
  lastInteraction?: string;
  nextAction?: string;
  nextContactAt?: Date | null;
  notes?: string;
  rawJson?: string;
};

export function normalizeRouteKey(route: string) {
  return route.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
}

export function cleanPortfolioText(value: unknown, max = 160) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function readPortfolioNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(value, 0);
  if (typeof value !== "string") return 0;
  const normalized = value.replace(/R\$\s?/gi, "").replace(/\./g, "").replace(",", ".").replace(/[^0-9.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0;
}
