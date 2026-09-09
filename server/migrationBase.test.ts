import { describe, expect, it } from "vitest";
import { calculateAutomaticMigrationBase, resolveMigrationBase } from "../shared/migrationBase";

describe("base automática da Migração M1", () => {
  it("calcula alimentação agressiva pelo MCC 5812 e TPV de R$ 30 mil", () => {
    const result = calculateAutomaticMigrationBase({ mcc: "5812", tpv: 30000, proposal: "agressiva" });
    expect(result.tier).toBe("30-50k");
    expect(result.segmentId).toBe("alimentacao-restaurantes");
    expect(result.base).toBe(125);
  });

  it("encontra a regra pelo CNAE quando o MCC não foi informado", () => {
    const result = calculateAutomaticMigrationBase({ cnae: "4520-0/01", tpv: 120000, proposal: "agressiva" });
    expect(result.base).toBe(1080);
  });

  it("permite que uma base manual substitua a sugestão automática", () => {
    expect(resolveMigrationBase(125, 180, true)).toBe(180);
    expect(resolveMigrationBase(125, null, true)).toBe(125);
    expect(resolveMigrationBase(125, 180, false)).toBe(0);
  });
});
