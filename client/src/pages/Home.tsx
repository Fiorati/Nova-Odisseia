import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { calculateRmrKpi } from "@shared/metrics";
import { BarChart3, BookOpen, Calculator, CheckCircle2, ClipboardCheck, ClipboardList, Crown, Flag, FolderKanban, Gauge, Layers3, LogOut, Medal, Megaphone, SearchCheck, Sparkles, Target, Trophy, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import AuthScreen from "./AuthScreen";
import LegacyCalculator from "./LegacyCalculator";
import LeadershipPanel from "./LeadershipPanel";
import MatrixPsvPanel from "./MatrixPsvPanel";
import PsvRitualPanel from "./PsvRitualPanel";
import MonthlyFinalCardPanel from "./MonthlyFinalCardPanel";
import NordicStrategyPanel from "./NordicStrategyPanel";
import QuickPeriodPanel from "./QuickPeriodPanel";
import RoutePortfoliosPanel from "./RoutePortfoliosPanel";
import SuperPipePanel from "./SuperPipePanel";
import ProspectionPanel from "./ProspectionPanel";
import RmrActionPlanPanel from "./RmrActionPlanPanel";
import EngagementCampaignsPanel from "./EngagementCampaignsPanel";
import SpartacusPanel from "./SpartacusPanel";
import SkillsDashboard from "./SkillsDashboard";
import ItakaDailyWelcome from "./ItakaDailyWelcome";
import { isListIntelligentView, LIST_INTELLIGENT_VIEW } from "@shared/listIntelligentNavigation";
import "./platform.css";
import "./ulisses-theme.css";

type View = "painel" | "calculadora" | "periodo" | "nordica" | "psv" | "psv-ritual" | "rmr" | "ranking" | "perfil" | "lideranca" | "card-final" | "carteiras" | typeof LIST_INTELLIGENT_VIEW | "super-pipe" | "prospeccao" | "campanhas" | "spartacus";
type LeadershipRole = "none" | "polo" | "distrital";
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const percent = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const monthKey = () => new Date().toISOString().slice(0, 7);

function Metric({ label, value, helper, accent = false }: { label: string; value: string; helper: string; accent?: boolean }) {
  return <>{label === "RV REALIZADA" && <article className="relative overflow-hidden rounded-xl border border-lime-300 bg-[#0e3426] p-6 text-white md:col-span-2 xl:col-span-4"><div className="absolute -right-9 -top-14 h-44 w-44 rounded-full border-[22px] border-lime-200/15" /><div className="relative"><p className="font-mono text-[10px] font-semibold tracking-[.15em] text-lime-200">NOVA ODISSEIA: FIORATI</p><h2 className="mt-2 text-2xl font-semibold tracking-[-.05em]">Uma plataforma para transformar profissionais em Outliers.</h2><p className="mt-2 max-w-4xl text-sm leading-6 text-emerald-100/75">Organize a rota, planeje prioridades, proteja o foco e transforme dados em planos de ação. A jornada desenvolve raciocínio rápido, adaptabilidade, persuasão e comunicação excepcional com prática deliberada.</p><div className="mt-4 flex flex-wrap gap-2">{["Organização", "Planejamento", "Foco", "Planos de ação", "Raciocínio rápido", "Adaptabilidade", "Persuasão", "Comunicação"].map(item => <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-emerald-50" key={item}>{item}</span>)}</div></div></article>}<article className={`rounded-xl border p-5 ${accent ? "border-lime-300 bg-lime-300 text-emerald-950" : "border-emerald-100 bg-white"}`}><p className="font-mono text-[10px] font-semibold tracking-[.12em] opacity-70">{label}</p><strong className="mt-3 block text-3xl tracking-tight">{value}</strong><p className="mt-2 text-xs opacity-70">{helper}</p></article>{label === "CONQUISTAS" && <div className="md:col-span-2 xl:col-span-4"><SkillsDashboard onOpenSpartacus={() => { window.history.replaceState({}, "", "?view=spartacus"); window.location.reload(); }} /></div>}</>;
}

function ProfilePanel({ profile }: { profile: { displayName: string; targetVariable: number; defaultGoalTpv: number; defaultGoalNewClients: number; profileVisibleInRanking: boolean; leadershipRole: LeadershipRole; regional: string; district: string; polo: string; route: string } | null }) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState(() => ({ displayName: profile?.displayName ?? "", targetVariable: profile?.targetVariable ?? 0, defaultGoalTpv: profile?.defaultGoalTpv ?? 300000, defaultGoalNewClients: profile?.defaultGoalNewClients ?? 0, profileVisibleInRanking: profile?.profileVisibleInRanking ?? true, leadershipRole: profile?.leadershipRole ?? "none" as LeadershipRole, regional: profile?.regional ?? "", district: profile?.district ?? "", polo: profile?.polo ?? "", route: profile?.route ?? "" }));
  useEffect(() => { if (profile) setForm({ displayName: profile.displayName, targetVariable: profile.targetVariable, defaultGoalTpv: profile.defaultGoalTpv, defaultGoalNewClients: profile.defaultGoalNewClients, profileVisibleInRanking: profile.profileVisibleInRanking, leadershipRole: profile.leadershipRole, regional: profile.regional, district: profile.district, polo: profile.polo, route: profile.route }); }, [profile]);
  const save = trpc.agent.profile.useMutation({ onSuccess: async () => { await utils.agent.dashboard.invalidate(); toast.success("Perfil atualizado."); }, onError: error => toast.error(error.message) });
  const isLeader = form.leadershipRole !== "none";
  const functionLabel = form.leadershipRole === "polo" ? "Dono de Polo" : form.leadershipRole === "distrital" ? "Distrital" : "Agente";
  return <div className="max-w-4xl space-y-6"><section><p className="font-mono text-[10px] font-semibold tracking-[.14em] text-emerald-600">PERFIL E HIERARQUIA</p><h2 className="mt-2 text-3xl font-semibold tracking-[-.055em]">Seu perfil e escopo operacional.</h2><p className="mt-2 text-sm text-emerald-800/65">Funções de liderança e seus escopos são provisionados por administração autorizada para proteger informações de outros agentes.</p></section><section className="rounded-xl border border-emerald-100 bg-white p-6"><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1 text-xs">Nome de exibição<Input value={form.displayName} onChange={e => setForm(current => ({ ...current, displayName: e.target.value }))} /></label><div className="grid gap-1 text-xs"><span>Função</span><p className="rounded-md border border-emerald-100 bg-[#f5f8f2] px-3 py-2 text-sm font-semibold text-emerald-900">{functionLabel}</p></div>{!isLeader && <label className="grid gap-1 text-xs">RV alvo mensal<Input type="number" value={form.targetVariable} onChange={e => setForm(current => ({ ...current, targetVariable: Number(e.target.value) || 0 }))} /></label>}<label className="grid gap-1 text-xs">{isLeader ? "Meta coletiva padrão de TPV" : "Meta padrão de TPV"}<Input type="number" value={form.defaultGoalTpv} onChange={e => setForm(current => ({ ...current, defaultGoalTpv: Number(e.target.value) || 0 }))} /></label>{isLeader && <label className="grid gap-1 text-xs">Meta coletiva de novos clientes<Input type="number" value={form.defaultGoalNewClients} onChange={e => setForm(current => ({ ...current, defaultGoalNewClients: Number(e.target.value) || 0 }))} /></label>}<label className="grid gap-1 text-xs">Regional<Input value={form.regional} disabled={isLeader} onChange={e => setForm(current => ({ ...current, regional: e.target.value }))} placeholder="Ex.: Regional SP" /></label><label className="grid gap-1 text-xs">Distrito<Input value={form.district} disabled={isLeader} onChange={e => setForm(current => ({ ...current, district: e.target.value }))} placeholder="Ex.: Distrito SP Norte" /></label><label className="grid gap-1 text-xs">Polo<Input value={form.polo} disabled={isLeader} onChange={e => setForm(current => ({ ...current, polo: e.target.value }))} placeholder="Ex.: Polo Vila Medeiros" /></label><label className="grid gap-1 text-xs">Rota<Input value={form.route} disabled={isLeader} onChange={e => setForm(current => ({ ...current, route: e.target.value }))} placeholder="Ex.: Rota 04" /></label></div>{isLeader && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Para corrigir função, regional, distrito, polo ou rota, solicite a atualização a um administrador autorizado.</p>}<label className="mt-5 flex items-center justify-between rounded-lg bg-[#f5f8f2] p-4 text-sm"><span><b className="block">Participar do ranking</b><small className="text-emerald-700/65">A classificação pública mostra somente nome, polo, distrito e pontos.</small></span><input type="checkbox" checked={form.profileVisibleInRanking} onChange={e => setForm(current => ({ ...current, profileVisibleInRanking: e.target.checked }))} className="h-4 w-4 accent-emerald-700" /></label><Button className="mt-5 bg-[#0e3426]" disabled={save.isPending} onClick={() => save.mutate(form)}><CheckCircle2 size={16} /> {save.isPending ? "Salvando..." : "Salvar perfil"}</Button></section></div>;
}

function RmrPanel({ defaultGoal, lastVariable }: { defaultGoal: number; lastVariable: number }) {
  const [periodLabel, setPeriodLabel] = useState("Análise mensal"); const [workingDays, setWorkingDays] = useState(20); const [salesTasks, setSalesTasks] = useState(0); const [proposals, setProposals] = useState(0); const [closedClients, setClosedClients] = useState(0); const [closedTpv, setClosedTpv] = useState(0); const [goalTpv, setGoalTpv] = useState(defaultGoal); const [variableValue, setVariableValue] = useState(lastVariable);
  const calculated = useMemo(() => calculateRmrKpi({ workingDays, salesTasks, proposals, closedClients, closedTpv, goalTpv }), [workingDays, salesTasks, proposals, closedClients, closedTpv, goalTpv]);
  const save = trpc.rmr.save.useMutation({ onSuccess: result => toast.success(result.pointsAwarded ? `RMR registrada. +${result.pointsAwarded} pontos por KPI mensal.` : "RMR registrada. A pontuação deste KPI já foi concedida neste mês."), onError: error => toast.error(error.message) });
  return <div className="space-y-6"><section><p className="font-mono text-[10px] font-semibold tracking-[.14em] text-emerald-600">RMR / REVISÃO MENSAL</p><h2 className="mt-2 text-3xl font-semibold tracking-[-.055em]">Indicadores para corrigir a rota.</h2><p className="mt-2 text-sm text-emerald-800/65">A RMR usa tarefas, propostas e TPV para calcular o KPI global. O período rápido ajuda a preparar este registro.</p></section><section className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]"><article className="rounded-xl border border-emerald-100 bg-white p-5"><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1 text-xs sm:col-span-2">Período<Input value={periodLabel} onChange={e => setPeriodLabel(e.target.value)} /></label><label className="grid gap-1 text-xs">Dias úteis<Input type="number" value={workingDays} onChange={e => setWorkingDays(Number(e.target.value) || 1)} /></label><label className="grid gap-1 text-xs">Tarefas de venda<Input type="number" value={salesTasks} onChange={e => setSalesTasks(Number(e.target.value) || 0)} /></label><label className="grid gap-1 text-xs">Propostas<Input type="number" value={proposals} onChange={e => setProposals(Number(e.target.value) || 0)} /></label><label className="grid gap-1 text-xs">Clientes fechados<Input type="number" value={closedClients} onChange={e => setClosedClients(Number(e.target.value) || 0)} /></label><label className="grid gap-1 text-xs">TPV novo<Input type="number" value={closedTpv} onChange={e => setClosedTpv(Number(e.target.value) || 0)} /></label><label className="grid gap-1 text-xs">Meta TPV<Input type="number" value={goalTpv} onChange={e => setGoalTpv(Number(e.target.value) || 0)} /></label><label className="grid gap-1 text-xs sm:col-span-2">RV do período<Input type="number" value={variableValue} onChange={e => setVariableValue(Number(e.target.value) || 0)} /></label></div><Button className="mt-5 bg-[#0e3426]" disabled={save.isPending} onClick={() => save.mutate({ periodLabel, workingDays, salesTasks, proposals, closedClients, closedTpv, goalTpv, variableValue })}><CheckCircle2 size={16} /> Registrar RMR</Button></article><article className="rounded-xl bg-[#f6f8f2] p-6"><p className="font-mono text-[10px] tracking-[.12em] text-emerald-600">KPI GLOBAL</p><strong className="mt-3 block text-5xl tracking-[-.08em]">{percent.format(calculated.globalKpi)}%</strong><p className="mt-2 text-sm text-emerald-800/65">Acima de 80%: 20 pts; de 100% a 150%: 40 pts; acima de 150%: 100 pts. A pontuação é concedida uma vez por mês.</p><div className="mt-6 space-y-3 text-sm"><div className="flex justify-between"><span>Tarefas</span><b>{percent.format(calculated.taskScore * 100)}%</b></div><div className="flex justify-between"><span>Propostas</span><b>{percent.format(calculated.proposalScore * 100)}%</b></div><div className="flex justify-between"><span>TPV</span><b>{percent.format(calculated.tpvScore * 100)}%</b></div></div></article></section></div>;
}

function RankingPanel() {
  const [selectedMonth, setSelectedMonth] = useState(monthKey); const ranking = trpc.ranking.list.useQuery(); const trophies = trpc.ranking.trophies.useQuery({ monthKey: selectedMonth }); const tioPatinhas = trpc.ranking.tioPatinhas.useQuery({ monthKey: selectedMonth });
  const groups = [{ label: "Mais novos clientes", items: trophies.data?.newClients ?? [], helper: "desempate por TPV" }, { label: "Maior TPV", items: trophies.data?.tpv ?? [], helper: "desempate por clientes" }, { label: "Maior KPI global", items: trophies.data?.kpi ?? [], helper: "desempate por TPV e clientes" }];
  return <div className="space-y-6"><section><p className="font-mono text-[10px] font-semibold tracking-[.14em] text-emerald-600">RANKING E TROFÉUS</p><h2 className="mt-2 text-3xl font-semibold tracking-[-.055em]">Reconhecimento mensal baseado em resultado.</h2></section><div className="flex items-end justify-between"><label className="grid gap-1 text-xs">Mês de referência<Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value || monthKey())} /></label></div><section className="grid gap-4 lg:grid-cols-3">{groups.map(group => <article className="rounded-xl border border-emerald-100 bg-white p-5" key={group.label}><div className="flex items-center gap-2"><Trophy className="text-amber-500" size={18} /><div><p className="font-mono text-[10px] tracking-[.1em] text-emerald-600">TOP 3</p><h3 className="font-semibold">{group.label}</h3></div></div><p className="mt-1 text-xs text-emerald-700/60">{group.helper}</p><div className="mt-4 space-y-2">{group.items.map((agent, index) => <div className="flex items-center gap-3 rounded-lg bg-[#f6f8f2] p-3 text-xs" key={`${group.label}-${agent.displayName}-${index}`}><span className="grid h-7 w-7 place-items-center rounded-full bg-lime-200 font-mono text-emerald-950">{index + 1}</span><div className="min-w-0 flex-1"><b className="block truncate">{agent.displayName}</b><small className="text-emerald-700/60">{brl.format(agent.actualTpv)} · {agent.actualNewClients} clientes · KPI {percent.format(agent.globalKpi)}%</small></div></div>)}{!group.items.length && <p className="rounded-lg bg-[#f6f8f2] p-3 text-xs text-emerald-700/65">O troféu aparece após os cards finais do mês serem registrados.</p>}</div></article>)}</section><section className="rounded-xl border border-emerald-100 bg-white p-5"><p className="font-mono text-[10px] tracking-[.12em] text-emerald-600">TIO PATINHAS</p><h3 className="mt-1 text-xl font-semibold">Variável real, de forma anônima.</h3><p className="mt-1 text-sm text-emerald-800/65">Acompanhe RV, TPV e a composição por tiers sem expor o nome dos agentes.</p><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="border-b border-emerald-100 font-mono text-[10px] uppercase tracking-[.08em] text-emerald-700/65"><tr><th className="pb-3">Arquétipo</th><th className="pb-3">RV realizada</th><th className="pb-3">TPV</th><th className="pb-3">15–30k</th><th className="pb-3">30–50k</th><th className="pb-3">50–100k</th><th className="pb-3">100k+</th></tr></thead><tbody>{tioPatinhas.data?.map(item => <tr className="border-b border-emerald-50" key={item.alias}><td className="py-3 font-semibold">{item.alias}</td><td className="py-3 font-mono">{brl.format(item.actualVariable)}</td><td className="py-3 font-mono">{brl.format(item.totalMigratedTpv)}</td><td className="py-3">{item.clients15To30}</td><td className="py-3">{item.clients30To50}</td><td className="py-3">{item.clients50To100}</td><td className="py-3">{item.clients100Plus}</td></tr>)}{!tioPatinhas.isLoading && !tioPatinhas.data?.length && <tr><td colSpan={7} className="py-7 text-center text-emerald-700/65">O ranking aparecerá após os cards finais do mês serem registrados.</td></tr>}</tbody></table></div></section><section className="overflow-hidden rounded-xl border border-emerald-100 bg-white"><div className="p-5"><p className="font-mono text-[10px] tracking-[.12em] text-emerald-600">PONTUAÇÃO GERAL</p><h3 className="mt-1 text-xl font-semibold">Conquistas na plataforma.</h3></div>{ranking.data?.map((agent, index) => <div className="flex items-center gap-4 border-t border-emerald-50 px-5 py-4 text-sm" key={`${agent.displayName}-${index}`}><span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-50 font-mono text-emerald-700">{index + 1}</span><div className="min-w-0 flex-1"><b>{agent.displayName}</b><small className="block text-emerald-700/60">{agent.polo || "Polo não informado"} · {agent.district || "Distrito não informado"}</small></div><b className="font-mono text-emerald-800">{agent.points} pts</b></div>)}</section></div>;
}

function AgentDashboard({ data, onView }: { data: { latestGoal: { targetVariable: number; targetTpv: number; targetNewClients: number; actualTpv: number; actualVariable: number } | null; profile: { displayName: string; targetVariable: number; defaultGoalTpv: number } | null; points: number; simulations: { finalVariable: number }[] }; onView: (view: View) => void }) {
  const latestGoal = data.latestGoal; const currentVariable = latestGoal?.actualVariable ?? data.simulations[0]?.finalVariable ?? 0; const targetVariable = latestGoal?.targetVariable ?? data.profile?.targetVariable ?? 0; const progress = targetVariable ? Math.min(currentVariable / targetVariable * 100, 100) : 0;
  return <div className="space-y-6"><ItakaDailyWelcome displayName={data.profile?.displayName || "agente"} /><section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Metric label="RV REALIZADA" value={brl.format(currentVariable)} helper={targetVariable ? `${percent.format(progress)}% da RV alvo` : "Defina sua RV no perfil"} accent /><Metric label="META TPV" value={brl.format(latestGoal?.targetTpv ?? data.profile?.defaultGoalTpv ?? 0)} helper="objetivo mensal" /><Metric label="TPV ATUAL" value={brl.format(latestGoal?.actualTpv ?? 0)} helper="registro mais recente" /><Metric label="CONQUISTAS" value={`${data.points} pts`} helper="PSV e KPI mensal" /></section><section className="grid gap-4 lg:grid-cols-3"><button className="rounded-xl border border-emerald-100 bg-white p-5 text-left transition hover:border-lime-300" onClick={() => onView("periodo")}><Target className="text-emerald-600" /><h3 className="mt-3 font-semibold">Período rápido</h3><p className="mt-1 text-sm text-emerald-700/65">Defina quantidades por tier e acompanhe plano, realizado e GAP.</p></button><button className="rounded-xl border border-emerald-100 bg-white p-5 text-left transition hover:border-lime-300" onClick={() => onView("nordica")}><Medal className="text-emerald-600" /><h3 className="mt-3 font-semibold">Estratégia Nórdica</h3><p className="mt-1 text-sm text-emerald-700/65">Funis, ativações e microrrotas de visita.</p></button><button className="rounded-xl bg-[#0e3426] p-5 text-left text-white" onClick={() => onView("psv")}><ClipboardCheck className="text-lime-200" /><h3 className="mt-3 font-semibold">PSV semanal</h3><p className="mt-1 text-sm text-emerald-100/70">Transforme a meta em próximas oportunidades.</p></button></section></div>;
}

export default function Home() {
  const { user, loading, logout } = useAuth();

  const [view, setView] = useState<View>(() => {
    const value = new URLSearchParams(window.location.search).get("view");

    return [
      "painel",
      "calculadora",
      "periodo",
      "nordica",
      "psv",
      "psv-ritual",
      "rmr",
      "ranking",
      "perfil",
      "lideranca",
      "card-final",
      "carteiras",
      LIST_INTELLIGENT_VIEW,
      "super-pipe",
      "prospeccao",
      "campanhas",
      "spartacus",
    ].includes(value ?? "")
      ? (value as View)
      : "painel";
  });

  const dashboard = trpc.agent.dashboard.useQuery(undefined, {
    enabled: !!user,
  });

  const saveSimulation = trpc.simulation.save.useMutation({
    onSuccess: () => toast.success("Simulação salva no histórico."),
    onError: (error) => toast.error(error.message),
  });

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f4f3ec] font-mono text-sm text-emerald-700">
        CARREGANDO ACESSO...
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  const data = dashboard.data;

  const role = data?.profile?.leadershipRole ?? "none";

  const isLeader =
    role !== "none" &&
    !(user.role === "admin" && view === "psv-ritual");

  const currentVariable =
    data?.latestGoal?.actualVariable ??
    data?.simulations?.[0]?.finalVariable ??
    0;

  /*
   * Navegação centralizada.
   *
   * Mantemos o mesmo modelo atual de navegação por estado,
   * mas centralizamos a mudança de seção para que todos os
   * elementos utilizem exatamente o mesmo comportamento.
   */
  const navigateToView = (nextView: View) => {
    setView(nextView);
  };

  /*
   * Navegação imediata para mouse, touch e outros ponteiros.
   *
   * pointerdown acontece no momento em que o usuário pressiona
   * o botão, antes do click tradicional.
   *
   * Para mouse, aceitamos apenas o botão esquerdo.
   * Para touch/pen, qualquer pointerdown válido navega.
   */
  const handleNavigationPointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
    nextView: View,
  ) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    navigateToView(nextView);
  };

  /*
   * Mantém a navegação acessível pelo teclado.
   *
   * Como a navegação principal ocorre no pointerdown, precisamos
   * tratar Enter/Espaço explicitamente para usuários de teclado.
   */
  const handleNavigationKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    nextView: View,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      navigateToView(nextView);
    }
  };

  const nav = isLeader
    ? [
        ["painel", Gauge, "Gestão do time"],
        ["super-pipe", Layers3, "Super Pipe"],
        ["campanhas", Megaphone, "Campanhas"],
        ["spartacus", BookOpen, "SPARTACUS"],
        ["carteiras", FolderKanban, "Carteiras"],
        [LIST_INTELLIGENT_VIEW, Sparkles, "Lista Inteligente"],
        ["ranking", Trophy, "Troféus"],
        ["perfil", Users, "Meu perfil"],
      ] as const
    : [
        ["painel", Gauge, "Meu painel"],
        ["periodo", Target, "Período"],
        ["nordica", Medal, "Estratégia"],
        ["prospeccao", SearchCheck, "Cavalo de Tróia"],
        ["calculadora", Calculator, "Calculadora RV"],
        ["psv", ClipboardCheck, "PSV semanal"],
        ["psv-ritual", ClipboardList, "Ritual PSV"],
        ["spartacus", BookOpen, "SPARTACUS"],
        ["carteiras", FolderKanban, "Carteiras"],
        [LIST_INTELLIGENT_VIEW, Sparkles, "Lista Inteligente"],
        ["rmr", BarChart3, "RMR"],
        ["card-final", Flag, "Card final"],
        ["ranking", Trophy, "Troféus"],
        ["perfil", Users, "Meu perfil"],
      ] as const;

  const content = () => {
    if (view === "spartacus") {
      return <SpartacusPanel />;
    }

    if (isListIntelligentView(view)) {
      return (
        <RoutePortfoliosPanel
          initialTab="route"
          focusListIntelligent
        />
      );
    }

    if (isLeader && view === "painel") {
      return <LeadershipPanel />;
    }

    if (isLeader && view === "super-pipe") {
      return <SuperPipePanel />;
    }

    if (isLeader && view === "campanhas") {
      return <EngagementCampaignsPanel />;
    }

    if (view === "prospeccao") {
      return <ProspectionPanel />;
    }

    if (view === "nordica" && user.role === "admin") {
      return (
        <NordicStrategyPanel
          onOpenPeriod={() => navigateToView("periodo")}
        />
      );
    }

    if (view === "calculadora") {
      return isLeader ? (
        <LeadershipPanel />
      ) : (
        <LegacyCalculator
          storageKey={`fiorati-rv-${user.id}`}
          onSaveSimulation={saveSimulation.mutate}
        />
      );
    }

    if (view === "periodo") {
      return isLeader ? (
        <LeadershipPanel />
      ) : (
        <QuickPeriodPanel
          onOpenPsv={() => navigateToView("psv")}
        />
      );
    }

    if (view === "nordica") {
      return isLeader ? (
        <LeadershipPanel />
      ) : (
        <NordicStrategyPanel
          onOpenPeriod={() => navigateToView("periodo")}
        />
      );
    }

    if (view === "psv") {
      return isLeader ? (
        <LeadershipPanel />
      ) : (
        <MatrixPsvPanel
          profile={data?.profile ?? null}
          currentVariable={currentVariable}
          latestDetailsJson={data?.simulations?.[0]?.detailsJson}
        />
      );
    }

    if (view === "psv-ritual") {
      return isLeader ? (
        <LeadershipPanel />
      ) : (
        <PsvRitualPanel />
      );
    }

    if (view === "rmr") {
      return isLeader ? (
        <LeadershipPanel />
      ) : (
        <RmrActionPlanPanel
          defaultGoal={data?.profile?.defaultGoalTpv ?? 300000}
          lastVariable={currentVariable}
        />
      );
    }

    if (view === "card-final") {
      return isLeader ? (
        <LeadershipPanel />
      ) : (
        <MonthlyFinalCardPanel />
      );
    }

    if (view === "carteiras") {
      return <RoutePortfoliosPanel />;
    }

    if (view === "ranking") {
      return <RankingPanel />;
    }

    if (view === "perfil") {
      return (
        <ProfilePanel
          profile={data?.profile ?? null}
        />
      );
    }

    if (view === "lideranca") {
      return <LeadershipPanel />;
    }

    return data ? (
      <AgentDashboard
        data={data}
        onView={navigateToView}
      />
    ) : null;
  };

  return (
    <div className="min-h-screen bg-[#f4f3ec] text-emerald-950">
      <div className="flex min-h-screen">

        {/* SIDEBAR DESKTOP */}
        <aside className="hidden w-64 shrink-0 flex-col bg-[#0e3426] p-5 text-white lg:flex">

          <div className="flex items-center gap-3 px-2">
            <img
              className="fiorati-mark"
              src="/assets/projeto-ulisses-helmet-clean.png"
              alt="Símbolo da Nova Odisseia"
            />

            <div>
              <p className="font-mono text-[9px] tracking-[.14em] text-emerald-200">
                CADERNO OPERACIONAL
              </p>

              <b className="block text-lg leading-none">
                NOVA{" "}
                <span className="font-mono text-sm text-lime-200">
                  ODISSEIA · FIORATI
                </span>
              </b>
            </div>
          </div>

          <nav className="mt-10 space-y-1">
            {nav.map(([key, Icon, label]) => (
              <button
                key={key}
                type="button"
                onPointerDown={(event) =>
                  handleNavigationPointerDown(event, key)
                }
                onKeyDown={(event) =>
                  handleNavigationKeyDown(event, key)
                }
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition ${
                  view === key
                    ? "bg-lime-200 font-semibold text-emerald-950"
                    : "text-emerald-100/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={17} />
                {label}
              </button>
            ))}
          </nav>

          <div className="mt-auto rounded-xl border border-white/15 bg-white/5 p-4">
            <p className="font-mono text-[9px] tracking-[.12em] text-lime-200">
              {isLeader ? "GESTÃO" : "PRIVACIDADE"}
            </p>

            <p className="mt-2 text-xs leading-5 text-emerald-100/70">
              {isLeader
                ? "A visão é limitada ao seu polo ou distrito. Metas individuais não aparecem para liderança."
                : "Cada conta preserva seus dados privados; o ranking compartilha somente os campos autorizados."}
            </p>
          </div>

          <button
            type="button"
            onClick={() => logout()}
            className="mt-4 flex items-center gap-2 px-3 py-2 text-xs text-emerald-100/60 hover:text-white"
          >
            <LogOut size={15} />
            Sair
          </button>
        </aside>

        {/* CONTEÚDO PRINCIPAL */}
        <main className="min-w-0 flex-1">

          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-emerald-100 bg-[#f4f3ec]/95 px-5 py-4 backdrop-blur lg:px-9">

            <button
              type="button"
              className="flex items-center gap-2 font-semibold lg:hidden"
              onClick={() => navigateToView("painel")}
            >
              <img
                className="fiorati-mark !h-5 !w-5"
                src="/assets/projeto-ulisses-helmet-clean.png"
                alt=""
              />
              NOVA ODISSEIA
            </button>

            <div className="hidden items-center gap-2 text-xs text-emerald-700/65 lg:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {isLeader
                ? "Espaço de gestão"
                : "Espaço privado do agente"}
            </div>

            <div className="text-right">
              <b className="block text-sm">
                {data?.profile?.displayName ||
                  user.name ||
                  "Agente"}
              </b>

              <span className="text-xs text-emerald-700/60">
                {role === "polo"
                  ? "Dono de Polo"
                  : role === "distrital"
                    ? "Distrital"
                    : "Agente"}
              </span>
            </div>
          </header>

          <div className="mx-auto max-w-7xl p-5 pb-24 lg:p-9">
            {dashboard.isLoading ? (
              <div className="rounded-xl border border-emerald-100 bg-white p-8 text-sm text-emerald-700">
                Carregando seus registros...
              </div>
            ) : (
              content()
            )}
          </div>
        </main>
      </div>

      {/* NAVEGAÇÃO MOBILE */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-emerald-100 bg-white p-2 lg:hidden">
        {nav.slice(0, 5).map(([key, Icon, label]) => (
          <button
            key={key}
            type="button"
            onPointerDown={(event) =>
              handleNavigationPointerDown(event, key)
            }
            onKeyDown={(event) =>
              handleNavigationKeyDown(event, key)
            }
            className={`grid place-items-center gap-1 rounded-md px-2 py-1 text-[9px] ${
              view === key
                ? "text-emerald-700"
                : "text-emerald-700/50"
            }`}
          >
            <Icon size={17} />
            <span>{label.split(" ")[0]}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
