import { describe, expect, it } from "vitest";
import { tioPatinhasAlias } from "../shared/tioPatinhas";

describe("Tio Patinhas", () => {
  it("atribui arquétipos estáveis sem usar dados pessoais", () => {
    expect(tioPatinhasAlias(0)).toBe("Tio Patinhas");
    expect(tioPatinhasAlias(1)).toBe("Rei Midas");
    expect(tioPatinhasAlias(8)).toBe("Tio Patinhas");
  });
});
