const SEMESTER_KEY_PATTERN = /^(\d{4})-S([12])$/;
const MONTH_KEY_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

export type SemesterKey = `${number}-S1` | `${number}-S2`;

export function semesterKeyForMonth(monthKey: string): SemesterKey {
  const match = MONTH_KEY_PATTERN.exec(monthKey);
  if (!match) throw new Error("Mês de referência inválido.");
  return `${match[1]}-S${Number(match[2]) <= 6 ? 1 : 2}` as SemesterKey;
}

export function semesterMonths(semesterKey: string): string[] {
  const match = SEMESTER_KEY_PATTERN.exec(semesterKey);
  if (!match) throw new Error("Semestre de referência inválido.");

  const year = Number(match[1]);
  const startMonth = match[2] === "1" ? 1 : 7;
  return Array.from({ length: 6 }, (_, index) => `${year}-${String(startMonth + index).padStart(2, "0")}`);
}

export function formatSemesterLabel(semesterKey: string): string {
  const match = SEMESTER_KEY_PATTERN.exec(semesterKey);
  if (!match) return "Semestre";
  return `${match[2]}º semestre de ${match[1]}`;
}

export function monthLabel(monthKey: string): string {
  const [, month = ""] = monthKey.split("-");
  return ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][Number(month) - 1] ?? monthKey;
}

export function recentSemesterOptions(now = new Date()): { key: SemesterKey; label: string }[] {
  const currentYear = now.getFullYear();
  const currentSemester = now.getMonth() < 6 ? 1 : 2;
  const options: { key: SemesterKey; label: string }[] = [];

  for (let offset = 0; offset < 4; offset += 1) {
    const sequence = (currentYear * 2 + currentSemester - 1) - offset;
    const year = Math.floor(sequence / 2);
    const semester = sequence % 2 === 0 ? 1 : 2;
    const key = `${year}-S${semester}` as SemesterKey;
    options.push({ key, label: formatSemesterLabel(key) });
  }

  return options;
}
