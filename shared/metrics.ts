export function calculatePsvSuggestion(input: { targetVariable: number; currentVariable: number; multiplier: number; weeksRemaining: number; conversionRate: number }) {
  const missing = Math.max(input.targetVariable - input.currentVariable, 0);
  const baseNeeded = missing / Math.max(input.multiplier, 0.1);
  const clients100 = Math.ceil((baseNeeded * 0.2) / 800);
  const clients50 = Math.ceil((baseNeeded * 0.45) / 300);
  const clients30 = Math.ceil((baseNeeded * 0.35) / 150);
  const totalClients = clients100 + clients50 + clients30;
  const totalTpv = clients100 * 100000 + clients50 * 50000 + clients30 * 30000;
  return {
    missing,
    clients100,
    clients50,
    clients30,
    totalClients,
    suggestedLeads: Math.ceil((totalClients / Math.max(input.conversionRate, 1)) * 100),
    totalTpv,
    weeklyTpv: totalTpv / Math.max(input.weeksRemaining, 1),
    weeklyClients: Math.ceil(totalClients / Math.max(input.weeksRemaining, 1)),
  };
}

export function calculatePsvFromCommission(input: { targetVariable: number; currentVariable: number; multiplier: number; weeksRemaining: number; conversionRate: number; commissionPerClient: number; tpvPerClient: number }) {
  const missing = Math.max(input.targetVariable - input.currentVariable, 0);
  const variablePerClient = Math.max(input.commissionPerClient * input.multiplier, 0.01);
  const totalClients = Math.ceil(missing / variablePerClient);
  const totalTpv = totalClients * input.tpvPerClient;
  return {
    missing,
    totalClients,
    totalTpv,
    suggestedLeads: Math.ceil((totalClients / Math.max(input.conversionRate, 1)) * 100),
    weeklyTpv: totalTpv / Math.max(input.weeksRemaining, 1),
    weeklyClients: Math.ceil(totalClients / Math.max(input.weeksRemaining, 1)),
  };
}

export function calculateRmrKpi(input: { workingDays: number; salesTasks: number; proposals: number; closedClients: number; closedTpv: number; goalTpv: number }) {
  const taskScore = Math.min(input.salesTasks / Math.max(input.workingDays * 10, 1), 1.2);
  const proposalScore = Math.min(input.proposals / Math.max(input.workingDays * 2, 1), 1.2);
  const tpvScore = input.goalTpv > 0 ? Math.min(input.closedTpv / input.goalTpv, 1.2) : 0;
  const globalKpi = ((taskScore * 0.25) + (proposalScore * 0.25) + (tpvScore * 0.5)) * 100;
  const pointsAwarded = Math.round((Math.min(taskScore, 1) * 35) + (Math.min(proposalScore, 1) * 35) + (Math.min(tpvScore, 1) * 80) + Math.min(input.closedClients * 5, 50));
  return { taskScore, proposalScore, tpvScore, globalKpi, pointsAwarded };
}

/** Regras fixas do funil de PSV: não dependem de histórico do agente. */
export const PSV_FUNNEL_RATES = {
  taskToProposalRate: 0.2,
  proposalToClientRate: 0.2,
  averageTpvPerClient: 35_000,
};

/** Divide um total inteiro entre os dias úteis, distribuindo o resto nos primeiros dias. */
function distributeCountAcrossDays(total: number, days: number): number[] {
  const safeDays = Math.max(days, 1);
  const base = Math.floor(total / safeDays);
  let remainder = total - base * safeDays;
  return Array.from({ length: safeDays }, () => {
    const extra = remainder > 0 ? 1 : 0;
    if (remainder > 0) remainder -= 1;
    return base + extra;
  });
}

export type PsvFunnelDayPlan = { visits: number; proposals: number; clients: number; tpv: number };
export type PsvFunnelWeekPlan = { visits: number; proposals: number; clients: number; tpv: number };

/** Calcula a sugestão semanal de PSV pelas regras fixas de conversão, sem depender do histórico do agente. */
export function calculateWeeklyFunnelPlan(targetNewClients: number, workingDays = 5): { weekly: PsvFunnelWeekPlan; daily: PsvFunnelDayPlan[] } {
  const clients = Math.max(0, Math.ceil(targetNewClients));
  const proposals = Math.ceil(clients / PSV_FUNNEL_RATES.proposalToClientRate);
  const visits = Math.ceil(proposals / PSV_FUNNEL_RATES.taskToProposalRate);
  const tpv = clients * PSV_FUNNEL_RATES.averageTpvPerClient;
  const dailyVisits = distributeCountAcrossDays(visits, workingDays);
  const dailyProposals = distributeCountAcrossDays(proposals, workingDays);
  const dailyClients = distributeCountAcrossDays(clients, workingDays);
  const dailyTpv = tpv / Math.max(workingDays, 1);
  return {
    weekly: { visits, proposals, clients, tpv },
    daily: Array.from({ length: workingDays }, (_, index) => ({
      visits: dailyVisits[index] ?? 0,
      proposals: dailyProposals[index] ?? 0,
      clients: dailyClients[index] ?? 0,
      tpv: dailyTpv,
    })),
  };
}
