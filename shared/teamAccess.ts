export type TeamLeadershipRole = "none" | "polo" | "interino" | "distrital" | "sdr";

export type TeamAccessIdentity = {
  id: number;
  role: "user" | "admin";
  leadershipRole: TeamLeadershipRole;
  regional: string | null;
  district: string | null;
  polo: string | null;
};

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

export function canAccessTeamMember(actor: TeamAccessIdentity, target: TeamAccessIdentity) {
  if (actor.role === "admin") return true;
  if (actor.id === target.id) return true;
  if (actor.leadershipRole === "polo" || actor.leadershipRole === "interino") {
    return target.leadershipRole === "none" && normalize(actor.polo) === normalize(target.polo);
  }
  if (actor.leadershipRole === "distrital") {
    return target.leadershipRole !== "none" && normalize(actor.district) === normalize(target.district);
  }
  return false;
}

export function canEditTeamProfile(actor: TeamAccessIdentity, target: TeamAccessIdentity) {
  return canAccessTeamMember(actor, target) && (actor.role === "admin" || actor.id === target.id || actor.leadershipRole !== "none");
}
