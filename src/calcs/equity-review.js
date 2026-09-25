// Equity Review — how much equity a homeowner has built, where it came from, and what selling would net.
import { balanceAfter, monthsBetween, sellerClosingCosts } from '../core/finance.js';
import { money, pct, isoDate } from '../core/format.js';
import { f, sellerCostFields, sellerArgs } from '../core/presets.js';
import { headline, block, breakdown, rows, stats, note, empty, goto } from '../core/ui.js';

const threeYearsAgo = () => { const d = new Date(); d.setFullYear(d.getFullYear() - 3); return d; };

export default {
  id: 'equity-review',
  title: 'Equity Review',
  short: 'Equity Review',
  subtitle: 'See how much equity you’ve built, where it came from, and what you might net if you sold.',
  fields: [
    { key: 'price', label: 'What the home is worth today', type: 'money', default: 600000, required: true },
    { key: 'purchase', label: 'Purchase price', type: 'money', default: 400000, required: true },
    f.down({ base: (v) => v.purchase }),
    { key: 'balance', label: 'Current loan balance', type: 'money', default: '', placeholder: 'Leave blank to estimate', hint: 'Blank = estimated from the rate, term and start date below.' },
    f.rate({ label: 'Mortgage rate', default: 5.5, half: true }),
    f.term({ half: true }),
    { key: 'start', label: 'Loan start date', type: 'date', default: threeYearsAgo },
    ...sellerCostFields('more'),
  ],

  compute(v) {
    if (v.missing.length || v.price <= 0) return { empty: true };
    const down = v.purchase * v.down / 100;
    const orig = Math.max(0, v.purchase - down);
    const months = monthsBetween(v.start, isoDate(new Date()));
    const estimated = !(v.balance > 0);
    const bal = estimated ? balanceAfter(orig, v.rate, v.term, months) : v.balance;
    const equity = v.price - bal;
    const sc = sellerClosingCosts({ ...sellerArgs(v, v.price), taxAnnual: 0, prorateTax: false });
    return { down, orig, bal, estimated, months, equity, appreciation: v.price - v.purchase, principal: Math.max(0, orig - bal), sc, net: equity - sc.costs };
  },

  render(r, v) {
    if (r.empty) return empty('Enter the home’s value', 'Add today’s value and purchase price to review equity.');
    return [
      headline('Total equity', money(r.equity), `${pct(r.equity / v.price * 100, 1)} of the home’s value`),
      block('Where it came from', breakdown([
        { label: 'Down payment', value: r.down },
        { label: 'Principal paid down', value: r.principal },
        { label: 'Appreciation', value: Math.max(0, r.appreciation) },
      ])),
      r.appreciation < 0 ? note(`The home is worth ${money(-r.appreciation)} less than you paid, which reduces your equity.`, true) : '',
      stats([
        ['Loan balance', money(r.bal), r.estimated ? 'estimated' : 'as entered'],
        ['Loan-to-value', pct(r.bal / v.price * 100, 1), ''],
        ['Value change', `${r.appreciation >= 0 ? '+' : '−'}${money(Math.abs(r.appreciation))}`, `since purchase`],
      ]),
      block('If you sold today', rows([
        ['Equity', money(r.equity)],
        ['Commissions & closing costs', '−' + money(r.sc.costs)],
        ['Estimated net proceeds', money(r.net), { total: true }],
      ])),
      goto('sell-to-net', {}, 'Work backward from a net goal'),
      goto('home-equity', { price: v.price, balance: Math.round(r.bal) }, 'Borrow against this equity'),
    ].join('');
  },
};
