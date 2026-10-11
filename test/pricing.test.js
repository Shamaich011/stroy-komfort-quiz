import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb, loadRefs } from '../server/db.js';
import { estimate, publicView, EstimateError } from '../server/pricing.js';
import { STUDIO_30 } from './fixtures.js';

const refs = () => loadRefs(openDb(':memory:'));



test('итоги сходятся: цена клиенту = себестоимость × (1 + наценка) / (1 − налог)', () => {
  const r = refs();
  const { totals, geometry } = estimate(STUDIO_30, r);
  assert.equal(geometry.area, 29);
  const k = 1.2 / 0.94;
  assert.ok(Math.abs(totals.clientTotal - totals.base * k) < 60, 'расхождение только из-за округления строк');
  // Чистая прибыль = наценка + скрытая скидка поставщика
  assert.ok(Math.abs(totals.netProfit - (totals.markup + totals.supplierDiscount)) < 60);
  assert.equal(totals.supplierDiscount, Math.round(totals.materialsRetail * 0.08));
  // Порядок величины, как в ручной смете на 30 м²
  assert.ok(totals.clientTotal > 500_000 && totals.clientTotal < 800_000, String(totals.clientTotal));
});

test('публичная смета не раскрывает себестоимость, наценку и скидку', () => {
  const r = refs();
  const view = publicView(estimate(STUDIO_30, r), r.settings);
  const json = JSON.stringify(view);
  for (const key of ['cost', 'unitPrice', 'markup', 'supplierDiscount', 'netProfit', 'ourCost', 'tax']) {
    assert.ok(!json.includes(`"${key}"`), key);
  }
  assert.equal(view.total, view.sections.reduce((a, s) => a + s.total, 0));
});

test('вид санузла меняет работы: трап дороже ванны', () => {
  const r = refs();
  const bathtub = estimate(STUDIO_30, r);
  const drain = estimate({ ...STUDIO_30, options: { ...STUDIO_30.options, bath: 'bath-drain' } }, r);
  assert.ok(bathtub.lines.some((l) => l.rateId === 'bathtubInstall'));
  assert.ok(drain.lines.some((l) => l.rateId === 'drainInstall'));
  assert.ok(drain.totals.clientTotal > bathtub.totals.clientTotal);
});

test('инсталляция вместо компакта', () => {
  const r = refs();
  const res = estimate({ ...STUDIO_30, options: { ...STUDIO_30.options, toilet: 'wc-install-set' } }, r);
  assert.ok(res.lines.some((l) => l.rateId === 'installationInstall'));
  assert.ok(!res.lines.some((l) => l.rateId === 'toiletCompactInstall'));
});

test('без санузла не требуются сантехника и плитка', () => {
  const r = refs();
  const { options } = STUDIO_30;
  const res = estimate({
    rooms: [{ type: 'living', length: 4, width: 4 }],
    options: { laminate: options.laminate, wallpaper: options.wallpaper, door: options.door, electric: options.electric, spot: options.spot },
  }, r);
  assert.ok(!res.lines.some((l) => l.section === 'wet'));
});

test('отключение стяжки и штукатурки убирает их из сметы', () => {
  const r = refs();
  const res = estimate({ ...STUDIO_30, options: { ...STUDIO_30.options, screed: false, plaster: false } }, r);
  assert.ok(!res.lines.some((l) => ['screed', 'plaster'].includes(l.rateId)));
});

test('ошибки ввода', () => {
  const r = refs();
  assert.throws(() => estimate({ rooms: [] }, r), EstimateError);
  assert.throws(() => estimate({ rooms: [{ type: 'living', length: 100, width: 3 }] }, r), EstimateError);
  assert.throws(() => estimate({ ...STUDIO_30, options: { ...STUDIO_30.options, laminate: 'tw-beige' } }, r), EstimateError);
  assert.throws(() => estimate({ ...STUDIO_30, options: { ...STUDIO_30.options, toilet: undefined } }, r), EstimateError);
});
