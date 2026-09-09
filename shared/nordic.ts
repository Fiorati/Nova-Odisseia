export type NordicTargets = {
  salesTasks: number;
  proposals: number;
  clients30To50: number;
  clients50To100: number;
  clients100To200: number;
  clients200Plus: number;
  tpv: number;
};

export type NordicActuals = NordicTargets;

export function nonNegative(value: number | null | undefined) {
  return Math.max(Number.isFinite(value) ? Number(value) : 0, 0);
}

export function targetNewClients(targets: Pick<NordicTargets, "clients30To50" | "clients50To100" | "clients100To200" | "clients200Plus">) {
  return targets.clients30To50 + targets.clients50To100 + targets.clients100To200 + targets.clients200Plus;
}

export function gapToTarget(target: number, actual: number) {
  return nonNegative(target) - nonNegative(actual);
}

export function weeklyPace(gap: number, businessDaysRemaining: number) {
  const safeDays = Math.max(Math.floor(nonNegative(businessDaysRemaining)), 0);
  if (!safeDays) return 0;
  return Math.max(Math.ceil(Math.max(gap, 0) / Math.ceil(safeDays / 5)), 0);
}

export function buildNordicScore(input: { temperature: "quente" | "frio"; projectedTpv: number; nextContactAt?: Date | null; segmentLabel?: string }) {
  const temperatureScore = input.temperature === "quente" ? 1_000_000_000 : 0;
  const tpvScore = nonNegative(input.projectedTpv);
  const contactScore = input.nextContactAt ? Math.max(0, 100_000 - Math.floor(input.nextContactAt.getTime() / 86_400_000)) : 0;
  const segmentScore = input.segmentLabel?.trim() ? 5_000 : 0;
  return temperatureScore + tpvScore + contactScore + segmentScore;
}

export function isNordicHundredK(projectedTpv: number) {
  return nonNegative(projectedTpv) >= 100_000;
}
