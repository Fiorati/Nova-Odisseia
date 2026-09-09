import { describe, expect, it } from "vitest";
import { isEligibleLeader } from "../shared/leadership";

describe("lista autorizada de líderes", () => {
  it("reconhece nomes da lista mesmo com variação de caixa e acentuação", () => {
    expect(isEligibleLeader("Eloá Saleira")).toBe(true);
    expect(isEligibleLeader("jessica burmas")).toBe(true);
    expect(isEligibleLeader("Júlia Gazal")).toBe(true);
  });

  it("não concede acesso master a nomes fora da lista", () => {
    expect(isEligibleLeader("Agente Não Autorizado")).toBe(false);
  });
});
