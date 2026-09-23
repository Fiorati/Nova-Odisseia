import { trpc } from "@/lib/trpc";
import OraculoPanel from "@/components/OraculoPanel";
import { ArrowRight, BookOpen, Eye, Flame, Lightbulb, MoonStar, Scale, ScrollText, Sparkles, Sun, Waves } from "lucide-react";

type Destination = "jornada" | "historia";
type Area = { key:string; label:string; score:number; focus:string };
type Checkin = { date:string; energy:number; reflection:string; nextAction:string };
type Journey = { calling?:string; cycleGoal?:string; stage?:string; areas?:Area[]; checkins?:Checkin[]; missions?:{done:boolean}[] };

const questions = [
  "Que verdade você já percebeu, mas ainda não transformou em escolha?",
  "O que merece continuar igual na sua rota?",
  "Qual ruído precisa baixar para você ouvir o essencial?",
];

export default function DelfosPanel({ onNavigate }: { onNavigate:(view:Destination)=>void }) {
  const journey = trpc.agent.journey.useQuery();
  const state = (journey.data?.state || {}) as Journey;
  const areas = state.areas || [];
  const checkins = state.checkins || [];
  const weakest = [...areas].sort((a,b)=>a.score-b.score)[0];
  const latest = checkins[0];
  const completed = state.missions?.filter(item=>item.done).length || 0;
  const lens = latest?.energy && latest.energy <= 2 ? "Recolher antes de decidir" : latest?.energy && latest.energy >= 4 ? "Usar a energia com direção" : "Separar sinal de ruído";
  return <div className="space-y-6">
    <section className="relative overflow-hidden rounded-3xl border border-violet-200/20 bg-[#201a39] p-7 text-white shadow-xl md:p-10"><div className="absolute inset-x-0 top-0 h-2 bg-[repeating-linear-gradient(90deg,#e4cf88_0_13px,transparent_13px_20px,#e4cf88_20px_27px,transparent_27px_34px)] opacity-45"/><div className="absolute -right-20 -top-24 h-80 w-80 rounded-full border-[42px] border-violet-200/10"/><Eye className="absolute bottom-7 right-12 hidden text-violet-100/10 md:block" size={180} strokeWidth={.6}/><div className="absolute right-16 top-12 hidden h-24 w-24 place-items-center rounded-full border-2 border-amber-200/20 bg-white/5 md:grid"><Sun size={48} className="text-amber-100/25"/></div><div className="relative max-w-3xl"><span className="inline-flex items-center gap-2 rounded-full border border-violet-100/25 bg-white/5 px-3 py-1 font-mono text-[10px] tracking-[.15em] text-violet-100"><MoonStar size={13}/> PORTAL DELFOS</span><h2 className="mt-5 text-4xl font-semibold tracking-[-.06em] md:text-5xl">Antes de buscar respostas,<br/>aprenda a fazer silêncio.</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-violet-50/70">Delfos organiza os sinais que você mesmo registrou e devolve perguntas para reflexão. Não prevê o futuro, não lê destino e não substitui aconselhamento profissional.</p><div className="mt-6 flex flex-wrap gap-2"><span className="rounded-full border border-violet-100/20 bg-white/5 px-3 py-1 text-[10px] tracking-[.12em] text-violet-100">GNÔTHI SEAUTÓN · CONHECE-TE</span><span className="rounded-full border border-violet-100/20 bg-white/5 px-3 py-1 text-[10px] tracking-[.12em] text-violet-100">MÉTRON · MEDIDA</span></div></div></section>

    <section className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]"><article className="rounded-2xl border border-violet-100 bg-white p-6"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-full bg-violet-100 text-violet-800"><ScrollText/></span><div><p className="font-mono text-[10px] tracking-[.12em] text-violet-700">INSCRIÇÃO DO TEMPLO</p><h3 className="text-2xl font-semibold">Conhece-te a ti mesmo.</h3></div></div><p className="mt-5 text-sm leading-7 text-emerald-950/65">Seu Chamado funciona como hipótese de direção, não como sentença. Compare o que você declarou com as evidências dos últimos dias.</p><div className="mt-5 rounded-xl bg-violet-50 p-5"><small className="font-mono text-[9px] tracking-[.12em] text-violet-700">SEU CHAMADO</small><b className="mt-2 block text-lg leading-7">{state.calling || "Ainda sem uma frase declarada."}</b></div><button onClick={()=>onNavigate("jornada")} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-violet-800">Revisar meu norte <ArrowRight size={16}/></button></article><article className="rounded-2xl bg-[#15382f] p-6 text-white"><p className="font-mono text-[10px] tracking-[.12em] text-amber-200">LEITURA DO MOMENTO</p><Scale className="mt-5 text-amber-200" size={34}/><h3 className="mt-4 text-2xl font-semibold">{lens}</h3><p className="mt-3 text-sm leading-7 text-emerald-50/70">{latest ? `Seu registro mais recente marcou energia ${latest.energy}/5. Use isso como contexto, não como rótulo.` : "Faça um check-in para que esta leitura use evidências da sua própria jornada."}</p><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-white/5 p-4"><small className="text-emerald-100/55">Etapa</small><b className="mt-1 block">{state.stage || "Chamado"}</b></div><div className="rounded-xl bg-white/5 p-4"><small className="text-emerald-100/55">Ações concluídas</small><b className="mt-1 block">{completed}</b></div></div></article></section>

    <OraculoPanel weakestLabel={weakest ? `${weakest.label} ${weakest.score}/10` : undefined}/>
    {weakest && <p className="-mt-2 text-xs text-emerald-900/60">Tensão: {weakest.focus}. <button onClick={()=>onNavigate("jornada")} className="font-semibold text-emerald-800">Atualizar Vida 360 →</button></p>}

    <section className="rounded-2xl border border-violet-200 bg-violet-50 p-6"><p className="font-mono text-[10px] tracking-[.12em] text-violet-800">LIMITE DO ORÁCULO</p><p className="mt-2 text-sm leading-7 text-violet-950/70">Este portal trabalha apenas com dados declarados por você e perguntas transparentes. Astrologia, numerologia, DISC e Ilhas da Travessia entram somente depois de pesquisa, regras explícitas e validação própria.</p><button onClick={()=>onNavigate("historia")} className="mt-3 text-sm font-semibold text-violet-800">Ver símbolos na História, sem tratá-los como previsão →</button></section>
  </div>;
}
