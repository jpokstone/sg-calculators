// Monthly Affordability — "What home price does my monthly payment buy?"
import { MARKET, PROGRAMS } from '../core/defaults.js';
import { monthlyHousing, buyerClosingCosts, solveMax } from '../core/finance.js';
import { money, pct } from '../core/format.js';
import { f, buyerCostFields, costSchedule, MI_LABEL, UPFRONT_LABEL } from '../core/presets.js';
import { headline, rows, block, breakdown, slider, itemized, note, empty } from '../core/ui.js';

const priceBase = (v) => v._price || 0;

export default {
  id: 'monthly-affordability',
  title: 'Monthly Affordability',
  short: 'Monthly Affordability',
  subtitle: 'Start with the monthly payment you’re comfortable with and see the home price it buys, plus what you’d need at closing.',
  state: { _price: 0, downPct: MARKET.downPct },
  groups: [{ id: 'main' }, { id: 'more', title: 'Assumptions' }, { id: 'costs', title: 'Closing cost details' }],
  fields: [
    f.loanType(),
    { key: 'payment', label: 'Desired monthly payment', type: 'money', default: 3000, required: true, placeholder: 'e.g. 3,000',
      tip: 'Your total monthly housing payment: principal, interest, property taxes, insurance, mortgage insurance and HOA.' },
    f.rate({ half: true }),
    f.term({ half: true }),
    { key: 'cash', label: 'Cash available to close', type: 'money', default: '', placeholder: 'Optional',
      hint: 'Optional. We’ll check it covers your down payment and closing costs.' },
    f.tax({ base: priceBase }),
    f.ins({ base: priceBase }),
    f.hoa(),
    f.closingDate(),
    ...buyerCostFields('costs'),
  ],

  compute(v, state) {
    const prog = PROGRAMS[v.loanType] || PROGRAMS.conv;
    const downPct = Math.max(prog.minDown, Math.min(30, +state.downPct || 0));
    const c = costSchedule(v);
    const taxAt = (p) => (v.taxMode === '$' ? v.taxAmt : p * v.tax / 100);
    const insAt = (p) => (v.insMode === '$' ? v.insAmt : p * v.ins / 100);
    const housing = (p) => monthlyHousing({ price: p, downPct, type: v.loanType, rate: v.rate, term: v.term, taxAnnual: taxAt(p), insAnnual: insAt(p), hoaMonthly: v.hoaMonthly });
    const closing = (p, h) => buyerClosingCosts({ price: p, loan: h.loan, baseLoan: h.baseLoan, type: v.loanType, rate: v.rate, taxAnnual: taxAt(p), insAnnual: insAt(p), closingDate: v.closingDate, c, prorateTax: v.prorateTax });

    if (v.missing.length || v.payment <= 0) return { empty: true };
    const price = Math.floor(solveMax((p) => housing(p).total, v.payment) / 100) * 100;
    state._price = price;
    if (price < 10000) return { tooLow: true, fixed: housing(0).total };

    const h = housing(price);
    const cc = closing(price, h);
    const cashNeeded = h.down + cc.total;
    let cashLimit = null;
    if (v.cash > 0 && v.cash < cashNeeded) {
      cashLimit = Math.floor(solveMax((p) => { const hh = housing(p); return hh.down + closing(p, hh).total; }, v.cash) / 100) * 100;
    }
    return { prog, downPct, price, h, cc, cashNeeded, cashLimit };
  },

  render(r, v) {
    if (r.empty) return empty('Enter a monthly payment', 'Add the payment you’d like to stay under to see your buying power.');
    if (r.tooLow) return empty('Payment is too low', `Taxes, insurance and HOA alone come to about ${money(r.fixed)}/mo. Try a higher payment.`);
    const { h, cc, prog } = r;
    const upfront = h.upfrontFee > 0 ? `Includes ${money(h.upfrontFee)} ${UPFRONT_LABEL[v.loanType] || 'upfront fee'} financed` : '';
    const out = [
      headline(`Buying power at ${pct(v.rate)}`, money(r.price), `${prog.label} · ${v.term}-year fixed · ${money(v.payment)}/mo`),
      rows([
        ['Loan amount', money(h.loan), { sub: upfront }],
      ]),
      slider({ key: 'downPct', label: 'Down payment', value: r.downPct, min: 0, max: 30, step: 0.5, display: `${pct(r.downPct, 2)} · ${money(h.down)}`, ticks: ['0%', '5%', '10%', '15%', '20%', '25%', '30%'] }),
      prog.minDown > 0 && r.downPct <= prog.minDown ? note(`${prog.label} loans need at least ${prog.minDown}% down.`) : '',
      block('Monthly payment', breakdown([
        { label: 'Principal & interest', value: h.pi },
        { label: 'Property taxes', value: h.tax },
        { label: 'Homeowner’s insurance', value: h.ins },
        { label: MI_LABEL[v.loanType], value: h.mi },
        { label: 'HOA dues', value: h.hoa },
      ]), money(h.total)),
      block('Cash to close', rows([
        ['Down payment', money(h.down)],
        ['Closing costs', money(cc.fixed)],
        ['Prepaids & reserves', money(cc.prepaids)],
        cc.credits ? ['Property-tax proration credit', money(cc.credits), { neg: true }] : null,
        ['Estimated cash to close', money(r.cashNeeded), { total: true }],
      ]) + itemized('Detailed closing costs', cc.groups), money(r.cashNeeded)),
    ];
    if (v.cash > 0) {
      out.push(v.cash >= r.cashNeeded
        ? note(`Your ${money(v.cash)} covers closing with <b>${money(v.cash - r.cashNeeded)}</b> to spare.`)
        : note(`Your ${money(v.cash)} is <b>${money(r.cashNeeded - v.cash)}</b> short at ${pct(r.downPct, 2)} down. With that cash, the most you could buy at ${pct(r.downPct, 2)} down is about <b>${money(r.cashLimit)}</b>.`, true));
    }
    return out.join('');
  },
};
