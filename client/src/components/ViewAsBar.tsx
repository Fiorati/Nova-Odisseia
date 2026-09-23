import { trpc } from "@/lib/trpc";
import { getViewAsUserId, setViewAsUserId } from "@/lib/viewAs";
import { Eye, LogOut } from "lucide-react";

/**
 * Barra exclusiva do Admin: escolhe um e-mail e passa a ver a plataforma
 * exatamente como aquele usuário, em modo somente leitura.
 */
export default function ViewAsBar() {
  const status = trpc.auth.viewAsStatus.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const options = trpc.admin.viewAsOptions.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  if (!options.data) return null;

  const current = getViewAsUserId();
  const viewing = status.data?.viewing ? status.data.target : null;
  const switchTo = (id: number | null) => { setViewAsUserId(id); window.location.reload(); };

  return (
    <div
      role="region"
      aria-label="Ver como usuário"
      className={`sticky top-0 z-[60] flex flex-wrap items-center gap-3 border-b px-4 py-2 text-sm ${viewing ? "border-amber-400 bg-[#3a1d16]" : "border-emerald-900 bg-[#002b1d]"}`}
      style={{ color: viewing ? "#fef3c7" : "#d9f99d" }}
    >
      <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[.12em]"><Eye size={15} /> VER COMO USUÁRIO</span>
      <select
        aria-label="Escolher usuário"
        value={current ?? ""}
        onChange={event => switchTo(event.target.value ? Number(event.target.value) : null)}
        className="min-w-64 rounded-md border border-white/20 bg-white px-2 py-1 text-sm"
        style={{ color: "#052e16" }}
      >
        <option value="">Minha conta (Admin)</option>
        {options.data.map(item => (
          <option key={item.id} value={item.id}>{item.email}{item.name ? ` · ${item.name}` : ""}</option>
        ))}
      </select>
      {viewing ? (
        <>
          <span>Você está vendo como <b>{viewing.name || viewing.email}</b>. Somente leitura: nada é salvo na conta dele.</span>
          <button type="button" onClick={() => switchTo(null)} className="ml-auto inline-flex items-center gap-1 rounded-md bg-amber-200 px-3 py-1 text-xs font-semibold" style={{ color: "#3a1d16" }}>
            <LogOut size={14} /> Voltar para minha conta
          </button>
        </>
      ) : (
        <span className="opacity-80">Escolha um e-mail para ver a plataforma como aquele usuário.</span>
      )}
    </div>
  );
}
