import { describe, expect, it } from "vitest";
import { constancia30Pdi } from "../shared/pdiTemplates";
import { journeyStateSchema } from "./journeyState";

describe("constancia30Pdi", () => {
  it("gera uma jornada válida para o schema do servidor", () => {
    const pdi = constancia30Pdi({ mentorName: "Gabriel", name: "Kaike" });
    expect(journeyStateSchema.safeParse(pdi).success).toBe(true);
    expect(pdi.cycleGoal).toContain("Golden Hour");
    expect(pdi.cycleGoal).toContain("PLACAR DIÁRIO");
    expect(pdi.missions.some(m => m.title.includes("sexta com Gabriel"))).toBe(true);
    expect(pdi.checkins).toHaveLength(0);
  });
});
