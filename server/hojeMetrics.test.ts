import { describe, expect, it } from "vitest";
import { hojeMetrics } from "../shared/hojeMetrics";

describe("Hoje: sinais da jornada", () => {
  it("seleciona uma missão pendente e conta apenas missões reais", () => {
    const result = hojeMetrics([{id:"1",title:"Feita",done:true},{id:"2",title:"Próxima",done:false},{id:"3",title:"Outra",done:false}], [], "2026-09-27");
    expect(result.nextMission?.id).toBe("2");
    expect([result.completed,result.total]).toEqual([1,3]);
  });
  it("conta dias distintos de check-in, inclusive hoje e seis dias antes, sem punição", () => {
    const checkins = ["2026-09-21", "2026-09-21", "2026-09-27", "2026-09-20", "2026-09-28"].map(date => ({date,reflection:"",nextAction:""}));
    const result = hojeMetrics([], checkins, "2026-09-27");
    expect(result.checkinDays).toBe(2);
    expect(result.latestCheckin?.date).toBe("2026-09-27");
    expect(result.nextMission).toBeNull();
    expect(result.total).toBe(0);
  });
});
