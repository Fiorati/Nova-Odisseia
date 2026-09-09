import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { gapToTarget, weeklyPace } from "@shared/nordic";
import { formatSemesterLabel, monthLabel, recentSemesterOptions, semesterKeyForMonth } from "@shared/semesterComparison";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { BarChart3, CalendarDays, CheckCircle2, ClipboardCheck, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

type PeriodForm = {
  targetSalesTasks: number; targetProposals: number; targetClients7To15: number; targetClients15To30: number; targetClients30To50: number; targetClients50To100: number; targetClients100To200: number; targetClients200Plus: number; targetTpv: number;
  averageRv7To15: number; averageRv15To30: number; averageRv30To50: number; averageRv50To100: number; averageRv100Plus: number;
  actualSalesTasks: number; actualProposals: number; actualClients7To15: number; actualClients15To30: number; actualClients30To50: number; actualClients50To100: number; actualClients100To200: number; actualClients200Plus: number; actualTpv: number;
};

const defaults: PeriodForm = {
  targetSalesTasks: 0, targetProposals: 0, targetClients7To15: 0, targetClients15To30: 0, targetClients30To50: 0, targetClients50To100: 0, targetClients100To200: 0, targetClients200Plus: 0, targetTpv: 0,
  averageRv7To15: 50, averageRv15To30: 80, averageRv30To50: 150, averageRv50To100: 300, averageRv100Plus: 800,
  actualSalesTasks: 0, actualProposals: 0, actualClients7To15: 0, actualClients15To30: 0, actualClients30To50: 0, actualClients50To100: 0, actualClients100To200: 0, actualClients200Plus: 0, actualTpv: 0,
};

const tiers = [
  ["7–15k", "targetClients7To15", "actualClients7To15", "averageRv7To15"],
  ["15–30k", "targetClients15To30", "actualClients15To30", "averageRv15To30"],
  ["30–50k", "targetClients30To50", "actualClients30To50", "averageRv30To50"],
  ["50–100k", "targetClients50To100", "actualClients50To100", "averageRv50To100"],
  ["100k+", "targetClients100To200", "actualClients100To200", "averageRv100Plus"],
] as const;

function currentMonthKey() { return new Date().toISOString().slice(0, 7); }
const semesterChartConfig = { actualTpv: { label: "TPV realizado", color: "#047857" }, targetTpv: { label: "Meta de TPV", color: "#bef264" } } satisfies ChartConfig;
const semesterOptions = recentSemesterOptions();

function SemesterComparisonChart({ semesterKey, entries, isLoading }: { semesterKey: string; entries: { monthKey: string; targetTpv: number | null; actualTpv: number | null; hasRecord: boolean }[]; isLoading: boolean }) {
  const chartData = entries.map(item => ({ ...item, month: monthLabel(item.monthKey) }));
  const hasData = entries.some(item => item.hasRecord);

  return <section className="rounded-xl border border-emerald-100 bg-white p-5 md:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-start gap-3"><div className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><BarChart3 size={18} /></div><div><p className="font-mono text-[10px] font-semibold tracking-[.12em] text-emerald-600">COMPARATIVO SEMESTRAL</p><h3 className="mt-1 text-xl font-semibold">TPV mês a mês</h3><p className="mt-1 text-sm text-emerald-800/65">Meta e realizado dos seis meses de {formatSemesterLabel(semesterKey)}.</p></div></div><span className="w-fit rounded-full bg-[#f5f8f2] px-3 py-1 text-xs font-medium text-emerald-800">Registros privados</span></div>{isLoading ? <div className="mt-5 h-[260px] animate-pulse rounded-lg bg-[#f5f8f2]" aria-label="Carregando comparativo semestral" /> : hasData ? <><div className="mt-5" role="img" aria-label={`Gráfico de barras do ${formatSemesterLabel(semesterKey)} comparando a meta de TPV ao realizado em cada mês`}><ChartContainer config={semesterChartConfig} className="h-[260px] w-full aspect-auto"><BarChart accessibilityLayer data={chartData} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}><CartesianGrid vertical={false} stroke="#d1fae5" /><XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={10} /><YAxis tickLine={false} axisLine={false} tickMargin={10} tickFormatter={value => `${Math.round(Number(value) / 1000)}k`} width={42} /><ChartTooltip cursor={{ fill: "#ecfdf5" }} content={<ChartTooltipContent labelFormatter={label => `${label} · ${formatSemesterLabel(semesterKey)}`} formatter={(value, name) => <div className="flex w-full items-center justify-between gap-4"><span className="text-muted-foreground">{String(name) === "actualTpv" ? "TPV realizado" : String(name) === "targetTpv" ? "Meta de TPV" : name}</span><span className="font-mono font-semibold text-emerald-950">{brl.format(Number(value))}</span></div>} />} /><Bar dataKey="targetTpv" name="targetTpv" fill="var(--color-targetTpv)" radius={[5, 5, 0, 0]} /><Bar dataKey="actualTpv" name="actualTpv" fill="var(--color-actualTpv)" radius={[5, 5, 0, 0]} /></BarChart></ChartContainer></div><ul className="sr-only">{entries.map(item => <li key={item.monthKey}>{item.hasRecord ? `${monthLabel(item.monthKey)}: meta de TPV ${brl.format(item.targetTpv ?? 0)}; TPV realizado ${brl.format(item.actualTpv ?? 0)}.` : `${monthLabel(item.monthKey)}: sem registro salvo.`}</li>)}</ul><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-emerald-800/70"><span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-emerald-700" />TPV realizado</span><span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-lime-300" />Meta de TPV</span><span>{entries.filter(item => item.hasRecord).length} de 6 meses com registro</span></div></> : <div className="mt-5 rounded-lg border border-dashed border-emerald-200 bg-[#f5f8f2] p-4 text-sm text-emerald-800/70"><b className="text-emerald-950">Ainda não há períodos salvos neste semestre.</b><p className="mt-1">Quando você salvar os dados de cada mês, as barras serão preenchidas aqui sem inventar resultados.</p></div>}</section>;
}

function businessDaysRemaining() {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  let count = 0;
  for (let day = new Date(now); day <= end; day.setDate(day.getDate() + 1)) if (day.getDay() > 0 && day.getDay() < 6) count += 1;
  return count;
}

export default function QuickPeriodPanel({ onOpenPsv }: { onOpenPsv: () => void }) {
  const [monthKey, setMonthKey] = useState(currentMonthKey);
  const [semesterKey, setSemesterKey] = useState(() => semesterKeyForMonth(currentMonthKey()));
  const period = trpc.nordic.get.useQuery({ monthKey, semesterKey });
  const selectableSemesters = useMemo(() => {
    const selectedKey = semesterKeyForMonth(monthKey);
    const selectedOption = { key: selectedKey, label: formatSemesterLabel(selectedKey) };
    return [selectedOption, ...semesterOptions].filter((option, index, options) => options.findIndex(candidate => candidate.key === option.key) === index);
  }, [monthKey]);
  const utils = trpc.useUtils();
  const [form, setForm] = useState<PeriodForm>(defaults);
  const update = <K extends keyof PeriodForm>(key: K, value: number) => setForm(current => ({ ...current, [key]: Math.max(Number(value) || 0, 0) }));
  const save = trpc.nordic.savePlan.useMutation({
    onSuccess: async () => { await utils.nordic.get.invalidate({ monthKey }); toast.success("Período atualizado com os dados informados."); },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    const plan = period.data?.plan;
    if (plan) { const { id, userId, monthKey: _month, createdAt, updatedAt, ...values } = plan; setForm(values); return; }
    const rmr = period.data?.latestRmr;
    const card = period.data?.finalCard;
    setForm(current => ({ ...defaults, ...current, actualSalesTasks: rmr?.salesTasks ?? 0, actualProposals: rmr?.proposals ?? 0, actualClients7To15: card?.clients7To15 ?? 0, actualClients15To30: card?.clients15To30 ?? 0, actualClients30To50: card?.clients30To50 ?? 0, actualClients50To100: card?.clients50To100 ?? 0, actualClients100To200: card?.clients100Plus ?? 0, actualTpv: card?.totalMigratedTpv ?? rmr?.closedTpv ?? 0 }));
  }, [period.data]);

  const totalTargetClients = useMemo(() => tiers.reduce((total, [, target]) => total + form[target], 0), [form]);
  const totalActualClients = useMemo(() => tiers.reduce((total, [, , actual]) => total + form[actual], 0), [form]);
  const projectedRv = useMemo(() => form.targetClients7To15 * form.averageRv7To15 + form.targetClients15To30 * form.averageRv15To30 + form.targetClients30To50 * form.averageRv30To50 + form.targetClients50To100 * form.averageRv50To100 + (form.targetClients100To200 + form.targetClients200Plus) * form.averageRv100Plus, [form]);
  const tpvGap = gapToTarget(form.targetTpv, form.actualTpv);
  const clientsGap = gapToTarget(totalTargetClients, totalActualClients);
  const days = businessDaysRemaining();
  const proposalConversion = form.actualSalesTasks ? form.actualProposals / form.actualSalesTasks * 100 : 0;
  const closingConversion = form.actualProposals ? totalActualClients / form.actualProposals * 100 : 0;

  return <div className="space-y-6"><section className="rounded-2xl bg-[#0e3426] p-6 text-white md:p-8"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="font-mono text-[10px] font-semibold tracking-[.14em] text-lime-200">PERÍODO / MODO RÁPIDO</p><h2 className="mt-2 text-3xl font-semibold tracking-[-.06em]">Gestão do mês sem montar cliente por cliente.</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-100/75">Defina a quantidade que quer trazer por tier. As médias de RV vêm preenchidas e você pode ajustá-las quando necessário.</p></div><div className="flex flex-wrap gap-3"><label className="grid gap-1 text-xs text-emerald-100/75"><span>Semestre do gráfico</span><select value={semesterKey} onChange={event => { const selected = selectableSemesters.find(option => option.key === event.target.value); if (selected) setSemesterKey(selected.key); }} className="h-10 rounded-md border border-white/20 bg-white/10 px-3 text-sm text-white outline-none">{selectableSemesters.map(option => <option key={option.key} value={option.key} className="text-emerald-950">{option.label}</option>)}</select></label><label className="grid gap-1 text-xs text-emerald-100/75"><span>Mês de referência</span><Input type="month" value={monthKey} onChange={event => { const nextMonth = event.target.value || currentMonthKey(); setMonthKey(nextMonth); setSemesterKey(semesterKeyForMonth(nextMonth)); }} className="w-40 border-white/20 bg-white/10 text-white" /></label></div></div></section>

    <SemesterComparisonChart semesterKey={semesterKey} entries={period.data?.semesterComparison ?? []} isLoading={period.isLoading} />

    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><article className="rounded-xl border border-lime-300 bg-lime-100 p-5 text-emerald-950"><p className="font-mono text-[10px] tracking-[.12em]">RV PROJETADA</p><strong className="mt-3 block text-3xl">{brl.format(projectedRv)}</strong><span className="mt-2 block text-xs opacity-70">média dos tiers planejados</span></article><article className="rounded-xl border border-emerald-100 bg-white p-5"><p className="font-mono text-[10px] tracking-[.12em] text-emerald-600">META DE CLIENTES</p><strong className="mt-3 block text-3xl">{totalTargetClients}</strong><span className="mt-2 block text-xs text-emerald-700/65">{totalActualClients} realizados</span></article><article className="rounded-xl border border-emerald-100 bg-white p-5"><p className="font-mono text-[10px] tracking-[.12em] text-emerald-600">GAP TPV</p><strong className="mt-3 block text-3xl">{brl.format(tpvGap)}</strong><span className="mt-2 block text-xs text-emerald-700/65">ritmo: {brl.format(weeklyPace(tpvGap, days))}/semana</span></article><article className="rounded-xl border border-emerald-100 bg-white p-5"><p className="font-mono text-[10px] tracking-[.12em] text-emerald-600">GAP CLIENTES</p><strong className="mt-3 block text-3xl">{clientsGap}</strong><span className="mt-2 block text-xs text-emerald-700/65">ritmo: {weeklyPace(clientsGap, days)} por semana</span></article></section>

    <section className="rounded-xl border border-emerald-100 bg-white p-5"><div className="flex items-center gap-3"><CalendarDays className="text-emerald-600" /><div><p className="font-mono text-[10px] font-semibold tracking-[.12em] text-emerald-600">PLANO × REALIZADO</p><h3 className="mt-1 text-xl font-semibold">Objetivos e execução do mês.</h3></div></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[800px] text-left text-xs"><thead className="border-b border-emerald-100 font-mono text-[10px] uppercase tracking-[.08em] text-emerald-700/65"><tr><th className="pb-3">Indicador</th><th className="pb-3">Plano</th><th className="pb-3">Realizado</th><th className="pb-3">GAP</th><th className="pb-3">RV média</th></tr></thead><tbody><tr className="border-b border-emerald-50"><td className="py-3 font-semibold">Tarefas de venda</td><td><Input type="number" value={form.targetSalesTasks} onChange={e => update("targetSalesTasks", Number(e.target.value))} /></td><td><Input type="number" value={form.actualSalesTasks} onChange={e => update("actualSalesTasks", Number(e.target.value))} /></td><td>{gapToTarget(form.targetSalesTasks, form.actualSalesTasks)}</td><td>—</td></tr><tr className="border-b border-emerald-50"><td className="py-3 font-semibold">Novas propostas</td><td><Input type="number" value={form.targetProposals} onChange={e => update("targetProposals", Number(e.target.value))} /></td><td><Input type="number" value={form.actualProposals} onChange={e => update("actualProposals", Number(e.target.value))} /></td><td>{gapToTarget(form.targetProposals, form.actualProposals)}</td><td>—</td></tr>{tiers.map(([label, target, actual, average]) => <tr className="border-b border-emerald-50" key={label}><td className="py-3 font-semibold">Clientes {label}</td><td><Input type="number" value={form[target]} onChange={e => update(target, Number(e.target.value))} /></td><td><Input type="number" value={form[actual]} onChange={e => update(actual, Number(e.target.value))} /></td><td>{gapToTarget(form[target], form[actual])}</td><td><Input type="number" value={form[average]} onChange={e => update(average, Number(e.target.value))} /></td></tr>)}<tr><td className="py-3 font-semibold">TPV total</td><td><Input type="number" value={form.targetTpv} onChange={e => update("targetTpv", Number(e.target.value))} /></td><td><Input type="number" value={form.actualTpv} onChange={e => update("actualTpv", Number(e.target.value))} /></td><td>{brl.format(tpvGap)}</td><td>—</td></tr></tbody></table></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-lg bg-[#f6f8f2] p-3 text-sm"><b>{proposalConversion.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</b><span className="ml-1 text-emerald-700/65">conversão de tarefa em proposta</span></div><div className="rounded-lg bg-[#f6f8f2] p-3 text-sm"><b>{closingConversion.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</b><span className="ml-1 text-emerald-700/65">conversão de proposta em cliente</span></div></div><div className="mt-5 flex flex-wrap gap-3"><Button className="bg-[#0e3426]" onClick={() => save.mutate({ monthKey, ...form })} disabled={save.isPending}><CheckCircle2 size={16} /> {save.isPending ? "Salvando..." : "Salvar período"}</Button><Button variant="outline" className="border-emerald-200 text-emerald-800" onClick={onOpenPsv}><ClipboardCheck size={16} /> Usar como base da PSV</Button><span className="ml-auto inline-flex items-center gap-2 text-xs text-emerald-700/65"><TrendingUp size={15} /> {number.format(days)} dias úteis restantes</span></div></section>
  </div>;
}
