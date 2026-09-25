import { describe, expect, it } from "vitest";
import { ORACULO_STEPS, OTHER_CHOICE, oraculoFlowReady, oraculoFlowToAnswers } from "@shared/oraculoFlow";
import { answeredCount, oraculoAnswersSchema } from "@shared/oraculo";
import { CHAMADO_FLOW, META_FLOW } from "@shared/goalFlow";

const step = (k: string) => ORACULO_STEPS.find(s => s.key === k)!;

describe("consulta guiada do Oráculo", () => {
  it("as verdades mudam conforme o tema", () => {
    const trabalho = step("verdade").options({ tema: ["trabalho"] }).map(o => o.label).join("|");
    const saude = step("verdade").options({ tema: ["saude"] }).map(o => o.label).join("|");
    expect(trabalho).toContain("prospectar");
    expect(saude).toContain("Durmo tarde");
    expect(trabalho).not.toEqual(saude);
  });
  it("a escolha sugerida segue o sentido e o tema", () => {
    const opts = step("escolha").options({ tema: ["dinheiro"], sentido: ["estrutura"] }).map(o => o.label);
    expect(opts[0]).toContain("horário fixo");
    expect(opts).toContain("Olhar meus números por 15 minutos");
    expect(opts.at(-1)).toBe("Outra ação");
  });
  it("fato positivo coloca 'força' em primeiro no sentido", () => {
    expect(step("sentido").options({ fato: ["venda"] })[0].value).toBe("forca");
  });
  it("gera os 7 campos que o servidor já valida, com a nota no fato", () => {
    const a = { tema: ["trabalho"], verdade: [OTHER_CHOICE], fato: ["visita"], sentido: ["clareza"], escolha: ["Escrever qual é o próximo passo, em uma linha"], manter: ["disciplina"], ruido: ["celular", "tarefas"], tensao: ["ajuda"] };
    expect(oraculoFlowReady(a, {})).toBe(false);
    const other = { verdade: "Evito ligar para quem sumiu" };
    expect(oraculoFlowReady(a, other)).toBe(true);
    const out = oraculoAnswersSchema.parse(oraculoFlowToAnswers(a, other, "Semana de feriado"));
    expect(answeredCount(out)).toBe(7);
    expect(out.verdade).toBe("[Trabalho e vendas] Evito ligar para quem sumiu");
    expect(out.ruido).toBe("Celular e redes sociais; Excesso de tarefas");
    expect(out.fato).toBe("Fiz visitas, mas sem falar com o decisor. Semana de feriado");
  });
});

describe("Chamado e meta por seleção", () => {
  it("monta o Chamado a partir das escolhas", () => {
    expect(CHAMADO_FLOW.compose({ area: "profissional", ser: "Ser referência em vendas no meu polo", porque: "pela minha família" })).toBe("Ser referência em vendas no meu polo, pela minha família.");
  });
  it("a meta é contável e depende da área e da medida", () => {
    const quanto = META_FLOW.steps[2].options({ area: "pessoal", medida: "treino" });
    expect(quanto.map(o => o.value)).toEqual(["2", "3", "4", "5"]);
    expect(META_FLOW.compose({ area: "pessoal", medida: "treino", quanto: "3" })).toBe("Treinar 3 vezes por semana nos próximos 30 dias.");
  });
});
