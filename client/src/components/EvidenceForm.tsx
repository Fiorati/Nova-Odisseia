import { useState } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { journeyDateKey } from "@shared/journeyDate";
import { addEvidence } from "@shared/travessia";
import { useJourneyStore } from "@/lib/journeyStore";

type Field = { label: string; placeholder: string };

/** Formulário de evidência no próprio portal: a ação abre o registro dela, sem mandar a pessoa para outra tela. */
export default function EvidenceForm({ context, button, fields, tone = "emerald" }: { context: string; button: string; fields: [Field, Field, Field]; tone?: "emerald" | "red" | "amber" | "violet" }) {
  const { state, save, saving } = useJourneyStore();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(["", "", ""]);
  const [reward, setReward] = useState<{ xp: number; streak: number } | null>(null);
  const color = { emerald: "text-emerald-800", red: "text-red-800", amber: "text-amber-800", violet: "text-violet-800" }[tone];
  const submit = async () => {
    try {
      const result = addEvidence(state, { context, fact: values[0], meaning: values[1], next: values[2], today: journeyDateKey() });
      await save(result.state);
      setReward(result.reward); setOpen(false); setValues(["", "", ""]);
      toast.success(`Evidência registrada. +${result.reward.xp} XP`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível registrar."); }
  };
  if (reward && !open) return <div className="mt-5 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><Sparkles className="shrink-0 animate-bounce text-amber-500"/><div><b>+{reward.xp} XP · Ritmo {reward.streak} dia(s)</b><p className="text-xs text-emerald-900/65">Registrado no seu Diário de Bordo ({context}).</p></div><button type="button" onClick={()=>{setReward(null);setOpen(true);}} className="ml-auto text-xs font-semibold underline">Registrar outra</button></div>;
  if (!open) return <button type="button" onClick={()=>setOpen(true)} className={`mt-5 inline-flex items-center gap-2 text-sm font-semibold ${color}`}><CheckCircle2 size={16}/> {button}</button>;
  return <div className="mt-5 space-y-3 rounded-xl border border-emerald-100 bg-[#f7f8f3] p-4 text-emerald-950">
    <p className="font-mono text-[9px] tracking-[.12em] text-emerald-700">REGISTRO VINCULADO · {context.toUpperCase()}</p>
    {fields.map((field, index) => <label key={field.label} className="grid gap-1 text-xs font-semibold">{index + 1}. {field.label}<textarea rows={2} value={values[index]} placeholder={field.placeholder} onChange={e=>setValues(current=>current.map((value, i)=>i===index ? e.target.value : value))} className="rounded-lg border border-emerald-100 bg-white p-2 text-sm font-normal"/></label>)}
    <div className="flex items-center gap-3"><button type="button" disabled={saving || !values[0].trim()} onClick={submit} className="rounded-lg bg-[#0e3426] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" style={{color:"#ffffff"}}>{saving ? "Salvando..." : "Registrar evidência"}</button><button type="button" onClick={()=>setOpen(false)} className="text-xs text-emerald-900/60">Cancelar</button></div>
  </div>;
}
