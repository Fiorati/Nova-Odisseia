export const JOURNEY_TIMEZONE = "America/Sao_Paulo";
export const JOURNEY_CHECKIN_LIMIT = 365;

/** Data do calendário (AAAA-MM-DD) no fuso da jornada, não em UTC. */
export function journeyDateKey(date: Date = new Date(), timeZone: string = JOURNEY_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const get = (type: string) => parts.find(part => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
