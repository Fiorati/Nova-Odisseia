import { z } from "zod";

/** Dados de nascimento do Mapa Astral: nome completo, data, hora e cidade. */
export const mapaAstralInputSchema = z.object({
  fullName: z.string().trim().min(3).max(160),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data no formato AAAA-MM-DD"),
  birthTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora no formato HH:MM"),
  city: z.string().trim().min(2).max(120),
  /** true = o mapa é da própria pessoa logada (liga à jornada dela). false = mapa de outra pessoa (filho, cônjuge...). */
  forSelf: z.boolean().default(true),
  /** Cidade escolhida na busca (evita homônimos). */
  place: z.object({ name: z.string(), admin1: z.string().optional().default(""), admin2: z.string().optional().default(""), country: z.string().optional().default(""), latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), timezone: z.string().min(3) }),
});
export type MapaAstralInput = z.infer<typeof mapaAstralInputSchema>;

export const SIGNS = ["Áries", "Touro", "Gêmeos", "Câncer", "Leão", "Virgem", "Libra", "Escorpião", "Sagitário", "Capricórnio", "Aquário", "Peixes"] as const;
export const BODY_LABELS: Record<string, string> = {
  Sun: "Sol", Moon: "Lua", Mercury: "Mercúrio", Venus: "Vênus", Mars: "Marte", Jupiter: "Júpiter", Saturn: "Saturno", Uranus: "Urano", Neptune: "Netuno", Pluto: "Plutão",
};
export const ASPECTS = [
  { key: "conjuncao", label: "conjunção", angle: 0, orb: 8 },
  { key: "sextil", label: "sextil", angle: 60, orb: 4 },
  { key: "quadratura", label: "quadratura", angle: 90, orb: 6 },
  { key: "trigono", label: "trígono", angle: 120, orb: 6 },
  { key: "oposicao", label: "oposição", angle: 180, orb: 8 },
] as const;

export type ChartBody = { key: string; label: string; longitude: number; sign: string; degree: number; house: number; retrograde: boolean };
export type ChartAspect = { a: string; b: string; type: string; orb: number };
export type NatalChart = {
  utc: string;
  timezone: string;
  latitude: number;
  longitude: number;
  houseSystem: "placidus" | "porfirio";
  ascendant: { longitude: number; sign: string; degree: number };
  midheaven: { longitude: number; sign: string; degree: number };
  houses: number[];
  bodies: ChartBody[];
  aspects: ChartAspect[];
};

export const norm360 = (x: number) => ((x % 360) + 360) % 360;
export const signOf = (lon: number) => SIGNS[Math.floor(norm360(lon) / 30)];
export const degreeInSign = (lon: number) => Math.round((norm360(lon) % 30) * 100) / 100;
export const formatPosition = (lon: number) => { const d = norm360(lon) % 30; const deg = Math.floor(d); const min = Math.floor((d - deg) * 60); return `${deg}°${String(min).padStart(2, "0")}' ${signOf(lon)}`; };

/** Casa (1-12) de uma longitude dadas as 12 cúspides. */
export function houseOf(lon: number, cusps: number[]): number {
  for (let i = 0; i < 12; i++) {
    const start = cusps[i], end = cusps[(i + 1) % 12];
    const span = norm360(end - start), offset = norm360(lon - start);
    if (offset < span) return i + 1;
  }
  return 12;
}

export function findAspects(bodies: { key: string; longitude: number }[]): ChartAspect[] {
  const out: ChartAspect[] = [];
  for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
    let sep = Math.abs(norm360(bodies[i].longitude - bodies[j].longitude)); if (sep > 180) sep = 360 - sep;
    for (const asp of ASPECTS) {
      const orb = Math.abs(sep - asp.angle);
      if (orb <= asp.orb) { out.push({ a: bodies[i].key, b: bodies[j].key, type: asp.key, orb: Math.round(orb * 10) / 10 }); break; }
    }
  }
  return out.sort((x, y) => x.orb - y.orb);
}

/** Converte data/hora local de uma cidade (IANA) para UTC, respeitando horário de verão histórico. */
export function localToUtc(dateKey: string, time: string, timeZone: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number); const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const offsetAt = (ms: number) => {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(ms)).map(p => [p.type, p.value]));
    return Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute) - ms;
  };
  let ms = guess - offsetAt(guess);
  ms = guess - offsetAt(ms);
  return new Date(ms);
}

export const mapaAstralReportJsonSchema = {
  name: "mapa_astral_simbolico",
  strict: true,
  schema: {
    type: "object", additionalProperties: false,
    required: ["essencia", "tripe", "forcas", "atencao", "jornada", "pergunta"],
    properties: {
      essencia: { type: "string", description: "3 a 4 frases sobre o tom geral do mapa, em segunda pessoa, como símbolo para reflexão." },
      tripe: { type: "object", additionalProperties: false, required: ["sol", "lua", "ascendente"], properties: { sol: { type: "string" }, lua: { type: "string" }, ascendente: { type: "string" } }, description: "Uma frase para Sol, Lua e Ascendente, citando signo e casa." },
      forcas: { type: "array", minItems: 3, maxItems: 3, items: { type: "string" }, description: "3 forças simbólicas, cada uma apoiada em uma posição ou aspecto real do mapa." },
      atencao: { type: "array", minItems: 2, maxItems: 2, items: { type: "string" }, description: "2 pontos de atenção, sem fatalismo." },
      jornada: { type: "string", description: "Como esses símbolos conversam com o Chamado e a meta do ciclo, com uma ação pequena para o mês." },
      pergunta: { type: "string", description: "Uma pergunta para refletir no mês." },
    },
  },
} as const;
export const mapaAstralReportSchema = z.object({
  essencia: z.string().min(1).max(1200),
  tripe: z.object({ sol: z.string().min(1).max(500), lua: z.string().min(1).max(500), ascendente: z.string().min(1).max(500) }),
  forcas: z.array(z.string().min(1).max(500)).length(3),
  atencao: z.array(z.string().min(1).max(500)).length(2),
  jornada: z.string().min(1).max(1200),
  pergunta: z.string().min(1).max(400),
});
export type MapaAstralReport = z.infer<typeof mapaAstralReportSchema>;

export function chartSummaryLines(chart: NatalChart): string[] {
  const lines = [
    `Ascendente: ${formatPosition(chart.ascendant.longitude)}`,
    `Meio do Céu: ${formatPosition(chart.midheaven.longitude)}`,
    ...chart.bodies.map(b => `${b.label}: ${formatPosition(b.longitude)}, casa ${b.house}${b.retrograde ? ", retrógrado" : ""}`),
  ];
  const aspects = chart.aspects.slice(0, 10).map(a => `${BODY_LABELS[a.a] ?? a.a} ${ASPECTS.find(x => x.key === a.type)?.label} ${BODY_LABELS[a.b] ?? a.b} (orbe ${a.orb}°)`);
  if (aspects.length) lines.push(`Aspectos principais: ${aspects.join("; ")}`);
  return lines;
}

export function buildMapaAstralMessages(input: Pick<MapaAstralInput, "fullName"> & { forSelf?: boolean }, chart: NatalChart, journey: { calling?: string; cycleGoal?: string } | null) {
  const forSelf = input.forSelf !== false && journey !== null;
  const system = [
    "Você é o Oráculo da Nova Odisseia e escreve uma leitura simbólica de mapa astral, em português do Brasil, segunda pessoa (você).",
    "As posições foram calculadas astronomicamente e estão abaixo; use SOMENTE essas posições e não invente outras.",
    "A astrologia aqui é linguagem simbólica para autoconhecimento: não prevê o futuro, não faz diagnóstico, não decide pela pessoa e não promete resultado.",
    forSelf
      ? "Evite fatalismo e rótulos. Conecte os símbolos ao Chamado e à meta do ciclo quando existirem. Seja concreto, caloroso e breve."
      : "Este mapa é de outra pessoa, não de quem está usando a plataforma: NÃO mencione Chamado, meta, plataforma ou trabalho de quem pediu. No campo jornada, escreva uma reflexão geral sobre como cultivar essas forças, sem ação ligada à rotina de quem pediu. Evite fatalismo e rótulos. Seja concreto, caloroso e breve.",
  ].join(" ");
  const lines = [`Nome: ${input.fullName}`];
  if (forSelf) {
    lines.push(`Chamado: ${journey?.calling?.trim() || "(não declarado)"}`, `Meta do ciclo: ${journey?.cycleGoal?.trim() || "(não declarada)"}`);
  } else {
    lines.push("(Mapa de outra pessoa: sem ligação com a jornada de quem pediu.)");
  }
  const user = [
    ...lines,
    "", "Mapa natal calculado (zodíaco tropical, casas " + (chart.houseSystem === "placidus" ? "Placidus" : "Porfírio") + "):",
    ...chartSummaryLines(chart),
  ].join("\n");
  return [{ role: "system" as const, content: system }, { role: "user" as const, content: user }];
}
