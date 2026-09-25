// Core real-estate math. Pure functions — no DOM. Unit-tested in test/finance.test.mjs.
import { MARKET, PROGRAMS, CLOSING, TITLE_RATES } from './defaults.js';
import { parseDate } from './format.js';

/** Monthly principal & interest. rate = annual %, years = term. */
export function pmt(principal, rate, years) {
  const n = Math.round(years * 12);
  if (principal <= 0 || n <= 0) return 0;
  const r = rate / 1200;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

/** Loan amount that a given monthly P&I supports. */
export function principalFromPmt(payment, rate, years) {
  const n = Math.round(years * 12);
  if (payment <= 0 || n <= 0) return 0;
  const r = rate / 1200;
  if (r === 0) return payment * n;
  return (payment * (1 - Math.pow(1 + r, -n))) / r;
}

/** Remaining balance after `months` payments. */
export function balanceAfter(principal, rate, years, months) {
  const n = Math.round(years * 12);
  const k = Math.min(Math.max(0, Math.round(months)), n);
  if (principal <= 0) return 0;
  const r = rate / 1200;
  if (r === 0) return principal * (1 - k / n);
  const p = pmt(principal, rate, years);
  return principal * Math.pow(1 + r, k) - (p * (Math.pow(1 + r, k) - 1)) / r;
}

/** Interest paid over the first `months` payments. */
export function interestPaid(principal, rate, years, months) {
  const k = Math.min(Math.round(months), Math.round(years * 12));
  return pmt(principal, rate, years) * k - (principal - balanceAfter(principal, rate, years, k));
}

/** Tiered title premium from a TITLE_RATES table. */
export function tieredPremium(amount, table) {
  if (amount <= 0) return 0;
  let prev = 0, total = 0;
  for (const [upTo, per1000] of table.tiers) {
    const slice = Math.min(amount, upTo) - prev;
    if (slice > 0) total += (slice / 1000) * per1000;
    if (amount <= upTo) break;
    prev = upTo;
  }
  return Math.max(table.min, Math.round(total));
}
export const ownersPolicy = (price) => tieredPremium(price, TITLE_RATES.owners);
export const lendersPolicy = (loan) => tieredPremium(loan, TITLE_RATES.lenders);

/**
 * Loan structure for a purchase: base loan, financed upfront fee, total loan,
 * monthly mortgage insurance.
 */
export function loanStructure({ price, downPct, type = 'conv', rate, term, pmiOverride }) {
  const prog = PROGRAMS[type] || PROGRAMS.conv;
  if (type === 'cash') {
    return { type, down: price, downPct: 100, baseLoan: 0, upfrontFee: 0, upfrontPct: 0, loan: 0, miMonthly: 0, miRate: 0, ltv: 0 };
  }
  const dp = Math.min(100, Math.max(prog.minDown ?? 0, downPct));
  const down = price * dp / 100;
  const baseLoan = Math.max(0, price - down);
  const ltv = price > 0 ? (baseLoan / price) * 100 : 0;
  let upfrontPct = 0, miRate = 0;
  if (type === 'conv') {
    // Brackets read "LTV above X → rate"; walk ascending so the highest matching bracket wins.
    for (const [above, r] of prog.pmi.slice().sort((a, b) => a[0] - b[0])) if (ltv > above + 1e-9) miRate = r;
    if (pmiOverride != null && pmiOverride !== '' && ltv > 80) miRate = +pmiOverride;
  } else if (type === 'fha') {
    upfrontPct = prog.upfrontPct;
    miRate = ltv > 95 ? prog.annualHighLtv : prog.annualLowLtv;
  } else if (type === 'va') {
    for (const [minDown, fee] of prog.fundingFee) if (dp >= minDown) { upfrontPct = fee; break; }
  } else if (type === 'usda') {
    upfrontPct = prog.upfrontPct;
    miRate = prog.annualPct;
  }
  const upfrontFee = baseLoan * upfrontPct / 100;
  const loan = baseLoan + upfrontFee;
  const miMonthly = baseLoan * miRate / 100 / 12;
  return { type, down, downPct: dp, baseLoan, upfrontFee, upfrontPct, loan, miMonthly, miRate, ltv };
}

/** Amount from a "percent of base or flat annual $" pair. */
export const annualAmount = (base, pctVal, amtVal, mode) => (mode === '$' ? amtVal : base * pctVal / 100);

/**
 * Full monthly housing payment (PITI + MI + HOA).
 * taxAnnual / insAnnual are dollars per year.
 */
export function monthlyHousing({ price, downPct, type, rate, term, taxAnnual, insAnnual, hoaMonthly = 0, pmiOverride }) {
  const s = loanStructure({ price, downPct, type, rate, term, pmiOverride });
  const pi = pmt(s.loan, rate, term);
  const tax = taxAnnual / 12;
  const ins = insAnnual / 12;
  const total = pi + tax + ins + s.miMonthly + hoaMonthly;
  return { ...s, pi, tax, ins, mi: s.miMonthly, hoa: hoaMonthly, total };
}

/** Largest x in [lo, hi] with fn(x) <= target, for monotone-increasing fn. */
export function solveMax(fn, target, lo = 0, hi = 50_000_000, iters = 80) {
  if (fn(lo) > target) return lo;
  for (let i = 0; i < iters; i++) {
    const mid = (lo + hi) / 2;
    if (fn(mid) <= target) lo = mid; else hi = mid;
  }
  return lo;
}

/** Smallest x with fn(x) >= target, for monotone-increasing fn. */
export function solveMin(fn, target, lo = 0, hi = 50_000_000, iters = 80) {
  if (fn(hi) < target) return hi;
  for (let i = 0; i < iters; i++) {
    const mid = (lo + hi) / 2;
    if (fn(mid) >= target) hi = mid; else lo = mid;
  }
  return hi;
}

/** Day of year fraction elapsed at `date` (Jan 1 → 0). */
export function yearFraction(date) {
  const d = parseDate(date);
  const start = new Date(d.getFullYear(), 0, 1);
  const end = new Date(d.getFullYear() + 1, 0, 1);
  return (d - start) / (end - start);
}

/** Days from `date` to the end of its month (inclusive of closing day). */
export function daysToMonthEnd(date) {
  const d = parseDate(date);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return last - d.getDate() + 1;
}

export function defaultClosingDate() {
  const d = new Date();
  d.setDate(d.getDate() + MARKET.daysToClose);
  return d;
}

/**
 * Buyer closing costs (Utah). Returns itemized groups and totals.
 * Utah property taxes are paid in arrears, so the seller credits the buyer
 * for Jan 1 → closing.
 */
export function buyerClosingCosts({ price, loan, baseLoan, type = 'conv', rate, taxAnnual, insAnnual, closingDate, c = CLOSING, prorateTax = true, prepaidDays }) {
  const financed = type !== 'cash' && loan > 0;
  const title = [], lender = [], other = [], prepaids = [], credits = [];
  if (financed) {
    title.push([`Lender’s title policy${TITLE_RATES.placeholder ? ' (est.)' : ''}`, lendersPolicy(baseLoan ?? loan)]);
    title.push(['Settlement / escrow fee', c.settlementFee]);
    title.push(['Lender CPL', c.lenderCPL]);
    title.push(['Endorsements', c.endorsements]);
    title.push(['Buyer CPL', c.buyerCPL]);
    if (c.originationPct) lender.push([`Origination (${c.originationPct}%)`, loan * c.originationPct / 100]);
    lender.push(['Underwriting', c.underwriting]);
    lender.push(['Appraisal', c.appraisal]);
    lender.push(['Credit report', c.creditReport]);
    other.push(['E-recording', c.eRecording]);
    other.push(['Recording – trust deed', c.recordingTrustDeed]);
    other.push(['Recording fee', c.recordingFee]);
    prepaids.push([`Homeowner’s insurance (${c.insuranceMonths} mo)`, insAnnual / 12 * c.insuranceMonths]);
    prepaids.push([`Property tax reserve (${c.taxReserveMonths} mo)`, taxAnnual / 12 * c.taxReserveMonths]);
    const days = prepaidDays ?? (closingDate ? daysToMonthEnd(closingDate) : c.prepaidInterestDays);
    prepaids.push([`Prepaid interest (${days} days)`, loan * rate / 100 / 365 * days]);
  } else {
    title.push(['Settlement / escrow fee', c.settlementFee]);
    title.push(['Buyer CPL', c.buyerCPL]);
    other.push(['E-recording', c.eRecording]);
    other.push(['Recording fee', c.recordingFee]);
  }
  if (prorateTax && closingDate) credits.push(['Prorated property tax credit (from seller)', -taxAnnual * yearFraction(closingDate)]);
  const sum = (a) => a.reduce((t, [, v]) => t + v, 0);
  const fixed = sum(title) + sum(lender) + sum(other);
  return {
    groups: [
      ['Title & escrow', title], ['Lender', lender], ['Recording & other', other],
      ['Prepaids', prepaids], ['Credits', credits],
    ].filter(([, items]) => items.length),
    fixed, prepaids: sum(prepaids), credits: sum(credits),
    total: fixed + sum(prepaids) + sum(credits),
  };
}

/**
 * Seller closing costs (Utah). Commission, owner's title policy, settlement,
 * concessions, misc, prorated tax owed (Jan 1 → closing).
 */
export function sellerClosingCosts({ price, sellerBrokerPct = MARKET.sellerBrokerPct, buyerBrokerPct = MARKET.buyerBrokerPct, buyerBrokerPaidBy = 'seller', concession = 0, misc = 0, taxAnnual = 0, closingDate, c = CLOSING, prorateTax = true }) {
  const items = [];
  const buyerShare = buyerBrokerPaidBy === 'seller' ? 1 : buyerBrokerPaidBy === 'split' ? 0.5 : 0;
  items.push([`Listing brokerage fee (${sellerBrokerPct}%)`, price * sellerBrokerPct / 100]);
  if (buyerShare) items.push([`Buyer brokerage fee (${+(buyerBrokerPct * buyerShare).toFixed(3)}%)`, price * buyerBrokerPct / 100 * buyerShare]);
  items.push([`Owner’s title policy${TITLE_RATES.placeholder ? ' (est.)' : ''}`, ownersPolicy(price)]);
  items.push(['Settlement / escrow fee', c.settlementFee]);
  items.push(['Seller CPL', c.sellerCPL]);
  items.push(['Recording – warranty deed', c.recordingWarrantyDeed]);
  if (c.reconveyance) items.push(['Reconveyance', c.reconveyance]);
  if (concession) items.push(['Seller concession', concession]);
  if (misc) items.push(['Misc.', misc]);
  const costs = items.reduce((t, [, v]) => t + v, 0);
  const proratedTax = prorateTax && closingDate ? taxAnnual * yearFraction(closingDate) : 0;
  return { items, costs, proratedTax, total: costs + proratedTax };
}

/** APR: the rate at which the payment on `loan` repays only (loan − financeCharges). */
export function apr(loan, financeCharges, rate, years) {
  if (loan <= 0) return rate;
  const p = pmt(loan, rate, years);
  const net = loan - financeCharges;
  if (net <= 0) return rate;
  // principalFromPmt falls as the rate rises: find r where it equals `net`.
  let lo = 0, hi = 50;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (principalFromPmt(p, mid, years) > net) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Value after `years` of compound growth at `ratePct` per year. */
export const futureValue = (value, ratePct, years) => value * Math.pow(1 + ratePct / 100, years);

/** Months of loan payments between two dates (never negative). */
export function monthsBetween(from, to) {
  const a = parseDate(from), b = parseDate(to);
  return Math.max(0, (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) - (b.getDate() < a.getDate() ? 1 : 0));
}

/** Max seller concession (% of price) by program and LTV. Editable in defaults if needed. */
export function concessionLimit(type, ltv) {
  if (type === 'fha' || type === 'usda') return 6;
  if (type === 'va') return 4;
  if (type === 'cash') return 100;
  return ltv > 90 ? 3 : ltv > 75 ? 6 : 9;
}

/**
 * Temporary or permanent buydown.
 * type: '1-0' | '2-1' | '3-2-1' | 'perm'. For 'perm', pass newRate.
 * Returns yearly rate schedule, P&I per phase and the cost (sum of payment differences, or points).
 */
export function buydown({ loan, rate, term, type, newRate, points = 0 }) {
  const base = pmt(loan, rate, term);
  if (type === 'perm') {
    const nr = newRate ?? rate;
    const p = pmt(loan, nr, term);
    const cost = loan * points / 100;
    const save = base - p;
    return { base, phases: [{ label: `Years 1–${term}`, rate: nr, pi: p, save }], cost, breakEvenMonths: save > 0 ? cost / save : Infinity };
  }
  const steps = type === '3-2-1' ? [3, 2, 1] : type === '2-1' ? [2, 1] : [1];
  const phases = steps.map((d, i) => { const r = Math.max(0, rate - d); const p = pmt(loan, r, term); return { label: `Year ${i + 1}`, rate: r, pi: p, save: base - p }; });
  phases.push({ label: `Years ${steps.length + 1}–${term}`, rate, pi: base, save: 0 });
  const cost = phases.reduce((t, ph) => t + ph.save * 12, 0);
  return { base, phases, cost };
}
