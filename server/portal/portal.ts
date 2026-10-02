import type { Express, Request, Response } from "express";
import { sql } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import { parse as parseCookie } from "cookie";
import { getDb } from "../db";
import { createPassword, verifyPassword, normalizedEmail } from "../credentials";
import { ENV } from "../_core/env";
import { portalHtml, portalJs } from "./page";

const COOKIE = "portal_session";
const POLO = "vila-medeiros";

// Equipe do polo Vila Medeiros. Senha provisoria = primeiro nome + 1 (troca obrigatoria no primeiro acesso).
export const PORTAL_SEED = [
  { email: "talitha.machado@stone.com.br", name: "Talitha Machado", role: "owner", pw: "Talitha1" },
  { email: "gabriel.fmarcantonio@stone.com.br", name: "Gabriel Fiorati", role: "agent", pw: "Gabriel1" },
  { email: "lucas.aquino@stone.com.br", name: "Lucas Aquino", role: "agent", pw: "Lucas1" },
  { email: "afonso.martins@stone.com.br", name: "Afonso Martins", role: "agent", pw: "Afonso1" },
  { email: "luiz.manzatto@stone.com.br", name: "Luiz Fernando Manzatto", role: "agent", pw: "Luiz1" },
  { email: "kaike.rodrigues@stone.com.br", name: "Kaike Rodrigues", role: "agent", pw: "Kaike1" },
  { email: "maurilio.dantas@stone.com.br", name: "Maurílio Dantas", role: "agent", pw: "Maurilio1" },
  { email: "nathan.ferreira@stone.com.br", name: "Nathan Ferreira", role: "agent", pw: "Nathan1" },
  { email: "rodrigo.vizoki@stone.com.br", name: "Rodrigo Vizoki", role: "agent", pw: "Rodrigo1" },
];

async function q(query: any): Promise<any[]> {
  const db = await getDb();
  const r: any = await (db as any).execute(query);
  return Array.isArray(r) && Array.isArray(r[0]) ? r[0] : Array.isArray(r) ? r : (r?.rows ?? []);
}

let ready: Promise<void> | null = null;
export function ensurePortalSchema() {
  if (!ready) ready = (async () => {
    await q(sql`CREATE TABLE IF NOT EXISTS portal_users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(190) NOT NULL UNIQUE,
      name VARCHAR(160) NOT NULL,
      role VARCHAR(24) NOT NULL,
      polo VARCHAR(64) NOT NULL,
      pass_hash VARCHAR(256) NOT NULL,
      pass_salt VARCHAR(128) NOT NULL,
      must_change TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await q(sql`CREATE TABLE IF NOT EXISTS portal_data (
      user_id INT NOT NULL,
      tab VARCHAR(64) NOT NULL,
      content LONGTEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, tab)
    )`);
    for (const u of PORTAL_SEED) {
      const ex = await q(sql`SELECT id FROM portal_users WHERE email = ${u.email}`);
      if (ex.length) continue;
      const p = await createPassword(u.pw);
      await q(sql`INSERT INTO portal_users (email,name,role,polo,pass_hash,pass_salt,must_change) VALUES (${u.email},${u.name},${u.role},${POLO},${p.passwordHash},${p.passwordSalt},1)`);
    }
  })();
  return ready;
}

function secret() { return new TextEncoder().encode(ENV.cookieSecret); }

async function currentUser(req: Request) {
  const tok = parseCookie(req.headers.cookie ?? "")[COOKIE];
  if (!tok) return null;
  try {
    const { payload } = await jwtVerify(tok, secret(), { algorithms: ["HS256"] });
    const rows = await q(sql`SELECT id,email,name,role,polo,must_change FROM portal_users WHERE id = ${Number(payload.uid)}`);
    return rows[0] ?? null;
  } catch { return null; }
}

const attempts = new Map<string, { n: number; t: number }>();
function throttled(key: string) {
  const now = Date.now();
  const a = attempts.get(key);
  if (!a || now - a.t > 15 * 60_000) { attempts.set(key, { n: 1, t: now }); return false; }
  a.n++;
  return a.n > 10;
}

const pub = (u: any) => ({ id: u.id, email: u.email, name: u.name, role: u.role, polo: u.polo, mustChange: !!u.must_change });

export function registerPortal(app: Express) {
  app.get("/", (_req, res) => res.redirect(302, "/portal"));
  app.get("/portal", (_req, res) => { res.set("Cache-Control", "no-store"); res.type("html").send(portalHtml); });

  app.get("/portal/app.js", (_req, res) => { res.set("Cache-Control", "no-store"); res.type("application/javascript").send(portalJs); });

  app.post("/api/portal/login", async (req: Request, res: Response) => {
    try {
      await ensurePortalSchema();
      const email = normalizedEmail(String(req.body?.email ?? ""));
      const password = String(req.body?.password ?? "");
      if (throttled(`${req.ip}|${email}`)) return res.status(429).json({ error: "Muitas tentativas. Aguarde alguns minutos." });
      const rows = await q(sql`SELECT * FROM portal_users WHERE email = ${email}`);
      const u = rows[0];
      if (!u || !(await verifyPassword(password, u.pass_salt, u.pass_hash))) return res.status(401).json({ error: "E-mail ou senha incorretos." });
      const token = await new SignJWT({ uid: u.id }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(secret());
      res.cookie(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 7 * 864e5, path: "/" });
      res.json({ user: pub(u) });
    } catch (e) { console.error(e); res.status(500).json({ error: "Erro interno." }); }
  });

  app.post("/api/portal/logout", (_req, res) => { res.clearCookie(COOKIE, { path: "/" }); res.json({ ok: true }); });

  app.get("/api/portal/me", async (req, res) => {
    const u = await currentUser(req);
    if (!u) return res.status(401).json({ error: "Faça login." });
    res.json({ user: pub(u) });
  });

  app.post("/api/portal/change-password", async (req, res) => {
    const u = await currentUser(req);
    if (!u) return res.status(401).json({ error: "Faça login." });
    const cur = String(req.body?.current ?? ""), next = String(req.body?.next ?? "");
    const full = (await q(sql`SELECT * FROM portal_users WHERE id=${u.id}`))[0];
    if (!(await verifyPassword(cur, full.pass_salt, full.pass_hash))) return res.status(400).json({ error: "Senha atual incorreta." });
    if (next.length < 8 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) return res.status(400).json({ error: "A nova senha precisa ter 8 ou mais caracteres, com letras e números." });
    if (next === cur) return res.status(400).json({ error: "Escolha uma senha diferente da atual." });
    const p = await createPassword(next);
    await q(sql`UPDATE portal_users SET pass_hash=${p.passwordHash}, pass_salt=${p.passwordSalt}, must_change=0 WHERE id=${u.id}`);
    res.json({ ok: true });
  });

  // Lista de pessoas visiveis: agente ve so a si; dona do polo ve todos do polo.
  app.get("/api/portal/people", async (req, res) => {
    const u = await currentUser(req);
    if (!u || u.must_change) return res.status(401).json({ error: "Faça login e troque a senha." });
    if (u.role === "owner") return res.json({ people: (await q(sql`SELECT id,name,email,role FROM portal_users WHERE polo=${u.polo} ORDER BY role='owner' DESC, name`)).map((r: any) => ({ id: r.id, name: r.name, email: r.email, role: r.role })) });
    res.json({ people: [{ id: u.id, name: u.name, email: u.email, role: u.role }] });
  });

  app.get("/api/portal/data/:userId", async (req, res) => {
    const u = await currentUser(req);
    if (!u || u.must_change) return res.status(401).json({ error: "Faça login e troque a senha." });
    const target = Number(req.params.userId);
    let allowed = target === u.id;
    if (!allowed && u.role === "owner") allowed = (await q(sql`SELECT id FROM portal_users WHERE id=${target} AND polo=${u.polo}`)).length > 0;
    if (!allowed) return res.status(403).json({ error: "Sem permissão." });
    const rows = await q(sql`SELECT tab, content, updated_at FROM portal_data WHERE user_id=${target}`);
    const abas = rows.map((r: any) => ({ aba: r.tab, linhas: JSON.parse(r.content), atualizado: r.updated_at }));
    res.json({ abas });
  });

  // Importacao do pacote PSV/RMR (dados ficam so no banco). Somente dona do polo, e so antes do primeiro acesso dela (senha provisoria ainda ativa).
  app.post("/api/portal/import", async (req, res) => {
    const u = await currentUser(req);
    if (!u || u.role !== "owner" || !u.must_change) return res.status(403).json({ error: "Importação indisponível." });
    const agentes = req.body?.agentes;
    if (!Array.isArray(agentes)) return res.status(400).json({ error: "Formato inválido." });
    const out: string[] = [];
    for (const a of agentes) {
      const resumo = (a.abas ?? []).find((x: any) => x.aba === "Resumo");
      const row = (resumo?.linhas ?? []).find((l: any[]) => String(l[0]).trim().toLowerCase().startsWith("e-mail"));
      const email = row ? normalizedEmail(String(row[1])) : "";
      const pu = (await q(sql`SELECT id FROM portal_users WHERE email=${email} AND polo=${u.polo}`))[0];
      if (!pu) { out.push(`ignorado: ${email || "sem e-mail"}`); continue; }
      for (const t of a.abas) {
        const content = JSON.stringify(t.linhas);
        await q(sql`INSERT INTO portal_data (user_id,tab,content) VALUES (${pu.id},${t.aba},${content}) ON DUPLICATE KEY UPDATE content=VALUES(content)`);
      }
      out.push(`ok: ${email} (${a.abas.length} abas)`);
    }
    res.json({ result: out });
  });

  const authed = async (req: Request, res: Response) => {
    const u = await currentUser(req);
    if (!u || u.must_change) { res.status(401).json({ error: "Faça login e troque a senha." }); return null; }
    return u;
  };
  // Clientes: so os credenciados sob o e-mail do proprio agente (derivados das abas da planilha dele na primeira abertura).
  const SEED_TABS: Record<string, string> = { "Onboarding": "Onboarding", "Ativação": "Ativação", "Coorte agosto": "Coorte agosto" };
  async function seedClients(userId: number) {
    const flag = await q(sql`SELECT 1 FROM portal_data WHERE user_id=${userId} AND tab='_clientes_seeded'`);
    if (flag.length) return;
    await q(sql`CREATE TABLE IF NOT EXISTS portal_clients (
      id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, name VARCHAR(200) NOT NULL, tpv VARCHAR(40) NOT NULL DEFAULT '',
      credenc VARCHAR(40) NOT NULL DEFAULT '', origem VARCHAR(60) NOT NULL DEFAULT '', obs TEXT, INDEX(user_id))`);
    const tabs = await q(sql`SELECT tab, content FROM portal_data WHERE user_id=${userId}`);
    for (const t of tabs) {
      if (!SEED_TABS[t.tab]) continue;
      const rows: any[][] = JSON.parse(t.content);
      const head = (rows[0] ?? []).map((h: any) => String(h).toLowerCase());
      const ic = head.findIndex((h: string) => h.startsWith("cliente"));
      if (ic < 0) continue;
      const it = head.findIndex((h: string) => h.startsWith("tpv")), id = head.findIndex((h: string) => h.startsWith("credenc"));
      for (const r of rows.slice(1)) {
        const name = String(r[ic] ?? "").trim();
        if (!name) continue;
        await q(sql`INSERT INTO portal_clients (user_id,name,tpv,credenc,origem,obs) VALUES (${userId},${name},${String(r[it] ?? "")},${String(r[id] ?? "")},${t.tab},'')`);
      }
    }
    await q(sql`INSERT INTO portal_data (user_id,tab,content) VALUES (${userId},'_clientes_seeded','1') ON DUPLICATE KEY UPDATE content='1'`);
  }
  async function canSee(u: any, target: number) {
    if (target === u.id) return true;
    return u.role === "owner" && (await q(sql`SELECT id FROM portal_users WHERE id=${target} AND polo=${u.polo}`)).length > 0;
  }
  app.get("/api/portal/clients/:userId", async (req, res) => {
    const u = await authed(req, res); if (!u) return;
    const target = Number(req.params.userId);
    if (!(await canSee(u, target))) return res.status(403).json({ error: "Sem permissão." });
    await seedClients(target);
    const rows = await q(sql`SELECT id,name,tpv,credenc,origem,obs FROM portal_clients WHERE user_id=${target} ORDER BY name`);
    res.json({ clients: rows });
  });
  app.post("/api/portal/clients/:userId", async (req, res) => {
    const u = await authed(req, res); if (!u) return;
    const target = Number(req.params.userId);
    if (!(await canSee(u, target))) return res.status(403).json({ error: "Sem permissão." });
    await seedClients(target);
    const name = String(req.body?.name ?? "").trim().slice(0, 200);
    if (!name) return res.status(400).json({ error: "Informe o nome do cliente." });
    const f = (k: string, n: number) => String(req.body?.[k] ?? "").slice(0, n);
    await q(sql`INSERT INTO portal_clients (user_id,name,tpv,credenc,origem,obs) VALUES (${target},${name},${f("tpv", 40)},${f("credenc", 40)},'Manual',${f("obs", 2000)})`);
    res.json({ ok: true });
  });
  app.delete("/api/portal/clients/:userId/:id", async (req, res) => {
    const u = await authed(req, res); if (!u) return;
    const target = Number(req.params.userId);
    if (!(await canSee(u, target))) return res.status(403).json({ error: "Sem permissão." });
    await q(sql`DELETE FROM portal_clients WHERE id=${Number(req.params.id)} AND user_id=${target}`);
    res.json({ ok: true });
  });

  ensurePortalSchema().catch(e => console.error("portal schema", e));
}
