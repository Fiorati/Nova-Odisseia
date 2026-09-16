import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Megaphone, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function BestPracticesFeed() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const feed = trpc.bestPractices.list.useQuery();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const create = trpc.bestPractices.create.useMutation({
    onSuccess: async () => {
      await utils.bestPractices.list.invalidate();
      setTitle("");
      setContent("");
      toast.success("Boa prática publicada para toda a plataforma.");
    },
    onError: error => toast.error(error.message),
  });
  const remove = trpc.bestPractices.remove.useMutation({
    onSuccess: () => utils.bestPractices.list.invalidate(),
    onError: error => toast.error(error.message),
  });
  const posts = feed.data ?? [];

  return (
    <section className="rounded-xl border border-emerald-100 bg-white p-5">
      <div className="flex items-center gap-2">
        <Megaphone className="text-emerald-600" size={18} />
        <div>
          <p className="font-mono text-[10px] font-semibold tracking-[.12em] text-emerald-600">
            BOAS PRÁTICAS
          </p>
          <h3 className="mt-1 text-xl font-semibold">
            Feed compartilhado por toda a plataforma.
          </h3>
        </div>
      </div>
      <p className="mt-1 text-sm text-emerald-800/65">
        Compartilhe conquistas, aprendizados e táticas com todos os agentes.
      </p>
      <div className="mt-4 grid gap-2 rounded-lg bg-[#f6f8f2] p-4">
        <Input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Título da boa prática"
        />
        <Textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Conte o que funcionou e como outros agentes podem aplicar."
        />
        <Button
          className="w-fit bg-[#002b1d]"
          disabled={create.isPending || !title.trim() || !content.trim()}
          onClick={() => create.mutate({ title, content })}
        >
          <Plus size={16} /> Publicar
        </Button>
      </div>
      <div className="mt-5 space-y-3">
        {posts.map(post => (
          <article
            key={post.id}
            className="rounded-lg border border-emerald-100 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <b className="text-sm">{post.title}</b>
                <p className="mt-1 text-xs text-emerald-700/60">
                  {post.authorName} ·{" "}
                  {new Date(post.createdAt).toLocaleDateString("pt-BR")}
                </p>
              </div>
              {(user?.role === "admin" || post.authorUserId === user?.id) && (
                <button
                  type="button"
                  aria-label={`Remover ${post.title}`}
                  className="text-emerald-600/50 hover:text-red-600"
                  onClick={() => remove.mutate({ id: post.id })}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
            <p className="mt-2 whitespace-pre-line text-sm text-emerald-900/80">
              {post.content}
            </p>
          </article>
        ))}
        {!posts.length && (
          <p className="rounded-lg bg-[#f6f8f2] p-4 text-sm text-emerald-700/65">
            Nenhuma boa prática publicada ainda. Seja o primeiro a compartilhar.
          </p>
        )}
      </div>
    </section>
  );
}
