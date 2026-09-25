import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pdfString, renderPdf, wrap } from "./jornadaPdf";
import { buildJornadaBlocks, type JornadaData } from "./jornadaHeroi";

const fixture: JornadaData = {
  name: "Gabriel Fiorati Marcantonio",
  generatedAt: new Date("2026-09-25T12:00:00Z"),
  profile: { district: "SP Norte", polo: "Vila Medeiros", route: "Tremembé e Center Norte" },
  journey: {
    calling: "Servir pessoas e ajudá-las a acessar a excelência de si mesmos! Aretê", cycleGoal: "Entregar Plataforma completa até 03/10", stage: "Chamado", xp: 130, streak: 2,
    areas: [{ label: "Profissional", score: 8, focus: "Metas, competências e execução" }, { label: "Pessoal", score: 2, focus: "Hábitos, saúde, finanças e tempo" }],
    missions: [{ title: "Ligar para 3 clientes parados da carteira", area: "profissional", done: false, dueDate: "2026-09-23" }, { title: "Definir o Chamado do ciclo", area: "pessoal", done: true }],
    checkins: [{ date: "2026-09-25", energy: 5, reflection: "Me sinto bem; dia abaixo do planejado.", nextAction: "Planejar o dia de amanhã" }],
  },
  readings: [
    { id: 4, kind: "leitura", dateKey: "2026-09-25", answers: {}, planDone: [0], report: { leitura: "Você busca servir e guiar outros à excelência (Aretê).", padroes: ["Depende de um mês bom", "Cobrança interna"], plano: [{ passo: "Mapear despesas", quando: "Segunda, 19h" }, "Escolher um hábito"], pergunta: "Qual pequeno ajuste ajudou você?" } },
    { id: 3, kind: "disc", dateKey: "2026-09-25", answers: { profile: { percent: { D: 46, I: 67, S: 38, C: 50 }, primary: "I", secondary: "C" } }, planDone: [], report: { essencia: "Energia de Influência.", forcas: ["a", "b", "c"], atencao: ["x", "y"], comunicacao: "Entusiasmo e clareza.", jornada: "Use o carisma.", pergunta: "Como?" } },
    { id: 9, kind: "plano_acao", dateKey: "2026-09-25", answers: { source: "disc", goals: { objetivo: "Conseguir mais clientes", prioridades: ["Rotina", "Rede", "Comunicação"] } }, planDone: [1], report: { titulo: "7 dias para abrir 3 portas", foco: "Usa a Influência a favor do objetivo.", passos: [{ passo: "Listar 10 negócios", quando: "Segunda", porque: "Prioridade: clientes" }], indicador: "3 visitas feitas" } },
  ],
  pdi: { title: "PDI SPARTACUS — 4 semanas", goal: "Atuar no que preciso para hoje!", roleLabel: "Agente", studyMinutes: 25, hardSkills: [{ title: "Prospecção", summary: "Priorizar contas.", practice: "Prepare três abordagens." }], weeklyMissions: [{ week: 1, title: "Diagnóstico" }] },
};

describe("Jornada do Herói em PDF", () => {
  it("codifica acentos em WinAnsi e escapa parênteses", () => {
    expect(pdfString("ação (ok)")).toBe("(a\xe7\xe3o \\(ok\\))");
    expect(pdfString("PDI — 4")).toContain("\x97");
    expect(pdfString("emoji 🦉")).toContain("?");
  });
  it("quebra linhas dentro da largura", () => {
    const lines = wrap("palavra ".repeat(60), 10.5, 200);
    expect(lines.length).toBeGreaterThan(5);
  });
  it("gera um PDF válido com todas as seções da foto do momento", () => {
    const blocks = buildJornadaBlocks(fixture);
    const titles = blocks.filter(b => b.type === "section").map(b => (b as { title: string }).title);
    expect(titles).toEqual(expect.arrayContaining(["Vida 360", "Missões e check-ins", "Leitura do momento", "Perfil DISC", "PDI SPARTACUS — 4 semanas", "Planos de ação"]));
    const pdf = renderPdf(blocks);
    const raw = pdf.toString("latin1");
    expect(raw.startsWith("%PDF-1.4")).toBe(true);
    expect(raw.trimEnd().endsWith("%%EOF")).toBe(true);
    expect((raw.match(/\/Type \/Page /g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(raw).toContain("Listar 10 neg");
    if (process.env.JORNADA_PDF_OUT) writeFileSync(process.env.JORNADA_PDF_OUT, pdf);
  });
  it("sem planos de ação, explica como criar", () => {
    const blocks = buildJornadaBlocks({ ...fixture, readings: [], journey: null, pdi: null, profile: null });
    expect(JSON.stringify(blocks)).toContain("Ainda não há planos de ação salvos");
  });
});
