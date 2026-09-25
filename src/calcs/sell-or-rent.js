// Sell or Rent — sell today, or keep the home as a rental for N years and sell then?
import { MARKET } from '../core/defaults.js';
import { pmt, balanceAfter, sellerClosingCosts, futureValue } from '../core/finance.js';
import { money, moneyDelta, pct } from '../core/format.js';
import { f, sellerCostFields, sellerArgs } from '../core/presets.js';
import { cards, stats, slider, note, empty } from '../core/ui.js';

const base = (v) => v.price;
const BRACKETS = [[0, '0%'], [10, '10%'], [12, '12%'], [22, '22%'], [24, '24%'], [32, '32%'], [35, '35%'], [37, '37%']];

export default {
  id: 'sell-or-rent',
  title: 'Sell or Rent',
  short: 'Sell or Rent',
  subtitle: 'Compare the cash from selling today with renting the home out for a few years and selling later.',
  state: { years: '5' },
  groups: [{ id: 'main' }, { id: 'rental', title: 'Rental assumptions' }, { id: 'more', title: 'Selling costs' }],
  fields: [
    { key: 'price', label: 'What it would sell for today', type: 'money', default: 550000, required: true },
    { key: 'balance', label: 'Mortgage balance', type: 'money', default: 280000 },
    { key: 'loanRate', label: 'Mortgage rate', type: 'percent', default: 4, half: true },
    { key: 'yearsLeft', label: 'Years left on loan', type: 'number', suffix: 'Years', default: 25, half: true },
    { key: 'rent', label: 'Expected monthly rent', type: 'money', default: 2800, required: true },
    { key: 'appreciation', label: 'Home price growth', type: 'percent', default: 3, group: 'rental', half: true, tip: 'Per year.' },
    { key: 'rentGrowth', label: 'Rent growth', type: 'percent', default: 2, group: 'rental', half: true, tip: 'Per year.' },
    { key: 'vacancy', label: 'Vacancy', type: 'percent', default: 5, group: 'rental', half: true, tip: '% of rent lost to empty months.' },
    { key: 'mgmt', label: 'Property management', type: 'percent', default: 8, group: 'rental', half: true, tip: '% of rent. Use 0 if you’ll self-manage.' },
    { key: 'maint', label: 'Maintenance & repairs', type: 'percent', default: 1, group: 'rental', tip: '% of home value per year.' },
    { key: 'tax', label: 'Property taxes as a rental', type: 'pctAmt', default: { pct: 1.0 }, base, group: 'rental', tip: 'Utah’s 45% primary-residence exemption doesn’t apply to rentals, so taxes usually go up (about 1% of value).' },
    { key: 'ins', label: 'Landlord insurance', type: 'pctAmt', default: { pct: 0.4 }, base, group: 'rental' },
    f.hoa({ group: 'rental' }),
    { key: 'bracket', label: 'Your income tax bracket', type: 'select', options: BRACKETS, default: 22, group: 'rental', tip: 'Used for the depreciation deduction estimate.' },
    { key: 'origPrice', label: 'Original purchase price', type: 'money', default: 350000, group: 'rental', tip: 'Depreciation is based on what you paid (building only, about 80%).' },
    { key: 'invest', label: 'Return on cash if you sell now', type: 'percent', default: 0, group: 'rental', tip: 'Optional. What the sale proceeds could earn elsewhere, per year.' },
    ...sellerCostFields('more'),
    f.closingDate({ group: 'more' }),
  ],

  compute(v, state) {
    if (v.missing.length || v.price <= 0) return { empty: true };
    const N = Math.max(1, Math.min(30, +state.years || 5));
    const taxPct = v.taxMode === '$' ? v.taxAmt / v.price * 100 : v.tax;
    const insPct = v.insMode === '$' ? v.insAmt / v.price * 100 : v.ins;
    // Sell today.
    const now = sellerClosingCosts({ ...sellerArgs(v, v.price), taxAnnual: v.price * MARKET.taxPct / 100, closingDate: v.closingDate });
    const netNow = v.price - now.total - v.balance;
    const netNowGrown = futureValue(netNow, v.invest, N);
    // Rent for N years.
    const piMonthly = pmt(v.balance, v.loanRate, v.yearsLeft);
    let cash = 0, year1 = 0;
    for (let y = 1; y <= N; y++) {
      const value = futureValue(v.price, v.appreciation, y - 1);
      const rent = v.rent * 12 * Math.pow(1 + v.rentGrowth / 100, y - 1);
      const lost = rent * (v.vacancy + v.mgmt) / 100;
      const costs = value * (v.maint + taxPct + insPct) / 100 + v.hoaMonthly * 12;
      const monthsPaid = Math.max(0, Math.min(12, v.yearsLeft * 12 - (y - 1) * 12));
      const flow = rent - lost - costs - piMonthly * monthsPaid;
      cash += flow;
      if (y === 1) year1 = flow;
    }
    const fv = futureValue(v.price, v.appreciation, N);
    const later = sellerClosingCosts({ ...sellerArgs(v, fv), taxAnnual: fv * taxPct / 100, prorateTax: false });
    const payoff = balanceAfter(v.balance, v.loanRate, v.yearsLeft, N * 12);
    const dep = (v.origPrice > 0 ? v.origPrice : v.price) * 0.8 / 27.5 * N;
    const depSavings = dep * v.bracket / 100;
    const recapture = dep * Math.min(25, v.bracket) / 100;
    const saleLater = fv - later.costs - payoff;
    const rentTotal = cash + saleLater + depSavings - recapture;
    return { N, netNow, netNowGrown, now, cash, year1, fv, later, payoff, depSavings, recapture, saleLater, rentTotal, piMonthly };
  },

  render(r, v) {
    if (r.empty) return empty('Enter the home’s value', 'Add today’s sale price and expected rent to compare.');
    const sellWins = r.netNowGrown >= r.rentTotal;
    return [
      slider({ key: 'years', label: 'Years as a rental', value: r.N, min: 1, max: 30, step: 1, display: `${r.N} year${r.N > 1 ? 's' : ''}`, ticks: ['1', '10', '20', '30'] }),
      cards([
        { kicker: 'Sell now', value: money(r.netNow), sub: v.invest > 0 ? `cash today · about ${money(r.netNowGrown)} in ${r.N} yrs at ${pct(v.invest, 2)}` : 'cash at closing',
          tone: sellWins ? 'best' : '', badge: sellWins ? 'Comes out ahead' : '',
          rows: [['Sale price', money(v.price)], ['Selling costs & prorated tax', '−' + money(r.now.total)], ['Loan payoff', '−' + money(v.balance)]] },
        { kicker: `Rent ${r.N} yrs, then sell`, value: money(r.rentTotal), sub: `total cash by year ${r.N}`,
          tone: sellWins ? '' : 'best', badge: sellWins ? '' : 'Comes out ahead',
          rows: [
            ['Rental cash flow (total)', moneyDelta(r.cash)],
            [`Sale price in ${r.N} yrs`, money(r.fv)],
            ['Selling costs then', '−' + money(r.later.costs)],
            ['Loan payoff then', '−' + money(r.payoff)],
            ['Depreciation tax savings', '+' + money(r.depSavings)],
            ['Depreciation recapture at sale', '−' + money(r.recapture)],
          ] },
      ]),
      stats([
        ['Year-1 cash flow', `${moneyDelta(r.year1 / 12)}/mo`, 'rent minus all costs'],
        ['Mortgage payment', `${money(r.piMonthly)}/mo`, 'principal & interest'],
        ['Difference', moneyDelta(r.rentTotal - r.netNowGrown), `renting vs. selling, by year ${r.N}`],
      ]),
      r.N > 3 ? note('Renting for more than 3 years usually ends the primary-residence capital-gains exclusion (you must have lived there 2 of the last 5 years). Capital-gains tax isn’t included here, so talk with a tax advisor.', true) : '',
      note('Estimates only. Rental cash flow includes vacancy, management, maintenance, taxes, insurance, HOA and the mortgage payment.'),
    ].join('');
  },
};
