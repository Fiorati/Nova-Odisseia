export type ProposalPricing = "mais-agressiva" | "agressiva" | "menos-agressiva";
export type CommissionTier = "0-7k" | "7-15k" | "15-30k" | "30-50k" | "50-100k" | "100-200k" | "200k+";
export type CommissionRates = Record<CommissionTier, Record<ProposalPricing, number>>;
export type RateEvidence = "confirmada" | "correlacao" | "manual";
export type RateEvidenceDetail = { status: RateEvidence; source: string };
export type RateEvidenceMap = Partial<Record<`${CommissionTier}:${ProposalPricing}`, RateEvidenceDetail>>;

export type MccEntry = { mcc: string; activity: string; cnaes: string[] };
export type CatalogSegment = {
  id: string;
  label: string;
  correlation: string;
  entries: MccEntry[];
  rates: CommissionRates;
  evidence?: RateEvidenceMap;
};

const tiers: CommissionTier[] = ["0-7k", "7-15k", "15-30k", "30-50k", "50-100k", "100-200k", "200k+"];

function rateMap(values: Partial<Record<CommissionTier, Partial<Record<ProposalPricing, number>>>> = {}): CommissionRates {
  return Object.fromEntries(tiers.map(tier => [tier, {
    "mais-agressiva": values[tier]?.["mais-agressiva"] ?? 0,
    agressiva: values[tier]?.agressiva ?? 0,
    "menos-agressiva": values[tier]?.["menos-agressiva"] ?? 0,
  }])) as CommissionRates;
}

function evidenceMap(values: Array<[CommissionTier, ProposalPricing, RateEvidence, string]>): RateEvidenceMap {
  return Object.fromEntries(values.map(([tier, proposal, status, source]) => [`${tier}:${proposal}`, { status, source }])) as RateEvidenceMap;
}

export const MCC_CATALOG: CatalogSegment[] = [
  {
    id: "alimentacao-restaurantes",
    label: "Alimentação, restaurantes e bares",
    correlation: "Agressiva correlacionada por Cerva e Cia e Adega V. Charlei; menos agressiva confirmada por Jocarvas Restaurante.",
    entries: [
      { mcc: "5812", activity: "Restaurantes e similares", cnaes: ["5611-2/01", "5611-2/03"] },
      { mcc: "5814", activity: "Fast food e lanchonetes", cnaes: ["5611-2/04"] },
      { mcc: "5813", activity: "Bares, discotecas e pubs", cnaes: ["5611-2/02", "5611-2/05"] },
    ],
    rates: rateMap({ "15-30k": { agressiva: 85 }, "30-50k": { agressiva: 125, "menos-agressiva": 235 }, "50-100k": { "menos-agressiva": 310 } }),
    evidence: evidenceMap([["15-30k", "agressiva", "correlacao", "Cerva e Cia / Adega V. Charlei"], ["30-50k", "agressiva", "correlacao", "Adega V. Charlei"], ["30-50k", "menos-agressiva", "confirmada", "Jocarvas Restaurante"], ["50-100k", "menos-agressiva", "confirmada", "Jocarvas Restaurante"]]),
  },
  {
    id: "supermercados",
    label: "Supermercados e mercearias",
    correlation: "Valores agressivos confirmados por Nakaza Supermercado.",
    entries: [{ mcc: "5411", activity: "Supermercados e mercearias", cnaes: ["4711-3/01", "4711-3/02"] }],
    rates: rateMap({ "50-100k": { agressiva: 225 }, "100-200k": { agressiva: 800 } }),
    evidence: evidenceMap([["50-100k", "agressiva", "confirmada", "Nakaza Supermercado"], ["100-200k", "agressiva", "confirmada", "Nakaza Supermercado"]]),
  },
  {
    id: "padarias",
    label: "Padarias e confeitarias",
    correlation: "Correlacionado ao grupo de alimentação; ajuste conforme seu card quando houver evidência própria.",
    entries: [{ mcc: "5462", activity: "Padarias e confeitarias", cnaes: ["1091-1/02", "4721-1/02"] }],
    rates: rateMap({ "15-30k": { agressiva: 85 }, "30-50k": { agressiva: 125, "menos-agressiva": 235 }, "50-100k": { "menos-agressiva": 310 } }),
    evidence: evidenceMap([["15-30k", "agressiva", "correlacao", "Grupo de alimentação"], ["30-50k", "agressiva", "correlacao", "Grupo de alimentação"], ["30-50k", "menos-agressiva", "correlacao", "Jocarvas Restaurante"], ["50-100k", "menos-agressiva", "correlacao", "Jocarvas Restaurante"]]),
  },
  {
    id: "varejo-especializado",
    label: "Vestuário e varejo especializado",
    correlation: "Agressiva de 50–100k confirmada por Diver Kids; demais faixas permanecem editáveis.",
    entries: [
      { mcc: "5651", activity: "Vestuário", cnaes: ["4781-4/00"] },
      { mcc: "5661", activity: "Lojas de sapatos e calçados", cnaes: ["4782-2/01"] },
      { mcc: "5944", activity: "Joalherias, relojoarias e bijuterias", cnaes: ["4783-0/01", "4783-0/02"] },
    ],
    rates: rateMap({ "50-100k": { agressiva: 265 } }),
    evidence: evidenceMap([["50-100k", "agressiva", "confirmada", "Diver Kids"]]),
  },
  {
    id: "saude-beleza-bem-estar",
    label: "Saúde, beleza e bem-estar",
    correlation: "Sem card equivalente confirmado; deixe a alíquota configurável pelo agente.",
    entries: [
      { mcc: "5912", activity: "Farmácias e drogarias", cnaes: ["4771-7/01"] },
      { mcc: "7230", activity: "Salões de beleza e barbearias", cnaes: ["9602-5/01", "9602-5/02"] },
      { mcc: "8011", activity: "Médicos e clínicas médicas", cnaes: ["8630-5/01", "8630-5/02"] },
      { mcc: "8021", activity: "Dentistas e clínicas odontológicas", cnaes: ["8630-5/04"] },
      { mcc: "7991", activity: "Academias e clubes esportivos", cnaes: ["9313-1/00"] },
    ],
    rates: rateMap(),
  },
  {
    id: "servicos-automotivos",
    label: "Oficinas e serviços automotivos",
    correlation: "Agressiva de 100–200k confirmada por Oficina Dragster e Bira Centro Automotivo.",
    entries: [
      { mcc: "7538", activity: "Oficinas mecânicas e serviços automotivos", cnaes: ["4520-0/01"] },
      { mcc: "5541", activity: "Postos de combustível", cnaes: ["4731-8/00"] },
    ],
    rates: rateMap({ "100-200k": { agressiva: 1080 } }),
    evidence: evidenceMap([["100-200k", "agressiva", "confirmada", "Oficina Dragster / Bira Centro Automotivo"]]),
  },
  {
    id: "autopecas",
    label: "Autopeças e acessórios",
    correlation: "Agressiva de 50–100k confirmada por E C Leão Lubrificantes e Acessórios; correlacionada a oficina mecânica.",
    entries: [{ mcc: "5533", activity: "Autopeças e acessórios", cnaes: ["4530-7/03", "4530-7/04"] }],
    rates: rateMap({ "50-100k": { agressiva: 300 } }),
    evidence: evidenceMap([["50-100k", "agressiva", "confirmada", "E C Leão Lubrificantes e Acessórios"]]),
  },
  {
    id: "motos",
    label: "Motos e acessórios",
    correlation: "Valores agressivos confirmados por Mário Motos.",
    entries: [{ mcc: "5571", activity: "Motos e acessórios", cnaes: ["4541-2/03"] }],
    rates: rateMap({ "15-30k": { agressiva: 115 }, "30-50k": { agressiva: 230 } }),
    evidence: evidenceMap([["15-30k", "agressiva", "confirmada", "Mário Motos"], ["30-50k", "agressiva", "confirmada", "Mário Motos"]]),
  },
  {
    id: "combustiveis-lubrificantes",
    label: "Combustíveis e lubrificantes",
    correlation: "Agressiva de 100–200k confirmada por Celius Lubrificantes.",
    entries: [{ mcc: "5983", activity: "Combustíveis e lubrificantes", cnaes: ["4732-6/00"] }],
    rates: rateMap({ "100-200k": { agressiva: 800 } }),
    evidence: evidenceMap([["100-200k", "agressiva", "confirmada", "Celius Lubrificantes"]]),
  },
  {
    id: "adegas-bebidas",
    label: "Adegas, bebidas e conveniência",
    correlation: "Valores agressivos confirmados por Cerva e Cia e Adega V. Charlei; correlacionado a bares e alimentação leve.",
    entries: [{ mcc: "5921", activity: "Lojas de bebidas e adegas", cnaes: ["4723-7/00"] }],
    rates: rateMap({ "15-30k": { agressiva: 85 }, "30-50k": { agressiva: 125 } }),
    evidence: evidenceMap([["15-30k", "agressiva", "confirmada", "Cerva e Cia"], ["30-50k", "agressiva", "confirmada", "Adega V. Charlei"]]),
  },
  {
    id: "revestimentos-construcao",
    label: "Revestimentos, marmoraria e construção",
    correlation: "Agressiva de 100–200k confirmada por Pedras Tucuruvi; usada como correlação para marmoraria e materiais de construção.",
    entries: [{ mcc: "5099", activity: "Revestimentos e materiais de construção", cnaes: ["4744-0/05", "2391-5/03"] }],
    rates: rateMap({ "100-200k": { agressiva: 935 } }),
    evidence: evidenceMap([["100-200k", "agressiva", "confirmada", "Pedras Tucuruvi Revestimentos"]]),
  },
  {
    id: "industrial-b2b",
    label: "Inox, suprimentos e B2B industrial",
    correlation: "Agressiva de 7–15k confirmada por Porto Inox.",
    entries: [{ mcc: "5021", activity: "Suprimentos e materiais B2B", cnaes: ["4669-9/99"] }],
    rates: rateMap({ "7-15k": { agressiva: 80 } }),
    evidence: evidenceMap([["7-15k", "agressiva", "confirmada", "Porto Inox"]]),
  },
  {
    id: "servicos-profissionais",
    label: "Serviços profissionais",
    correlation: "Sem card equivalente confirmado; edição manual necessária.",
    entries: [
      { mcc: "8999", activity: "Serviços profissionais e consultoria", cnaes: ["7020-4/00", "7490-9/99"] },
      { mcc: "8111", activity: "Serviços jurídicos e advocacia", cnaes: ["6911-7/01"] },
      { mcc: "8931", activity: "Serviços de contabilidade", cnaes: ["6920-6/01"] },
    ],
    rates: rateMap(),
  },
  {
    id: "hospedagem-turismo",
    label: "Hospedagem e turismo",
    correlation: "Sem card equivalente confirmado; edição manual necessária.",
    entries: [
      { mcc: "7011", activity: "Hotéis, motéis e pousadas", cnaes: ["5510-8/01"] },
      { mcc: "4722", activity: "Agências de viagens e turismo", cnaes: ["7911-2/00"] },
    ],
    rates: rateMap(),
  },
  {
    id: "varejo-variedades",
    label: "Pet, variedades e artigos especializados",
    correlation: "Menos agressiva de 30–50k confirmada por Pet Center Mundo Animal e amikao.",
    entries: [{ mcc: "5995", activity: "Varejo variado e artigos especializados", cnaes: ["4789-0/99"] }],
    rates: rateMap({ "30-50k": { "menos-agressiva": 275 } }),
    evidence: evidenceMap([["30-50k", "menos-agressiva", "confirmada", "Pet Center Mundo Animal / amikao"]]),
  },
];

export const MCC_ENTRIES = MCC_CATALOG.flatMap(segment => segment.entries.map(entry => ({ ...entry, segmentId: segment.id, segmentLabel: segment.label, correlation: segment.correlation })));

export const MCC_CATALOG_WITH_RATES = MCC_CATALOG.filter(segment => Object.values(segment.rates).some(proposals => Object.values(proposals).some(rate => rate > 0)));

export const PRELOADED_MCC_ENTRIES = MCC_CATALOG_WITH_RATES.flatMap(segment => segment.entries.map(entry => ({ ...entry, segmentId: segment.id, segmentLabel: segment.label, correlation: segment.correlation })));

export function findMccEntry(mcc: string) {
  return MCC_ENTRIES.find(entry => entry.mcc === mcc);
}

export function findCnaeEntry(cnae: string) {
  const normalized = cnae.replace(/\D/g, "");
  return MCC_ENTRIES.find(entry => entry.cnaes.some(item => item.replace(/\D/g, "") === normalized));
}
