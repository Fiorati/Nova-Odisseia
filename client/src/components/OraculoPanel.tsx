import { trpc } from "@/lib/trpc";
import { type OraculoAnswers } from "@shared/oraculo";
import { CheckCircle2, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import OraculoConsulta from "@/components/OraculoConsulta";
import { toast } from "sonner";

const empty: OraculoAnswers = { verdade: "", manter: "", ruido: "", fato: "", sentido: "", escolha: "", tensao: "" };
export default function OraculoPanel({ weakestLabel }: { weakestLabel?: string }) {
  const utils = trpc.useUtils();
  const oraculo = trpc.oraculo.get.useQuery(undefined, { retry: false });
  const [savedDraft, setSavedDraft] = useState<OraculoAnswers | null>(null);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { if (oraculo.data && !hydrated) { if (oraculo.data.draft) setSavedDraft({ ...empty, ...oraculo.data.draft }); setHydrated(true); } }, [oraculo.data, hydrated]);

  const save = trpc.oraculo.saveDraft.useMutation({ onSuccess: () => toast.success("Respostas salvas. Só você vê o que escreveu."), onError: e => toast.error(e.message) });
  const generate = trpc.oraculo.generate.useMutation({ onSuccess: async () => { await utils.oraculo.get.invalidate(); toast.success("O Oráculo respondeu."); }, onError: e => toast.error(e.message) });
  const toggle = trpc.oraculo.togglePlanStep.useMutation({ onSuccess: async () => { await utils.oraculo.get.invalidate(); }, onError: e => toast.error(e.message) });
  const mentorView = Boolean(oraculo.data?.privateAnswersHidden);
  const latest = oraculo.data?.readings?.[0];

  return <div className="space-y-4">
    {!mentorView && <OraculoConsulta weakestLabel={weakestLabel} savedDraft={savedDraft} serverAllows={Boolean(oraculo.data?.canGenerate)} nextDateKey={oraculo.data?.nextDateKey ?? undefined} saving={save.isPending} generating={generate.isPending} onSave={v => save.mutate(v)} onGenerate={v => generate.mutate(v)}/>}
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
