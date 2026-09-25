// Qualify — "What monthly payment could a lender approve?"
import { MARKET, PROGRAMS } from '../core/defaults.js';
import { monthlyHousing, solveMax } from '../core/finance.js';
import { money, pct } from '../core/format.js';
import { f } from '../core/presets.js';
import { cards, rows, block, note, empty, goto } from '../core/ui.js';

const DEBTS = [['car', 'Car payment'], ['student', 'Student loan'], ['card', 'Credit card (minimum)'], ['personal', 'Personal / credit union loan'], ['support', 'Child / spousal support'], ['other', 'Other']];
const DOWN = { conv: MARKET.downPct, fha: 3.5, va: 0 };

export default {
  id: 'qualify',
  title: 'Qualify',
  subtitle: 'See the monthly housing payment lenders may approve, based on income and monthly debts.',
  groups: [{ id: 'main' }, { id: 'more', title: 'Lender ratios & assumptions' }],
  fields: [
    { key: 'income', label: 'Gross household income (yearly)', type: 'money', default: 120000, required: true, tip: 'Before taxes, for everyone who will be on the loan.' },
    { key: 'debts', label: 'Monthly debt payments', type: 'list', hint: 'Minimum monthly payments only. Don’t include rent, utilities or insurance.', addLabel: 'Add a debt',
      columns: [{ key: 'type', label: 'Debt type', type: 'select', options: DEBTS, default: 'card' }, { key: 'amount', label: 'Monthly payment', type: 'money', placeholder: '0' }],
      default: [{ type: 'car', amount: 450 }] },
    { key: 'convFront', label: 'Conventional: housing', type: 'percent', default: 28, group: 'more', half: true, tip: 'Housing payment ÷ gross monthly income.' },
    { key: 'convBack', label: 'Conventional: total debt', type: 'percent', default: 36, group: 'more', half: true, tip: 'Housing + all debts ÷ gross monthly income. Strong files can go to 45–50%.' },
    { key: 'fhaFront', label: 'FHA: housing', type: 'percent', default: 31, group: 'more', half: true },
    { key: 'fhaBack', label: 'FHA: total debt', type: 'percent', default: 43, group: 'more', half: true },
    { key: 'vaBack', label: 'VA: total debt', type: 'percent', default: 41, group: 'more', tip: 'VA looks at total debt plus a residual-income test.' },
    f.rate({ group: 'more', label: 'Rate for the home-price estimate' }),
  ],

  compute(v) {
    if (v.missing.length || v.income <= 0) return { empty: true };
    const mi = v.income / 12;
    const debts = v.debts.reduce((t, d) => t + (d.amount || 0), 0);
    const calc = (type, front, back) => {
      const byBack = mi * back / 100 - debts;
      const byFront = front == null ? Infinity : mi * front / 100;
      const pay = Math.max(0, Math.min(byFront, byBack));
      const limit = byFront <= byBack ? 'housing ratio' : 'total-debt ratio';
      const downPct = DOWN[type];
      const price = pay > 0 ? Math.floor(solveMax((p) => monthlyHousing({ price: p, downPct, type, rate: v.rate, term: 30, taxAnnual: p * MARKET.taxPct / 100, insAnnual: p * MARKET.insPct / 100 }).total, pay) / 1000) * 1000 : 0;
      return { type, pay, limit, downPct, price };
    };
    return {
      mi, debts, dti: debts / mi * 100,
      list: [calc('conv', v.convFront, v.convBack), calc('fha', v.fhaFront, v.fhaBack), calc('va', null, v.vaBack)],
    };
  },

  render(r, v) {
    if (r.empty) return empty('Enter your income', 'Add yearly household income to see what a lender may approve.');
    const best = r.list.reduce((a, b) => (b.pay > a.pay ? b : a));
    return [
      block('Your numbers', rows([
        ['Gross monthly income', money(r.mi)],
        ['Monthly debt payments', money(r.debts)],
        ['Current debt-to-income', pct(r.dti, 1)],
      ])),
      block('Maximum monthly housing payment', cards(r.list.map((x) => ({
        kicker: PROGRAMS[x.type].label,
        value: `${money(x.pay)}/mo`,
        sub: x.pay > 0 ? `Limited by the ${x.limit}` : 'Debts exceed this program’s limit',
        tone: x === best && x.pay > 0 ? 'best' : '',
        rows: x.pay > 0 ? [
          ['Estimated home price', money(x.price)],
          ['Down payment assumed', pct(x.downPct, 2)],
        ] : null,
        extra: x.pay > 0 ? goto('monthly-affordability', { payment: Math.floor(x.pay), loanType: x.type, rate: v.rate, downPct: x.downPct }, 'See what this buys') : '',
      })))),
      note(`The payment includes principal, interest, property taxes, insurance, mortgage insurance and HOA. Home prices assume ${pct(v.rate)} for 30 years with Salt Lake County–typical taxes and insurance.`),
    ].join('');
  },
};
