export const VIEW_AS_HEADER = "x-view-as-user";
export const VIEW_AS_STORAGE_KEY = "nova-odisseia:view-as-user";
export const VIEW_AS_READ_ONLY_MSG = "Modo \"ver como usuário\" é somente leitura. Volte para sua conta para salvar alterações.";

type MinimalUser = { id: number; role: string };

export function parseViewAsHeader(value: unknown): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string" || !/^\d{1,10}$/.test(raw.trim())) return null;
  const id = Number(raw.trim());
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/**
 * Só um admin autenticado pode ver a plataforma como outro usuário.
 * Para qualquer outro caso o cabeçalho é ignorado e a sessão real é mantida.
 */
export async function resolveViewAs<U extends MinimalUser>(
  realUser: U | null,
  headerValue: unknown,
  loadUser: (id: number) => Promise<U | null>,
): Promise<{ user: U | null; viewer: U | null }> {
  if (!realUser || realUser.role !== "admin") return { user: realUser, viewer: null };
  const targetId = parseViewAsHeader(headerValue);
  if (!targetId || targetId === realUser.id) return { user: realUser, viewer: null };
  const target = await loadUser(targetId);
  if (!target) return { user: realUser, viewer: null };
  return { user: target, viewer: realUser };
}

export function isMutationAllowedWhileViewing(path: string): boolean {
  return path === "auth.logout";
}
