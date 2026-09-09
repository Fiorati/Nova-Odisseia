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
