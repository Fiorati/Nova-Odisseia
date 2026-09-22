import { BellRing, CheckCircle2, Compass, History, LockKeyhole, Sparkles } from "lucide-react";

const news = [
  { date: "22 SET 2026", title: "Sua Jornada ganhou forma", body: "Chamado, Vida 360, meta do ciclo, missões, check-in e evolução agora vivem no mesmo caminho.", icon: Compass },
  { date: "22 SET 2026", title: "Suas respostas ficam visíveis", body: "Os check-ins salvos aparecem no Diário de Bordo, com energia, reflexão e próxima ação.", icon: CheckCircle2 },
  { date: "22 SET 2026", title: "A História começa a se abrir", body: "Uma nova travessia conecta os cantos da Odisseia de Homero à etapa que você vive hoje.", icon: History },
  { date: "22 SET 2026", title: "Piloto protegido", body: "Quem já tinha acesso continua usando o mesmo e-mail e senha. Novos cadastros seguem fechados durante o piloto.", icon: LockKeyhole },
];

export default function ArautoPanel() {
  return <div className="space-y-6">
    <section className="overflow-hidden rounded-2xl bg-[#4a2508] p-6 text-amber-50 md:p-8">
      <div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-amber-200 text-amber-950"><BellRing /></span><div><p className="font-mono text-[10px] tracking-[.16em] text-amber-200">ARAUTO · NOTÍCIAS DA TRAVESSIA</p><h2 className="mt-2 text-3xl font-semibold tracking-[-.05em]">O que mudou na Nova Odisseia.</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-amber-100/75">Aqui chegam as novas ferramentas, melhorias e caminhos abertos na plataforma, explicados sem linguagem técnica.</p></div></div>
    </section>
    <section className="grid gap-4 lg:grid-cols-2">{news.map(({date,title,body,icon:Icon}, index) => <article key={title} className="relative overflow-hidden rounded-xl border border-amber-100 bg-white p-6"><span className="absolute right-4 top-4 font-mono text-5xl text-amber-100">{String(index+1).padStart(2,"0")}</span><Icon className="text-amber-700" size={21}/><p className="mt-5 font-mono text-[10px] tracking-[.12em] text-amber-700">{date}</p><h3 className="mt-2 text-xl font-semibold text-emerald-950">{title}</h3><p className="mt-2 max-w-xl text-sm leading-6 text-emerald-800/65">{body}</p></article>)}</section>
    <section className="flex gap-3 rounded-xl border border-lime-300 bg-lime-50 p-5"><Sparkles className="shrink-0 text-emerald-700"/><div><b>Este espaço cresce junto com a plataforma.</b><p className="mt-1 text-sm text-emerald-900/70">Sempre que uma função nova chegar ou uma rota mudar, o Arauto registra o que aconteceu e como aproveitar.</p></div></section>
  </div>;
}
