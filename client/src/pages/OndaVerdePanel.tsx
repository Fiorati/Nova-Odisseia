// Legado preservado para migração futura; não participa da navegação atual.
// @ts-nocheck
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Handshake, Plus, Target, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const examples = ["Terça e quinta", "Segunda, quarta e sexta"];

export default function OndaVerdePanel() {
  const team = trpc.onda.members.useQuery();
  const duos = trpc.onda.duos.useQuery();
  const utils = trpc.useUtils();
  const saveDuo = trpc.onda.saveDuo.useMutation({ onSuccess: async () => { await utils.onda.duos.invalidate(); toast.success("Dupla salva na Onda Verde."); }, onError: error => toast.error(error.message) });
  const members = team.data ?? [];
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [days, setDays] = useState(examples[0]);
  const [meeting, setMeeting] = useState("12h00");
  const [plan, setPlan] = useState(
    "Plano de ação individual pela manhã; rota em dupla à tarde"
  );
  const [target, setTarget] = useState(25);
  const names = useMemo(
    () => new Map(members.map(member => [member.userId, member.displayName])),
    [members]
  );
  const addDuo = () => {
    if (!first || !second || first === second) {
      toast.error("Selecione dois agentes diferentes.");
      return;
    }
    saveDuo.mutate({ firstUserId: Number(first), secondUserId: Number(second), days, meeting, plan, target });
    setFirst("");
    setSecond("");
    toast.success("Dupla criada na Onda Verde.");
  };
  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-[#0e3426] p-6 text-white md:p-8">
        <p className="font-mono text-[10px] tracking-[.14em] text-lime-200">
          ONDA VERDE
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-.055em]">
          Duplas que aceleram a rota.
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-100/75">
          Agentes do mesmo Polo combinam plano individual, rota em dupla e uma
          meta clara de tarefas de venda. O convite é operacional e preserva o
          escopo do Polo.
        </p>
      </section>
      <section className="rounded-xl border border-emerald-100 bg-white p-5">
        <div className="flex items-center gap-2">
          <Handshake className="text-emerald-600" size={19} />
          <div>
            <p className="font-mono text-[10px] tracking-[.12em] text-emerald-600">
              NOVA DUPLA
            </p>
            <h3 className="font-semibold">Convide outro agente do seu Polo</h3>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-xs">
            Primeiro agente
            <select
              value={first}
              onChange={event => setFirst(event.target.value)}
            >
              <option value="">Selecionar</option>
              {members.map(member => (
                <option value={member.userId} key={member.userId}>
                  {member.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs">
            Segundo agente
            <select
              value={second}
              onChange={event => setSecond(event.target.value)}
            >
              <option value="">Selecionar</option>
              {members.map(member => (
                <option value={member.userId} key={member.userId}>
                  {member.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs">
            Dias de operação
            <Input
              value={days}
              onChange={event => setDays(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-xs">
            Ponto de encontro
            <Input
              value={meeting}
              onChange={event => setMeeting(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-xs md:col-span-2">
            Dinâmica da dupla
            <Input
              value={plan}
              onChange={event => setPlan(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-xs">
            Meta mínima de tarefas
            <Input
              type="number"
              min="1"
              value={target}
              onChange={event => setTarget(Number(event.target.value) || 1)}
            />
          </label>
        </div>
        <Button className="mt-4 bg-[#0e3426]" disabled={saveDuo.isPending} onClick={addDuo}>
          <Plus size={16} /> Criar dupla
        </Button>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        {(duos.data ?? []).map((duo, index) => (
          <article
            className="rounded-xl border border-lime-300 bg-lime-50 p-5"
            key={duo.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] tracking-[.12em] text-emerald-600">
                  DUPLA {index + 1}
                </p>
                <h3 className="mt-1 text-xl font-semibold">
                  {names.get(duo.firstUserId)} + {names.get(duo.secondUserId)}
                </h3>
              </div>
              <UsersRound className="text-emerald-600" size={20} />
            </div>
            <div className="mt-4 grid gap-2 text-sm text-emerald-900">
              <p>
                <b>Encontro:</b> {duo.meeting}
              </p>
              <p>
                <b>Cadência:</b> {duo.days}
              </p>
              <p>
                <b>Plano:</b> {duo.plan}
              </p>
              <p className="flex items-center gap-2">
                <Target size={15} /> <b>{duo.target} tarefas de venda</b>
              </p>
            </div>
          </article>
        ))}
        {!duos.data?.length && (
          <div className="rounded-xl border border-dashed border-emerald-200 bg-white p-6 text-sm text-emerald-700/65 md:col-span-2">
            Nenhuma dupla criada ainda. O agente pode iniciar uma combinação com
            outro agente do Polo.
          </div>
        )}
      </section>
    </div>
  );
}
