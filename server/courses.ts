import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { canUseViewAs } from "../shared/viewAs";
import { COURSE_AREAS, canSeeCourse, courseProgress, type Course, type CourseArea, type CourseLesson, type SaveCourseInput, type SaveLessonInput } from "../shared/courses";
import { parseVideoUrl } from "../shared/videos";

type MinimalUser = { id: number; role: string; email?: string | null };

const database = () => {
  if (!process.env.DATABASE_URL) throw new Error("Banco de dados indisponível.");
  return drizzle(process.env.DATABASE_URL);
};

let ensured: Promise<unknown> | null = null;
function ensureTables() {
  ensured ??= (async () => {
    const db = database();
    await db.execute(sql.raw("CREATE TABLE IF NOT EXISTS `academy_courses` (`id` int AUTO_INCREMENT NOT NULL, `area` varchar(16) NOT NULL DEFAULT 'geral', `title` varchar(160) NOT NULL, `summary` text NOT NULL, `audience` varchar(16) NOT NULL DEFAULT 'all', `userIdsJson` text NOT NULL, `position` int NOT NULL DEFAULT 0, `createdBy` int NOT NULL, `createdAt` timestamp NOT NULL DEFAULT (now()), `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP, CONSTRAINT `academy_courses_id` PRIMARY KEY(`id`))"));
    await db.execute(sql.raw("CREATE TABLE IF NOT EXISTS `academy_lessons` (`id` int AUTO_INCREMENT NOT NULL, `courseId` int NOT NULL, `moduleTitle` varchar(140) NOT NULL, `title` varchar(160) NOT NULL, `url` varchar(700) NOT NULL, `summary` text NOT NULL, `position` int NOT NULL DEFAULT 0, `createdAt` timestamp NOT NULL DEFAULT (now()), CONSTRAINT `academy_lessons_id` PRIMARY KEY(`id`), INDEX `academy_lessons_course` (`courseId`))"));
    await db.execute(sql.raw("CREATE TABLE IF NOT EXISTS `academy_progress` (`userId` int NOT NULL, `lessonId` int NOT NULL, `doneAt` timestamp NOT NULL DEFAULT (now()), CONSTRAINT `academy_progress_pk` PRIMARY KEY(`userId`, `lessonId`))"));
  })().catch(error => { ensured = null; throw error; });
  return ensured;
}

const rowsOf = (result: unknown): Record<string, unknown>[] => (Array.isArray(result) ? (Array.isArray(result[0]) ? result[0] : result) : []) as Record<string, unknown>[];
const ids = (value: unknown): number[] => { try { const parsed = JSON.parse(String(value ?? "[]")); return Array.isArray(parsed) ? parsed.map(Number).filter(n => Number.isSafeInteger(n) && n > 0) : []; } catch { return []; } };

function toCourse(row: Record<string, unknown>): Course {
  const area = (COURSE_AREAS as readonly string[]).includes(String(row.area)) ? (String(row.area) as CourseArea) : "geral";
  return { id: Number(row.id), area, title: String(row.title), summary: String(row.summary ?? ""), audience: row.audience === "users" ? "users" : "all", userIds: ids(row.userIdsJson), position: Number(row.position ?? 0) };
}
function toLesson(row: Record<string, unknown>): CourseLesson {
  return { id: Number(row.id), courseId: Number(row.courseId), moduleTitle: String(row.moduleTitle), title: String(row.title), url: String(row.url), summary: String(row.summary ?? ""), position: Number(row.position ?? 0) };
}

/**
 * Catálogo da Academia para quem está sendo exibido (`user`). O admin principal (`realUser`) vê todos os cursos,
 * inclusive os restritos, e recebe os dados de edição.
 */
export async function getAcademy(user: MinimalUser, realUser: MinimalUser, area?: CourseArea) {
  await ensureTables();
  const db = database();
  const canManage = canUseViewAs(realUser) && realUser.id === user.id;
  const courseRows = rowsOf(await db.execute(area
    ? sql`SELECT id, area, title, summary, audience, userIdsJson, position FROM academy_courses WHERE area = ${area} ORDER BY position ASC, id ASC LIMIT 200`
    : sql`SELECT id, area, title, summary, audience, userIdsJson, position FROM academy_courses ORDER BY position ASC, id ASC LIMIT 200`));
  const courses = courseRows.map(toCourse).filter(course => canManage || canSeeCourse(course, user.id));
  const courseIds = courses.map(course => course.id);
  const lessonRows = !courseIds.length ? [] : rowsOf(await db.execute(sql`SELECT id, courseId, moduleTitle, title, url, summary, position FROM academy_lessons WHERE courseId IN (${sql.join(courseIds.map(id => sql`${id}`), sql`, `)}) ORDER BY position ASC, id ASC LIMIT 2000`));
  const lessons = lessonRows.map(toLesson);
  const doneRows = rowsOf(await db.execute(sql`SELECT lessonId FROM academy_progress WHERE userId = ${user.id} LIMIT 5000`));
  const doneIds = doneRows.map(row => Number(row.lessonId));
  return {
    canManage,
    courses: courses.map(course => {
      const own = lessons.filter(lesson => lesson.courseId === course.id);
      return {
        ...course,
        userIds: canManage ? course.userIds : [],
        lessons: own.map(lesson => ({ ...lesson, embed: parseVideoUrl(lesson.url), done: doneIds.includes(lesson.id) })),
        progress: courseProgress(own, doneIds),
      };
    }),
  };
}

export async function saveCourse(adminId: number, input: SaveCourseInput) {
  await ensureTables();
  const db = database();
  const userIds = input.audience === "users" ? Array.from(new Set(input.userIds)) : [];
  if (input.id) {
    await db.execute(sql`UPDATE academy_courses SET area = ${input.area}, title = ${input.title}, summary = ${input.summary}, audience = ${input.audience}, userIdsJson = ${JSON.stringify(userIds)} WHERE id = ${input.id}`);
  } else {
    const max = rowsOf(await db.execute(sql`SELECT COALESCE(MAX(position), 0) AS m FROM academy_courses`))[0]?.m;
    await db.execute(sql`INSERT INTO academy_courses (area, title, summary, audience, userIdsJson, position, createdBy) VALUES (${input.area}, ${input.title}, ${input.summary}, ${input.audience}, ${JSON.stringify(userIds)}, ${Number(max ?? 0) + 1}, ${adminId})`);
  }
  return { ok: true as const };
}

export async function deleteCourse(id: number) {
  await ensureTables();
  const db = database();
  await db.execute(sql`DELETE FROM academy_progress WHERE lessonId IN (SELECT id FROM academy_lessons WHERE courseId = ${id})`);
  await db.execute(sql`DELETE FROM academy_lessons WHERE courseId = ${id}`);
  await db.execute(sql`DELETE FROM academy_courses WHERE id = ${id}`);
  return { ok: true as const };
}

export async function saveLesson(input: SaveLessonInput) {
  await ensureTables();
  const db = database();
  const exists = rowsOf(await db.execute(sql`SELECT id FROM academy_courses WHERE id = ${input.courseId} LIMIT 1`));
  if (!exists.length) throw new TRPCError({ code: "NOT_FOUND", message: "Curso não encontrado." });
  if (input.id) {
    await db.execute(sql`UPDATE academy_lessons SET moduleTitle = ${input.moduleTitle}, title = ${input.title}, url = ${input.url}, summary = ${input.summary} WHERE id = ${input.id} AND courseId = ${input.courseId}`);
  } else {
    const max = rowsOf(await db.execute(sql`SELECT COALESCE(MAX(position), 0) AS m FROM academy_lessons WHERE courseId = ${input.courseId}`))[0]?.m;
    await db.execute(sql`INSERT INTO academy_lessons (courseId, moduleTitle, title, url, summary, position) VALUES (${input.courseId}, ${input.moduleTitle}, ${input.title}, ${input.url}, ${input.summary}, ${Number(max ?? 0) + 1})`);
  }
  return { ok: true as const };
}

export async function deleteLesson(id: number) {
  await ensureTables();
  const db = database();
  await db.execute(sql`DELETE FROM academy_progress WHERE lessonId = ${id}`);
  await db.execute(sql`DELETE FROM academy_lessons WHERE id = ${id}`);
  return { ok: true as const };
}

/** Marca/desmarca aula concluída. Só vale para aulas de cursos que a pessoa pode ver. */
export async function setLessonDone(user: MinimalUser, lessonId: number, done: boolean) {
  await ensureTables();
  const db = database();
  const row = rowsOf(await db.execute(sql`SELECT c.audience, c.userIdsJson FROM academy_lessons l JOIN academy_courses c ON c.id = l.courseId WHERE l.id = ${lessonId} LIMIT 1`))[0];
  if (!row || !(canUseViewAs(user) || canSeeCourse({ audience: row.audience === "users" ? "users" : "all", userIds: ids(row.userIdsJson) }, user.id))) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Aula não encontrada." });
  }
  if (done) await db.execute(sql`INSERT IGNORE INTO academy_progress (userId, lessonId) VALUES (${user.id}, ${lessonId})`);
  else await db.execute(sql`DELETE FROM academy_progress WHERE userId = ${user.id} AND lessonId = ${lessonId}`);
  return { ok: true as const };
}
