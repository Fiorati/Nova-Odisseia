import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { canUseViewAs } from "../shared/viewAs";
import { parseVideoUrl, videoForUser, VIDEO_PLACEMENTS, type PlatformVideo, type SaveVideoInput, type VideoPlacement } from "../shared/videos";

type MinimalUser = { id: number; role: string; email?: string | null };

const database = () => {
  if (!process.env.DATABASE_URL) throw new Error("Banco de dados indisponível.");
  return drizzle(process.env.DATABASE_URL);
};

let ensured: Promise<unknown> | null = null;
function ensureTable() {
  ensured ??= database()
    .execute(sql.raw("CREATE TABLE IF NOT EXISTS `platform_videos` (`id` int AUTO_INCREMENT NOT NULL, `placement` varchar(64) NOT NULL, `title` varchar(160) NOT NULL, `url` varchar(700) NOT NULL, `audience` varchar(16) NOT NULL DEFAULT 'all', `userIdsJson` text NOT NULL, `createdBy` int NOT NULL, `createdAt` timestamp NOT NULL DEFAULT (now()), `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP, CONSTRAINT `platform_videos_id` PRIMARY KEY(`id`), INDEX `platform_videos_placement` (`placement`))"))
    .catch(error => { ensured = null; throw error; });
  return ensured;
}

const rowsOf = (result: unknown): Record<string, unknown>[] => (Array.isArray(result) ? (Array.isArray(result[0]) ? result[0] : result) : []) as Record<string, unknown>[];

function toVideo(row: Record<string, unknown>): PlatformVideo | null {
  const placement = String(row.placement) as VideoPlacement;
  if (!VIDEO_PLACEMENTS.includes(placement)) return null;
  let userIds: number[] = [];
  try { const parsed = JSON.parse(String(row.userIdsJson ?? "[]")); if (Array.isArray(parsed)) userIds = parsed.map(Number).filter(n => Number.isSafeInteger(n) && n > 0); } catch { userIds = []; }
  const updated = row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt ?? "");
  return { id: Number(row.id), placement, title: String(row.title), url: String(row.url), audience: row.audience === "users" ? "users" : "all", userIds, updatedAt: updated };
}

async function listByPlacement(placement: VideoPlacement) {
  await ensureTable();
  const rows = rowsOf(await database().execute(sql`SELECT id, placement, title, url, audience, userIdsJson, updatedAt FROM platform_videos WHERE placement = ${placement} ORDER BY updatedAt DESC, id DESC LIMIT 200`));
  return rows.map(toVideo).filter((video): video is PlatformVideo => video !== null);
}

/**
 * O que a pessoa vê num lugar da plataforma. `user` é quem está sendo exibido (no "ver como usuário", é o usuário visto);
 * `realUser` é quem está logado de verdade, e só o admin principal recebe os controles de edição.
 */
export async function getVideoSlot(user: MinimalUser, realUser: MinimalUser, placement: VideoPlacement) {
  const videos = await listByPlacement(placement);
  const current = videoForUser(videos, user.id);
  const embed = current ? parseVideoUrl(current.url) : null;
  const canManage = canUseViewAs(realUser);
  return {
    video: current && embed ? { id: current.id, title: current.title, embed } : null,
    canManage,
    manage: canManage ? videos : undefined,
  };
}

export async function saveVideo(adminId: number, input: SaveVideoInput) {
  await ensureTable();
  const userIds = input.audience === "users" ? Array.from(new Set(input.userIds)) : [];
  const db = database();
  if (input.id) {
    await db.execute(sql`UPDATE platform_videos SET title = ${input.title}, url = ${input.url}, audience = ${input.audience}, userIdsJson = ${JSON.stringify(userIds)} WHERE id = ${input.id} AND placement = ${input.placement}`);
  } else {
    await db.execute(sql`INSERT INTO platform_videos (placement, title, url, audience, userIdsJson, createdBy) VALUES (${input.placement}, ${input.title}, ${input.url}, ${input.audience}, ${JSON.stringify(userIds)}, ${adminId})`);
  }
  return { ok: true as const };
}

export async function deleteVideo(id: number) {
  await ensureTable();
  await database().execute(sql`DELETE FROM platform_videos WHERE id = ${id}`);
  return { ok: true as const };
}
