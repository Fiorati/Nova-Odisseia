import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { BarChart3, CheckCircle2, History, UsersRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function PipelinePanel() {
  const utils = trpc.useUtils();
  const pipeline = trpc.psv.pipeline.useQuery();
  const [clientName, setClientName] = useState("");
  const [tpv, setTpv] = useState(0);
  const save = trpc.psv.saveLead.useMutation({
    onSuccess: async () => {
      await utils.psv.pipeline.invalidate();
      setClientName("");
      setTpv(0);
      toast.success("Oportunidade salva no funil privado.");
    },
    onError: error => toast.error(error.message),
  });
  return (
    <section className="rounded-xl border border-emerald-100 bg-white p-5">
      <div className="flex items-center gap-2">
        <UsersRound className="text-emerald-600" size={18} />
        <div>
          <p className="font-mono text-[10px] tracking-[.13em] text-emerald-600">
            FUNIL PRIVADO DA PSV
          </p>
          <h3 className="mt-1 text-xl font-semibold">
            Clientes que você planeja fechar.
          </h3>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_auto]">
        <Input
          placeholder="Nome do cliente"
          value={clientName}
          onChange={event => setClientName(event.target.value)}
        />
        <Input
          type="number"
          min="0"
          placeholder="TPV estimado"
          value={tpv || ""}
          onChange={event => setTpv(Number(event.target.value) || 0)}
        />
        <Button
          className="bg-[#002b1d]"
          disabled={save.isPending || !clientName.trim()}
          onClick={() =>
            save.mutate({
              clientName,
              temperature: "quente",
              segmentId: "",
              segmentLabel: "",
              mcc: "",
              cnae: "",
              projectedTpv: tpv,
              nextContactAt: null,
              stage: "mapeado",
            })
          }
        >
          Adicionar
        </Button>
      </div>
      <p className="mt-3 text-xs text-emerald-700/60">
        {pipeline.data?.length ?? 0} oportunidades ·{" "}
        {brl.format(
          (pipeline.data ?? []).reduce(
            (sum, lead) => sum + lead.projectedTpv,
            0
          )
        )}{" "}
        TPV
      </p>
    </section>
  );
}

export default function MatrixPsvPanel({
  profile,
  currentVariable,
}: {
  profile: { targetVariable: number; defaultGoalTpv?: number } | null;
  currentVariable: number;
  latestDetailsJson?: string | null;
}) {
  const history = trpc.psv.history.useQuery();
  const pipeline = trpc.psv.pipeline.useQuery();
  const save = trpc.psv.save.useMutation({
    onSuccess: () => toast.success("PSV registrada no histórico."),
    onError: error => toast.error(error.message),
  });
  const [weeks, setWeeks] = useState(4);
  const [targetVariable, setTargetVariable] = useState(
    profile?.targetVariable ?? 0
  );
  const [current, setCurrent] = useState(currentVariable);
  const historicalPlans = history.data ?? [];
  const averageHistoricalTpv = historicalPlans.length
    ? historicalPlans.reduce((sum, item) => sum + item.recommendedTpv, 0) /
      historicalPlans.length
    : 0;
  const pipelineTpv = (pipeline.data ?? []).reduce(
    (sum, lead) => sum + lead.projectedTpv,
    0
  );
  const weeklyTpv = Math.max(
    averageHistoricalTpv,
    pipelineTpv / Math.max(weeks, 1),
    targetVariable > current ? (targetVariable - current) * 10 : 0
  );
  const weeklyClients = pipeline.data?.length
    ? Math.max(1, Math.ceil(pipeline.data.length / Math.max(weeks, 1)))
    : 0;
  const historyLabel = historicalPlans.length
    ? `${historicalPlans.length} plano(s) histórico(s)`
    : "sem histórico anterior";
  const savePlan = () =>
    save.mutate({
      weekOf: new Date().toISOString().slice(0, 10),
      targetVariable,
      currentVariable: current,
      plannedMultiplier: 1,
      weeksRemaining: weeks,
      recommendedTpv: weeklyTpv,
      recommendedClients30: weeklyClients,
      recommendedClients50: 0,
      recommendedClients100: 0,
      notes: `Cálculo por histórico: ${historyLabel}; TPV do funil: ${brl.format(pipelineTpv)}; média histórica: ${brl.format(averageHistoricalTpv)}.`,
    });
  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[10px] font-semibold tracking-[.14em] text-emerald-600">
          PSV / PLANEJAMENTO SEMANAL DE VENDAS
        </p>
        <h2 className="mt-2 text-3xl font-semibold">
          Planeje a semana com seus próprios dados.
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-emerald-800/65">
          A sugestão considera histórico de PSV, TPV do funil atual,
          oportunidades salvas e RV já conquistada. Nenhuma matriz é
          obrigatória.
        </p>
      </div>
      <PipelinePanel />
      <section className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
        <article className="rounded-xl border border-emerald-100 bg-white p-5">
          <div className="flex items-center gap-2">
            <History className="text-emerald-600" size={18} />
            <h3 className="font-semibold">Histórico e premissas</h3>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-xs">
              RV alvo
              <Input
                className="!text-black"
                type="number"
                min="0"
                value={targetVariable || ""}
                onChange={event =>
                  setTargetVariable(Number(event.target.value) || 0)
                }
              />
            </label>
            <label className="grid gap-1 text-xs">
              RV já conquistada
              <Input
                className="!text-black"
                type="number"
                min="0"
                value={current || ""}
                onChange={event => setCurrent(Number(event.target.value) || 0)}
              />
            </label>
            <label className="grid gap-1 text-xs">
              Semanas restantes
              <Input
                className="!text-black"
                type="number"
                min="1"
                max="5"
                value={weeks}
                onChange={event => setWeeks(Number(event.target.value) || 1)}
              />
            </label>
            <div className="rounded-lg bg-[#f6f8f2] p-3 text-xs">
              <b>{historyLabel}</b>
              <span className="mt-1 block text-emerald-700/65">
                Média semanal: {brl.format(averageHistoricalTpv)}
              </span>
            </div>
          </div>
          <Button
            className="mt-5 bg-[#002b1d]"
            onClick={savePlan}
            disabled={save.isPending}
          >
            <CheckCircle2 size={16} /> Salvar esta PSV
          </Button>
        </article>
        <article className="rounded-xl bg-[#002b1d] p-6 text-white">
          <p className="font-mono text-[10px] tracking-[.12em] text-lime-200">
            SUGESTÃO DA SEMANA
          </p>
          <strong className="mt-3 block text-4xl">
            {brl.format(weeklyTpv)}
          </strong>
          <p className="mt-1 text-sm text-emerald-100/70">
            TPV recomendado com base no histórico e no funil atual.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/15 pt-5">
            <div>
              <b className="text-xl text-lime-200">{weeklyClients}</b>
              <span className="block text-[10px] text-emerald-100/70">
                clientes sugeridos
              </span>
            </div>
            <div>
              <b className="text-xl text-lime-200">
                {pipeline.data?.length ?? 0}
              </b>
              <span className="block text-[10px] text-emerald-100/70">
                no funil atual
              </span>
            </div>
          </div>
          <p className="mt-6 flex items-center gap-2 rounded-lg bg-white/10 p-3 text-xs">
            <BarChart3 size={15} /> TPV do funil: {brl.format(pipelineTpv)}
          </p>
        </article>
      </section>
    </div>
  );
}
