// Sell to Net — start from the cash a seller wants to walk away with, solve for the sale price.
import { sellerClosingCosts, solveMin } from '../core/finance.js';
import { money, pct } from '../core/format.js';
import { f, sellerCostFields, sellerArgs } from '../core/presets.js';
import { headline, block, breakdown, rows, itemized, note, empty } from '../core/ui.js';

const base = (v) => v._price || 0;

export default {
  id: 'sell-to-net',
  title: 'Sell to Net',
  short: 'Sell to Net',
  subtitle: 'Start with what you want to walk away with and find the sale price you’d need.',
  state: { _price: 0 },
  fields: [
    { key: 'net', label: 'Cash you want at closing', type: 'money', default: 200000, required: true },
    { key: 'balance', label: 'Mortgage payoff', type: 'money', default: 250000, tip: 'Include any second mortgage or HELOC.' },
    ...sellerCostFields('main', { base }).map((x) => (x.key === 'concession' || x.key === 'misc' ? { ...x, group: 'more' } : x)),
    { key: 'taxAnnual', label: 'Yearly property taxes', type: 'money', default: 3000, group: 'more', tip: 'Utah taxes are paid in arrears, so the seller owes Jan 1 → closing.' },
    f.closingDate(),
  ],

  compute(v, state) {
    if (v.missing.length || v.net <= 0) return { empty: true };
    const costsAt = (p) => sellerClosingCosts({ ...sellerArgs(v, p), taxAnnual: v.taxAnnual, closingDate: v.closingDate });
    const netAt = (p) => p - costsAt(p).total - v.balance;
    const exact = solveMin(netAt, v.net, 0, 50_000_000);
    const price = Math.ceil(exact / 1000) * 1000;
    state._price = price;
    const sc = costsAt(price);
    return { price, sc, net: netAt(price) };
  },

  render(r, v) {
    if (r.empty) return empty('Enter your net goal', 'Add the cash you’d like to walk away with.');
    const { sc } = r;
    return [
      headline('Sell for at least', money(r.price), `nets about ${money(r.net)} at closing`),
      block('Where the sale price goes', breakdown([
        { label: 'Your net at closing', value: r.net },
        { label: 'Mortgage payoff', value: v.balance },
        { label: 'Commissions & closing costs', value: sc.costs },
        { label: 'Prorated property taxes', value: sc.proratedTax },
      ]), money(r.price)),
      block('Seller costs', rows([
        ['Closing costs', money(sc.costs)],
        ['Prorated property taxes', money(sc.proratedTax)],
        ['Total seller costs', money(sc.total), { total: true }],
      ]) + itemized('Detailed seller costs', [['Seller costs', sc.items], ['Taxes', [['Prorated property taxes (Jan 1 → closing)', sc.proratedTax]]]]), `${pct(sc.total / r.price * 100, 1)} of price`),
      note('Rounded up to the nearest $1,000. Estimates only; your title company’s settlement statement will show exact figures.'),
    ].join('');
  },
};
