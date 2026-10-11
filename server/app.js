import express from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRefs } from './db.js';
import { estimate, publicView, EstimateError, ROOM_TYPES, SLOTS } from './pricing.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATUSES = ['new', 'contacted', 'measure', 'contract', 'work', 'done', 'lost'];
const PUBLIC_CATEGORIES = [...new Set(Object.values(SLOTS).map((s) => s.category))];

export function createApp({ db, adminPassword, sessionSecret, notify = async () => {} }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '100kb' }));

  const refs = () => loadRefs(db);
  const k = (s) => (1 + s.markup) / (1 - s.taxRate);

  // ---------- Публичная часть ----------

  app.get('/api/catalog', (req, res) => {
    const { settings, catalog } = refs();
    const factor = k(settings);
    const categories = {};
    for (const c of PUBLIC_CATEGORIES) categories[c] = [];
    for (const item of [...catalog.values()].sort((a, b) => a.sort - b.sort)) {
      if (!item.enabled || !categories[item.category]) continue;
      categories[item.category].push({
        id: item.id, name: item.name, unit: item.unit, kind: item.kind, color: item.color,
        price: Math.round(item.price * factor), // цена в смете, уже с наценкой и налогом
      });
    }
    res.json({
      categories,
      roomTypes: Object.fromEntries(Object.entries(ROOM_TYPES).map(([key, v]) => [key, { label: v.label, windows: v.windows, doors: v.doors }])),
      validDays: settings.estimateValidDays,
    });
  });

  app.post('/api/estimate', (req, res) => {
    const r = refs();
    try {
      res.json(publicView(estimate(req.body, r), r.settings));
    } catch (e) {
      handleEstimateError(e, res);
    }
  });

  const limiter = rateLimit(10, 60_000);

  app.post('/api/leads', limiter, async (req, res) => {
    const { name, phone, consent, input } = req.body || {};
    const contact = validateContact(name, phone, consent);
    if (contact.error) return res.status(400).json({ error: contact.error });
    const r = refs();
    let result;
    try {
      result = estimate(input, r);
    } catch (e) {
      return handleEstimateError(e, res);
    }
    const view = publicView(result, r.settings);
    const info = db.prepare(`INSERT INTO leads (created_at, source, name, phone, area, client_total, net_profit, data)
      VALUES (?, 'calc', ?, ?, ?, ?, ?, ?)`).run(
      new Date().toISOString(), contact.name, contact.phone, result.geometry.area,
      result.totals.clientTotal, result.totals.netProfit,
      JSON.stringify({ input: result.input, geometry: result.geometry, lines: result.lines, totals: result.totals, settings: r.settings }),
    );
    const id = Number(info.lastInsertRowid);
    notify(`Новая заявка из калькулятора №${id}\n${contact.name}, ${contact.phone}\n` +
      `${result.geometry.area} м² · смета ${fmt(result.totals.clientTotal)} ₽ · прибыль ${fmt(result.totals.netProfit)} ₽`).catch(() => {});
    res.json({ id, ...view });
  });

  app.post('/api/quiz-leads', limiter, async (req, res) => {
    const { name, phone, consent, answers } = req.body || {};
    const contact = validateContact(name, phone, consent);
    if (contact.error) return res.status(400).json({ error: contact.error });
    const clean = {};
    for (const [key, v] of Object.entries(answers || {}).slice(0, 10)) clean[String(key).slice(0, 30)] = String(v).slice(0, 100);
    const info = db.prepare(`INSERT INTO leads (created_at, source, name, phone, data) VALUES (?, 'quiz', ?, ?, ?)`)
      .run(new Date().toISOString(), contact.name, contact.phone, JSON.stringify({ answers: clean }));
    const id = Number(info.lastInsertRowid);
    notify(`Новая заявка из квиза №${id}\n${contact.name}, ${contact.phone}\n${Object.values(clean).join(' · ')}`).catch(() => {});
    res.json({ id });
  });

  // ---------- Админка ----------

  const sign = (exp) => crypto.createHmac('sha256', sessionSecret).update(String(exp)).digest('hex');
  const COOKIE = 'sk_admin';

  const isAuthed = (req) => {
    const raw = parseCookies(req.headers.cookie)[COOKIE];
    if (!raw) return false;
    const [exp, sig] = raw.split('.');
    if (!exp || !sig || Number(exp) < Date.now()) return false;
    return safeEqual(sig, sign(exp));
  };

  app.post('/api/admin/login', rateLimit(10, 15 * 60_000), (req, res) => {
    const password = String(req.body?.password || '');
    if (!safeEqual(hash(password), hash(adminPassword))) return res.status(401).json({ error: 'Неверный пароль' });
    const exp = Date.now() + 30 * 24 * 3600_000;
    res.setHeader('Set-Cookie', `${COOKIE}=${exp}.${sign(exp)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${30 * 24 * 3600}${req.secure ? '; Secure' : ''}`);
    res.json({ ok: true });
  });

  app.post('/api/admin/logout', (req, res) => {
    res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
    res.json({ ok: true });
  });

  const admin = express.Router();
  admin.use((req, res, next) => (isAuthed(req) ? next() : res.status(401).json({ error: 'Требуется вход' })));

  admin.get('/me', (req, res) => res.json({ ok: true, statuses: STATUSES }));

  admin.get('/leads', (req, res) => {
    const status = STATUSES.includes(req.query.status) ? req.query.status : null;
    const rows = db.prepare(`SELECT id, created_at, source, name, phone, status, comment, area, client_total, net_profit
      FROM leads ${status ? 'WHERE status = ?' : ''} ORDER BY id DESC LIMIT 500`).all(...(status ? [status] : []));
    res.json(rows);
  });

  admin.get('/leads/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM leads WHERE id = ?').get(Number(req.params.id));
    if (!row) return res.status(404).json({ error: 'Не найдено' });
    res.json({ ...row, data: JSON.parse(row.data) });
  });

  admin.patch('/leads/:id', (req, res) => {
    const { status, comment } = req.body || {};
    const row = db.prepare('SELECT id FROM leads WHERE id = ?').get(Number(req.params.id));
    if (!row) return res.status(404).json({ error: 'Не найдено' });
    if (status !== undefined) {
      if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Неизвестный статус' });
      db.prepare('UPDATE leads SET status = ? WHERE id = ?').run(status, row.id);
    }
    if (comment !== undefined) db.prepare('UPDATE leads SET comment = ? WHERE id = ?').run(String(comment).slice(0, 2000), row.id);
    res.json({ ok: true });
  });

  admin.get('/stats', (req, res) => {
    const byStatus = db.prepare('SELECT status, COUNT(*) AS n FROM leads GROUP BY status').all();
    const sums = db.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(client_total), 0) AS total,
      COALESCE(SUM(net_profit), 0) AS profit, COALESCE(AVG(area), 0) AS avgArea FROM leads WHERE source = 'calc'`).get();
    const { catalog } = refs();
    const counts = {};
    for (const { data } of db.prepare(`SELECT data FROM leads WHERE source = 'calc' ORDER BY id DESC LIMIT 1000`).all()) {
      const options = JSON.parse(data).input?.options || {};
      for (const slot of Object.keys(SLOTS)) {
        if (!options[slot]) continue;
        counts[slot] ??= {};
        counts[slot][options[slot]] = (counts[slot][options[slot]] || 0) + 1;
      }
    }
    const popular = Object.fromEntries(Object.entries(counts).map(([slot, m]) => [slot,
      Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, n]) => ({ id, name: catalog.get(id)?.name || id, n }))]));
    res.json({ byStatus, ...sums, popular });
  });

  admin.get('/refs', (req, res) => {
    res.json({
      settings: db.prepare('SELECT * FROM settings').all(),
      rates: db.prepare('SELECT * FROM work_rates').all(),
      catalog: db.prepare('SELECT * FROM catalog ORDER BY category, sort').all(),
    });
  });

  admin.patch('/settings/:key', (req, res) => {
    const value = Number(req.body?.value);
    if (!Number.isFinite(value) || value < 0) return res.status(400).json({ error: 'Некорректное значение' });
    if (['taxRate', 'supplierDiscount'].includes(req.params.key) && value >= 1) return res.status(400).json({ error: 'Доля должна быть меньше 1' });
    const info = db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(value, req.params.key);
    if (!info.changes) return res.status(404).json({ error: 'Не найдено' });
    res.json({ ok: true });
  });

  admin.patch('/rates/:id', (req, res) => {
    const price = Number(req.body?.price);
    if (!Number.isFinite(price) || price < 0) return res.status(400).json({ error: 'Некорректная цена' });
    const info = db.prepare('UPDATE work_rates SET price = ? WHERE id = ?').run(price, req.params.id);
    if (!info.changes) return res.status(404).json({ error: 'Не найдено' });
    res.json({ ok: true });
  });

  admin.patch('/catalog/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM catalog WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Не найдено' });
    const next = catalogFields({ ...row, ...req.body });
    if (next.error) return res.status(400).json({ error: next.error });
    db.prepare(`UPDATE catalog SET name = ?, unit = ?, price = ?, kind = ?, coverage = ?, color = ?, url = ?,
      verified = ?, enabled = ?, updated_at = ? WHERE id = ?`).run(
      next.name, next.unit, next.price, next.kind, next.coverage, next.color, next.url,
      next.verified, row.category === 'rough' ? 1 : next.enabled, new Date().toISOString(), row.id);
    res.json({ ok: true });
  });

  admin.post('/catalog', (req, res) => {
    const category = String(req.body?.category || '');
    if (!PUBLIC_CATEGORIES.includes(category)) return res.status(400).json({ error: 'Неизвестная категория' });
    const next = catalogFields({ verified: 0, enabled: 1, ...req.body });
    if (next.error) return res.status(400).json({ error: next.error });
    if (['bath', 'toilet', 'electric'].includes(category) && !next.kind) return res.status(400).json({ error: 'Укажите вид (kind)' });
    const id = `${category}-${crypto.randomBytes(4).toString('hex')}`;
    const sort = (db.prepare('SELECT MAX(sort) AS m FROM catalog').get().m || 0) + 1;
    db.prepare(`INSERT INTO catalog (id, category, kind, name, unit, price, coverage, color, url, verified, enabled, sort, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, category, next.kind, next.name, next.unit, next.price,
      next.coverage, next.color, next.url, next.verified, next.enabled, sort, new Date().toISOString());
    res.json({ id });
  });

  app.use('/api/admin', admin);
  app.use('/api', (req, res) => res.status(404).json({ error: 'Не найдено' }));

  // ---------- Страницы ----------
  app.get('/', (req, res) => res.sendFile(path.join(ROOT, 'index.html')));
  app.get('/calc', (req, res) => res.sendFile(path.join(ROOT, 'public', 'calc.html')));
  app.get('/admin', (req, res) => res.sendFile(path.join(ROOT, 'public', 'admin.html')));
  app.use('/static', express.static(path.join(ROOT, 'public'), { maxAge: '1h' }));
  app.use('/primery', express.static(path.join(ROOT, 'primery'), { maxAge: '1d' }));

  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Некорректный JSON' });
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  });

  return app;
}

function handleEstimateError(e, res) {
  if (e instanceof EstimateError) return res.status(400).json({ error: e.message });
  console.error(e);
  return res.status(500).json({ error: 'Ошибка расчёта' });
}

function validateContact(name, phone, consent) {
  const n = String(name || '').trim();
  const p = String(phone || '').trim();
  if (n.length < 2 || n.length > 80) return { error: 'Укажите имя' };
  const digits = p.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) return { error: 'Укажите телефон' };
  if (consent !== true) return { error: 'Нужно согласие на обработку персональных данных' };
  return { name: n, phone: p.slice(0, 30) };
}

function catalogFields(x) {
  const name = String(x.name || '').trim();
  const unit = String(x.unit || '').trim();
  const price = Number(x.price);
  if (!name || name.length > 200) return { error: 'Укажите название' };
  if (!unit || unit.length > 20) return { error: 'Укажите единицу' };
  if (!Number.isFinite(price) || price < 0) return { error: 'Некорректная цена' };
  const coverage = x.coverage === null || x.coverage === '' || x.coverage === undefined ? null : Number(x.coverage);
  if (coverage !== null && !(coverage > 0)) return { error: 'Некорректная площадь покрытия' };
  const color = x.color ? String(x.color) : null;
  if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) return { error: 'Цвет в формате #RRGGBB' };
  const url = x.url ? String(x.url).slice(0, 500) : null;
  if (url && !/^https?:\/\//.test(url)) return { error: 'Ссылка должна начинаться с http' };
  return {
    name, unit, price, coverage, color, url,
    kind: x.kind ? String(x.kind).slice(0, 30) : null,
    verified: x.verified ? 1 : 0,
    enabled: x.enabled === false || x.enabled === 0 ? 0 : 1,
  };
}

function rateLimit(max, windowMs) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip;
    const list = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (list.length >= max) return res.status(429).json({ error: 'Слишком много запросов, попробуйте позже' });
    list.push(now);
    hits.set(key, list);
    if (hits.size > 10_000) hits.clear();
    next();
  };
}

function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

const hash = (s) => crypto.createHash('sha256').update(s).digest('hex');
function safeEqual(a, b) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
const fmt = (n) => Math.round(n).toLocaleString('ru-RU');
