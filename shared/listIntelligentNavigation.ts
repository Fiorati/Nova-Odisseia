export const LIST_INTELLIGENT_VIEW = "lista-inteligente" as const;

export function isListIntelligentView(view: string) {
  return view === LIST_INTELLIGENT_VIEW;
}
