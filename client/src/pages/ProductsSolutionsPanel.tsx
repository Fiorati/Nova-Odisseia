import { BadgeCheck, Building2, Layers3, Rocket, ShieldCheck, Target, TrendingUp } from "lucide-react";

const productGroups = [
  {
    title: "Varejo e relacionamento",
    description: "Foco em expansão de carteira e consistência de visitas.",
    items: [
      { name: "Conta Stone", badge: "Cash-in / Transações", text: "Abertura, ativação e expansão via ecossistema financeiro e operação digital." },
      { name: "Linha de crédito", badge: "Financing", text: "Estrutura de tomada de decisão e acompanhamento de necessidade de capital de giro." },
      { name: "Vendedor IA", badge: "Produtividade", text: "Apoio operacional para roteiro, descrição e argumentação antes da visita." },
    ],
  },
  {
    title: "Segmentos e verticalização",
    description: "Mapeamento entre tipo de cliente, necessidade comercial e produto ideal.",
    items: [
      { name: "Pequeno varejo", badge: "Segmento 1", text: "Gestão de caixa, eficiência e automações de rotina para lojas de bairro e redes locais." },
      { name: "Médio porte", badge: "Segmento 2", text: "Estrutura para operação, controladoria e expansão com maior volume de transações." },
      { name: "Enterprise", badge: "Segmento 3", text: "Soluções de gestão, integração, risco e performance operacional em operação mais complexa." },
    ],
  },
  {
    title: "Andamento do cliente",
    description: "Acompanhar o ciclo de valor para cada oportunidade e cada perfil.",
    items: [
      { name: "Diagnóstico", badge: "M0", text: "Entendimento do negócio, evolução atual, gargalos e oportunidade de valor." },
      { name: "Prospecção 360", badge: "M1", text: "Compilado de soluções, negócios, risco, ação e rota de abordagem." },
      { name: "Push comercial", badge: "M2", text: "Ação em sequência com foco em proposta e ativação de produtos relevantes." },
    ],
  },
] as const;

const tierMap = [
  { label: "Tier 1", title: "Captar e convergir", value: "Leads simples, necessidades claras, transação e rotina." },
  { label: "Tier 2", title: "Aprofundar e vender mais", value: "Vendas mais consultivas, integração e expansão de ticket médio." },
  { label: "Tier 3", title: "Transformar em operação", value: "Soluções de gestão, digitização, capital e formulação de carteira estratégica." },
] as const;

export default function ProductsSolutionsPanel() {
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-[#0e3426] p-6 text-white md:p-8">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full border-[18px] border-lime-200/10" />
        <div className="relative">
          <p className="font-mono text-[10px] tracking-[.16em] text-lime-200">PRODUTOS E SOLUÇÕES</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-.05em]">Catálogo operacional para comercializar com clareza.</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-emerald-100/75">
            Centraliza produtos, personas, segmentação e maturidade do cliente para transformar a conversa em ação com foco em valor, não em lista de itens isolados.
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {tierMap.map(tier => (
          <article key={tier.label} className="rounded-xl border border-emerald-100 bg-white p-5">
            <p className="font-mono text-[10px] tracking-[.12em] text-emerald-600">{tier.label}</p>
            <h3 className="mt-2 text-xl font-semibold text-emerald-950">{tier.title}</h3>
            <p className="mt-2 text-sm leading-6 text-emerald-800/70">{tier.value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {productGroups.map(group => (
          <article key={group.title} className="rounded-xl border border-emerald-100 bg-white p-5">
            <div className="flex items-center gap-2">
              <Layers3 className="text-emerald-600" size={18} />
              <h3 className="text-lg font-semibold text-emerald-950">{group.title}</h3>
            </div>
            <p className="mt-2 text-xs text-emerald-800/65">{group.description}</p>
            <div className="mt-4 space-y-3">
              {group.items.map(item => (
                <div key={item.name} className="rounded-lg border border-emerald-100 bg-[#f6f8f2] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-sm text-emerald-950">{item.name}</strong>
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[.08em] text-emerald-700">{item.badge}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-emerald-800/70">{item.text}</p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-xl border border-lime-200 bg-lime-50/80 p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-emerald-700" size={18} />
          <h3 className="text-lg font-semibold text-emerald-950">Padrão de uso recomendado</h3>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {[
            ["Diagnóstico", "Entender a realidade do cliente e mapa de dores."],
            ["Produto adequado", "Relacionar necessidade, perfil e ecossistema."],
            ["Ação comercial", "Definir proposta com CTA e responsável."],
            ["Alta retenção", "Fechar ciclo com acompanhamento e upsell."],
          ].map(([title, text]) => (
            <div key={title} className="rounded-lg border border-lime-200 bg-white p-3">
              <p className="font-mono text-[10px] tracking-[.1em] text-emerald-600">{title}</p>
              <p className="mt-2 text-xs leading-5 text-emerald-800/70">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
