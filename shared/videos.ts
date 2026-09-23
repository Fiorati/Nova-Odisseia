import { z } from "zod";

/** Lugares da plataforma que recebem vídeo (fase 1). */
export const VIDEO_PLACEMENTS = [
  "jornada_intro",
  "ulisses_intro",
  "ilha:profissional",
  "ilha:pessoal",
  "ilha:emocional",
  "ilha:comunidade",
] as const;
export type VideoPlacement = (typeof VIDEO_PLACEMENTS)[number];

export const VIDEO_PLACEMENT_LABELS: Record<VideoPlacement, string> = {
  "jornada_intro": "Entrada de Minha Jornada",
  "ulisses_intro": "Entrada de Ulisses",
  "ilha:profissional": "Ilha do Ofício · Profissional",
  "ilha:pessoal": "Ilha do Lar · Pessoal",
  "ilha:emocional": "Ilha do Ânimo · Emocional",
  "ilha:comunidade": "Ilha da Ágora · Comunidade",
};

export type VideoEmbed =
  | { kind: "youtube"; id: string; embedUrl: string }
  | { kind: "vimeo"; id: string; embedUrl: string }
  | { kind: "file"; embedUrl: string };

/**
 * Converte o link colado pelo admin em um player seguro.
 * Aceita YouTube (watch, youtu.be, shorts, embed, não listado), Vimeo e arquivo .mp4/.webm direto (https).
 * Qualquer outra coisa é recusada.
 */
export function parseVideoUrl(raw: string): VideoEmbed | null {
  let url: URL;
  try { url = new URL(raw.trim()); } catch { return null; }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase().replace(/^www\.|^m\./, "");
  const ytId = (value: string | null | undefined) => (value && /^[A-Za-z0-9_-]{11}$/.test(value) ? value : null);
  let id: string | null = null;
  if (host === "youtu.be") id = ytId(url.pathname.split("/")[1]);
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const [, first, second] = url.pathname.split("/");
    if (first === "watch") id = ytId(url.searchParams.get("v"));
    else if (first === "shorts" || first === "embed" || first === "live") id = ytId(second);
  }
  if (id) return { kind: "youtube", id, embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1` };
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    const index = parts.findIndex(part => /^\d{6,12}$/.test(part));
    if (index >= 0) {
      const vid = parts[index];
      const hashPart = parts[index + 1];
      const hash = url.searchParams.get("h") ?? (hashPart && /^[a-f0-9]{6,20}$/i.test(hashPart) ? hashPart : null);
      return { kind: "vimeo", id: vid, embedUrl: `https://player.vimeo.com/video/${vid}${hash ? `?h=${hash}` : ""}` };
    }
    return null;
  }
  if (/\.(mp4|webm)$/i.test(url.pathname)) return { kind: "file", embedUrl: url.toString() };
  return null;
}

export const videoAudienceSchema = z.enum(["all", "users"]);
export type VideoAudience = z.infer<typeof videoAudienceSchema>;

export const saveVideoSchema = z.object({
  id: z.number().int().positive().optional(),
  placement: z.enum(VIDEO_PLACEMENTS),
  title: z.string().trim().min(2, "Dê um título ao vídeo.").max(140),
  url: z.string().trim().max(600).refine(value => parseVideoUrl(value) !== null, "Link não reconhecido. Use YouTube, Vimeo ou um arquivo .mp4 em https."),
  audience: videoAudienceSchema,
  userIds: z.array(z.number().int().positive()).max(500).default([]),
}).refine(value => value.audience === "all" || value.userIds.length > 0, { message: "Escolha ao menos um usuário ou libere para todos.", path: ["userIds"] });
export type SaveVideoInput = z.infer<typeof saveVideoSchema>;

export type PlatformVideo = { id: number; placement: VideoPlacement; title: string; url: string; audience: VideoAudience; userIds: number[]; updatedAt: string };

/** Qual vídeo o usuário vê: o mais recente feito para ele; se não houver, o mais recente liberado para todos. */
export function videoForUser(videos: PlatformVideo[], userId: number): PlatformVideo | null {
  const newest = (list: PlatformVideo[]) => [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.id - a.id)[0] ?? null;
  return newest(videos.filter(video => video.audience === "users" && video.userIds.includes(userId)))
    ?? newest(videos.filter(video => video.audience === "all"));
}
