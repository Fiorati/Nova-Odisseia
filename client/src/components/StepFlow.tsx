import { ChevronLeft } from "lucide-react";
import { useRef, type ComponentType, type ReactNode } from "react";

/** Formulário passo a passo: uma pergunta por vez, desliza para o lado, com barra de progresso e voltar. */
export type FlowStep = { key: string; title: string; hint?: string; content: ReactNode; canAdvance?: boolean };

export function StepFlow({ steps, index, onIndex, footer }: { steps: FlowStep[]; index: number; onIndex: (next: number) => void; footer?: ReactNode }) {
  const touch = useRef<number | null>(null);
  const go = (next: number) => { if (next < 0 || next >= steps.length) return; if (next > index && steps[index].canAdvance === false) return; onIndex(next); };
  const pct = Math.round(((index + 1) / steps.length) * 100);
  return <div className="select-none" onTouchStart={e => { touch.current = e.touches[0].clientX; }} onTouchEnd={e => { if (touch.current === null) return; const dx = e.changedTouches[0].clientX - touch.current; touch.current = null; if (Math.abs(dx) > 60) go(dx < 0 ? index + 1 : index - 1); }}>
    <div className="flex items-center gap-3">
      <button type="button" aria-label="Voltar" onClick={() => go(index - 1)} disabled={index === 0} className="grid h-8 w-8 place-items-center rounded-full border border-emerald-100 text-emerald-800 disabled:opacity-30"><ChevronLeft size={16}/></button>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-emerald-50" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-gradient-to-r from-emerald-700 to-amber-400 transition-all duration-500" style={{ width: `${pct}%` }}/></div>
      <span className="font-mono text-[10px] tracking-[.12em] text-emerald-700">{index + 1}/{steps.length}</span>
    </div>
    <div className="mt-4 overflow-hidden">
      <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${index * 100}%)` }}>
        {steps.map((step, i) => <section key={step.key} aria-hidden={i !== index} className="w-full shrink-0 px-0.5" style={{ visibility: Math.abs(i - index) > 1 ? "hidden" : "visible" }}>
          <h4 className="text-lg font-semibold leading-6 text-emerald-950">{step.title}</h4>
          {step.hint && <p className="mt-1 text-xs text-emerald-800/60">{step.hint}</p>}
          <div className="mt-4">{i === index || Math.abs(i - index) === 1 ? step.content : null}</div>
        </section>)}
      </div>
    </div>
    {footer}
  </div>;
}

/** Botões de escolha grandes. Em escolha única, chama onPick para avançar sozinho. */
export function ChoiceGrid<T extends string | number>({ options, value, onChange, multi = false, columns = 1 }: { options: { value: T; label: string; emoji?: string; Icon?: ComponentType<{ size?: number; className?: string }> }[]; value: T | T[] | undefined; onChange: (next: T) => void; multi?: boolean; columns?: 1 | 2 | 5 }) {
  const selected = (v: T) => (Array.isArray(value) ? value.includes(v) : value === v);
  const grid = columns === 5 ? "grid-cols-5" : columns === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1";
  return <div role={multi ? "group" : "radiogroup"} className={`grid gap-2 ${grid}`}>
    {options.map(o => <button key={String(o.value)} type="button" role={multi ? "checkbox" : "radio"} aria-checked={selected(o.value)} onClick={() => onChange(o.value)} style={selected(o.value) ? { color: "#ffffff" } : { color: "#052e16" }}
      className={`rounded-xl border px-3 text-sm font-semibold transition ${columns === 5 ? "flex flex-col items-center gap-1 py-3 text-[11px] leading-4" : "py-3 text-left"} ${selected(o.value) ? "border-emerald-700 bg-emerald-700 text-white shadow" : "border-emerald-100 bg-white text-emerald-950 hover:border-emerald-300 hover:bg-emerald-50"}`}>
      {o.Icon ? <o.Icon size={26} className={columns === 5 ? "" : "mr-2 inline"}/> : o.emoji && <span className={columns === 5 ? "text-xl font-mono" : "mr-2"}>{o.emoji}</span>}{o.label}
    </button>)}
  </div>;
}
