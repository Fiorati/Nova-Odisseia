/** Curso a abrir quando a pessoa chega na Academia vinda de outro portal (Esparta, Delfos). */
export const ACADEMY_OPEN_KEY = "nova-odisseia:academia-curso";
export const openCourseLater = (courseId: number) => { try { window.sessionStorage.setItem(ACADEMY_OPEN_KEY, String(courseId)); } catch { /* sem storage */ } };
export const takeCourseToOpen = (): number | null => {
  try { const raw = window.sessionStorage.getItem(ACADEMY_OPEN_KEY); window.sessionStorage.removeItem(ACADEMY_OPEN_KEY); const id = Number(raw); return Number.isSafeInteger(id) && id > 0 ? id : null; } catch { return null; }
};
