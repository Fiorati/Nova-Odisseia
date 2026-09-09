import { describe, expect, it } from "vitest";
import { calculateMigrationRemuneration } from "../shared/migrationRemuneration";

describe("remuneração por migração M0–M2", () => {
  it("separa M1 da migração tardia e reproduz o multiplicador da venda nova", () => {
    const result = calculateMigrationRemuneration({
      goalTpv: 206000,
      kpiTpv: 262032,
      newSalesMultiplier: 1.4,
      m1MigratedTpv: 283000,
      lateMigratedTpv: 0,
      m1Base: 1505,
      lateBase: 475,
      hunterTpv: 1130735.06,
      hunterRatePercent: 0.1,
    });

    expect(result.kpiRelevantTpv).toBe(283000);
    expect(result.lateMigratedTpv).toBe(0);
    expect(result.m1Value).toBeCloseTo(2107, 8);
    expect(result.lateMigrationValue).toBeCloseTo(665, 8);
    expect(result.newSalesValue).toBeCloseTo(2772, 8);
    expect(result.hunterKpiFactor).toBeCloseTo(1.272, 8);
    expect(result.hunterValue).toBeCloseTo(1438.29499632, 8);
    expect(result.total).toBeCloseTo(4210.29499632, 8);
  });

  it("permite alíquota Hunter individual sem alterar a remuneração de novos migrados", () => {
    const atNineBasisPoints = calculateMigrationRemuneration({
      goalTpv: 200000,
      kpiTpv: 280000,
      newSalesMultiplier: 1.4,
      m1MigratedTpv: 283000,
      lateMigratedTpv: 12000,
      m1Base: 1505,
      lateBase: 475,
      hunterTpv: 1000000,
      hunterRatePercent: 0.09,
    });

    expect(atNineBasisPoints.kpiRelevantTpv).toBe(283000);
    expect(atNineBasisPoints.lateMigratedTpv).toBe(12000);
    expect(atNineBasisPoints.newSalesValue).toBeCloseTo(2772, 8);
    expect(atNineBasisPoints.hunterValue).toBeCloseTo(1260, 8);
  });
});
