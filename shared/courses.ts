import { z } from "zod";
import { parseVideoUrl, videoAudienceSchema, type VideoAudience } from "./videos";

/** Onde o curso aparece além da Academia: no Território de Treino (Esparta) ou na Inscrição do Templo (Delfos). */
export const COURSE_AREAS = ["geral", "treino", "templo"] as const;
export type CourseArea = (typeof COURSE_AREAS)[number];
export const COURSE_AREA_LABELS: Record<CourseArea, string> = {
  geral: "Só na Academia",
  treino: "Território de Treino (Esparta)",
  templo: "Inscrição do Templo (Delfos)",
};

export const saveCourseSchema = z.object({
  id: z.number().int().positive().optional(),
  area: z.enum(COURSE_AREAS),
  title: z.string().trim().min(2, "Dê um título ao curso.").max(140),
  summary: z.string().trim().max(600).default(""),
  audience: videoAudienceSchema,
  userIds: z.array(z.number().int().positive()).max(500).default([]),
}).refine(value => value.audience === "all" || value.userIds.length > 0, { message: "Escolha ao menos um usuário ou libere para todos.", path: ["userIds"] });
export type SaveCourseInput = z.infer<typeof saveCourseSchema>;

export const saveLessonSchema = z.object({
  id: z.number().int().positive().optional(),
  courseId: z.number().int().positive(),
  moduleTitle: z.string().trim().min(1, "Informe o módulo.").max(120),
  title: z.string().trim().min(2, "Dê um título à aula.").max(140),
  url: z.string().trim().max(600).refine(value => parseVideoUrl(value) !== null, "Link não reconhecido. Use YouTube, Vimeo ou um arquivo .mp4 em https."),
  summary: z.string().trim().max(1200).default(""),
});
export type SaveLessonInput = z.infer<typeof saveLessonSchema>;

export type CourseLesson = { id: number; courseId: number; moduleTitle: string; title: string; url: string; summary: string; position: number };
export type Course = { id: number; area: CourseArea; title: string; summary: string; audience: VideoAudience; userIds: number[]; position: number };
export type CourseModule = { title: string; lessons: CourseLesson[] };

/** Quem vê o curso: todos, ou só os usuários escolhidos. O admin principal vê tudo para poder editar. */
export function canSeeCourse(course: Pick<Course, "audience" | "userIds">, userId: number): boolean {
  return course.audience === "all" || course.userIds.includes(userId);
}

/** Agrupa as aulas em módulos, na ordem em que o primeiro item de cada módulo foi cadastrado. */
export function groupModules(lessons: CourseLesson[]): CourseModule[] {
  const sorted = [...lessons].sort((a, b) => a.position - b.position || a.id - b.id);
  const modules: CourseModule[] = [];
  for (const lesson of sorted) {
    const key = lesson.moduleTitle.trim();
    let mod = modules.find(item => item.title.toLowerCase() === key.toLowerCase());
    if (!mod) { mod = { title: key, lessons: [] }; modules.push(mod); }
    mod.lessons.push(lesson);
  }
  return modules;
}

/** Percentual concluído e a próxima aula a assistir (a primeira não concluída na ordem dos módulos). */
export function courseProgress(lessons: CourseLesson[], doneIds: number[]) {
  const ordered = groupModules(lessons).flatMap(mod => mod.lessons);
  const done = new Set(doneIds);
  const doneCount = ordered.filter(lesson => done.has(lesson.id)).length;
  return {
    total: ordered.length,
    done: doneCount,
    percent: ordered.length ? Math.round((doneCount / ordered.length) * 100) : 0,
    nextLessonId: ordered.find(lesson => !done.has(lesson.id))?.id ?? ordered[0]?.id ?? null,
  };
}
