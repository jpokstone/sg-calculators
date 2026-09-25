// Buy Now or Buy Later — buy today and refinance later, or wait for a lower rate at a higher price.
import { MARKET } from '../core/defaults.js';
import { monthlyHousing, buyerClosingCosts, balanceAfter, interestPaid, futureValue, pmt } from '../core/finance.js';
import { money, moneyDelta, pct } from '../core/format.js';
import { f, price, MI_LABEL } from '../core/presets.js';
import { headline, rows, block, breakdown, tabs, slider, stepper, cards, stats, itemized, note, empty } from '../core/ui.js';

const base = (v) => v.price;

export default {
  id: 'buy-now-or-later',
  title: 'Buy Now or Buy Later',
  short: 'Buy Now or Later',
  subtitle: 'Compare buying today and refinancing later with waiting for a lower rate, when prices may be higher.',
  state: { view: 'compare', years: '2', appr: String(MARKET.appreciationPct), futureRate: '' },
  fields: [
    price(),
    f.down({ base }),
    f.rate({ half: true }),
    f.term({ half: true }),
    f.tax({ base }), f.ins({ base }), f.hoa(), f.closingDate(),
    { key: 'refiCost', label: 'Refinance costs', type: 'percent', default: 2, group: 'more', tip: 'Closing costs for the future refinance, as a % of the loan. Rolled into the new loan.' },
  ],

  compute(v, state) {
    if (v.missing.length || v.price <= 0) return { empty: true };
    const years = Math.max(1, Math.min(10, +state.years || 2));
    const appr = +state.appr;
    const fr = state.futureRate === '' ? Math.max(1, v.rate - 1) : +state.futureRate;
    const taxPct = v.taxMode === '$' ? v.taxAmt / v.price * 100 : v.tax;
    const insPct = v.insMode === '$' ? v.insAmt / v.price * 100 : v.ins;
    const at = (p, downPct, rate) => monthlyHousing({ price: p, downPct, type: 'conv', rate, term: v.term, taxAnnual: p * taxPct / 100, insAnnual: p * insPct / 100, hoaMonthly: v.hoaMonthly });
    const now = at(v.price, v.down, v.rate);
    const cc = buyerClosingCosts({ price: v.price, loan: now.loan, baseLoan: now.baseLoan, rate: v.rate, taxAnnual: v.price * taxPct / 100, insAnnual: v.price * insPct / 100, closingDate: v.closingDate });
    const fv = futureValue(v.price, appr, years);
    // Path A: buy now, refinance in N years at the future rate.
    const bal = balanceAfter(now.loan, v.rate, v.term, years * 12);
    const refiLoan = bal * (1 + v.refiCost / 100);
    const refi = at(fv, (1 - refiLoan / fv) * 100, fr);
    const paidA = interestPaid(now.loan, v.rate, v.term, years * 12);
    const equityA = fv - bal;
    // Path B: wait N years, buy at the future price and rate.
    const later = at(fv, v.down, fr);
    const equityB = later.down;
    const gained = fv - v.price;
    const avgBal = (now.loan + bal) / 2;
    const aar = avgBal > 0 ? (paidA - gained) / (avgBal * years) * 100 : 0;
    return { years, appr, fr, now, cc, cashNow: now.down + cc.total, fv, bal, refiLoan, refi, equityA, later, equityB, gained, paidA, aar };
  },

  render(r, v, state) {
    if (r.empty) return empty('Enter a home price', 'Add a price to compare buying now with waiting.');
    const view = state.view;
    const out = [tabs('view', [['compare', 'Now vs. later'], ['now', 'Buy now'], ['appr', 'Appreciation']], view)];
    const yrs = `<div class="blk-h"><h3>Years from now</h3>${stepper('years', r.years, 1, 10, 'years')}</div>`;
    const apprSlider = slider({ key: 'appr', label: 'Home price growth per year', value: r.appr, min: -5, max: 10, step: 0.5, display: `${r.appr > 0 ? '+' : ''}${r.appr}%`, ticks: ['−5%', '0%', '5%', '10%'] });
    if (view === 'now') {
      out.push(
        headline('Monthly payment today', money(r.now.total), `${money(v.price)} at ${pct(v.rate)} · ${pct(v.down, 2)} down`),
        block('Monthly payment', breakdown([
          { label: 'Principal & interest', value: r.now.pi }, { label: 'Property taxes', value: r.now.tax },
          { label: 'Homeowner’s insurance', value: r.now.ins }, { label: MI_LABEL.conv, value: r.now.mi }, { label: 'HOA dues', value: r.now.hoa },
        ]), money(r.now.total)),
        block('Cash to close', rows([
          ['Down payment', money(r.now.down)], ['Closing costs', money(r.cc.fixed)], ['Prepaids & reserves', money(r.cc.prepaids)],
          r.cc.credits ? ['Property-tax proration credit', money(r.cc.credits), { neg: true }] : null,
          ['Estimated cash to close', money(r.cashNow), { total: true }],
        ]) + itemized('Detailed closing costs', r.cc.groups), money(r.cashNow)),
      );
    } else if (view === 'appr') {
      out.push(
        yrs,
        headline(`Estimated value in ${r.years} year${r.years > 1 ? 's' : ''}`, money(r.fv), `${r.gained >= 0 ? 'Up' : 'Down'} ${money(Math.abs(r.gained))} from ${money(v.price)}`),
        apprSlider,
        note('Prices rarely move in a straight line. Try a few growth rates to see how sensitive the answer is.'),
      );
    } else {
      const moreEquity = r.equityA - r.equityB;
      out.push(
        yrs,
        slider({ key: 'futureRate', label: `Interest rate in ${r.years} year${r.years > 1 ? 's' : ''}`, value: r.fr, min: 3, max: 10, step: 0.125, display: pct(r.fr), ticks: ['3%', '5%', '7%', '10%'] }),
        apprSlider,
        cards([
          { kicker: `Buy now, refi in ${r.years} yr${r.years > 1 ? 's' : ''}`, value: `${money(r.refi.total)}/mo`, sub: `after refinancing at ${pct(r.fr)}`, tone: moreEquity >= 0 ? 'best' : '', badge: moreEquity >= 0 ? 'More equity' : '',
            rows: [['Price paid today', money(v.price)], ['Payment until refi', `${money(r.now.total)}/mo`], ['Refinanced loan', money(r.refiLoan)], [`Equity in ${r.years} yrs`, money(r.equityA)]] },
          { kicker: `Wait ${r.years} yr${r.years > 1 ? 's' : ''}, then buy`, value: `${money(r.later.total)}/mo`, sub: `at ${pct(r.fr)} on a ${money(r.fv)} home`, tone: moreEquity < 0 ? 'best' : '', badge: moreEquity < 0 ? 'More equity' : '',
            rows: [['Future price', money(r.fv)], ['Down payment then', money(r.later.down)], ['Loan amount', money(r.later.loan)], [`Equity in ${r.years} yrs`, money(r.equityB)]] },
        ]),
        stats([
          ['Equity advantage', moneyDelta(moreEquity), 'buying now vs. waiting'],
          ['Payment difference', `${moneyDelta(r.refi.total - r.later.total)}/mo`, 'now + refi vs. waiting'],
          ['Appreciation-adjusted rate', pct(r.aar, 2), `interest paid minus appreciation, per year`],
        ]),
        note(`Waiting ${r.years} year${r.years > 1 ? 's' : ''} means paying about ${money(r.fv - v.price)} more for the same home${r.appr < 0 ? ' (less, if prices fall)' : ''}. Refinancing assumes you qualify then and roll ${pct(v.refiCost, 2)} in costs into the new loan.`),
      );
    }
    return out.join('');
  },
};
