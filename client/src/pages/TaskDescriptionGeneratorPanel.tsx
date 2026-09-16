import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { exportPrivatePdf } from "@/lib/printDocument";
import { ClipboardList, Copy, FileDown, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type FunnelStage = "prospeccao" | "negociacao" | "fechamento" | "retencao";

const STAGE_LABELS: Record<FunnelStage, string> = {
  prospeccao: "Prospecção / primeiro diagnóstico",
  negociacao: "Negociação de proposta / objeção de taxa",
  fechamento: "Fechamento e implantação (novo ativo)",
  retencao: "Cliente de base / retenção / churn",
};

const STAGE_PLAYBOOK: Record<FunnelStage, { pilar: string; foco: string; acao: string; ancoragem: string; scriptBase: string }> = {
  prospeccao: {
    pilar: "CONQUISTAR",
    foco: "Qualidade da interação e diagnóstico",
    acao: "Solicitar extratos recentes para um raio-x detalhado de taxas vs. volume real e agendar a apresentação do diagnóstico.",
    ancoragem: "Mapear a dor real do cliente com a adquirente atual (suporte ruim, antecipação cara, falta de controle ou erro de conciliação) antes de falar em preço.",
    scriptBase: "Como podemos usar esse extrato para te mostrar exatamente onde a taxa atual está pesando no seu caixa?",
  },
  negociacao: {
    pilar: "CONQUISTAR",
    foco: "Conversão com ancoragem de valor",
    acao: "Nunca ceder desconto direto na taxa. Levar uma simulação comparativa de ganho anual no caixa em vez de uma tabela de taxas.",
    ancoragem: "Usar uma alavanca do ecossistema Stone para compensar o valor: PIX gratuito, antecipação automatizada (RAV), maquininha reserva, integração com ERP/PDV ou atendimento em 5 segundos.",
    scriptBase: "Como podemos fechar nessa condição se eu garantir o suporte presencial que o seu concorrente hoje não te entrega?",
  },
  fechamento: {
    pilar: "SERVIR",
    foco: "Onboarding e KYC de qualidade",
    acao: "Confirmar a entrega dos equipamentos e realizar a visita de boas-vindas nos primeiros 7 dias, garantindo o primeiro transacionado (T1).",
    ancoragem: "Ensinar as funções essenciais: PIX na maquininha, pedido de bobina e emissão de extrato, blindando contra o contra-ataque do concorrente.",
    scriptBase: "Vamos aproveitar essa semana para deixar tudo redondo: já testamos o PIX na maquininha e o pedido de bobina?",
  },
  retencao: {
    pilar: "SERVIR",
    foco: "Relacionamento e rentabilização",
    acao: "Investigar o motivo da queda de TPV ou Share e revisar margem, oferecendo novos produtos do ecossistema (Conta Stone, linha de crédito, Vendedor IA).",
    ancoragem: "Tratar a visita como checkout de relacionamento, não apenas cobrança de resultado.",
    scriptBase: "O que mudou no seu movimento nos últimos meses? Quero entender onde a Stone pode voltar a ser sua primeira opção.",
  },
};

const toDateTimeLabel = (value: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString("pt-BR")} às ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
};

export default function TaskDescriptionGeneratorPanel() {
  const [clientName, setClientName] = useState("");
  const [decisorName, setDecisorName] = useState("");
  const [tpv, setTpv] = useState(0);
  const [competitorName, setCompetitorName] = useState("");
  const [competitorConditions, setCompetitorConditions] = useState("");
  const [share, setShare] = useState(0);
  const [ourConditions, setOurConditions] = useState("");
  const [visitAt, setVisitAt] = useState("");
  const [nextVisitAt, setNextVisitAt] = useState("");
  const [reaction, setReaction] = useState<"interesse" | "resistência">("interesse");
  const [objectionNotes, setObjectionNotes] = useState("");
  const [stage, setStage] = useState<FunnelStage>("negociacao");
  const [deliverable, setDeliverable] = useState("");
  const [owner, setOwner] = useState("");

  const brl = useMemo(() => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }), []);
  const playbook = STAGE_PLAYBOOK[stage];

  const taskDescription = useMemo(() => {
    if (!clientName.trim()) return "";
    const decisorPart = decisorName.trim() ? `, em contato direto com o decisor ${decisorName.trim()}` : "";
    const competitorPart = competitorName.trim() ? `Atualmente o cliente opera predominantemente com o concorrente ${competitorName.trim()}${competitorConditions.trim() ? ` (condição atual: ${competitorConditions.trim()})` : ""}, mantendo um Share Stone de ${share}%. ` : "";
    const offerPart = ourConditions.trim() ? `Na oportunidade, foram apresentadas as condições Stone (${ourConditions.trim()}) ancoradas em valor estratégico (gestão de fluxo de caixa, ecossistema e atendimento diferenciado). ` : "";
    const reasonPart = objectionNotes.trim() ? ` devido a ${objectionNotes.trim()}` : "";
    const nextPart = nextVisitAt ? ` ficando agendado o retorno para o dia ${toDateTimeLabel(nextVisitAt)} para dar continuidade ao processo.` : "";
    return `Em ${toDateTimeLabel(visitAt)}, foi realizada visita comercial/relacionamento no cliente ${clientName.trim()} (TPV estimado de ${brl.format(tpv)})${decisorPart}. ${competitorPart}${offerPart}O cliente demonstrou ${reaction}${reasonPart}.${nextPart}`;
  }, [clientName, decisorName, tpv, competitorName, competitorConditions, share, ourConditions, reaction, objectionNotes, visitAt, nextVisitAt, brl]);

  const megaPlan = useMemo(() => {
    if (!clientName.trim()) return "";
    const objectionLine = objectionNotes.trim() || "uma objeção relevante";
    return `[COMO O MEGA FARIA & PRÓXIMOS PASSOS]

1. PILAR FOCAL DO MEGA:
- Pilar: ${playbook.pilar}
- Foco da etapa: ${STAGE_LABELS[stage]} — ${playbook.foco}

2. AÇÃO DE EXCELÊNCIA OPERACIONAL (passo a passo):
- Ação improrrogável: ${playbook.acao}
- Ancoragem de valor (não falar só de taxa): ${playbook.ancoragem}

3. SCRIPT / ABORDAGEM SUGERIDA PARA A PRÓXIMA VISITA (técnica Chris Voss / SPIN):
- "Se o cliente disser ${objectionLine}, responder usando rotulagem/pergunta calibrada: '${playbook.scriptBase}'"

4. PRÓXIMO COMPROMISSO MÚTUO:
- Data/Hora: ${toDateTimeLabel(nextVisitAt)}
- Entregável da visita: ${deliverable.trim() || "A definir"}
- Responsável Stone: ${owner.trim() || "A definir"} | Responsável Cliente: ${decisorName.trim() || "A definir"}`;
  }, [clientName, objectionNotes, playbook, stage, nextVisitAt, deliverable, owner, decisorName]);

  const copy = async (text: string, label: string) => {
    if (!text) { toast.error("Preencha os dados antes de copiar."); return; }
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copiado para a área de transferência.`);
    } catch {
      toast.error("Não foi possível copiar automaticamente. Selecione o texto manualmente.");
    }
  };

  const exportPdf = () => {
    if (!taskDescription) { toast.error("Preencha os dados antes de exportar."); return; }
    const saved = exportPrivatePdf("Descrição da tarefa", clientName, [
      { title: "Descrição da tarefa (resumo da reunião)", text: taskDescription },
      { title: "Próximos passos e como o Mega faria", text: megaPlan },
    ]);
    if (!saved) toast.error("Permita a abertura da janela de impressão para salvar o PDF.");
  };

  return (
    <div className="space-y-6">
      <section>
        <p className="font-mono text-[10px] font-semibold tracking-[.14em] text-emerald-600">GERAR DESCRIÇÃO DA TAREFA</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-.055em]">Transforme os dados da visita em descrição pronta.</h2>
        <p className="mt-2 max-w-3xl text-sm text-emerald-800/65">Preencha os campos abaixo para gerar automaticamente a descrição da tarefa e o direcionamento "Como o Mega faria?", prontos para colar no seu registro de visita.</p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-emerald-100 bg-white p-5">
          <h3 className="font-semibold">Dados da visita</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs sm:col-span-2">Nome do cliente<Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Ex.: Padaria Pão D'Ouro" /></label>
            <label className="grid gap-1 text-xs">Decisor<Input value={decisorName} onChange={e => setDecisorName(e.target.value)} placeholder="Ex.: Seu Antônio" /></label>
            <label className="grid gap-1 text-xs">TPV do cliente<Input type="number" min="0" value={tpv || ""} onChange={e => setTpv(Number(e.target.value) || 0)} /></label>
            <label className="grid gap-1 text-xs">Concorrente principal<Input value={competitorName} onChange={e => setCompetitorName(e.target.value)} placeholder="Ex.: Rede" /></label>
            <label className="grid gap-1 text-xs">Share Stone atual (%)<Input type="number" min="0" max="100" value={share || ""} onChange={e => setShare(Number(e.target.value) || 0)} /></label>
            <label className="grid gap-1 text-xs sm:col-span-2">Condições do concorrente<Textarea value={competitorConditions} onChange={e => setCompetitorConditions(e.target.value)} placeholder="Ex.: Débito 1,20%, Crédito 2,50%, aluguel R$ 120" /></label>
            <label className="grid gap-1 text-xs sm:col-span-2">Nossas condições<Textarea value={ourConditions} onChange={e => setOurConditions(e.target.value)} placeholder="Ex.: Débito 1,15%, Crédito 2,35%" /></label>
            <label className="grid gap-1 text-xs">Data/hora da visita<Input type="datetime-local" value={visitAt} onChange={e => setVisitAt(e.target.value)} /></label>
            <label className="grid gap-1 text-xs">Data/hora da próxima visita<Input type="datetime-local" value={nextVisitAt} onChange={e => setNextVisitAt(e.target.value)} /></label>
            <label className="grid gap-1 text-xs">Reação do cliente<select className="h-10 rounded-md border border-emerald-100 bg-white px-3 text-sm" value={reaction} onChange={e => setReaction(e.target.value as "interesse" | "resistência")}><option value="interesse">Interesse</option><option value="resistência">Resistência</option></select></label>
            <label className="grid gap-1 text-xs sm:col-span-2">Dor / objeção mapeada<Textarea value={objectionNotes} onChange={e => setObjectionNotes(e.target.value)} placeholder="Ex.: pedir taxa de crédito em 2,10%" /></label>
          </div>
        </article>

        <article className="rounded-xl border border-emerald-100 bg-white p-5">
          <h3 className="font-semibold">Etapa do funil Mega e próximo compromisso</h3>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-xs">Etapa atual do cliente<select className="h-10 rounded-md border border-emerald-100 bg-white px-3 text-sm" value={stage} onChange={e => setStage(e.target.value as FunnelStage)}>{Object.entries(STAGE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="grid gap-1 text-xs">Entregável da próxima visita<Input value={deliverable} onChange={e => setDeliverable(e.target.value)} placeholder="Ex.: Apresentação do comparativo de caixa" /></label>
            <label className="grid gap-1 text-xs">Responsável Stone<Input value={owner} onChange={e => setOwner(e.target.value)} placeholder="Ex.: Gabriel Fiorati" /></label>
          </div>
          <div className="mt-5 rounded-lg bg-[#f6f8f2] p-4 text-xs leading-5 text-emerald-800/80">
            <div className="flex items-center gap-2 font-semibold text-emerald-900"><Sparkles size={14} /> Pilar sugerido: {playbook.pilar}</div>
            <p className="mt-1">{playbook.foco}</p>
          </div>
        </article>
      </section>

      <section className="rounded-xl border border-emerald-100 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2"><ClipboardList className="text-emerald-600" size={18} /><h3 className="font-semibold">Descrição da tarefa (resumo da reunião)</h3></div>
          <Button variant="outline" className="border-emerald-200 text-emerald-900" disabled={!taskDescription} onClick={() => copy(taskDescription, "Descrição da tarefa")}><Copy size={15} /> Copiar</Button>
        </div>
        <p className="mt-3 whitespace-pre-line rounded-lg bg-[#f6f8f2] p-4 text-sm leading-6 text-emerald-950">{taskDescription || "Preencha os campos acima para gerar a descrição."}</p>
      </section>

      <section className="rounded-xl border border-emerald-100 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2"><Sparkles className="text-emerald-600" size={18} /><h3 className="font-semibold">Próximos passos e como o Mega faria?</h3></div>
          <div className="flex gap-2">
            <Button variant="outline" className="border-emerald-200 text-emerald-900" disabled={!megaPlan} onClick={() => copy(megaPlan, "Próximos passos")}><Copy size={15} /> Copiar</Button>
            <Button className="bg-[#002b1d]" disabled={!taskDescription} onClick={exportPdf}><FileDown size={15} /> Exportar PDF</Button>
          </div>
        </div>
        <p className="mt-3 whitespace-pre-line rounded-lg bg-[#f6f8f2] p-4 text-sm leading-6 text-emerald-950">{megaPlan || "Preencha os campos acima para gerar o direcionamento."}</p>
      </section>
    </div>
  );
}
