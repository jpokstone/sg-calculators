// --
//  MARKET DEFAULTS — edit these values to update every calculator at once.
//  Any of them can also be overridden per-embed with a data attribute,
//  e.g. <div data-sg-calc="monthly-affordability" data-rate="6.875"></div>
// --

export const MARKET = {
  rate: 7.0,              // % — 30-yr fixed (Freddie Mac PMMS was 7.03% on Sep 24, 2026)
  term: 30,               // years
  downPct: 10,            // %
  taxPct: 0.6,            // % of value per year (Salt Lake County effective ≈ 0.56%)
  insPct: 0.35,           // % of value per year (homeowner's insurance)
  sellerBrokerPct: 3,     // %
  buyerBrokerPct: 3,      // %
  appreciationPct: 3.5,   // % per year
  daysToClose: 30,        // default closing date = today + N days
};

// Mortgage-insurance / program rules (editable).
export const PROGRAMS = {
  conv: {
    label: 'Conventional', minDown: 3,
    // Annual PMI as % of loan, by LTV bracket (typical ~740 FICO). Removed at ≤ 80% LTV.
    // Read as "LTV above 95% → 0.60%", "above 90% → 0.45%", etc.
    pmi: [[95, 0.6], [90, 0.45], [85, 0.3], [80, 0.2]],
  },
  fha: { label: 'FHA', minDown: 3.5, upfrontPct: 1.75, annualHighLtv: 0.55, annualLowLtv: 0.5 },
  va: {
    label: 'VA', minDown: 0,
    // First-use funding fee by down payment (financed into the loan).
    fundingFee: [[10, 1.25], [5, 1.5], [0, 2.15]],
  },
  usda: { label: 'USDA', minDown: 0, upfrontPct: 1, annualPct: 0.35 },
  cash: { label: 'All Cash', minDown: 100 },
};

// Closing-cost schedule (Utah). Amounts in dollars unless noted.
export const CLOSING = {
  settlementFee: 450,        // escrow / settlement (charged to each side)
  lenderCPL: 25,
  buyerCPL: 40,
  sellerCPL: 40,
  endorsements: 55,
  originationPct: 0,         // % of loan
  underwriting: 750,
  appraisal: 600,
  creditReport: 20,
  eRecording: 10,
  recordingTrustDeed: 40,
  recordingWarrantyDeed: 40,
  recordingFee: 80,
  reconveyance: 0,           // seller payoff reconveyance / recording
  insuranceMonths: 12,       // prepaid homeowner's insurance
  taxReserveMonths: 2,       // escrow cushion for property tax
  prepaidInterestDays: 15,
};

// --
//  TITLE INSURANCE PREMIUMS — ⚠️ PLACEHOLDER ESTIMATES
//  Replace these with your title partner's Utah rate schedule.
//  Each table is [upToAmount, ratePer1000] tiers applied cumulatively,
//  plus a minimum premium.
// --
export const TITLE_RATES = {
  placeholder: true,
  owners: { min: 450, tiers: [[100000, 6.0], [500000, 4.7], [1000000, 3.6], [Infinity, 2.8]] },
  lenders: { min: 350, tiers: [[100000, 3.4], [500000, 2.9], [1000000, 2.2], [Infinity, 1.8]] },
};
