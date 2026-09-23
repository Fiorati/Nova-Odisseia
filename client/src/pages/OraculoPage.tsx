import { Compass, Hash, Lock, MoonStar, ScrollText, Sparkles, Sun, Target, Users } from "lucide-react";
import OraculoPanel from "@/components/OraculoPanel";
import MapaAstralPanel from "@/components/MapaAstralPanel";
import { useJourneyStore } from "@/lib/journeyStore";
import { oraculoLimitLabel } from "@shared/oraculo";

const short = (text?: string | null, max = 90) => { const t = (text ?? "").trim(); return t.length > max ? `${t.slice(0, max).trimEnd()}…` : t; };

type Destination = "jornada" | "delfos" | "ulisses" | "esparta";

/** Módulos do Oráculo. A leitura do momento já funciona; os mapas e o DISC entram em seguida, cada um com seu limite. */
const modules = [
  { kind: "mapa_numerologico", title: "Mapa Numerológico", Icon: Hash, text: "Seu nome completo e sua data de nascimento viram números de trabalho para reflexão.", status: "Na fila" },
  { kind: "disc", title: "DISC", Icon: Users, text: "Um questionário curto mostra seu estilo de comportamento no trabalho e como ele conversa com a sua rota.", status: "Na fila" },
] as const;

export default function OraculoPage({ onNavigate }: { onNavigate: (view: Destination) => void }) {
  const { state } = useJourneyStore();
  const areas = state.areas ?? [];
  const weakest = [...areas].sort((a, b) => a.score - b.score)[0];
  const evidences = (state.evidences ?? []).length + (state.checkins ?? []).length;

  return <div className="space-y-6">
    <section className="relative overflow-hidden rounded-3xl border border-amber-200/30 bg-[#16122b] p-7 shadow-xl md:p-10" style={{ color: "#f5f3ff" }}>
      <div className="absolute inset-x-0 top-0 h-2 bg-[repeating-linear-gradient(90deg,#e4cf88_0_13px,transparent_13px_20px,#e4cf88_20px_27px,transparent_27px_34px)] opacity-50" />
      <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full border-[46px] border-amber-200/10" />
      <div className="absolute bottom-6 right-10 hidden items-end gap-3 opacity-25 md:flex">{[0, 1, 2, 3].map(i => <span key={i} className="block w-5 rounded-t-sm bg-gradient-to-b from-amber-100 to-amber-300/40" style={{ height: 120 }} />)}</div>
      <div className="absolute right-16 top-12 hidden h-24 w-24 place-items-center rounded-full border-2 border-amber-200/30 bg-white/5 md:grid"><Sun size={46} color="#fde68a" style={{ opacity: .45 }} /></div>
      <div className="relative max-w-3xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-100/30 bg-white/5 px-3 py-1 font-mono text-[10px] tracking-[.15em]" style={{ color: "#fde68a" }}><MoonStar size={13} /> O ORÁCULO</span>
        <h2 className="mt-5 text-4xl font-semibold tracking-[-.06em] md:text-5xl">A Pítia não dava ordens.<br />Devolvia a pergunta certa.</h2>
        <p className="mt-4 max-w-2xl text-sm leading-7" style={{ color: "rgba(237,233,254,.75)" }}>O Oráculo lê o que você escreveu e o que já registrou na plataforma: Chamado, meta do ciclo, PDI, Vida 360 e evidências. Devolve uma leitura do momento e um plano de 7 dias. Não prevê o futuro e não faz diagnóstico.</p>
        <div className="mt-6 flex flex-wrap gap-2 text-[10px] tracking-[.12em]"><span className="rounded-full border border-amber-100/25 bg-white/5 px-3 py-1" style={{ color: "#fde68a" }}>GNÔTHI SEAUTÓN · CONHECE-TE</span><span className="rounded-full border border-amber-100/25 bg-white/5 px-3 py-1" style={{ color: "#fde68a" }}>MEDÈN ÁGAN · NADA EM EXCESSO</span></div>
      </div>
    </section>

    <section aria-label="Conectado à sua jornada" className="rounded-2xl border border-violet-100 bg-white p-5">
      <p className="font-mono text-[10px] tracking-[.12em] text-violet-700">O QUE O ORÁCULO LÊ DA SUA JORNADA</p>
      <div className="mt-4 grid items-start gap-3 md:grid-cols-4">
        <button type="button" onClick={() => onNavigate("jornada")} className="flex flex-col items-start justify-start rounded-xl bg-violet-50 p-4 text-left align-top hover:bg-violet-100"><Compass size={18} className="text-violet-700" /><small className="mt-2 block font-mono text-[9px] tracking-[.12em] text-violet-700">CHAMADO</small><b className="mt-1 block text-sm leading-5">{short(state.calling) || "Ainda sem Chamado"}</b></button>
        <button type="button" onClick={() => onNavigate("jornada")} className="flex flex-col items-start justify-start rounded-xl bg-violet-50 p-4 text-left align-top hover:bg-violet-100"><Target size={18} className="text-violet-700" /><small className="mt-2 block font-mono text-[9px] tracking-[.12em] text-violet-700">META DO CICLO</small><b className="mt-1 block text-sm leading-5">{short(state.cycleGoal) || "Ainda sem meta"}</b></button>
        <button type="button" onClick={() => onNavigate("esparta")} className="flex flex-col items-start justify-start rounded-xl bg-violet-50 p-4 text-left align-top hover:bg-violet-100"><ScrollText size={18} className="text-violet-700" /><small className="mt-2 block font-mono text-[9px] tracking-[.12em] text-violet-700">PDI</small><b className="mt-1 block text-sm leading-5">{short(state.pdi?.title) || "Sem PDI do mentor"}</b></button>
        <button type="button" onClick={() => onNavigate("jornada")} className="flex flex-col items-start justify-start rounded-xl bg-violet-50 p-4 text-left align-top hover:bg-violet-100"><Sparkles size={18} className="text-violet-700" /><small className="mt-2 block font-mono text-[9px] tracking-[.12em] text-violet-700">VIDA 360 · EVIDÊNCIAS</small><b className="mt-1 block text-sm">{weakest ? `Tensão: ${weakest.label} ${weakest.score}/10` : "Vida 360 vazia"} · {evidences} registro(s)</b></button>
      </div>
    </section>

    <section>
      <p className="font-mono text-[10px] tracking-[.14em] text-violet-700">LEITURA DO MOMENTO · {oraculoLimitLabel("leitura").toUpperCase()}</p>
      <div className="mt-3"><OraculoPanel weakestLabel={weakest ? `${weakest.label} ${weakest.score}/10` : undefined} /></div>
    </section>

    <section aria-label="Outros caminhos do Oráculo">
      <p className="font-mono text-[10px] tracking-[.14em] text-violet-700">OUTROS CAMINHOS DO ORÁCULO</p>
      <div className="mt-3"><MapaAstralPanel /></div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">{modules.map(({ kind, title, Icon, text, status }) => <article key={kind} className="relative overflow-hidden rounded-2xl border border-amber-200/40 bg-[#201a39] p-5" style={{ color: "#f5f3ff" }}>
        <div className="flex items-center justify-between"><span className="grid h-11 w-11 place-items-center rounded-full border border-amber-200/40 bg-white/5"><Icon size={20} color="#fde68a" /></span><span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[10px]" style={{ color: "#fde68a" }}><Lock size={11} /> {status}</span></div>
        <h3 className="mt-4 text-xl font-semibold">{title}</h3>
        <p className="mt-2 text-sm leading-6" style={{ color: "rgba(237,233,254,.7)" }}>{text}</p>
        <p className="mt-4 font-mono text-[10px] tracking-[.12em]" style={{ color: "#e4cf88" }}>LIMITE: {oraculoLimitLabel(kind).toUpperCase()}</p>
      </article>)}</div>
    </section>

    <section className="rounded-2xl border border-violet-200 bg-violet-50 p-6"><p className="font-mono text-[10px] tracking-[.12em] text-violet-800">LIMITE DO ORÁCULO</p><p className="mt-2 text-sm leading-7 text-violet-950/70">Leituras geradas por IA a partir do que você declarou. Símbolos servem para reflexão, não para decidir por você. Se algo pesar demais, procure apoio profissional ou o CVV (188).</p><button type="button" onClick={() => onNavigate("delfos")} className="mt-3 text-sm font-semibold text-violet-800">Voltar ao Delfos para refletir →</button></section>
  </div>;
}
