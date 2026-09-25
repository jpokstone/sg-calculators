// Buydown — temporary (1-0, 2-1, 3-2-1) or permanent (points) rate buydowns, and buydown vs. price cut.
import { MARKET } from '../core/defaults.js';
import { monthlyHousing, buydown, pmt } from '../core/finance.js';
import { money, moneyDelta, pct, monthsToText } from '../core/format.js';
import { f, price } from '../core/presets.js';
import { headline, table, tabs, cards, note, empty, para } from '../core/ui.js';

const base = (v) => v.price;
const TYPES = [['2-1', '2-1 buydown'], ['1-0', '1-0 buydown'], ['3-2-1', '3-2-1 buydown'], ['perm', 'Permanent (discount points)']];
const INFO = {
  '1-0': 'Lowers the rate 1% for year one, then returns to the note rate.',
  '2-1': 'Lowers the rate 2% in year one and 1% in year two, then returns to the note rate.',
  '3-2-1': 'Lowers the rate 3%, 2% and 1% over the first three years, then returns to the note rate.',
  perm: 'Discount points paid at closing lower the rate for the life of the loan.',
};

export default {
  id: 'buydown',
  title: 'Buydown Calculator',
  short: 'Buydown',
  subtitle: 'See what a seller-paid rate buydown costs and saves, and how it compares with the same money as a price reduction.',
  state: { view: 'summary' },
  fields: [
    price(),
    { key: 'bdType', label: 'Buydown type', type: 'select', options: TYPES, default: '2-1' },
    f.down({ base }),
    f.rate({ label: 'Note rate', half: true }),
    f.term({ half: true }),
    { key: 'points', label: 'Discount points', type: 'number', suffix: '% of loan', default: 1, showIf: (v) => v.bdType === 'perm', half: true },
    { key: 'newRate', label: 'Bought-down rate', type: 'percent', default: MARKET.rate - 0.25, showIf: (v) => v.bdType === 'perm', half: true },
    { key: 'contribution', label: 'Seller contribution', type: 'money', default: '', placeholder: 'Leave blank to cover the full cost', hint: 'Used for the buydown and for the price-reduction comparison.' },
    f.tax({ base }), f.ins({ base }), f.hoa(),
  ],

  compute(v) {
    if (v.missing.length || v.price <= 0) return { empty: true };
    const taxAnnual = v.taxMode === '$' ? v.taxAmt : v.price * v.tax / 100;
    const insAnnual = v.insMode === '$' ? v.insAmt : v.price * v.ins / 100;
    const h = monthlyHousing({ price: v.price, downPct: v.down, type: 'conv', rate: v.rate, term: v.term, taxAnnual, insAnnual, hoaMonthly: v.hoaMonthly });
    const other = h.tax + h.ins + h.mi + h.hoa;
    const bd = buydown({ loan: h.loan, rate: v.rate, term: v.term, type: v.bdType, newRate: v.newRate, points: v.points });
    const contribution = v.contribution > 0 ? v.contribution : bd.cost;
    // Same dollars as a price cut instead (same % down).
    const cutPrice = Math.max(0, v.price - contribution);
    const cut = monthlyHousing({ price: cutPrice, downPct: v.down, type: 'conv', rate: v.rate, term: v.term, taxAnnual: v.taxMode === '$' ? v.taxAmt : cutPrice * v.tax / 100, insAnnual: v.insMode === '$' ? v.insAmt : cutPrice * v.ins / 100, hoaMonthly: v.hoaMonthly });
    const cutSave = h.total - cut.total;
    return { h, other, bd, contribution, covered: Math.min(1, contribution / (bd.cost || 1)), cutPrice, cut, cutSave };
  },

  render(r, v, state) {
    if (r.empty) return empty('Enter a home price', 'Add a price to see buydown costs and savings.');
    const { bd, h } = r;
    const perm = v.bdType === 'perm';
    const first = bd.phases[0];
    const out = [tabs('view', [['summary', 'Summary'], ['compare', 'Buydown vs. price cut']], state.view)];
    if (state.view !== 'compare') {
      out.push(
        headline(perm ? 'Cost of points' : 'Buydown cost', money(bd.cost), `${first.label}: ${money(first.pi + r.other)}/mo, saving ${money(first.save)}/mo`),
        para(INFO[v.bdType]),
        table(['', 'Rate', 'Payment', 'Savings'], [
          ['No buydown', pct(v.rate), money(h.total), '—'],
          ...bd.phases.map((ph) => [ph.label, pct(ph.rate), money(ph.pi + r.other), ph.save > 0.5 ? `${money(ph.save)}/mo` : '—']),
        ]),
        perm ? note(bd.breakEvenMonths === Infinity ? 'The bought-down rate isn’t lower, so points never pay for themselves.' : `The points pay for themselves in about <b>${monthsToText(bd.breakEvenMonths)}</b>.`) : '',
        r.covered < 0.999 ? note(`The seller contribution covers ${Math.round(r.covered * 100)}% of the cost. The buyer would pay the remaining ${money(bd.cost - r.contribution)}.`, true) : '',
        note('Payments include taxes, insurance, mortgage insurance and HOA. Buyers qualify at the note rate for temporary buydowns.'),
      );
    } else {
      const months = perm ? 60 : bd.phases.length - 1 > 0 ? (bd.phases.length - 1) * 12 : 12;
      const cutTotal = r.cutSave * months;
      const bdTotal = perm ? Math.max(0, first.save) * months : bd.cost * Math.min(1, r.covered);
      const better = bdTotal >= cutTotal ? 'bd' : 'cut';
      out.push(
        para(`Same ${money(r.contribution)} from the seller, used two ways:`),
        cards([
          { kicker: 'Price reduction', value: `${money(r.cutSave)}/mo`, sub: `saved every month, for the life of the loan`, tone: better === 'cut' ? 'best' : '', badge: better === 'cut' ? 'Saves more early' : '',
            rows: [['New price', money(r.cutPrice)], ['New payment', money(r.cut.total)], [`Saved over ${monthsToText(months)}`, money(cutTotal)]] },
          { kicker: perm ? 'Permanent buydown' : `${v.bdType} buydown`, value: `${money(first.save)}/mo`, sub: perm ? 'saved every month' : `in ${first.label.toLowerCase()}, then less`, tone: better === 'bd' ? 'best' : '', badge: better === 'bd' ? 'Saves more early' : '',
            rows: [['Price', money(v.price)], [`${first.label} payment`, money(first.pi + r.other)], [`Saved over ${monthsToText(months)}`, money(bdTotal)]] },
        ]),
        note(`Over ${monthsToText(months)}, the ${better === 'bd' ? 'buydown' : 'price cut'} saves about ${money(Math.abs(bdTotal - cutTotal))} more. ${perm ? '' : 'After the buydown ends, the price cut keeps saving ' + money(r.cutSave) + '/mo.'}`),
      );
    }
    return out.join('');
  },
};
