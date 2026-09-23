export type TravessiaArea = "profissional" | "pessoal" | "emocional" | "comunidade";
export type ProvaReflection = { fact: string; meaning: string; next: string };
export type TravessiaMission = { id: string; title: string; area: TravessiaArea; done: boolean; xp: number; kind?: "prova"; dueDate?: string; doneAt?: string; reflection?: ProvaReflection };
export type TravessiaCheckin = { date: string; energy: number; reflection: string; nextAction: string };
export type TravessiaPdi = { mentor: string; title: string; summary: string; focus: string[]; createdAt: string };
export type TravessiaEvidence = { date: string; context: string; fact: string; meaning: string; next: string };
export type TravessiaForge = { date: string; area: TravessiaArea; done: number[] };
export type TravessiaState = {
  calling: string; cycleGoal: string; stage: "Chamado" | "Provação" | "Maestria" | "Retorno"; xp: number; streak: number;
  areas: { key: TravessiaArea; label: string; score: number; focus: string }[];
  missions: TravessiaMission[]; checkins: TravessiaCheckin[]; pdi?: TravessiaPdi; forge?: TravessiaForge; evidences?: TravessiaEvidence[];
};

export const PROVA_XP = 50;
export const FORGE_XP = 10;

export const journeyDefaults: TravessiaState = {
  calling: "Construir uma vida com direção, presença e evolução real.",
  cycleGoal: "Escolha a transformação que fará os próximos 30 dias valerem a pena.",
  stage: "Chamado", xp: 0, streak: 0,
  areas: [
    { key: "profissional", label: "Profissional", score: 6, focus: "Metas, competências e execução" },
    { key: "pessoal", label: "Pessoal", score: 5, focus: "Hábitos, saúde, finanças e tempo" },
    { key: "emocional", label: "Emocional", score: 6, focus: "Consciência, diário e gratidão" },
    { key: "comunidade", label: "Comunidade", score: 4, focus: "Mentoria, squads e contribuição" },
  ],
  missions: [
    { id: "m1", title: "Definir o Chamado do ciclo", area: "pessoal", done: false, xp: 40 },
    { id: "m2", title: "Escolher três indicadores que realmente importam", area: "profissional", done: false, xp: 30 },
    { id: "m3", title: "Fazer três check-ins de 60 segundos", area: "emocional", done: false, xp: 30 },
  ],
  checkins: [],
};

export const stageForXp = (xp: number): TravessiaState["stage"] => xp >= 3500 ? "Retorno" : xp >= 1500 ? "Maestria" : xp >= 500 ? "Provação" : "Chamado";

/** O dia já contou para o Ritmo se houve check-in ou prova vencida nele. */
export function dayCounted(state: Pick<TravessiaState, "checkins" | "missions" | "evidences">, today: string) {
  return state.checkins.some(item => item.date === today) || state.missions.some(item => item.doneAt === today) || (state.evidences ?? []).some(item => item.date === today);
}

export function activeProva(state: Pick<TravessiaState, "missions">) {
  const pending = state.missions.filter(item => !item.done);
  return pending.find(item => item.kind === "prova") ?? pending[0];
}

export function createProva(state: TravessiaState, input: { title: string; area: TravessiaArea; today: string; id?: string }): TravessiaState {
  const title = input.title.trim().slice(0, 300);
  if (!title) throw new Error("Descreva a ação da prova.");
  const prova: TravessiaMission = { id: input.id ?? `prova-${Date.now()}`, title, area: input.area, done: false, xp: PROVA_XP, kind: "prova", dueDate: input.today };
  return { ...state, missions: [prova, ...state.missions].slice(0, 100) };
}

export function completeProva(state: TravessiaState, input: { id: string; reflection: ProvaReflection; today: string }) {
  const mission = state.missions.find(item => item.id === input.id);
  if (!mission || mission.done) throw new Error("Prova não encontrada ou já concluída.");
  if (!input.reflection.fact.trim()) throw new Error("Conte o que aconteceu.");
  const gainedStreak = !dayCounted(state, input.today);
  const xp = state.xp + mission.xp;
  const reflection = { fact: input.reflection.fact.trim().slice(0, 1000), meaning: input.reflection.meaning.trim().slice(0, 1000), next: input.reflection.next.trim().slice(0, 1000) };
  const next: TravessiaState = {
    ...state, xp, evidences: [{ date: input.today, context: `Prova: ${mission.title}`.slice(0, 200), ...reflection }, ...(state.evidences ?? [])].slice(0, 365), stage: stageForXp(xp), streak: state.streak + (gainedStreak ? 1 : 0),
    missions: state.missions.map(item => item.id === mission.id ? { ...item, done: true, doneAt: input.today, reflection } : item),
  };
  const done = next.missions.filter(item => item.done).length;
  return { state: next, reward: { xp: mission.xp, totalXp: xp, done, total: next.missions.length, streak: next.streak, gainedStreak } };
}

export function lastVictory(state: Pick<TravessiaState, "missions">) {
  return state.missions.filter(item => item.done && item.doneAt && item.reflection).sort((a, b) => (b.doneAt ?? "").localeCompare(a.doneAt ?? ""))[0];
}

export const forgeMoves: Record<TravessiaArea, { title: string; moves: string[] }> = {
  profissional: { title: "Execução em campo", moves: ["Liste os 3 clientes ou tarefas que mais movem sua meta hoje", "Resolva a mais difícil das 3 antes do meio-dia", "Anote o resultado em uma linha: número ou fato"] },
  pessoal: { title: "Rotina e energia", moves: ["Planeje amanhã em 10 min: 3 prioridades na agenda", "Faça 20 min de movimento: caminhada, treino ou alongamento", "Anote um gasto evitado hoje e quanto você guardou"] },
  emocional: { title: "Presença sob pressão", moves: ["Faça 3 respirações lentas antes da próxima conversa difícil", "Escreva em duas linhas: o fato e a sua interpretação", "Liste 3 coisas pelas quais você é grato hoje"] },
  comunidade: { title: "Força em formação", moves: ["Agradeça por mensagem alguém que te ajudou, citando o quê", "Peça um feedback sincero sobre uma entrega sua", "Compartilhe um aprendizado útil com o seu time"] },
};

export function forgeDone(state: Pick<TravessiaState, "forge">, area: TravessiaArea, today: string) {
  return state.forge && state.forge.date === today && state.forge.area === area ? state.forge.done : [];
}

export function toggleForgeMove(state: TravessiaState, input: { area: TravessiaArea; index: number; today: string }): TravessiaState {
  const current = forgeDone(state, input.area, input.today);
  const isDone = current.includes(input.index);
  const done = isDone ? current.filter(item => item !== input.index) : [...current, input.index].sort();
  const xp = Math.max(0, state.xp + (isDone ? -FORGE_XP : FORGE_XP));
  return { ...state, xp, stage: stageForXp(xp), forge: { date: input.today, area: input.area, done } };
}

/** Registro de evidência vinculado a uma ação (treino, leitura, retorno). Entra no Diário de Bordo e conta para o Ritmo. */
export function addEvidence(state: TravessiaState, input: { context: string; fact: string; meaning: string; next: string; today: string }) {
  if (!input.fact.trim()) throw new Error("Preencha o primeiro campo.");
  const gainedStreak = !dayCounted(state, input.today);
  const entry: TravessiaEvidence = { date: input.today, context: input.context.trim().slice(0, 200), fact: input.fact.trim().slice(0, 1000), meaning: input.meaning.trim().slice(0, 1000), next: input.next.trim().slice(0, 1000) };
  const xp = state.xp + FORGE_XP;
  return { state: { ...state, xp, stage: stageForXp(xp), streak: state.streak + (gainedStreak ? 1 : 0), evidences: [entry, ...(state.evidences ?? [])].slice(0, 365) }, reward: { xp: FORGE_XP, streak: state.streak + (gainedStreak ? 1 : 0), gainedStreak } };
}

/** Evidência mais recente entre check-in e registros vinculados, para a Leitura do momento. */
export function latestEvidence(state: Pick<TravessiaState, "checkins" | "evidences">) {
  const checkin = state.checkins[0];
  const evidence = state.evidences?.[0];
  if (evidence && (!checkin || evidence.date >= checkin.date)) return { text: evidence.context ? `${evidence.context}. ${evidence.fact}` : evidence.fact, next: evidence.next };
  return checkin ? { text: checkin.reflection, next: checkin.nextAction } : null;
}
