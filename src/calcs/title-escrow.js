// Title & Escrow Closing Fees — title premiums, settlement and recording fees by transaction side.
import { MARKET, CLOSING, TITLE_RATES } from '../core/defaults.js';
import { lendersPolicy, ownersPolicy, yearFraction } from '../core/finance.js';
import { money } from '../core/format.js';
import { f } from '../core/presets.js';
import { headline, block, rows, note, empty } from '../core/ui.js';

const PROGRAMS = [['buy', 'Buyer, financed'], ['cash', 'Buyer, cash'], ['sell', 'Seller'], ['refi', 'Refinance']];
const est = TITLE_RATES.placeholder ? ' (est.)' : '';

export default {
  id: 'title-escrow',
  title: 'Title & Escrow Fees',
  short: 'Title & Escrow',
  subtitle: 'Estimate title insurance, settlement and recording fees for buyers, sellers and refinances in Utah.',
  groups: [{ id: 'main' }, { id: 'more', title: 'Fee schedule' }],
  fields: [
    { key: 'program', label: 'Transaction', type: 'seg', options: PROGRAMS, default: 'buy' },
    { key: 'price', label: 'Sale price', type: 'money', default: 500000, required: true, showIf: (v) => v.program !== 'refi' },
    { key: 'downPct', label: 'Down payment', type: 'percent', default: MARKET.downPct, showIf: (v) => v.program === 'buy' },
    { key: 'loanAmt', label: 'New loan amount', type: 'money', default: 350000, showIf: (v) => v.program === 'refi' },
    { key: 'taxAnnual', label: 'Yearly property taxes', type: 'money', default: 3000, showIf: (v) => v.program !== 'refi', tip: 'Used for the Jan 1 → closing proration. Utah taxes are paid in arrears, so the seller credits the buyer.' },
    f.closingDate({ group: 'main', showIf: (v) => v.program !== 'refi' }),
    { key: 'settlement', label: 'Settlement / escrow fee', type: 'money', default: CLOSING.settlementFee, group: 'more', half: true },
    { key: 'cpl', label: 'Closing protection letter', type: 'money', default: CLOSING.buyerCPL, group: 'more', half: true },
    { key: 'endorse', label: 'Lender endorsements', type: 'money', default: CLOSING.endorsements, group: 'more', half: true },
    { key: 'recording', label: 'Recording (per document)', type: 'money', default: CLOSING.recordingTrustDeed, group: 'more', half: true },
  ],

  compute(v) {
    const p = v.program;
    if (p !== 'refi' && (v.missing.length || v.price <= 0)) return { empty: true };
    const title = [], rec = [], other = [];
    const loan = p === 'buy' ? v.price * (1 - v.downPct / 100) : p === 'refi' ? v.loanAmt : 0;
    if (p === 'buy' || p === 'refi') {
      title.push([`Lender’s title policy${est}`, lendersPolicy(loan)], ['Settlement / escrow fee', v.settlement], ['Lender CPL', CLOSING.lenderCPL], ['Endorsements', v.endorse]);
      if (p === 'buy') title.push(['Buyer CPL', v.cpl]);
      rec.push(['E-recording', CLOSING.eRecording], ['Recording – trust deed', v.recording], ['Recording fee', CLOSING.recordingFee]);
    } else if (p === 'cash') {
      title.push(['Settlement / escrow fee', v.settlement], ['Buyer CPL', v.cpl]);
      rec.push(['E-recording', CLOSING.eRecording], ['Recording fee', CLOSING.recordingFee]);
    } else {
      title.push([`Owner’s title policy${est}`, ownersPolicy(v.price)], ['Settlement / escrow fee', v.settlement], ['Seller CPL', v.cpl]);
      rec.push(['Recording – warranty deed', v.recording]);
    }
    if (p !== 'refi' && v.closingDate && v.taxAnnual > 0) {
      const pr = v.taxAnnual * yearFraction(v.closingDate);
      other.push(p === 'sell' ? ['Prorated property taxes owed', pr] : ['Prorated property tax credit (from seller)', -pr]);
    }
    const sum = (a) => a.reduce((t, [, x]) => t + x, 0);
    const fees = sum(title) + sum(rec);
    return { p, loan, title, rec, other, fees, total: fees + sum(other) };
  },

  render(r) {
    if (r.empty) return empty('Enter a sale price', 'Add a price to estimate title and escrow fees.');
    const side = { buy: 'Buyer', cash: 'Buyer', sell: 'Seller', refi: 'Borrower' }[r.p];
    const out = [
      headline(`${side} title & escrow fees`, money(r.fees), r.loan ? `Loan amount ${money(r.loan)}` : ''),
      block('Title & escrow', rows(r.title.map(([l, x]) => [l, money(x)]))),
      block('Recording', rows(r.rec.map(([l, x]) => [l, money(x)]))),
    ];
    if (r.other.length) out.push(block('Proration', rows([...r.other.map(([l, x]) => [l, money(x), { neg: x < 0 }]), [r.total < 0 ? 'Net credit to you' : 'Total with proration', money(Math.abs(r.total)), { total: true }]])));
    if (r.p === 'buy' || r.p === 'cash') out.push(note('In Utah the seller customarily pays for the owner’s title policy, so it isn’t included here.'));
    if (TITLE_RATES.placeholder) out.push(note('Title premiums are estimates until your title company’s Utah rate sheet is added.', true));
    out.push(note('Lender fees, prepaids and down payment aren’t included. See Monthly Affordability for a full cash-to-close estimate.'));
    return out.join('');
  },
};
