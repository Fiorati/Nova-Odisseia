import { describe, expect, it } from "vitest";
import { journeyStateSchema } from "./journeyState";
const valid = { calling:"Meu norte", cycleGoal:"Ciclo", stage:"Chamado", xp:10, streak:1, areas:["profissional","pessoal","emocional","comunidade"].map((key,index)=>({key,label:key,score:index+1,focus:"foco"})), missions:[], checkins:[{date:"2026-09-22",energy:4,reflection:"Aprendi",nextAction:"Agir"}] };
describe("estado persistente da jornada",()=>{
  it("aceita um estado válido",()=>expect(journeyStateSchema.parse(valid).calling).toBe("Meu norte"));
  it("rejeita notas e energia fora dos limites",()=>expect(()=>journeyStateSchema.parse({...valid,areas:valid.areas.map((x,i)=>i?x:{...x,score:11})})).toThrow());
});
