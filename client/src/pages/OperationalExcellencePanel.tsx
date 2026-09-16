import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Check, Mail, UploadCloud } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type ExcellenceKind =
  | "sparring"
  | "lista"
  | "migracao"
  | "ativacao"
  | "onboarding";
const kinds: Array<{ id: ExcellenceKind; label: string; description: string }> =
  [
    {
      id: "sparring",
      label: "Sparring",
      description: "Acompanhe treinamentos obrigatórios, presença e nota.",
    },
    {
      id: "lista",
      label: "Lista Inteligente",
      description: "Controle o envio das mensagens automáticas do polo.",
    },
    {
      id: "migracao",
      label: "Migração",
      description: "Acompanhe clientes M-1 por agente e evolução de TPV.",
    },
    {
      id: "ativacao",
      label: "Ativação",
      description: "Confirme a ativação de clientes credenciados em M0.",
    },
    {
      id: "onboarding",
      label: "Onboarding",
      description: "D0, produtos, D15 e Upsell em uma única cadência.",
    },
  ];

type RowState = {
  done: boolean;
  note: string;
  reminder: boolean;
  activated: boolean;
  d0: boolean;
  products: boolean;
  d15: boolean;
  upsell: boolean;
};
const blank = (): RowState => ({
  done: false,
  note: "",
  reminder: false,
  activated: false,
  d0: false,
  products: false,
  d15: false,
  upsell: false,
});

export default function OperationalExcellencePanel() {
  const [kind, setKind] = useState<ExcellenceKind>("sparring");
  const team = trpc.team.list.useQuery();
  const records = trpc.onda.list.useQuery({ kind });
  const saveRecord = trpc.onda.save.useMutation({ onSuccess: () => toast.success("Acompanhamento salvo."), onError: error => toast.error(error.message) });
  const remind = trpc.onda.remind.useMutation({ onSuccess: () => toast.success("Lembrete enviado por e-mail."), onError: error => toast.error(error.message) });
  const [delegated, setDelegated] = useState<number | "">("");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<Record<number, RowState>>({});
  const members = team.data ?? [];
  const activeKind = kinds.find(item => item.id === kind)!;
  const getRow = (id: number) => rows[id] ?? blank();
  const update = (id: number, patch: Partial<RowState>) =>
    setRows(current => ({ ...current, [id]: { ...getRow(id), ...patch } }));
  useEffect(() => {
    const next: Record<number, RowState> = {};
    for (const record of records.data ?? []) {
      next[record.targetUserId] = { ...blank(), ...(record.payload as Partial<RowState>) };
    }
    setRows(next);
  }, [records.data]);
  const sendReminder = (id: number) => {
    update(id, { reminder: true });
    remind.mutate({ targetUserId: id, kind: activeKind.label });
  };
  const saveRow = (id: number) => saveRecord.mutate({ targetUserId: id, kind, payload: getRow(id), sourceFileName: fileName });
  const isChecklist = kind === "ativacao" || kind === "onboarding";
  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-[#0e3426] p-6 text-white md:p-8">
        <p className="font-mono text-[10px] tracking-[.14em] text-lime-200">
          EXCELÊNCIA OPERACIONAL
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-.055em]">
          Acompanhamento que vira padrão.
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-100/75">
          Cada responsável acompanha seu Polo com visão agente a agente. Os
          registros ficam organizados por contexto, sem misturar a operação
          privada do vendedor.
        </p>
      </section>
      <section className="grid gap-3 md:grid-cols-5">
        {kinds.map(item => (
          <button
            type="button"
            key={item.id}
            onClick={() => setKind(item.id)}
            className={`rounded-xl border p-4 text-left transition ${kind === item.id ? "border-lime-400 bg-lime-50" : "border-emerald-100 bg-white hover:border-lime-300"}`}
          >
            <b className="block text-sm">{item.label}</b>
            <span className="mt-2 block text-xs leading-5 text-emerald-700/65">
              {item.description}
            </span>
          </button>
        ))}
      </section>
      <section className="rounded-xl border border-emerald-100 bg-white p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="font-mono text-[10px] tracking-[.12em] text-emerald-600">
              {activeKind.label.toUpperCase()}
            </p>
            <h3 className="mt-1 text-xl font-semibold">
              {activeKind.description}
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-[#0e3426] px-3 py-2 text-xs font-semibold text-white">
              <UploadCloud size={15} /> Anexar print
              <input
                className="sr-only"
                type="file"
                accept="image/*"
                onChange={event =>
                  setFileName(event.target.files?.[0]?.name ?? "")
                }
              />
            </label>
            <label className="grid gap-1 text-[10px] text-emerald-700">
              Responsável
              <select
                value={delegated}
                onChange={event =>
                  setDelegated(
                    event.target.value ? Number(event.target.value) : ""
                  )
                }
              >
                <option value="">Selecionar agente</option>
                {members.map(member => (
                  <option value={member.userId} key={member.userId}>
                    {member.displayName}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        {fileName && (
          <p className="mt-3 rounded-lg bg-lime-50 p-3 text-xs text-emerald-900">
            Arquivo recebido: <b>{fileName}</b>. Revise os registros gerados
            antes de salvar.
          </p>
        )}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="border-b border-emerald-100 font-mono text-[10px] uppercase tracking-[.08em] text-emerald-700/65">
              <tr>
                <th className="pb-3">Agente</th>
                <th className="pb-3">Polo / rota</th>
                <th className="pb-3">
                  {isChecklist
                    ? "Cliente / anexo"
                    : kind === "lista"
                      ? "Mensagem automática"
                      : "Status"}
                </th>
                <th className="pb-3">Nota / observação</th>
                <th className="pb-3">Ação</th>
              </tr>
            </thead>
            <tbody>
              {members.map(member => {
                const row = getRow(member.userId);
                return (
                  <tr
                    className="border-b border-emerald-50"
                    key={member.userId}
                  >
                    <td className="py-3 font-semibold">{member.displayName}</td>
                    <td className="py-3">
                      {member.polo || "Polo não informado"}
                      <small className="block text-emerald-700/55">
                        {member.route || "Rota não informada"}
                      </small>
                    </td>
                    <td className="py-3">
                      {kind === "sparring" && (
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={row.done}
                            onChange={event =>
                              update(member.userId, {
                                done: event.target.checked,
                              })
                            }
                          />{" "}
                          Feito
                        </label>
                      )}
                      {kind === "lista" && (
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={row.done}
                            onChange={event =>
                              update(member.userId, {
                                done: event.target.checked,
                              })
                            }
                          />{" "}
                          Mensagem enviada
                        </label>
                      )}
                      {kind === "migracao" && (
                        <Input
                          placeholder="Cliente / TPV M-1"
                          value={row.note}
                          onChange={event =>
                            update(member.userId, { note: event.target.value })
                          }
                        />
                      )}
                      {isChecklist && (
                        <div className="flex flex-wrap gap-2">
                          {[
                            "activated",
                            ...(kind === "onboarding"
                              ? ["d0", "products", "d15", "upsell"]
                              : []),
                          ].map(key => (
                            <label
                              className="inline-flex items-center gap-1"
                              key={key}
                            >
                              <input
                                type="checkbox"
                                checked={row[key as keyof RowState] as boolean}
                                onChange={event =>
                                  update(member.userId, {
                                    [key]: event.target.checked,
                                  })
                                }
                              />
                              {key === "activated"
                                ? "Ativado"
                                : key === "products"
                                  ? "Produtos"
                                  : key.toUpperCase()}
                            </label>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3">
                      <Input
                        className="min-w-44"
                        placeholder={
                          kind === "sparring"
                            ? "Nota do Sparring"
                            : "Observação"
                        }
                        value={row.note}
                        onChange={event =>
                          update(member.userId, { note: event.target.value })
                        }
                      />
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => saveRow(member.userId)}><Check size={14} /> Salvar</Button><Button variant="outline" size="sm" disabled={row.done || row.reminder || remind.isPending} onClick={() => sendReminder(member.userId)}><Mail size={14} /> {row.reminder ? "Lembrete enviado" : "Enviar lembrete"}</Button></div>
                      {row.done && (
                        <Check
                          className="ml-2 inline text-emerald-600"
                          size={16}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
              {!members.length && (
                <tr>
                  <td
                    colSpan={5}
                    className="py-8 text-center text-emerald-700/65"
                  >
                    Nenhum agente no escopo atual.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
