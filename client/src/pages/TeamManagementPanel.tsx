import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Save,
  ShieldCheck,
  UserRound,
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
const today = () => new Date().toISOString().slice(0, 10);
const emptyProfile = {
  about: "",
  strengths: "",
  developmentAreas: "",
  careerObjective: "",
  currentFocus: "",
  personalCommitment: "",
  professionalCommitment: "",
};

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
          className="mt-5 bg-[#0e3426]"
          disabled={save.isPending}
          onClick={() => save.mutate({ targetUserId: member.userId, ...form })}
        >
          <Save size={16} /> {save.isPending ? "Salvando..." : "Salvar perfil"}
        </Button>
      )}
    </section>
  );
}

export default function TeamManagementPanel() {
  const { user } = useAuth();
  const team = trpc.team.list.useQuery();
  const utils = trpc.useUtils();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [promiseDate, setPromiseDate] = useState(today);
  const [promise, setPromise] = useState({
    proposals: 0,
    newClients: 0,
    newClientsTpv: 0,
    notes: "",
  });
  const [routine, setRoutine] = useState({
    id: undefined as number | undefined,
    scopeType: "user" as "user" | "polo" | "district" | "regional",
    weekday: 1,
    startTime: "09:00",
    endTime: "12:00",
    activity: "",
    dupla: "",
    description: "",
  });
  const selected =
    team.data?.find(member => member.userId === selectedId) ?? team.data?.[0];
  const currentId = selected?.userId;
  const actorMember = team.data?.find(member => member.userId === user?.id);
  const canManageSelected = Boolean(
    selected &&
      (selected.userId === user?.id || user?.role === "admin" ||
        actorMember?.leadershipRole !== "none")
  );
  const promises = trpc.team.promises.useQuery(
    { targetUserId: currentId, promiseDate },
    { enabled: Boolean(currentId) }
  );
  const schedules = trpc.team.schedules.useQuery(
    {},
    { enabled: Boolean(currentId) }
  );
  const savePromise = trpc.team.savePromise.useMutation({
    onSuccess: async () => {
      await promises.refetch();
      toast.success("Compromisso registrado.");
    },
    onError: error => toast.error(error.message),
  });
  const saveRoutine = trpc.team.saveSchedule.useMutation({
    onSuccess: async () => {
      await schedules.refetch();
      setRoutine(current => ({ ...current, id: undefined, activity: "", dupla: "", description: "" }));
      toast.success("Rotina salva.");
    },
    onError: error => toast.error(error.message),
  });
  const deactivateRoutine = trpc.team.deactivateSchedule.useMutation({
    onSuccess: async () => {
      await schedules.refetch();
      toast.success("Rotina desativada.");
    },
    onError: error => toast.error(error.message),
  });
  const ownPromise = promises.data?.[0];
  useEffect(() => {
    if (ownPromise)
      setPromise({
        proposals: ownPromise.proposals,
        newClients: ownPromise.newClients,
        newClientsTpv: Number(ownPromise.newClientsTpv),
        notes: ownPromise.notes ?? "",
      });
  }, [ownPromise]);
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
      {selected && (
        <TeamProfileForm
          member={selected}
          canEdit={canManageSelected}
          onSaved={() => utils.team.list.invalidate()}
        />
      )}
      <section className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
        <article className="rounded-xl border border-emerald-100 bg-white p-5">
          <div className="flex items-center gap-2">
            <ClipboardList className="text-emerald-600" size={18} />
            <div>
              <p className="font-mono text-[10px] tracking-[.12em] text-emerald-600">
                PROMESSA DO DIA
              </p>
              <h3 className="font-semibold">{selected?.displayName}</h3>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs">
              Data
              <Input
                type="date"
                value={promiseDate}
                onChange={event => setPromiseDate(event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-xs">
              Propostas
              <Input
                type="number"
                min="0"
                value={promise.proposals}
                onChange={event =>
                  setPromise(current => ({
                    ...current,
                    proposals: Number(event.target.value) || 0,
                  }))
                }
              />
            </label>
            <label className="grid gap-1 text-xs">
              Novos clientes
              <Input
                type="number"
                min="0"
                value={promise.newClients}
                onChange={event =>
                  setPromise(current => ({
                    ...current,
                    newClients: Number(event.target.value) || 0,
                  }))
                }
              />
            </label>
            <label className="grid gap-1 text-xs">
              TPV de novos clientes
              <Input
                type="number"
                min="0"
                value={promise.newClientsTpv}
                onChange={event =>
                  setPromise(current => ({
                    ...current,
                    newClientsTpv: Number(event.target.value) || 0,
                  }))
                }
              />
            </label>
          </div>
          <label className="mt-3 grid gap-1 text-xs">
            Observações
            <Textarea
              value={promise.notes}
              onChange={event =>
                setPromise(current => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
            />
          </label>
          <Button
            className="mt-4 bg-[#0e3426]"
            disabled={savePromise.isPending}
            onClick={() =>
              savePromise.mutate({
                targetUserId: currentId,
                promiseDate,
                ...promise,
              })
            }
          >
            <CheckCircle2 size={16} /> Salvar compromisso
          </Button>
        </article>
        <article className="rounded-xl border border-emerald-100 bg-white p-5">
          <div className="flex items-center gap-2">
            <CalendarClock className="text-emerald-600" size={18} />
            <div>
              <p className="font-mono text-[10px] tracking-[.12em] text-emerald-600">
                ROTINAS
              </p>
              <h3 className="font-semibold">Cadência configurável</h3>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {schedules.data
              ?.filter(item => item.active && ((item.scopeType === "user" && item.scopeId === currentId) || user?.role === "admin"))
              .map(item => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-lg bg-[#f6f8f2] p-3 text-xs"
                >
                  <div>
                    <b>{item.activity}</b>
                    <span className="block text-emerald-700/65">
                      {item.weekday} · {item.startTime}–{item.endTime}
                      {item.dupla ? ` · ${item.dupla}` : ""}
                    </span>
                    <small className="block text-emerald-700/60">
                      {item.description}
                    </small>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="text-emerald-700 underline" onClick={() => setRoutine({ id: item.id, scopeType: "user", weekday: item.weekday, startTime: item.startTime, endTime: item.endTime, activity: item.activity, dupla: item.dupla ?? "", description: item.description ?? "" })}>Editar</button>
                    <button type="button" className="text-emerald-700 underline" onClick={() => deactivateRoutine.mutate({ id: item.id })}>Desativar</button>
                  </div>
                </div>
              ))}
            {!schedules.data?.some(item => item.active && ((item.scopeType === "user" && item.scopeId === currentId) || user?.role === "admin")) && (
              <p className="rounded-lg bg-[#f6f8f2] p-3 text-xs text-emerald-700/65">
                Nenhuma rotina configurada para este escopo.
              </p>
            )}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs">
              Dia
              <select
                value={routine.weekday}
                onChange={event =>
                  setRoutine(current => ({
                    ...current,
                    weekday: Number(event.target.value),
                  }))
                }
              >
                {[
                  "Domingo",
                  "Segunda",
                  "Terça",
                  "Quarta",
                  "Quinta",
                  "Sexta",
                  "Sábado",
                ].map((day, index) => (
                  <option key={day} value={index}>
                    {day}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs">
              Tipo de escopo
              <select
                value={routine.scopeType}
                onChange={event =>
                  setRoutine(current => ({
                    ...current,
                    scopeType: event.target.value as typeof routine.scopeType,
                  }))
                }
              >
                <option value="user">Pessoa</option>
                {user?.role === "admin" && <option value="polo">Polo</option>}
                {user?.role === "admin" && <option value="district">Distrito</option>}
                {user?.role === "admin" && <option value="regional">Regional</option>}
              </select>
            </label>
            <label className="grid gap-1 text-xs">
              Início
              <Input
                type="time"
                value={routine.startTime}
                onChange={event =>
                  setRoutine(current => ({
                    ...current,
                    startTime: event.target.value,
                  }))
                }
              />
            </label>
            <label className="grid gap-1 text-xs">
              Fim
              <Input
                type="time"
                value={routine.endTime}
                onChange={event =>
                  setRoutine(current => ({
                    ...current,
                    endTime: event.target.value,
                  }))
                }
              />
            </label>
            <label className="grid gap-1 text-xs sm:col-span-2">
              Atividade
              <Input
                value={routine.activity}
                onChange={event =>
                  setRoutine(current => ({
                    ...current,
                    activity: event.target.value,
                  }))
                }
                placeholder="Ex.: reunião, P.A.P., mapeamento"
              />
            </label>
            <label className="grid gap-1 text-xs">
              Dupla
              <Input
                value={routine.dupla}
                onChange={event =>
                  setRoutine(current => ({
                    ...current,
                    dupla: event.target.value,
                  }))
                }
              />
            </label>
            <label className="grid gap-1 text-xs">
              Descrição
              <Input
                value={routine.description}
                onChange={event =>
                  setRoutine(current => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          <Button
            className="mt-4 bg-[#0e3426]"
            disabled={saveRoutine.isPending}
            onClick={() =>
              saveRoutine.mutate({ ...routine, scopeId: currentId })
            }
          >
            <CalendarClock size={16} /> Salvar rotina
          </Button>
        </article>
      </section>
    </div>
  );
}
