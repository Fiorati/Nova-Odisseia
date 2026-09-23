import { VIEW_AS_HEADER, VIEW_AS_STORAGE_KEY } from "@shared/viewAs";

export function getViewAsUserId(): string | null {
  if (typeof window === "undefined") return null;
  try { return window.sessionStorage.getItem(VIEW_AS_STORAGE_KEY); } catch { return null; }
}

export function setViewAsUserId(id: number | null) {
  if (typeof window === "undefined") return;
  try {
    if (id) window.sessionStorage.setItem(VIEW_AS_STORAGE_KEY, String(id));
    else window.sessionStorage.removeItem(VIEW_AS_STORAGE_KEY);
  } catch {
    // sessionStorage indisponível: segue na conta real.
  }
}

export function viewAsHeaders(): Record<string, string> {
  const id = getViewAsUserId();
  return id ? { [VIEW_AS_HEADER]: id } : {};
}
