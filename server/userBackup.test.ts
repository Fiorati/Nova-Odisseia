import { describe, expect, it } from "vitest";
import { __test } from "./userBackup";

describe("backup individual", () => {
  const sections = [{ title: "Metas", rows: [{ monthKey: "2026-09", notes: "<privado>" }] }];
  it("gera TXT legível com os dados do usuário", () => {
    const text = __test.renderText("Gabriel", "2026-09-20T00:00:00.000Z", sections);
    expect(text).toContain("BACKUP DA MINHA ODISSEIA");
    expect(text).toContain("monthKey: 2026-09");
  });
  it("escapa HTML fornecido pelo usuário", () => {
    const html = __test.renderHtml("Gabriel", "2026-09-20T00:00:00.000Z", sections);
    expect(html).toContain("&lt;privado&gt;");
    expect(html).not.toContain("<privado>");
  });
});

it("does not require columns from unapplied production migrations", async () => {
  const source = await import("node:fs/promises").then(fs => fs.readFile(new URL("./userBackup.ts", import.meta.url), "utf8"));
  expect(source).not.toMatch(/preparedPortfolioIdsJson:\s*psvWeeklyRituals\.preparedPortfolioIdsJson/);
  expect(source).not.toMatch(/pinned:\s*newsArticles\.pinned/);
});
