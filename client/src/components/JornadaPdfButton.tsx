import { trpc } from "@/lib/trpc";
import { FileDown, Loader2, MailCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/** "Gerar a minha jornada do herói em PDF agora mesmo": foto do momento enviada por e-mail. */
export default function JornadaPdfButton() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const send = trpc.jornada.emailPdf.useMutation({
    onSuccess: r => { setSentTo(r.email); toast.success(`PDF enviado para ${r.email}.`); },
    onError: e => toast.error(e.message),
  });
  return <section className="flex flex-col gap-4 rounded-2xl border border-amber-200 bg-gradient-to-r from-[#fbf7e8] to-white p-5 md:flex-row md:items-center md:justify-between">
    <div className="max-w-2xl">
      <p className="font-mono text-[10px] tracking-[.14em] text-amber-700">FOTO DO MOMENTO · PDF</p>
      <h3 className="mt-1 text-lg font-semibold text-emerald-950">Sua jornada do herói, até aqui, num documento</h3>
      <p className="mt-1 text-sm text-emerald-900/70">Chamado, meta, Vida 360, missões, check-ins, leituras do Oráculo, PDI e planos de ação. O PDF chega no e-mail da sua conta.</p>
      {sentTo && <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><MailCheck size={14} /> Enviado para {sentTo}. Confira também a caixa de spam.</p>}
    </div>
    <button type="button" onClick={() => send.mutate()} disabled={send.isPending} style={{ color: "#ffffff" }} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-emerald-800 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-emerald-900 disabled:opacity-60">
      {send.isPending ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
      {send.isPending ? "Gerando e enviando…" : "Gerar a minha jornada do herói em PDF agora mesmo"}
    </button>
  </section>;
}
