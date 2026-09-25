// Buyer Agent Compensation — three ways to handle the buyer-agent fee.
import { monthlyHousing, buyerClosingCosts, concessionLimit } from '../core/finance.js';
import { money, moneyDelta, pct } from '../core/format.js';
import { f, price } from '../core/presets.js';
import { cards, table, seg, note, empty, para } from '../core/ui.js';

const base = (v) => v.price;

export default {
  id: 'buyer-compensation',
  title: 'Buyer Agent Compensation',
  short: 'Agent Compensation',
  subtitle: 'Compare paying the buyer-agent fee yourself, asking the seller to cover it, or building it into a higher offer.',
  state: { share: '100' },
  fields: [
    price(),
    f.loanType({ types: ['conv', 'fha', 'va', 'usda', 'cash'] }),
    f.down({ base, showIf: (v) => v.loanType !== 'cash' }),
    f.rate({ half: true, showIf: (v) => v.loanType !== 'cash' }),
    f.term({ half: true, showIf: (v) => v.loanType !== 'cash' }),
    { key: 'comp', label: 'Buyer agent compensation', type: 'pctAmt', default: { pct: 3 }, base, tip: 'The amount in the buyer’s written agreement with their agent.' },
    f.tax({ base }), f.ins({ base }), f.hoa(), f.closingDate(),
  ],

  compute(v, state) {
    if (v.missing.length || v.price <= 0) return { empty: true };
    const cash = v.loanType === 'cash';
    const share = (+state.share || 100) / 100;
    const compPct = v.compMode === '$' ? v.compAmt / v.price * 100 : v.comp;
    const scenario = (p, sellerShare) => {
      const taxAnnual = v.taxMode === '$' ? v.taxAmt : p * v.tax / 100;
      const insAnnual = v.insMode === '$' ? v.insAmt : p * v.ins / 100;
      const h = monthlyHousing({ price: p, downPct: cash ? 100 : v.down, type: v.loanType, rate: v.rate, term: v.term, taxAnnual, insAnnual, hoaMonthly: v.hoaMonthly });
      const cc = buyerClosingCosts({ price: p, loan: h.loan, baseLoan: h.baseLoan, type: v.loanType, rate: v.rate, taxAnnual, insAnnual, closingDate: v.closingDate });
      const comp = p * compPct / 100;
      const concession = comp * sellerShare;
      const limitPct = concessionLimit(v.loanType, h.ltv);
      return { p, h, cc, comp, concession, buyerPays: comp - concession, cashToClose: h.down + cc.total + comp - concession, pay: cash ? h.tax + h.ins + h.hoa : h.total, overLimit: concession > p * limitPct / 100, limitPct };
    };
    const A = scenario(v.price, 0);
    const B = scenario(v.price, share);
    const rolled = Math.ceil(v.price / (1 - share * compPct / 100) / 1000) * 1000;
    const C = scenario(rolled, share);
    return { A, B, C, share, compPct, cash };
  },

  render(r) {
    if (r.empty) return empty('Enter a home price', 'Add the price to compare how the agent fee can be handled.');
    const { A, B, C } = r;
    const opts = [
      { k: 'Option 1 · Buyer pays', s: A, why: 'No seller help. The fee is added to your cash to close.' },
      { k: 'Option 2 · Seller pays', s: B, why: `The seller gives a concession covering ${Math.round(r.share * 100)}% of the fee.` },
      { k: 'Option 3 · Rolled into offer', s: C, why: `Offer ${money(C.p)} and ask the seller to cover the fee, so it’s financed instead of paid at closing.` },
    ];
    const least = opts.reduce((a, b) => (b.s.cashToClose < a.s.cashToClose ? b : a));
    const col = (fn) => opts.map((o) => fn(o.s));
    return [
      seg('share', [['100', 'Seller covers 100%'], ['50', 'Seller covers 50%']], String(Math.round(r.share * 100)), 'Share of the fee the seller covers'),
      cards(opts.map((o) => ({
        kicker: o.k, value: money(o.s.cashToClose), sub: `cash to close · ${money(o.s.pay)}/mo`,
        tone: o === least ? 'best' : '', badge: o === least ? 'Least cash' : '',
        rows: [
          ['Offer price', money(o.s.p)],
          ['Buyer pays agent at closing', money(o.s.buyerPays)],
          ['Seller concession', money(o.s.concession)],
          o.s !== A ? ['vs. Option 1', `${moneyDelta(o.s.cashToClose - A.cashToClose)} cash · ${moneyDelta(o.s.pay - A.pay)}/mo`] : null,
        ],
        extra: para(o.why),
      }))),
      table(['', 'Option 1', 'Option 2', 'Option 3'], [
        ['Offer price', ...col((s) => money(s.p))],
        ['Down payment', ...col((s) => money(s.h.down))],
        ['Closing costs & prepaids', ...col((s) => money(s.cc.total))],
        ['Agent fee', ...col((s) => money(s.comp))],
        ['Seller concession', ...col((s) => (s.concession ? '−' + money(s.concession) : '$0'))],
        ['Cash to close', ...col((s) => money(s.cashToClose)), { total: true }],
        r.cash ? null : ['Monthly payment', ...col((s) => money(s.pay)), { strong: true }],
      ]),
      [B, C].some((s) => s.overLimit) ? note(`Heads up: this concession is above the usual ${B.limitPct}% limit for this loan type. The lender may cap it.`, true) : '',
      note(`Agent fee: ${pct(r.compPct, 3)} of the offer price. Seller concessions can’t exceed the buyer’s actual closing costs and fees.`),
    ].join('');
  },
};
