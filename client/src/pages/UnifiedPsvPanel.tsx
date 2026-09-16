import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { BarChart3, BriefcaseBusiness, CalendarCheck2, CheckCircle2, ClipboardList, Plus, Target, Trash2, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import MatrixPsvPanel from "./MatrixPsvPanel";
import PsvRitualPanel from "./PsvRitualPanel";
import SpartacusPanel from "./SpartacusPanel";

type Section = "comercial" | "demandas" | "diario" | "desenvolvimento";
const today = () => new Date().toISOString().slice(0, 10);
const monday = (date: Date) => { const value = new Date(date); const day = value.getDay() || 7; value.setDate(value.getDate() - day + 1); return value; };
const dayKey = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (date: Date, amount: number) => { const value = new Date(date); value.setDate(value.getDate() + amount); return value; };

function DailyFollowUp() {
  const start = monday(new Date());
  const days = Array.from({ length: 5 }, (_, index) => addDays(start, index));
  const promises = trpc.team.promises.useQuery({});
  const save = trpc.team.savePromise.useMutation({ onSuccess: () => { promises.refetch(); toast.success("Acompanhamento diário salvo."); }, onError: error => toast.error(error.message) });
  const records = useMemo(() => new Map((promises.data ?? []).map(item => [item.promiseDate, item])), [promises.data]);
  return <section className="space-y-4"><header><p className="font-mono text-[10px] tracking-[.14em] text-emerald-600">ACOMPANHAMENTO DIÁRIO</p><h3 className="mt-2 text-2xl font-semibold text-emerald-950">Quanto preciso fazer por dia.</h3><p className="mt-1 text-sm text-emerald-800/65">Registre atividade e resultado por dia para enxergar a cadência da semana.</p></header><div className="overflow-x-auto rounded-[10px] border border-emerald-100 bg-white p-3"><table className="w-full min-w-[760px] text-left text-xs text-emerald-950"><thead className="font-mono text-[10px] uppercase text-emerald-700/65"><tr><th className="p-3">Dia</th><th className="p-3">Tarefas</th><th className="p-3">Propostas</th><th className="p-3">Clientes</th><th className="p-3">TPV</th><th className="p-3">Observação</th><th /></tr></thead><tbody>{days.map(day => { const key = dayKey(day); const item = records.get(key); return <DailyRow key={key} date={day} item={item} saving={save.isPending} onSave={values => save.mutate({ promiseDate: key, ...values, newClientsTpv: values.closedTpv })} />; })}</tbody></table></div></section>;
}
function DailyRow({ date, item, saving, onSave }: { date: Date; item?: { salesTasks?: number; proposals: number; newClients: number; closedTpv?: number; newClientsTpv: number; notes: string | null }; saving: boolean; onSave: (values: { salesTasks: number; proposals: number; newClients: number; closedTpv: number; notes: string }) => void }) {
  const [form, setForm] = useState({ salesTasks: item?.salesTasks ?? 0, proposals: item?.proposals ?? 0, newClients: item?.newClients ?? 0, closedTpv: Number(item?.closedTpv ?? item?.newClientsTpv ?? 0), notes: item?.notes ?? "" });
  const set = (field: keyof typeof form, value: string) => setForm(current => ({ ...current, [field]: field === "notes" ? value : Number(value) || 0 }));
  return <tr className="border-t border-emerald-100"><td className="p-3 font-semibold">{date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" })}</td>{(["salesTasks", "proposals", "newClients", "closedTpv"] as const).map(field => <td className="p-2" key={field}><Input className="border-emerald-100 bg-white text-emerald-950" type="number" min="0" value={form[field] || ""} onChange={event => set(field, event.target.value)} /></td>)}<td className="p-2"><Input className="min-w-36 border-emerald-100 bg-white text-emerald-950" value={form.notes} onChange={event => set("notes", event.target.value)} /></td><td className="p-2"><Button size="sm" className="bg-[#002b1d] text-white" disabled={saving} onClick={() => onSave(form)}><CheckCircle2 size={15} /></Button></td></tr>;
}

function Demands() {
  const demands = trpc.psv.demands.useQuery();
  const utils = trpc.useUtils();
  const [title, setTitle] = useState(""); const [category, setCategory] = useState("Comercial"); const [dueDate, setDueDate] = useState(today);
  const save = trpc.psv.saveDemand.useMutation({ onSuccess: async () => { await utils.psv.demands.invalidate(); setTitle(""); toast.success("Demanda adicionada."); }, onError: error => toast.error(error.message) });
  const remove = trpc.psv.removeDemand.useMutation({ onSuccess: () => utils.psv.demands.invalidate(), onError: error => toast.error(error.message) });
  const list = demands.data ?? [];
  return <section className="space-y-4"><header><p className="font-mono text-[10px] tracking-[.14em] text-emerald-600">DEMANDAS</p><h3 className="mt-2 text-2xl font-semibold text-emerald-950">Tudo que precisa acontecer, por data.</h3></header><div className="grid gap-3 rounded-[10px] border border-emerald-100 bg-white p-4 md:grid-cols-[1fr_180px_160px_auto]"><Input className="border-emerald-100 bg-white text-emerald-950" placeholder="Nova demanda" value={title} onChange={event => setTitle(event.target.value)} /><Input className="border-emerald-100 bg-white text-emerald-950" placeholder="Categoria" value={category} onChange={event => setCategory(event.target.value)} /><Input className="border-emerald-100 bg-white text-emerald-950" type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} /><Button className="bg-[#002b1d] text-white" disabled={save.isPending || !title.trim()} onClick={() => save.mutate({ title, category, dueDate })}><Plus size={16} /> Adicionar</Button></div><div className="space-y-2">{list.map(item => <div key={item.id} className={`flex items-center gap-3 rounded-lg border border-emerald-100 bg-white p-3 ${item.completed ? "opacity-55" : ""}`}><input type="checkbox" checked={item.completed} onChange={event => save.mutate({ id: item.id, title: item.title, category: item.category, dueDate: item.dueDate, completed: event.target.checked })} /><div className="min-w-0 flex-1"><b className={item.completed ? "line-through text-emerald-950" : "text-emerald-950"}>{item.title}</b><span className="ml-2 text-[10px] text-emerald-700/65">{item.category} · {new Date(`${item.dueDate}T12:00:00`).toLocaleDateString("pt-BR")}</span></div><Button variant="ghost" size="sm" className="text-red-600" onClick={() => remove.mutate({ id: item.id })}><Trash2 size={15} /></Button></div>)}{!list.length && <p className="rounded-lg border border-dashed border-emerald-200 p-5 text-sm text-emerald-700/65">Nenhuma demanda cadastrada.</p>}</div></section>;
}

function Development() {
  const dashboard = trpc.agent.dashboard.useQuery();
  const history = trpc.psv.history.useQuery();
  const latest = dashboard.data?.latestGoal;
  const plans = history.data ?? [];
  const kpi = latest?.targetTpv ? Math.round((latest.actualTpv / latest.targetTpv) * 100) : 0;
  return <section className="space-y-5"><header><p className="font-mono text-[10px] tracking-[.14em] text-emerald-600">MEU DESENVOLVIMENTO</p><h3 className="mt-2 text-2xl font-semibold text-emerald-950">Pessoal e profissional no mesmo ritmo.</h3><p className="mt-1 text-sm text-emerald-800/65">O PDI SPARTACUS continua privado e agora vive dentro da sua rotina de gestão.</p></header><div className="grid gap-3 sm:grid-cols-3"><article className="rounded-[10px] border border-emerald-100 bg-white p-4"><BarChart3 className="text-emerald-600" size={18} /><b className="mt-3 block text-2xl text-emerald-950">{kpi}%</b><span className="text-xs text-emerald-700/65">KPI de TPV atual</span></article><article className="rounded-[10px] border border-emerald-100 bg-white p-4"><Target className="text-emerald-600" size={18} /><b className="mt-3 block text-2xl text-emerald-950">{plans.length}</b><span className="text-xs text-emerald-700/65">planos SPARTACUS salvos</span></article><article className="rounded-[10px] border border-emerald-100 bg-white p-4"><UserRound className="text-emerald-600" size={18} /><b className="mt-3 block text-2xl text-emerald-950">{dashboard.data?.points ?? 0}</b><span className="text-xs text-emerald-700/65">pontos de evolução</span></article></div><SpartacusPanel /></section>;
}

export default function UnifiedPsvPanel({ profile, currentVariable, latestDetailsJson }: { profile: { targetVariable: number } | null; currentVariable: number; latestDetailsJson?: string | null }) {
  const [section, setSection] = useState<Section>("comercial");
  const tabs: Array<[Section, string, typeof BriefcaseBusiness]> = [["comercial", "Gestão comercial", BriefcaseBusiness], ["demandas", "Demandas", CheckCircle2], ["diario", "Acompanhamento diário", CalendarCheck2], ["desenvolvimento", "Meu desenvolvimento", UserRound]];
  return <div className="min-h-full rounded-xl bg-white p-4 text-emerald-950 md:p-7"><header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-emerald-100 pb-5"><div><p className="font-mono text-[10px] tracking-[.16em] text-emerald-600">PLANO SEMANAL</p><h2 className="mt-2 text-3xl font-semibold text-emerald-950">Quanto preciso fazer por dia.</h2><p className="mt-2 text-sm text-emerald-800/65">Gestão comercial, demandas, acompanhamento e desenvolvimento em um só lugar.</p></div><div className="flex items-center gap-2 text-xs text-emerald-700/65"><ClipboardList size={17} className="text-emerald-600" /> rotina viva</div></header><nav className="mb-7 flex max-w-full gap-1 overflow-x-auto rounded-[14px] border border-emerald-100 bg-[#f6f8f2] p-1">{tabs.map(([key, label, Icon]) => <button type="button" key={key} onClick={() => setSection(key)} className={`flex shrink-0 items-center gap-2 rounded-[10px] px-3 py-2 text-xs font-semibold transition ${section === key ? "bg-[#002b1d] text-white" : "text-emerald-700/70 hover:text-emerald-950"}`}><Icon size={15} />{label}</button>)}</nav>{section === "comercial" && <div className="space-y-7"><MatrixPsvPanel profile={profile} currentVariable={currentVariable} latestDetailsJson={latestDetailsJson} /><PsvRitualPanel /></div>}{section === "demandas" && <Demands />}{section === "diario" && <DailyFollowUp />}{section === "desenvolvimento" && <Development />}</div>;
}
