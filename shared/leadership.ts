export const LEADER_NAMES = [
  "Mateus Cespon", "Eloá Saleira", "Gabriel Santos", "Gabriela Souza", "Jéssica Burmas",
  "João Dante", "Júlia Gazal", "Lucas", "Letícia Oliveira", "Raíssa Santos", "Ana Ester",
] as const;

export function normalizeLeaderName(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
}

export function isEligibleLeader(name: string) {
  const normalized = normalizeLeaderName(name);
  return LEADER_NAMES.some((leader) => normalizeLeaderName(leader) === normalized);
}
