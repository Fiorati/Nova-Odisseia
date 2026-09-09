export type MigrationRemunerationInput = {
  goalTpv: number;
  kpiTpv: number;
  newSalesMultiplier: number;
  m1MigratedTpv: number;
  lateMigratedTpv: number;
  m1Base: number;
  lateBase: number;
  hunterTpv: number;
  hunterRatePercent: number;
  teamBonus?: number;
};

const nonNegative = (value: number) => Math.max(value || 0, 0);

/**
 * Reproduz a separação exibida no card: a base de novos migrados aplica a
 * régua de multiplicador; o prêmio Hunter aplica o KPI global percentual.
 */
export function calculateMigrationRemuneration(input: MigrationRemunerationInput) {
  const attainmentRatio = input.goalTpv > 0 ? nonNegative(input.kpiTpv) / input.goalTpv : 0;
  const hunterKpiFactor = Math.min(attainmentRatio, 2);
  const hunterRate = nonNegative(input.hunterRatePercent) / 100;
  const m1Value = nonNegative(input.m1Base) * nonNegative(input.newSalesMultiplier);
  const lateMigrationValue = nonNegative(input.lateBase) * nonNegative(input.newSalesMultiplier);
  const hunterBase = nonNegative(input.hunterTpv) * hunterRate;
  const hunterValue = hunterBase * hunterKpiFactor;
  const teamBonus = nonNegative(input.teamBonus ?? 0);

  return {
    attainmentRatio,
    hunterKpiFactor,
    hunterRate,
    m1MigratedTpv: nonNegative(input.m1MigratedTpv),
    lateMigratedTpv: nonNegative(input.lateMigratedTpv),
    kpiRelevantTpv: nonNegative(input.m1MigratedTpv),
    m1Value,
    lateMigrationValue,
    hunterBase,
    hunterValue,
    newSalesValue: m1Value + lateMigrationValue,
    total: m1Value + lateMigrationValue + hunterValue + teamBonus,
  };
}
