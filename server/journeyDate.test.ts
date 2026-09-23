import { describe, expect, it } from "vitest";
import { JOURNEY_CHECKIN_LIMIT, journeyDateKey } from "../shared/journeyDate";
import { journeyStateSchema } from "./journeyState";

describe("journeyDateKey", () => {
  it("mantém o dia de São Paulo depois das 21h", () => {
    // 22/09 23:30 em São Paulo = 23/09 02:30 UTC
    expect(journeyDateKey(new Date("2026-09-23T02:30:00Z"))).toBe("2026-09-22");
  });
  it("vira o dia à meia-noite de São Paulo", () => {
    expect(journeyDateKey(new Date("2026-09-23T03:00:00Z"))).toBe("2026-09-23");
  });
  it("limite do cliente acompanha o schema", () => {
    const checkin = { date: "2026-01-01", energy: 3, reflection: "r", nextAction: "a" };
    const shape = journeyStateSchema.shape.checkins;
    expect(shape.safeParse(Array(JOURNEY_CHECKIN_LIMIT).fill(checkin)).success).toBe(true);
    expect(shape.safeParse(Array(JOURNEY_CHECKIN_LIMIT + 1).fill(checkin)).success).toBe(false);
  });
});
