import { Compass, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChoiceGrid, StepFlow } from "@/components/StepFlow";
import { OTHER, REFLECTION_PRESETS, REFLECTION_WHEN, reflectionReady, summarizeReflection, type ReflectionAnswers, type ReflectionPresetKey, type ReflectionWhen } from "@shared/reflectionFlow";

export type ReflectionResult = { fact: string; meaning: string; next: string };
const toneStyle = { cuidado: "border-amber-300 bg-amber-50", atencao: "border-amber-200 bg-[#fbf7ea]", equilibrio: "border-emerald-200 bg-emerald-50", impulso: "border-lime-300 bg-lime-50" } as const;

/** Registro guiado: uma pergunta por vez com botões, leitura no fim e caixa opcional para contar mais. */
export default function ReflectionWizard({ preset: presetKey, submitLabel, onSubmit, onCancel, saving }: { preset: ReflectionPresetKey; submitLabel: string; onSubmit: (value: ReflectionResult) => Promise<void> | void; onCancel?: () => void; saving?: boolean }) {
  const preset = REFLECTION_PRESETS[presetKey];
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<ReflectionAnswers>({});
  const [nextOther, setNextOther] = useState("");
  const [when, setWhen] = useState<ReflectionWhen | undefined>();
  const [note, setNote] = useState("");
  const advance = (to: number) => window.setTimeout(() => setIndex(to), 220);
  const setAnswer = (qi: number, value: string) => setAnswers(current => {
    const q = preset.questions[qi];
    const prev = current[q.key] ?? [];
    const next: ReflectionAnswers = { ...current, [q.key]: q.multi ? (prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]) : [value] };
    for (const later of preset.questions.slice(qi + 1)) {
      const allowed = later.options(next).map(o => o.value);
      if (next[later.key]) next[later.key] = next[later.key]!.filter(v => allowed.includes(v));
    }
    return next;
  });
  const ready = reflectionReady(preset, answers, nextOther, when);
  const reading = preset.questions.every(q => answers[q.key]?.length) ? preset.read(answers) : null;
  const submit = async () => { if (ready) await onSubmit(summarizeReflection(preset, { answers, nextOther, when: when!, note })); };
  const whenIndex = preset.questions.length;
  const steps = [
    ...preset.questions.map((q, qi) => {
      const options = q.options(answers);
      const value = q.multi ? answers[q.key] ?? [] : answers[q.key]?.[0];
      const picked = (answers[q.key]?.length ?? 0) > 0;
      const other = answers[q.key]?.includes(OTHER);
      return { key: q.key, title: typeof q.title === "function" ? q.title(answers) : q.title, hint: q.hint, canAdvance: picked && (!other || !!nextOther.trim()), content: <>
        <ChoiceGrid multi={q.multi} columns={options.length > 4 || q.multi ? 2 : 1} options={options} value={value} onChange={v => { setAnswer(qi, v); if (!q.multi && v !== OTHER) advance(qi + 1); }}/>
        {other && <input autoFocus aria-label="Qual passo?" value={nextOther} maxLength={300} onChange={e => setNextOther(e.target.value)} placeholder="Descreva o passo em poucas palavras" className="mt-3 w-full rounded-lg border border-emerald-200 p-3 text-sm"/>}
        {(q.multi || other) && <Button type="button" disabled={!picked || (other && !nextOther.trim())} onClick={() => setIndex(qi + 1)} className="mt-4 w-full bg-[#0e3426]">Continuar</Button>}
      </> };
    }),
    { key: "when", title: "Quando?", canAdvance: !!when, content: <ChoiceGrid columns={2} options={REFLECTION_WHEN} value={when} onChange={v => { setWhen(v); advance(whenIndex + 1); }}/> },
    { key: "reading", title: "Sua leitura", content: reading ? <div className="space-y-4">
      <div className={`rounded-xl border p-4 ${toneStyle[reading.tone]}`}><p className="flex items-center gap-2 font-mono text-[10px] tracking-[.12em] text-emerald-800"><Compass size={14}/> LEITURA DO REGISTRO</p><b className="mt-2 block text-base text-emerald-950">{reading.title}</b><p className="mt-1 text-sm leading-6 text-emerald-900/80">{reading.body}</p></div>
      <label className="block text-xs font-semibold text-emerald-900">Quer contar mais? <span className="font-normal text-emerald-800/60">(opcional)</span><textarea value={note} maxLength={1000} onChange={e => setNote(e.target.value)} rows={3} className="mt-2 w-full rounded-lg border border-emerald-100 p-3 text-sm font-normal" placeholder="Um detalhe, um nome, um número. Só se ajudar."/></label>
      <Button type="button" onClick={submit} disabled={!ready || saving} className="w-full bg-[#0e3426]"><Sparkles size={16}/> {saving ? "Salvando..." : submitLabel}</Button>
    </div> : <p className="text-sm text-emerald-800/60">Responda as perguntas anteriores para ver sua leitura.</p> },
  ];
  return <div><StepFlow steps={steps} index={index} onIndex={setIndex}/>{onCancel && <button type="button" onClick={onCancel} className="mt-3 text-xs text-emerald-900/60">Cancelar</button>}</div>;
}
