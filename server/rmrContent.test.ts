import { describe, expect, it } from "vitest";
import { recommendRmrContent } from "../shared/rmrContent";

describe("conteúdo recomendado para RMR", () => {
  it("prioriza a menor alavanca do período", () => {
    const result = recommendRmrContent({ tasksRate: 85, proposalsRate: 35, tpvRate: 70 });
    expect(result[0]?.area).toBe("propostas");
    expect(result[0]?.title).toContain("proposta");
  });
});
