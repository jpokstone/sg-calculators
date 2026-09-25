// Reusable field definitions so every calculator asks the same questions the same way.
import { MARKET, PROGRAMS, CLOSING } from './defaults.js';
import { defaultClosingDate, lendersPolicy as lendersPolicyEst } from './finance.js';

export const LOAN_OPTIONS = (types = ['conv', 'fha', 'va', 'usda']) => types.map((t) => [t, PROGRAMS[t].label]);
export const TERM_OPTIONS = [[30, '30 years'], [25, '25 years'], [20, '20 years'], [15, '15 years'], [10, '10 years']];

export const f = {
  loanType: (o = {}) => ({ key: 'loanType', label: 'Loan type', type: 'select', options: LOAN_OPTIONS(o.types), default: 'conv', ...o }),
  rate: (o = {}) => ({ key: 'rate', label: 'Interest rate', type: 'percent', default: MARKET.rate, ...o }),
  term: (o = {}) => ({ key: 'term', label: 'Loan term', type: 'select', options: TERM_OPTIONS, default: MARKET.term, ...o }),
  down: (o = {}) => ({ key: 'down', label: 'Down payment', type: 'pctAmt', default: { pct: MARKET.downPct }, ...o }),
  tax: (o = {}) => ({ key: 'tax', label: 'Property taxes', type: 'pctAmt', default: { pct: MARKET.taxPct }, tip: 'Yearly property tax, as a % of the home’s value or a flat yearly amount. Salt Lake County averages about 0.56% of market value for a primary residence.', group: 'more', ...o }),
  ins: (o = {}) => ({ key: 'ins', label: 'Homeowner’s insurance', type: 'pctAmt', default: { pct: MARKET.insPct }, tip: 'Yearly premium, as a % of the home’s value or a flat yearly amount.', group: 'more', ...o }),
  hoa: (o = {}) => ({ key: 'hoa', label: 'HOA dues', type: 'period', default: { value: '', per: 'mo' }, group: 'more', ...o }),
  closingDate: (o = {}) => ({ key: 'closingDate', label: 'Closing date', type: 'date', default: defaultClosingDate, group: 'more', tip: 'Used to prorate Utah property taxes (paid in arrears) and prepaid interest.', ...o }),
};

// Editable buyer closing-cost line items (group "costs").
export function buyerCostFields(group = 'costs') {
  return [
    { key: 'ccOrigination', label: 'Loan origination', type: 'percent', default: CLOSING.originationPct, group, half: true },
    { key: 'ccUnderwriting', label: 'Underwriting', type: 'money', default: CLOSING.underwriting, group, half: true },
    { key: 'ccAppraisal', label: 'Appraisal', type: 'money', default: CLOSING.appraisal, group, half: true },
    { key: 'ccSettlement', label: 'Settlement / escrow', type: 'money', default: CLOSING.settlementFee, group, half: true },
    { key: 'ccInsMonths', label: 'Prepaid insurance', type: 'number', suffix: 'Months', default: CLOSING.insuranceMonths, group, half: true },
    { key: 'ccTaxMonths', label: 'Tax reserves', type: 'number', suffix: 'Months', default: CLOSING.taxReserveMonths, group, half: true },
    { key: 'prorateTax', label: 'Include seller’s property-tax proration credit', type: 'check', default: true, group, tip: 'Utah property taxes are paid in arrears, so the seller credits the buyer for Jan 1 through closing.' },
  ];
}

/** Build the closing-cost schedule object from normalized values. */
export function costSchedule(v) {
  return {
    ...CLOSING,
    originationPct: v.ccOrigination ?? CLOSING.originationPct,
    underwriting: v.ccUnderwriting ?? CLOSING.underwriting,
    appraisal: v.ccAppraisal ?? CLOSING.appraisal,
    settlementFee: v.ccSettlement ?? CLOSING.settlementFee,
    insuranceMonths: v.ccInsMonths ?? CLOSING.insuranceMonths,
    taxReserveMonths: v.ccTaxMonths ?? CLOSING.taxReserveMonths,
  };
}

export const MI_LABEL = { conv: 'Mortgage insurance (PMI)', fha: 'FHA mortgage insurance', va: 'Mortgage insurance', usda: 'USDA annual fee', cash: 'Mortgage insurance' };
export const UPFRONT_LABEL = { fha: 'FHA upfront MIP', va: 'VA funding fee', usda: 'USDA guarantee fee' };

export const price = (o = {}) => ({ key: 'price', label: 'Home price', type: 'money', default: 500000, required: true, ...o });

// Seller-side costs (listing fee, buyer-agent fee and who pays it, concessions, other).
export function sellerCostFields(group = 'more', o = {}) {
  return [
    { key: 'sellerBroker', label: 'Listing brokerage fee', type: 'percent', default: MARKET.sellerBrokerPct, group, half: true },
    { key: 'buyerBroker', label: 'Buyer brokerage fee', type: 'percent', default: MARKET.buyerBrokerPct, group, half: true },
    { key: 'buyerBrokerBy', label: 'Buyer brokerage fee paid by', type: 'seg', options: [['seller', 'Seller'], ['split', 'Split'], ['buyer', 'Buyer']], default: 'seller', group },
    { key: 'concession', label: 'Seller concession', type: 'pctAmt', default: { pct: 0 }, base: o.base || ((v) => v.price || v._price || 0), group, tip: 'Credit the seller gives the buyer toward closing costs or a rate buydown.' },
    { key: 'misc', label: 'Other seller costs', type: 'money', default: '', placeholder: 'Repairs, home warranty…', group },
  ];
}

/** Arguments for sellerClosingCosts() from normalized values at a given price. */
export function sellerArgs(v, price) {
  return {
    price,
    sellerBrokerPct: v.sellerBroker, buyerBrokerPct: v.buyerBroker, buyerBrokerPaidBy: v.buyerBrokerBy,
    concession: v.concessionMode === '$' ? v.concessionAmt : price * (v.concession || 0) / 100,
    misc: v.misc || 0,
  };
}

/** Refinance closing-cost estimate (lender's policy, settlement, recording, lender fees). */
export function refiCosts(loan, c = CLOSING) {
  const items = [
    ['Lender’s title policy (est.)', lendersPolicyEst(loan)],
    ['Settlement / escrow fee', c.settlementFee], ['Lender CPL', c.lenderCPL], ['Endorsements', c.endorsements],
    ['Underwriting', c.underwriting], ['Appraisal', c.appraisal], ['Credit report', c.creditReport],
    ['E-recording', c.eRecording], ['Recording – trust deed', c.recordingTrustDeed], ['Recording fee', c.recordingFee],
  ];
  return { items, total: items.reduce((t, [, v]) => t + v, 0) };
}
