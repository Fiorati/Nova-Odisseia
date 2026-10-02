import type { Express, Request, Response } from "express";
import { sql } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import { parse as parseCookie } from "cookie";
import { getDb } from "../db";
import { createPassword, verifyPassword, normalizedEmail } from "../credentials";
import { randomBytes, randomInt, createHash, createHmac, timingSafeEqual } from "node:crypto";
import { ENV } from "../_core/env";
import { portalHtml, portalJs } from "./page";
import { PORTAL_ASSETS } from "./assets";

const COOKIE = "portal_session";
const POLO = "vila-medeiros";

// Equipe do polo Vila Medeiros. Sem senha no codigo: o primeiro acesso e por convite individual, unico e com validade (gerado pela dona do polo).
export const PORTAL_SEED = [
  { email: "talitha.machado@stone.com.br", name: "Talitha Machado", role: "owner" },
  { email: "gabriel.fmarcantonio@stone.com.br", name: "Gabriel Fiorati", role: "owner" },
  { email: "lucas.aquino@stone.com.br", name: "Lucas Aquino", role: "agent" },
  { email: "afonso.martins@stone.com.br", name: "Afonso Martins", role: "agent" },
  { email: "luiz.manzatto@stone.com.br", name: "Luiz Fernando Manzatto", role: "agent" },
  { email: "kaike.rodrigues@stone.com.br", name: "Kaike Rodrigues", role: "agent" },
  { email: "maurilio.dantas@stone.com.br", name: "Maurílio Dantas", role: "agent" },
  { email: "nathan.ferreira@stone.com.br", name: "Nathan Ferreira", role: "agent" },
  { email: "rodrigo.vizoki@stone.com.br", name: "Rodrigo Vizoki", role: "agent" },
  { email: "angelica.morais@stone.com.br", name: "Angélica Morais", role: "sdr" },
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
    const cols = (await q(sql`SHOW COLUMNS FROM portal_users`)).map((c: any) => c.Field);
    if (!cols.includes("invite_hash")) await q(sql`ALTER TABLE portal_users ADD COLUMN invite_hash VARCHAR(64) NULL, ADD COLUMN invite_exp BIGINT NULL`);
    if (!cols.includes("reset_hash")) await q(sql`ALTER TABLE portal_users ADD COLUMN reset_hash VARCHAR(64) NULL, ADD COLUMN reset_exp BIGINT NULL, ADD COLUMN reset_tries INT NOT NULL DEFAULT 0`);
    for (const u of PORTAL_SEED) {
      const ex = await q(sql`SELECT id FROM portal_users WHERE email = ${u.email}`);
      if (ex.length) continue;
      const p = await createPassword(randomBytes(32).toString("hex"));
      await q(sql`INSERT INTO portal_users (email,name,role,polo,pass_hash,pass_salt,must_change) VALUES (${u.email},${u.name},${u.role},${POLO},${p.passwordHash},${p.passwordSalt},1)`);
    }
    await q(sql`UPDATE portal_users SET role='owner' WHERE email=${"gabriel.fmarcantonio@stone.com.br"} AND role='agent'`);
    // Quem ainda nao definiu senha propria (must_change=1) nao pode ter senha previsivel: troca por segredo aleatorio ate o convite ser usado.
    for (const r of await q(sql`SELECT id FROM portal_users WHERE must_change=1 AND invite_hash IS NULL AND pass_hash NOT LIKE 'x%'`)) {
      const p = await createPassword(randomBytes(32).toString("hex"));
      await q(sql`UPDATE portal_users SET pass_hash=${"x" + p.passwordHash.slice(1)}, pass_salt=${p.passwordSalt} WHERE id=${r.id}`);
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
    const rows = await q(sql`SELECT id,email,name,role,polo,must_change,pass_salt FROM portal_users WHERE id = ${Number(payload.uid)}`);
    const r0 = rows[0];
    if (!r0 || payload.pv !== String(r0.pass_salt).slice(0, 12)) return null;
    return r0;
  } catch { return null; }
}

const attempts = new Map<string, { n: number; t: number }>();
setInterval(() => { const now = Date.now(); for (const [k, v] of Array.from(attempts)) if (now - v.t > 3600_000) attempts.delete(k); }, 10 * 60_000).unref();
function throttled(key: string) {
  const now = Date.now();
  const a = attempts.get(key);
  if (!a || now - a.t > 15 * 60_000) { attempts.set(key, { n: 1, t: now }); return false; }
  a.n++;
  return a.n > 10;
}

// IP real do cliente: ultimo valor de X-Forwarded-For (o que o proxy da hospedagem acrescenta); sem proxy, o IP da conexao.
function clientIp(req: Request) {
  const x = String(req.headers["x-forwarded-for"] ?? "").split(",").map(s => s.trim()).filter(Boolean);
  return x.length ? x[x.length - 1] : req.ip;
}
function throttledN(key: string, max: number, windowMs: number) {
  const now = Date.now(); const a = attempts.get(key);
  if (!a || now - a.t > windowMs) { attempts.set(key, { n: 1, t: now }); return false; }
  a.n++; return a.n > max;
}

const pub = (u: any) => ({ id: u.id, email: u.email, name: u.name, role: u.role, polo: u.polo, mustChange: !!u.must_change });

export function registerPortal(app: Express) {
  // Perfil SDR (agendamento): sem acesso a PSV, clientes, notas, itens, referencias nem dados de aba. So login, troca de senha e a propria sessao.
  app.use(["/api/portal/data", "/api/portal/clients", "/api/portal/items", "/api/portal/note", "/api/portal/psv", "/api/portal/ref"], async (req, res, next) => {
    const u = await currentUser(req);
    if (u && u.role === "sdr") return res.status(403).json({ error: "Sem permissão." });
    next();
  });
  app.use(["/portal", "/api/portal"], (_req, res, next) => { res.set({ "Referrer-Policy": "no-referrer", "X-Frame-Options": "DENY", "X-Content-Type-Options": "nosniff" }); next(); });
  app.get("/", (_req, res) => res.redirect(302, "/portal"));
  app.get("/portal", (_req, res) => { res.set("Cache-Control", "no-store"); res.type("html").send(portalHtml); });

  app.get("/portal/app.js", (_req, res) => { res.set("Cache-Control", "no-store"); res.type("application/javascript").send(portalJs); });

  app.post("/api/portal/login", async (req: Request, res: Response) => {
    try {
      await ensurePortalSchema();
      const email = normalizedEmail(String(req.body?.email ?? ""));
      const password = String(req.body?.password ?? "");
      if (throttled(`${clientIp(req)}|${email}`)) return res.status(429).json({ error: "Muitas tentativas. Aguarde alguns minutos." });
      const rows = await q(sql`SELECT * FROM portal_users WHERE email = ${email}`);
      const u = rows[0];
      if (!u || !(await verifyPassword(password, u.pass_salt, u.pass_hash))) return res.status(401).json({ error: "E-mail ou senha incorretos." });
      const token = await new SignJWT({ uid: u.id, pv: String(u.pass_salt).slice(0, 12) }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(secret());
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
    if (u.role === "owner") return res.json({ people: (await q(sql`SELECT id,name,email,role,must_change FROM portal_users WHERE polo=${u.polo} ORDER BY role='owner' DESC, name`)).map((r: any) => ({ id: r.id, name: r.name, email: r.email, role: r.role, pending: !!r.must_change })) });
    res.json({ people: [{ id: u.id, name: u.name, email: u.email, role: u.role }] });
  });

  app.get("/api/portal/data/:userId", async (req, res) => {
    const u = await currentUser(req);
    if (!u || u.must_change) return res.status(401).json({ error: "Faça login e troque a senha." });
    const target = Number(req.params.userId);
    let allowed = Number.isInteger(target) && target === u.id;
    if (!allowed && u.role === "owner") allowed = (await q(sql`SELECT id FROM portal_users WHERE id=${target} AND polo=${u.polo}`)).length > 0;
    if (!allowed) return res.status(403).json({ error: "Sem permissão." });
    const rows = await q(sql`SELECT tab, content, updated_at FROM portal_data WHERE user_id=${target} AND tab NOT LIKE '\\_%'`);
    const abas = rows.map((r: any) => ({ aba: r.tab, linhas: JSON.parse(r.content), atualizado: r.updated_at }));
    res.json({ abas });
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
    if (!Number.isInteger(target) || target <= 0) return false;
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

  const KINDS = ["links", "materiais", "aprendizado"];
  app.get("/api/portal/items/:kind", async (req, res) => {
    const u = await authed(req, res); if (!u) return;
    if (!KINDS.includes(req.params.kind)) return res.status(400).json({ error: "Tipo inválido." });
    await q(sql`CREATE TABLE IF NOT EXISTS portal_items (id INT AUTO_INCREMENT PRIMARY KEY, polo VARCHAR(64) NOT NULL, kind VARCHAR(24) NOT NULL, title VARCHAR(200) NOT NULL, url VARCHAR(1000) NOT NULL, note VARCHAR(500) NOT NULL DEFAULT '', INDEX(polo,kind))`);
    res.json({ items: await q(sql`SELECT id,title,url,note FROM portal_items WHERE polo=${u.polo} AND kind=${req.params.kind} ORDER BY id`), canEdit: u.role === "owner" });
  });
  app.post("/api/portal/items/:kind", async (req, res) => {
    const u = await authed(req, res); if (!u) return;
    if (u.role !== "owner" || !KINDS.includes(req.params.kind)) return res.status(403).json({ error: "Sem permissão." });
    const title = String(req.body?.title ?? "").trim().slice(0, 200), url = String(req.body?.url ?? "").trim().slice(0, 1000), note = String(req.body?.note ?? "").slice(0, 500);
    if (!title || !/^https?:\/\//i.test(url)) return res.status(400).json({ error: "Informe título e um link http(s)." });
    await q(sql`INSERT INTO portal_items (polo,kind,title,url,note) VALUES (${u.polo},${req.params.kind},${title},${url},${note})`);
    res.json({ ok: true });
  });
  app.delete("/api/portal/items/:kind/:id", async (req, res) => {
    const u = await authed(req, res); if (!u) return;
    if (u.role !== "owner") return res.status(403).json({ error: "Sem permissão." });
    await q(sql`DELETE FROM portal_items WHERE id=${Number(req.params.id)} AND polo=${u.polo} AND kind=${req.params.kind}`);
    res.json({ ok: true });
  });
  // Notas: PDI (so a dona do polo escreve) e Meu desenvolvimento (o proprio agente ou a dona escrevem).
  app.get("/api/portal/note/:userId/:name", async (req, res) => {
    const u = await authed(req, res); if (!u) return;
    const target = Number(req.params.userId), name = req.params.name;
    if (!(["pdi", "desenvolvimento", "calc", "psv", "marks"].includes(name) || /^promessa-\d{4}-(0[1-9]|1[0-2])$/.test(name)) || !(await canSee(u, target))) return res.status(403).json({ error: "Sem permissão." });
    const r = await q(sql`SELECT content FROM portal_data WHERE user_id=${target} AND tab=${"_note_" + name}`);
    res.json({ text: r[0]?.content ?? "", canEdit: name === "pdi" ? u.role === "owner" : true });
  });
  app.put("/api/portal/note/:userId/:name", async (req, res) => {
    const u = await authed(req, res); if (!u) return;
    const target = Number(req.params.userId), name = req.params.name;
    if (!(["pdi", "desenvolvimento", "calc", "psv", "marks"].includes(name) || /^promessa-\d{4}-(0[1-9]|1[0-2])$/.test(name)) || !(await canSee(u, target))) return res.status(403).json({ error: "Sem permissão." });
    if (name === "pdi" && u.role !== "owner") return res.status(403).json({ error: "O PDI é registrado pela liderança do polo." });
    const text = String(req.body?.text ?? "").slice(0, 20000);
    await q(sql`INSERT INTO portal_data (user_id,tab,content) VALUES (${target},${"_note_" + name},${text}) ON DUPLICATE KEY UPDATE content=VALUES(content)`);
    res.json({ ok: true });
  });

  // Tabelas de referencia da calculadora de RV: ficam so no banco (carga feita fora da aplicacao).
  app.get("/api/portal/ref", async (req, res) => {
    const u = await authed(req, res); if (!u) return;
    const r = await q(sql`SELECT content FROM portal_data WHERE user_id=0 AND tab='_ref_rv'`);
    res.json(r[0] ? JSON.parse(r[0].content) : { mcc: [], rates: [] });
  });

  // PSV semanal: 4 semanas por mes, com historico. Salvar o planejado trava (no servidor); depois so o realizado muda.
  const psvKey = (k: string) => /^\d{4}-(0[1-9]|1[0-2])-w[1-4]$/.test(k) ? "_psv_" + k : null;
  app.get("/api/portal/psv/:userId/:key", async (req, res) => {
    const u = await authed(req, res); if (!u) return;
    const target = Number(req.params.userId), tab = psvKey(req.params.key);
    if (!tab || !(await canSee(u, target))) return res.status(403).json({ error: "Sem permissão." });
    const r = await q(sql`SELECT content FROM portal_data WHERE user_id=${target} AND tab=${tab}`);
    res.json(r[0] ? JSON.parse(r[0].content) : { plan: null, real: {}, locked: false });
  });
  app.put("/api/portal/psv/:userId/:key/:part", async (req, res) => {
    const u = await authed(req, res); if (!u) return;
    const target = Number(req.params.userId), tab = psvKey(req.params.key), part = req.params.part;
    if (!tab || !["plan", "real"].includes(part) || !(await canSee(u, target))) return res.status(403).json({ error: "Sem permissão." });
    const body = req.body?.data;
    if (!body || typeof body !== "object" || JSON.stringify(body).length > 40000) return res.status(400).json({ error: "Dados inválidos." });
    const r = await q(sql`SELECT content FROM portal_data WHERE user_id=${target} AND tab=${tab}`);
    const cur = r[0] ? JSON.parse(r[0].content) : { plan: null, real: {}, locked: false };
    if (part === "plan") {
      if (cur.locked && u.role !== "owner") return res.status(409).json({ error: "O planejado desta semana está travado. Só a liderança do polo pode alterá-lo." });
      if (cur.locked) cur.editedByLeaderAt = new Date().toISOString(); else cur.lockedAt = new Date().toISOString();
      cur.plan = body; cur.locked = true;
    } else {
      if (!cur.locked) return res.status(409).json({ error: "Salve o planejado antes de lançar o realizado." });
      cur.real = body;
    }
    await q(sql`INSERT INTO portal_data (user_id,tab,content) VALUES (${target},${tab},${JSON.stringify(cur)}) ON DUPLICATE KEY UPDATE content=VALUES(content)`);
    res.json({ ok: true, state: cur });
  });


  // Acesso inicial: convite individual, aleatorio (256 bits), uso unico, validade de 48h. So o hash fica no banco.
  const sha = (s: string) => createHash("sha256").update(s).digest("hex");
  app.post("/api/portal/invite", async (req, res) => {
    const u = await authed(req, res); if (!u) return;
    if (u.role !== "owner") return res.status(403).json({ error: "Sem permissão." });
    const target = Number(req.body?.userId);
    const t = Number.isInteger(target) ? (await q(sql`SELECT id,role FROM portal_users WHERE id=${target} AND polo=${u.polo}`))[0] : null;
    if (!t || t.role === "owner") return res.status(400).json({ error: "Pessoa inválida." });
    const token = randomBytes(32).toString("base64url");
    const exp = Date.now() + 48 * 3600_000;
    await q(sql`UPDATE portal_users SET invite_hash=${sha(token)}, invite_exp=${exp} WHERE id=${t.id}`);
    res.set("Cache-Control", "no-store");
    res.json({ token, expiresAt: new Date(exp).toISOString() });
  });
  app.post("/api/portal/redeem", async (req: Request, res: Response) => {
    try {
      await ensurePortalSchema();
      if (throttledN(`redeem|${clientIp(req)}`, 30, 15 * 60_000)) return res.status(429).json({ error: "Muitas tentativas. Aguarde alguns minutos." });
      const token = String(req.body?.token ?? ""), password = String(req.body?.password ?? "");
      if (token.length < 30 || token.length > 100) return res.status(400).json({ error: "Convite inválido ou expirado." });
      if (password.length < 10 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) return res.status(400).json({ error: "A senha precisa ter 10 ou mais caracteres, com letras e números." });
      const u = (await q(sql`SELECT * FROM portal_users WHERE invite_hash=${sha(token)}`))[0];
      if (!u || !u.invite_exp || Number(u.invite_exp) < Date.now()) return res.status(400).json({ error: "Convite inválido ou expirado." });
      const p = await createPassword(password);
      const r: any = await q(sql`UPDATE portal_users SET pass_hash=${p.passwordHash}, pass_salt=${p.passwordSalt}, must_change=0, invite_hash=NULL, invite_exp=NULL WHERE id=${u.id} AND invite_hash=${sha(token)}`);
      const jwt = await new SignJWT({ uid: u.id, pv: p.passwordSalt.slice(0, 12) }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(secret());
      res.cookie(COOKIE, jwt, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 7 * 864e5, path: "/" });
      res.json({ user: pub({ ...u, must_change: 0 }) });
    } catch (e) { console.error(e); res.status(500).json({ error: "Erro interno." }); }
  });

  app.get("/portal/assets/:name", (req, res) => {
    const a = PORTAL_ASSETS[String(req.params.name)];
    if (!a) return res.status(404).end();
    res.set({ "Cache-Control": "public, max-age=86400", "Content-Type": a.type });
    res.send(Buffer.from(a.b64, "base64"));
  });

  // Esqueci minha senha: codigo de 6 digitos enviado ao e-mail Stone, 15 min, uso unico, 5 tentativas. Resposta identica exista ou nao o e-mail.
  const codeHash = (email: string, code: string) => createHmac("sha256", ENV.cookieSecret).update("reset|" + email + "|" + code).digest("hex");
  const sendResetEmail = async (to: string, name: string, code: string) => {
    const key = process.env.RESEND_API_KEY, from = process.env.EMAIL_FROM;
    if (!key || !from) { console.error("portal reset: e-mail nao configurado"); return; }
    const first = String(name).split(" ")[0];
    const text = `Olá, ${first}.\n\nSeu código para criar uma nova senha no Portal do Polo é: ${code}\n\nEle vale por 15 minutos e só pode ser usado uma vez. Se você não pediu, ignore este e-mail: sua senha atual continua valendo.\n\nNova Odisseia`;
    const html = `<div style="background:#f3f6f4;padding:24px;font-family:Arial,Helvetica,sans-serif"><div style="max-width:480px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden"><div style="background:#00a868;color:#fff;padding:18px 24px;font-size:18px;font-weight:bold">Portal do Polo Vila Medeiros</div><div style="padding:24px;color:#14211b;font-size:15px;line-height:1.5"><p>Olá, ${first.replace(/[<>&"]/g, "")}.</p><p>Use este código para criar uma nova senha:</p><p style="font-size:34px;letter-spacing:8px;font-weight:bold;background:#e6f6ef;border-radius:10px;padding:14px;text-align:center;color:#00774a">${code}</p><p>Ele vale por <b>15 minutos</b> e só pode ser usado uma vez.</p><p style="color:#566;font-size:13px">Se você não pediu, ignore este e-mail: sua senha atual continua valendo.</p></div><div style="padding:12px 24px;background:#f3f6f4;color:#789;font-size:12px">Nova Odisseia</div></div></div>`;
    try {
      const r = await fetch(process.env.RESEND_API_URL || "https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: [to], subject: "Seu código de verificação - Portal do Polo", text, html }) });
      if (!r.ok) console.error("portal reset: envio falhou", r.status);
    } catch (e) { console.error("portal reset: envio falhou", (e as Error).message); }
  };
  app.post("/api/portal/forgot", async (req: Request, res: Response) => {
    const reply = () => res.json({ ok: true, message: "Se este e-mail estiver cadastrado, enviamos um código de 6 dígitos. Ele vale por 15 minutos." });
    try {
      await ensurePortalSchema();
      const email = normalizedEmail(String(req.body?.email ?? ""));
      if (throttledN(`forgot-ip|${clientIp(req)}`, 30, 15 * 60_000)) return res.status(429).json({ error: "Muitas tentativas. Aguarde alguns minutos." });
      if (!email || email.length > 190 || !/^[^@\s]+@[^@\s]+$/.test(email)) return reply();
      if (throttledN(`forgot-mail|${email}`, 3, 60 * 60_000)) return reply();
      const u = (await q(sql`SELECT id,name,email FROM portal_users WHERE email=${email}`))[0];
      reply();
      if (!u) return;
      const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
      await q(sql`UPDATE portal_users SET reset_hash=${codeHash(email, code)}, reset_exp=${Date.now() + 15 * 60_000}, reset_tries=0 WHERE id=${u.id}`);
      void sendResetEmail(u.email, u.name, code);
    } catch (e) { console.error(e); if (!res.headersSent) res.json({ ok: true, message: "Se este e-mail estiver cadastrado, enviamos um código de 6 dígitos. Ele vale por 15 minutos." }); }
  });
  app.post("/api/portal/reset", async (req: Request, res: Response) => {
    const bad = () => res.status(400).json({ error: "Código inválido ou expirado." });
    try {
      await ensurePortalSchema();
      if (throttledN(`reset-ip|${clientIp(req)}`, 30, 15 * 60_000)) return res.status(429).json({ error: "Muitas tentativas. Aguarde alguns minutos." });
      const email = normalizedEmail(String(req.body?.email ?? "")), code = String(req.body?.code ?? "").replace(/\s/g, ""), password = String(req.body?.password ?? "");
      if (!/^\d{6}$/.test(code) || !email) return bad();
      if (password.length < 10 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) return res.status(400).json({ error: "A senha precisa ter 10 ou mais caracteres, com letras e números." });
      const u = (await q(sql`SELECT * FROM portal_users WHERE email=${email}`))[0];
      const given = Buffer.from(codeHash(email, code), "hex");
      const stored = Buffer.from(u?.reset_hash && /^[0-9a-f]{64}$/.test(u.reset_hash) ? u.reset_hash : "0".repeat(64), "hex");
      const match = timingSafeEqual(given, stored);
      if (!u || !u.reset_hash || !u.reset_exp || Number(u.reset_exp) < Date.now() || Number(u.reset_tries) >= 5) return bad();
      if (!match) {
        await q(sql`UPDATE portal_users SET reset_tries=reset_tries+1 WHERE id=${u.id}`);
        if (Number(u.reset_tries) + 1 >= 5) await q(sql`UPDATE portal_users SET reset_hash=NULL, reset_exp=NULL WHERE id=${u.id}`);
        return bad();
      }
      const p = await createPassword(password);
      await q(sql`UPDATE portal_users SET pass_hash=${p.passwordHash}, pass_salt=${p.passwordSalt}, must_change=0, invite_hash=NULL, invite_exp=NULL, reset_hash=NULL, reset_exp=NULL, reset_tries=0 WHERE id=${u.id} AND reset_hash=${u.reset_hash}`);
      const jwt = await new SignJWT({ uid: u.id, pv: p.passwordSalt.slice(0, 12) }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(secret());
      res.cookie(COOKIE, jwt, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 7 * 864e5, path: "/" });
      res.json({ user: pub({ ...u, must_change: 0 }) });
    } catch (e) { console.error(e); res.status(500).json({ error: "Erro interno." }); }
  });

  app.get("/api/portal/now", (_req, res) => res.json({ iso: new Date().toISOString() }));

  ensurePortalSchema().catch(e => console.error("portal schema", e));
}
