import { useState } from "react";
import { Clapperboard, Pencil, Plus, Trash2, Users, Globe2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { parseVideoUrl, VIDEO_PLACEMENT_LABELS, type PlatformVideo, type VideoAudience, type VideoPlacement } from "@shared/videos";

type Tone = "dark" | "light";

/**
 * Espaço de vídeo de uma tela. O usuário vê o vídeo feito para ele (ou o liberado para todos).
 * Só o admin principal vê os controles para cadastrar, trocar e apagar.
 */
export default function VideoSlot({ placement, tone = "light", compact = false }: { placement: VideoPlacement; tone?: Tone; compact?: boolean }) {
  const slot = trpc.videos.slot.useQuery({ placement }, { retry: false, refetchOnWindowFocus: false });
  const [editing, setEditing] = useState<PlatformVideo | "new" | null>(null);
  const data = slot.data;
  if (!data || (!data.video && !data.canManage)) return null;
  const dark = tone === "dark";

  return <section aria-label={`Vídeo: ${VIDEO_PLACEMENT_LABELS[placement]}`} className={`overflow-hidden rounded-2xl border ${dark ? "border-amber-200/30 bg-[#0b2a20] text-white" : "border-emerald-100 bg-white text-emerald-950"} ${compact ? "p-3" : "p-4 md:p-5"}`}>
    {data.video ? <>
      <div className="flex items-center gap-2 pb-3"><Clapperboard size={16} className={dark ? "text-amber-200" : "text-amber-700"}/><p className={`font-mono text-[10px] tracking-[.14em] ${dark ? "text-amber-200" : "text-amber-800"}`}>{data.video.title.toUpperCase()}</p></div>
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
        {data.video.embed.kind === "file"
          ? <video className="h-full w-full" src={data.video.embed.embedUrl} controls preload="metadata" playsInline/>
          : <iframe className="absolute inset-0 h-full w-full" src={data.video.embed.embedUrl} title={data.video.title} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen/>}
      </div>
    </> : <div className={`flex items-center gap-3 rounded-xl border border-dashed p-4 text-sm ${dark ? "border-amber-200/40 text-amber-50/80" : "border-amber-300 text-emerald-950/70"}`}><Clapperboard size={18} className="shrink-0"/><span><b>Espaço de vídeo · {VIDEO_PLACEMENT_LABELS[placement]}.</b> Só você (admin) vê este aviso. Cadastre um link para aparecer aqui.</span></div>}
    {data.canManage && <AdminVideos placement={placement} videos={data.manage ?? []} editing={editing} setEditing={setEditing} dark={dark}/>}
  </section>;
}

function AdminVideos({ placement, videos, editing, setEditing, dark }: { placement: VideoPlacement; videos: PlatformVideo[]; editing: PlatformVideo | "new" | null; setEditing: (v: PlatformVideo | "new" | null) => void; dark: boolean }) {
  const utils = trpc.useUtils();
  const remove = trpc.videos.remove.useMutation({ onSuccess: async () => { await utils.videos.slot.invalidate({ placement }); toast.success("Vídeo removido."); }, onError: e => toast.error(e.message) });
  const muted = dark ? "text-amber-50/70" : "text-emerald-950/60";
  return <div className={`mt-4 rounded-xl p-3 text-sm ${dark ? "bg-white/5" : "bg-emerald-50/60"}`}>
    <div className="flex flex-wrap items-center justify-between gap-2"><p className={`font-mono text-[10px] tracking-[.12em] ${dark ? "text-lime-200" : "text-emerald-800"}`}>ADMIN · VÍDEOS DESTE ESPAÇO ({videos.length})</p>{editing === null && <button type="button" onClick={() => setEditing("new")} className="inline-flex items-center gap-1 rounded-full bg-amber-300 px-3 py-1 text-xs font-semibold text-emerald-950"><Plus size={14}/> Cadastrar vídeo</button>}</div>
    {videos.length > 0 && <ul className="mt-2 space-y-1">{videos.map(video => <li key={video.id} className="flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-1 text-xs">{video.audience === "all" ? <><Globe2 size={13}/> Todos</> : <><Users size={13}/> {video.userIds.length} usuário(s)</>}</span><b className="truncate">{video.title}</b><span className={`truncate text-xs ${muted}`}>{video.url}</span><button type="button" aria-label={`Editar ${video.title}`} onClick={() => setEditing(video)} className="ml-auto"><Pencil size={14}/></button><button type="button" aria-label={`Apagar ${video.title}`} onClick={() => { if (window.confirm(`Apagar o vídeo "${video.title}"?`)) remove.mutate({ id: video.id }); }}><Trash2 size={14}/></button></li>)}</ul>}
    {editing !== null && <VideoForm placement={placement} initial={editing === "new" ? null : editing} onDone={() => setEditing(null)} dark={dark}/>}
    <p className={`mt-2 text-xs ${muted}`}>Aceita YouTube (inclusive não listado), Vimeo ou arquivo .mp4. Quem tem vídeo próprio vê o dele; os demais veem o liberado para todos.</p>
  </div>;
}

function VideoForm({ placement, initial, onDone, dark }: { placement: VideoPlacement; initial: PlatformVideo | null; onDone: () => void; dark: boolean }) {
  const utils = trpc.useUtils();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [audience, setAudience] = useState<VideoAudience>(initial?.audience ?? "all");
  const [userIds, setUserIds] = useState<number[]>(initial?.userIds ?? []);
  const [filter, setFilter] = useState("");
  const people = trpc.admin.viewAsOptions.useQuery(undefined, { enabled: audience === "users", retry: false, refetchOnWindowFocus: false });
  const save = trpc.videos.save.useMutation({ onSuccess: async () => { await utils.videos.slot.invalidate({ placement }); toast.success("Vídeo salvo."); onDone(); }, onError: e => toast.error(e.message) });
  const valid = parseVideoUrl(url) !== null;
  const input = `w-full rounded-md border px-2 py-1.5 text-sm ${dark ? "border-white/20 bg-white/10 text-white placeholder:text-white/40" : "border-emerald-200 bg-white"}`;
  const list = (people.data ?? []).filter(p => `${p.email} ${p.name ?? ""}`.toLowerCase().includes(filter.trim().toLowerCase())).slice(0, 60);
  return <form className="mt-3 space-y-2" onSubmit={e => { e.preventDefault(); save.mutate({ id: initial?.id, placement, title, url, audience, userIds }); }}>
    <input aria-label="Título do vídeo" className={input} placeholder="Título (ex.: A convocação)" value={title} onChange={e => setTitle(e.target.value)}/>
    <input aria-label="Link do vídeo" className={input} placeholder="Link do YouTube, Vimeo ou .mp4" value={url} onChange={e => setUrl(e.target.value)}/>
    {url && !valid && <p className="text-xs text-red-400">Link não reconhecido. Use YouTube, Vimeo ou um .mp4 em https.</p>}
    <div className="flex flex-wrap gap-3 text-sm"><label className="inline-flex items-center gap-1"><input type="radio" checked={audience === "all"} onChange={() => setAudience("all")}/> Liberar para todos</label><label className="inline-flex items-center gap-1"><input type="radio" checked={audience === "users"} onChange={() => setAudience("users")}/> Só para usuários escolhidos</label></div>
    {audience === "users" && <div className="rounded-md border border-emerald-200/40 p-2"><input aria-label="Buscar usuário" className={input} placeholder="Buscar por e-mail ou nome" value={filter} onChange={e => setFilter(e.target.value)}/><div className="mt-2 max-h-40 space-y-1 overflow-auto">{list.map(p => <label key={p.id} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={userIds.includes(p.id)} onChange={e => setUserIds(e.target.checked ? [...userIds, p.id] : userIds.filter(id => id !== p.id))}/> {p.email}{p.name ? ` · ${p.name}` : ""}</label>)}</div><p className="mt-1 text-xs">{userIds.length} selecionado(s)</p></div>}
    <div className="flex gap-2"><button type="submit" disabled={!valid || title.trim().length < 2 || save.isPending || (audience === "users" && userIds.length === 0)} style={{ color: "#fff" }} className="rounded-full bg-emerald-800 px-4 py-1.5 text-xs font-semibold disabled:opacity-40">{save.isPending ? "Salvando..." : "Salvar vídeo"}</button><button type="button" onClick={onDone} className="rounded-full px-3 py-1.5 text-xs">Cancelar</button></div>
  </form>;
}
