/** Conteúdo editorial curado para rotação automática do feed de notícias, sem fatos externos inventados. */
export type AutoNewsItem = {
  title: string;
  category: string;
  content: string;
};

export const AUTO_NEWS_POOL: AutoNewsItem[] = [
  {
    title: "Radar de negócios: leia o fluxo de caixa antes de falar de taxa",
    category: "Mercado e vendas",
    content: "Antes de propor qualquer produto, mapeie o fluxo de caixa do cliente: prazo de recebimento, mix de débito/crédito/PIX e concentração em um único meio de pagamento. Transforme a análise em perguntas abertas e só então conecte a dor observada ao ecossistema Stone.",
  },
  {
    title: "Tutorial rápido: do painel inicial ao registro de visita",
    category: "Tutorial",
    content: "1) Confira a mensagem do dia e os KPIs no painel inicial. 2) Planeje tarefas, propostas e TPV no Plano semanal. 3) Prepare clientes no Cavalo de Tróia e registre visitas na Estratégia Nórdica. 4) Documente a reunião em Gerar descrição da tarefa. 5) Feche o ciclo registrando o resultado no RMR.",
  },
  {
    title: "Boas práticas de agendamento: priorize decisor e horário certo",
    category: "Agendamento",
    content: "Confirme sempre o nome e o cargo do decisor antes de agendar. Prefira o início da manhã ou o fim da tarde para comércio, e o horário de menor movimento para serviços. Registre a rota e o segmento no Agendamento de reuniões para facilitar o acompanhamento do polo.",
  },
  {
    title: "Radar do agente: ecossistema além da maquininha",
    category: "Mercado e vendas",
    content: "Ao visitar um cliente, observe conciliação bancária, suporte, gestão de estoque e concentração no concorrente. Uma recomendação forte conecta produto, atendimento e ganho operacional — não apenas a taxa cobrada.",
  },
  {
    title: "PSV na prática: prepare 20 a 30 oportunidades por semana",
    category: "Tutorial",
    content: "Use o funil da Estratégia Nórdica para separar temperatura, segmento e TPV projetado antes de montar sua PSV semanal. Isso evita agenda vazia e concentra o esforço nos clientes com maior probabilidade de fechamento no período.",
  },
  {
    title: "RMR: transforme desvio em plano com responsável e prazo",
    category: "Tutorial",
    content: "Ao revisar o mês, escreva a causa-raiz do principal desvio, a ação corretiva, quem é o responsável e o prazo esperado. Planos sem responsável e prazo raramente saem do papel — use o RMR para fechar esse ciclo.",
  },
  {
    title: "Migração e ativação: acompanhe D0, D15 e Upsell",
    category: "Mercado e vendas",
    content: "Clientes recém-migrados precisam de acompanhamento ativo nos primeiros dias. Confirme a ativação em D0, reforce o uso dos produtos contratados e avalie oportunidades de Upsell até D15 para consolidar o relacionamento.",
  },
];

/** Escolhe o próximo item da rotação com base na quantidade já publicada pelo sistema. */
export function pickAutoNewsItem(publishedCount: number): AutoNewsItem {
  const index = ((publishedCount % AUTO_NEWS_POOL.length) + AUTO_NEWS_POOL.length) % AUTO_NEWS_POOL.length;
  return AUTO_NEWS_POOL[index];
}
