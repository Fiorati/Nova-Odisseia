import { Button } from "@/components/ui/button";
import { BarChart3, BookOpenText, CalendarDays, CheckCircle2, Compass, Flag, Sparkles, Target, TrendingUp } from "lucide-react";

const quickModules = [
  { id: "realizado", title: "Plano - Realizado", subtitle: "Acompanhe o que já foi executado da rotina.", icon: CheckCircle2 },
  { id: "troia", title: "Cavalo de Tróia e prospecção 360", subtitle: "Pesquisa, roteiro e preparação antes da visita.", icon: Compass },
  { id: "rv", title: "Calculadora RV", subtitle: "Ajuste metas e veja o impacto em variável.", icon: TrendingUp },
  { id: "psv", title: "Plano semanal", subtitle: "Organize tarefas, propostas e próximos passos.", icon: Target },
  { id: "tutorial", title: "Tutorial Light", subtitle: "Guia rápido para início de operação.", icon: BookOpenText },
  { id: "news", title: "Notícias e boas práticas", subtitle: "Atualização gerada para desempenho e rotina.", icon: Sparkles },
  { id: "card", title: "Card Final", subtitle: "Fechamento do ciclo com resultado nítido.", icon: Flag },
] as const;

export default function NovaOdisseiaLightPanel({
  onOpenPsv,
  onOpenCalendario,
  onOpenHunter,
}: {
  onOpenPsv: () => void;
  onOpenCalendario: () => void;
  onOpenHunter: () => void;
}) {
  const handleClick = (id: "psv" | "realizado" | "card" | "rv" | "troia" | "news" | "tutorial") => {
    if (id === "psv") return onOpenPsv();
    if (id === "realizado" || id === "card") return onOpenCalendario();
    if (id === "rv") return onOpenHunter();
    return onOpenPsv();
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-[#002b1d] p-6 text-white md:p-8">
        <p className="font-mono text-[10px] tracking-[.16em] text-lime-200">NOVA ODISSEIA LIGHT</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-.05em]">Uma rotina enxuta, direta e acionável.</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-100/75">
          Visão mínima para operar com foco em prioridade, roteiro e resultado. Reúne gestão semanal, preparação comercial, referências e fechamento do ciclo.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {quickModules.map(({ id, title, subtitle, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => handleClick(id)}
            className="rounded-xl border border-emerald-100 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-lime-300"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                <Icon size={18} />
              </span>
              <div>
                <b className="block text-base text-emerald-950">{title}</b>
                <small className="mt-1 block text-xs text-emerald-700/65">{subtitle}</small>
              </div>
            </div>
          </button>
        ))}
      </section>

      <section className="rounded-xl border border-emerald-100 bg-white p-5">
        <div className="flex items-center gap-2">
          <CalendarDays className="text-emerald-600" size={18} />
          <h3 className="text-lg font-semibold text-emerald-950">Fluxo recomendado</h3>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {[
            ["1. Planejar", "Defina meta, rotina e prioridades do dia."],
            ["2. Preparar", "Vai antes da visita com pesquisa e roteiro."],
            ["3. Executar", "Revisa status, propostas e próximos passos."],
            ["4. Fechar", "Registre o resultado e aprenda para o ciclo seguinte."],
          ].map(([step, text]) => (
            <div key={step} className="rounded-lg bg-[#f6f8f2] p-3">
              <p className="font-mono text-[10px] tracking-[.12em] text-emerald-600">{step}</p>
              <p className="mt-2 text-xs leading-5 text-emerald-800/70">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
