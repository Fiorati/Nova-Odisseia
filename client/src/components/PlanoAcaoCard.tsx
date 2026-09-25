import { trpc } from "@/lib/trpc";
import { ChoiceGrid, StepFlow, type FlowStep } from "@/components/StepFlow";
import { PLANO_AREAS, PLANO_SOURCE_LABEL, planoOptionsFor, type PlanoAreaKey, type PlanoSource } from "@shared/planoAcao";
import { Brain, Check, ClipboardList, Coins, HeartPulse, Landmark, Loader2, Users } from "lucide-react";

const AREA_ICON = { profissional: Landmark, financas: Coins, pessoal: HeartPulse, emocional: Brain, comunidade: Users } as const;
import { useState } from "react";
import { toast } from "sonner";

/** Fim de cada parte do Oráculo: "Salvar e criar plano de ação". Pergunta objetivo e 3 prioridades quando a odisseia ainda não tem essa referência. */
export default function PlanoAcaoCard({ source, readingId, forSelf = true }: { source: PlanoSource; readingId: number; forSelf?: boolean }) {
  const utils = trpc.useUtils();
  const data = trpc.oraculo.planos.useQuery(undefined, { retry: false });
  const generate = trpc.oraculo.generatePlano.useMutation({ onSuccess: async () => { await utils.oraculo.planos.invalidate(); setAsking(false); toast.success("Plano de ação salvo."); }, onError: e => toast.error(e.message) });
  const toggle = trpc.oraculo.togglePlanoStep.useMutation({ onSuccess: () => utils.oraculo.planos.invalidate(), onError: e => toast.error(e.message) });
  const [asking, setAsking] = useState(false);
  const [step, setStep] = useState(0);
  const [area, setArea] = useState<PlanoAreaKey | undefined>();
  const [objetivo, setObjetivo] = useState<string | undefined>();
  const [custom, setCustom] = useState("");
  const [prioridades, setPrioridades] = useState<string[]>([]);
  const [extra, setExtra] = useState("");

  const plano = data.data?.planos.find(p => p.source === source && p.sourceId === readingId);
  const needsGoals = !forSelf || !data.data?.hasGoals;
  const opts = area ? planoOptionsFor(area) : null;
  const objetivoFinal = objetivo === "__outro" ? custom.trim() : objetivo;
  const togglePrio = (v: string) => setPrioridades(prev => prev.includes(v) ? prev.filter(p => p !== v) : prev.length >= 3 ? prev : [...prev, v]);
  const addExtra = () => { const v = extra.trim(); if (v && !prioridades.includes(v) && prioridades.length < 3) setPrioridades(p => [...p, v]); setExtra(""); };

  const start = () => { if (needsGoals) { setAsking(true); setStep(0); } else generate.mutate({ source, readingId }); };
  const submit = () => { if (!area || !objetivoFinal || prioridades.length !== 3) return; generate.mutate({ source, readingId, goals: { area: PLANO_AREAS[area].label, objetivo: objetivoFinal, prioridades } }); };

  if (plano) return <div className="mt-6 rounded-2xl border border-amber-200/40 bg-white/5 p-5 text-sm leading-6">
    <p className="flex items-center gap-2 font-mono text-[10px] tracking-[.12em]" style={{ color: "#e4cf88" }}><ClipboardList size={14} /> PLANO DE AÇÃO · 7 DIAS · A PARTIR DO {PLANO_SOURCE_LABEL[source].toUpperCase()}</p>
    <h4 className="mt-2 text-lg font-semibold" style={{ color: "#fde68a" }}>{plano.report.titulo}</h4>
    <p className="mt-1" style={{ color: "rgba(237,233,254,.85)" }}>{plano.report.foco}</p>
    {plano.goals && <p className="mt-2 text-xs" style={{ color: "rgba(237,233,254,.6)" }}>Objetivo: {plano.goals.objetivo} · Prioridades: {plano.goals.prioridades.join(" · ")}</p>}
    <ol className="mt-4 space-y-2">{plano.report.passos.map((p, i) => { const done = plano.planDone.includes(i); return <li key={i}>
      <button type="button" onClick={() => toggle.mutate({ planoId: plano.id, index: i })} aria-pressed={done} className="flex w-full items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-left hover:bg-white/10">
        <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${done ? "border-amber-200 bg-amber-200" : "border-amber-200/60"}`}>{done && <Check size={13} color="#16122b" />}</span>
        <span><b className={done ? "line-through opacity-60" : ""}>{p.passo}</b> <span className="text-xs" style={{ color: "#fde68a" }}>· {p.quando}</span><br /><span className="text-xs" style={{ color: "rgba(237,233,254,.6)" }}>Por quê: {p.porque}</span></span>
      </button></li>; })}</ol>
    <p className="mt-3 rounded-lg border border-amber-200/30 p-3"><b style={{ color: "#fde68a" }}>Como saber se funcionou:</b> {plano.report.indicador}</p>
    <p className="mt-2 text-xs" style={{ color: "rgba(237,233,254,.5)" }}>Plano gerado por IA a partir desta leitura e dos objetivos que você declarou. É sugestão para reflexão e ação, não previsão nem garantia de resultado.</p>
  </div>;

  if (!asking) return <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200/30 bg-white/5 p-4">
    <button type="button" onClick={start} disabled={generate.isPending || data.isLoading} className="inline-flex items-center gap-2 rounded-full bg-amber-200 px-5 py-2.5 text-sm font-semibold disabled:opacity-60" style={{ color: "#16122b" }}>
      {generate.isPending ? <Loader2 size={16} className="animate-spin" /> : <ClipboardList size={16} />} {generate.isPending ? "Montando o plano…" : "Salvar e criar plano de ação"}
    </button>
    <span className="text-xs" style={{ color: "rgba(237,233,254,.65)" }}>{needsGoals ? "Antes, 3 perguntas rápidas: seu objetivo e suas 3 prioridades." : "Usa esta leitura com seu Chamado, meta do ciclo e PDI para montar 3 passos de 7 dias."}</span>
  </div>;

  const steps: FlowStep[] = [
    { key: "area", title: forSelf ? "Qual área da vida você quer mover agora?" : "Qual área da vida essa pessoa quer mover agora?", hint: "O plano começa por onde há mais vontade de mudar.", canAdvance: !!area,
      content: <ChoiceGrid columns={2} value={area} onChange={v => { setArea(v); setObjetivo(undefined); setPrioridades([]); setStep(1); }} options={(Object.keys(PLANO_AREAS) as PlanoAreaKey[]).map(k => ({ value: k, label: PLANO_AREAS[k].label, Icon: AREA_ICON[k] }))} /> },
    { key: "objetivo", title: "O que você quer alcançar?", hint: "Escolha o mais próximo. Dá para escrever o seu.", canAdvance: !!objetivoFinal,
      content: <div className="space-y-3"><ChoiceGrid value={objetivo} onChange={v => { setObjetivo(v); if (v !== "__outro") setStep(2); }} options={[...(opts?.objetivos ?? []).map(o => ({ value: o, label: o })), { value: "__outro", label: "Outro, vou escrever" }]} />
        {objetivo === "__outro" && <input autoFocus value={custom} maxLength={300} onChange={e => setCustom(e.target.value)} placeholder="Ex.: fechar 3 clientes novos até dezembro" className="w-full rounded-xl border border-emerald-200 px-3 py-2 text-sm text-emerald-950" />}</div> },
    { key: "prioridades", title: "Quais são as suas 3 prioridades?", hint: `Escolha exatamente 3 (${prioridades.length}/3).`, canAdvance: prioridades.length === 3,
      content: <div className="space-y-3"><ChoiceGrid multi columns={2} value={prioridades} onChange={togglePrio} options={Array.from(new Set([...(opts?.prioridades ?? []), ...prioridades])).map(o => ({ value: o, label: o }))} />
        <div className="flex gap-2"><input value={extra} maxLength={200} onChange={e => setExtra(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addExtra(); }} placeholder="Outra prioridade" className="flex-1 rounded-xl border border-emerald-200 px-3 py-2 text-sm text-emerald-950" /><button type="button" onClick={addExtra} disabled={!extra.trim() || prioridades.length >= 3} className="rounded-xl border border-emerald-200 px-3 text-sm font-semibold text-emerald-800 disabled:opacity-40">Adicionar</button></div></div> },
  ];
  return <div className="mt-6 rounded-2xl bg-white p-5 text-emerald-950">
    <p className="mb-3 font-mono text-[10px] tracking-[.12em] text-emerald-700">ANTES DO PLANO · SEU RUMO</p>
    <StepFlow steps={steps} index={step} onIndex={setStep} footer={<div className="mt-5 flex flex-wrap items-center justify-between gap-2">
      <button type="button" onClick={() => setAsking(false)} className="text-sm text-emerald-800/70 underline">Cancelar</button>
      {step < steps.length - 1
        ? <button type="button" disabled={steps[step].canAdvance === false} onClick={() => setStep(step + 1)} className="rounded-full bg-emerald-700 px-5 py-2 text-sm font-semibold text-white disabled:opacity-40">Continuar</button>
        : <button type="button" disabled={prioridades.length !== 3 || generate.isPending} onClick={submit} className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-5 py-2 text-sm font-semibold text-white disabled:opacity-40">{generate.isPending && <Loader2 size={15} className="animate-spin" />}{generate.isPending ? "Montando o plano…" : "Gerar plano de ação"}</button>}
    </div>} />
  </div>;
}
