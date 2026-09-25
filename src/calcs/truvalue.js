// TruValue Analysis — net proceeds at low / market / high list prices, including time on market.
import { pmt, balanceAfter, sellerClosingCosts, yearFraction } from '../core/finance.js';
import { money, pct, isoDate } from '../core/format.js';
import { sellerCostFields, sellerArgs, f } from '../core/presets.js';
import { headline, table, stepper, seg, note, empty, para } from '../core/ui.js';

const base = (v) => v.price;
const INTEREST = ['Strong', 'Good', 'Light'];

export default {
  id: 'truvalue',
  title: 'TruValue Analysis',
  short: 'TruValue',
  subtitle: 'See how list price and time on market change what a seller walks away with.',
  state: { m0: '1', m1: '2', m2: '6', cut: '0' },
  groups: [{ id: 'main' }, { id: 'hold', title: 'Monthly holding costs' }, { id: 'more', title: 'Selling costs' }],
  fields: [
    { key: 'price', label: 'Market price', type: 'money', default: 500000, required: true, tip: 'Your best estimate of market value today.' },
    { key: 'low', label: 'Low end', type: 'money', default: 480000, half: true },
    { key: 'high', label: 'High end', type: 'money', default: 525000, half: true },
    { key: 'balance', label: 'Mortgage balance', type: 'money', default: 250000 },
    { key: 'loanRate', label: 'Mortgage rate', type: 'percent', default: 4, half: true },
    { key: 'yearsLeft', label: 'Years left on loan', type: 'number', suffix: 'Years', default: 25, half: true },
    f.tax({ base, group: 'hold' }),
    f.ins({ base, group: 'hold' }),
    f.hoa({ group: 'hold' }),
    { key: 'utilities', label: 'Utilities', type: 'money', default: 250, group: 'hold', half: true, tip: 'Power, gas, water, trash, internet: per month.' },
    { key: 'upkeep', label: 'Upkeep & yard', type: 'money', default: 100, group: 'hold', half: true, tip: 'Per month.' },
    { key: 'cutPct', label: 'Price cut if overpriced', type: 'percent', default: 5, group: 'more', half: true },
    { key: 'cutDays', label: 'Days until the cut', type: 'number', suffix: 'Days', default: 30, group: 'more', half: true },
    ...sellerCostFields('more'),
  ],

  compute(v, state) {
    if (v.missing.length || v.price <= 0) return { empty: true };
    const taxAnnual = v.taxMode === '$' ? v.taxAmt : v.price * v.tax / 100;
    const insAnnual = v.insMode === '$' ? v.insAmt : v.price * v.ins / 100;
    const pi = pmt(v.balance, v.loanRate, v.yearsLeft);
    // Utah property taxes are billed yearly in arrears (due Nov 30), so they're settled as a lump
    // (full bill if closing after year-end, plus the Jan 1 → closing proration), not monthly.
    const monthly = pi + insAnnual / 12 + v.hoaMonthly + v.utilities + v.upkeep;
    const now = new Date();
    const cut = state.cut === '1';
    const prices = [v.low || v.price, v.price, (v.high || v.price) * (cut ? 1 - v.cutPct / 100 : 1)];
    const cols = prices.map((p, i) => {
      const m = Math.max(0, Math.min(24, +state['m' + i] || 0));
      const close = new Date(); close.setMonth(close.getMonth() + m);
      const sc = sellerClosingCosts({ ...sellerArgs(v, p), taxAnnual, closingDate: isoDate(close), prorateTax: false });
      const prorated = taxAnnual * (close.getFullYear() - now.getFullYear()) + taxAnnual * yearFraction(close);
      const payoff = balanceAfter(v.balance, v.loanRate, v.yearsLeft, m);
      const holding = monthly * m;
      return { p, m, costs: sc.costs, prorated, payoff, holding, net: p - sc.costs - prorated - payoff - holding };
    });
    const best = cols.reduce((bi, c, i) => (c.net > cols[bi].net ? i : bi), 0);
    return { cols, best, monthly, cut };
  },

  render(r, v) {
    if (r.empty) return empty('Enter a market price', 'Add the market price and range to compare net proceeds.');
    const c = r.cols;
    const cell = (fn) => c.map(fn);
    return [
      headline('Best estimated net', money(c[r.best].net), `listing at ${money(c[r.best].p)} and closing in ${c[r.best].m} month${c[r.best].m === 1 ? '' : 's'}`),
      seg('cut', [['0', 'No price cut'], ['1', `High end: cut ${pct(v.cutPct, 2)} after ${v.cutDays} days`]], r.cut ? '1' : '0', 'Price cut scenario'),
      table(['', 'Low', 'Market', 'High'], [
        ['Sales price', ...cell((x) => money(x.p))],
        ['Months to close', ...cell((x, i) => stepper('m' + i, x.m, 0, 24, 'months'))],
        ['Buyer interest', ...INTEREST],
        ['Closing costs', ...cell((x) => '−' + money(x.costs))],
        ['Property taxes owed', ...cell((x) => '−' + money(x.prorated))],
        ['Holding costs', ...cell((x) => '−' + money(x.holding))],
        ['Loan payoff', ...cell((x) => '−' + money(x.payoff))],
        ['Net at close', ...cell((x) => money(x.net)), { total: true }],
      ], { best: r.best + 1 }),
      para(`Holding the home costs about <b>${money(r.monthly)}/mo</b> (mortgage, insurance, HOA, utilities and upkeep). Each extra month on the market eats into the higher price. Property taxes include any tax bill that comes due before closing plus the Jan 1 → closing proration.`),
      note('Pricing it right from day one gives the best chance of selling quickly and for top dollar. Overpricing can miss the early wave of buyers and lead to price cuts later.'),
    ].join('');
  },
};
