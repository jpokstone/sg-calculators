// Reusable field definitions so every calculator asks the same questions the same way.
import { MARKET, PROGRAMS, CLOSING } from './defaults.js';
import { defaultClosingDate } from './finance.js';

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
