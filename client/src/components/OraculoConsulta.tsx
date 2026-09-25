import { Eye, Lock, MoonStar, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChoiceGrid, StepFlow } from "@/components/StepFlow";
import { ORACULO_MIN_ANSWERS, answeredCount, formatDateKeyBR, oraculoPrompts, type OraculoAnswers } from "@shared/oraculo";
import { ORACULO_STEPS, OTHER_CHOICE, oraculoFlowReady, oraculoFlowToAnswers, type OraculoFlowAnswers, type OraculoStepKey } from "@shared/oraculoFlow";

/** Consulta guiada ao Oráculo: perguntas encadeadas por tema, revisão transparente do que será lido e geração da leitura. */
export default function OraculoConsulta({ weakestLabel, savedDraft, serverAllows, nextDateKey, saving, generating, onSave, onGenerate }: { weakestLabel?: string; savedDraft: OraculoAnswers | null; serverAllows: boolean; nextDateKey?: string; saving?: boolean; generating?: boolean; onSave: (answers: OraculoAnswers) => void; onGenerate: (answers: OraculoAnswers) => void }) {
  const [index, setIndex] = useState(0);
  const [flow, setFlow] = useState<OraculoFlowAnswers>({});
  const [other, setOther] = useState<Partial<Record<OraculoStepKey, string>>>({});
  const [note, setNote] = useState("");
  const answers = useMemo(() => oraculoFlowToAnswers(flow, other, note), [flow, other, note]);
  const flowReady = oraculoFlowReady(flow, other);
  const count = flowReady ? answeredCount(answers) : 0;
  const draftCount = savedDraft ? answeredCount(savedDraft) : 0;
  const canGenerate = serverAllows && flowReady && count >= ORACULO_MIN_ANSWERS && !generating;
  const advance = (to: number) => window.setTimeout(() => setIndex(to), 220);
  const pick = (si: number, value: string) => setFlow(current => {
    const step = ORACULO_STEPS[si];
    const prev = current[step.key] ?? [];
    const nextValues = step.multi ? (prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value].slice(-(step.max ?? 6))) : [value];
    const next: OraculoFlowAnswers = { ...current, [step.key]: nextValues };
    for (const later of ORACULO_STEPS.slice(si + 1)) { const allowed = later.options(next).map(o => o.value); if (next[later.key]) next[later.key] = next[later.key]!.filter(v => allowed.includes(v)); }
    return next;
  });
  const reviewItems = oraculoPrompts.map(p => ({ label: p.label, value: answers[p.key] }));
  const steps = [
    ...ORACULO_STEPS.map((step, si) => {
      const options = step.options(flow);
      const chosen = flow[step.key] ?? [];
      const needsOther = chosen.includes(OTHER_CHOICE);
      const ok = chosen.length > 0 && (!needsOther || !!other[step.key]?.trim());
      return { key: step.key, title: step.title(flow), hint: step.hint, canAdvance: ok, content: <>
        <ChoiceGrid multi={step.multi} columns={options.length > 4 || step.multi ? 2 : 1} options={options} value={step.multi ? chosen : chosen[0]} onChange={v => { pick(si, v); if (!step.multi && v !== OTHER_CHOICE) advance(si + 1); }}/>
        {needsOther && <input autoFocus aria-label="Descreva" value={other[step.key] ?? ""} maxLength={300} onChange={e => setOther(cur => ({ ...cur, [step.key]: e.target.value }))} placeholder="Em poucas palavras" className="mt-3 w-full rounded-lg border border-violet-200 p-3 text-sm" style={{ color: "#052e16" }}/>}
        {(step.multi || needsOther) && <Button type="button" disabled={!ok} onClick={() => setIndex(si + 1)} className="mt-4 w-full bg-[#201a39]" style={{ color: "#fef3c7" }}>Continuar</Button>}
      </> };
    }),
    { key: "revisao", title: "O que o Oráculo vai ler", hint: "Transparência: é exatamente isto que vai para a leitura, junto com seu Chamado, sua meta e suas evidências recentes.", content: flowReady ? <div className="space-y-4">
      <ul className="space-y-2">{reviewItems.map(item => <li key={item.label} className="rounded-xl border border-violet-100 bg-white p-3 text-xs leading-5"><span className="block text-violet-900/60">{item.label}</span><b className="text-sm font-semibold" style={{ color: "#052e16" }}>{item.value}</b></li>)}</ul>
      <label className="block text-xs font-semibold text-violet-950">Algo que o Oráculo precisa saber? <span className="font-normal text-violet-900/60">(opcional)</span><textarea value={note} maxLength={600} onChange={e => setNote(e.target.value)} rows={3} className="mt-2 w-full rounded-lg border border-violet-100 p-3 text-sm font-normal" style={{ color: "#052e16" }} placeholder="Um contexto, um nome, um número. Só se ajudar."/></label>
      <p className="flex items-center gap-2 text-xs text-violet-900/70"><Lock size={13} /> Suas respostas são privadas. O mentor vê apenas o plano de ação.</p>
      {!serverAllows && nextDateKey && <p className="text-xs font-semibold" style={{ color: "#6d28d9" }}>Leitura desta semana já feita. A próxima libera em {formatDateKeyBR(nextDateKey)}.</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onSave(answers)} disabled={saving} className="inline-flex items-center gap-2 rounded-lg border border-violet-200 px-3 py-2 text-sm font-semibold" style={{ color: "#4c1d95" }}><Save size={15} /> Salvar respostas</button>
        <button type="button" onClick={() => onGenerate(answers)} disabled={!canGenerate} className="inline-flex items-center gap-2 rounded-lg bg-[#201a39] px-4 py-2 text-sm font-semibold disabled:opacity-50" style={{ color: "#fef3c7" }}><MoonStar size={15} /> {generating ? "O Oráculo está lendo..." : !serverAllows && nextDateKey ? `Próxima em ${formatDateKeyBR(nextDateKey)}` : "Gerar leitura do Oráculo"}</button>
      </div>
      <p className="text-[11px] text-violet-900/60">1 leitura por semana. A leitura é gerada por IA a partir destas respostas. Não é previsão nem diagnóstico.</p>
    </div> : <p className="text-sm text-violet-900/60">Responda as perguntas anteriores para revisar o que o Oráculo vai ler.</p> },
  ];
  return <section className="rounded-2xl border border-violet-100 bg-[#f7f5fc] p-5 md:p-6">
      <div className="mb-4 flex items-center gap-3"><Eye className="text-violet-700"/><div><p className="font-mono text-[10px] tracking-[.12em] text-violet-700">CONSULTA AO ORÁCULO{weakestLabel ? ` · MENOR NOTA NA VIDA 360: ${weakestLabel.toUpperCase()}` : ""}</p><h3 className="text-lg font-semibold text-violet-950">Oito toques, uma pergunta de cada vez.</h3></div></div>
      {savedDraft && draftCount >= ORACULO_MIN_ANSWERS && index === 0 && !flow.tema?.length && <div className="mb-4 rounded-xl border border-violet-200 bg-white p-3 text-xs text-violet-900/80">Você tem respostas salvas de antes ({draftCount}/7). Pode refazer a consulta abaixo ou <button type="button" disabled={!serverAllows || generating} onClick={() => onGenerate(savedDraft)} className="font-semibold underline disabled:opacity-50" style={{ color: "#4c1d95" }}>gerar a leitura com elas</button>.</div>}
      <div className="max-w-xl"><StepFlow steps={steps} index={index} onIndex={setIndex}/></div>
  </section>;
}
