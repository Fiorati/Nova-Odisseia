export type RmrContentArea = "tarefas" | "propostas" | "tpv";

export type RmrContentRecommendation = {
  area: RmrContentArea;
  title: string;
  format: string;
  focus: string;
};

const recommendations: Record<RmrContentArea, RmrContentRecommendation> = {
  tarefas: {
    area: "tarefas",
    title: "Blocos de prospecção e gestão de rota",
    format: "Roteiro prático de 20 minutos",
    focus: "Organize a agenda por micro-região, proteja blocos de visitas e use uma lista diária de 10 tarefas de venda.",
  },
  propostas: {
    area: "propostas",
    title: "Diagnóstico e construção de proposta",
    format: "Checklist de descoberta",
    focus: "Revise perguntas de diagnóstico, proposta de valor e compromisso de próxima etapa para transformar visita em proposta.",
  },
  tpv: {
    area: "tpv",
    title: "Priorização por TPV e plano de fechamento",
    format: "Playbook de oportunidade",
    focus: "Reordene o funil por TPV, temperatura e etapa; avance primeiro oportunidades com volume e próxima ação definidos.",
  },
};

export function recommendRmrContent(input: { tasksRate: number; proposalsRate: number; tpvRate: number }) {
  const scores: Array<[RmrContentArea, number]> = [["tarefas", input.tasksRate], ["propostas", input.proposalsRate], ["tpv", input.tpvRate]];
  return scores.sort(([, scoreA], [, scoreB]) => scoreA - scoreB).map(([area]) => recommendations[area]);
}
