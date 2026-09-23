import { z } from "zod";

/** Dados do Mapa Numerológico: nome completo (como na certidão) e data de nascimento. */
export const mapaNumerologicoInputSchema = z.object({
  fullName: z.string().trim().min(3).max(160),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data no formato AAAA-MM-DD"),
  /** true = o mapa é da própria pessoa logada (liga à jornada dela). false = mapa de outra pessoa. */
  forSelf: z.boolean().default(true),
});
export type MapaNumerologicoInput = z.infer<typeof mapaNumerologicoInputSchema>;

export const MASTER_NUMBERS = [11, 22, 33] as const;
const VOWELS = new Set(["A", "E", "I", "O", "U"]);

/** Tabela pitagórica: A=1 ... I=9, J=1 ... R=9, S=1 ... Z=9. */
export function letterValue(letter: string): number {
  const code = letter.charCodeAt(0) - 64;
  return code >= 1 && code <= 26 ? ((code - 1) % 9) + 1 : 0;
}

/** Remove acentos e cedilha e deixa só letras A-Z maiúsculas. */
export function normalizeName(name: string): string {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z]/g, "");
}

/** Reduz somando dígitos até 1-9, preservando os números mestres 11, 22 e 33. */
export function reduceNumber(value: number, keepMasters = true): number {
  let n = Math.abs(Math.trunc(value));
  while (n > 9 && !(keepMasters && (MASTER_NUMBERS as readonly number[]).includes(n))) {
    n = String(n).split("").reduce((sum, d) => sum + Number(d), 0);
  }
  return n;
}

const sumLetters = (letters: string[]) => letters.reduce((sum, l) => sum + letterValue(l), 0);

export type NumerologyNumbers = {
  caminho: number; // Caminho de Vida (data completa)
  expressao: number; // Expressão / Destino (todas as letras)
  motivacao: number; // Motivação / Alma (vogais)
  impressao: number; // Impressão / Personalidade (consoantes)
  aniversario: number; // Dia de nascimento
  anoPessoal: number; // Ano pessoal do ano corrente
  anoReferencia: number;
};

export function computeNumerology(fullName: string, birthDate: string, referenceYear: number): NumerologyNumbers {
  const letters = normalizeName(fullName).split("");
  if (!letters.length) throw new Error("Nome sem letras válidas.");
  const [y, m, d] = birthDate.split("-").map(Number);
  if (!y || !m || !d || m > 12 || d > 31) throw new Error("Data inválida.");
  const vowels = letters.filter(l => VOWELS.has(l));
  const consonants = letters.filter(l => !VOWELS.has(l));
  return {
    caminho: reduceNumber(reduceNumber(d) + reduceNumber(m) + reduceNumber(y)),
    expressao: reduceNumber(sumLetters(letters)),
    motivacao: reduceNumber(sumLetters(vowels)),
    impressao: reduceNumber(sumLetters(consonants)),
    aniversario: reduceNumber(d),
    anoPessoal: reduceNumber(reduceNumber(d, false) + reduceNumber(m, false) + reduceNumber(referenceYear, false), false),
    anoReferencia: referenceYear,
  };
}

export const NUMBER_LABELS: Record<Exclude<keyof NumerologyNumbers, "anoReferencia">, { title: string; how: string }> = {
  caminho: { title: "Caminho de Vida", how: "soma da data de nascimento" },
  expressao: { title: "Expressão", how: "todas as letras do nome" },
  motivacao: { title: "Motivação", how: "vogais do nome" },
  impressao: { title: "Impressão", how: "consoantes do nome" },
  aniversario: { title: "Dia de nascimento", how: "dia do mês em que nasceu" },
  anoPessoal: { title: "Ano Pessoal", how: "dia + mês + ano corrente" },
};

export const mapaNumerologicoReportSchema = z.object({
  essencia: z.string().min(1).max(1200),
  numeros: z.object({
    caminho: z.string().min(1).max(500), expressao: z.string().min(1).max(500), motivacao: z.string().min(1).max(500),
    impressao: z.string().min(1).max(500), anoPessoal: z.string().min(1).max(500),
  }),
  forcas: z.array(z.string().min(1).max(500)).length(3),
  atencao: z.array(z.string().min(1).max(500)).length(2),
  jornada: z.string().min(1).max(1200),
  pergunta: z.string().min(1).max(400),
});
export type MapaNumerologicoReport = z.infer<typeof mapaNumerologicoReportSchema>;

export const mapaNumerologicoReportJsonSchema = {
  name: "mapa_numerologico_simbolico",
  strict: true,
  schema: {
    type: "object", additionalProperties: false,
    required: ["essencia", "numeros", "forcas", "atencao", "jornada", "pergunta"],
    properties: {
      essencia: { type: "string", description: "3 a 4 frases sobre o tom geral dos números, em segunda pessoa, como símbolo para reflexão." },
      numeros: {
        type: "object", additionalProperties: false, required: ["caminho", "expressao", "motivacao", "impressao", "anoPessoal"],
        properties: { caminho: { type: "string" }, expressao: { type: "string" }, motivacao: { type: "string" }, impressao: { type: "string" }, anoPessoal: { type: "string" } },
        description: "Uma frase para cada número, citando o valor calculado.",
      },
      forcas: { type: "array", minItems: 3, maxItems: 3, items: { type: "string" }, description: "3 forças simbólicas, cada uma apoiada em um número real do mapa." },
      atencao: { type: "array", minItems: 2, maxItems: 2, items: { type: "string" }, description: "2 pontos de atenção, sem fatalismo." },
      jornada: { type: "string", description: "Como esses números conversam com o Chamado e a meta do ciclo, com uma ação pequena para o mês." },
      pergunta: { type: "string", description: "Uma pergunta para refletir no mês." },
    },
  },
} as const;

export function numerologySummaryLines(n: NumerologyNumbers): string[] {
  return (Object.keys(NUMBER_LABELS) as (keyof typeof NUMBER_LABELS)[]).map(k => {
    const v = n[k];
    const master = (MASTER_NUMBERS as readonly number[]).includes(v) ? " (número mestre)" : "";
    return `${NUMBER_LABELS[k].title}: ${v}${master} - ${NUMBER_LABELS[k].how}${k === "anoPessoal" ? ` ${n.anoReferencia}` : ""}`;
  });
}

export function buildMapaNumerologicoMessages(input: Pick<MapaNumerologicoInput, "fullName"> & { forSelf?: boolean }, numbers: NumerologyNumbers, journey: { calling?: string; cycleGoal?: string } | null) {
  const forSelf = input.forSelf !== false && journey !== null;
  const system = [
    "Você é o Oráculo da Nova Odisseia e escreve uma leitura simbólica de mapa numerológico pitagórico, em português do Brasil, segunda pessoa (você).",
    "Os números já foram calculados e estão abaixo; use SOMENTE esses valores e não recalcule nem invente outros.",
    "A numerologia aqui é linguagem simbólica para autoconhecimento: não prevê o futuro, não faz diagnóstico, não decide pela pessoa e não promete resultado.",
    forSelf
      ? "Evite fatalismo e rótulos. Conecte os números ao Chamado e à meta do ciclo quando existirem. Seja concreto, caloroso e breve."
      : "O mapa é de outra pessoa, não de quem usa a plataforma: deixe de fora Chamado, meta, plataforma e trabalho de quem pediu. No campo jornada, escreva uma reflexão geral sobre como cultivar essas forças. Evite fatalismo e rótulos. Seja concreto, caloroso e breve.",
  ].join(" ");
  const lines = [`Nome: ${input.fullName}`];
  if (forSelf) lines.push(`Chamado: ${journey?.calling?.trim() || "(não declarado)"}`, `Meta do ciclo: ${journey?.cycleGoal?.trim() || "(não declarada)"}`);
  else lines.push("(Mapa de outra pessoa: sem ligação com a jornada de quem pediu.)");
  const user = [...lines, "", "Números calculados (tabela pitagórica):", ...numerologySummaryLines(numbers)].join("\n");
  return [{ role: "system" as const, content: system }, { role: "user" as const, content: user }];
}
