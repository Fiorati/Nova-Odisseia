/** Personal journey signals only. Never mix in the legacy commercial dashboard. */
export type HojeMission = { id: string; title: string; done: boolean };
export type HojeCheckin = { date: string; reflection: string; nextAction: string };
export function hojeMetrics(missions: HojeMission[], checkins: HojeCheckin[], today: string) {
  const nextMission = missions.find(mission => !mission.done) ?? null;
  const completed = missions.filter(mission => mission.done).length;
  // Calendar-day keys in the journey's timezone. Noon UTC avoids timezone rollovers.
  const base = new Date(`${today}T12:00:00Z`);
  const start = new Date(base);
  start.setUTCDate(start.getUTCDate() - 6);
  const firstDay = start.toISOString().slice(0, 10);
  const days = new Set(checkins.filter(item => item.date >= firstDay && item.date <= today).map(item => item.date));
  const latest = [...checkins].filter(item => item.date <= today).sort((a,b) => b.date.localeCompare(a.date))[0] ?? null;
  return { nextMission, completed, total: missions.length, checkinDays: days.size, latestCheckin: latest };
}
