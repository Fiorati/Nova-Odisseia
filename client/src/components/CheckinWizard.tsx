import { Button } from "@/components/ui/button";
import { ChoiceGrid, StepFlow } from "@/components/StepFlow";
import { ENERGY_OPTIONS, FACTOR_OPTIONS, MOOD_OPTIONS, NEXT_LABELS, PLAN_OPTIONS, WHEN_OPTIONS, readCheckin, suggestNextSteps, summarizeCheckin, type CheckinDetail, type CheckinFactor, type CheckinMood, type CheckinNextKey, type CheckinPlan, type CheckinWhen } from "@shared/checkinFlow";
import { Angry, Compass, Frown, Laugh, Meh, Smile, Sparkles } from "lucide-react";
const moodIcons = { 1: Angry, 2: Frown, 3: Meh, 4: Smile, 5: Laugh } as const;
import { useMemo, useState } from "react";

export type CheckinSubmit = { energy: number; reflection: string; nextAction: string; detail: CheckinDetail };
const toneStyle = { cuidado: "border-amber-300 bg-amber-50", atencao: "border-amber-200 bg-[#fbf7ea]", equilibrio: "border-emerald-200 bg-emerald-50", impulso: "border-lime-300 bg-lime-50" } as const;

export default function CheckinWizard({ initial, onSubmit, saving }: { initial?: { energy: number; detail?: CheckinDetail }; onSubmit: (value: CheckinSubmit) => Promise<void> | void; saving?: boolean }) {
  const d = initial?.detail;
  const [index, setIndex] = useState(0);
  const [mood, setMood] = useState<CheckinMood | undefined>(d?.mood);
  const [energy, setEnergy] = useState<number | undefined>(d ? initial?.energy : undefined);
  const [factors, setFactors] = useState<CheckinFactor[]>(d?.factors ?? []);
  const [plan, setPlan] = useState<CheckinPlan | undefined>(d?.plan);
  const [next, setNext] = useState<CheckinNextKey | undefined>(d?.next);
  const [nextOther, setNextOther] = useState(d?.nextOther ?? "");
  const [when, setWhen] = useState<CheckinWhen | undefined>(d?.when);
  const [note, setNote] = useState(d?.note ?? "");
  const advance = (to: number) => window.setTimeout(() => setIndex(to), 220);
  const suggestions = useMemo(() => suggestNextSteps({ mood: mood ?? 3, energy: energy ?? 3, factors, plan }), [mood, energy, factors, plan]);
  const nextOptions = [...suggestions, "outro" as const].map(value => ({ value, label: NEXT_LABELS[value] }));
  const reading = mood && energy && plan ? readCheckin({ mood, energy, factors, plan }) : null;
  const toggleFactor = (f: CheckinFactor) => setFactors(cur => f === "nada" ? (cur.includes("nada") ? [] : ["nada"]) : cur.includes(f) ? cur.filter(x => x !== f) : [...cur.filter(x => x !== "nada"), f]);
  const ready = !!(mood && energy && plan && next && when && (next !== "outro" || nextOther.trim()));
  const submit = async () => {
    if (!ready) return;
    const detail: CheckinDetail = { mood: mood!, factors, plan: plan!, next: next!, when: when!, ...(next === "outro" ? { nextOther: nextOther.trim() } : {}), ...(note.trim() ? { note: note.trim() } : {}) };
    await onSubmit({ energy: energy!, detail, ...summarizeCheckin(detail) });
  };
  const steps = [
    { key: "mood", title: "Como você está se sentindo agora?", canAdvance: !!mood, content: <ChoiceGrid columns={5} options={MOOD_OPTIONS.map(o => ({ value: o.value, label: o.label, Icon: moodIcons[o.value] }))} value={mood} onChange={v => { setMood(v); advance(1); }}/> },
    { key: "energy", title: "E a sua energia neste momento?", canAdvance: !!energy, content: <ChoiceGrid columns={5} options={ENERGY_OPTIONS.map(o => ({ value: o.value as number, label: o.label, emoji: String(o.value) }))} value={energy} onChange={v => { setEnergy(v); advance(2); }}/> },
    { key: "factors", title: "O que mais pesou ou ajudou hoje?", hint: "Pode marcar mais de um.", canAdvance: factors.length > 0, content: <><ChoiceGrid multi columns={2} options={FACTOR_OPTIONS} value={factors} onChange={toggleFactor}/><Button type="button" disabled={!factors.length} onClick={() => setIndex(3)} className="mt-4 w-full bg-[#0e3426]">Continuar</Button></> },
    { key: "plan", title: "Como foi o dia em relação ao que você planejou?", canAdvance: !!plan, content: <ChoiceGrid options={PLAN_OPTIONS} value={plan} onChange={v => { setPlan(v); advance(4); }}/> },
    { key: "next", title: "Qual é o próximo passo?", hint: "Sugestões a partir das suas respostas.", canAdvance: !!next && (next !== "outro" || !!nextOther.trim()), content: <><ChoiceGrid options={nextOptions} value={next} onChange={v => { setNext(v); if (v !== "outro") advance(5); }}/>{next === "outro" && <><input autoFocus aria-label="Qual passo?" value={nextOther} maxLength={300} onChange={e => setNextOther(e.target.value)} placeholder="Ex.: Visitar a padaria da Rua 3" className="mt-3 w-full rounded-lg border border-emerald-200 p-3 text-sm"/><Button type="button" disabled={!nextOther.trim()} onClick={() => setIndex(5)} className="mt-3 w-full bg-[#0e3426]">Continuar</Button></>}</> },
    { key: "when", title: "Quando você vai dar esse passo?", canAdvance: !!when, content: <ChoiceGrid columns={2} options={WHEN_OPTIONS} value={when} onChange={v => { setWhen(v); advance(6); }}/> },
    { key: "reading", title: "Sua leitura de hoje", content: reading ? <div className="space-y-4">
      <div className={`rounded-xl border p-4 ${toneStyle[reading.tone]}`}><p className="flex items-center gap-2 font-mono text-[10px] tracking-[.12em] text-emerald-800"><Compass size={14}/> BÚSSOLA DO DIA</p><b className="mt-2 block text-base text-emerald-950">{reading.title}</b><p className="mt-1 text-sm leading-6 text-emerald-900/80">{reading.body}</p>{next && when && <p className="mt-3 text-xs font-semibold text-emerald-800">Próximo passo: {summarizeCheckin({ mood: mood!, factors, plan: plan!, next, nextOther, when }).nextAction}</p>}</div>
      <label className="block text-xs font-semibold text-emerald-900">Quer contar mais? <span className="font-normal text-emerald-800/60">(opcional)</span><textarea value={note} maxLength={2000} onChange={e => setNote(e.target.value)} rows={3} className="mt-2 w-full rounded-lg border border-emerald-100 p-3 text-sm font-normal" placeholder="Descreva o que está sentindo ou a situação que te levou a isso."/></label>
      <Button onClick={submit} disabled={!ready || saving} className="w-full bg-[#0e3426]"><Sparkles size={16}/> Salvar check-in</Button>
    </div> : <p className="text-sm text-emerald-800/60">Responda as perguntas anteriores para ver sua leitura.</p> },
  ];
  return <StepFlow steps={steps} index={index} onIndex={setIndex}/>;
}
