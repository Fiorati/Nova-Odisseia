export const REGIONAL_OPTIONS = [
  "Regional Sul",
  "Regional SP",
  "Regional Norte",
] as const;

export const DISTRICT_OPTIONS = [
  "Distrito SP Norte",
  "Distrito SP Sul",
  "Distrito SP Leste",
  "Distrito SP Oeste",
  "Distrito CIA",
  "Distrito ABC",
  "Distrito LP",
] as const;

export const POLO_OPTIONS = [
  "Polo Vila Medeiros",
  "Polo Barra Funda",
  "Polo Jaraguá",
  "Polo Lapa",
  "Polo Bela Vista",
  "Polo Guarulhos 1 – Leste",
  "Polo Guarulhos 2 – Oeste",
  "Polo Guarulhos Centro",
  "Polo Santana",
] as const;

export const OTHER_OPTION = "Outros";

export function isKnownOrganizationOption(value: string, options: readonly string[]) {
  return !value || options.includes(value);
}

export type OrganizationFilter = { regional?: string; district?: string; polo?: string };
export type OrganizationProfile = { regional: string | null; district: string | null; polo: string | null };

export function normalizeOrganizationKey(value: string | null | undefined) {
  return (value ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, " ").trim();
}

export function matchesOrganizationFilter(profile: OrganizationProfile, filters: OrganizationFilter) {
  const matches = (value: string | null, filter?: string) => !filter || filter === "all" || normalizeOrganizationKey(value) === normalizeOrganizationKey(filter);
  return matches(profile.regional, filters.regional) && matches(profile.district, filters.district) && matches(profile.polo, filters.polo);
}

export type OrganizationValues = { regional: string; district: string; polo: string; route: string };

export function prepareOrganizationValues(input: OrganizationValues): OrganizationValues {
  return {
    regional: input.regional.trim(),
    district: input.district.trim(),
    polo: input.polo.trim(),
    route: input.route.trim(),
  };
}

export function readOrganizationValues(profile: Partial<OrganizationValues> | null | undefined): OrganizationValues {
  return {
    regional: profile?.regional ?? "",
    district: profile?.district ?? "",
    polo: profile?.polo ?? "",
    route: profile?.route ?? "",
  };
}
