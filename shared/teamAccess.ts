export type TeamLeadershipRole = "none" | "polo" | "distrital";
export type TeamMemberRole = "agente" | "interino" | "polo" | "distrital" | "agendamento" | "assistente" | "auxiliar";

export type TeamAccessIdentity = {
  id: number;
  role: "user" | "admin";
  leadershipRole: TeamLeadershipRole;
  regional: string | null;
  district: string | null;
  polo: string | null;
  teamRoles?: TeamMemberRole[];
};

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

export function canAccessTeamMember(actor: TeamAccessIdentity, target: TeamAccessIdentity) {
  if (actor.role === "admin") return true;
  if (actor.id === target.id) return true;
  const roles = actor.teamRoles ?? [];
  const poloScopeRoles = ["polo", "interino", "agendamento", "assistente", "auxiliar"] as const;
  const isPoloScopeLeader = actor.leadershipRole === "polo" || poloScopeRoles.some(role => roles.includes(role));
  if (actor.leadershipRole === "polo" || poloScopeRoles.some(role => roles.includes(role))) {
    return isPoloScopeLeader && normalize(actor.polo) === normalize(target.polo);
  }
  if (actor.leadershipRole === "distrital" || roles.includes("distrital")) {
    return normalize(actor.district) === normalize(target.district);
  }
  return false;
}

export function canEditTeamProfile(actor: TeamAccessIdentity, target: TeamAccessIdentity) {
  const delegatedLeadership = (actor.teamRoles ?? []).some(role => ["polo", "distrital", "interino", "agendamento", "assistente", "auxiliar"].includes(role));
  return canAccessTeamMember(actor, target) && (actor.role === "admin" || actor.id === target.id || actor.leadershipRole !== "none" || delegatedLeadership);
}
