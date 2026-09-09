import { describe, expect, it } from "vitest";
import { isListIntelligentView, LIST_INTELLIGENT_VIEW } from "../shared/listIntelligentNavigation";

describe("Lista Inteligente — navegação", () => {
  it("reconhece exclusivamente a rota dedicada", () => {
    expect(isListIntelligentView(LIST_INTELLIGENT_VIEW)).toBe(true);
    expect(isListIntelligentView("carteiras")).toBe(false);
    expect(isListIntelligentView("super-pipe")).toBe(false);
  });
});
