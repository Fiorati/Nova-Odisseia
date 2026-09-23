import { useState } from "react";
import { trpc } from "@/lib/trpc";
import type { VideoAudience } from "@shared/videos";

/** "Liberar para todos" ou "Só para usuários escolhidos", com busca por e-mail/nome. Uso exclusivo do admin principal. */
export default function AudienceFields({ audience, setAudience, userIds, setUserIds }: { audience: VideoAudience; setAudience: (v: VideoAudience) => void; userIds: number[]; setUserIds: (v: number[]) => void }) {
  const [filter, setFilter] = useState("");
  const people = trpc.admin.viewAsOptions.useQuery(undefined, { enabled: audience === "users", retry: false, refetchOnWindowFocus: false });
  const list = (people.data ?? []).filter(p => `${p.email} ${p.name ?? ""}`.toLowerCase().includes(filter.trim().toLowerCase())).slice(0, 60);
  return <>
    <div className="flex flex-wrap gap-3 text-sm"><label className="inline-flex items-center gap-1"><input type="radio" checked={audience === "all"} onChange={() => setAudience("all")}/> Liberar para todos</label><label className="inline-flex items-center gap-1"><input type="radio" checked={audience === "users"} onChange={() => setAudience("users")}/> Só para usuários escolhidos</label></div>
    {audience === "users" && <div className="rounded-md border border-emerald-200 p-2"><input aria-label="Buscar usuário" className="w-full rounded-md border border-emerald-200 bg-white px-2 py-1.5 text-sm" placeholder="Buscar por e-mail ou nome" value={filter} onChange={e => setFilter(e.target.value)}/><div className="mt-2 max-h-40 space-y-1 overflow-auto">{list.map(p => <label key={p.id} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={userIds.includes(p.id)} onChange={e => setUserIds(e.target.checked ? [...userIds, p.id] : userIds.filter(id => id !== p.id))}/> {p.email}{p.name ? ` · ${p.name}` : ""}</label>)}</div><p className="mt-1 text-xs">{userIds.length} selecionado(s)</p></div>}
  </>;
}
