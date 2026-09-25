import { trpc } from "@/lib/trpc";
import { formatDateKeyBR } from "@shared/oraculo";
import { DISC_BLOCKS, DISC_FACTORS, DISC_LABELS, type DiscProfile } from "@shared/disc";
import { Lock, Sparkles, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import PlanoAcaoCard from "@/components/PlanoAcaoCard";

type Choice = { most: number | null; least: number | null };

function ProfileBars({ profile }: { profile: DiscProfile }) {
  return <div className="space-y-3">
    {DISC_FACTORS.map(f => <div key={f}>
      <div className="flex items-baseline justify-between text-sm"><span><b style={{ color: "#fde68a" }}>{f}</b> · {DISC_LABELS[f].name}{f === profile.primary ? " · predominante" : f === profile.secondary ? " · secundário" : ""}</span><span className="font-mono text-xs">{profile.percent[f]}%</span></div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${profile.percent[f]}%`, backgroundColor: f === profile.primary ? "#fde68a" : "rgba(253,230,138,.5)" }} /></div>
      <p className="mt-0.5 text-[11px]" style={{ color: "rgba(237,233,254,.55)" }}>{DISC_LABELS[f].short}</p>
    </div>)}
  </div>;
}

export default function DiscPanel() {
  const utils = trpc.useUtils();
  const data = trpc.oraculo.disc.useQuery(undefined, { retry: false });
  const [choices, setChoices] = useState<Choice[]>(() => DISC_BLOCKS.map(() => ({ most: null, least: null })));
  const generate = trpc.oraculo.generateDisc.useMutation({ onSuccess: async () => { await utils.oraculo.disc.invalidate(); toast.success("Seu DISC está pronto."); }, onError: e => toast.error(e.message) });
  const latest = data.data?.records?.[0];
  const canGenerate = data.data?.canGenerate ?? false;
  const done = choices.filter(c => c.most !== null && c.least !== null).length;
  const pick = (block: number, kind: "most" | "least", index: number) => setChoices(prev => prev.map((c, i) => {
    if (i !== block) return c;
    const next = { ...c, [kind]: c[kind] === index ? null : index };
    if (kind === "most" && next.least === index) next.least = null;
    if (kind === "least" && next.most === index) next.most = null;
    return next;
  }));

  return <section className="relative overflow-hidden rounded-2xl border border-amber-200/40 bg-[#201a39] p-6" style={{ color: "#f5f3ff" }}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-full border border-amber-200/40 bg-white/5"><Users size={20} color="#fde68a" /></span>
        <div><h3 className="text-xl font-semibold">DISC</h3><p className="font-mono text-[10px] tracking-[.12em]" style={{ color: "#e4cf88" }}>LIMITE: 1 POR SEMANA · ESTILO DE COMPORTAMENTO NO TRABALHO</p></div></div>
      {!canGenerate && data.data?.nextDateKey && <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs" style={{ color: "#fde68a" }}><Lock size={12} /> Próximo libera em {formatDateKeyBR(data.data.nextDateKey)}</span>}
    </div>

    {canGenerate && <div className="mt-5">
      <p className="text-sm" style={{ color: "rgba(237,233,254,.75)" }}>Em cada bloco, marque a palavra <b style={{ color: "#fde68a" }}>mais</b> parecida com você no trabalho e a <b style={{ color: "#fde68a" }}>menos</b> parecida. Responda pelo que você faz, não pelo que gostaria de fazer.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">{DISC_BLOCKS.map((block, b) => <div key={b} className="rounded-xl border border-amber-200/20 bg-white/5 p-3">
        <p className="mb-2 font-mono text-[10px] tracking-[.12em]" style={{ color: "#e4cf88" }}>BLOCO {b + 1}</p>
        {block.map((opt, i) => <div key={opt.word} className="flex items-center justify-between gap-2 py-0.5 text-sm">
          <span>{opt.word}</span>
          <span className="flex gap-1">{(["most", "least"] as const).map(kind => { const on = choices[b][kind] === i; return <button type="button" key={kind} aria-pressed={on} onClick={() => pick(b, kind, i)} className="rounded-full border px-2 py-0.5 text-[11px]" style={on ? { backgroundColor: kind === "most" ? "#fde68a" : "#c4b5fd", color: "#16122b", borderColor: "transparent" } : { color: "rgba(237,233,254,.7)", borderColor: "rgba(253,230,138,.3)" }}>{kind === "most" ? "Mais" : "Menos"}</button>; })}</span>
        </div>)}
      </div>)}</div>
      <div className="mt-4 flex flex-wrap items-center gap-3"><button type="button" disabled={done < DISC_BLOCKS.length || generate.isPending} onClick={() => generate.mutate({ answers: choices.map(c => ({ most: c.most!, least: c.least! })) })} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50" style={{ backgroundColor: "#fde68a", color: "#16122b" }}><Sparkles size={15} /> {generate.isPending ? "Interpretando..." : "Ver meu estilo DISC"}</button>
        <span className="text-xs" style={{ color: "rgba(237,233,254,.6)" }}>{done}/{DISC_BLOCKS.length} blocos respondidos</span></div>
    </div>}

    {latest && <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
      <div><p className="mb-3 text-xs" style={{ color: "rgba(237,233,254,.6)" }}>Feito em {formatDateKeyBR(latest.dateKey)}</p><ProfileBars profile={latest.profile} /></div>
      <div className="space-y-4 text-sm leading-6">
        <p>{latest.report.essencia}</p>
        <div><p className="font-mono text-[10px] tracking-[.12em]" style={{ color: "#e4cf88" }}>FORÇAS</p><ul className="mt-1 list-disc pl-5">{latest.report.forcas.map(f => <li key={f}>{f}</li>)}</ul></div>
        <div><p className="font-mono text-[10px] tracking-[.12em]" style={{ color: "#e4cf88" }}>PONTOS DE ATENÇÃO</p><ul className="mt-1 list-disc pl-5">{latest.report.atencao.map(f => <li key={f}>{f}</li>)}</ul></div>
        <p className="rounded-lg bg-white/5 p-3"><b style={{ color: "#fde68a" }}>Comunicação:</b> {latest.report.comunicacao}</p>
        <p className="rounded-lg border border-amber-200/30 p-3"><b style={{ color: "#fde68a" }}>Na sua jornada:</b> {latest.report.jornada}</p>
        <p className="italic" style={{ color: "#fde68a" }}>{latest.report.pergunta}</p>
        <p className="text-xs" style={{ color: "rgba(237,233,254,.5)" }}>Questionário próprio de 12 blocos, inspirado no modelo DISC. Mostra estilo preferido no trabalho, não capacidade nem caráter, e pode mudar com o contexto. Não é o teste comercial certificado nem avaliação psicológica. Leitura gerada por IA.</p>
      </div>
    </div>}
    {latest && <PlanoAcaoCard key={latest.id} source="disc" readingId={latest.id} />}
    {data.error && <p className="mt-4 text-sm text-red-200">{data.error.message}</p>}
  </section>;
}
