export const TIO_PATINHAS_ARCHETYPES = [
  "Tio Patinhas",
  "Rei Midas",
  "Navegador de Ouro",
  "Comandante do Cofre",
  "Caçador de Tesouros",
  "Lorde das Metas",
  "Capitã da Rota",
  "Mestre do TPV",
] as const;

export function tioPatinhasAlias(position: number) {
  return TIO_PATINHAS_ARCHETYPES[Math.max(0, position) % TIO_PATINHAS_ARCHETYPES.length] ?? "Tio Patinhas";
}
