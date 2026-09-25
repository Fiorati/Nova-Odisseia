/**
 * Consulta guiada do Oráculo: perguntas encadeadas por tema, em botões.
 * As respostas viram texto nos 7 campos de sempre, para o servidor e a IA lerem igual.
 * Nada é sorteado: cada opção depende do tema e das respostas anteriores.
 */
import type { OraculoAnswers } from "./oraculo";

export type OraculoTheme = "trabalho" | "saude" | "relacoes" | "dinheiro" | "proposito" | "emocoes";
export type OraculoOption = { value: string; label: string };
export type OraculoFlowAnswers = Partial<Record<OraculoStepKey, string[]>>;
export type OraculoStepKey = "tema" | "verdade" | "manter" | "ruido" | "fato" | "sentido" | "escolha" | "tensao";
export type OraculoStep = { key: OraculoStepKey; title: (a: OraculoFlowAnswers) => string; hint?: string; multi?: boolean; max?: number; options: (a: OraculoFlowAnswers) => OraculoOption[] };

export const OTHER_CHOICE = "outro";
export const THEMES: { value: OraculoTheme; label: string; short: string }[] = [
  { value: "trabalho", label: "Trabalho e vendas", short: "trabalho" }, { value: "saude", label: "Saúde e corpo", short: "saúde" },
  { value: "relacoes", label: "Família e relações", short: "relações" }, { value: "dinheiro", label: "Dinheiro", short: "dinheiro" },
  { value: "proposito", label: "Propósito e direção", short: "propósito" }, { value: "emocoes", label: "Emoções e cabeça", short: "emoções" },
];
const theme = (a: OraculoFlowAnswers) => (a.tema?.[0] ?? "trabalho") as OraculoTheme;
const themeShort = (a: OraculoFlowAnswers) => THEMES.find(t => t.value === theme(a))?.short ?? "sua vida";

const TRUTHS: Record<OraculoTheme, OraculoOption[]> = {
  trabalho: [{ value: "adio", label: "Sei que preciso prospectar mais cedo e ainda adio" }, { value: "decisor", label: "Gasto energia com quem não decide" }, { value: "ajuda", label: "Preciso pedir ajuda e não peço" }, { value: "urgencia", label: "Meu dia vai para urgências, não para o que importa" }, { value: "carteira", label: "Tenho clientes parados que não estou tratando" }],
  saude: [{ value: "sono", label: "Durmo tarde sabendo que isso me prejudica" }, { value: "treino", label: "Adio o treino de novo e de novo" }, { value: "comida", label: "Como mal nos dias corridos" }, { value: "sinais", label: "Ignoro sinais de cansaço do corpo" }],
  relacoes: [{ value: "conversa", label: "Tem uma conversa que estou evitando" }, { value: "presenca", label: "Estou presente de corpo, mas não de cabeça" }, { value: "sim", label: "Digo sim quando queria dizer não" }, { value: "distancia", label: "Sinto falta de alguém e não procuro" }],
  dinheiro: [{ value: "olhar", label: "Evito olhar meus números de verdade" }, { value: "gasto", label: "Gasto sem saber quanto entra" }, { value: "decisao", label: "Estou adiando uma decisão financeira" }, { value: "mes", label: "Dependo de um mês bom para fechar as contas" }],
  proposito: [{ value: "comecar", label: "Sei o que quero, mas ainda não comecei" }, { value: "caminho", label: "Sinto que estou num caminho que não é o meu" }, { value: "escolher", label: "Tenho ideias demais e não escolho nenhuma" }, { value: "porque", label: "Perdi o porquê do que faço" }],
  emocoes: [{ value: "sozinho", label: "Estou carregando algo sozinho" }, { value: "reajo", label: "Reajo antes de pensar" }, { value: "cobranca", label: "Me cobro demais" }, { value: "comparo", label: "Me comparo o tempo todo" }],
};
const FACTS: Record<OraculoTheme, OraculoOption[]> = {
  trabalho: [{ value: "adiado", label: "Um cliente adiou ou recusou" }, { value: "meta", label: "Fiquei abaixo da meta da semana" }, { value: "visita", label: "Fiz visitas, mas sem falar com o decisor" }, { value: "venda", label: "Fechei ou avancei uma venda" }],
  saude: [{ value: "noites", label: "Dormi mal várias noites" }, { value: "pulei", label: "Pulei o treino que tinha combinado" }, { value: "cansaco", label: "Terminei o dia sem energia" }, { value: "cumpri", label: "Cumpri um cuidado que vinha adiando" }],
  relacoes: [{ value: "discussao", label: "Tive uma discussão ou um atrito" }, { value: "ausente", label: "Estive ausente num momento importante" }, { value: "silencio", label: "Deixei de falar algo que queria" }, { value: "encontro", label: "Tive um encontro bom com alguém" }],
  dinheiro: [{ value: "conta", label: "Uma conta apertou" }, { value: "impulso", label: "Fiz um gasto por impulso" }, { value: "renda", label: "A renda do mês veio menor" }, { value: "guardei", label: "Consegui guardar ou quitar algo" }],
  proposito: [{ value: "vazio", label: "Terminei a semana com sensação de vazio" }, { value: "adiei", label: "Adiei de novo o projeto que importa" }, { value: "sinal", label: "Algo me lembrou do que eu quero de verdade" }, { value: "passo", label: "Dei um primeiro passo" }],
  emocoes: [{ value: "explodi", label: "Reagi de um jeito que não gostei" }, { value: "travei", label: "Travei diante de algo simples" }, { value: "peso", label: "Senti um peso que não passou" }, { value: "calma", label: "Consegui manter a calma num momento difícil" }],
};
const MEANINGS: OraculoOption[] = [
  { value: "medo", label: "Medo de errar ou de ouvir um não" }, { value: "clareza", label: "Falta clareza do próximo passo" }, { value: "energia", label: "Minha energia está no lugar errado" },
  { value: "estrutura", label: "Falta rotina ou estrutura" }, { value: "forca", label: "Uma força minha que não estou usando" }, { value: "fora", label: "Parte disso está fora do meu controle" },
];
const CHOICES: Record<string, string[]> = {
  medo: ["Fazer a ação que eu temo na versão menor possível", "Pedir um retorno sincero a alguém de confiança"],
  clareza: ["Escrever qual é o próximo passo, em uma linha", "Perguntar antes de concluir: quem decide, o que falta"],
  energia: ["Cortar uma coisa que drena energia esta semana", "Proteger a primeira hora do dia para o que importa"],
  estrutura: ["Marcar horário fixo na agenda para isso", "Preparar na véspera o que preciso para começar"],
  forca: ["Usar de propósito o que já funciona para mim", "Repetir o que deu certo na última vez"],
  fora: ["Separar o que é meu do que não é, e agir só no meu", "Pedir ajuda para a parte que não depende de mim"],
};
const THEME_CHOICES: Record<OraculoTheme, string> = {
  trabalho: "Ligar para 3 clientes da carteira antes das 10h", saude: "Dormir antes das 23h por 3 noites", relacoes: "Ter a conversa que está pendente",
  dinheiro: "Olhar meus números por 15 minutos", proposito: "Dar um passo de 20 minutos no projeto que importa", emocoes: "Fazer uma pausa de 10 minutos antes de reagir",
};

export const ORACULO_STEPS: OraculoStep[] = [
  { key: "tema", title: () => "Onde você mais precisa de clareza agora?", hint: "A consulta toda vai girar em torno disso.", options: () => THEMES.map(({ value, label }) => ({ value, label })) },
  { key: "verdade", title: a => `Em ${themeShort(a)}, que verdade você já percebeu, mas ainda não virou escolha?`, options: a => [...TRUTHS[theme(a)], { value: OTHER_CHOICE, label: "Outra verdade" }] },
  { key: "fato", title: () => "Qual fato recente mostra isso?", hint: "Só o que aconteceu, sem julgamento.", options: a => [...FACTS[theme(a)], { value: "nada", label: "Nada concreto ainda, é uma sensação" }] },
  { key: "sentido", title: () => "O que está por trás disso?", options: a => {
    const good = ["venda", "cumpri", "encontro", "guardei", "passo", "calma"].includes(a.fato?.[0] ?? "");
    return good ? [MEANINGS[4], ...MEANINGS.filter(m => m.value !== "forca")] : MEANINGS;
  } },
  { key: "escolha", title: () => "Qual ação pequena respeita o que você percebeu?", hint: "Sugestões a partir das suas respostas.", options: a => {
    const list = [...(CHOICES[a.sentido?.[0] ?? "clareza"] ?? []), THEME_CHOICES[theme(a)]];
    return [...list.map(label => ({ value: label, label })), { value: OTHER_CHOICE, label: "Outra ação" }];
  } },
  { key: "manter", multi: true, max: 2, title: () => "O que merece continuar igual na sua rota?", hint: "Até duas opções.", options: () => [
    { value: "disciplina", label: "Minha disciplina e rotina" }, { value: "pessoas", label: "Meu jeito de lidar com as pessoas" }, { value: "recomecar", label: "Minha capacidade de recomeçar" },
    { value: "valores", label: "Minha fé e meus valores" }, { value: "saude", label: "Um cuidado com a saúde" }, { value: "ajuda", label: "Pedir ajuda quando preciso" }] },
  { key: "ruido", multi: true, max: 2, title: () => "Qual ruído precisa baixar para você ouvir o essencial?", hint: "Até duas opções.", options: () => [
    { value: "celular", label: "Celular e redes sociais" }, { value: "comparacao", label: "Comparação com os outros" }, { value: "opiniao", label: "Opinião dos outros" },
    { value: "tarefas", label: "Excesso de tarefas" }, { value: "futuro", label: "Preocupação com o futuro" }, { value: "cobranca", label: "Cobrança interna" }] },
  { key: "tensao", title: () => "Olhando para isso tudo: o que depende de você agora?", options: () => [
    { value: "eu", label: "Quase tudo depende de mim" }, { value: "tempo", label: "Metade é minha, metade precisa de tempo" },
    { value: "ajuda", label: "Preciso da ajuda de alguém" }, { value: "limite", label: "Preciso colocar um limite" }] },
];

const labels = (step: OraculoStep, a: OraculoFlowAnswers, other: Partial<Record<OraculoStepKey, string>>) => {
  const opts = step.options(a);
  return (a[step.key] ?? []).map(v => v === OTHER_CHOICE ? (other[step.key]?.trim() || "") : opts.find(o => o.value === v)?.label ?? v).filter(Boolean);
};

export function oraculoFlowReady(a: OraculoFlowAnswers, other: Partial<Record<OraculoStepKey, string>>) {
  return ORACULO_STEPS.every(s => (a[s.key]?.length ?? 0) > 0 && (!a[s.key]!.includes(OTHER_CHOICE) || !!other[s.key]?.trim()));
}

/** Converte a consulta nos 7 campos que o servidor já entende. A nota opcional entra no fato. */
export function oraculoFlowToAnswers(a: OraculoFlowAnswers, other: Partial<Record<OraculoStepKey, string>>, note?: string): OraculoAnswers {
  const step = (k: OraculoStepKey) => ORACULO_STEPS.find(s => s.key === k)!;
  const get = (k: OraculoStepKey) => labels(step(k), a, other).join("; ");
  const tema = THEMES.find(t => t.value === theme(a))?.label ?? "";
  return {
    verdade: `[${tema}] ${get("verdade")}`.slice(0, 2000),
    manter: get("manter").slice(0, 2000),
    ruido: get("ruido").slice(0, 2000),
    fato: [get("fato"), note?.trim()].filter(Boolean).join(". ").slice(0, 2000),
    sentido: get("sentido").slice(0, 2000),
    escolha: get("escolha").slice(0, 2000),
    tensao: get("tensao").slice(0, 2000),
  };
}
