export type PdiArea = "profissional" | "pessoal" | "emocional" | "comunidade";
export type PdiJourneyState = {
  calling: string;
  cycleGoal: string;
  stage: "Chamado";
  xp: 0;
  streak: 0;
  areas: { key: PdiArea; label: string; score: number; focus: string }[];
  missions: { id: string; title: string; area: PdiArea; done: false; xp: number }[];
  checkins: [];
};

/** PDI de 30 dias com foco em constância. O mentor preenche; o navegante executa e registra. */
export function constancia30Pdi(input: { mentorName: string; name: string }): PdiJourneyState {
  const mentor = input.mentorName.trim() || "seu mentor";
  const name = input.name.trim() || "Navegante";
  return {
    calling: "Ser um consultor constante: aparecer e executar todo dia, usando meu rapport para transformar visitas em reuniões.",
    cycleGoal: [
      `PDI 30 dias - ${name}. Mentor: ${mentor}.`,
      "META: constância. Não é volume nem talento: aparecer e executar todo dia. É o que destrava o resto.",
      "ROTINA: na véspera, 10 min planejando o dia seguinte, com 3 prioridades escritas na agenda física. Golden Hour: a primeira hora do dia só para ligação e agendamento. Meta mínima diária de PaP e visitas, definida com o mentor, que não se negocia.",
      "ALAVANCA: o rapport abre portas. Medir visitas feitas → conversas com decisor → reuniões marcadas. Se cair nas visitas, é constância. Se cair na conversão, é técnica.",
      "EMOCIONAL: o ambiente é estratégia, não detalhe. Toda semana: quem te jogou pra cima essa semana?",
      `CHECK-IN: 15 min com ${mentor} toda sexta: o que executei, onde furei, plano da próxima semana.`,
      "PLACAR DIÁRIO (no check-in do Diário de Bordo): Planejei? Golden Hour? Bati a meta de PaP? Só sim ou não. Em 30 dias o padrão aparece.",
    ].join("\n"),
    stage: "Chamado",
    xp: 0,
    streak: 0,
    areas: [
      { key: "profissional", label: "Profissional", score: 6, focus: "Funil do rapport: visitas → conversas com decisor → reuniões marcadas. Queda nas visitas é constância; queda na conversão é técnica." },
      { key: "pessoal", label: "Pessoal", score: 5, focus: "Rotina: 10 min na véspera com 3 prioridades na agenda física + Golden Hour (1ª hora só ligação e agendamento)." },
      { key: "emocional", label: "Emocional", score: 6, focus: "Regra do ambiente: ambiente é estratégia. Pergunta semanal: quem te jogou pra cima essa semana?" },
      { key: "comunidade", label: "Comunidade", score: 4, focus: `Check-in de 15 min com ${mentor} toda sexta: o que executei, onde furei, plano da próxima semana.` },
    ],
    missions: [
      { id: "pdi-1", title: `Definir com ${mentor} a meta mínima diária de PaP e visitas`, area: "profissional", done: false, xp: 40 },
      { id: "pdi-2", title: "Rotina da véspera: 10 min, 3 prioridades escritas na agenda física", area: "pessoal", done: false, xp: 30 },
      { id: "pdi-3", title: "Golden Hour: primeira hora do dia só para ligação e agendamento", area: "profissional", done: false, xp: 30 },
      { id: "pdi-4", title: "Placar diário no check-in: Planejei? Golden Hour? Meta de PaP? (sim/não)", area: "emocional", done: false, xp: 30 },
      { id: "pdi-5", title: "Registrar o funil da semana: visitas → decisor → reuniões marcadas", area: "profissional", done: false, xp: 30 },
      { id: "pdi-6", title: "Responder toda semana: quem te jogou pra cima essa semana?", area: "emocional", done: false, xp: 20 },
      { id: "pdi-7", title: `Check-in de sexta com ${mentor} (15 min): executei, onde furei, próxima semana`, area: "comunidade", done: false, xp: 40 },
      { id: "pdi-8", title: `Fechar os 30 dias com o placar completo e revisar o padrão com ${mentor}`, area: "pessoal", done: false, xp: 60 },
    ],
    checkins: [],
  };
}
