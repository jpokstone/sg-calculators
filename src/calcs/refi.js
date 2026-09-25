// REFI — new payment, closing costs, break-even and long-run benefit of refinancing.
import { MARKET } from '../core/defaults.js';
import { pmt, balanceAfter, apr } from '../core/finance.js';
import { money, moneyDelta, pct, monthsToText } from '../core/format.js';
import { refiCosts, TERM_OPTIONS } from '../core/presets.js';
import { headline, cards, stats, rows, block, slider, itemized, note, empty } from '../core/ui.js';

export default {
  id: 'refi',
  title: 'Refinance',
  short: 'Refi',
  subtitle: 'Compare your current mortgage with a new one: payment, closing costs, break-even and the long-run difference.',
  state: { yrs: '5' },
  groups: [{ id: 'main' }, { id: 'more', title: 'Closing costs' }],
  fields: [
    { key: 'balance', label: 'Current loan balance', type: 'money', default: 300000, required: true },
    { key: 'curRate', label: 'Current rate', type: 'percent', default: 7.75, half: true },
    { key: 'curYears', label: 'Years left', type: 'number', suffix: 'Years', default: 28, half: true },
    { key: 'newRate', label: 'New rate', type: 'percent', default: MARKET.rate - 0.5, half: true },
    { key: 'newTerm', label: 'New term', type: 'select', options: TERM_OPTIONS, default: 30, half: true },
    { key: 'cashOut', label: 'Cash out', type: 'money', default: '', placeholder: 'Optional' },
    { key: 'points', label: 'Discount points', type: 'number', suffix: '% of loan', default: 0, group: 'more' },
    { key: 'costs', label: 'Closing costs', type: 'money', default: '', placeholder: 'Estimated automatically', group: 'more' },
    { key: 'roll', label: 'Roll closing costs into the new loan', type: 'check', default: true, group: 'more' },
  ],

  compute(v, state) {
    if (v.missing.length || v.balance <= 0) return { empty: true };
    const N = Math.max(1, Math.min(30, +state.yrs || 5));
    const est = refiCosts(v.balance + v.cashOut);
    const pointsCost = (v.balance + v.cashOut) * v.points / 100;
    const costs = (v.costs > 0 ? v.costs : est.total) + pointsCost;
    const newLoan = v.balance + v.cashOut + (v.roll ? costs : 0);
    const curPI = pmt(v.balance, v.curRate, v.curYears);
    const newPI = pmt(newLoan, v.newRate, v.newTerm);
    const save = curPI - newPI;
    const upfront = v.roll ? 0 : costs;
    // Honest long-run view: payment savings, plus the difference in what you still owe, minus cash paid and cash taken out.
    const months = N * 12;
    const curPaid = curPI * Math.min(months, v.curYears * 12);
    const newPaid = newPI * Math.min(months, v.newTerm * 12);
    const balCur = balanceAfter(v.balance, v.curRate, v.curYears, months);
    const balNew = balanceAfter(newLoan, v.newRate, v.newTerm, months);
    const net = (curPaid - newPaid) + (balCur - balNew) - upfront + v.cashOut;
    return {
      N, est, costs, pointsCost, newLoan, curPI, newPI, save, upfront,
      breakEven: save > 0 ? costs / save : Infinity,
      apr: apr(newLoan, costs, v.newRate, v.newTerm),
      curPaid, newPaid, balCur, balNew, net,
      lifeCur: curPI * v.curYears * 12 - v.balance,
      lifeNew: newPI * v.newTerm * 12 - newLoan,
    };
  },

  render(r, v) {
    if (r.empty) return empty('Enter your loan balance', 'Add your current balance and rate to compare.');
    const lower = r.save >= 0;
    return [
      headline(lower ? 'Monthly savings' : 'Monthly increase', money(Math.abs(r.save)), `${money(r.curPI)} → ${money(r.newPI)} principal & interest`),
      cards([
        { kicker: 'Current loan', value: `${money(r.curPI)}/mo`, sub: `${pct(v.curRate)} · ${v.curYears} yrs left`, rows: [['Balance', money(v.balance)], ['Interest left to pay', money(r.lifeCur)]] },
        { kicker: 'New loan', value: `${money(r.newPI)}/mo`, sub: `${pct(v.newRate)} · ${v.newTerm} yrs`, tone: lower ? 'best' : '', rows: [['New loan amount', money(r.newLoan)], ['Total interest', money(r.lifeNew)]] },
      ]),
      stats([
        ['Break-even', r.breakEven === Infinity ? 'None' : monthsToText(r.breakEven), 'costs ÷ monthly savings'],
        ['Closing costs', money(r.costs), v.roll ? 'rolled into the loan' : 'paid at closing'],
        ['APR (est.)', pct(r.apr, 3), ''],
      ]),
      slider({ key: 'yrs', label: 'If you keep the new loan for', value: r.N, min: 1, max: 30, step: 1, display: `${r.N} year${r.N > 1 ? 's' : ''}`, ticks: ['1', '10', '20', '30'] }),
      block(`After ${r.N} year${r.N > 1 ? 's' : ''}`, rows([
        ['Payments saved', moneyDelta(r.curPaid - r.newPaid)],
        ['Loan balance difference', moneyDelta(r.balCur - r.balNew), { sub: `You’d owe ${money(r.balNew)} instead of ${money(r.balCur)}` }],
        r.upfront ? ['Closing costs paid in cash', '−' + money(r.upfront)] : null,
        v.cashOut ? ['Cash out received', '+' + money(v.cashOut)] : null,
        ['Net benefit', moneyDelta(r.net), { total: true }],
      ])),
      itemized('Estimated closing costs', [['Refinance costs', r.est.items], ...(r.pointsCost ? [['Points', [[`Discount points (${v.points}%)`, r.pointsCost]]]] : [])]),
      v.newTerm > v.curYears ? note(`The new loan restarts at ${v.newTerm} years, longer than the ${v.curYears} you have left. That lowers the payment but can mean more interest overall. The net benefit accounts for the higher remaining balance.`) : '',
      note('Principal & interest only. Taxes and insurance don’t change with a refinance.'),
    ].join('');
  },
};
