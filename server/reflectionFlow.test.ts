import { describe, expect, it } from "vitest";
import { OTHER, REFLECTION_PRESETS, reflectionReady, summarizeReflection } from "@shared/reflectionFlow";

const clinical = /depress|ansiedade|transtorno|diagn/;

describe("registros guiados", () => {
  it("prova: sugestões seguem o padrão revelado", () => {
    const p = REFLECTION_PRESETS.prova;
    const gesto = p.questions.find(q => q.key === "gesto")!;
    expect(gesto.options({ cumpriu: ["parte"], tipo: ["padrao"], qual: ["adiar"] })[0].value).toBe("cedo");
    expect(gesto.options({ cumpriu: ["inteira"], tipo: ["limite"], qual: ["conhecimento"] })[0].value).toBe("aprender");
    expect(gesto.options({ cumpriu: ["inteira"], tipo: ["forca"], qual: ["coragem"] }).at(-1)!.value).toBe(OTHER);
  });
  it("prova: a pergunta 'Qual?' depende do tipo", () => {
    const qual = REFLECTION_PRESETS.prova.questions.find(q => q.key === "qual")!;
    expect(qual.options({ tipo: ["limite"] }).map(o => o.value)).toContain("energia");
    expect(qual.options({ tipo: ["forca"] }).map(o => o.value)).toContain("coragem");
  });
  it("delfos: leitura sem tom clínico e escolha coerente", () => {
    const p = REFLECTION_PRESETS.delfos;
    const a = { fato: ["adiamento"], sentiu: ["frustracao"], revela: ["info"], escolha: ["perguntar"] };
    const r = p.read(a);
    expect(r.title).toContain("mapa");
    expect(`${r.title} ${r.body}`.toLowerCase()).not.toMatch(clinical);
    expect(p.questions[3].options(a)[0].value).toBe("perguntar");
  });
  it("todas as leituras evitam tom clínico", () => {
    for (const p of Object.values(REFLECTION_PRESETS)) {
      const a: Record<string, string[]> = {};
      for (const q of p.questions) a[q.key] = [q.options(a)[0].value];
      const r = p.read(a);
      expect(`${r.title} ${r.body}`.toLowerCase()).not.toMatch(clinical);
    }
  });
  it("resumo grava fato, sentido e próximo nos campos de sempre", () => {
    const p = REFLECTION_PRESETS.esparta;
    const answers = { cumpriu: ["parte"], fator: ["tempo", "energia"], proximo: [OTHER] };
    expect(reflectionReady(p, answers, "", "amanha-cedo")).toBe(false);
    expect(reflectionReady(p, answers, "Treinar no almoço", "amanha-cedo")).toBe(true);
    const s = summarizeReflection(p, { answers, nextOther: "Treinar no almoço", when: "amanha-cedo", note: "Reunião atrasou" });
    expect(s.fact).toBe("Cumpri uma parte. Reunião atrasou");
    expect(s.meaning).toBe("Falta de tempo, Energia baixa");
    expect(s.next).toBe("Treinar no almoço - amanhã cedo");
  });
});
