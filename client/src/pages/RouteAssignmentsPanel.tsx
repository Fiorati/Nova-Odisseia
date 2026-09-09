import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Mail, MapPinned, RefreshCw, Route, UserRoundCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const emptyAssignment = { route: "", agentName: "", agentEmail: "", regional: "", district: "", polo: "" };

export default function RouteAssignmentsPanel({ enabled }: { enabled: boolean }) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState(emptyAssignment);
  const assignments = trpc.portfolio.assignments.useQuery(undefined, { enabled });
  const assign = trpc.portfolio.assignRoute.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.portfolio.assignments.invalidate(), utils.portfolio.getForMyRoute.invalidate()]);
      setForm(emptyAssignment);
      toast.success("Titularidade da rota atualizada.");
    },
    onError: error => toast.error(error.message),
  });

  if (!enabled) return null;

  return (
    <section className="rounded-xl border border-emerald-100 bg-white p-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="font-mono text-[10px] font-semibold tracking-[.13em] text-emerald-600">TITULARIDADE FORMAL</p>
          <h3 className="mt-1 text-xl font-semibold tracking-[-.04em]">Rotas e responsáveis.</h3>
          <p className="mt-1 max-w-2xl text-sm text-emerald-800/65">A atribuição por e-mail vale mesmo antes do primeiro acesso. Ao se cadastrar, o agente recebe somente as rotas vinculadas ao seu e-mail.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-md bg-lime-100 px-3 py-2 text-xs font-medium text-emerald-950"><UserRoundCheck size={15} /> {assignments.data?.length ?? 0} rota(s) no escopo</span>
      </div>

      <div className="mt-5 grid gap-3 rounded-lg bg-[#f6f8f2] p-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="grid gap-1 text-xs font-medium text-emerald-950">Rota<Input value={form.route} onChange={event => setForm(current => ({ ...current, route: event.target.value }))} placeholder="Ex.: Rota 04" /></label>
        <label className="grid gap-1 text-xs font-medium text-emerald-950">Nome do agente<Input value={form.agentName} onChange={event => setForm(current => ({ ...current, agentName: event.target.value }))} placeholder="Nome completo" /></label>
        <label className="grid gap-1 text-xs font-medium text-emerald-950">E-mail Stone do agente<Input type="email" value={form.agentEmail} onChange={event => setForm(current => ({ ...current, agentEmail: event.target.value }))} placeholder="agente@stone.com.br" /></label>
        <label className="grid gap-1 text-xs font-medium text-emerald-950">Regional <Input value={form.regional} onChange={event => setForm(current => ({ ...current, regional: event.target.value }))} placeholder="Opcional" /></label>
        <label className="grid gap-1 text-xs font-medium text-emerald-950">Distrito <Input value={form.district} onChange={event => setForm(current => ({ ...current, district: event.target.value }))} placeholder="Opcional" /></label>
        <label className="grid gap-1 text-xs font-medium text-emerald-950">Polo <Input value={form.polo} onChange={event => setForm(current => ({ ...current, polo: event.target.value }))} placeholder="Opcional" /></label>
        <div className="flex items-end"><Button className="w-full bg-[#0e3426]" disabled={assign.isPending || !form.route.trim() || !form.agentEmail.trim()} onClick={() => assign.mutate(form)}>{assign.isPending ? <RefreshCw className="animate-spin" size={16} /> : <Route size={16} />} {assign.isPending ? "Salvando..." : "Atribuir rota"}</Button></div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className="border-b border-emerald-100 font-mono text-[10px] uppercase tracking-[.08em] text-emerald-700/65"><tr><th className="pb-3">Rota</th><th className="pb-3">Responsável</th><th className="pb-3">E-mail</th><th className="pb-3">Polo / distrito</th><th className="pb-3">Situação</th></tr></thead>
          <tbody>
            {assignments.isLoading && <tr><td colSpan={5} className="py-6 text-emerald-700/65">Carregando titularidades...</td></tr>}
            {assignments.data?.map(item => <tr className="border-b border-emerald-50" key={item.id}><td className="py-3 font-semibold"><MapPinned className="mr-1 inline text-emerald-600" size={14} />{item.route}</td><td className="py-3">{item.agentName || "—"}</td><td className="py-3 text-emerald-700/70"><Mail className="mr-1 inline" size={13} />{item.agentEmail || "—"}</td><td className="py-3 text-emerald-700/70">{item.polo || "Polo não informado"}<small className="block text-emerald-700/50">{item.district || "Distrito não informado"}</small></td><td className="py-3"><span className={`rounded px-2 py-1 ${item.userId ? "bg-lime-100 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>{item.userId ? "Vinculada" : "Aguardando cadastro"}</span></td></tr>)}
            {!assignments.isLoading && !assignments.data?.length && <tr><td colSpan={5} className="py-7 text-center text-emerald-700/65">Cadastre a primeira rota para formalizar o acesso às carteiras.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
