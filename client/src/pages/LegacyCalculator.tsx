/**
 * Livro-Razão Solar — cálculo auditável por segmento, CNAE/MCC, faixa de TPV e proposta.
 * Regra visual: verde pinho para operação, ouro apenas para proposta menos agressiva.
 */
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BadgeCheck,
  Calculator,
  Check,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Coins,
  Copy,
  Landmark,
  Layers3,
  ListChecks,
  Plus,
  Target,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { MCC_CATALOG_WITH_RATES, PRELOADED_MCC_ENTRIES } from "@shared/mccCatalog";
import { calculateAutomaticMigrationBase, resolveMigrationBase, tierForTpv } from "@shared/migrationBase";
import { calculateMigrationRemuneration } from "@shared/migrationRemuneration";
import "./brand.css";

type ProposalType = "mais-agressiva" | "agressiva" | "menos-agressiva";
type TierKey = "0-7k" | "7-15k" | "15-30k" | "30-50k" | "50-100k" | "100-200k" | "200k+";
type ProposalRates = Record<ProposalType, number>;
type TierRates = Record<TierKey, ProposalRates>;

type SegmentRule = {
  id: string;
  label: string;
  reference: string;
  rates: TierRates;
};

type Client = {
  id: string;
  name: string;
  proposal: ProposalType;
  tpv: number;
  agreedTpv?: number;
  migratedTpv?: number;
  receiptOrigin?: "m1" | "late-m2";
  mcc: string;
  cnae: string;
  segmentId: string;
  eligible: boolean;
  manualBase?: number | null;
};

type Scenario = {
  period: string;
  goal: number;
  kpiTpv: number;
  hunterTpv: number;
  hunterRatePercent?: number;
  teamMet: boolean;
  clients: Client[];
  expected?: { newSales: number; hunter: number; total: number };
};

type LegacyCalculatorProps = {
  storageKey: string;
  onSaveSimulation: (simulation: {
    periodLabel: string;
    goalTpv: number;
    eligibleTpv: number;
    hunterTpv: number;
    newSalesBase: number;
    multiplier: number;
    finalVariable: number;
    detailsJson: string;
  }) => void;
};

const TIER_KEYS: TierKey[] = ["0-7k", "7-15k", "15-30k", "30-50k", "50-100k", "100-200k", "200k+"];
const TIER_LABELS: Record<TierKey, string> = {
  "0-7k": "0–7k",
  "7-15k": "7–15k",
  "15-30k": "15–30k",
  "30-50k": "30–50k",
  "50-100k": "50–100k",
  "100-200k": "100–200k",
  "200k+": "200k+",
};

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

function blankRates(): TierRates {
  return {
    "0-7k": { "mais-agressiva": 0, agressiva: 0, "menos-agressiva": 0 },
    "7-15k": { "mais-agressiva": 0, agressiva: 0, "menos-agressiva": 0 },
    "15-30k": { "mais-agressiva": 0, agressiva: 0, "menos-agressiva": 0 },
    "30-50k": { "mais-agressiva": 0, agressiva: 0, "menos-agressiva": 0 },
    "50-100k": { "mais-agressiva": 0, agressiva: 0, "menos-agressiva": 0 },
    "100-200k": { "mais-agressiva": 0, agressiva: 0, "menos-agressiva": 0 },
    "200k+": { "mais-agressiva": 0, agressiva: 0, "menos-agressiva": 0 },
  };
}

function rateWith(values: Partial<Record<TierKey, Partial<ProposalRates>>>): TierRates {
  const rates = blankRates();
  TIER_KEYS.forEach((tier) => {
    rates[tier] = { ...rates[tier], ...values[tier] };
  });
  return rates;
}

function initialSegments(): SegmentRule[] {
  return [
    ...MCC_CATALOG_WITH_RATES.map(segment => ({ id: segment.id, label: segment.label, reference: segment.correlation, rates: segment.rates })),
    { id: "unmapped", label: "Sem segmentação / regra manual", reference: "Preencher CNAE, MCC ou criar regra própria", rates: blankRates() },
  ];
}

function getKpiMultiplier(attainment: number) {
  if (attainment < 40) return 0;
  if (attainment < 60) return 0.4;
  if (attainment < 80) return 0.6;
  if (attainment < 100) return 0.8;
  if (attainment < 120) return 1.2;
  if (attainment < 140) return 1.4;
  if (attainment < 160) return 1.6;
  if (attainment < 180) return 1.8;
  return 2;
}

function julyScenario(): Scenario {
  return {
    period: "Julho / 2026 · conferência",
    goal: 230000,
    kpiTpv: 688422.3,
    hunterTpv: 985871.73,
    teamMet: false,
    expected: { newSales: 9390, hunter: 1971.74, total: 11361.74 },
    clients: [
      { id: "e-cleao", name: "E C Leão Lubrificantes e Acessórios", proposal: "agressiva", tpv: 52788, mcc: "5533", cnae: "", segmentId: "auto-parts", eligible: true },
      { id: "nakaza", name: "Nakaza Supermercado", proposal: "agressiva", tpv: 108322, mcc: "5411", cnae: "", segmentId: "supermarket", eligible: true },
      { id: "pedras", name: "Pedras Tucuruvi Revestimentos", proposal: "agressiva", tpv: 153548, mcc: "5099", cnae: "", segmentId: "revestments", eligible: true },
      { id: "porto", name: "Porto Inox", proposal: "agressiva", tpv: 13931, mcc: "5021", cnae: "", segmentId: "industrial", eligible: true },
      { id: "celius", name: "Celius Lubrificantes", proposal: "agressiva", tpv: 100669, mcc: "5983", cnae: "", segmentId: "fuel-lubes", eligible: true },
      { id: "amikao", name: "amikao", proposal: "menos-agressiva", tpv: 37162, mcc: "5995", cnae: "", segmentId: "variety", eligible: true },
      { id: "jocarvas", name: "Jocarvas Restaurante Ltda", proposal: "menos-agressiva", tpv: 56709, mcc: "5812", cnae: "", segmentId: "restaurant", eligible: true },
      { id: "dragster", name: "Oficina Dragster", proposal: "agressiva", tpv: 136625, mcc: "7538", cnae: "", segmentId: "auto-services", eligible: true },
      { id: "mario", name: "Mario Motos", proposal: "agressiva", tpv: 28669, mcc: "5571", cnae: "", segmentId: "motorcycles", eligible: true },
    ],
  };
}

function augustScenario(): Scenario {
  return {
    period: "Agosto / 2026 · projeção",
    goal: 206000,
    kpiTpv: 400000,
    hunterTpv: 0,
    teamMet: false,
    clients: [
      { id: "pascoal", name: "Lanchonete do Pascoal", proposal: "menos-agressiva", tpv: 38139.97, mcc: "", cnae: "", segmentId: "restaurant", eligible: true },
      { id: "vcharlei", name: "Adega Vcharlei", proposal: "agressiva", tpv: 64104.4, mcc: "", cnae: "", segmentId: "unmapped", eligible: true },
      { id: "diver", name: "Diver Kids", proposal: "agressiva", tpv: 67631.03, mcc: "", cnae: "", segmentId: "unmapped", eligible: true },
      { id: "prumo", name: "No Prumo Marcenaria", proposal: "agressiva", tpv: 14920.1, mcc: "", cnae: "", segmentId: "unmapped", eligible: true },
      { id: "bira", name: "Bira Centro Automotivo", proposal: "agressiva", tpv: 182113.22, mcc: "", cnae: "", segmentId: "auto-services", eligible: true },
      { id: "vila", name: "Da Vila", proposal: "menos-agressiva", tpv: 19234, mcc: "", cnae: "", segmentId: "unmapped", eligible: true },
      { id: "oticas", name: "Óticas Maia", proposal: "agressiva", tpv: 10919.51, mcc: "", cnae: "", segmentId: "unmapped", eligible: true },
      { id: "motos", name: "Mario Motos", proposal: "agressiva", tpv: 45778.34, mcc: "5571", cnae: "", segmentId: "motorcycles", eligible: true },
      { id: "pet", name: "Pet Center Mundo Animal", proposal: "menos-agressiva", tpv: 46328.03, mcc: "5995", cnae: "", segmentId: "unmapped", eligible: true },
      { id: "cerva", name: "Cerva e Cia", proposal: "agressiva", tpv: 29450.49, mcc: "5921", cnae: "", segmentId: "unmapped", eligible: true },
    ],
  };
}

function loadScenario(setters: { setPeriod: (value: string) => void; setGoal: (value: number) => void; setKpiTpv: (value: number) => void; setHunterTpv: (value: number) => void; setTeamMet: (value: boolean) => void; setClients: (value: Client[]) => void; setExpected: (value?: Scenario["expected"]) => void }, scenario: Scenario) {
  setters.setPeriod(scenario.period);
  setters.setGoal(scenario.goal);
  setters.setKpiTpv(scenario.kpiTpv);
  setters.setHunterTpv(scenario.hunterTpv);
  setters.setTeamMet(scenario.teamMet);
  setters.setClients(scenario.clients);
  setters.setExpected(scenario.expected);
}

export default function LegacyCalculator({ storageKey, onSaveSimulation }: LegacyCalculatorProps) {

  const [segments, setSegments] = useState<SegmentRule[]>(initialSegments);
  const [period, setPeriod] = useState("Nova simulação");
  const [goal, setGoal] = useState(0);
  const [kpiTpv, setKpiTpv] = useState(0);
  const [hunterTpv, setHunterTpv] = useState(0);
  const [hunterRatePercent, setHunterRatePercent] = useState(0.1);
  const [teamMet, setTeamMet] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [expected, setExpected] = useState<Scenario["expected"]>(undefined);
  const [manualMultiplier, setManualMultiplier] = useState(false);
  const [multiplierInput, setMultiplierInput] = useState(2);
  const [clientEditorOpen, setClientEditorOpen] = useState(true);
  const [matrixOpen, setMatrixOpen] = useState(true);
  const [selectedSegmentId, setSelectedSegmentId] = useState(MCC_CATALOG_WITH_RATES[0]!.id);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return;
    try {
      const saved = JSON.parse(stored);
      if (Array.isArray(saved.segments)) setSegments(saved.segments);
      if (Array.isArray(saved.clients)) setClients(saved.clients);
      if (typeof saved.period === "string") setPeriod(saved.period);
      if (typeof saved.goal === "number") setGoal(saved.goal);
      if (typeof saved.kpiTpv === "number") setKpiTpv(saved.kpiTpv);
      if (typeof saved.hunterTpv === "number") setHunterTpv(saved.hunterTpv);
      if (typeof saved.hunterRatePercent === "number") setHunterRatePercent(saved.hunterRatePercent);
      if (typeof saved.teamMet === "boolean") setTeamMet(saved.teamMet);
      if (typeof saved.manualMultiplier === "boolean") setManualMultiplier(saved.manualMultiplier);
      if (typeof saved.multiplierInput === "number") setMultiplierInput(saved.multiplierInput);
      if (saved.expected) setExpected(saved.expected);
    } catch {
      // Mantém a conferência de julho quando a versão salva é incompatível.
    }
  }, [storageKey]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify({ segments, clients, period, goal, kpiTpv, hunterTpv, hunterRatePercent, teamMet, manualMultiplier, multiplierInput, expected }));
  }, [storageKey, segments, clients, period, goal, kpiTpv, hunterTpv, hunterRatePercent, teamMet, manualMultiplier, multiplierInput, expected]);

  const calculation = useMemo(() => {
    const attainment = goal > 0 ? (kpiTpv / goal) * 100 : 0;
    const autoMultiplier = getKpiMultiplier(attainment);
    const multiplier = manualMultiplier ? Math.max(multiplierInput, 0) : autoMultiplier;
    const detailedClients = clients.map((client) => {
      const agreedTpv = Math.max(client.agreedTpv ?? client.tpv, 0);
      const migratedTpv = Math.max(client.migratedTpv ?? client.tpv, 0);
      const receiptOrigin = client.receiptOrigin ?? "m1";
      const automatic = calculateAutomaticMigrationBase({ ...client, tpv: migratedTpv });
      const tier = tierForTpv(migratedTpv) as TierKey;
      const segmentId = automatic.segmentId || client.segmentId;
      const segment = segments.find((item) => item.id === segmentId);
      const autoBase = automatic.base || (segment?.rates?.[tier]?.[client.proposal] ?? 0);
      const hasManualBase = typeof client.manualBase === "number";
      const base = resolveMigrationBase(autoBase, client.manualBase, client.eligible);
      const migrationPercent = agreedTpv > 0 ? migratedTpv / agreedTpv * 100 : 0;
      return { ...client, agreedTpv, migratedTpv, receiptOrigin, migrationPercent, tier, segment, autoBase, hasManualBase, base };
    });
    const activeBase = detailedClients.reduce((sum, client) => sum + client.base, 0);
    const teamBonus = teamMet && attainment >= 100 ? 400 : 0;
    const m1Clients = detailedClients.filter((client) => client.eligible && client.receiptOrigin === "m1");
    const lateClients = detailedClients.filter((client) => client.eligible && client.receiptOrigin === "late-m2");
    const m1MigratedTpv = m1Clients.reduce((sum, client) => sum + client.migratedTpv, 0);
    const lateMigratedTpv = lateClients.reduce((sum, client) => sum + client.migratedTpv, 0);
    const m1Base = m1Clients.reduce((sum, client) => sum + client.base, 0);
    const lateBase = lateClients.reduce((sum, client) => sum + client.base, 0);
    const remuneration = calculateMigrationRemuneration({ goalTpv: goal, kpiTpv, newSalesMultiplier: multiplier, m1MigratedTpv, lateMigratedTpv, m1Base, lateBase, hunterTpv, hunterRatePercent, teamBonus });
    const nextTargets = [40, 60, 80, 100, 120, 140, 160, 180];
    const nextTarget = nextTargets.find((target) => target > attainment) ?? null;
    const missingRules = detailedClients.filter((client) => client.eligible && client.autoBase === 0 && !client.hasManualBase && client.migratedTpv >= 7000);
    return { attainment, autoMultiplier, multiplier, detailedClients, activeBase, eligibleTpv: m1MigratedTpv, m1Base, lateBase, teamBonus, nextTarget, missingRules, ...remuneration };
  }, [clients, segments, goal, kpiTpv, hunterTpv, hunterRatePercent, manualMultiplier, multiplierInput, teamMet]);

  const setters = { setPeriod, setGoal, setKpiTpv, setHunterTpv, setTeamMet, setClients, setExpected };
  const updateClient = (id: string, patch: Partial<Client>) => setClients((current) => current.map((client) => (client.id === id ? { ...client, ...patch } : client)));
  const updateSegment = (id: string, patch: Partial<SegmentRule>) => setSegments((current) => current.map((segment) => (segment.id === id ? { ...segment, ...patch } : segment)));
  const updateRate = (segmentId: string, tier: TierKey, proposal: ProposalType, value: number) => {
    setSegments((current) => current.map((segment) => segment.id === segmentId ? { ...segment, rates: { ...segment.rates, [tier]: { ...segment.rates[tier], [proposal]: value } } } : segment));
  };
  const addClient = () => setClients((current) => [...current, { id: `client-${Date.now()}`, name: "Novo cliente", proposal: "agressiva", tpv: 0, receiptOrigin: "m1", mcc: "", cnae: "", segmentId: selectedSegmentId === "unmapped" ? MCC_CATALOG_WITH_RATES[0]!.id : selectedSegmentId, eligible: true }]);
  const addSegment = () => {
    const id = `segment-${Date.now()}`;
    setSegments((current) => [...current, { id, label: "Novo segmento", reference: "CNAE/MCC a informar", rates: blankRates() }]);
    setSelectedSegmentId(id);
    toast.success("Segmento criado. Agora preencha sua tabela de comissão.");
  };
  const copySummary = async () => {
    const text = `${period}\nTPV de Migração M1 (meta): ${brl.format(calculation.m1MigratedTpv)}\nTPV de migração tardia M−2 (fora da meta): ${brl.format(calculation.lateMigratedTpv)}\nRV de novos migrados M1: ${brl.format(calculation.m1Value)}\nRV de migração tardia: ${brl.format(calculation.lateMigrationValue)}\nHunter (${decimal.format(hunterRatePercent)}% × KPI ${decimal.format(calculation.hunterKpiFactor * 100)}%): ${brl.format(calculation.hunterValue)}\nMeta time: ${brl.format(calculation.teamBonus)}\nRemuneração final: ${brl.format(calculation.total)}`;
    await navigator.clipboard.writeText(text);
    toast.success("Resumo copiado para a área de transferência.");
  };

  const saveCurrentSimulation = () => {
    onSaveSimulation({
      periodLabel: period,
      goalTpv: goal,
      eligibleTpv: calculation.eligibleTpv,
      hunterTpv,
      newSalesBase: calculation.activeBase,
      multiplier: calculation.multiplier,
      finalVariable: calculation.total,
      detailsJson: JSON.stringify({ segments, clients, teamMet, manualMultiplier, hunterRatePercent, m1MigratedTpv: calculation.m1MigratedTpv, lateMigratedTpv: calculation.lateMigratedTpv, m1Base: calculation.m1Base, lateBase: calculation.lateBase, hunterKpiFactor: calculation.hunterKpiFactor }),
    });
  };

  const selectedSegment = segments.find((item) => item.id === selectedSegmentId) ?? segments[0];
  const renderRateEvidence = (tier: TierKey, proposal: ProposalType) => {
    const catalogSegment = MCC_CATALOG_WITH_RATES.find((segment) => segment.id === selectedSegment?.id);
    const currentRate = selectedSegment?.rates[tier][proposal] ?? 0;
    const presetRate = catalogSegment?.rates[tier][proposal] ?? 0;
    const detail = catalogSegment?.evidence?.[`${tier}:${proposal}`];
    if (detail && currentRate === presetRate) return <small className={`rate-evidence ${detail.status}`}>{detail.status === "confirmada" ? "Confirmada" : "Correlação"} · {detail.source}</small>;
    if (currentRate > 0) return <small className="rate-evidence manual">Ajuste manual</small>;
    return null;
  };
  const applyMccReference = (client: Client, mcc: string) => {
    const match = PRELOADED_MCC_ENTRIES.find(entry => entry.mcc === mcc);
    updateClient(client.id, {
      mcc,
      segmentId: match?.segmentId ?? client.segmentId,
      cnae: match?.cnaes[0] ?? client.cnae,
    });
    setExpected(undefined);
  };
  const applyCnaeReference = (client: Client, cnae: string) => {
    const normalized = cnae.replace(/\D/g, "");
    const match = PRELOADED_MCC_ENTRIES.find(entry => entry.cnaes.some(item => item.replace(/\D/g, "") === normalized));
    updateClient(client.id, {
      cnae,
      mcc: match?.mcc ?? client.mcc,
      segmentId: match?.segmentId ?? client.segmentId,
    });
    setExpected(undefined);
  };
  const isAudited = !!expected;
  const auditMatches = expected ? Math.abs(calculation.newSalesValue - expected.newSales) < 0.01 && Math.abs(calculation.hunterValue - expected.hunter) < 0.01 && Math.abs(calculation.total - expected.total) < 0.01 : false;
  const clearForm = () => {
    setSegments(initialSegments());
    setSelectedSegmentId(MCC_CATALOG_WITH_RATES[0]!.id);
    setPeriod("Nova simulação");
    setGoal(0);
    setKpiTpv(0);
    setHunterTpv(0);
    setHunterRatePercent(0.1);
    setTeamMet(false);
    setClients([]);
    setExpected(undefined);
    setManualMultiplier(false);
    setMultiplierInput(2);
    toast.success("Formulário limpo. Preencha os dados da nova simulação.");
  };

  return (
    <div className="app-shell fiorati-embedded-calculator">
      <aside className="side-ledger">
        <div className="brand-lockup"><img className="brand-mark" src="/assets/projeto-ulisses-helmet-clean.png" alt="Símbolo do Projeto Ulisses: Fiorati" /><div><p className="brand-eyebrow">Caderno operacional</p><h1>PROJETO <span>ULISSES: FIORATI</span></h1></div></div>
        <nav className="ledger-nav" aria-label="Navegação da calculadora">
          <a className="nav-item active" href="#visao-geral"><Landmark size={18} /> Visão geral</a>
          <a className="nav-item" href="#clientes"><UsersRound size={18} /> Migração M1 <span>{clients.length}</span></a>
          <a className="nav-item" href="#hunter"><Target size={18} /> Carteira Hunter</a>
          <a className="nav-item" href="#matriz"><Layers3 size={18} /> Matriz de comissão</a>
        </nav>
        <div className="sidebar-note"><div className="note-icon"><Calculator size={17} /></div><p><strong>Comece pelas suas regras.</strong> Informe segmento, CNAE/MCC e alíquotas. A calculadora aplica a matriz automaticamente.</p></div>
        <div className="side-footer"><span>PROJETO ULISSES / 2026</span><span>LOCAL</span></div>
      </aside>

      <main className="workspace">
        <section id="visao-geral" className="top-strip">
          <div><p className="kicker">CALCULADORA DE REMUNERAÇÃO VARIÁVEL</p><h2>Seu cálculo,<br /><em>com base no MCC.</em></h2><p className="top-copy">Preencha metas, clientes, CNAE/MCC, proposta e TPV. A base é sugerida automaticamente e permanece editável.</p></div>
          <div className="top-actions"><Button variant="outline" className="quiet-button" onClick={clearForm}>Limpar formulário</Button><Button variant="outline" className="quiet-button" onClick={saveCurrentSimulation}>Salvar histórico</Button><Button className="copy-button" onClick={copySummary}><Copy size={16} /> Copiar resumo</Button></div>
          <img className="ledger-art" src="/assets/projeto-ulisses-helmet-symbol.png" alt="Ilustração abstrata de cálculo e progresso" />
        </section>

        <section className="first-use-strip" aria-label="Como preencher a calculadora">
          <div className="first-use-title"><p className="kicker">PRIMEIRO ACESSO</p><h3>Configure em quatro passos.</h3><p>A conta começa vazia para preservar a privacidade de quem for utilizá-la.</p></div>
          <div className="setup-steps"><a href="#parametros"><span>01</span><strong>Meta e KPI</strong><small>Informe objetivo e TPV M1.</small></a><a href="#matriz"><span>02</span><strong>Matriz</strong><small>Cadastre segmento e alíquota.</small></a><a href="#clientes"><span>03</span><strong>M0 → M1</strong><small>Registre acordado e migrado.</small></a><a href="#hunter"><span>04</span><strong>Hunter</strong><small>Inclua carteira e alíquota.</small></a></div>
        </section>

        <section className="dashboard-grid">
          <article className="attainment-card section-card"><div className="card-overline"><span><Target size={16} /> ATINGIMENTO DO KPI</span><span className="live-dot">{period.toUpperCase()}</span></div><div className="attainment-number">{decimal.format(calculation.attainment)}<span>%</span></div><div className="meter-track" aria-label={`Atingimento de ${decimal.format(calculation.attainment)} por cento`}><div className="meter-fill" style={{ width: `${Math.min(calculation.attainment / 2, 100)}%` }} />{[40, 60, 80, 100, 120, 140, 160, 180, 200].map((point) => <i key={point} style={{ left: `${point / 2}%` }} />)}</div><div className="meter-labels"><span>40%</span><span>100%</span><span>200%</span></div>{goal === 0 ? <p className="next-step"><CircleAlert size={16} /> Informe a meta e o TPV para calcular o atingimento.</p> : calculation.nextTarget ? <p className="next-step"><ArrowUpRight size={16} /> Faltam {brl.format(Math.max((calculation.nextTarget / 100) * goal - kpiTpv, 0))} para {calculation.nextTarget}%.</p> : <p className="next-step done"><Check size={16} /> Faixa máxima de multiplicador atingida.</p>}</article>
          <article className="multiplier-card section-card"><p className="card-overline">MULTIPLICADOR ATUAL</p><div className="multiplier-big">{calculation.multiplier.toFixed(1)}<span>x</span></div><div className="multiplier-caption">{manualMultiplier ? "Multiplicador definido manualmente" : "Régua: 40% → 0,4x; 100% → 1,2x; 180%+ → 2,0x."}</div><div className="multiplier-row"><label htmlFor="manual-mode">Definir manualmente</label><Switch id="manual-mode" checked={manualMultiplier} onCheckedChange={setManualMultiplier} /></div>{manualMultiplier && <div className="compact-input"><Input aria-label="Multiplicador manual" type="number" min="0" max="3" step="0.1" value={multiplierInput} onChange={(event) => setMultiplierInput(Number(event.target.value) || 0)} /><span>x</span></div>}</article>
          <article className="result-card section-card"><div className="result-top"><span><Coins size={17} /> REMUNERAÇÃO FINAL</span><span className="result-pill">{isAudited ? "CONFERÊNCIA" : "SIMULAÇÃO"}</span></div><div className="result-value">{brl.format(calculation.total)}</div><p>Migrações {brl.format(calculation.newSalesValue)} + Hunter {brl.format(calculation.hunterValue)} + time {brl.format(calculation.teamBonus)}.</p><div className="result-footer"><span>Resultado após KPI</span><ChevronRight size={17} /></div></article>
        </section>

        <section className="grid gap-4 rounded-xl border border-emerald-100 bg-white p-5 md:grid-cols-2 xl:grid-cols-4" aria-label="Memória de cálculo da remuneração variável"><div className="md:col-span-2 xl:col-span-4"><p className="kicker">MEMÓRIA DE CÁLCULO / M0 → M2</p><h3 className="mt-1 text-xl font-semibold text-emerald-950">A migração de M1 define a base; o recebimento ocorre em M2.</h3><p className="mt-1 text-sm text-emerald-800/65">Migrações tardias de vendas M−2 entram na RV, mas ficam fora do TPV usado na meta atual.</p></div><article className="rounded-lg bg-emerald-50 p-4"><p className="font-mono text-[10px] tracking-[.12em] text-emerald-700">NOVOS M0 → M1</p><strong className="mt-2 block text-lg text-emerald-950">{brl.format(calculation.m1Value)}</strong><small className="mt-1 block text-emerald-800/70">{brl.format(calculation.m1Base)} base × {calculation.multiplier.toFixed(1)}x</small><small className="mt-1 block text-emerald-800/55">TPV para KPI: {brl.format(calculation.m1MigratedTpv)}</small></article><article className="rounded-lg bg-amber-50 p-4"><p className="font-mono text-[10px] tracking-[.12em] text-amber-800">M−2 / MIGRAÇÃO TARDIA</p><strong className="mt-2 block text-lg text-emerald-950">{brl.format(calculation.lateMigrationValue)}</strong><small className="mt-1 block text-amber-900/70">{brl.format(calculation.lateBase)} base × {calculation.multiplier.toFixed(1)}x</small><small className="mt-1 block text-amber-900/55">Fora do TPV da meta: {brl.format(calculation.lateMigratedTpv)}</small></article><article className="rounded-lg bg-lime-50 p-4"><p className="font-mono text-[10px] tracking-[.12em] text-lime-800">HUNTER M1 A M4</p><strong className="mt-2 block text-lg text-emerald-950">{brl.format(calculation.hunterValue)}</strong><small className="mt-1 block text-lime-900/70">{brl.format(hunterTpv)} × {decimal.format(hunterRatePercent)}% × {decimal.format(calculation.hunterKpiFactor * 100)}%</small><small className="mt-1 block text-lime-900/55">Fator Hunter usa o atingimento do KPI, limitado a 200%.</small></article><article className="rounded-lg bg-[#0e3426] p-4 text-white"><p className="font-mono text-[10px] tracking-[.12em] text-lime-200">RV TOTAL PREVISTA</p><strong className="mt-2 block text-2xl">{brl.format(calculation.total)}</strong><small className="mt-1 block text-emerald-100/70">M1 + tardia + Hunter + meta time</small><small className="mt-1 block text-emerald-100/55">Recebimento previsto: M2.</small></article></section>

        <section id="parametros" className="settings-grid" aria-label="Parâmetros do cálculo">
          <article className="parameter-card"><div className="parameter-heading"><span className="heading-index">01</span><div><h3>Meta e TPV de Migração M1</h3><p>O TPV da sua migração pode alimentar o KPI e definir o multiplicador.</p></div></div><div className="field-pair"><label>Meta (R$)<Input type="number" min="0" placeholder="Ex.: 230000" value={goal || ""} onChange={(event) => { setGoal(Number(event.target.value) || 0); setExpected(undefined); }} /></label><label>TPV de Migração M1 no KPI (R$)<Input type="number" min="0" placeholder="Ex.: 400000" value={kpiTpv || ""} onChange={(event) => { setKpiTpv(Number(event.target.value) || 0); setExpected(undefined); }} /></label></div><button type="button" className="mt-3 font-mono text-[10px] font-semibold uppercase tracking-[.08em] text-emerald-700 underline underline-offset-4" onClick={() => { setKpiTpv(calculation.eligibleTpv); setExpected(undefined); }}>Usar TPV elegível somado: {brl.format(calculation.eligibleTpv)}</button></article>
          <article className="parameter-card team-card"><div className="parameter-heading"><span className="heading-index">02</span><div><h3>Meta time</h3><p>Acrescenta R$ 400 quando polo e agente atingem a meta.</p></div></div><div className="team-switch"><div><strong>{teamMet && calculation.attainment >= 100 ? "+ R$ 400,00" : "R$ 0,00"}</strong><span>{teamMet ? "Polo confirmou a meta" : "Polo ainda não confirmou"}</span></div><Switch checked={teamMet} onCheckedChange={(checked) => { setTeamMet(checked); setExpected(undefined); }} aria-label="Polo bateu a meta" /></div></article>
        </section>

        {isAudited && <section className={`audit-strip ${auditMatches ? "confirmed" : "divergent"}`}><div className="audit-title">{auditMatches ? <BadgeCheck size={20} /> : <CircleAlert size={20} />}<div><p className="kicker">CONFRONTO COM CARD</p><h3>{auditMatches ? "A soma reproduz o fechamento informado." : "Há diferença entre a simulação e o card."}</h3></div></div><div className="audit-values"><span><small>Migrações</small><strong>{brl.format(calculation.newSalesValue)}</strong><em>Card: {brl.format(expected?.newSales ?? 0)}</em></span><span><small>Prêmios individuais</small><strong>{brl.format(calculation.hunterValue)}</strong><em>Card: {brl.format(expected?.hunter ?? 0)}</em></span><span><small>Remuneração final</small><strong>{brl.format(calculation.total)}</strong><em>Card: {brl.format(expected?.total ?? 0)}</em></span></div></section>}

        <section id="hunter" className="hunter-section"><div className="hunter-copy"><p className="kicker">PRÊMIOS INDIVIDUAIS / HUNTER</p><h3>TPV Hunter entra na conta<br />com <em>alíquota individual.</em></h3><p>Informe o TPV M1 a M4 e a alíquota do agente. O prêmio Hunter usa o atingimento percentual do KPI, diferente da régua de multiplicador da venda nova.</p><div className="hunter-formula"><span>{brl.format(hunterTpv)}</span><b>× {decimal.format(hunterRatePercent)}%</b><span>× {decimal.format(calculation.hunterKpiFactor * 100)}%</span><strong>= {brl.format(calculation.hunterValue)}</strong></div></div><div className="hunter-entry"><label htmlFor="hunter-tpv">TPV M1 a M4 / Hunter</label><div className="big-input"><span>R$</span><Input id="hunter-tpv" type="number" min="0" placeholder="Ex.: 1130735,06" value={hunterTpv || ""} onChange={(event) => { setHunterTpv(Number(event.target.value) || 0); setExpected(undefined); }} /></div><label className="mt-3 grid gap-1 text-xs text-emerald-100/80" htmlFor="hunter-rate">Alíquota Hunter (%)<Input id="hunter-rate" type="number" min="0" max="1" step="0.01" placeholder="Ex.: 0,10" value={hunterRatePercent || ""} onChange={(event) => { setHunterRatePercent(Math.min(Math.max(Number(event.target.value) || 0, 0), 1)); setExpected(undefined); }} className="border-white/20 bg-white/10 text-white" /></label><p className="mt-2 text-[11px] text-emerald-100/65">Sugestões: 0,08%, 0,09% ou 0,10% conforme o card individual.</p><div className="hunter-result"><span>Base Hunter antes do KPI</span><strong>{brl.format(calculation.hunterBase)}</strong></div></div><img className="hunter-art" src="/assets/projeto-ulisses-helmet-symbol.png" alt="Ilustração abstrata da carteira Hunter" /></section>

        <section id="clientes" className="clients-section"><div className="section-heading-row"><div><p className="kicker">MIGRAÇÃO E RECEBIMENTO</p><h3>Clientes de <em>M0 para M1</em> <span>/{clients.length.toString().padStart(2, "0")}</span></h3><p>Registre o TPV acordado em M0 e o TPV efetivamente migrado em M1. O tier e a base usam o TPV M1; a origem identifica se a RV entra na meta atual ou é uma migração tardia M−2.</p></div><Button variant="outline" className="editor-toggle" onClick={() => setClientEditorOpen((open) => !open)}>{clientEditorOpen ? "Fechar edição" : "Editar clientes"}</Button></div>
          <div className="clients-table-wrap"><table className="clients-table expanded"><thead><tr><th>Cliente</th><th>CNAE / MCC</th><th>Proposta</th><th>TPV M0</th><th>Tier M1</th><th>Recebe RV</th><th>Base M1</th></tr></thead><tbody>{calculation.detailedClients.map((client) => <tr key={client.id}><td>{clientEditorOpen ? <Input aria-label={`Nome do cliente ${client.name}`} value={client.name} onChange={(event) => { updateClient(client.id, { name: event.target.value }); setExpected(undefined); }} /> : <strong>{client.name}</strong>}</td><td>{clientEditorOpen ? <div className="ref-inputs"><Input list="cnae-catalog" aria-label={`CNAE de ${client.name}`} placeholder="CNAE" value={client.cnae} onChange={(event) => applyCnaeReference(client, event.target.value)} /><select className="segment-select" aria-label={`MCC e atividade de ${client.name}`} value={client.mcc} onChange={(event) => applyMccReference(client, event.target.value)}><option value="">Selecione MCC / atividade</option>{PRELOADED_MCC_ENTRIES.map((entry) => <option key={entry.mcc} value={entry.mcc}>{entry.mcc} · {entry.activity}</option>)}</select></div> : <span className="mcc-code">{client.cnae || "—"} {client.mcc ? `· MCC ${client.mcc}` : ""}</span>}</td><td>{clientEditorOpen ? <select className={`proposal-select ${client.proposal}`} value={client.proposal} onChange={(event) => { updateClient(client.id, { proposal: event.target.value as ProposalType }); setExpected(undefined); }}><option value="mais-agressiva">Mais agressiva</option><option value="agressiva">Agressiva</option><option value="menos-agressiva">Menos agressiva</option></select> : <span className={`proposal-badge ${client.proposal}`}>{client.proposal === "menos-agressiva" ? "✦ Menos agressiva" : client.proposal === "mais-agressiva" ? "◆ Mais agressiva" : "Agressiva"}</span>}</td><td>{clientEditorOpen ? <Input aria-label={`TPV acordado em M0 de ${client.name}`} type="number" min="0" value={client.agreedTpv ?? client.tpv ?? ""} onChange={(event) => { const agreedTpv = Number(event.target.value) || 0; updateClient(client.id, { agreedTpv, tpv: agreedTpv }); setExpected(undefined); }} /> : brl.format(client.agreedTpv ?? client.tpv)}</td><td><span className="tier-badge">{TIER_LABELS[client.tier]}</span></td><td><input className="eligibility" type="checkbox" checked={client.eligible} onChange={(event) => { updateClient(client.id, { eligible: event.target.checked }); setExpected(undefined); }} aria-label={`Cliente ${client.name} recebe RV`} disabled={!clientEditorOpen} /></td><td className="reward-cell">{clientEditorOpen ? <div className="base-editor"><Input aria-label={`Base de comissão de ${client.name}`} type="number" min="0" value={client.hasManualBase ? client.manualBase ?? "" : client.autoBase || ""} onChange={(event) => { const raw = event.target.value; updateClient(client.id, { manualBase: raw === "" ? null : Number(raw) || 0 }); setExpected(undefined); }} /><small>{client.hasManualBase ? "Manual" : `Auto M1: ${brl.format(client.autoBase)}`}</small>{client.hasManualBase && <button type="button" onClick={() => { updateClient(client.id, { manualBase: null }); setExpected(undefined); }}>Restaurar auto</button>}</div> : <>{brl.format(client.base)}<small>{client.hasManualBase ? "Manual" : "Automática M1"}</small></>}</td></tr>)}</tbody></table></div><datalist id="cnae-catalog">{PRELOADED_MCC_ENTRIES.flatMap((entry) => entry.cnaes.map((cnae) => <option key={`${entry.mcc}-${cnae}`} value={cnae} label={`${entry.activity} · MCC ${entry.mcc}`} />))}</datalist>
          {clientEditorOpen && <Button variant="outline" className="add-client" onClick={addClient}><Plus size={17} /> Adicionar cliente</Button>}<div className="client-base-line"><span>TPV total de Migração M1</span><strong>{brl.format(calculation.eligibleTpv)}</strong><span className="formula-chip">Σ TPV dos clientes elegíveis</span><span>Base de comissão</span><strong>{brl.format(calculation.activeBase)}</strong><span className="formula-chip">Σ segmento + tier + proposta</span></div>
          {clientEditorOpen && <section className="mt-5 rounded-xl border border-emerald-100 bg-[#f5f8f2] p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="kicker">M0, M1 E RECEBIMENTO</p><h4 className="mt-1 font-semibold text-emerald-950">Conferência de migração por cliente.</h4><p className="mt-1 text-xs text-emerald-800/65">O TPV migrado em M1 define a faixa e a base. Venda M−2 tardia recebe RV, mas não entra no TPV da meta atual.</p></div><span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-800">Recebimento: M2</span></div><div className="mt-4 grid gap-3">{calculation.detailedClients.map(client => <div className="grid gap-3 rounded-lg border border-emerald-100 bg-white p-3 md:grid-cols-[minmax(150px,1.4fr)_minmax(110px,.8fr)_minmax(110px,.8fr)_minmax(155px,1fr)_auto] md:items-end" key={`migration-${client.id}`}><div><b className="block truncate text-sm text-emerald-950">{client.name || "Cliente sem nome"}</b><small className="text-emerald-700/65">Tier M1: {TIER_LABELS[client.tier]} · Base: {brl.format(client.base)}</small></div><label className="grid gap-1 text-xs text-emerald-800">TPV acordado M0<Input aria-label={`TPV acordado M0 de ${client.name}`} type="number" min="0" value={client.agreedTpv ?? client.tpv ?? ""} onChange={event => { const agreedTpv = Number(event.target.value) || 0; updateClient(client.id, { agreedTpv, tpv: agreedTpv }); setExpected(undefined); }} /></label><label className="grid gap-1 text-xs text-emerald-800">TPV migrado M1<Input aria-label={`TPV migrado M1 de ${client.name}`} type="number" min="0" value={client.migratedTpv ?? client.tpv ?? ""} onChange={event => { updateClient(client.id, { migratedTpv: Number(event.target.value) || 0 }); setExpected(undefined); }} /></label><label className="grid gap-1 text-xs text-emerald-800">Origem do recebimento<select className="segment-select" aria-label={`Origem do recebimento de ${client.name}`} value={client.receiptOrigin} onChange={event => { updateClient(client.id, { receiptOrigin: event.target.value as Client["receiptOrigin"] }); setExpected(undefined); }}><option value="m1">Novo M0 → M1</option><option value="late-m2">Venda M−2 tardia</option></select></label><div className="rounded-md bg-emerald-50 px-3 py-2 text-right"><b className="block font-mono text-sm text-emerald-950">{decimal.format(client.migrationPercent)}%</b><small className="text-[10px] text-emerald-700/65">migração</small></div></div>)}</div></section>}
          {calculation.missingRules.length > 0 && <div className="missing-rules"><CircleAlert size={17} /><p><strong>{calculation.missingRules.length} cliente(s)</strong> elegível(is) ainda não têm alíquota configurada para o segmento, faixa de TPV e proposta informados. Eles permanecem em R$ 0,00 até a regra ser preenchida.</p></div>}
        </section>

        <section id="matriz" className="matrix-section"><div className="section-heading-row"><div><p className="kicker">MATRIZ CONFIGURÁVEL</p><h3>Regras por <em>atividade e volume.</em></h3><p>O MCC/CNAE selecionado sugere a alíquota do card. Use esta matriz para revisar ou ajustar valores do seu polo.</p></div><Button variant="outline" className="editor-toggle" onClick={() => setMatrixOpen((open) => !open)}>{matrixOpen ? "Ocultar matriz" : "Editar matriz"}</Button></div>
          {matrixOpen && <div className="matrix-board"><div className="matrix-toolbar"><div><label>Segmento selecionado<select value={selectedSegmentId} onChange={(event) => setSelectedSegmentId(event.target.value)}>{segments.filter((segment) => segment.id !== "unmapped").map((segment) => <option key={segment.id} value={segment.id}>{segment.label}</option>)}</select></label><p>Referência: <strong>{selectedSegment?.reference}</strong></p><p className="matrix-evidence">Legenda: <b className="confirmed">confirmada</b> veio de card; <b className="correlation">correlação</b> aplica atividade próxima; <b className="manual">manual</b> foi ajustada pelo agente.</p></div></div>{selectedSegment && <><div className="segment-edit"><label>Nome do segmento<Input value={selectedSegment.label} onChange={(event) => updateSegment(selectedSegment.id, { label: event.target.value })} /></label><label>Referência CNAE/MCC<Input value={selectedSegment.reference} onChange={(event) => updateSegment(selectedSegment.id, { reference: event.target.value })} /></label></div><div className="matrix-scroll"><table className="matrix-table"><thead><tr><th>Faixa de TPV</th><th>Mais agressiva</th><th>Agressiva</th><th>Menos agressiva</th></tr></thead><tbody>{TIER_KEYS.filter((tier) => tier !== "0-7k").map((tier) => <tr key={tier}><td><strong>{TIER_LABELS[tier]}</strong><span>TPV realizado</span></td><td><div className="rate-input"><span>R$</span><Input type="number" min="0" value={selectedSegment.rates[tier]["mais-agressiva"] || ""} onChange={(event) => updateRate(selectedSegment.id, tier, "mais-agressiva", Number(event.target.value) || 0)} /></div>{renderRateEvidence(tier, "mais-agressiva")}</td><td><div className="rate-input"><span>R$</span><Input type="number" min="0" value={selectedSegment.rates[tier].agressiva || ""} onChange={(event) => updateRate(selectedSegment.id, tier, "agressiva", Number(event.target.value) || 0)} /></div>{renderRateEvidence(tier, "agressiva")}</td><td><div className="rate-input gold"><span>R$</span><Input type="number" min="0" value={selectedSegment.rates[tier]["menos-agressiva"] || ""} onChange={(event) => updateRate(selectedSegment.id, tier, "menos-agressiva", Number(event.target.value) || 0)} /></div>{renderRateEvidence(tier, "menos-agressiva")}</td></tr>)}</tbody></table></div></>}</div>}
        </section>

        <section className="rules-section"><div className="rules-copy"><p className="kicker">COMO O CÁLCULO FUNCIONA</p><h3>O MCC sugere,<br />sua variável aparece.</h3><p>A base de cada cliente usa o TPV que efetivamente migrou, com MCC/CNAE, tier e proposta. Em exceções, o agente pode informar a base manual na própria linha.</p><div className="tier-stat-line"><span>Migrações: {brl.format(calculation.newSalesValue)}</span><span>Hunter: {brl.format(calculation.hunterValue)}</span><span>KPI: {calculation.multiplier.toFixed(1)}x</span></div></div><div className="logic-cards"><div><span>01</span><strong>Registre M0 e M1</strong><p>Informe o TPV acordado e o que migrou.</p></div><div><span>02</span><strong>Enquadre o TPV M1</strong><p>O migrado define o tier aplicável.</p></div><div><span>03</span><strong>Revise a base</strong><p>A sugestão pode ser substituída manualmente por cliente.</p></div></div><img className="tier-art" src="/assets/projeto-ulisses-helmet-symbol.png" alt="Marcadores abstratos de progressão por tier" /></section>
        <footer className="app-footer"><span>PROJETO ULISSES: FIORATI / Calculadora de RV</span><span>Salve a simulação para registrar seu histórico privado.</span></footer>
      </main>
    </div>
  );
}
