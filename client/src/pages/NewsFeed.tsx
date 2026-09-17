import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { BookOpenText, CalendarDays, Pencil, Plus, Trash2 } from "lucide-react";
import { BookOpenText, CalendarDays, Pencil, Pin, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function NewsFeed() {
  const utils = trpc.useUtils();
  const news = trpc.news.list.useQuery();
  const canManage = trpc.news.canManage.useQuery();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Mercado e vendas");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const articles = news.data ?? [];
  const save = trpc.news.save.useMutation({
    onSuccess: async () => {
      await utils.news.list.invalidate();
      setTitle("");
      setCategory("Mercado e vendas");
      setContent("");
      setEditingId(null);
      toast.success("Notícia publicada.");
    },
    onError: error => toast.error(error.message),
  });
  const remove = trpc.news.remove.useMutation({
    onSuccess: () => utils.news.list.invalidate(),
    onError: error => toast.error(error.message),
  });
  const pin = trpc.news.pin.useMutation({ onSuccess: () => utils.news.list.invalidate(), onError: error => toast.error(error.message) });

  const edit = (article: (typeof articles)[number]) => {
    if (article.id < 0) return;
    setEditingId(article.id);
    setTitle(article.title);
    setCategory(article.category);
    setContent(article.content);
  };

  return (
    <section className="rounded-xl border border-emerald-100 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <BookOpenText className="text-emerald-600" size={19} />
          <div>
            <p className="font-mono text-[10px] font-semibold tracking-[.12em] text-emerald-600">FEED DE NOTÍCIAS</p>
            <h3 className="mt-1 text-xl font-semibold">O que move a Odisseia, o Brasil e os negócios.</h3>
          </div>
        </div>
        <span className="flex items-center gap-1 text-xs text-emerald-700/60"><CalendarDays size={14} /> Atualização diária</span>
      </div>
      <p className="mt-1 text-sm text-emerald-800/65">Novidades da plataforma, tutoriais e assuntos econômicos para o agente conversar melhor com seus clientes.</p>

      {canManage.data && (
        <div className="mt-4 grid gap-2 rounded-lg bg-[#f6f8f2] p-4">
          <div className="grid gap-2 md:grid-cols-[1fr_220px]">
            <Input value={title} onChange={event => setTitle(event.target.value)} placeholder="Título da matéria" />
            <Input value={category} onChange={event => setCategory(event.target.value)} placeholder="Categoria" />
          </div>
          <Textarea value={content} onChange={event => setContent(event.target.value)} placeholder="Escreva a notícia, tutorial ou orientação comercial para os agentes." />
          <div className="flex gap-2">
            <Button className="w-fit bg-[#002b1d]" disabled={save.isPending || !title.trim() || !content.trim()} onClick={() => save.mutate({ id: editingId ?? undefined, title, category, content })}>
              <Plus size={16} /> {editingId ? "Atualizar matéria" : "Publicar matéria"}
            </Button>
            {editingId && <Button variant="outline" onClick={() => { setEditingId(null); setTitle(""); setContent(""); }}>Cancelar</Button>}
          </div>
        </div>
      )}

      <div className="mt-5 space-y-3">
        {articles.map(article => (
          <article key={article.id} className="rounded-lg border border-emerald-100 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="rounded-full bg-lime-100 px-2 py-1 text-[10px] font-semibold text-emerald-900">{article.category}</span>
                <h4 className="mt-2 font-semibold">{article.title}</h4>
                <p className="mt-1 text-xs text-emerald-700/60">{article.authorName} · {new Date(article.publishedAt).toLocaleDateString("pt-BR")}</p>
              </div>
              {canManage.data && article.id > 0 && <div className="flex gap-2"><button type="button" aria-label={`Editar ${article.title}`} className="text-emerald-600 hover:text-emerald-900" onClick={() => edit(article)}><Pencil size={15} /></button><button type="button" aria-label={`Remover ${article.title}`} className="text-emerald-600 hover:text-red-600" onClick={() => remove.mutate({ id: article.id })}><Trash2 size={15} /></button></div>}
                          {canManage.data && article.id > 0 && <div className="flex gap-2"><button type="button" aria-label={`${article.pinned ? "Desfixar" : "Fixar"} ${article.title}`} className={article.pinned ? "text-amber-600" : "text-emerald-600"} onClick={() => pin.mutate({ id: article.id, pinned: !article.pinned })}><Pin size={15} /></button><button type="button" aria-label={`Editar ${article.title}`} className="text-emerald-600 hover:text-emerald-900" onClick={() => edit(article)}><Pencil size={15} /></button><button type="button" aria-label={`Remover ${article.title}`} className="text-emerald-600 hover:text-red-600" onClick={() => remove.mutate({ id: article.id })}><Trash2 size={15} /></button></div>}
                            <span className="rounded-full bg-lime-100 px-2 py-1 text-[10px] font-semibold text-emerald-900">{article.pinned ? "FIXADA · " : ""}{article.category}</span>
            </div>
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-emerald-900/80">{article.content}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
