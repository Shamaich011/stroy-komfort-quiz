import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../server/db.js';
import { createApp } from '../server/app.js';
import { STUDIO_30 } from './fixtures.js';

let server, base;
const sent = [];

before(async () => {
  const app = createApp({ db: openDb(':memory:'), adminPassword: 'secret-pass', sessionSecret: 'x', notify: async (t) => sent.push(t) });
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const post = (url, body, headers = {}) => fetch(base + url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });

test('каталог отдаёт цены с наценкой и не отдаёт черновые материалы', async () => {
  const data = await (await fetch(base + '/api/catalog')).json();
  assert.ok(!('rough' in data.categories));
  const lam = data.categories.laminate.find((x) => x.id === 'lam-expert');
  assert.equal(lam.price, Math.round(789 * 1.2 / 0.94));
});

test('расчёт и заявка', async () => {
  const est = await (await post('/api/estimate', STUDIO_30)).json();
  assert.ok(est.total > 0);

  let res = await post('/api/leads', { name: 'Иван', phone: '+7 900 000 00 00', input: STUDIO_30 });
  assert.equal(res.status, 400, 'без согласия на обработку ПД');

  res = await post('/api/leads', { name: 'Иван', phone: '+7 900 000 00 00', consent: true, input: STUDIO_30 });
  assert.equal(res.status, 200);
  const lead = await res.json();
  assert.equal(lead.total, est.total);
  assert.match(sent.at(-1), /Иван/);
});

test('админка закрыта паролем', async () => {
  assert.equal((await fetch(base + '/api/admin/leads')).status, 401);
  assert.equal((await post('/api/admin/login', { password: 'wrong' })).status, 401);

  const login = await post('/api/admin/login', { password: 'secret-pass' });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie').split(';')[0];

  const leads = await (await fetch(base + '/api/admin/leads', { headers: { cookie } })).json();
  assert.ok(leads.length >= 1);
  const full = await (await fetch(`${base}/api/admin/leads/${leads[0].id}`, { headers: { cookie } })).json();
  assert.ok(full.data.totals.netProfit > 0);

  const patch = await fetch(`${base}/api/admin/settings/markup`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify({ value: 0.25 }),
  });
  assert.equal(patch.status, 200);
  const lam = (await (await fetch(base + '/api/catalog')).json()).categories.laminate.find((x) => x.id === 'lam-expert');
  assert.equal(lam.price, Math.round(789 * 1.25 / 0.94));
});
