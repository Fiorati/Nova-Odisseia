import { GraduationCap, PlayCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { openCourseLater } from "@/lib/academy";
import type { CourseArea } from "@shared/courses";

/** Prateleira de módulos de estudo de um portal (Território de Treino, Inscrição do Templo). Abre o curso na Academia. */
export default function CourseShelf({ area, title, accent, onOpenAcademy }: { area: Exclude<CourseArea, "geral">; title: string; accent: "red" | "violet"; onOpenAcademy: () => void }) {
  const academy = trpc.academy.list.useQuery({ area }, { retry: false, refetchOnWindowFocus: false });
  const data = academy.data;
  if (!data || (!data.courses.length && !data.canManage)) return null;
  const color = accent === "red" ? "#b91c1c" : "#6d28d9";
  const tone = accent === "red" ? { text: "text-red-700", border: "border-red-100", bar: "bg-red-600", soft: "bg-red-50" } : { text: "text-violet-700", border: "border-violet-100", bar: "bg-violet-600", soft: "bg-violet-50" };
  const open = (id?: number) => { if (id) openCourseLater(id); onOpenAcademy(); };
  return <section aria-label={title} className={`rounded-2xl border ${tone.border} bg-white p-5`}>
    <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><GraduationCap className={tone.text} size={18}/><p style={{ color }} className="font-mono text-[10px] tracking-[.12em]">{title.toUpperCase()} · MÓDULOS DE ESTUDO</p></div><button type="button" onClick={() => open()} style={{ color }} className="text-xs font-semibold">Ver na Academia</button></div>
    {data.courses.length ? <div className="mt-4 grid gap-3 md:grid-cols-2">{data.courses.map(course => <button type="button" key={course.id} onClick={() => open(course.id)} className={`rounded-xl border ${tone.border} p-4 text-left transition hover:shadow`}>
      <div className="flex items-start justify-between gap-3"><b className="text-base leading-6">{course.title}</b><PlayCircle className={`shrink-0 ${tone.text}`} size={20}/></div>
      <p className="mt-1 text-xs text-emerald-950/60">{course.progress.total} aula(s) · {course.progress.percent}% concluído</p>
      <div className={`mt-3 h-1.5 overflow-hidden rounded-full ${tone.soft}`}><div className={`h-full ${tone.bar}`} style={{ width: `${course.progress.percent}%` }}/></div>
    </button>)}</div>
    : <p className="mt-3 rounded-xl border border-dashed border-amber-300 p-4 text-sm text-emerald-950/70"><b>Nenhum curso aqui ainda.</b> Só você (admin) vê este aviso. Crie um curso na Academia e escolha "{title}" como lugar.</p>}
  </section>;
}
