/** Chamado e Meta do ciclo por seleção: perguntas encadeadas que montam uma frase, que a pessoa ainda pode ajustar. */
export type SentenceOption = { value: string; label: string };
export type SentenceAnswers = Record<string, string>;
export type SentenceStep = { key: string; title: (a: SentenceAnswers) => string; hint?: string; options: (a: SentenceAnswers) => SentenceOption[] };
export type SentenceFlow = { key: "chamado" | "meta"; steps: SentenceStep[]; compose: (a: SentenceAnswers) => string; finalTitle: string };

const AREAS: SentenceOption[] = [
  { value: "profissional", label: "Profissional" }, { value: "pessoal", label: "Pessoal (corpo e rotina)" },
  { value: "emocional", label: "Emocional" }, { value: "comunidade", label: "Família e comunidade" },
];
const opt = (list: string[]) => list.map(label => ({ value: label, label }));

const BECOME: Record<string, string[]> = {
  profissional: ["Ser referência em vendas no meu polo", "Construir uma carteira forte e fiel", "Crescer para liderar um time", "Ser o agente que o cliente chama primeiro"],
  pessoal: ["Ter um corpo com energia para a rotina", "Ser alguém que cumpre o que combina consigo", "Viver com rotina e disciplina", "Cuidar da minha saúde de verdade"],
  emocional: ["Ter serenidade nos dias difíceis", "Parar de me cobrar além da conta", "Decidir com clareza, sem pressa", "Ser leve comigo e com os outros"],
  comunidade: ["Estar presente para a minha família", "Ser exemplo para quem está perto", "Ajudar outras pessoas a crescer", "Construir laços que duram"],
};
const WHY = opt(["pela minha família", "para ter liberdade de escolha", "para ser exemplo para o time", "para cuidar de mim", "para ajudar outras pessoas"]);

export const CHAMADO_FLOW: SentenceFlow = {
  key: "chamado", finalTitle: "Seu Chamado",
  steps: [
    { key: "area", title: () => "Em que parte da vida está o seu Chamado agora?", options: () => AREAS },
    { key: "ser", title: () => "O que você quer se tornar?", options: a => opt(BECOME[a.area] ?? BECOME.profissional) },
    { key: "porque", title: () => "Por quê? O que move isso?", options: () => WHY },
  ],
  compose: a => a.ser && a.porque ? `${a.ser}, ${a.porque}.` : "",
};

const METRICS: Record<string, { value: string; label: string; unit: string; amounts: string[] }[]> = {
  profissional: [
    { value: "credenciar", label: "Credenciar clientes novos", unit: "Credenciar {n} clientes novos", amounts: ["3", "5", "8", "12"] },
    { value: "reativar", label: "Reativar clientes parados", unit: "Reativar {n} clientes parados da carteira", amounts: ["3", "5", "10", "15"] },
    { value: "pap", label: "Fazer visitas PaP", unit: "Fazer {n} visitas PaP por semana", amounts: ["10", "20", "30", "40"] },
  ],
  pessoal: [
    { value: "treino", label: "Treinar", unit: "Treinar {n} vezes por semana", amounts: ["2", "3", "4", "5"] },
    { value: "sono", label: "Dormir antes das 23h", unit: "Dormir antes das 23h em {n} noites por semana", amounts: ["3", "4", "5", "7"] },
    { value: "vespera", label: "Planejar o dia na véspera", unit: "Planejar o dia na véspera {n} dias por semana", amounts: ["3", "4", "5", "7"] },
  ],
  emocional: [
    { value: "pausa", label: "Pausa de silêncio sem celular", unit: "Fazer 10 minutos de silêncio {n} dias por semana", amounts: ["3", "4", "5", "7"] },
    { value: "gratidao", label: "Escrever gratidões", unit: "Escrever 3 gratidões {n} dias por semana", amounts: ["3", "4", "5", "7"] },
    { value: "redes", label: "Tempo sem redes sociais", unit: "Ficar sem redes sociais {n} horas por dia", amounts: ["1", "2", "3", "4"] },
  ],
  comunidade: [
    { value: "familia", label: "Tempo de qualidade com a família", unit: "Ter {n} momentos de qualidade com a família por semana", amounts: ["1", "2", "3", "5"] },
    { value: "ajudar", label: "Ajudar colegas", unit: "Ajudar {n} colegas no mês", amounts: ["2", "4", "6", "10"] },
    { value: "contato", label: "Procurar quem está longe", unit: "Procurar {n} pessoas que estão longe", amounts: ["1", "2", "3", "5"] },
  ],
};
const metric = (a: SentenceAnswers) => (METRICS[a.area] ?? METRICS.profissional).find(m => m.value === a.medida);

export const META_FLOW: SentenceFlow = {
  key: "meta", finalTitle: "Sua meta do ciclo (30 dias)",
  steps: [
    { key: "area", title: () => "Em que área vai ser a meta destes 30 dias?", options: () => AREAS },
    { key: "medida", title: () => "O que você vai medir?", hint: "Uma meta boa dá para contar.", options: a => (METRICS[a.area] ?? METRICS.profissional).map(({ value, label }) => ({ value, label })) },
    { key: "quanto", title: a => `Quanto? ${metric(a)?.label ?? ""}`.trim(), hint: "Escolha um número que desafia, mas cabe na sua rotina.", options: a => (metric(a)?.amounts ?? []).map(n => ({ value: n, label: (metric(a)!.unit).replace("{n}", n) })) },
  ],
  compose: a => { const m = metric(a); return m && a.quanto ? `${m.unit.replace("{n}", a.quanto)} nos próximos 30 dias.` : ""; },
};
