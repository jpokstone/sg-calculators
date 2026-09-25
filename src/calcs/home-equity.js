// Home Equity — home equity loan, HELOC or cash-out refinance.
import { MARKET } from '../core/defaults.js';
import { pmt, apr } from '../core/finance.js';
import { money, pct } from '../core/format.js';
import { refiCosts, TERM_OPTIONS } from '../core/presets.js';
import { headline, rows, block, stats, cards, note, empty, itemized } from '../core/ui.js';

const KINDS = [['heloc', 'HELOC'], ['hel', 'Home equity loan'], ['cashout', 'Cash-out refi']];
const HEL_TERMS = [[5, '5 years'], [10, '10 years'], [15, '15 years'], [20, '20 years'], [30, '30 years']];

export default {
  id: 'home-equity',
  title: 'Home Equity',
  short: 'Home Equity',
  subtitle: 'See how much you could borrow against your home, and the payment, with a HELOC, home equity loan or cash-out refinance.',
  fields: [
    { key: 'kind', label: 'Type of loan', type: 'seg', options: KINDS, default: 'heloc' },
    { key: 'price', label: 'Home value', type: 'money', default: 600000, required: true },
    { key: 'balance', label: 'Current mortgage balance', type: 'money', default: 300000 },
    { key: 'maxLtv', label: 'Max combined loan-to-value', type: 'percent', default: 80, tip: 'Most lenders cap all loans combined at 80–90% of the home’s value.' },
    { key: 'amount', label: 'Amount you want', type: 'money', default: '', placeholder: 'Leave blank for the maximum' },
    { key: 'helocRate', label: 'HELOC rate', type: 'percent', default: 8, showIf: (v) => v.kind === 'heloc', tip: 'Usually variable: prime plus a margin.' },
    { key: 'draw', label: 'Draw period', type: 'number', suffix: 'Years', default: 10, showIf: (v) => v.kind === 'heloc', half: true },
    { key: 'repay', label: 'Repayment period', type: 'number', suffix: 'Years', default: 20, showIf: (v) => v.kind === 'heloc', half: true },
    { key: 'helRate', label: 'Home equity loan rate', type: 'percent', default: 8.25, showIf: (v) => v.kind === 'hel', half: true },
    { key: 'helTerm', label: 'Term', type: 'select', options: HEL_TERMS, default: 15, showIf: (v) => v.kind === 'hel', half: true },
    { key: 'coRate', label: 'New mortgage rate', type: 'percent', default: MARKET.rate + 0.25, showIf: (v) => v.kind === 'cashout', half: true },
    { key: 'coTerm', label: 'New term', type: 'select', options: TERM_OPTIONS, default: 30, showIf: (v) => v.kind === 'cashout', half: true },
    { key: 'curRate', label: 'Current mortgage rate', type: 'percent', default: 4, showIf: (v) => v.kind === 'cashout', half: true },
    { key: 'curYears', label: 'Years left', type: 'number', suffix: 'Years', default: 25, showIf: (v) => v.kind === 'cashout', half: true },
    { key: 'fees', label: 'Lender & closing fees', type: 'money', default: 750, group: 'more', tip: 'HELOCs and home equity loans. A cash-out refi uses a full refinance estimate.' },
  ],

  compute(v) {
    if (v.missing.length || v.price <= 0) return { empty: true };
    const maxTotal = v.price * v.maxLtv / 100;
    const available = Math.max(0, maxTotal - v.balance);
    const amt = v.amount > 0 ? Math.min(v.amount, available) : available;
    const out = { available, amt, over: v.amount > available, ltv: v.balance / v.price * 100, cltv: (v.balance + amt) / v.price * 100 };
    if (v.kind === 'heloc') {
      Object.assign(out, { io: amt * v.helocRate / 1200, rep: pmt(amt, v.helocRate, v.repay), fees: v.fees });
    } else if (v.kind === 'hel') {
      const p = pmt(amt, v.helRate, v.helTerm);
      Object.assign(out, { pay: p, fees: v.fees, apr: apr(amt, v.fees, v.helRate, v.helTerm) });
    } else {
      const newLoan = v.balance + amt;
      const cc = refiCosts(newLoan);
      Object.assign(out, { newLoan, cc, cashInHand: amt - cc.total, newPay: pmt(newLoan, v.coRate, v.coTerm), curPay: pmt(v.balance, v.curRate, v.curYears), apr: apr(newLoan, cc.total, v.coRate, v.coTerm) });
    }
    return out;
  },

  render(r, v) {
    if (r.empty) return empty('Enter the home’s value', 'Add the value and mortgage balance to see what you could borrow.');
    const out = [
      stats([
        ['Current loan-to-value', pct(r.ltv, 1), ''],
        ['Equity you can tap', money(r.available), `at ${pct(v.maxLtv, 2)} combined`],
        ['Combined LTV after', pct(r.cltv, 1), ''],
      ]),
    ];
    if (r.available <= 0) { out.push(note(`Your current balance is already at or above ${pct(v.maxLtv, 2)} of the home’s value, so there’s no equity available at this limit.`, true)); return out.join(''); }
    if (r.over) out.push(note(`That’s more than the ${money(r.available)} available, so the maximum is shown.`, true));
    if (v.kind === 'heloc') {
      out.push(
        headline('HELOC line amount', money(r.amt), `${pct(v.helocRate)} variable rate`),
        cards([
          { kicker: `Draw period · ${v.draw} yrs`, value: `${money(r.io)}/mo`, sub: 'interest-only, if the full line is used' },
          { kicker: `Repayment · ${v.repay} yrs`, value: `${money(r.rep)}/mo`, sub: 'principal & interest' },
        ]),
        rows([['Estimated fees', money(r.fees)]]),
        note('HELOC rates are usually variable, so payments can change. You only pay interest on what you draw.'),
      );
    } else if (v.kind === 'hel') {
      out.push(
        headline('Monthly payment', money(r.pay), `${money(r.amt)} at ${pct(v.helRate)} for ${v.helTerm} years`),
        rows([['Loan amount', money(r.amt)], ['Estimated fees', money(r.fees)], ['APR (est.)', pct(r.apr, 3)], ['Total interest', money(r.pay * v.helTerm * 12 - r.amt)]]),
        note('A fixed-rate second mortgage. Your first mortgage stays as it is.'),
      );
    } else {
      out.push(
        headline('Cash in hand', money(r.cashInHand), `after ${money(r.cc.total)} in estimated closing costs`),
        cards([
          { kicker: 'Current mortgage', value: `${money(r.curPay)}/mo`, sub: `${money(v.balance)} at ${pct(v.curRate)}` },
          { kicker: 'New cash-out loan', value: `${money(r.newPay)}/mo`, sub: `${money(r.newLoan)} at ${pct(v.coRate)} for ${v.coTerm} yrs` },
        ]),
        rows([['Payment change', `${r.newPay >= r.curPay ? '+' : '−'}${money(Math.abs(r.newPay - r.curPay))}/mo`], ['APR (est.)', pct(r.apr, 3)]]),
        itemized('Detailed closing costs', [['Refinance costs', r.cc.items]]),
        r.curRate < v.coRate ? note(`A cash-out refi replaces your ${pct(v.curRate)} mortgage with a ${pct(v.coRate)} one. A HELOC or home equity loan keeps your current rate.`, true) : '',
      );
    }
    out.push(note('Principal & interest only. Taxes and insurance don’t change.'));
    return out.join('');
  },
};
