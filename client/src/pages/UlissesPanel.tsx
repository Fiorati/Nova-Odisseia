import { useState } from "react";
import { BookOpenCheck, Brain, Briefcase, CheckCircle2, Flame, Footprints, HeartPulse, Mountain, ShieldCheck, Sparkles, Target, Trophy, Users } from "lucide-react";
import { toast } from "sonner";
import { journeyDateKey } from "@shared/journeyDate";
import { activeProvaForArea, completeProva, createProva, lastVictory, latestEvidence, PROVA_XP, type TravessiaArea } from "@shared/travessia";
import { useJourneyStore } from "@/lib/journeyStore";

type Destination = "jornada" | "historia";
const areaOptions: { key: TravessiaArea; label: string; Icon: typeof Target; motto: string }[] = [
  { key: "profissional", label: "Profissional", Icon: Briefcase, motto: "Areté · excelência no ofício" },
  { key: "pessoal", label: "Pessoal", Icon: HeartPulse, motto: "Enkráteia · domínio de si" },
  { key: "emocional", label: "Emocional", Icon: Brain, motto: "Sophrosýne · medida e serenidade" },
  { key: "comunidade", label: "Comunidade", Icon: Users, motto: "Philía · laços e contribuição" },
];
const examples: Record<TravessiaArea, string[]> = {
  profissional: ["Ligar para 3 clientes parados da carteira", "Fazer 5 PaP antes das 10h"],
  pessoal: ["Treinar 20 minutos antes do trabalho", "Dormir antes das 23h"],
  emocional: ["Escrever 3 gratidões no fim do dia", "10 minutos de silêncio sem celular"],
  comunidade: ["Ajudar um colega com uma dúvida", "Mandar um agradecimento a quem me ajudou"],
};

export default function UlissesPanel({ onNavigate }: { onNavigate:(view:Destination)=>void }) {
  const { state, save, saving } = useJourneyStore();
  const missions = state.missions || [];
  const pending = missions.filter(item=>!item.done);
  const completed = missions.length - pending.length;
  const progress = missions.length ? Math.round(completed / missions.length * 100) : 0;
  const victory = lastVictory(state);
  const latest = latestEvidence(state);
  const stageReady = state.stage === "Provação" || state.stage === "Maestria" || state.stage === "Retorno";
  const [createArea, setCreateArea] = useState<TravessiaArea | null>(null);
  const [reflectId, setReflectId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const openCreate = (key: TravessiaArea) => { setCreateArea(key); setReflectId(null); setTitle(""); };
  const [fact, setFact] = useState(""); const [meaning, setMeaning] = useState(""); const [nextGesture, setNextGesture] = useState("");
  const [reward, setReward] = useState<{ xp:number; done:number; total:number; streak:number; gainedStreak:boolean } | null>(null);
  const acceptProva = async (area: TravessiaArea) => {
    try { await save(createProva(state, { title, area, today: journeyDateKey() })); setTitle(""); setCreateArea(null); setReward(null); toast.success("Prova aceita. Ela vale até o fim do dia."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível criar a prova."); }
  };
  const finishProva = async (id: string) => {
    try { const result = completeProva(state, { id, today: journeyDateKey(), reflection: { fact, meaning, next: nextGesture } }); await save(result.state); setReward(result.reward); setFact(""); setMeaning(""); setNextGesture(""); setReflectId(null); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível concluir a prova."); }
  };
  const chip = "rounded-full bg-orange-50 px-3 py-1 text-xs text-orange-800";
  const input = "w-full rounded-lg border border-orange-100 bg-white p-3 text-sm";
  return <div className="space-y-6">
    <section className="relative overflow-hidden rounded-3xl border border-amber-200/20 bg-[#3a1d16] p-7 text-white shadow-xl md:p-10"><div className="absolute inset-x-0 top-0 h-2 bg-[repeating-linear-gradient(90deg,#f6d77a_0_14px,transparent_14px_22px,#f6d77a_22px_28px,transparent_28px_36px)] opacity-45"/><div className="absolute -right-20 -top-24 h-80 w-80 rounded-full border-[42px] border-orange-200/10"/><div className="absolute right-14 top-12 hidden h-24 w-24 place-items-center rounded-full border-2 border-amber-200/25 bg-amber-100/5 text-center font-serif text-5xl text-amber-100/25 md:grid">Ω</div><Mountain className="absolute bottom-6 right-10 hidden text-orange-100/10 md:block" size={180} strokeWidth={.7}/><div className="relative max-w-3xl"><span className="inline-flex items-center gap-2 rounded-full border border-orange-100/25 bg-white/5 px-3 py-1 font-mono text-[10px] tracking-[.15em] text-orange-100"><Footprints size={13}/> PORTAL ULISSES</span><h2 className="mt-5 text-4xl font-semibold tracking-[-.06em] md:text-5xl">Coragem não é ausência de medo.<br/>É movimento com sentido.</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-orange-50/70">Transforme a grande travessia em provas possíveis. Ulisses protege sua intenção, mostra o obstáculo atual e pede uma evidência concreta de avanço.</p><div className="mt-6 flex flex-wrap gap-2"><span className="rounded-full border border-amber-100/20 bg-amber-50/10 px-3 py-1 text-[10px] tracking-[.12em] text-amber-100">MÉTIS · ASTÚCIA</span><span className="rounded-full border border-amber-100/20 bg-amber-50/10 px-3 py-1 text-[10px] tracking-[.12em] text-amber-100">THYMÓS · CORAGEM</span><span className="rounded-full border border-amber-100/20 bg-amber-50/10 px-3 py-1 text-[10px] tracking-[.12em] text-amber-100">NÓSTOS · RETORNO</span></div></div></section>

    {reward && <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-100 to-orange-50 p-5 text-emerald-950 shadow"><span className="grid h-12 w-12 place-items-center rounded-full bg-amber-300"><Trophy className="animate-bounce text-emerald-950"/></span><div><p className="font-mono text-[10px] tracking-[.12em] text-orange-800">PROVA VENCIDA</p><b className="text-lg">+{reward.xp} XP · Provas {reward.done}/{reward.total} · Ritmo {reward.streak} dia(s){reward.gainedStreak ? " (+1)" : ""}</b><p className="text-xs text-emerald-900/65">Registrado no Diário de Bordo. A próxima prova já pode ser escolhida.</p></div><button type="button" onClick={()=>{setReward(null);}} className="ml-auto rounded-lg bg-[#3a1d16] px-4 py-2 text-sm font-semibold text-amber-100" style={{color:"#fef3c7"}}>Ok, seguir</button></section>}

    <section className="rounded-2xl border border-orange-100 bg-white p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-[10px] tracking-[.12em] text-orange-700">PROVAS DA TRAVESSIA · UMA POR ÁREA DA VIDA 360</p><h3 className="mt-1 text-2xl font-semibold">Quatro frentes, uma prova em cada.</h3><p className="mt-1 text-sm text-emerald-950/60">Crie a sua própria prova em cada área. A prova que você cria vale {PROVA_XP} XP quando você conta o que aconteceu.</p></div><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-orange-100 text-orange-800"><Flame/></span></div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">{areaOptions.map(({ key, label, Icon, motto })=>{ const trial = activeProvaForArea(state, key); const creating = createArea === key; const reflecting = trial && reflectId === trial.id; return <article key={key} className={`rounded-2xl border p-5 ${creating || reflecting ? "border-orange-300 ring-2 ring-orange-200" : trial ? "border-orange-200 bg-orange-50/40" : "border-dashed border-orange-200"}`}>
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#3a1d16]" style={{color:"#fde68a"}}><Icon size={18} color="#fde68a"/></span><div><p className="font-mono text-[10px] tracking-[.12em] text-orange-700">{label.toUpperCase()}</p><small className="text-xs text-emerald-900/55">{motto}</small></div></div>
        {trial && !creating ? <>
          <p className="mt-4 font-mono text-[9px] tracking-[.12em] text-orange-700">{trial.kind === "prova" ? "PROVA ATUAL" : "MISSÃO DA JORNADA"}</p>
          <h4 className="mt-1 text-lg font-semibold leading-6">{trial.title}</h4>
          <p className="mt-2 text-sm leading-6 text-emerald-950/65">Vale {trial.xp} XP. Cumpra a ação e depois conte o que aconteceu: é isso que vira evidência.</p>
          <div className="mt-3 flex flex-wrap gap-2"><span className={chip}>{trial.kind === "prova" ? "prazo: hoje" : "missão da jornada"}</span><span className={chip}>+{trial.xp} XP</span></div>
          {reflecting ? <div className="mt-4 space-y-3 text-sm">
            <label className="grid gap-1 font-semibold">1. O que aconteceu?<textarea rows={2} className={input} value={fact} onChange={e=>setFact(e.target.value)} placeholder="Só fatos. Ex.: Liguei para 3; 1 cliente voltou a pedir."/></label>
            <label className="grid gap-1 font-semibold">2. O que isso revela?<textarea rows={2} className={input} value={meaning} onChange={e=>setMeaning(e.target.value)} placeholder="Padrão, força ou limite."/></label>
            <label className="grid gap-1 font-semibold">3. Qual é o próximo gesto?<textarea rows={2} className={input} value={nextGesture} onChange={e=>setNextGesture(e.target.value)} placeholder="Ação pequena com quando."/></label>
            <div className="flex items-center gap-3"><button type="button" disabled={saving || !fact.trim()} onClick={()=>finishProva(trial.id)} className="inline-flex items-center gap-2 rounded-lg bg-[#0e3426] px-4 py-2 font-semibold text-white disabled:opacity-50" style={{color:"#ffffff"}}><Sparkles size={16}/>{saving ? "Salvando..." : `Registrar e ganhar ${trial.xp} XP`}</button><button type="button" onClick={()=>setReflectId(null)} className="text-xs text-emerald-900/60">Voltar</button></div>
          </div> : <div className="mt-4 flex flex-wrap items-center gap-3"><button type="button" onClick={()=>{setReflectId(trial.id);setCreateArea(null);}} className="inline-flex items-center gap-2 rounded-lg bg-[#3a1d16] px-4 py-2 text-sm font-semibold" style={{color:"#fef3c7"}}><CheckCircle2 size={16}/> Concluir prova</button>{trial.kind !== "prova" && <button type="button" onClick={()=>openCreate(key)} className="text-xs font-semibold text-orange-800">+ Criar minha prova nesta área</button>}</div>}
        </> : creating ? <div className="mt-4 space-y-3">
          <label className="grid gap-1 text-sm font-semibold">Qual ação você vai cumprir hoje?<input className={input} value={title} maxLength={300} onChange={e=>setTitle(e.target.value)} placeholder={examples[key][0]}/><span className="text-xs font-normal text-emerald-900/55">Uma ação que alguém conseguiria ver acontecendo.</span></label>
          <div className="flex flex-wrap gap-2">{examples[key].map(item=><button type="button" key={item} onClick={()=>setTitle(item)} className="rounded-full border border-orange-200 px-3 py-1 text-xs text-orange-800 hover:bg-orange-50">{item}</button>)}</div>
          <p className="text-xs text-emerald-900/60">Área <b>{label}</b> · prazo <b>hoje, até o fim do dia</b> · vale <b>{PROVA_XP} XP</b></p>
          <div className="flex items-center gap-3"><button type="button" disabled={saving || !title.trim()} onClick={()=>acceptProva(key)} className="rounded-lg bg-[#3a1d16] px-4 py-2 text-sm font-semibold disabled:opacity-50" style={{color:"#fef3c7"}}>{saving ? "Salvando..." : "Aceitar a prova"}</button><button type="button" onClick={()=>setCreateArea(null)} className="text-xs text-emerald-900/60">Cancelar</button></div>
        </div> : <>
          <p className="mt-4 text-sm leading-6 text-emerald-950/60">Nenhuma prova nesta área. Uma boa prova é pequena o bastante para começar e importante o bastante para mudar sua direção.</p>
          <button type="button" onClick={()=>openCreate(key)} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#3a1d16] px-4 py-2 text-sm font-semibold" style={{color:"#fef3c7"}}><Target size={16}/> Criar prova {label.toLowerCase()}</button>
        </>}
      </article>; })}</div>
    </section>

    <section><article className="rounded-2xl bg-[#173c32] p-6 text-white"><p className="font-mono text-[10px] tracking-[.12em] text-lime-200">ESCUDO DE INTENÇÃO</p><ShieldCheck className="mt-4 text-lime-200" size={34}/><p className="mt-4 text-xs uppercase tracking-[.12em] text-emerald-100/55">Por que atravessar?</p><b className="mt-2 block text-xl leading-7">{state.calling || "Dê nome ao seu Chamado para lembrar por que esta prova importa."}</b><p className="mt-5 text-sm leading-6 text-emerald-50/65">{state.cycleGoal ? `Meta do ciclo: ${state.cycleGoal}` : "Sua meta de 30 dias funciona como critério para dizer sim ou não ao que aparece no caminho."}</p></article></section>

    <section className="grid gap-4 md:grid-cols-3"><article className="rounded-2xl border border-orange-100 bg-white p-5"><Target className="text-orange-700"/><p className="mt-4 font-mono text-[10px] tracking-[.1em] text-orange-700">PROVAS CONCLUÍDAS</p><b className="mt-1 block text-3xl">{completed}/{missions.length}</b><div className="mt-3 h-2 overflow-hidden rounded-full bg-orange-50"><div className="h-full rounded-full bg-orange-500" style={{width:`${progress}%`}}/></div><p className="mt-2 text-xs text-emerald-900/55">{progress}% da travessia atual</p></article><article className="rounded-2xl border border-amber-100 bg-white p-5"><Sparkles className="text-amber-700"/><p className="mt-4 font-mono text-[10px] tracking-[.1em] text-amber-700">CORAGEM ACUMULADA</p><b className="mt-1 block text-3xl">{state.xp || 0} XP</b><p className="mt-2 text-sm text-emerald-900/60">experiência convertida em repertório</p></article><article className="rounded-2xl border border-emerald-100 bg-white p-5"><CheckCircle2 className="text-emerald-700"/><p className="mt-4 font-mono text-[10px] tracking-[.1em] text-emerald-700">RITMO PROTEGIDO</p><b className="mt-1 block text-3xl">{state.streak || 0} dia(s)</b><p className="mt-2 text-sm text-emerald-900/60">de retorno consciente à jornada</p></article></section>

    <section className="grid gap-4 lg:grid-cols-2"><article className={`rounded-2xl border bg-white p-6 border-emerald-100`}><div className="flex items-center gap-3"><Brain className="text-emerald-700"/><div><p className="font-mono text-[10px] tracking-[.1em] text-emerald-700">DEPOIS DA PROVA</p><h3 className="text-xl font-semibold">Converter experiência em aprendizado</h3></div></div>
      {victory?.reflection ? <div className="mt-5 grid gap-3 text-sm"><p className="font-mono text-[9px] tracking-[.12em] text-emerald-700">ÚLTIMA PROVA VENCIDA · {victory.title}</p><div className="rounded-xl bg-[#f4f3ec] p-4"><b>O que aconteceu</b><p className="mt-1 text-emerald-900/70">{victory.reflection.fact}</p></div>{victory.reflection.meaning && <div className="rounded-xl bg-[#f4f3ec] p-4"><b>O que revelou</b><p className="mt-1 text-emerald-900/70">{victory.reflection.meaning}</p></div>}{victory.reflection.next && <div className="rounded-xl bg-[#f4f3ec] p-4"><b>Próximo gesto</b><p className="mt-1 text-emerald-900/70">{victory.reflection.next}</p></div>}</div>
      : <div className="mt-5 grid gap-3 text-sm"><div className="rounded-xl bg-[#f4f3ec] p-4"><b>1. O que aconteceu?</b><p className="mt-1 text-emerald-900/60">Registre fatos, sem julgamento.</p></div><div className="rounded-xl bg-[#f4f3ec] p-4"><b>2. O que isso revela?</b><p className="mt-1 text-emerald-900/60">Nomeie padrão, força ou limite.</p></div><div className="rounded-xl bg-[#f4f3ec] p-4"><b>3. Qual é o próximo gesto?</b><p className="mt-1 text-emerald-900/60">Ajuste a rota com uma ação pequena.</p></div><p className="flex items-center gap-2 text-xs text-emerald-900/55"><BookOpenCheck size={14}/> Estas perguntas abrem no card da área quando você tocar em "Concluir prova".</p></div>}
    </article><article className="rounded-2xl border border-sky-100 bg-sky-50 p-6"><p className="font-mono text-[10px] tracking-[.12em] text-sky-800">LEITURA DO MOMENTO</p><h3 className="mt-2 text-xl font-semibold">{stageReady ? "Você já entrou na travessia." : "Você está preparando a partida."}</h3><p className="mt-3 text-sm leading-7 text-emerald-950/65">{latest?.text ? `Última evidência: ${latest.text}` : "Ainda não há uma evidência registrada. A primeira prova não precisa ser perfeita: basta cumprir e dizer o que aconteceu."}</p>{latest?.next && <div className="mt-4 rounded-xl bg-white p-4"><small className="font-mono text-[9px] tracking-[.1em] text-sky-700">PRÓXIMA AÇÃO DECLARADA</small><b className="mt-2 block">{latest.next}</b></div>}<button onClick={()=>onNavigate("historia")} className="mt-5 text-sm font-semibold text-sky-800">Entender Ulisses na sua História →</button></article></section>
  </div>;
}
