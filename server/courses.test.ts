import { describe, expect, it } from "vitest";
import { canSeeCourse, courseProgress, groupModules, saveCourseSchema, saveLessonSchema, type CourseLesson } from "../shared/courses";

const lesson = (id: number, moduleTitle: string, position: number): CourseLesson => ({ id, courseId: 1, moduleTitle, title: `Aula ${id}`, url: "https://youtu.be/dQw4w9WgXcQ", summary: "", position });

describe("módulos e progresso", () => {
  const lessons = [lesson(1, "Módulo 1", 1), lesson(2, "Módulo 2", 2), lesson(3, "módulo 1", 3), lesson(4, "Módulo 2", 4)];
  it("agrupa aulas por módulo na ordem de cadastro, ignorando maiúsculas", () => {
    expect(groupModules(lessons).map(mod => [mod.title, mod.lessons.map(l => l.id)])).toEqual([["Módulo 1", [1, 3]], ["Módulo 2", [2, 4]]]);
  });
  it("calcula o percentual e a próxima aula seguindo a ordem dos módulos", () => {
    expect(courseProgress(lessons, [])).toEqual({ total: 4, done: 0, percent: 0, nextLessonId: 1 });
    expect(courseProgress(lessons, [1, 3])).toEqual({ total: 4, done: 2, percent: 50, nextLessonId: 2 });
    expect(courseProgress(lessons, [1, 2, 3, 4]).nextLessonId).toBe(1);
    expect(courseProgress([], [])).toEqual({ total: 0, done: 0, percent: 0, nextLessonId: null });
  });
  it("ignora progresso de aulas que não são do curso", () => expect(courseProgress(lessons, [99]).done).toBe(0));
});

describe("público e validação", () => {
  it("curso restrito só aparece para os escolhidos", () => {
    expect(canSeeCourse({ audience: "all", userIds: [] }, 5)).toBe(true);
    expect(canSeeCourse({ audience: "users", userIds: [7] }, 7)).toBe(true);
    expect(canSeeCourse({ audience: "users", userIds: [7] }, 5)).toBe(false);
  });
  it("valida curso e aula", () => {
    expect(saveCourseSchema.safeParse({ area: "treino", title: "Prospecção", audience: "users", userIds: [] }).success).toBe(false);
    expect(saveCourseSchema.safeParse({ area: "templo", title: "Autoconhecimento", audience: "all" }).success).toBe(true);
    expect(saveCourseSchema.safeParse({ area: "outro", title: "X curso", audience: "all" }).success).toBe(false);
    expect(saveLessonSchema.safeParse({ courseId: 1, moduleTitle: "M1", title: "Aula", url: "https://evil.com/a" }).success).toBe(false);
    expect(saveLessonSchema.safeParse({ courseId: 1, moduleTitle: "M1", title: "Aula", url: "https://vimeo.com/76979871" }).success).toBe(true);
  });
});
