export function monthlyKpiPoints(globalKpi: number) {
  if (globalKpi > 150) return 100;
  if (globalKpi >= 100) return 40;
  if (globalKpi > 80) return 20;
  return 0;
}

export type MonthlyRecognition = {
  actualTpv: number;
  actualNewClients: number;
  globalKpi: number;
};

export function sortByNewClients<T extends MonthlyRecognition>(rows: T[]) {
  return [...rows].sort((left, right) => right.actualNewClients - left.actualNewClients || right.actualTpv - left.actualTpv);
}

export function sortByTpv<T extends MonthlyRecognition>(rows: T[]) {
  return [...rows].sort((left, right) => right.actualTpv - left.actualTpv || right.actualNewClients - left.actualNewClients);
}

export function sortByGlobalKpi<T extends MonthlyRecognition>(rows: T[]) {
  return [...rows].sort((left, right) => right.globalKpi - left.globalKpi || right.actualTpv - left.actualTpv || right.actualNewClients - left.actualNewClients);
}
