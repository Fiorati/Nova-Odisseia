import { describe, expect, it } from "vitest";
import { recentSemesterOptions, semesterKeyForMonth, semesterMonths } from "../shared/semesterComparison";

describe("comparativo semestral do Período", () => {
  it("agrupa cada mês no semestre correto e retorna exatamente seis meses", () => {
    expect(semesterKeyForMonth("2026-01")).toBe("2026-S1");
    expect(semesterKeyForMonth("2026-06")).toBe("2026-S1");
    expect(semesterKeyForMonth("2026-07")).toBe("2026-S2");
    expect(semesterMonths("2026-S1")).toEqual(["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"]);
    expect(semesterMonths("2026-S2")).toEqual(["2026-07", "2026-08", "2026-09", "2026-10", "2026-11", "2026-12"]);
  });

  it("oferece os semestres recentes de forma estável", () => {
    expect(recentSemesterOptions(new Date(2026, 7, 1))).toEqual([
      { key: "2026-S2", label: "2º semestre de 2026" },
      { key: "2026-S1", label: "1º semestre de 2026" },
      { key: "2025-S2", label: "2º semestre de 2025" },
      { key: "2025-S1", label: "1º semestre de 2025" },
    ]);
  });
});
