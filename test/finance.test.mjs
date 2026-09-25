import test from 'node:test';
import assert from 'node:assert/strict';
import { pmt, principalFromPmt, balanceAfter, loanStructure, monthlyHousing, solveMax, tieredPremium, ownersPolicy, lendersPolicy, yearFraction, daysToMonthEnd } from '../src/core/finance.js';
import { TITLE_RATES } from '../src/core/defaults.js';

const near = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);

test('P&I matches standard amortization', () => {
  near(pmt(450000, 7.375, 30), 3108.04, 0.01);
  near(pmt(300000, 7.375, 30), 2072.03, 0.01);
  near(pmt(120000, 0, 10), 1000, 1e-9);
});
test('principalFromPmt inverts pmt', () => { near(principalFromPmt(pmt(400000, 6.5, 30), 6.5, 30), 400000, 0.01); });
test('balance after full term is 0 and after 0 is principal', () => {
  near(balanceAfter(300000, 7, 30, 360), 0, 0.01);
  near(balanceAfter(300000, 7, 30, 0), 300000, 1e-6);
  near(balanceAfter(300000, 7, 30, 12), 296952.58, 0.5);
});
test('2-1 buydown cost matches Fidelity reference ($10,665)', () => {
  const b = pmt(450000, 7.375, 30);
  near((b - pmt(450000, 5.375, 30)) * 12 + (b - pmt(450000, 6.375, 30)) * 12, 10665.49, 0.1);
});
test('conventional PMI brackets', () => {
  assert.equal(loanStructure({ price: 500000, downPct: 20, type: 'conv' }).miRate, 0);
  assert.equal(loanStructure({ price: 500000, downPct: 10, type: 'conv' }).miRate, 0.3);   // 90% LTV → "above 85"
  assert.equal(loanStructure({ price: 500000, downPct: 5, type: 'conv' }).miRate, 0.45);  // 95% LTV → "above 90"
  assert.equal(loanStructure({ price: 500000, downPct: 3, type: 'conv' }).miRate, 0.6);
});
test('FHA/VA/USDA upfront fees and min down', () => {
  const fha = loanStructure({ price: 400000, downPct: 0, type: 'fha' });
  assert.equal(fha.downPct, 3.5); near(fha.upfrontFee, 386000 * 0.0175); assert.equal(fha.miRate, 0.55);
  const va = loanStructure({ price: 400000, downPct: 0, type: 'va' });
  near(va.upfrontFee, 400000 * 0.0215); assert.equal(va.miMonthly, 0);
  assert.equal(loanStructure({ price: 400000, downPct: 10, type: 'va' }).upfrontPct, 1.25);
  near(loanStructure({ price: 400000, downPct: 0, type: 'usda' }).upfrontFee, 4000);
});
test('solveMax finds the affordability price and payment round-trips', () => {
  const opts = { downPct: 10, type: 'conv', rate: 7, term: 30, hoaMonthly: 50 };
  const fn = (p) => monthlyHousing({ price: p, ...opts, taxAnnual: p * 0.006, insAnnual: p * 0.0035 }).total;
  const price = solveMax(fn, 3000);
  near(fn(price), 3000, 0.01);
  assert.ok(price > 400000 && price < 440000, String(price));
});
test('title placeholder tiers ≈ Fidelity samples', () => {
  near(ownersPolicy(500000), 2489, 15);
  near(lendersPolicy(450000), 1348, 15);
  assert.equal(tieredPremium(10000, TITLE_RATES.owners), TITLE_RATES.owners.min);
});
test('date helpers', () => {
  near(yearFraction(new Date(2026, 0, 1)), 0, 1e-9);
  near(yearFraction(new Date(2026, 6, 2)), 182 / 365, 1e-3);
  assert.equal(daysToMonthEnd(new Date(2026, 9, 25)), 7);
});

import { apr, buydown, concessionLimit, futureValue, monthsBetween } from '../src/core/finance.js';
test('APR is above the note rate when fees are financed, equal with no fees', () => {
  near(apr(300000, 0, 6.5, 30), 6.5, 1e-6);
  const a = apr(300000, 3000, 6.5, 30);
  assert.ok(a > 6.55 && a < 6.65, String(a));
});
test('buydown schedules', () => {
  const b = buydown({ loan: 450000, rate: 7.375, term: 30, type: '2-1' });
  assert.deepEqual(b.phases.map((p) => p.rate), [5.375, 6.375, 7.375]);
  near(b.cost, 10665.49, 0.1);
  const p = buydown({ loan: 400000, rate: 7, term: 30, type: 'perm', newRate: 6.75, points: 1 });
  near(p.cost, 4000); assert.ok(p.breakEvenMonths > 50 && p.breakEvenMonths < 70, String(p.breakEvenMonths));
});
test('concession limits and helpers', () => {
  assert.equal(concessionLimit('conv', 95), 3); assert.equal(concessionLimit('conv', 85), 6); assert.equal(concessionLimit('conv', 70), 9);
  assert.equal(concessionLimit('fha', 96.5), 6); assert.equal(concessionLimit('va', 100), 4);
  near(futureValue(100000, 3, 2), 106090, 0.01);
  assert.equal(monthsBetween('2023-09-25', '2026-09-25'), 36);
});
