import { trpc } from "@/lib/trpc";
import { ORACULO_MIN_ANSWERS, answeredCount, formatDateKeyBR, oraculoPrompts, type OraculoAnswers, type OraculoKey } from "@shared/oraculo";
import { CheckCircle2, Flame, Lightbulb, Lock, MoonStar, Save, Sparkles, Waves } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const empty: OraculoAnswers = { verdade: "", manter: "", ruido: "", fato: "", sentido: "", escolha: "", tensao: "" };
const placeholders: Record<OraculoKey, string> = {
  verdade: "Ex.: Sei que preciso ligar antes das 10h, mas ainda deixo para depois.",
  manter: "Ex.: Meu jeito de criar rapport com o dono da loja.",
  ruido: "Ex.: Comparar meus números com os do time todo dia.",
  fato: "Ex.: Fiz 3 visitas e só 1 conversa foi com o decisor.",
  sentido: "Ex.: Estou gastando energia em quem não decide.",
  escolha: "Ex.: Amanhã pergunto na porta quem decide antes de apresentar.",
  tensao: "Ex.: Depende de mim dormir cedo; o financeiro precisa de tempo.",
};

function Field({ k, value, onChange, disabled }: { k: OraculoKey; value: string; onChange: (v: string) => void; disabled: boolean }) {
  const prompt = oraculoPrompts.find(item => item.key === k)!;
  return <label className="block text-sm"><span className="font-semibold leading-6 text-emerald-950">{prompt.label}</span>
    <textarea aria-label={prompt.label} disabled={disabled} value={value} onChange={e => onChange(e.target.value)} rows={3} maxLength={2000} placeholder={placeholders[k]} className="mt-2 w-full rounded-xl border border-violet-100 bg-white p-3 text-sm leading-6 outline-none focus:border-violet-400 disabled:bg-violet-50/50" style={{ color: "#052e16" }} /></label>;
}

export default function OraculoPanel({ weakestLabel }: { weakestLabel?: string }) {
  const utils = trpc.useUtils();
  const oraculo = trpc.oraculo.get.useQuery(undefined, { retry: false });
  const [answers, setAnswers] = useState<OraculoAnswers>(empty);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { if (oraculo.data && !hydrated) { if (oraculo.data.draft) setAnswers({ ...empty, ...oraculo.data.draft }); setHydrated(true); } }, [oraculo.data, hydrated]);
  const save = trpc.oraculo.saveDraft.useMutation({ onSuccess: () => toast.success("Respostas salvas. Só você vê o que escreveu."), onError: e => toast.error(e.message) });
  const generate = trpc.oraculo.generate.useMutation({ onSuccess: async () => { await utils.oraculo.get.invalidate(); toast.success("O Oráculo respondeu."); }, onError: e => toast.error(e.message) });
  const toggle = trpc.oraculo.togglePlanStep.useMutation({ onSuccess: async () => { await utils.oraculo.get.invalidate(); }, onError: e => toast.error(e.message) });
  const mentorView = Boolean(oraculo.data?.privateAnswersHidden);
  const set = (k: OraculoKey) => (v: string) => setAnswers(current => ({ ...current, [k]: v }));
  const count = answeredCount(answers);
  const latest = oraculo.data?.readings?.[0];
  const canGenerate = Boolean(oraculo.data?.canGenerate) && count >= ORACULO_MIN_ANSWERS && !generate.isPending && !mentorView;

  return <div className="space-y-4">
    {!mentorView && <>
      <section className="grid gap-4 md:grid-cols-3">{(["verdade", "manter", "ruido"] as const).map((k, index) => { const Icon = [Waves, Lightbulb, Flame][index]; return <article key={k} className="rounded-2xl border border-violet-100 bg-white p-5"><Icon className="text-violet-700" /><p className="mt-3 font-mono text-[10px] tracking-[.12em] text-violet-700">PERGUNTA {index + 1}</p><div className="mt-2"><Field k={k} value={answers[k]} onChange={set(k)} disabled={generate.isPending} /></div></article>; })}</section>
      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-sky-100 bg-sky-50 p-6"><div className="flex items-center gap-3"><Sparkles className="text-sky-800" /><div><p className="font-mono text-[10px] tracking-[.12em] text-sky-800">RITUAL DE CLAREZA</p><h3 className="text-xl font-semibold">Fato, sentido, escolha.</h3></div></div><div className="mt-5 space-y-4">{(["fato", "sentido", "escolha"] as const).map(k => <Field key={k} k={k} value={answers[k]} onChange={set(k)} disabled={generate.isPending} />)}</div></article>
        <article className="rounded-2xl border border-amber-100 bg-amber-50 p-6"><p className="font-mono text-[10px] tracking-[.12em] text-amber-800">TENSÃO A OBSERVAR{weakestLabel ? ` · ${weakestLabel.toUpperCase()}` : ""}</p><div className="mt-4"><Field k="tensao" value={answers.tensao} onChange={set("tensao")} disabled={generate.isPending} /></div>
          <div className="mt-6 rounded-xl border border-violet-200 bg-white p-4"><p className="flex items-center gap-2 text-xs text-violet-900/70"><Lock size={13} /> Suas respostas são privadas. O mentor vê apenas o plano de ação.</p>
            <p className="mt-2 text-xs text-violet-900/70">{count}/7 respondidas · mínimo {ORACULO_MIN_ANSWERS} · 1 leitura por semana</p>
            {oraculo.data && !oraculo.data.canGenerate && oraculo.data.nextDateKey && <p className="mt-1 text-xs font-semibold" style={{ color: "#6d28d9" }}>Leitura desta semana já feita. A próxima libera em {formatDateKeyBR(oraculo.data.nextDateKey)}.</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => save.mutate(answers)} disabled={save.isPending} className="inline-flex items-center gap-2 rounded-lg border border-violet-200 px-3 py-2 text-sm font-semibold" style={{ color: "#4c1d95" }}><Save size={15} /> Salvar respostas</button>
              <button type="button" onClick={() => generate.mutate(answers)} disabled={!canGenerate} className="inline-flex items-center gap-2 rounded-lg bg-[#201a39] px-4 py-2 text-sm font-semibold disabled:opacity-50" style={{ color: "#fef3c7" }}><MoonStar size={15} /> {generate.isPending ? "O Oráculo está lendo..." : oraculo.data && !oraculo.data.canGenerate ? `Próxima em ${formatDateKeyBR(oraculo.data.nextDateKey ?? "")}` : "Gerar leitura do Oráculo"}</button>
            </div></div>
        </article>
      </section>
    </>}
    {latest ? <section className="rounded-2xl bg-[#201a39] p-6 md:p-8" style={{ color: "#f5f3ff" }}>
      <p className="font-mono text-[10px] tracking-[.14em]" style={{ color: "#e4cf88" }}>LEITURA DO ORÁCULO · {new Date(`${latest.dateKey}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}</p>
      {!mentorView && <><p className="mt-4 text-lg leading-8">{latest.report.leitura}</p>
        <div className="mt-6 grid gap-3 md:grid-cols-3">{latest.report.padroes.map((p, i) => <div key={i} className="rounded-xl bg-white/5 p-4 text-sm leading-6"><small className="font-mono text-[9px] tracking-[.12em]" style={{ color: "#c4b5fd" }}>PADRÃO {i + 1}</small><p className="mt-1">{p}</p></div>)}</div></>}
      <p className="mt-6 font-mono text-[10px] tracking-[.14em]" style={{ color: "#e4cf88" }}>PLANO DE 7 DIAS</p>
      <div className="mt-3 space-y-2">{latest.report.plano.map((step, i) => { const done = latest.planDone.includes(i); return <button type="button" key={i} disabled={mentorView || toggle.isPending} onClick={() => toggle.mutate({ readingId: latest.id, index: i })} className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left ${done ? "border-lime-300/50 bg-lime-300/10" : "border-white/10 bg-white/5"}`} style={{ color: "#f5f3ff" }}><CheckCircle2 size={20} style={{ color: done ? "#bef264" : "#6d5fa8" }} /><span className="flex-1"><b className={`block text-sm ${done ? "line-through opacity-70" : ""}`}>{step.passo}</b><small className="opacity-70">{step.quando}</small></span></button>; })}</div>
      {!mentorView && <div className="mt-6 rounded-xl border border-amber-200/30 p-4"><small className="font-mono text-[9px] tracking-[.12em]" style={{ color: "#e4cf88" }}>PERGUNTA PARA O PRÓXIMO CHECK-IN</small><p className="mt-1 text-sm">{latest.report.pergunta}</p></div>}
      {mentorView && <p className="mt-5 flex items-center gap-2 text-xs opacity-70"><Lock size={13} /> Visão do mentor: as respostas escritas e a leitura pessoal são privadas.</p>}
      <p className="mt-5 text-[11px] opacity-60">Leitura gerada por IA a partir do que você escreveu. Não é previsão nem diagnóstico.</p>
    </section> : mentorView ? <section className="rounded-2xl border border-violet-100 bg-white p-6 text-sm text-violet-900/70"><Lock size={14} className="mr-2 inline" />Este navegante ainda não gerou uma leitura do Oráculo. As respostas escritas são privadas.</section> : null}
  </div>;
}
