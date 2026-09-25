/** Check-in guiado: perguntas de toque, uma por vez, com leitura final por regra fixa (sem IA, sem tom clínico). */
export type CheckinMood = 1 | 2 | 3 | 4 | 5;
export type CheckinFactor = "trabalho" | "saude" | "relacoes" | "dinheiro" | "sono" | "nada";
export type CheckinPlan = "abaixo" | "dentro" | "acima";
export type CheckinNextKey = "descansar" | "clientes" | "ajuda" | "repetir" | "planejar" | "corpo" | "outro";
export type CheckinWhen = "hoje" | "amanha-cedo" | "amanha-tarde" | "semana";
export type CheckinDetail = { mood: CheckinMood; factors: CheckinFactor[]; plan: CheckinPlan; next: CheckinNextKey; nextOther?: string; when: CheckinWhen; note?: string };

export const MOOD_OPTIONS: { value: CheckinMood; label: string; emoji: string }[] = [
  { value: 1, label: "Muito mal", emoji: "😣" },
  { value: 2, label: "Mal", emoji: "🙁" },
  { value: 3, label: "Mediano", emoji: "😐" },
  { value: 4, label: "Bem", emoji: "🙂" },
  { value: 5, label: "Muito bem", emoji: "😄" },
];
export const ENERGY_OPTIONS = [
  { value: 1, label: "Esgotado" }, { value: 2, label: "Baixa" }, { value: 3, label: "Média" }, { value: 4, label: "Boa" }, { value: 5, label: "Alta" },
] as const;
export const FACTOR_OPTIONS: { value: CheckinFactor; label: string }[] = [
  { value: "trabalho", label: "Trabalho / vendas" },
  { value: "saude", label: "Saúde / corpo" },
  { value: "relacoes", label: "Família / relações" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "sono", label: "Sono / cansaço" },
  { value: "nada", label: "Nada em especial" },
];
export const PLAN_OPTIONS: { value: CheckinPlan; label: string }[] = [
  { value: "abaixo", label: "Abaixo do planejado" },
  { value: "dentro", label: "Dentro do planejado" },
  { value: "acima", label: "Acima do planejado" },
];
export const NEXT_LABELS: Record<CheckinNextKey, string> = {
  descansar: "Descansar e recuperar a energia",
  clientes: "Ligar ou visitar clientes da carteira",
  ajuda: "Pedir ajuda ao meu líder ou mentor",
  repetir: "Repetir o que funcionou hoje",
  planejar: "Planejar o dia de amanhã",
  corpo: "Cuidar do corpo (sono, treino, alimentação)",
  outro: "Outro passo",
};
export const WHEN_OPTIONS: { value: CheckinWhen; label: string }[] = [
  { value: "hoje", label: "Ainda hoje" },
  { value: "amanha-cedo", label: "Amanhã cedo" },
  { value: "amanha-tarde", label: "Amanhã à tarde" },
  { value: "semana", label: "Esta semana" },
];

/** Sugere os próximos passos mais coerentes com o que a pessoa respondeu. */
export function suggestNextSteps(input: { mood: number; energy: number; factors: CheckinFactor[]; plan?: CheckinPlan }): CheckinNextKey[] {
  const low = input.mood <= 2 || input.energy <= 2;
  const ordered: CheckinNextKey[] = [];
  const push = (key: CheckinNextKey) => { if (!ordered.includes(key)) ordered.push(key); };
  if (low) { push("descansar"); if (input.factors.includes("sono") || input.factors.includes("saude")) push("corpo"); push("ajuda"); }
  if (input.plan === "acima" || (input.mood >= 4 && input.energy >= 4)) push("repetir");
  if (input.plan === "abaixo") push("planejar");
  if (input.factors.includes("trabalho") && !low) push("clientes");
  push("planejar"); push("clientes"); push("repetir"); push("corpo"); push("ajuda"); push("descansar");
  return ordered.slice(0, 4);
}

export type CheckinReading = { tone: "cuidado" | "atencao" | "equilibrio" | "impulso"; title: string; body: string };

/** Leitura curta do check-in. Orienta o próximo passo; não é diagnóstico de saúde. */
export function readCheckin(input: { mood: number; energy: number; factors: CheckinFactor[]; plan: CheckinPlan }): CheckinReading {
  const { mood, energy, factors, plan } = input;
  const weights = factors.filter(item => item !== "nada").map(item => FACTOR_OPTIONS.find(o => o.value === item)!.label.toLowerCase());
  const where = weights.length ? ` O que mais pesou: ${weights.join(", ")}.` : "";
  if (mood <= 2 && energy <= 2) return { tone: "cuidado", title: "Dia pesado, energia baixa", body: `Hoje o foco é recuperar, não render mais.${where} Escolha um passo pequeno para amanhã e, se isso se repetir por vários dias, converse com alguém de confiança.` };
  if (mood <= 2) return { tone: "cuidado", title: "Humor baixo, mas ainda com energia", body: `Use a energia que sobrou em algo que dependa só de você.${where} Um passo curto e concreto vale mais que um plano grande hoje.` };
  if (energy <= 2) return { tone: "atencao", title: "Cabeça ok, corpo cansado", body: `Proteja o descanso para não perder o ritmo amanhã.${where} Deixe o dia seguinte planejado e durma cedo.` };
  if (plan === "abaixo") return { tone: "atencao", title: "O dia ficou abaixo do plano", body: `Você está bem para ajustar a rota.${where} Olhe o que travou e defina o primeiro movimento de amanhã logo cedo.` };
  if (mood >= 4 && energy >= 4 && plan === "acima") return { tone: "impulso", title: "Dia de embalo", body: `Você entregou acima do planejado e com energia.${where} Anote o que funcionou e repita amanhã, enquanto a maré está a favor.` };
  if (mood >= 4 && energy >= 4) return { tone: "impulso", title: "Boa maré", body: `Humor e energia estão altos.${where} Aproveite para puxar a tarefa mais importante logo no início do próximo dia.` };
  return { tone: "equilibrio", title: "Dia de travessia estável", body: `Nem tempestade, nem calmaria perfeita.${where} Mantenha a constância com um passo claro e com hora marcada.` };
}

/** Texto-resumo gravado nos campos antigos para o Diário de Bordo, Delfos e Oráculo seguirem funcionando. */
export function summarizeCheckin(detail: CheckinDetail) {
  const mood = MOOD_OPTIONS.find(o => o.value === detail.mood)!.label;
  const plan = PLAN_OPTIONS.find(o => o.value === detail.plan)!.label.toLowerCase();
  const factors = detail.factors.filter(f => f !== "nada").map(f => FACTOR_OPTIONS.find(o => o.value === f)!.label.toLowerCase());
  const reflection = [`Me sinto ${mood.toLowerCase()}; dia ${plan}.`, factors.length ? `Pesou/ajudou: ${factors.join(", ")}.` : "", detail.note?.trim() ? detail.note.trim() : ""].filter(Boolean).join(" ");
  const step = detail.next === "outro" ? (detail.nextOther?.trim() || NEXT_LABELS.outro) : NEXT_LABELS[detail.next];
  const when = WHEN_OPTIONS.find(o => o.value === detail.when)!.label;
  return { reflection: reflection.slice(0, 4000), nextAction: `${step} - ${when.toLowerCase()}`.slice(0, 1000) };
}
