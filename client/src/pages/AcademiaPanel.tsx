import { useEffect, useMemo, useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";
import { ArrowLeft, CheckCircle2, ChevronRight, Circle, Landmark, GraduationCap, Pencil, PlayCircle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { takeCourseToOpen } from "@/lib/academy";
import AudienceFields from "@/components/AudienceFields";
import { COURSE_AREAS, COURSE_AREA_LABELS, groupModules, type CourseArea } from "@shared/courses";
import { parseVideoUrl, type VideoAudience } from "@shared/videos";

type Academy = inferRouterOutputs<AppRouter>["academy"]["list"];
type CourseView = Academy["courses"][number];
type LessonView = CourseView["lessons"][number];

const areaBadge: Record<CourseArea, string> = { geral: "Academia", treino: "Território de Treino", templo: "Inscrição do Templo" };
const covers = ["from-[#0e3426] to-[#1f5a45]", "from-[#3a1d16] to-[#7a3b22]", "from-[#2b1f4a] to-[#4c3a82]", "from-[#073d40] to-[#0f6b6f]"];
const input = "w-full rounded-md border border-emerald-200 bg-white px-2 py-1.5 text-sm";

export default function AcademiaPanel() {
  const academy = trpc.academy.list.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const [openId, setOpenId] = useState<number | null>(() => takeCourseToOpen());
  const [creating, setCreating] = useState(false);
  const data = academy.data;
  const course = data?.courses.find(item => item.id === openId) ?? null;
  useEffect(() => { window.scrollTo({ top: 0 }); }, [openId]);

  if (course) return <CourseDetail course={course} canManage={Boolean(data?.canManage)} onBack={() => setOpenId(null)}/>;

  return <div className="space-y-6">
    <section className="relative overflow-hidden rounded-3xl bg-[#0e3426] p-7 text-white shadow-xl md:p-10">
      <Landmark className="absolute -right-6 -top-6 h-48 w-48 text-amber-200/10"/>
      <p className="font-mono text-[10px] tracking-[.16em] text-amber-200">ACADEMIA · A ESCOLA DA TRAVESSIA</p>
      <h2 className="mt-3 max-w-2xl text-3xl font-semibold md:text-4xl">Estudo que vira travessia.</h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-emerald-50/75">Como no jardim de Platão, aqui ficam os cursos e as vídeo-aulas da sua jornada, organizados em módulos. Assista no seu ritmo, marque o que concluiu e retome de onde parou.</p>
    </section>

    {data?.canManage && <section className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-mono text-[10px] tracking-[.12em] text-emerald-800">ADMIN · CURSOS ({data.courses.length})</p>{!creating && <button type="button" onClick={() => setCreating(true)} className="inline-flex items-center gap-1 rounded-full bg-amber-300 px-3 py-1 text-xs font-semibold text-emerald-950"><Plus size={14}/> Novo curso</button>}</div>
      {creating && <CourseForm onDone={() => setCreating(false)}/>}
      <p className="mt-2 text-xs text-emerald-950/60">Cada curso pode aparecer também no Território de Treino (Esparta) ou na Inscrição do Templo (Delfos). Aulas por link: YouTube (inclusive não listado), Vimeo ou .mp4.</p>
    </section>}

    {!data ? <p className="font-mono text-sm text-emerald-700">CARREGANDO A ACADEMIA...</p>
      : data.courses.length === 0 ? <section className="rounded-2xl border border-dashed border-emerald-200 bg-white p-8 text-center"><GraduationCap className="mx-auto text-emerald-700"/><h3 className="mt-3 text-xl font-semibold">Os primeiros cursos estão sendo preparados.</h3><p className="mt-2 text-sm text-emerald-950/60">Quando uma aula for liberada para você, ela aparece aqui.</p></section>
      : <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.courses.map((item, index) => <article key={item.id} className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
        <button type="button" onClick={() => setOpenId(item.id)} style={{ color: "#fef3c7" }} className={`relative block h-32 w-full bg-gradient-to-br ${covers[index % covers.length]} p-5 text-left text-white`}>
          <span className="rounded-full bg-white/15 px-2 py-0.5 font-mono text-[9px] tracking-[.12em]">{areaBadge[item.area].toUpperCase()}</span>
          <GraduationCap className="absolute bottom-4 right-4 h-10 w-10 text-amber-200/70"/>
          <p className="absolute bottom-4 left-5 font-mono text-[10px] tracking-[.12em] text-amber-100">{groupModules(item.lessons).length} MÓDULO(S) · {item.progress.total} AULA(S)</p>
        </button>
        <div className="p-5">
          <h3 className="text-lg font-semibold leading-6">{item.title}</h3>
          {item.summary && <p className="mt-2 line-clamp-2 text-sm text-emerald-950/60">{item.summary}</p>}
          <div className="mt-4 flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-emerald-50"><div className="h-full bg-emerald-700" style={{ width: `${item.progress.percent}%` }}/></div><span className="font-mono text-xs">{item.progress.percent}%</span></div>
          <button type="button" onClick={() => setOpenId(item.id)} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald-800">{item.progress.done === 0 ? "Começar" : item.progress.done === item.progress.total ? "Rever" : "Continuar"} <ChevronRight size={16}/></button>
          {data.canManage && <p className="mt-2 text-[11px] text-emerald-950/50">{item.audience === "all" ? "Liberado para todos" : `Só para ${item.userIds.length} usuário(s)`}</p>}
        </div>
      </article>)}</section>}
  </div>;
}

function CourseDetail({ course, canManage, onBack }: { course: CourseView; canManage: boolean; onBack: () => void }) {
  const utils = trpc.useUtils();
  const modules = useMemo(() => groupModules(course.lessons) as { title: string; lessons: LessonView[] }[], [course.lessons]);
  const ordered = modules.flatMap(mod => mod.lessons);
  const [lessonId, setLessonId] = useState<number | null>(course.progress.nextLessonId);
  const [editingCourse, setEditingCourse] = useState(false);
  const [lessonForm, setLessonForm] = useState<LessonView | "new" | null>(null);
  const lesson = ordered.find(item => item.id === lessonId) ?? ordered[0] ?? null;
  const next = lesson ? ordered[ordered.indexOf(lesson) + 1] : undefined;
  const refresh = () => utils.academy.list.invalidate();
  const setDone = trpc.academy.setDone.useMutation({ onSuccess: refresh, onError: e => toast.error(e.message) });
  const removeCourse = trpc.academy.removeCourse.useMutation({ onSuccess: async () => { await refresh(); toast.success("Curso apagado."); onBack(); }, onError: e => toast.error(e.message) });
  const removeLesson = trpc.academy.removeLesson.useMutation({ onSuccess: async () => { await refresh(); toast.success("Aula apagada."); }, onError: e => toast.error(e.message) });

  return <div className="space-y-5">
    <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-800"><ArrowLeft size={16}/> Todos os cursos</button>
    <section className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="font-mono text-[10px] tracking-[.14em] text-amber-700">{areaBadge[course.area].toUpperCase()}</p><h2 className="mt-1 text-3xl font-semibold">{course.title}</h2>{course.summary && <p className="mt-2 max-w-3xl text-sm text-emerald-950/60">{course.summary}</p>}</div>
      <div className="min-w-48"><div className="flex justify-between text-xs"><span>{course.progress.done}/{course.progress.total} aulas</span><b>{course.progress.percent}%</b></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-emerald-50"><div className="h-full bg-emerald-700" style={{ width: `${course.progress.percent}%` }}/></div></div>
    </section>

    {canManage && <section className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2"><p className="mr-auto font-mono text-[10px] tracking-[.12em] text-emerald-800">ADMIN · {course.audience === "all" ? "LIBERADO PARA TODOS" : `SÓ PARA ${course.userIds.length} USUÁRIO(S)`}</p>
        <button type="button" onClick={() => { setEditingCourse(true); setLessonForm(null); }} className="inline-flex items-center gap-1 rounded-full border border-emerald-300 px-3 py-1 text-xs"><Pencil size={13}/> Editar curso</button>
        <button type="button" onClick={() => { setLessonForm("new"); setEditingCourse(false); }} className="inline-flex items-center gap-1 rounded-full bg-amber-300 px-3 py-1 text-xs font-semibold text-emerald-950"><Plus size={14}/> Adicionar aula</button>
        <button type="button" onClick={() => { if (window.confirm(`Apagar o curso "${course.title}" e todas as aulas?`)) removeCourse.mutate({ id: course.id }); }} className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs text-red-700"><Trash2 size={13}/> Apagar</button></div>
      {editingCourse && <CourseForm initial={course} onDone={() => setEditingCourse(false)}/>}
      {lessonForm !== null && <LessonForm courseId={course.id} modules={modules.map(mod => mod.title)} initial={lessonForm === "new" ? null : lessonForm} onDone={() => setLessonForm(null)}/>}
    </section>}

    {ordered.length === 0 ? <section className="rounded-2xl border border-dashed border-emerald-200 bg-white p-8 text-center text-sm text-emerald-950/60">Este curso ainda não tem aulas.</section>
    : <section className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
      <article className="rounded-2xl border border-emerald-100 bg-white p-4">
        {lesson && <>
          <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
            {lesson.embed?.kind === "file" ? <video className="h-full w-full" src={lesson.embed.embedUrl} controls preload="metadata" playsInline/>
              : lesson.embed ? <iframe key={lesson.id} className="absolute inset-0 h-full w-full" src={lesson.embed.embedUrl} title={lesson.title} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen/>
              : <p className="p-6 text-sm text-white">Link de vídeo inválido.</p>}
          </div>
          <p className="mt-4 font-mono text-[10px] tracking-[.12em] text-amber-700">{lesson.moduleTitle.toUpperCase()}</p>
          <h3 className="mt-1 text-2xl font-semibold">{lesson.title}</h3>
          {lesson.summary && <p className="mt-2 whitespace-pre-line text-sm leading-7 text-emerald-950/70">{lesson.summary}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" disabled={setDone.isPending} onClick={() => setDone.mutate({ lessonId: lesson.id, done: !lesson.done })} style={{ color: lesson.done ? undefined : "#fff" }} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${lesson.done ? "border border-emerald-300 text-emerald-800" : "bg-emerald-800"}`}><CheckCircle2 size={16}/> {lesson.done ? "Concluída (desmarcar)" : "Marcar como concluída"}</button>
            {next && <button type="button" onClick={() => setLessonId(next.id)} className="inline-flex items-center gap-1 rounded-full border border-emerald-200 px-4 py-2 text-sm">Próxima aula <ChevronRight size={16}/></button>}
          </div>
        </>}
      </article>
      <div className="space-y-3">{modules.map((mod, index) => <div key={mod.title} className="rounded-2xl border border-emerald-100 bg-white p-4">
        <p className="font-mono text-[10px] tracking-[.12em] text-emerald-700">MÓDULO {index + 1}</p><b className="block">{mod.title}</b>
        <ul className="mt-2 space-y-1">{mod.lessons.map(item => <li key={item.id} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${lesson?.id === item.id ? "bg-amber-100 font-semibold" : "hover:bg-emerald-50"}`}>
          {item.done ? <CheckCircle2 size={15} className="shrink-0 text-emerald-700"/> : lesson?.id === item.id ? <PlayCircle size={15} className="shrink-0 text-amber-700"/> : <Circle size={15} className="shrink-0 text-emerald-300"/>}
          <button type="button" onClick={() => setLessonId(item.id)} className="flex-1 text-left">{item.title}</button>
          {canManage && <><button type="button" aria-label={`Editar ${item.title}`} onClick={() => { setLessonForm(item); setEditingCourse(false); }}><Pencil size={13}/></button><button type="button" aria-label={`Apagar ${item.title}`} onClick={() => { if (window.confirm(`Apagar a aula "${item.title}"?`)) removeLesson.mutate({ id: item.id }); }}><Trash2 size={13}/></button></>}
        </li>)}</ul>
      </div>)}</div>
    </section>}
  </div>;
}

function CourseForm({ initial, onDone }: { initial?: CourseView; onDone: () => void }) {
  const utils = trpc.useUtils();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [area, setArea] = useState<CourseArea>(initial?.area ?? "geral");
  const [audience, setAudience] = useState<VideoAudience>(initial?.audience ?? "all");
  const [userIds, setUserIds] = useState<number[]>(initial?.userIds ?? []);
  const save = trpc.academy.saveCourse.useMutation({ onSuccess: async () => { await utils.academy.list.invalidate(); toast.success("Curso salvo."); onDone(); }, onError: e => toast.error(e.message) });
  return <form className="mt-3 space-y-2" onSubmit={e => { e.preventDefault(); save.mutate({ id: initial?.id, title, summary, area, audience, userIds }); }}>
    <input aria-label="Título do curso" className={input} placeholder="Título do curso (ex.: Fundamentos da prospecção)" value={title} onChange={e => setTitle(e.target.value)}/>
    <textarea aria-label="Descrição do curso" className={input} rows={2} placeholder="Descrição curta (opcional)" value={summary} onChange={e => setSummary(e.target.value)}/>
    <label className="block text-xs">Onde aparece <select aria-label="Onde o curso aparece" className={`${input} mt-1`} value={area} onChange={e => setArea(e.target.value as CourseArea)}>{COURSE_AREAS.map(key => <option key={key} value={key}>{COURSE_AREA_LABELS[key]}</option>)}</select></label>
    <AudienceFields audience={audience} setAudience={setAudience} userIds={userIds} setUserIds={setUserIds}/>
    <div className="flex gap-2"><button type="submit" style={{ color: "#fff" }} disabled={title.trim().length < 2 || save.isPending || (audience === "users" && userIds.length === 0)} className="rounded-full bg-emerald-800 px-4 py-1.5 text-xs font-semibold disabled:opacity-40">{save.isPending ? "Salvando..." : "Salvar curso"}</button><button type="button" onClick={onDone} className="rounded-full px-3 py-1.5 text-xs">Cancelar</button></div>
  </form>;
}

function LessonForm({ courseId, modules, initial, onDone }: { courseId: number; modules: string[]; initial: LessonView | null; onDone: () => void }) {
  const utils = trpc.useUtils();
  const [moduleTitle, setModuleTitle] = useState(initial?.moduleTitle ?? modules[modules.length - 1] ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const valid = parseVideoUrl(url) !== null;
  const save = trpc.academy.saveLesson.useMutation({ onSuccess: async () => { await utils.academy.list.invalidate(); toast.success("Aula salva."); onDone(); }, onError: e => toast.error(e.message) });
  return <form className="mt-3 space-y-2" onSubmit={e => { e.preventDefault(); save.mutate({ id: initial?.id, courseId, moduleTitle, title, url, summary }); }}>
    <input aria-label="Módulo" list={`modulos-${courseId}`} className={input} placeholder="Módulo (ex.: Módulo 1 · O chamado)" value={moduleTitle} onChange={e => setModuleTitle(e.target.value)}/>
    <datalist id={`modulos-${courseId}`}>{modules.map(mod => <option key={mod} value={mod}/>)}</datalist>
    <input aria-label="Título da aula" className={input} placeholder="Título da aula" value={title} onChange={e => setTitle(e.target.value)}/>
    <input aria-label="Link da aula" className={input} placeholder="Link do YouTube, Vimeo ou .mp4" value={url} onChange={e => setUrl(e.target.value)}/>
    {url && !valid && <p className="text-xs text-red-600">Link não reconhecido. Use YouTube, Vimeo ou um .mp4 em https.</p>}
    <textarea aria-label="Resumo da aula" className={input} rows={2} placeholder="Resumo ou material de apoio (opcional)" value={summary} onChange={e => setSummary(e.target.value)}/>
    <div className="flex gap-2"><button type="submit" style={{ color: "#fff" }} disabled={!valid || title.trim().length < 2 || !moduleTitle.trim() || save.isPending} className="rounded-full bg-emerald-800 px-4 py-1.5 text-xs font-semibold disabled:opacity-40">{save.isPending ? "Salvando..." : "Salvar aula"}</button><button type="button" onClick={onDone} className="rounded-full px-3 py-1.5 text-xs">Cancelar</button></div>
  </form>;
}
