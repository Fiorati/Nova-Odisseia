import { BookOpen, Compass } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function ItakaDailyWelcome({ displayName }: { displayName: string }) {
  const dailyMessage = trpc.agent.dailyItakaMessage.useQuery();
  const message = dailyMessage.data?.message;

  return (
    <section className="ledger-surface relative overflow-hidden rounded-lg border border-emerald-100 bg-white p-6 md:p-8">
      <div className="absolute -right-12 -top-14 h-40 w-40 rounded-full border-[24px] border-emerald-100/70" />
      <div className="relative max-w-4xl">
        <div className="flex items-center gap-2 font-mono text-[10px] font-semibold tracking-[.16em] text-emerald-600">
          <Compass size={14} aria-hidden="true" /> ÍTAKA / {dailyMessage.data?.dateLabel ?? "—"}
        </div>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-.055em]">Olá, {displayName}.</h2>
        <p className="mt-3 max-w-3xl text-base font-medium leading-7 text-emerald-950">
          {message?.phrase ?? (dailyMessage.isError ? "A travessia continua: organize a próxima ação e avance um passo de cada vez." : "Preparando a mensagem da sua jornada...")}
        </p>
        {message && (
          <aside className="itaka-passage mt-5 rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="itaka-passage-label flex items-center gap-2 font-mono text-[10px] font-semibold tracking-[.13em]">
                <BookOpen size={13} aria-hidden="true" /> PASSAGEM DA ODISSEIA
              </p>
              <span className="itaka-passage-theme rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.1em]">{message.theme}</span>
            </div>
            <p className="itaka-passage-text mt-3 max-w-3xl whitespace-pre-line text-sm leading-6">{message.passage}</p>
            <p className="itaka-passage-citation mt-3 font-mono text-[10px] font-semibold tracking-[.12em]">ODISSEIA — {message.citation}</p>
          </aside>
        )}
      </div>
    </section>
  );
}
