import { describe, expect, it, vi } from "vitest";

vi.mock("drizzle-orm/mysql2", () => ({ drizzle: () => ({}) }));
import { ensureNewsArticlesSchema } from "./db";

const text = (q: any) => JSON.stringify(q?.queryChunks ?? q);

describe("Arauto: coluna pinned em news_articles", () => {
  it("cria a tabela com pinned e adiciona a coluna em bancos antigos, uma vez por processo", async () => {
    const calls: string[] = [];
    const db = { execute: vi.fn(async (q: any) => { calls.push(text(q)); return []; }) };
    await ensureNewsArticlesSchema(db);
    await ensureNewsArticlesSchema(db);
    expect(db.execute).toHaveBeenCalledTimes(2);
    expect(calls[0]).toContain("pinned boolean NOT NULL DEFAULT false");
    expect(calls[1]).toContain("ALTER TABLE news_articles ADD COLUMN pinned");
  });
  it("ignora 'Duplicate column' (banco já migrado) e repete a tentativa depois de outro erro", async () => {
    vi.resetModules();
    const fresh = await import("./db");
    const dup = { execute: vi.fn(async (q: any) => { if (text(q).includes("ALTER")) throw new Error("Duplicate column name 'pinned'"); return []; }) };
    await expect(fresh.ensureNewsArticlesSchema(dup)).resolves.toBeUndefined();
    vi.resetModules();
    const again = await import("./db");
    let fail = true;
    const flaky = { execute: vi.fn(async () => { if (fail) { fail = false; throw new Error("connection lost"); } return []; }) };
    await expect(again.ensureNewsArticlesSchema(flaky)).rejects.toThrow("connection lost");
    await expect(again.ensureNewsArticlesSchema(flaky)).resolves.toBeUndefined();
  });
});
