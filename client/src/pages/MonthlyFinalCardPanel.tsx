import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { CalendarClock, CheckCircle2, FileCheck2, RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type CardFields = {
  globalKpi: number;
  totalMigratedTpv: number;
  multiplier: number;
  actualVariable: number;
  clients7To15: number;
  clients15To30: number;
  clients30To50: number;
  clients50To100: number;
  clients100Plus: number;
};

const blank: CardFields = { globalKpi: 0, totalMigratedTpv: 0, multiplier: 0, actualVariable: 0, clients7To15: 0, clients15To30: 0, clients30To50: 0, clients50To100: 0, clients100Plus: 0 };

function previousMonthKey() {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - 1);
  return date.toISOString().slice(0, 7);
}

function labelForMonth(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year ?? 2026, (month ?? 1) - 1, 1));
}

export default function MonthlyFinalCardPanel() {
  const [monthKey, setMonthKey] = useState(previousMonthKey);
  const [fields, setFields] = useState<CardFields>(blank);
  const utils = trpc.useUtils();
  const card = trpc.monthlyCard.get.useQuery({ monthKey });
  const save = trpc.monthlyCard.save.useMutation({
    onSuccess: async () => {
      await utils.monthlyCard.get.invalidate({ monthKey });
      toast.success("Card finalizado salvo no seu histórico privado.");
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    const source = card.data?.card ?? card.data?.suggestion;
    if (!source) return;
    setFields({
      globalKpi: source.globalKpi,
      totalMigratedTpv: source.totalMigratedTpv,
      multiplier: source.multiplier,
      actualVariable: source.actualVariable,
      clients7To15: source.clients7To15,
      clients15To30: source.clients15To30,
      clients30To50: source.clients30To50,
      clients50To100: source.clients50To100,
      clients100Plus: source.clients100Plus,
    });
  }, [card.data]);

  const setNumber = (key: keyof CardFields, value: number) => setFields(current => ({ ...current, [key]: value }));
  const resetSuggestion = () => {
    const suggestion = card.data?.suggestion;
    if (!suggestion) return;
    setFields(suggestion);
    toast.message("Campos atualizados a partir da última simulação e RMR.");
  };

  return <div className="space-y-6"><section className="ledger-surface rounded-lg border border-emerald-100 bg-white p-6 md:p-8"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="font-mono text-[10px] font-semibold tracking-[.14em] text-emerald-600">FECHAMENTO OPERACIONAL</p><h2 className="mt-2 text-3xl font-semibold tracking-[-.055em]">Card finalizado do mês anterior.</h2><p className="mt-2 max-w-2xl text-sm text-emerald-800/65">Consolide o KPI global, a Migração M1 e o mix de clientes que geraram sua RV real. O card fica privado e também alimenta o ranking anônimo Tio Patinhas quando essa opção estiver disponível.</p></div><div className="rounded-lg bg-[#0e3426] px-4 py-3 text-white"><span className="font-mono text-[10px] tracking-[.1em] text-lime-200">PERÍODO</span><b className="mt-1 block capitalize">{labelForMonth(monthKey)}</b></div></div></section>

    <section className="grid gap-4 xl:grid-cols-[1.04fr_.96fr]"><div className="rounded-xl border border-emerald-100 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-mono text-[10px] font-semibold tracking-[.12em] text-emerald-600">DADOS DO CARD</p><h3 className="mt-1 text-xl font-semibold">Resultados e mix de Migração M1</h3></div><label className="flex items-center gap-2 text-xs text-emerald-700"><CalendarClock size={15} /><span className="sr-only">Mês de referência</span><Input type="month" value={monthKey} onChange={event => setMonthKey(event.target.value || previousMonthKey())} className="w-36" /></label></div><p className="mt-2 text-xs text-emerald-700/65">{card.data?.card ? "Este período já possui um card salvo. Edite e salve para atualizar." : "Os valores iniciais são sugeridos pela sua última simulação e RMR; revise antes de fechar o mês."}</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="grid gap-1 text-xs">KPI global (%)<Input type="number" min="0" step="0.1" value={fields.globalKpi || ""} onChange={event => setNumber("globalKpi", Number(event.target.value) || 0)} /></label><label className="grid gap-1 text-xs">TPV total migrado<Input type="number" min="0" value={fields.totalMigratedTpv || ""} onChange={event => setNumber("totalMigratedTpv", Number(event.target.value) || 0)} /></label><label className="grid gap-1 text-xs">Multiplicador alcançado<Input type="number" min="0" max="3" step="0.1" value={fields.multiplier || ""} onChange={event => setNumber("multiplier", Number(event.target.value) || 0)} /></label><label className="grid gap-1 text-xs">RV realizada<Input type="number" min="0" value={fields.actualVariable || ""} onChange={event => setNumber("actualVariable", Number(event.target.value) || 0)} /></label></div>

      <div className="mt-5 border-t border-emerald-100 pt-5"><p className="font-mono text-[10px] font-semibold tracking-[.12em] text-emerald-600">CLIENTES ELEGÍVEIS POR FAIXA</p><div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><label className="grid gap-1 text-xs">Clientes de 7 a 15 mil<Input type="number" min="0" value={fields.clients7To15 || ""} onChange={event => setNumber("clients7To15", Number(event.target.value) || 0)} /></label><label className="grid gap-1 text-xs">Clientes de 15 a 30 mil<Input type="number" min="0" value={fields.clients15To30 || ""} onChange={event => setNumber("clients15To30", Number(event.target.value) || 0)} /></label><label className="grid gap-1 text-xs">Clientes de 30 a 50 mil<Input type="number" min="0" value={fields.clients30To50 || ""} onChange={event => setNumber("clients30To50", Number(event.target.value) || 0)} /></label><label className="grid gap-1 text-xs">Clientes de 50 a 100 mil<Input type="number" min="0" value={fields.clients50To100 || ""} onChange={event => setNumber("clients50To100", Number(event.target.value) || 0)} /></label><label className="grid gap-1 text-xs">Clientes de 100 mil+<Input type="number" min="0" value={fields.clients100Plus || ""} onChange={event => setNumber("clients100Plus", Number(event.target.value) || 0)} /></label></div></div>
      <div className="mt-5 flex flex-wrap gap-3"><Button className="bg-[#0e3426]" onClick={() => save.mutate({ monthKey, ...fields })} disabled={save.isPending}><CheckCircle2 size={16} /> {save.isPending ? "Salvando..." : "Salvar card final"}</Button><Button variant="outline" onClick={resetSuggestion} disabled={card.isLoading}><RefreshCcw size={16} /> Recarregar sugestão</Button></div></div>

      <article className="rounded-xl bg-[#0e3426] p-6 text-white"><p className="font-mono text-[10px] tracking-[.12em] text-lime-200">RESUMO DO MÊS</p><strong className="mt-3 block text-4xl tracking-[-.07em]">{brl.format(fields.actualVariable)}</strong><p className="mt-1 text-sm text-emerald-100/70">RV realizada para {labelForMonth(monthKey)}.</p><div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/15 pt-5"><div><b className="text-xl text-lime-200">{fields.globalKpi.toFixed(1)}%</b><span className="block text-[10px] text-emerald-100/70">KPI global</span></div><div><b className="text-xl text-lime-200">{fields.multiplier.toFixed(1)}x</b><span className="block text-[10px] text-emerald-100/70">multiplicador</span></div><div><b className="text-xl text-lime-200">{brl.format(fields.totalMigratedTpv)}</b><span className="block text-[10px] text-emerald-100/70">TPV migrado</span></div><div><b className="text-xl text-lime-200">{fields.clients7To15 + fields.clients15To30 + fields.clients30To50 + fields.clients50To100 + fields.clients100Plus}</b><span className="block text-[10px] text-emerald-100/70">clientes elegíveis</span></div></div><div className="mt-6 rounded-lg bg-white/10 p-4 text-xs leading-5 text-emerald-100/80"><FileCheck2 className="mb-2 text-lime-200" size={18} />Ao salvar, este fechamento fica no seu histórico privado. Apenas os números necessários, sem identificação nominal, poderão compor o Tio Patinhas.</div></article></section></div>;
}
