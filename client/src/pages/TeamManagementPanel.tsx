import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Save,
  ShieldCheck,
  UserRound,
  UserPlus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type TeamMember = {
  userId: number;
  email: string | null;
  displayName: string;
  leadershipRole: "none" | "polo" | "distrital";
  regional: string;
  district: string;
  polo: string;
  route: string;
  formalRoutes: string[];
  teamRoles: Array<"agente" | "interino" | "polo" | "distrital" | "agendamento">;
  hasAccess: boolean;
  teamProfile: {
    about: string | null;
    strengths: string | null;
    developmentAreas: string | null;
    careerObjective: string | null;
    currentFocus: string | null;
    personalCommitment: string | null;
    professionalCommitment: string | null;
  } | null;
};
const emptyProfile = {
  about: "",
  strengths: "",
  developmentAreas: "",
  careerObjective: "",
  currentFocus: "",
  personalCommitment: "",
  professionalCommitment: "",
};

type ChecklistEntry = {
  salesTasks: number;
  proposals: number;
  newClients: number;
  closedTpv: number;
  notes: string;
};

const emptyChecklistEntry = (): ChecklistEntry => ({ salesTasks: 0, proposals: 0, newClients: 0, closedTpv: 0, notes: "" });
const dateKey = (date: Date) => date.toISOString().slice(0, 10);
const mondayOf = (value: Date) => {
  const date = new Date(value);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  date.setHours(12, 0, 0, 0);
  return date;
};
const addDays = (value: Date, amount: number) => {
  const date = new Date(value);
  date.setDate(date.getDate() + amount);
  return date;
};
const formatWeek = (start: Date) => `${start.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} - ${addDays(start, 4).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`;

function WeeklyChecklist({ member, canEdit }: { member?: TeamMember; canEdit: boolean }) {
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [entries, setEntries] = useState<Record<string, ChecklistEntry>>({});
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const days = Array.from({ length: 5 }, (_, index) => addDays(weekStart, index));
  const promises = trpc.team.promises.useQuery({ targetUserId: member?.userId }, { enabled: Boolean(member) });
  const savePromise = trpc.team.savePromise.useMutation({
      onSuccess: () => setSavedAt(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })),
    onError: error => toast.error(error.message),
  });
  useEffect(() => {
    const next: Record<string, ChecklistEntry> = {};
    for (const item of promises.data ?? []) next[item.promiseDate] = { salesTasks: item.salesTasks ?? 0, proposals: item.proposals, newClients: item.newClients, closedTpv: Number(item.closedTpv ?? item.newClientsTpv ?? 0), notes: item.notes ?? "" };
    setEntries(next);
    setSavedAt(null);
  }, [promises.data, member?.userId]);
  if (!member) return null;
  const update = (key: string, field: keyof ChecklistEntry, value: string) => setEntries(current => ({ ...current, [key]: { ...(current[key] ?? emptyChecklistEntry()), [field]: field === "notes" ? value : Number(value) || 0 } }));
  const totals = days.reduce((total, day) => {
    const entry = entries[dateKey(day)] ?? emptyChecklistEntry();
    return { salesTasks: total.salesTasks + entry.salesTasks, proposals: total.proposals + entry.proposals, newClients: total.newClients + entry.newClients, closedTpv: total.closedTpv + entry.closedTpv };
  }, { salesTasks: 0, proposals: 0, newClients: 0, closedTpv: 0 });
  const saveWeek = async () => {
    for (const day of days) {
      const key = dateKey(day);
      const entry = entries[key] ?? emptyChecklistEntry();
      await savePromise.mutateAsync({ targetUserId: member.userId, promiseDate: key, ...entry, newClientsTpv: entry.closedTpv });
    }
    await promises.refetch();
    toast.success("Checklist semanal salvo.");
  };
  return (
    <section className="rounded-[10px] border border-[#1f3a2e] bg-[#10201a] p-5 text-[#edefe9] shadow-xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="font-mono text-[10px] uppercase tracking-[.14em] text-[#00d47e]">CHECKLIST SEMANAL</p><h3 className="mt-1 text-2xl font-semibold">Painel <span className="text-[#00d47e]">{member.displayName}</span></h3><p className="mt-1 text-xs text-[#9fb0a6]">{member.polo || "Polo não informado"} · {member.formalRoutes.join(" · ") || member.route || "Rotas não informadas"}</p></div>
        <div className="flex items-center gap-2"><Button variant="outline" className="border-[#1f3a2e] bg-transparent text-[#edefe9]" onClick={() => setWeekStart(addDays(weekStart, -7))}><ChevronLeft size={16} /></Button><span className="min-w-32 text-center font-mono text-xs text-[#9fb0a6]">{formatWeek(weekStart)}</span><Button variant="outline" className="border-[#1f3a2e] bg-transparent text-[#edefe9]" onClick={() => setWeekStart(addDays(weekStart, 7))}><ChevronRight size={16} /></Button></div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[["TPV REALIZADO", `R$ ${totals.closedTpv.toLocaleString("pt-BR")}`], ["TAREFAS", totals.salesTasks], ["PROPOSTAS", totals.proposals], ["CLIENTES FECHADOS", totals.newClients]].map(([label, value]) => <article key={label} className="rounded-lg border border-[#1f3a2e] bg-[#142a21] p-4"><p className="font-mono text-[10px] text-[#9fb0a6]">{label}</p><strong className="mt-2 block text-2xl">{value}</strong></article>)}
      </div>
      <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-left text-xs"><thead><tr className="border-b border-[#1f3a2e] font-mono text-[10px] uppercase text-[#9fb0a6]"><th className="p-3">Dia</th><th className="p-3">Tarefas</th><th className="p-3">Propostas</th><th className="p-3">Clientes</th><th className="p-3">TPV (R$)</th><th className="p-3">Observação</th></tr></thead><tbody>{days.map(day => { const key = dateKey(day); const entry = entries[key] ?? emptyChecklistEntry(); return <tr key={key} className="border-b border-[#1f3a2e]"><td className="p-3 font-semibold">{day.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" })}</td>{(["salesTasks", "proposals", "newClients", "closedTpv"] as const).map(field => <td className="p-2" key={field}><Input className="border-[#1f3a2e] bg-[#0b1410] text-[#edefe9]" type="number" min="0" value={entry[field] || ""} disabled={!canEdit || savePromise.isPending} onChange={event => update(key, field, event.target.value)} /></td>)}<td className="p-2"><Input className="min-w-40 border-[#1f3a2e] bg-[#0b1410] text-[#edefe9]" value={entry.notes} disabled={!canEdit || savePromise.isPending} onChange={event => update(key, "notes", event.target.value)} /></td></tr>; })}</tbody><tfoot><tr className="font-semibold text-[#00d47e]"><td className="p-3">Total semana</td><td className="p-3">{totals.salesTasks}</td><td className="p-3">{totals.proposals}</td><td className="p-3">{totals.newClients}</td><td className="p-3">{totals.closedTpv.toLocaleString("pt-BR")}</td><td /></tr></tfoot></table></div>
        <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-left text-xs"><thead><tr className="border-b border-[#1f3a2e] font-mono text-[10px] uppercase text-[#9fb0a6]"><th className="p-3">Dia</th><th className="p-3">Tarefas</th><th className="p-3">Propostas</th><th className="p-3">Clientes</th><th className="p-3">TPV (R$)</th><th className="p-3">Observação</th></tr></thead><tbody>{days.map(day => { const key = dateKey(day); const entry = entries[key] ?? emptyChecklistEntry(); return <tr key={key} className="border-b border-[#1f3a2e]"><td className="p-3 font-semibold">{day.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" })}</td>{(["salesTasks", "proposals", "newClients", "closedTpv"] as const).map(field => <td className="p-2" key={field}><Input className="border-[#1f3a2e] bg-[#0b1410] text-black placeholder:text-black/50" type="number" min="0" value={entry[field] || ""} disabled={!canEdit || savePromise.isPending} onChange={event => update(key, field, event.target.value)} /></td>)}<td className="p-2"><Input className="min-w-40 border-[#1f3a2e] bg-[#0b1410] text-black placeholder:text-black/50" value={entry.notes} disabled={!canEdit || savePromise.isPending} onChange={event => update(key, "notes", event.target.value)} /></td></tr>; })}</tbody><tfoot><tr className="font-semibold text-[#00d47e]"><td className="p-3">Total semana</td><td className="p-3">{totals.salesTasks}</td><td className="p-3">{totals.proposals}</td><td className="p-3">{totals.newClients}</td><td className="p-3">{totals.closedTpv.toLocaleString("pt-BR")}</td><td /></tr></tfoot></table></div>
      {canEdit && <Button className="mt-5 bg-[#00d47e] text-[#0b1410] hover:bg-[#5ce89c]" disabled={savePromise.isPending} onClick={saveWeek}><Save size={16} /> {savePromise.isPending ? "Salvando..." : "Salvar checklist"}</Button>}
      {savedAt && <span className="ml-3 text-xs text-[#9fb0a6]">Salvo às {savedAt}</span>}
    </section>
  );
}

function TeamProfileForm({
  member,
  canEdit,
  onSaved,
}: {
  member: TeamMember;
  canEdit: boolean;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(() => ({
    ...emptyProfile,
    ...member.teamProfile,
  }));
  useEffect(
    () => setForm({ ...emptyProfile, ...member.teamProfile }),
    [member]
  );
  const save = trpc.team.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Perfil de gestão salvo.");
      onSaved();
    },
    onError: error => toast.error(error.message),
  });
  const field = (key: keyof typeof emptyProfile, label: string) => (
    <label className="grid gap-1 text-xs">
      <span>{label}</span>
      <Textarea
        disabled={!canEdit || save.isPending}
        value={form[key] ?? ""}
        onChange={event =>
          setForm(current => ({ ...current, [key]: event.target.value }))
        }
      />
    </label>
  );
  return (
    <section className="rounded-xl border border-emerald-100 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] tracking-[.12em] text-emerald-600">
            PERFIL PROFISSIONAL
          </p>
          <h3 className="mt-1 text-xl font-semibold">{member.displayName}</h3>
          <p className="mt-1 text-xs text-emerald-700/65">
            {member.polo || "Polo não informado"} ·{" "}
            {member.route || "Rota não informada"}
          </p>
        </div>
        <UserRound className="text-emerald-600" size={20} />
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {field("about", "Apresentação")}
        {field("strengths", "Pontos fortes")}
        {field("developmentAreas", "Pontos de desenvolvimento")}
        {field("careerObjective", "Objetivo profissional")}
        {field("currentFocus", "Foco atual")}
        {field("personalCommitment", "Compromisso pessoal")}
        {field("professionalCommitment", "Compromisso profissional")}
      </div>
      {canEdit && (
        <Button
          className="mt-5 bg-[#002b1d]"
          disabled={save.isPending}
          onClick={() => save.mutate({ targetUserId: member.userId, ...form })}
        >
          <Save size={16} /> {save.isPending ? "Salvando..." : "Salvar perfil"}
        </Button>
      )}
    </section>
  );
}

const roleOptions = [
  ["agente", "Agente"],
  ["interino", "Agente Interino"],
  ["polo", "Dono de Polo"],
  ["distrital", "Distrital"],
  ["agendamento", "Agendamento"],
] as const;

function TeamOrganizationForm({
  member,
  canManage,
  canAssignLeadership,
  onSaved,
}: {
  member?: TeamMember;
  canManage: boolean;
  canAssignLeadership: boolean;
  onSaved: () => void;
}) {
  const [createMode, setCreateMode] = useState(!member);
  const [form, setForm] = useState({
    displayName: member?.displayName ?? "",
    email: member?.email ?? "",
    roles: member?.teamRoles ?? ["agente" as const],
    regional: member?.regional ?? "",
    district: member?.district ?? "",
    polo: member?.polo ?? "",
    routes: member?.formalRoutes.join(", ") ?? member?.route ?? "",
  });
  useEffect(() => {
    setCreateMode(!member);
    setForm({
      displayName: member?.displayName ?? "",
      email: member?.email ?? "",
      roles: member?.teamRoles ?? ["agente"],
      regional: member?.regional ?? "",
      district: member?.district ?? "",
      polo: member?.polo ?? "",
      routes: member?.formalRoutes.join(", ") ?? member?.route ?? "",
    });
  }, [member]);
  const update = trpc.team.updateMember.useMutation({
    onSuccess: async () => { toast.success("Funções, polo e rotas atualizados."); await onSaved(); },
    onError: error => toast.error(error.message),
  });
  const create = trpc.team.createMember.useMutation({
    onSuccess: async () => { toast.success("Pessoa criada como acesso pendente."); setCreateMode(false); await onSaved(); },
    onError: error => toast.error(error.message),
  });
  if (!canManage) return null;
  const pending = update.isPending || create.isPending;
  const routes = form.routes.split(",").map(route => route.trim()).filter(Boolean);
  const toggleRole = (role: (typeof roleOptions)[number][0]) => setForm(current => ({
    ...current,
    roles: current.roles.includes(role) ? current.roles.filter(item => item !== role) : [...current.roles, role],
  }));
  return (
    <section className="rounded-xl border border-lime-200 bg-lime-50/60 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] font-semibold tracking-[.13em] text-emerald-700">FUNÇÕES E ACESSOS</p>
          <h3 className="mt-1 text-xl font-semibold">{createMode ? "Cadastrar pessoa sem acesso" : `Editar ${member?.displayName}`}</h3>
          <p className="mt-1 text-xs text-emerald-800/70">Combine funções na mesma pessoa. Rotas devem ser separadas por vírgula.</p>
        </div>
        {createMode ? <UserPlus className="text-emerald-700" size={20} /> : <ShieldCheck className="text-emerald-700" size={20} />}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-xs">Nome<Input value={form.displayName} disabled={pending} onChange={event => setForm(current => ({ ...current, displayName: event.target.value }))} /></label>
        <label className="grid gap-1 text-xs">E-mail {createMode ? "para ativação" : ""}<Input type="email" value={form.email} disabled={!createMode || pending} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} /></label>
        <label className="grid gap-1 text-xs">Regional<Input value={form.regional} disabled={pending} onChange={event => setForm(current => ({ ...current, regional: event.target.value }))} /></label>
        <label className="grid gap-1 text-xs">Distrito<Input value={form.district} disabled={pending} onChange={event => setForm(current => ({ ...current, district: event.target.value }))} /></label>
        <label className="grid gap-1 text-xs">Polo<Input value={form.polo} disabled={pending} onChange={event => setForm(current => ({ ...current, polo: event.target.value }))} /></label>
        <label className="grid gap-1 text-xs md:col-span-2">Rotas<Input placeholder="Tremembé, Center Norte" value={form.routes} disabled={pending} onChange={event => setForm(current => ({ ...current, routes: event.target.value }))} /></label>
      </div>
      <div className="mt-4">
        <p className="text-xs font-medium">Funções</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {roleOptions.map(([role, label]) => (
            <label key={role} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${form.roles.includes(role) ? "border-emerald-500 bg-white" : "border-emerald-100 bg-white/60"}`}>
              <input type="checkbox" checked={form.roles.includes(role)} disabled={pending || (!canAssignLeadership && (role === "polo" || role === "distrital"))} onChange={() => toggleRole(role)} />
              {label}
            </label>
          ))}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button className="bg-[#002b1d]" disabled={pending || !form.roles.length} onClick={() => {
          const payload = { displayName: form.displayName, roles: form.roles, regional: form.regional, district: form.district, polo: form.polo, routes };
          if (createMode) create.mutate({ ...payload, email: form.email });
          else if (member) update.mutate({ ...payload, targetUserId: member.userId });
        }}>
          {createMode ? <Plus size={16} /> : <Save size={16} />} {pending ? "Salvando..." : createMode ? "Criar pessoa" : "Salvar funções"}
        </Button>
        {!createMode && <Button variant="outline" disabled={pending} onClick={() => setCreateMode(true)}><UserPlus size={16} /> Nova pessoa</Button>}
      </div>
      {!createMode && member && <p className="mt-3 text-xs text-emerald-800/70">{member.hasAccess ? "Acesso já criado." : "Acesso pendente: a pessoa poderá concluir o cadastro com este e-mail."}</p>}
    </section>
  );
}

export default function TeamManagementPanel() {
  const { user } = useAuth();
  const team = trpc.team.list.useQuery();
  const utils = trpc.useUtils();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected =
    team.data?.find(member => member.userId === selectedId) ?? team.data?.[0];
  const currentId = selected?.userId;
  const actorMember = team.data?.find(member => member.userId === user?.id);
  const actorRoles = actorMember?.teamRoles ?? [];
  const canManageOrganization = Boolean(user?.role === "admin" || actorMember?.leadershipRole !== "none" || actorRoles.some(role => ["polo", "distrital", "interino", "agendamento"].includes(role)));
  const canAssignLeadership = user?.role === "admin";
  const canManageSelected = Boolean(
    selected &&
      (selected.userId === user?.id || user?.role === "admin" ||
        actorMember?.leadershipRole !== "none" ||
        actorRoles.some(role => ["polo", "distrital", "interino", "agendamento"].includes(role)))
  );
  if (team.isLoading)
    return (
      <div className="rounded-xl border border-emerald-100 bg-white p-8 text-sm text-emerald-700">
        Carregando Gestão do Time...
      </div>
    );
  if (team.isError || !team.data?.length)
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950">
        Não foi possível carregar os membros do time.
      </div>
    );
  return (
    <div className="space-y-6">
      <section>
        <p className="font-mono text-[10px] font-semibold tracking-[.14em] text-emerald-600">
          GESTÃO DO TIME
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-.055em]">
          Pessoas, compromissos e rotina.
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-emerald-800/65">
          A estrutura organizacional vem dos perfis existentes. Campos de
          regional, distrito, polo, rota e liderança permanecem protegidos no
          servidor.
        </p>
      </section>
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {team.data.map(member => (
          <button
            type="button"
            key={member.userId}
            onClick={() => setSelectedId(member.userId)}
            className={`rounded-xl border p-4 text-left transition ${member.userId === currentId ? "border-lime-400 bg-lime-50" : "border-emerald-100 bg-white hover:border-lime-300"}`}
          >
            <div className="flex items-center justify-between">
              <b>{member.displayName}</b>
              {member.leadershipRole !== "none" && (
                <ShieldCheck size={16} className="text-emerald-600" />
              )}
            </div>
            <span className="mt-2 block text-xs text-emerald-700/65">
              {member.polo || "Polo não informado"} ·{" "}
              {member.route || "Rota não informada"}
            </span>
          </button>
        ))}
      </section>
      <TeamOrganizationForm member={selected} canManage={canManageOrganization} canAssignLeadership={canAssignLeadership} onSaved={() => utils.team.list.invalidate()} />
      {selected && (
        <TeamProfileForm
          member={selected}
          canEdit={canManageSelected}
          onSaved={() => utils.team.list.invalidate()}
        />
      )}
      <WeeklyChecklist member={selected} canEdit={canManageSelected} />
    </div>
  );
}
