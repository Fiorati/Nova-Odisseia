import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { gapToTarget, weeklyPace } from "@shared/nordic";
import { NordicCompassEmblem } from "@/components/emblems";
import {
  CalendarPlus,
  Check,
  CheckCircle2,
  Flame,
  ListChecks,
  MapPinned,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const month = () => new Date().toISOString().slice(0, 7);
const toLocalDatetime = (date: Date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
function businessDaysRemaining() {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  let total = 0;
  for (let day = new Date(now); day <= end; day.setDate(day.getDate() + 1))
    if (day.getDay() > 0 && day.getDay() < 6) total += 1;
  return total;
}
function tierLabel(tpv: number) {
  if (tpv >= 200000) return "200k+";
  if (tpv >= 100000) return "100–200k";
  if (tpv >= 50000) return "50–100k";
  if (tpv >= 30000) return "30–50k";
  if (tpv >= 15000) return "15–30k";
  return "7–15k";
}

type SpartaLead = {
  id: number;
  clientName: string;
  projectedTpv: number;
  stage: string;
  temperature: "frio" | "quente";
  helpRequest: string;
};

export function selectImageFiles(
  files: FileList | File[] | null | undefined,
  maxFiles = 8,
) {
  const images = Array.from(files ?? []).filter(file =>
    file.type.startsWith("image/")
  );

  return images.slice(0, maxFiles);
}

export function removeItemById<T extends { id: number }>(items: T[], id: number) {
  return items.filter(item => item.id !== id);
}

function normalizeSpreadsheetValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value === "string") return value.trim();
  return String(value).trim();
}

function parseSpreadsheetNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = normalizeSpreadsheetValue(value)
    .replace(/R\$\s*/gi, "")
    .replace(/\s+/g, "")
    .replace(".", "")
    .replace(",", ".");

  if (!text) return 0;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : 0;
}

function spreadsheetStage(value: unknown): string {
  const text = normalizeSpreadsheetValue(value).toLowerCase();
  if (!text) return "Mapeado";
  if (text.includes("qualific")) return "Qualificando";
  if (text.includes("negoci")) return "Negociando";
  if (text.includes("fech")) return "Fechamento";
  if (text.includes("perd")) return "Perdido";
  if (text.includes("cred")) return "Credenciado";
  if (text.includes("ativ")) return "Ativado";
  if (text.includes("mape")) return "Mapeado";
  return "Mapeado";
}

function spreadsheetTemperature(value: unknown): "frio" | "quente" {
  const text = normalizeSpreadsheetValue(value).toLowerCase();
  return text.includes("quente") || text.includes("hot") || text.includes("alta")
    ? "quente"
    : "frio";
}

export async function parseSpreadsheetLeads(file: File | Blob | null | undefined) {
  if (!file) return [] as Array<SpartaLead>;

  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  const candidates: SpartaLead[] = rows
    .map((row, index) => {
      const clientName =
        normalizeSpreadsheetValue(row["Nome"]) ||
        normalizeSpreadsheetValue(row["nome"]) ||
        normalizeSpreadsheetValue(row["Nome da loja"]) ||
        normalizeSpreadsheetValue(row["Loja"]) ||
        normalizeSpreadsheetValue(row["Cliente"]) ||
        "";

      const projectedTpv =
        parseSpreadsheetNumber(row["TPV"]) ||
        parseSpreadsheetNumber(row["tpv"]) ||
        parseSpreadsheetNumber(row["TPV2"]) ||
        parseSpreadsheetNumber(row["último tpv"]) ||
        parseSpreadsheetNumber(row["ultimo tpv"]) ||
        parseSpreadsheetNumber(row["Valor"]) ||
        0;

      if (!clientName || projectedTpv <= 0) return null;

      return {
        id: -Date.now() - index,
        clientName,
        projectedTpv,
        stage: spreadsheetStage(
          row["Status"] || row["status"] || row["Etapa"] || row["etapa"]
        ),
        temperature: spreadsheetTemperature(
          row["Status"] ||
            row["status"] ||
            row["Temperatura"] ||
            row["temperatura"]
        ),
        helpRequest: "",
      } satisfies SpartaLead;
    })
    .filter((row): row is SpartaLead => row !== null);

  return candidates;
}

const spartaStages = [
  "Mapeado",
  "Planejado",
  "Qualificando",
  "Negociando",
  "Fechamento",
  "Perdido",
  "Credenciado",
  "Ativado",
];

function SpartaFunnel({
  leads,
}: {
  leads: Array<{
    id: number;
    clientName: string;
    projectedTpv: number;
    stage: string;
    temperature: "frio" | "quente";
  }>;
}) {
  const saveUtils = trpc.useUtils();
  const saveLead = trpc.psv.saveLead.useMutation({
    onSuccess: async () => { await saveUtils.psv.pipeline.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const [imageNames, setImageNames] = useState<string[]>([]);
  const [manualName, setManualName] = useState("");
  const [manualTpv, setManualTpv] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [rows, setRows] = useState<SpartaLead[]>(() =>
    leads.map(lead => ({ ...lead, helpRequest: "" }))
  );
  useEffect(
    () =>
      setRows(current =>
        current.length
          ? current
          : leads.map(lead => ({ ...lead, helpRequest: "" }))
      ),
    [leads]
  );
  const addManual = () => {
    if (!manualName.trim()) return;
    setRows(current => [
      ...current,
      {
        id: -Date.now(),
        clientName: manualName.trim(),
        projectedTpv: manualTpv,
        stage: "Mapeado",
        temperature: "frio",
        helpRequest: "",
      },
    ]);
    setManualName("");
    setManualTpv(0);
  };

  const removeRow = (id: number) => {
    setRows(current => removeItemById(current, id));
  };
  const saveRows = async () => {
    try {
      for (const row of rows) {
        await saveLead.mutateAsync({ clientName: row.clientName, temperature: row.temperature, segmentId: "sparta", segmentLabel: "Estratégia Sparta", mcc: "", cnae: "", projectedTpv: row.projectedTpv, nextContactAt: null, stage: row.stage === "Negociando" ? "negociacao" : row.stage === "Qualificando" ? "qualificando" : row.stage === "Planejado" ? "planejado" : "mapeado" });
      }
      toast.success(`${rows.length} cliente(s) salvo(s) no funil privado da PSV.`);
    } catch {
      toast.error("Não foi possível salvar todos os clientes da planilha.");
    }
  };

  const handleSpreadsheetImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const imported = await parseSpreadsheetLeads(file);
      if (!imported.length) {
        toast.error("A planilha não contém colunas de Nome e TPV válidas.");
        event.currentTarget.value = "";
        return;
      }

      setRows(current => [...imported, ...current]);
      setImportedCount(imported.length);
      toast.success(`${imported.length} cliente(s) importado(s) para o funil.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível importar a planilha.");
    } finally {
      event.currentTarget.value = "";
    }
  };

  return (
    <article className="rounded-xl border border-emerald-100 bg-white p-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="font-mono text-[10px] font-semibold tracking-[.12em] text-emerald-600">
            ESTRATÉGIA SPARTA
          </p>
          <h3 className="mt-1 text-xl font-semibold">
            Funil anexado, ação acompanhada.
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-emerald-800/65">
            Anexe até 8 imagens do Super Pipe para manter a leitura operacional
            no mesmo lugar. Os registros autorizados do funil já aparecem abaixo;
            a transcrição automática será conectada ao processamento de imagem.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-[#002b1d] px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-900">
            <Upload size={15} /> Importar planilha
            <input
              className="sr-only"
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleSpreadsheetImport}
            />
          </label>
          <Button variant="outline" onClick={addManual}>
            <Plus size={15} /> Adicionar manualmente
          </Button>
        </div>
      </div>
      {importedCount > 0 && (
        <p className="mt-3 rounded-lg bg-lime-50 p-3 text-xs text-emerald-900">
          Planilha importada: <b>{importedCount}</b> cliente(s) incluído(s) no funil.
          Ajuste etapa, temperatura e pedidos de ajuda abaixo antes de prosseguir.
        </p>
      )}
      {rows.length > 0 && <Button className="mt-3 bg-[#002b1d]" disabled={saveLead.isPending} onClick={saveRows}><CheckCircle2 size={15} /> {saveLead.isPending ? "Salvando clientes..." : "Salvar clientes no funil"}</Button>}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Input
          value={manualName}
          onChange={event => setManualName(event.target.value)}
          placeholder="Cliente para adicionar manualmente"
        />
        <Input
          type="number"
          min="0"
          value={manualTpv}
          onChange={event => setManualTpv(Number(event.target.value) || 0)}
          placeholder="TPV projetado"
        />
      </div>
      <div className="mt-5 space-y-3">
        {rows.map(row => (
          <div
            className="grid gap-3 rounded-lg bg-[#f6f8f2] p-4 lg:grid-cols-[1.3fr_.5fr_.8fr_1.4fr]"
            key={row.id}
          >
            <div>
              <b>{row.clientName}</b>
              <span className="mt-1 block text-xs text-emerald-700/60">
                {brl.format(row.projectedTpv)} · {tierLabel(row.projectedTpv)}
              </span>
            </div>
            <button
              type="button"
              aria-label={`Remover ${row.clientName} do funil`}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100"
              onClick={() => removeRow(row.id)}
            >
              <Trash2 size={16} />
            </button>
            <button
              type="button"
              aria-label={`Marcar ${row.clientName} como ${row.temperature === "quente" ? "frio" : "quente"}`}
              className={`flex h-9 w-9 items-center justify-center rounded-full border ${row.temperature === "quente" ? "border-orange-300 bg-orange-100 text-orange-600" : "border-slate-200 bg-white text-slate-400"}`}
              onClick={() =>
                setRows(current =>
                  current.map(item =>
                    item.id === row.id
                      ? {
                          ...item,
                          temperature:
                            item.temperature === "quente" ? "frio" : "quente",
                        }
                      : item
                  )
                )
              }
            >
              <Flame size={18} />
            </button>
            <select
              aria-label={`Etapa de ${row.clientName}`}
              value={row.stage}
              onChange={event =>
                setRows(current =>
                  current.map(item =>
                    item.id === row.id
                      ? { ...item, stage: event.target.value }
                      : item
                  )
                )
              }
            >
              <option value="">Selecionar etapa</option>
              {spartaStages.map(stage => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
            <Input
              aria-label={`Pedidos de ajuda de ${row.clientName}`}
              value={row.helpRequest}
              onChange={event =>
                setRows(current =>
                  current.map(item =>
                    item.id === row.id
                      ? { ...item, helpRequest: event.target.value }
                      : item
                  )
                )
              }
              placeholder="Pedidos de ajuda"
            />
          </div>
        ))}
        {!rows.length && (
          <p className="rounded-lg bg-[#f6f8f2] p-5 text-sm text-emerald-700/65">
            Importe uma planilha ou adicione o primeiro cliente do funil.
          </p>
        )}
      </div>
    </article>
  );
}

export default function NordicStrategyPanel({
  onOpenPeriod,
}: {
  onOpenPeriod: () => void;
}) {
  const [monthKey, setMonthKey] = useState(month);
  const strategy = trpc.nordic.get.useQuery({ monthKey });
  const utils = trpc.useUtils();
  const [activationName, setActivationName] = useState("");
  const [activationRealTpv, setActivationRealTpv] = useState(0);
  const [activationTpv, setActivationTpv] = useState(0);
  const [activationRv, setActivationRv] = useState(0);
  const [area, setArea] = useState("");
  const [routeClient, setRouteClient] = useState("");
  const [visitAt, setVisitAt] = useState(() => toLocalDatetime(new Date()));
  const [objective, setObjective] = useState("Visita de diagnóstico");
  const [routeStatus, setRouteStatus] = useState<
    "planejada" | "concluida" | "remarcada"
  >("planejada");
  const refresh = () => utils.nordic.get.invalidate({ monthKey });
  const activation = trpc.nordic.saveActivation.useMutation({
    onSuccess: () => {
      refresh();
      setActivationName("");
      setActivationRealTpv(0);
      setActivationTpv(0);
      setActivationRv(0);
      toast.success("Ativação incluída na Estratégia Nórdica.");
    },
    onError: error => toast.error(error.message),
  });
  const route = trpc.nordic.saveMicroRoute.useMutation({
    onSuccess: () => {
      refresh();
      setRouteClient("");
      setArea("");
      toast.success("Visita incluída na microrrota.");
    },
    onError: error => toast.error(error.message),
  });
  const completeActivation = trpc.nordic.saveActivation.useMutation({
    onSuccess: refresh,
    onError: error => toast.error(error.message),
  });
  const removeActivation = trpc.nordic.removeActivation.useMutation({
    onSuccess: () => {
      refresh();
      toast.success("Ativação removida do checklist.");
    },
    onError: error => toast.error(error.message),
  });
  const [editingActivationId, setEditingActivationId] = useState<
    number | null
  >(null);
  const [editActivationDraft, setEditActivationDraft] = useState({
    clientName: "",
    realTpv: 0,
    projectedTpv: 0,
    estimatedVariable: 0,
  });
  const updateActivation = trpc.nordic.saveActivation.useMutation({
    onSuccess: () => {
      refresh();
      setEditingActivationId(null);
      toast.success("Ativação atualizada.");
    },
    onError: error => toast.error(error.message),
  });
  const items = strategy.data?.activationPlans ?? [];
  const routes = strategy.data?.microRoutes ?? [];
  const activationTpvTotal = useMemo(
    () => items.reduce((total, item) => total + item.projectedTpv, 0),
    [items]
  );
  const plan = strategy.data?.plan;
  const actualTpv =
    plan?.actualTpv ??
    strategy.data?.finalCard?.totalMigratedTpv ??
    strategy.data?.latestRmr?.closedTpv ??
    0;
  const targetTpv = plan?.targetTpv ?? strategy.data?.latestRmr?.goalTpv ?? 0;
  const tpvGap = gapToTarget(targetTpv, actualTpv);
  const daysRemaining = businessDaysRemaining();
  const authorizedPortfolioLeads = strategy.data?.routePortfolioLeads ?? [];
  const [selectedPortfolioIds, setSelectedPortfolioIds] = useState<number[]>([]);
  const removePortfolioEntries = trpc.portfolio.removeEntries.useMutation({
    onSuccess: async () => {
      setSelectedPortfolioIds([]);
      await Promise.all([utils.nordic.get.invalidate({ monthKey }), utils.portfolio.getForMyRoute.invalidate({ portfolioType: "route" })]);
      toast.success("Clientes removidos da carteira importada.");
    },
    onError: error => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-[#002b1d] p-6 text-white md:p-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="flex items-start gap-4">
            <NordicCompassEmblem size={48} />
            <div>
              <p className="font-mono text-[10px] font-semibold tracking-[.14em] text-lime-200">
                ESTRATÉGIA NÓRDICA
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-.06em]">
                Rotina operacional para transformar plano em cadência.
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-100/75">
                Conecte o período do mês, os funis de PSV, as ativações e as
                visitas. Listas derivadas mostram somente dados reais já
                registrados.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-xs text-emerald-100/75">
              <span>Competência</span>
              <Input
                type="month"
                value={monthKey}
                onChange={event => setMonthKey(event.target.value || month())}
                className="w-40 border-white/20 bg-white/10 text-white"
              />
            </label>
            <Button
              className="bg-lime-200 text-emerald-950 hover:bg-lime-100"
              onClick={onOpenPeriod}
            >
              <Sparkles size={16} /> Atualizar período
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <article className="rounded-xl border border-emerald-100 bg-white p-5">
          <p className="font-mono text-[10px] tracking-[.12em] text-emerald-600">
            PLANO TPV
          </p>
          <strong className="mt-3 block text-2xl">
            {brl.format(targetTpv)}
          </strong>
          <span className="text-xs text-emerald-700/65">
            Período ou meta RMR
          </span>
        </article>
        <article className="rounded-xl border border-emerald-100 bg-white p-5">
          <p className="font-mono text-[10px] tracking-[.12em] text-emerald-600">
            REALIZADO
          </p>
          <strong className="mt-3 block text-2xl">
            {brl.format(actualTpv)}
          </strong>
          <span className="text-xs text-emerald-700/65">
            Período, card ou RMR
          </span>
        </article>
        <article className="rounded-xl border border-emerald-100 bg-white p-5">
          <p className="font-mono text-[10px] tracking-[.12em] text-emerald-600">
            GAP
          </p>
          <strong className="mt-3 block text-2xl">{brl.format(tpvGap)}</strong>
          <span className="text-xs text-emerald-700/65">
            restante para o plano
          </span>
        </article>
        <article className="rounded-xl border border-lime-300 bg-lime-100 p-5 text-emerald-950">
          <p className="font-mono text-[10px] tracking-[.12em]">
            RITMO SEMANAL
          </p>
          <strong className="mt-3 block text-2xl">
            {brl.format(weeklyPace(tpvGap, daysRemaining))}
          </strong>
          <span className="text-xs opacity-70">
            com {daysRemaining} dias úteis
          </span>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        <article className="rounded-xl border border-emerald-100 bg-white p-4">
          <p className="font-mono text-[10px] tracking-[.1em] text-emerald-600">
            TAREFAS RMR
          </p>
          <strong className="mt-2 block text-xl">
            {strategy.data?.latestRmr?.salesTasks ?? 0}
          </strong>
        </article>
        <article className="rounded-xl border border-emerald-100 bg-white p-4">
          <p className="font-mono text-[10px] tracking-[.1em] text-emerald-600">
            PROPOSTAS RMR
          </p>
          <strong className="mt-2 block text-xl">
            {strategy.data?.latestRmr?.proposals ?? 0}
          </strong>
        </article>
        <article className="rounded-xl border border-emerald-100 bg-white p-4">
          <p className="font-mono text-[10px] tracking-[.1em] text-emerald-600">
            KPI REAL
          </p>
          <strong className="mt-2 block text-xl">
            {strategy.data?.latestRmr
              ? `${strategy.data.latestRmr.globalKpi.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`
              : "—"}
          </strong>
        </article>
        <article className="rounded-xl border border-emerald-100 bg-white p-4">
          <p className="font-mono text-[10px] tracking-[.1em] text-emerald-600">
            CLIENTES DO CARD
          </p>
          <strong className="mt-2 block text-xl">
            {strategy.data?.finalCard
              ? strategy.data.finalCard.clients7To15 +
                strategy.data.finalCard.clients15To30 +
                strategy.data.finalCard.clients30To50 +
                strategy.data.finalCard.clients50To100 +
                strategy.data.finalCard.clients100Plus
              : 0}
          </strong>
        </article>
        <article className="rounded-xl border border-emerald-100 bg-white p-4">
          <p className="font-mono text-[10px] tracking-[.1em] text-emerald-600">
            RV SIMULADA
          </p>
          <strong className="mt-2 block text-xl">
            {brl.format(strategy.data?.latestSimulation?.finalVariable ?? 0)}
          </strong>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-emerald-100 bg-white p-5">
          <p className="font-mono text-[10px] tracking-[.12em] text-emerald-600">
            FUNIL QUENTE
          </p>
          <strong className="mt-3 block text-3xl">
            {strategy.data?.hotLeads.length ?? 0}
          </strong>
          <span className="text-xs text-emerald-700/65">
            leads marcados como quentes no PSV
          </span>
        </article>
        <article className="rounded-xl border border-emerald-100 bg-white p-5">
          <p className="font-mono text-[10px] tracking-[.12em] text-emerald-600">
            LISTA 100K+
          </p>
          <strong className="mt-3 block text-3xl">
            {strategy.data?.hundredKLeads.length ?? 0}
          </strong>
          <span className="text-xs text-emerald-700/65">
            leads com TPV projetado a partir de R$ 100 mil
          </span>
        </article>
        <article className="rounded-xl border border-lime-300 bg-lime-100 p-5 text-emerald-950">
          <p className="font-mono text-[10px] tracking-[.12em]">
            ATIVAÇÕES PROJETADAS
          </p>
          <strong className="mt-3 block text-3xl">
            {brl.format(activationTpvTotal)}
          </strong>
          <span className="text-xs opacity-70">
            soma dos checklists de ativação
          </span>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-xl border border-emerald-100 bg-white p-5">
          <div className="flex items-center gap-2">
            <Flame className="text-orange-500" size={18} />
            <div>
              <p className="font-mono text-[10px] font-semibold tracking-[.12em] text-emerald-600">
                PRIORIDADES DE PROSPECÇÃO
              </p>
              <h3 className="mt-1 text-xl font-semibold">Quentes e 100k+.</h3>
            </div>
          </div>
          <div className="mt-5 space-y-2">
            {[
              ...(strategy.data?.hotLeads ?? []),
              ...(strategy.data?.hundredKLeads ?? []),
            ]
              .filter(
                (lead, index, all) =>
                  all.findIndex(item => item.id === lead.id) === index
              )
              .slice(0, 8)
              .map(lead => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between rounded-lg bg-[#f6f8f2] px-3 py-3 text-sm"
                >
                  <div>
                    <b>{lead.clientName}</b>
                    <span className="ml-2 rounded bg-white px-2 py-1 text-[10px] text-emerald-700">
                      {lead.temperature === "quente" ? "QUENTE" : "100K+"}
                    </span>
                    <small className="mt-1 block text-emerald-700/65">
                      {tierLabel(lead.projectedTpv)} ·{" "}
                      {lead.segmentLabel || "Segmento não informado"} ·{" "}
                      {lead.stage}
                    </small>
                    <small className="block text-emerald-700/55">
                      Próximo contato:{" "}
                      {lead.nextContactAt
                        ? new Date(lead.nextContactAt).toLocaleDateString(
                            "pt-BR"
                          )
                        : "a definir"}
                    </small>
                  </div>
                  <strong className="font-mono text-emerald-800">
                    {brl.format(lead.projectedTpv)}
                  </strong>
                </div>
              ))}
            {!strategy.data?.hotLeads.length &&
              !strategy.data?.hundredKLeads.length && (
                <div className="rounded-lg bg-[#f6f8f2] p-5 text-sm text-emerald-700/65">
                  Registre leads no PSV com temperatura e TPV projetado para
                  alimentar essas prioridades.
                </div>
              )}
          </div>
        </article>
        {false && <article className="rounded-xl border border-emerald-100 bg-white p-5">
          <div className="flex items-center gap-2">
            <CalendarPlus className="text-emerald-600" size={18} />
            <div>
              <p className="font-mono text-[10px] font-semibold tracking-[.12em] text-emerald-600">
                NOVA MICRORROTA
              </p>
              <h3 className="mt-1 text-xl font-semibold">
                Planeje uma visita por região.
              </h3>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs">
              Região / derredores
              <Input
                value={area}
                onChange={e => setArea(e.target.value)}
                placeholder="Ex.: Vila Medeiros e derredores"
              />
            </label>
            <label className="grid gap-1 text-xs">
              Data e hora
              <Input
                type="datetime-local"
                value={visitAt}
                onChange={e => setVisitAt(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-xs">
              Cliente ou lead
              <Input
                value={routeClient}
                onChange={e => setRouteClient(e.target.value)}
                placeholder="Nome do estabelecimento"
              />
            </label>
            <label className="grid gap-1 text-xs">
              Objetivo
              <Input
                value={objective}
                onChange={e => setObjective(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-xs">
              Status
              <select
                value={routeStatus}
                onChange={e =>
                  setRouteStatus(
                    e.target.value as "planejada" | "concluida" | "remarcada"
                  )
                }
              >
                <option value="planejada">Planejada</option>
                <option value="concluida">Concluída</option>
                <option value="remarcada">Remarcada</option>
              </select>
            </label>
          </div>
          <Button
            className="mt-4 bg-[#002b1d]"
            disabled={route.isPending || !area || !routeClient}
            onClick={() =>
              route.mutate({
                area,
                visitAt: new Date(visitAt),
                clientName: routeClient,
                priority: "normal",
                objective,
                status: routeStatus,
              })
            }
          >
            <MapPinned size={16} /> Adicionar à agenda
          </Button>
          <div className="mt-4 space-y-2">
            {routes.slice(0, 5).map(item => (
              <div
                className="flex items-center justify-between gap-3 rounded-lg bg-[#f6f8f2] px-3 py-2 text-xs"
                key={item.id}
              >
                <span>
                  <b>{item.clientName}</b> · {item.area}
                  <small className="block text-emerald-700/55">
                    {new Date(item.visitAt).toLocaleDateString("pt-BR")}
                  </small>
                </span>
                <select
                  value={item.status}
                  onChange={e =>
                    route.mutate({
                      id: item.id,
                      area: item.area,
                      visitAt: new Date(item.visitAt),
                      clientName: item.clientName,
                      pipelineLeadId: item.pipelineLeadId ?? null,
                      priority: item.priority,
                      objective: item.objective,
                      status: e.target.value as
                        | "planejada"
                        | "concluida"
                        | "remarcada",
                      notes: item.notes ?? undefined,
                    })
                  }
                >
                  <option value="planejada">Planejada</option>
                  <option value="concluida">Concluída</option>
                  <option value="remarcada">Remarcada</option>
                </select>
              </div>
            ))}
          </div>
        </article>}
      </section>

      <SpartaFunnel
        leads={authorizedPortfolioLeads.map(lead => ({
          id: lead.id,
          clientName: lead.clientName,
          projectedTpv: lead.projectedTpv,
          stage: lead.stage || "Mapeado",
          temperature: lead.temperature === "quente" ? "quente" : "frio",
        }))}
      />

      <section className="rounded-xl border border-emerald-100 bg-white p-5">
        <p className="font-mono text-[10px] font-semibold tracking-[.12em] text-emerald-600">
          CARTEIRA AUTORIZADA
        </p>
        <h3 className="mt-1 text-xl font-semibold">
          Leads reais do Funil do Pipe.
        </h3>
        <p className="mt-1 text-sm text-emerald-800/65">
          A lista considera somente entradas das suas rotas formalmente
          atribuídas na competência selecionada.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setSelectedPortfolioIds(authorizedPortfolioLeads.map(lead => lead.id))} disabled={!authorizedPortfolioLeads.length}>Selecionar todos</Button>
          <Button variant="outline" size="sm" onClick={() => setSelectedPortfolioIds([])} disabled={!selectedPortfolioIds.length}>Limpar seleção</Button>
          <Button variant="destructive" size="sm" onClick={() => removePortfolioEntries.mutate({ ids: selectedPortfolioIds })} disabled={!selectedPortfolioIds.length || removePortfolioEntries.isPending}>Excluir selecionados</Button>
          <span className="text-xs text-emerald-700/60">{selectedPortfolioIds.length} selecionado(s)</span>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {authorizedPortfolioLeads.slice(0, 8).map(lead => (
            <label key={lead.id} className="flex gap-3 rounded-lg bg-[#f6f8f2] p-3 text-xs">
              <input type="checkbox" checked={selectedPortfolioIds.includes(lead.id)} onChange={() => setSelectedPortfolioIds(current => current.includes(lead.id) ? current.filter(id => id !== lead.id) : [...current, lead.id])} />
              <span>
              <b>{lead.clientName}</b>
              <p className="mt-1 text-emerald-700/65">
                {lead.route} · {tierLabel(lead.projectedTpv)} ·{" "}
                {lead.segment || "Segmento não informado"}
              </p>
              <p className="text-emerald-700/55">
                {lead.stage || "Sem etapa"}{" "}
                {lead.nextContactAt
                  ? `· próximo contato ${new Date(lead.nextContactAt).toLocaleDateString("pt-BR")}`
                  : ""}
              </p>
              </span>
            </label>
          ))}
          {!authorizedPortfolioLeads.length && (
            <p className="rounded-lg bg-[#f6f8f2] p-4 text-sm text-emerald-700/65">
              Nenhuma entrada de Funil do Pipe foi encontrada nas suas rotas
              para esta competência.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-emerald-100 bg-white p-5">
        <div className="flex items-center gap-2">
          <ListChecks className="text-emerald-600" size={18} />
          <div>
            <p className="font-mono text-[10px] font-semibold tracking-[.12em] text-emerald-600">
              CHECKLIST DE ATIVAÇÕES
            </p>
            <h3 className="mt-1 text-xl font-semibold">
              Acompanhe o que já está em ativação e pós-venda.
            </h3>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-[1.1fr_.65fr_.65fr_.65fr_auto]">
          <Input
            value={activationName}
            onChange={e => setActivationName(e.target.value)}
            placeholder="Cliente / novo ativo"
          />
          <Input
            type="number"
            value={activationRealTpv}
            onChange={e => setActivationRealTpv(Number(e.target.value) || 0)}
            placeholder="TPV real"
          />
          <Input
            type="number"
            value={activationTpv}
            onChange={e => setActivationTpv(Number(e.target.value) || 0)}
            placeholder="TPV projetado"
          />
          <Input
            type="number"
            value={activationRv}
            onChange={e => setActivationRv(Number(e.target.value) || 0)}
            placeholder="RV estimada"
          />
          <Button
            className="bg-[#002b1d]"
            disabled={activation.isPending || !activationName.trim()}
            onClick={() =>
              activation.mutate({
                clientName: activationName,
                stoneCode: "",
                mcc: "",
                cnae: "",
                segment: "",
                realTpv: activationRealTpv,
                projectedTpv: activationTpv,
                productsReady: false,
                d15Complete: false,
                d30Complete: false,
                estimatedVariable: activationRv,
                status: "planejado",
              })
            }
          >
            <Plus size={16} /> Incluir
          </Button>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-xs">
            <thead className="border-b border-emerald-100 font-mono text-[10px] uppercase tracking-[.08em] text-emerald-700/65">
              <tr>
                <th className="pb-3">Cliente</th>
                <th className="pb-3">TPV real</th>
                <th className="pb-3">TPV projetado</th>
                <th className="pb-3">Produtos</th>
                <th className="pb-3">D+15</th>
                <th className="pb-3">D+30</th>
                <th className="pb-3">RV</th>
                <th className="sticky right-0 bg-white pb-3 pl-3 text-right">
                  Ação
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const isEditing = editingActivationId === item.id;
                return (
                  <tr className="border-b border-emerald-50" key={item.id}>
                    <td className="py-3 font-semibold">
                      {isEditing ? (
                        <Input
                          className="h-8 text-xs"
                          value={editActivationDraft.clientName}
                          onChange={e =>
                            setEditActivationDraft(draft => ({
                              ...draft,
                              clientName: e.target.value,
                            }))
                          }
                        />
                      ) : (
                        <>
                          {item.clientName}
                          <small className="block font-normal text-emerald-700/60">
                            {item.status}
                          </small>
                        </>
                      )}
                    </td>
                    <td className="py-3 font-mono">
                      {isEditing ? (
                        <Input
                          className="h-8 w-28 text-xs"
                          type="number"
                          value={editActivationDraft.realTpv}
                          onChange={e =>
                            setEditActivationDraft(draft => ({
                              ...draft,
                              realTpv: Number(e.target.value) || 0,
                            }))
                          }
                        />
                      ) : (
                        brl.format(item.realTpv)
                      )}
                    </td>
                    <td className="py-3 font-mono">
                      {isEditing ? (
                        <Input
                          className="h-8 w-28 text-xs"
                          type="number"
                          value={editActivationDraft.projectedTpv}
                          onChange={e =>
                            setEditActivationDraft(draft => ({
                              ...draft,
                              projectedTpv: Number(e.target.value) || 0,
                            }))
                          }
                        />
                      ) : (
                        brl.format(item.projectedTpv)
                      )}
                    </td>
                    <td className="py-3">
                      <input
                        type="checkbox"
                        checked={item.productsReady}
                        onChange={e =>
                          completeActivation.mutate({
                            ...item,
                            productsReady: e.target.checked,
                            notes: item.notes ?? undefined,
                          })
                        }
                      />
                    </td>
                    <td className="py-3">
                      <input
                        type="checkbox"
                        checked={item.d15Complete}
                        onChange={e =>
                          completeActivation.mutate({
                            ...item,
                            d15Complete: e.target.checked,
                            notes: item.notes ?? undefined,
                          })
                        }
                      />
                    </td>
                    <td className="py-3">
                      <input
                        type="checkbox"
                        checked={item.d30Complete}
                        onChange={e =>
                          completeActivation.mutate({
                            ...item,
                            d30Complete: e.target.checked,
                            notes: item.notes ?? undefined,
                          })
                        }
                      />
                    </td>
                    <td className="py-3 font-mono">
                      {isEditing ? (
                        <Input
                          className="h-8 w-24 text-xs"
                          type="number"
                          value={editActivationDraft.estimatedVariable}
                          onChange={e =>
                            setEditActivationDraft(draft => ({
                              ...draft,
                              estimatedVariable: Number(e.target.value) || 0,
                            }))
                          }
                        />
                      ) : (
                        brl.format(item.estimatedVariable)
                      )}
                    </td>
                    <td className="sticky right-0 bg-white py-3 pl-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              aria-label={`Salvar ${item.clientName}`}
                              disabled={
                                updateActivation.isPending ||
                                !editActivationDraft.clientName.trim()
                              }
                              className="inline-flex items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100"
                              onClick={() =>
                                updateActivation.mutate({
                                  ...item,
                                  clientName: editActivationDraft.clientName,
                                  realTpv: editActivationDraft.realTpv,
                                  projectedTpv:
                                    editActivationDraft.projectedTpv,
                                  estimatedVariable:
                                    editActivationDraft.estimatedVariable,
                                  notes: item.notes ?? undefined,
                                })
                              }
                            >
                              <Check size={15} />
                            </button>
                            <button
                              type="button"
                              aria-label="Cancelar edição"
                              className="inline-flex items-center justify-center rounded-md border border-emerald-100 bg-white p-2 text-emerald-700/70 hover:bg-emerald-50"
                              onClick={() => setEditingActivationId(null)}
                            >
                              <X size={15} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              aria-label={`Editar ${item.clientName}`}
                              className="inline-flex items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100"
                              onClick={() => {
                                setEditingActivationId(item.id);
                                setEditActivationDraft({
                                  clientName: item.clientName,
                                  realTpv: item.realTpv,
                                  projectedTpv: item.projectedTpv,
                                  estimatedVariable: item.estimatedVariable,
                                });
                              }}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              aria-label={`Remover ${item.clientName} do checklist`}
                              className="inline-flex items-center justify-center rounded-md border border-red-200 bg-red-50 p-2 text-red-600 hover:bg-red-100"
                              onClick={() =>
                                removeActivation.mutate({ id: item.id })
                              }
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!items.length && (
                <tr>
                  <td
                    className="py-7 text-center text-emerald-700/65"
                    colSpan={7}
                  >
                    Inclua novos ativos reais para começar o checklist.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-4 flex items-center gap-2 text-xs text-emerald-700/65">
          <CheckCircle2 size={15} /> Dados de ativação são registros
          operacionais: a RV informada é uma projeção e não substitui a
          calculadora detalhada.
        </p>
      </section>
    </div>
  );
}
