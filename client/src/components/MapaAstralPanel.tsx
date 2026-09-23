import { trpc } from "@/lib/trpc";
import { formatDateKeyBR } from "@shared/oraculo";
import { formatPosition, type NatalChart } from "@shared/mapaAstral";
import { Lock, MapPin, Search, Sparkles, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type City = { name: string; admin1: string; admin2?: string; country: string; latitude: number; longitude: number; timezone: string };
/** Mostra o município quando difere do nome (ex.: bairro "Caieiras" em Ipeúna) para evitar homônimos. */
const cityLabel = (c: City) => [c.name, c.admin2 && c.admin2 !== c.name ? `município de ${c.admin2}` : "", c.admin1, c.country].filter(Boolean).join(", ");

function ChartTable({ chart }: { chart: NatalChart }) {
  const rows = [
    { label: "Ascendente", pos: formatPosition(chart.ascendant.longitude), house: "1" },
    { label: "Meio do Céu", pos: formatPosition(chart.midheaven.longitude), house: "10" },
    ...chart.bodies.map(b => ({ label: b.label, pos: formatPosition(b.longitude) + (b.retrograde ? " ℞" : ""), house: String(b.house) })),
  ];
  return <div className="overflow-hidden rounded-xl border border-amber-200/25">
    <table className="w-full text-left text-sm"><thead className="bg-white/5 font-mono text-[10px] tracking-[.12em]" style={{ color: "#e4cf88" }}><tr><th className="px-3 py-2">PONTO</th><th className="px-3 py-2">POSIÇÃO</th><th className="px-3 py-2">CASA</th></tr></thead>
      <tbody>{rows.map(r => <tr key={r.label} className="border-t border-white/5"><td className="px-3 py-1.5">{r.label}</td><td className="px-3 py-1.5" style={{ color: "rgba(237,233,254,.8)" }}>{r.pos}</td><td className="px-3 py-1.5" style={{ color: "rgba(237,233,254,.6)" }}>{r.house}</td></tr>)}</tbody></table>
  </div>;
}

export default function MapaAstralPanel() {
  const utils = trpc.useUtils();
  const data = trpc.oraculo.mapaAstral.useQuery(undefined, { retry: false });
  const [form, setForm] = useState({ fullName: "", birthDate: "", birthTime: "", city: "", forSelf: true });
  const [place, setPlace] = useState<City | null>(null);
  const [query, setQuery] = useState("");
  const cities = trpc.oraculo.searchCity.useQuery({ query }, { enabled: query.length >= 2, retry: false });
  const generate = trpc.oraculo.generateMapaAstral.useMutation({ onSuccess: async () => { await utils.oraculo.mapaAstral.invalidate(); toast.success("Seu Mapa Astral está pronto."); }, onError: e => toast.error(e.message) });
  const latest = data.data?.records?.[0];
  const canGenerate = data.data?.canGenerate ?? false;
  const ready = form.fullName.trim().length >= 3 && form.birthDate && form.birthTime && place;
  const input = "w-full rounded-lg border border-amber-100/20 px-3 py-2 text-sm outline-none placeholder:text-slate-400";
  const inputStyle = { color: "#16122b" };

  return <section className="relative overflow-hidden rounded-2xl border border-amber-200/40 bg-[#201a39] p-6" style={{ color: "#f5f3ff" }}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-full border border-amber-200/40 bg-white/5"><Star size={20} color="#fde68a" /></span>
        <div><h3 className="text-xl font-semibold">Mapa Astral</h3><p className="font-mono text-[10px] tracking-[.12em]" style={{ color: "#e4cf88" }}>LIMITE: 1 POR MÊS · CÁLCULO ASTRONÔMICO + LEITURA SIMBÓLICA</p></div></div>
      {!canGenerate && data.data?.nextDateKey && <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs" style={{ color: "#fde68a" }}><Lock size={12} /> Próximo libera em {formatDateKeyBR(data.data.nextDateKey)}</span>}
    </div>

    {canGenerate && <div className="mt-5 grid gap-3 md:grid-cols-2">
      <div className="md:col-span-2 flex flex-wrap gap-2 text-sm">{[{ v: true, t: "O mapa é meu" }, { v: false, t: "É de outra pessoa" }].map(o => <button type="button" key={String(o.v)} onClick={() => setForm({ ...form, forSelf: o.v })} className="rounded-full border px-3 py-1" style={form.forSelf === o.v ? { backgroundColor: "#fde68a", color: "#16122b", borderColor: "#fde68a" } : { color: "#fde68a", borderColor: "rgba(253,230,138,.4)" }}>{o.t}</button>)}<span className="self-center text-xs" style={{ color: "rgba(237,233,254,.55)" }}>{form.forSelf ? "A leitura conversa com o seu Chamado e a sua meta." : "A leitura não usa os dados da sua jornada."}</span></div>
      <label className="text-xs md:col-span-2" style={{ color: "rgba(237,233,254,.7)" }}>Nome completo<input style={inputStyle} className={`${input} mt-1`} value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} placeholder="Como está na certidão" /></label>
      <label className="text-xs" style={{ color: "rgba(237,233,254,.7)" }}>Data de nascimento<input style={inputStyle} type="date" className={`${input} mt-1`} value={form.birthDate} onChange={e => setForm({ ...form, birthDate: e.target.value })} /></label>
      <label className="text-xs" style={{ color: "rgba(237,233,254,.7)" }}>Hora de nascimento<input style={inputStyle} type="time" className={`${input} mt-1`} value={form.birthTime} onChange={e => setForm({ ...form, birthTime: e.target.value })} /></label>
      <div className="text-xs md:col-span-2" style={{ color: "rgba(237,233,254,.7)" }}>Cidade de nascimento
        <div className="mt-1 flex gap-2"><input style={inputStyle} className={input} value={form.city} onChange={e => { setForm({ ...form, city: e.target.value }); setPlace(null); }} placeholder="Ex.: Caieiras" /><button type="button" onClick={() => setQuery(form.city.trim())} className="inline-flex items-center gap-1 rounded-lg border border-amber-200/40 px-3 text-sm" style={{ color: "#fde68a" }}><Search size={14} /> Buscar</button></div>
        {place ? <p className="mt-2 inline-flex items-center gap-1" style={{ color: "#fde68a" }}><MapPin size={12} /> {cityLabel(place)} · fuso {place.timezone}</p>
          : query && <div className="mt-2 grid gap-1">{cities.isLoading ? <span>Buscando…</span> : (cities.data ?? []).length === 0 ? <span>Nenhuma cidade encontrada.</span> : (cities.data ?? []).map(c => <button type="button" key={`${c.latitude},${c.longitude}`} onClick={() => { setPlace(c); setForm({ ...form, city: c.name }); }} className="rounded-lg bg-white/5 px-3 py-2 text-left text-sm hover:bg-white/10"><MapPin size={12} className="mr-1 inline" />{cityLabel(c)}</button>)}</div>}
      </div>
      <div className="md:col-span-2 flex flex-wrap items-center gap-3"><button type="button" disabled={!ready || generate.isPending} onClick={() => place && generate.mutate({ ...form, place })} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50" style={{ backgroundColor: "#fde68a", color: "#16122b" }}><Sparkles size={15} /> {generate.isPending ? "Calculando o céu…" : "Gerar meu Mapa Astral"}</button><span className="text-xs" style={{ color: "rgba(237,233,254,.55)" }}>Sem a hora exata, Ascendente e casas podem mudar.</span></div>
    </div>}

    {latest && <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
      <div><p className="mb-2 text-xs" style={{ color: "rgba(237,233,254,.6)" }}>{latest.input?.fullName} · {latest.input?.birthDate?.split("-").reverse().join("/")} {latest.input?.birthTime} · {latest.input?.place ? cityLabel(latest.input.place) : ""}</p><ChartTable chart={latest.chart} /></div>
      <div className="space-y-4 text-sm leading-6">
        <p>{latest.report.essencia}</p>
        <div className="grid gap-2">{(["sol", "lua", "ascendente"] as const).map(k => <p key={k} className="rounded-lg bg-white/5 p-3"><b style={{ color: "#fde68a" }}>{k === "sol" ? "Sol" : k === "lua" ? "Lua" : "Ascendente"}:</b> {latest.report.tripe[k]}</p>)}</div>
        <div><p className="font-mono text-[10px] tracking-[.12em]" style={{ color: "#e4cf88" }}>FORÇAS</p><ul className="mt-1 list-disc pl-5">{latest.report.forcas.map(f => <li key={f}>{f}</li>)}</ul></div>
        <div><p className="font-mono text-[10px] tracking-[.12em]" style={{ color: "#e4cf88" }}>PONTOS DE ATENÇÃO</p><ul className="mt-1 list-disc pl-5">{latest.report.atencao.map(f => <li key={f}>{f}</li>)}</ul></div>
        <p className="rounded-lg border border-amber-200/30 p-3"><b style={{ color: "#fde68a" }}>{latest.input?.forSelf === false ? "Para refletir:" : "Na sua jornada:"}</b> {latest.report.jornada}</p>
        <p className="italic" style={{ color: "#fde68a" }}>{latest.report.pergunta}</p>
        <p className="text-xs" style={{ color: "rgba(237,233,254,.5)" }}>Posições calculadas astronomicamente (zodíaco tropical, casas {latest.chart.houseSystem === "placidus" ? "Placidus" : "Porfírio"}). A leitura é simbólica, gerada por IA: não é previsão nem diagnóstico.</p>
      </div>
    </div>}
    {data.error && <p className="mt-4 text-sm text-red-200">{data.error.message}</p>}
  </section>;
}
