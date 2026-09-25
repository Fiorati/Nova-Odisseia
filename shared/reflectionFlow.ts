/** Registros guiados (evidências e pós-prova): perguntas de toque, leitura por regra fixa, sem IA e sem tom clínico. */
export type ReflectionTone = "up" | "mid" | "down";
export type ReflectionOption = { value: string; label: string; tone?: ReflectionTone };
export type ReflectionAnswers = Record<string, string[]>;
export type ReflectionQuestion = { key: string; title: string | ((answers: ReflectionAnswers) => string); hint?: string; multi?: boolean; role: "fact" | "meaning" | "next"; options: (answers: ReflectionAnswers) => ReflectionOption[] };
export type ReflectionReading = { tone: "cuidado" | "atencao" | "equilibrio" | "impulso"; title: string; body: string };
export type ReflectionPresetKey = "esparta" | "delfos" | "itaca" | "prova";
export type ReflectionPreset = { key: ReflectionPresetKey; questions: ReflectionQuestion[]; read: (answers: ReflectionAnswers) => ReflectionReading };
export type ReflectionWhen = "hoje" | "amanha-cedo" | "amanha-tarde" | "semana";
export type ReflectionSubmit = { answers: ReflectionAnswers; nextOther?: string; when: ReflectionWhen; note?: string };

export const OTHER = "outro";
export const REFLECTION_WHEN: { value: ReflectionWhen; label: string }[] = [
  { value: "hoje", label: "Ainda hoje" }, { value: "amanha-cedo", label: "Amanhã cedo" }, { value: "amanha-tarde", label: "Amanhã à tarde" }, { value: "semana", label: "Esta semana" },
];

const fixed = (options: ReflectionOption[]) => () => options;
const first = (a: ReflectionAnswers, key: string) => a[key]?.[0];
const has = (a: ReflectionAnswers, key: string, value: string) => !!a[key]?.includes(value);
const withOther = (list: ReflectionOption[]) => [...list.slice(0, 4), { value: OTHER, label: "Outro passo" }];
const pick = (all: Record<string, string>, order: string[]) => withOther(Array.from(new Set(order)).filter(k => all[k]).map(value => ({ value, label: all[value] })));

/* Esparta: treino do dia. */
const ESPARTA_NEXT: Record<string, string> = {
  repetir: "Repetir o treino no mesmo horário", menor: "Fazer uma versão menor, mas fazer", vespera: "Deixar tudo pronto na véspera",
  horario: "Mudar para um horário mais protegido", companhia: "Combinar com alguém para treinar junto", subir: "Subir um degrau (mais tempo ou intensidade)",
};
const esparta: ReflectionPreset = {
  key: "esparta",
  questions: [
    { key: "cumpriu", role: "fact", title: "Como foi o treino de hoje?", options: fixed([
      { value: "inteiro", label: "Cumpri por inteiro", tone: "up" }, { value: "parte", label: "Cumpri uma parte", tone: "mid" },
      { value: "adaptei", label: "Adaptei e fiz outra versão", tone: "mid" }, { value: "nao", label: "Não consegui hoje", tone: "down" }]) },
    { key: "fator", role: "meaning", multi: true, title: "O que mais decidiu esse resultado?", hint: "Pode marcar mais de um.", options: fixed([
      { value: "preparo", label: "Preparei na véspera", tone: "up" }, { value: "horario", label: "Horário fixo", tone: "up" }, { value: "companhia", label: "Compromisso com alguém", tone: "up" },
      { value: "energia", label: "Energia baixa", tone: "down" }, { value: "tempo", label: "Falta de tempo", tone: "down" }, { value: "imprevisto", label: "Um imprevisto", tone: "down" }]) },
    { key: "proximo", role: "next", title: "Qual é a próxima ação?", hint: "Sugestões a partir das suas respostas.", options: a => {
      const done = first(a, "cumpriu") === "inteiro";
      const order = [done ? "repetir" : "menor", has(a, "fator", "tempo") || has(a, "fator", "imprevisto") ? "horario" : "vespera", has(a, "fator", "energia") ? "menor" : done ? "subir" : "vespera", "companhia", "repetir", "vespera"];
      return pick(ESPARTA_NEXT, order);
    } },
  ],
  read: a => {
    const c = first(a, "cumpriu");
    if (c === "inteiro") return has(a, "fator", "preparo") || has(a, "fator", "horario") || has(a, "fator", "companhia")
      ? { tone: "impulso", title: "Treino cumprido, e você sabe por quê", body: "O que te fez cumprir hoje foi estrutura, não sorte. Mantenha a mesma estrutura amanhã e só suba o nível quando ficar fácil." }
      : { tone: "impulso", title: "Treino cumprido", body: "Mais uma evidência de que você cumpre o que combina consigo. Repita no mesmo horário para virar hábito." };
    if (c === "nao") return { tone: "cuidado", title: "Hoje não foi, e está tudo bem registrar isso", body: "Um dia sem treino não quebra a travessia; sumir quebra. Escolha uma versão tão pequena que seja difícil dizer não amanhã." };
    return { tone: "equilibrio", title: "Você fez o possível com o dia que teve", body: "Fazer uma parte mantém o fio. Ajuste o tamanho ou o horário para o treino caber na sua rotina real." };
  },
};

/* Delfos: fato, sentido, escolha. */
const DELFOS_NEXT: Record<string, string> = {
  perguntar: "Perguntar antes de concluir (quem decide, o que falta)", conversar: "Ter a conversa que está pendente", preparar: "Me preparar melhor para a próxima vez",
  soltar: "Soltar o que não depende de mim e seguir", repetir: "Repetir o que funcionou", pausa: "Fazer uma pausa antes de reagir", ajuda: "Pedir a visão de alguém de confiança",
};
const delfos: ReflectionPreset = {
  key: "delfos",
  questions: [
    { key: "fato", role: "fact", title: "O que aconteceu?", hint: "Escolha o mais próximo do fato, sem julgamento.", options: fixed([
      { value: "adiamento", label: "Algo foi adiado ou recusado", tone: "down" }, { value: "abaixo", label: "Um resultado veio abaixo do esperado", tone: "down" },
      { value: "conversa", label: "Uma conversa difícil", tone: "mid" }, { value: "imprevisto", label: "Um imprevisto mudou o plano", tone: "mid" },
      { value: "acima", label: "Um resultado veio acima do esperado", tone: "up" }, { value: "reconhecimento", label: "Recebi um reconhecimento", tone: "up" }]) },
    { key: "sentiu", role: "meaning", multi: true, title: "O que isso despertou em você?", hint: "Pode marcar mais de um.", options: fixed([
      { value: "frustracao", label: "Frustração", tone: "down" }, { value: "inquietacao", label: "Inquietação", tone: "down" }, { value: "duvida", label: "Dúvida", tone: "mid" },
      { value: "alivio", label: "Alívio", tone: "up" }, { value: "confianca", label: "Confiança", tone: "up" }, { value: "orgulho", label: "Orgulho", tone: "up" }]) },
    { key: "revela", role: "meaning", title: "O que isso revela?", options: a => {
      const good = ["acima", "reconhecimento"].includes(first(a, "fato") ?? "");
      const list: ReflectionOption[] = [
        { value: "info", label: "Faltou informação ou falar com quem decide" }, { value: "padrao", label: "Um jeito meu de reagir que se repete" },
        { value: "depende", label: "Algo que depende de mim e posso mudar" }, { value: "fora", label: "Algo fora do meu controle" }, { value: "forca", label: "Uma força minha que posso usar mais" }];
      return good ? [list[4], list[2], list[1], list[0]] : list;
    } },
    { key: "escolha", role: "next", title: "Qual ação pequena respeita isso?", hint: "Sugestões a partir das suas respostas.", options: a => {
      const r = first(a, "revela");
      const order = r === "info" ? ["perguntar", "preparar", "conversar"] : r === "padrao" ? ["pausa", "ajuda", "conversar"] : r === "depende" ? ["preparar", "conversar", "perguntar"] : r === "fora" ? ["soltar", "pausa", "ajuda"] : ["repetir", "preparar", "ajuda"];
      if (first(a, "fato") === "conversa") order.unshift("conversar");
      return pick(DELFOS_NEXT, [...order, "ajuda", "repetir"]);
    } },
  ],
  read: a => {
    const r = first(a, "revela");
    const heavy = (a.sentiu ?? []).some(s => ["frustracao", "inquietacao"].includes(s));
    const lead = heavy ? "O que você sentiu é informação, não defeito. " : "";
    if (r === "fora") return { tone: "equilibrio", title: "Separar o que é seu do que não é", body: `${lead}Parte disso não está nas suas mãos. Gaste energia só na parte que está.` };
    if (r === "padrao") return { tone: "atencao", title: "Um padrão apareceu", body: `${lead}Perceber o padrão já muda o jogo. Na próxima vez, ganhe alguns segundos entre o fato e a reação.` };
    if (r === "info") return { tone: "atencao", title: "Faltou um pedaço do mapa", body: `${lead}Antes de tirar conclusões, descubra o que falta saber e quem de fato decide.` };
    if (r === "forca") return { tone: "impulso", title: "Uma força para usar de propósito", body: `${lead}O que funcionou aqui não foi acaso. Leve isso de forma consciente para a próxima situação parecida.` };
    return { tone: heavy ? "atencao" : "equilibrio", title: "Está nas suas mãos", body: `${lead}Você identificou algo que pode mudar. Um passo pequeno e com data vale mais que um plano grande.` };
  },
};

/* Ítaca: registro de retorno do ciclo. */
const ITACA_NEXT: Record<string, string> = {
  contar: "Contar para essa pessoa o que aprendi", mostrar: "Mostrar na prática como faço", escrever: "Escrever o princípio em uma frase e deixar à vista",
  manter: "Manter o hábito no próximo ciclo", ensinar: "Ensinar alguém a fazer igual",
};
const itaca: ReflectionPreset = {
  key: "itaca",
  questions: [
    { key: "conquista", role: "fact", multi: true, title: "O que você conquistou neste ciclo?", hint: "Pode marcar mais de um.", options: fixed([
      { value: "habito", label: "Mantive um hábito" }, { value: "trabalho", label: "Bati uma meta de trabalho" }, { value: "saude", label: "Cuidei melhor da saúde" },
      { value: "relacao", label: "Fortaleci uma relação" }, { value: "aprendi", label: "Aprendi algo novo" }, { value: "superei", label: "Superei um medo ou trava" }]) },
    { key: "segue", role: "meaning", title: "O que segue com você daqui pra frente?", options: fixed([
      { value: "rotina", label: "Um hábito ou rotina" }, { value: "planejar", label: "Um jeito de planejar" }, { value: "pressao", label: "Uma forma de lidar com pressão" },
      { value: "pedir", label: "Pedir ajuda mais cedo" }, { value: "confianca", label: "Mais confiança em mim" }]) },
    { key: "partilha", role: "next", title: "Quem pode receber valor disso?", options: fixed([
      { value: "colega", label: "Um colega de trabalho" }, { value: "lider", label: "Meu líder" }, { value: "familia", label: "Alguém da família" }, { value: "amigo", label: "Um amigo" }, { value: "eu", label: "Por enquanto, só eu" }]) },
    { key: "gesto", role: "next", title: "Como você vai partilhar?", options: a => pick(ITACA_NEXT, first(a, "partilha") === "eu" ? ["escrever", "manter"] : ["contar", "mostrar", "ensinar", "escrever"]) },
  ],
  read: a => {
    const n = (a.conquista ?? []).length;
    const self = first(a, "partilha") === "eu";
    return { tone: "impulso", title: n > 1 ? `Você volta com ${n} conquistas` : "Você volta com uma conquista", body: self
      ? "Guardar o princípio por escrito já é voltar para casa com algo. Quando fizer sentido, partilhe: ensinar fixa o que você aprendeu."
      : "Ítaca não é o fim, é o que você traz de volta. Partilhar fixa o aprendizado em você e gera valor para quem está perto." };
  },
};

/* Ulisses: registro depois da prova. */
const PROVA_NEXT: Record<string, string> = {
  repetir: "Repetir a mesma prova amanhã", subir: "Criar uma prova um pouco maior", menor: "Dividir em um passo menor", cedo: "Fazer logo cedo, antes do resto",
  preparar: "Preparar o terreno na véspera", ajuda: "Pedir apoio a alguém", aprender: "Aprender o que faltou antes de tentar de novo",
};
const REVEAL: Record<string, ReflectionOption[]> = {
  forca: [{ value: "disciplina", label: "Disciplina" }, { value: "coragem", label: "Coragem" }, { value: "preparo", label: "Preparo" }, { value: "constancia", label: "Constância" }],
  padrao: [{ value: "adiar", label: "Deixo para depois" }, { value: "cedo", label: "Rendo melhor cedo" }, { value: "comeco", label: "Travo no começo" }, { value: "prazo", label: "Funciono com prazo" }],
  limite: [{ value: "tempo", label: "Tempo" }, { value: "energia", label: "Energia" }, { value: "conhecimento", label: "Conhecimento" }, { value: "outros", label: "Depender de outras pessoas" }],
};
const prova: ReflectionPreset = {
  key: "prova",
  questions: [
    { key: "cumpriu", role: "fact", title: "Como foi a prova?", options: fixed([
      { value: "inteira", label: "Cumpri por inteiro", tone: "up" }, { value: "alem", label: "Fui além do combinado", tone: "up" }, { value: "parte", label: "Cumpri uma parte", tone: "mid" }, { value: "adaptei", label: "Adaptei no caminho", tone: "mid" }]) },
    { key: "tipo", role: "meaning", title: "O que essa prova revelou?", options: fixed([
      { value: "forca", label: "Uma força minha" }, { value: "padrao", label: "Um padrão que se repete" }, { value: "limite", label: "Um limite a respeitar" }]) },
    { key: "qual", role: "meaning", title: a => ({ forca: "Qual força apareceu?", padrao: "Qual padrão se repetiu?", limite: "Qual limite pesou?" } as Record<string, string>)[first(a, "tipo") ?? ""] ?? "Qual?", options: a => REVEAL[first(a, "tipo") ?? "forca"] ?? REVEAL.forca },
    { key: "gesto", role: "next", title: "Qual é o próximo gesto?", hint: "Sugestões a partir das suas respostas.", options: a => {
      const full = ["inteira", "alem"].includes(first(a, "cumpriu") ?? "");
      const q = first(a, "qual");
      const order = [q === "cedo" || q === "adiar" ? "cedo" : "", q === "comeco" ? "menor" : "", q === "tempo" || q === "energia" ? "menor" : "", q === "conhecimento" ? "aprender" : "", q === "outros" ? "ajuda" : "", q === "preparo" ? "preparar" : "", full ? "subir" : "menor", "repetir", "preparar", "cedo"].filter(Boolean);
      return pick(PROVA_NEXT, order);
    } },
  ],
  read: a => {
    const full = ["inteira", "alem"].includes(first(a, "cumpriu") ?? "");
    const t = first(a, "tipo");
    const label = (REVEAL[t ?? ""] ?? []).find(o => o.value === first(a, "qual"))?.label.toLowerCase();
    if (t === "forca") return { tone: "impulso", title: `Força revelada: ${label ?? "sua"}`, body: `${full ? "Prova vencida." : "Mesmo sem completar tudo,"} você mostrou ${label ?? "uma força"}. Use isso de propósito na próxima prova.` };
    const phrase = ({ adiar: "você tende a deixar para depois", cedo: "você rende melhor cedo", comeco: "o começo é onde você trava", prazo: "você funciona melhor com prazo" } as Record<string, string>)[first(a, "qual") ?? ""];
    if (t === "padrao") return { tone: "atencao", title: "Um padrão ficou visível", body: `Ficou claro que ${phrase ?? "algo se repete"}. Monte a próxima prova a favor desse padrão, e não contra ele.` };
    return { tone: full ? "equilibrio" : "cuidado", title: `Limite reconhecido: ${label ?? "respeite-o"}`, body: "Reconhecer um limite é estratégia, não fraqueza. Ajuste o tamanho da próxima prova para caber no que você tem hoje." };
  },
};

export const REFLECTION_PRESETS: Record<ReflectionPresetKey, ReflectionPreset> = { esparta, delfos, itaca, prova };

/** Monta o texto gravado nos campos de sempre (fato, sentido, próximo), para o Diário de Bordo e o Oráculo seguirem lendo igual. */
export function summarizeReflection(preset: ReflectionPreset, input: ReflectionSubmit) {
  const labelsFor = (q: ReflectionQuestion) => {
    const opts = q.options(input.answers);
    return (input.answers[q.key] ?? []).map(v => v === OTHER ? (input.nextOther?.trim() || "Outro passo") : opts.find(o => o.value === v)?.label ?? v);
  };
  const byRole = (role: ReflectionQuestion["role"]) => preset.questions.filter(q => q.role === role).map(q => labelsFor(q).join(", ")).filter(Boolean);
  const when = REFLECTION_WHEN.find(o => o.value === input.when)?.label.toLowerCase() ?? "";
  const fact = [byRole("fact").join(". "), input.note?.trim()].filter(Boolean).join(". ");
  const next = byRole("next");
  return { fact: fact.slice(0, 1000), meaning: byRole("meaning").join(". ").slice(0, 1000), next: `${next[next.length - 1] ?? ""}${next.length > 1 ? ` (${next.slice(0, -1).join(", ")})` : ""} - ${when}`.slice(0, 1000) };
}

/** Todas as perguntas respondidas (e "outro" descrito). */
export function reflectionReady(preset: ReflectionPreset, answers: ReflectionAnswers, nextOther: string, when?: ReflectionWhen) {
  return !!when && preset.questions.every(q => (answers[q.key]?.length ?? 0) > 0 && (!answers[q.key]!.includes(OTHER) || !!nextOther.trim()));
}
