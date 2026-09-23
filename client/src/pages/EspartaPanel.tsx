import CourseShelf from "@/components/CourseShelf";
import { useState } from "react";
import { toast } from "sonner";
import { journeyDateKey } from "@shared/journeyDate";
import { forgeDone, forgeMoves, FORGE_XP, toggleForgeMove, type TravessiaArea } from "@shared/travessia";
import { useJourneyStore } from "@/lib/journeyStore";
import EvidenceForm from "@/components/EvidenceForm";
import { ArrowRight, BookOpenCheck, Dumbbell, Flame, Gauge, GraduationCap, Crown, ShieldCheck, Sparkles, Swords, Target } from "lucide-react";

type Destination = "jornada" | "academia";
type Area = { key:string; label:string; score:number; focus:string };
type Mission = { id:string; title:string; done:boolean; xp:number; area:string };
type Journey = { areas?:Area[]; missions?:Mission[]; checkins?:{date:string;energy:number;reflection:string;nextAction:string}[]; cycleGoal?:string; xp?:number };

const disciplines = [
  { key:"profissional", title:"Estratégia em campo", icon:Target, description:"Transforme meta em prioridade, ação observável e evidência.", drills:["Escolha uma meta de 7 dias", "Defina o primeiro gesto de 15 minutos", "Registre o resultado sem justificar"] },
  { key:"pessoal", title:"Ritmo e disciplina", icon:Dumbbell, description:"Construa um ritmo possível mesmo nos dias de pouca energia.", drills:["Proteja um bloco curto na agenda", "Reduza a ação até ficar executável", "Repita antes de aumentar a carga"] },
  { key:"emocional", title:"Presença sob pressão", icon:Gauge, description:"Reconheça o estado interno antes de decidir o próximo passo.", drills:["Nomeie a emoção sem julgamento", "Separe fato de interpretação", "Escolha uma resposta consciente"] },
  { key:"comunidade", title:"Força em formação", icon:ShieldCheck, description:"Aprenda em conjunto e devolva valor para a sua comunidade.", drills:["Peça uma perspectiva honesta", "Compartilhe um aprendizado útil", "Reconheça quem ajudou na travessia"] },
];

export default function EspartaPanel({ onNavigate }: { onNavigate:(view:Destination)=>void }) {
  const store = useJourneyStore();
  const state = store.state as unknown as Journey & { pdi?: { mentor:string; title:string; summary:string; focus:string[]; createdAt:string } };
  const [justFinished, setJustFinished] = useState(false);
  const areas = state.areas || [];
  const weakest = [...areas].sort((a,b)=>a.score-b.score)[0];
  const strongest = [...areas].sort((a,b)=>b.score-a.score)[0];
  const active = disciplines.find(item=>item.key===weakest?.key) || disciplines[0];
  const completed = state.missions?.filter(item=>item.done).length || 0;
  const total = state.missions?.length || 0;
  const logs = state.checkins || [];
  const averageEnergy = logs.length ? (logs.reduce((sum,item)=>sum+item.energy,0)/logs.length).toFixed(1) : "-";
  const readiness = areas.length ? Math.round(areas.reduce((sum,item)=>sum+item.score,0)/areas.length*10) : 0;
  const forgeArea = ((weakest?.key as TravessiaArea) || "pessoal");
  const forge = forgeMoves[forgeArea];
  const today = journeyDateKey();
  const doneMoves = forgeDone(store.state, forgeArea, today);
  const forgeSteps = forge.moves.map((title,index)=>({ title, done:doneMoves.includes(index) }));
  const toggleMove = async (index:number) => {
    try { const next = toggleForgeMove(store.state, { area: forgeArea, index, today }); await store.save(next); const count = forgeDone(next, forgeArea, today).length; setJustFinished(count === 3); if (count === 3) toast.success("Treino completo! +30 XP no dia."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar."); }
  };

  return <div className="space-y-6">
    <section className="relative overflow-hidden rounded-3xl border border-amber-200/20 bg-[#301c16] p-7 text-white shadow-xl md:p-10">
      <div className="absolute inset-x-0 top-0 h-2 bg-[repeating-linear-gradient(90deg,#d8b967_0_16px,transparent_16px_23px,#d8b967_23px_31px,transparent_31px_38px)] opacity-55"/>
      <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full border-[42px] border-red-200/10"/>
      <Swords className="absolute bottom-4 right-8 hidden rotate-[-8deg] text-amber-100/10 md:block" size={190} strokeWidth={.65}/>
      <div className="absolute right-16 top-12 hidden h-24 w-24 place-items-center rounded-full border-2 border-amber-200/25 bg-amber-100/5 md:grid"><Crown size={48} className="text-amber-100/30"/></div>
      <div className="relative max-w-3xl"><span className="inline-flex items-center gap-2 rounded-full border border-amber-100/25 bg-white/5 px-3 py-1 font-mono text-[10px] tracking-[.15em] text-amber-100"><ShieldCheck size={13}/> PORTAL ESPARTA</span><h2 className="mt-5 text-4xl font-semibold tracking-[-.06em] md:text-5xl">Clareza mostra o caminho.<br/>Treino sustenta a travessia.</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-amber-50/70">Esparta lê os sinais da sua Jornada, aponta o território que pede atenção e monta uma Forja prática. Não é diagnóstico clínico: é uma leitura de desenvolvimento baseada no que você registrou.</p><div className="mt-6 flex flex-wrap gap-2"><span className="rounded-full border border-amber-100/20 bg-amber-50/10 px-3 py-1 text-[10px] tracking-[.12em] text-amber-100">AGOGÊ · TREINO</span><span className="rounded-full border border-amber-100/20 bg-amber-50/10 px-3 py-1 text-[10px] tracking-[.12em] text-amber-100">ARETÊ · EXCELÊNCIA</span><span className="rounded-full border border-amber-100/20 bg-amber-50/10 px-3 py-1 text-[10px] tracking-[.12em] text-amber-100">ANDREÍA · CORAGEM</span></div></div>
    </section>

    <section className="grid gap-4 md:grid-cols-3"><article className="rounded-2xl border border-red-100 bg-white p-5"><Flame className="text-red-700"/><p className="mt-4 font-mono text-[10px] tracking-[.1em] text-red-700">TERRITÓRIO DE TREINO</p><b className="mt-1 block text-2xl">{weakest?.label || "Faça a Vida 360"}</b><p className="mt-2 text-sm text-emerald-900/60">{weakest ? `${weakest.score}/10 · ${weakest.focus}` : "Suas notas dão direção à Forja."}</p></article><article className="rounded-2xl border border-amber-100 bg-white p-5"><ShieldCheck className="text-amber-700"/><p className="mt-4 font-mono text-[10px] tracking-[.1em] text-amber-700">FORÇA DE APOIO</p><b className="mt-1 block text-2xl">{strongest?.label || "Ainda não revelada"}</b><p className="mt-2 text-sm text-emerald-900/60">{strongest ? `${strongest.score}/10 · use esta força para apoiar o treino.` : "Avalie suas áreas para reconhecer recursos."}</p></article><article className="rounded-2xl border border-emerald-100 bg-white p-5"><Gauge className="text-emerald-700"/><p className="mt-4 font-mono text-[10px] tracking-[.1em] text-emerald-700">PRONTIDÃO REGISTRADA</p><b className="mt-1 block text-3xl">{readiness}%</b><p className="mt-2 text-sm text-emerald-900/60">energia média {averageEnergy} · {completed}/{total} missões concluídas</p></article></section>
    <CourseShelf area="treino" title="Território de Treino" accent="red" onOpenAcademy={() => onNavigate("academia")}/>

    <section className={`grid gap-4 ${state.pdi ? "lg:grid-cols-[.85fr_1.15fr]" : ""}`}>{state.pdi && <article className="rounded-2xl bg-[#15382f] p-6 text-white"><div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-full bg-amber-200 text-emerald-950"><Crown/></span><div><p className="font-mono text-[10px] tracking-[.12em] text-amber-200">PDI SUGERIDO · POR {state.pdi.mentor.toUpperCase()}</p><h3 className="text-2xl font-semibold">{state.pdi.title}</h3></div></div><p className="mt-5 whitespace-pre-line text-sm leading-7 text-emerald-50/80">{state.pdi.summary}</p>{state.pdi.focus.length > 0 && <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4"><small className="font-mono text-[9px] tracking-[.12em] text-amber-200">FOCOS DO PLANO</small><ul className="mt-2 space-y-2 text-sm leading-6">{state.pdi.focus.map(item=><li key={item} className="flex gap-2"><span className="text-amber-200">◆</span>{item}</li>)}</ul></div>}<p className="mt-4 text-xs text-emerald-100/50">As missões deste plano estão em Minha Jornada e em Ulisses.</p></article>}
    <article className="rounded-2xl border border-red-100 bg-white p-6"><div className="flex items-start justify-between gap-4"><div><p className="font-mono text-[10px] tracking-[.12em] text-red-700">FORJA AUTOMÁTICA</p><h3 className="mt-1 text-2xl font-semibold">{forge.title}: 3 movimentos de hoje</h3><p className="mt-2 text-sm leading-6 text-emerald-900/60">{`Sua área com menor nota é ${weakest?.label || "Pessoal"}. Toque em cada movimento quando cumprir: +${FORGE_XP} XP cada. Renova todo dia.`}</p></div><GraduationCap className="shrink-0 text-red-700" size={30}/></div><div className="mt-5 space-y-3">{forgeSteps.map((step,index)=><button type="button" disabled={store.saving} onClick={()=>toggleMove(index)} key={step.title} aria-pressed={step.done} className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition hover:shadow ${step.done ? "border-emerald-300 bg-emerald-50" : "border-red-100 bg-red-50/40"}`}><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-mono text-sm transition ${step.done ? "bg-emerald-700 text-white" : "bg-red-100 text-red-800"}`}>{step.done ? "✓" : index+1}</span><div className="flex-1"><b className={`text-sm ${step.done ? "text-emerald-900 line-through decoration-emerald-400" : ""}`}>{step.title}</b><p className="mt-1 text-xs leading-5 text-emerald-900/55">{step.done ? `Concluído · +${FORGE_XP} XP` : "Toque para marcar como feito"}</p></div></button>)}</div>{(justFinished || doneMoves.length === 3) && <div className="mt-4 flex items-center gap-3 rounded-xl bg-amber-100 p-3 text-sm font-semibold text-emerald-950"><Sparkles className="animate-bounce text-amber-600"/> Treino completo hoje. Registre abaixo o que aprendeu.</div>}</article></section>

    <section className="grid gap-4 lg:grid-cols-2"><article className="rounded-2xl border border-amber-100 bg-amber-50 p-6"><div className="flex gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-amber-200 text-emerald-950"><Sparkles/></span><div><p className="font-mono text-[10px] tracking-[.12em] text-amber-800">CRITÉRIO DE EVOLUÇÃO</p><h3 className="mt-1 text-xl font-semibold">Evidência antes de intensidade.</h3><p className="mt-2 text-sm leading-7 text-emerald-950/65">Considere o treino concluído quando houver uma ação observável e um registro do que mudou. A Forja orienta, mas não substitui apoio profissional quando ele for necessário.</p></div></div></article><article className="rounded-2xl border border-emerald-100 bg-white p-6"><div className="flex items-center gap-3"><BookOpenCheck className="text-emerald-700"/><div><p className="font-mono text-[10px] tracking-[.12em] text-emerald-700">FECHAR O CICLO</p><h3 className="text-xl font-semibold">Treinar, observar, ajustar.</h3></div></div><p className="mt-4 text-sm leading-7 text-emerald-950/65">Depois do treino, registre no Diário de Bordo o fato, o aprendizado e a próxima ação. Esse registro recalibra a leitura do portal.</p><EvidenceForm tone="red" context={`Treino: ${forge.title}`} button="Registrar evidência do treino" fields={[{label:"O que você fez (fato)?",placeholder:"Ex.: Planejei amanhã e caminhei 20 minutos."},{label:"O que aprendeu?",placeholder:"Ex.: Com a agenda pronta, perco menos tempo de manhã."},{label:"Qual a próxima ação?",placeholder:"Ex.: Amanhã repetir a caminhada às 7h."}]}/></article></section>
  </div>;
}
