import { trpc } from "@/lib/trpc";
import { formatDateKeyBR } from "@shared/oraculo";
import { MASTER_NUMBERS, NUMBER_LABELS, type NumerologyNumbers } from "@shared/mapaNumerologico";
import { Hash, Lock, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const ORDER = ["caminho", "expressao", "motivacao", "impressao", "aniversario", "anoPessoal"] as const;
const isMaster = (n: number) => (MASTER_NUMBERS as readonly number[]).includes(n);

function NumberGrid({ numbers }: { numbers: NumerologyNumbers }) {
  return <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
    {ORDER.map(k => <div key={k} className="rounded-xl border border-amber-200/25 bg-white/5 p-3 text-center">
      <p className="text-3xl font-semibold" style={{ color: "#fde68a" }}>{numbers[k]}</p>
      <p className="mt-1 text-xs font-medium">{NUMBER_LABELS[k].title}{k === "anoPessoal" ? ` ${numbers.anoReferencia}` : ""}</p>
      <p className="text-[10px]" style={{ color: "rgba(237,233,254,.55)" }}>{isMaster(numbers[k]) ? "número mestre · " : ""}{NUMBER_LABELS[k].how}</p>
    </div>)}
  </div>;
}

export default function MapaNumerologicoPanel() {
  const utils = trpc.useUtils();
  const data = trpc.oraculo.mapaNumerologico.useQuery(undefined, { retry: false });
  const [form, setForm] = useState({ fullName: "", birthDate: "", forSelf: true });
  const generate = trpc.oraculo.generateMapaNumerologico.useMutation({ onSuccess: async () => { await utils.oraculo.mapaNumerologico.invalidate(); toast.success("Seu Mapa Numerológico está pronto."); }, onError: e => toast.error(e.message) });
  const latest = data.data?.records?.[0];
  const canGenerate = data.data?.canGenerate ?? false;
  const ready = form.fullName.trim().length >= 3 && form.birthDate;
  const input = "w-full rounded-lg border border-amber-100/20 px-3 py-2 text-sm outline-none placeholder:text-slate-400";
  const inputStyle = { color: "#16122b" };
  const labels: Record<string, string> = { caminho: "Caminho de Vida", expressao: "Expressão", motivacao: "Motivação", impressao: "Impressão", anoPessoal: "Ano Pessoal" };

  return <section className="relative overflow-hidden rounded-2xl border border-amber-200/40 bg-[#201a39] p-6" style={{ color: "#f5f3ff" }}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-full border border-amber-200/40 bg-white/5"><Hash size={20} color="#fde68a" /></span>
        <div><h3 className="text-xl font-semibold">Mapa Numerológico</h3><p className="font-mono text-[10px] tracking-[.12em]" style={{ color: "#e4cf88" }}>LIMITE: 1 POR MÊS · TABELA PITAGÓRICA + LEITURA SIMBÓLICA</p></div></div>
      {!canGenerate && data.data?.nextDateKey && <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs" style={{ color: "#fde68a" }}><Lock size={12} /> Próximo libera em {formatDateKeyBR(data.data.nextDateKey)}</span>}
    </div>

    {canGenerate && <div className="mt-5 grid gap-3 md:grid-cols-2">
      <div className="md:col-span-2 flex flex-wrap items-center gap-2 text-sm">{[{ v: true, t: "O mapa é meu" }, { v: false, t: "É de outra pessoa" }].map(o => <button type="button" key={String(o.v)} onClick={() => setForm({ ...form, forSelf: o.v })} className="rounded-full border px-3 py-1" style={form.forSelf === o.v ? { backgroundColor: "#fde68a", color: "#16122b", borderColor: "#fde68a" } : { color: "#fde68a", borderColor: "rgba(253,230,138,.4)" }}>{o.t}</button>)}
        <span className="text-xs" style={{ color: "rgba(237,233,254,.6)" }}>{form.forSelf ? "A leitura conversa com o seu Chamado e a sua meta." : "A leitura não usa os dados da sua jornada."}</span></div>
      <label className="text-xs" style={{ color: "rgba(237,233,254,.7)" }}>Nome completo<input style={inputStyle} className={`${input} mt-1`} value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} placeholder="Como está na certidão" /></label>
      <label className="text-xs" style={{ color: "rgba(237,233,254,.7)" }}>Data de nascimento<input style={inputStyle} type="date" className={`${input} mt-1`} value={form.birthDate} onChange={e => setForm({ ...form, birthDate: e.target.value })} /></label>
      <div className="md:col-span-2 flex flex-wrap items-center gap-3"><button type="button" disabled={!ready || generate.isPending} onClick={() => generate.mutate(form)} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50" style={{ backgroundColor: "#fde68a", color: "#16122b" }}><Sparkles size={15} /> {generate.isPending ? "Calculando..." : "Gerar meu Mapa Numerológico"}</button>
        <span className="text-xs" style={{ color: "rgba(237,233,254,.6)" }}>Use o nome de registro, com todos os sobrenomes.</span></div>
    </div>}

    {latest && <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
      <div><p className="mb-2 text-xs" style={{ color: "rgba(237,233,254,.6)" }}>{latest.input?.fullName} · {latest.input?.birthDate?.split("-").reverse().join("/")}</p><NumberGrid numbers={latest.numbers} /></div>
      <div className="space-y-4 text-sm leading-6">
        <p>{latest.report.essencia}</p>
        <div className="grid gap-2">{(Object.keys(labels) as (keyof typeof latest.report.numeros)[]).map(k => <p key={k} className="rounded-lg bg-white/5 p-3"><b style={{ color: "#fde68a" }}>{labels[k]} {latest.numbers[k]}:</b> {latest.report.numeros[k]}</p>)}</div>
        <div><p className="font-mono text-[10px] tracking-[.12em]" style={{ color: "#e4cf88" }}>FORÇAS</p><ul className="mt-1 list-disc pl-5">{latest.report.forcas.map(f => <li key={f}>{f}</li>)}</ul></div>
        <div><p className="font-mono text-[10px] tracking-[.12em]" style={{ color: "#e4cf88" }}>PONTOS DE ATENÇÃO</p><ul className="mt-1 list-disc pl-5">{latest.report.atencao.map(f => <li key={f}>{f}</li>)}</ul></div>
        <p className="rounded-lg border border-amber-200/30 p-3"><b style={{ color: "#fde68a" }}>{latest.input?.forSelf === false ? "Para refletir:" : "Na sua jornada:"}</b> {latest.report.jornada}</p>
        <p className="italic" style={{ color: "#fde68a" }}>{latest.report.pergunta}</p>
        <p className="text-xs" style={{ color: "rgba(237,233,254,.5)" }}>Números calculados pela tabela pitagórica (A=1 a I=9, acentos removidos; mestres 11, 22 e 33 preservados). A leitura é simbólica, gerada por IA: não é previsão nem diagnóstico.</p>
      </div>
    </div>}
    {data.error && <p className="mt-4 text-sm text-red-200">{data.error.message}</p>}
  </section>;
}
