import { Save } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChoiceGrid, StepFlow } from "@/components/StepFlow";
import type { SentenceAnswers, SentenceFlow } from "@shared/goalFlow";

/** Monta uma frase (Chamado, meta) a partir de escolhas; no fim a pessoa pode ajustar o texto antes de salvar. */
export default function SentenceWizard({ flow, submitLabel, onSubmit, onCancel, saving }: { flow: SentenceFlow; submitLabel: string; onSubmit: (text: string) => Promise<void> | void; onCancel?: () => void; saving?: boolean }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<SentenceAnswers>({});
  const [text, setText] = useState("");
  const pick = (si: number, value: string) => {
    const next: SentenceAnswers = { ...answers, [flow.steps[si].key]: value };
    for (const later of flow.steps.slice(si + 1)) if (next[later.key] && !later.options(next).some(o => o.value === next[later.key])) delete next[later.key];
    setAnswers(next);
    const done = flow.steps.every(s => next[s.key]);
    if (done) setText(flow.compose(next));
    window.setTimeout(() => setIndex(si + 1), 220);
  };
  const steps = [
    ...flow.steps.map((step, si) => ({ key: step.key, title: step.title(answers), hint: step.hint, canAdvance: !!answers[step.key], content: <ChoiceGrid options={step.options(answers)} value={answers[step.key]} onChange={v => pick(si, v)}/> })),
    { key: "final", title: flow.finalTitle, hint: "Montado a partir das suas escolhas. Ajuste as palavras se quiser.", content: text ? <div className="space-y-3">
      <textarea aria-label={flow.finalTitle} value={text} maxLength={300} rows={2} onChange={e => setText(e.target.value)} className="w-full rounded-lg border border-emerald-200 bg-white p-3 text-sm font-semibold" style={{ color: "#052e16" }}/>
      <Button type="button" disabled={!text.trim() || saving} onClick={() => onSubmit(text.trim())} className="w-full bg-[#0e3426]"><Save size={16}/> {saving ? "Salvando..." : submitLabel}</Button>
    </div> : <p className="text-sm text-emerald-800/60">Responda as perguntas anteriores.</p> },
  ];
  return <div><StepFlow steps={steps} index={index} onIndex={setIndex}/>{onCancel && <button type="button" onClick={onCancel} className="mt-3 text-xs text-emerald-900/60">Cancelar</button>}</div>;
}
