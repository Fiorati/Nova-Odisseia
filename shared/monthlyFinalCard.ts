import { tierForTpv } from "./migrationBase";

export type FinalCardClient = {
  tpv?: number;
  eligible?: boolean;
};

export type MonthlyTierCounts = {
  clients7To15: number;
  clients15To30: number;
  clients30To50: number;
  clients50To100: number;
  clients100Plus: number;
};

export const emptyMonthlyTierCounts = (): MonthlyTierCounts => ({
  clients7To15: 0,
  clients15To30: 0,
  clients30To50: 0,
  clients50To100: 0,
  clients100Plus: 0,
});

/** Conta apenas clientes elegíveis usando as mesmas fronteiras da Migração M1. */
export function countMonthlyFinalCardTiers(clients: FinalCardClient[]): MonthlyTierCounts {
  return clients.reduce<MonthlyTierCounts>((counts, client) => {
    if (!client.eligible || typeof client.tpv !== "number" || client.tpv < 7000) return counts;
    const tier = tierForTpv(client.tpv);
    if (tier === "7-15k") counts.clients7To15 += 1;
    if (tier === "15-30k") counts.clients15To30 += 1;
    if (tier === "30-50k") counts.clients30To50 += 1;
    if (tier === "50-100k") counts.clients50To100 += 1;
    if (tier === "100-200k" || tier === "200k+") counts.clients100Plus += 1;
    return counts;
  }, emptyMonthlyTierCounts());
}

export function getSimulationClients(detailsJson: string | null | undefined): FinalCardClient[] {
  if (!detailsJson) return [];
  try {
    const details = JSON.parse(detailsJson) as { clients?: unknown };
    if (!Array.isArray(details.clients)) return [];
    return details.clients.filter((client): client is FinalCardClient => Boolean(client) && typeof client === "object");
  } catch {
    return [];
  }
}
