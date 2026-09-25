import { useState } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { journeyDateKey } from "@shared/journeyDate";
import { addEvidence } from "@shared/travessia";
import { useJourneyStore } from "@/lib/journeyStore";
import ReflectionWizard, { type ReflectionResult } from "@/components/ReflectionWizard";
import type { ReflectionPresetKey } from "@shared/reflectionFlow";


/** Formulário de evidência no próprio portal: a ação abre o registro dela, sem mandar a pessoa para outra tela. */
export default function EvidenceForm({ context, button, preset, tone = "emerald" }: { context: string; button: string; preset: ReflectionPresetKey; tone?: "emerald" | "red" | "amber" | "violet" }) {
  const { state, save, saving } = useJourneyStore();
  const [open, setOpen] = useState(false);
  const [reward, setReward] = useState<{ xp: number; streak: number } | null>(null);
  const color = { emerald: "text-emerald-800", red: "text-red-800", amber: "text-amber-800", violet: "text-violet-800" }[tone];
  const submit = async (values: ReflectionResult) => {
    try {
      const result = addEvidence(state, { context, ...values, today: journeyDateKey() });
      await save(result.state);
      setReward(result.reward); setOpen(false);
      toast.success(`Evidência registrada. +${result.reward.xp} XP`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível registrar."); }
  };
  if (reward && !open) return <div className="mt-5 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><Sparkles className="shrink-0 animate-bounce text-amber-500"/><div><b>+{reward.xp} XP · Ritmo {reward.streak} dia(s)</b><p className="text-xs text-emerald-900/65">Registrado no seu Diário de Bordo ({context}).</p></div><button type="button" onClick={()=>{setReward(null);setOpen(true);}} className="ml-auto text-xs font-semibold underline">Registrar outra</button></div>;
  if (!open) return <button type="button" onClick={()=>setOpen(true)} className={`mt-5 inline-flex items-center gap-2 text-sm font-semibold ${color}`}><CheckCircle2 size={16}/> {button}</button>;
  return <div className="mt-5 space-y-3 rounded-xl border border-emerald-100 bg-[#f7f8f3] p-4 text-emerald-950">
    <p className="font-mono text-[9px] tracking-[.12em] text-emerald-700">REGISTRO VINCULADO · {context.toUpperCase()}</p>
    <ReflectionWizard preset={preset} submitLabel="Registrar evidência" saving={saving} onSubmit={submit} onCancel={()=>setOpen(false)}/>
  </div>;
}
