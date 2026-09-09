import { findCnaeEntry, findMccEntry, MCC_CATALOG, type CommissionTier, type ProposalPricing } from "./mccCatalog";

export function tierForTpv(tpv: number): CommissionTier {
  if (tpv < 7000) return "0-7k";
  if (tpv < 15000) return "7-15k";
  if (tpv < 30000) return "15-30k";
  if (tpv < 50000) return "30-50k";
  if (tpv < 100000) return "50-100k";
  if (tpv < 200000) return "100-200k";
  return "200k+";
}

export function calculateAutomaticMigrationBase(input: { mcc?: string; cnae?: string; tpv: number; proposal: ProposalPricing }) {
  const byMcc = input.mcc ? findMccEntry(input.mcc) : undefined;
  const byCnae = input.cnae ? findCnaeEntry(input.cnae) : undefined;
  const entry = byMcc ?? byCnae;
  const segment = entry ? MCC_CATALOG.find(item => item.id === entry.segmentId) : undefined;
  const tier = tierForTpv(input.tpv);
  return { tier, segmentId: segment?.id ?? "", base: segment?.rates[tier]?.[input.proposal] ?? 0 };
}

export function resolveMigrationBase(automaticBase: number, manualBase: number | null | undefined, eligible: boolean) {
  if (!eligible) return 0;
  return typeof manualBase === "number" ? manualBase : automaticBase;
}
