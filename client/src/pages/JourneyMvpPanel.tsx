import { dayCounted } from "@shared/travessia";
import { JOURNEY_CHECKIN_LIMIT, journeyDateKey } from "@shared/journeyDate";
import { useEffect, useMemo, useState } from "react";
import { Activity, BookHeart, BriefcaseBusiness, CheckCircle2, ChevronRight, Compass, HeartPulse, Home, Save, Sparkles, Target, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import SentenceWizard from "@/components/SentenceWizard";
import JornadaPdfButton from "@/components/JornadaPdfButton";
import { CHAMADO_FLOW, META_FLOW } from "@shared/goalFlow";
import CheckinWizard, { type CheckinSubmit } from "@/components/CheckinWizard";
import { MOOD_OPTIONS, type CheckinDetail } from "@shared/checkinFlow";

type AreaKey = "profissional" | "pessoal" | "emocional" | "comunidade";
type Area = { key: AreaKey; label: string; score: number; focus: string };
type Mission = { id: string; title: string; area: AreaKey; done: boolean; xp: number };
type Checkin = { date: string; energy: number; reflection: string; nextAction: string; detail?: CheckinDetail };
type JourneyState = { calling: string; cycleGoal: string; stage: "Chamado" | "Provação" | "Maestria" | "Retorno"; xp: number; streak: number; areas: Area[]; missions: Mission[]; checkins: Checkin[] };

const defaults: JourneyState = {
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
  ], checkins: [],
};

const areaIcons = { profissional: BriefcaseBusiness, pessoal: Home, emocional: HeartPulse, comunidade: Users };
const stageForXp = (xp: number): JourneyState["stage"] => xp >= 3500 ? "Retorno" : xp >= 1500 ? "Maestria" : xp >= 500 ? "Provação" : "Chamado";
const nextStage = (stage: JourneyState["stage"]) => ({ Chamado: 500, Provação: 1500, Maestria: 3500, Retorno: 5000 }[stage]);

export default function JourneyMvpPanel({ userId }: { userId: number }) {
  const key = `nova-odisseia-journey-v1-${userId}`;
  const journey = trpc.agent.journey.useQuery();
  const utils = trpc.useUtils();
  const [state, setState] = useState<JourneyState>(() => { try { return JSON.parse(localStorage.getItem(key) || "null") || defaults; } catch { return defaults; } });
  const [hydratedFromServer, setHydratedFromServer] = useState(false);
  useEffect(() => {
    if (journey.isFetched && !hydratedFromServer) {
      if (journey.data?.state) setState(journey.data.state as JourneyState);
      setHydratedFromServer(true);
    }
  }, [journey.data, journey.isFetched, hydratedFromServer]);
  const saveMutation = trpc.agent.saveJourney.useMutation({
    onSuccess: async () => { await utils.agent.journey.invalidate(); },
    onError: error => toast.error(`Não foi possível salvar na conta: ${error.message}`),
  });
  const today = journeyDateKey();
  const savedToday = state.checkins.find(item => item.date === today);
  useEffect(() => localStorage.setItem(key, JSON.stringify(state)), [key, state]);
  const completed = state.missions.filter(m => m.done).length;
  const progress = Math.min(100, Math.round((state.xp / nextStage(state.stage)) * 100));
  const balance = useMemo(() => Math.round(state.areas.reduce((sum, area) => sum + area.score, 0) / state.areas.length * 10), [state.areas]);
  const [editing, setEditing] = useState<"calling" | "goal" | null>(null);
  const update = (patch: Partial<JourneyState>) => setState(current => ({ ...current, ...patch }));
  const saveJourney = async (label: string, nextState: JourneyState = state) => {
    localStorage.setItem(key, JSON.stringify(nextState));
    await saveMutation.mutateAsync(nextState);
    toast.success(`${label} salvo na sua conta.`);
  };
  const toggleMission = (id: string) => setState(current => { const mission = current.missions.find(item => item.id === id); if (!mission) return current; const nowDone = !mission.done; const xp = Math.max(0, current.xp + (nowDone ? mission.xp : -mission.xp)); return { ...current, xp, stage: stageForXp(xp), missions: current.missions.map(item => item.id === id ? { ...item, done: nowDone } : item) }; });
  const saveCheckin = async ({ energy, reflection, nextAction, detail }: CheckinSubmit) => { const today = journeyDateKey(); const prior = state.checkins.some(item => item.date === today); const xp = state.xp + (prior ? 0 : 10); const nextState = { ...state, xp, stage: stageForXp(xp), streak: dayCounted(state as never, today) ? state.streak : state.streak + 1, checkins: [{ date: today, energy, reflection: reflection.trim(), nextAction: nextAction.trim(), detail }, ...state.checkins.filter(item => item.date !== today)].slice(0,JOURNEY_CHECKIN_LIMIT) }; setState(nextState); await saveJourney("Check-in", nextState); };
  return <div className="space-y-6">
    <section className="overflow-hidden rounded-2xl bg-[#002b1d] p-6 text-white md:p-8"><div className="grid gap-6 lg:grid-cols-[1.4fr_.6fr]"><div><p className="font-mono text-[10px] tracking-[.16em] text-lime-200">NOVA ODISSEIA · A SUA JORNADA DO HERÓI</p><h2 className="mt-3 text-3xl font-semibold tracking-[-.055em] md:text-4xl">A vida inteira cabe numa direção.</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-emerald-100/75">Transforme intenção em ritual, ritual em evidência e evidência em evolução. Comece pequeno. Volte sempre.</p><div className="mt-6"><p className="text-xs text-emerald-100/80">Seu Chamado</p>{editing === "calling" ? <div className="mt-2 rounded-xl bg-white p-4 text-emerald-950"><SentenceWizard flow={CHAMADO_FLOW} submitLabel="Salvar Chamado" saving={saveMutation.isPending} onCancel={() => setEditing(null)} onSubmit={async text => { const nextState = { ...state, calling: text }; setState(nextState); await saveJourney("Chamado", nextState); setEditing(null); }}/></div> : <><b className="mt-2 block text-lg leading-7 text-amber-100">{state.calling || "Ainda sem Chamado definido."}</b><Button type="button" onClick={() => setEditing("calling")} className="mt-3 bg-amber-200 text-emerald-950 hover:bg-amber-100"><Compass size={16}/> {state.calling ? "Redefinir Chamado" : "Definir meu Chamado"}</Button></>}</div></div><div className="rounded-xl border border-white/15 bg-white/5 p-5"><p className="font-mono text-[10px] tracking-[.12em] text-lime-200">ETAPA ATUAL</p><div className="mt-3 flex items-center gap-3"><Compass className="text-lime-200"/><b className="text-2xl">{state.stage}</b></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-lime-300" style={{width:`${progress}%`}} /></div><div className="mt-2 flex justify-between text-xs text-emerald-100/65"><span>{state.xp} XP</span><span>{nextStage(state.stage)} XP</span></div><p className="mt-4 text-xs text-emerald-100/70">{state.streak} dia(s) de retorno consciente</p></div></div></section>
    <JornadaPdfButton />
    <section className="grid gap-4 md:grid-cols-4">{state.areas.map(area => { const Icon=areaIcons[area.key]; return <article key={area.key} className="rounded-xl border border-emerald-100 bg-white p-5"><div className="flex items-center justify-between"><span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><Icon size={18}/></span><b className="font-mono text-2xl text-emerald-900">{area.score}</b></div><h3 className="mt-4 font-semibold">{area.label}</h3><p className="mt-1 min-h-10 text-xs leading-5 text-emerald-800/60">{area.focus}</p><input aria-label={`Nota ${area.label}`} className="mt-4 w-full accent-emerald-700" type="range" min="1" max="10" value={area.score} onChange={e => update({ areas: state.areas.map(item => item.key === area.key ? {...item, score:Number(e.target.value)} : item) })}/></article>})}<div className="md:col-span-4"><Button type="button" onClick={() => saveJourney("Vida 360")} className="w-full bg-[#0e3426]"><Save size={16}/> Salvar notas da Vida 360</Button></div></section>
    <section className="grid gap-4 lg:grid-cols-[1.05fr_.95fr]"><article className="rounded-xl border border-emerald-100 bg-white p-5"><div className="flex items-start justify-between"><div><p className="font-mono text-[10px] tracking-[.12em] text-emerald-600">MISSÕES DA SEMANA</p><h3 className="mt-1 text-xl font-semibold">Atravessar é agir.</h3></div><span className="rounded-full bg-lime-100 px-3 py-1 text-xs font-semibold">{completed}/{state.missions.length}</span></div><div className="mt-5 space-y-2">{state.missions.map(mission => <button type="button" onClick={()=>toggleMission(mission.id)} key={mission.id} className={`flex w-full items-center gap-3 rounded-lg border p-4 text-left ${mission.done ? "border-lime-300 bg-lime-50" : "border-emerald-100"}`}><CheckCircle2 size={19} className={mission.done ? "text-emerald-700" : "text-emerald-200"}/><span className="flex-1"><b className="block text-sm">{mission.title}</b><small className="text-emerald-700/55">{mission.area}</small></span><span className="font-mono text-xs text-emerald-700">+{mission.xp} XP</span></button>)}</div><Button type="button" onClick={() => saveJourney("Missões")} className="mt-4 w-full bg-[#0e3426]"><Save size={16}/> Salvar missões</Button></article>
    <article className="rounded-xl border border-emerald-100 bg-white p-5"><p className="font-mono text-[10px] tracking-[.12em] text-emerald-600">CHECK-IN DE HOJE</p><h3 className="mt-1 text-xl font-semibold">Pausa. Presença. Próximo passo.</h3><p className="mt-1 text-xs text-emerald-800/60">{savedToday ? "Check-in de hoje salvo. Pode refazer se algo mudou." : "Seis toques, menos de um minuto."}</p><div className="mt-4"><CheckinWizard key={savedToday?.date ?? "novo"} initial={savedToday} saving={saveMutation.isPending} onSubmit={saveCheckin}/></div></article></section>
    <section className="rounded-xl border border-emerald-100 bg-white p-5"><div className="flex items-start justify-between gap-4"><div><p className="font-mono text-[10px] tracking-[.12em] text-emerald-600">DIÁRIO DE BORDO</p><h3 className="mt-1 text-xl font-semibold">O que você registrou.</h3></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">{state.checkins.length} registro(s)</span></div><div className="mt-5 space-y-3">{state.checkins.length ? state.checkins.slice(0,7).map(item => <article key={item.date} className="rounded-lg border border-emerald-100 bg-[#f7f8f3] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><b className="text-sm">{new Date(`${item.date}T12:00:00`).toLocaleDateString("pt-BR", {day:"2-digit", month:"long", year:"numeric"})}</b><span className="font-mono text-xs text-emerald-700">{item.detail ? `${MOOD_OPTIONS.find(o => o.value === item.detail!.mood)?.label.toUpperCase()} · ` : ""}ENERGIA {item.energy}/5</span></div><div className="mt-3 grid gap-3 md:grid-cols-2"><div><small className="font-mono text-[9px] tracking-[.1em] text-emerald-600">O QUE PERCEBI</small><p className="mt-1 text-sm leading-6 text-emerald-950">{item.reflection}</p></div><div><small className="font-mono text-[9px] tracking-[.1em] text-emerald-600">PRÓXIMA AÇÃO</small><p className="mt-1 text-sm leading-6 text-emerald-950">{item.nextAction}</p></div></div></article>) : <p className="rounded-lg bg-[#f7f8f3] p-4 text-sm text-emerald-800/60">Seu primeiro check-in aparecerá aqui, completo.</p>}</div></section>
    {((state as unknown as { evidences?: { date:string; context:string; fact:string; meaning:string; next:string }[] }).evidences?.length ?? 0) > 0 && <section className="rounded-xl border border-emerald-100 bg-white p-5"><p className="font-mono text-[10px] tracking-[.12em] text-emerald-600">DIÁRIO DE BORDO · EVIDÊNCIAS DAS PROVAS E TREINOS</p><div className="mt-4 space-y-3">{(state as unknown as { evidences: { date:string; context:string; fact:string; meaning:string; next:string }[] }).evidences.slice(0,7).map((item,index)=><article key={`${item.date}-${index}`} className="rounded-lg border border-emerald-100 bg-[#f7f8f3] p-4 text-sm"><div className="flex flex-wrap justify-between gap-2"><b>{item.context}</b><span className="text-xs text-emerald-700/60">{item.date.split("-").reverse().join("/")}</span></div><p className="mt-2">{item.fact}</p>{item.meaning && <p className="mt-1 text-emerald-900/65">{item.meaning}</p>}{item.next && <p className="mt-2 text-xs font-semibold text-emerald-800">Próximo: {item.next}</p>}</article>)}</div></section>}
    <section className="grid gap-4 md:grid-cols-3"><article className="rounded-xl border border-emerald-100 bg-white p-5"><Activity className="text-emerald-600"/><p className="mt-3 text-xs text-emerald-700/60">EQUILÍBRIO VIDA 360</p><b className="mt-1 block text-3xl">{balance}%</b></article><article className="rounded-xl border border-emerald-100 bg-white p-5"><Target className="text-emerald-600"/><p className="mt-3 text-xs text-emerald-700/60">META DO CICLO</p>{editing === "goal" ? <div className="mt-3"><SentenceWizard flow={META_FLOW} submitLabel="Salvar meta" saving={saveMutation.isPending} onCancel={() => setEditing(null)} onSubmit={async text => { const nextState = { ...state, cycleGoal: text }; setState(nextState); await saveJourney("Meta do ciclo", nextState); setEditing(null); }}/></div> : <><p className="mt-2 text-sm font-semibold leading-6">{state.cycleGoal || "Ainda sem meta para os próximos 30 dias."}</p><Button type="button" onClick={() => setEditing("goal")} className="mt-3 w-full bg-[#0e3426]"><Target size={16}/> {state.cycleGoal ? "Redefinir meta" : "Definir meta"}</Button></>}</article><article className="rounded-xl border border-emerald-100 bg-white p-5"><Trophy className="text-amber-500"/><p className="mt-3 text-xs text-emerald-700/60">EVIDÊNCIAS</p><b className="mt-1 block text-3xl">{state.checkins.length}</b><p className="mt-1 text-xs text-emerald-700/60">check-ins salvos na sua conta</p></article></section>
    <section className="rounded-xl border border-lime-300 bg-lime-50 p-5"><div className="flex gap-3"><BookHeart className="shrink-0 text-emerald-700"/><div><b>O piloto começa com você.</b><p className="mt-1 text-sm leading-6 text-emerald-900/70">Esta primeira camada reúne Chamado, Vida 360, missões, check-in e evolução. Sua jornada salva na sua conta e acompanha você em qualquer dispositivo. Use os botões Salvar depois de cada alteração.</p></div><ChevronRight className="ml-auto shrink-0 text-emerald-700"/></div></section>
  </div>;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               }
