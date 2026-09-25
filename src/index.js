// Embed loader. Finds every <div data-sg-calc="name"> on the page and mounts
// the calculator into it. Usage:
//   <div data-sg-calc="suite"></div>                  ← tabbed hub with every calculator
//   <div data-sg-calc="monthly-affordability"></div>  ← a single calculator
//   <script src="https://jpokstone.github.io/sg-calculators/calculators.js" defer></script>
//
// Optional attributes on the div:
//   data-title / data-subtitle / data-hide-title="true"
//   data-brand="GMR Real Estate"  data-contact="Greg Riley | (801) 808-7457"   (print header)
//   data-<field>="value" to override a default, e.g. data-rate="6.875" data-payment="3500"
//   Suite only: data-start="refi" (first tab), data-tools="refi,sell-to-net" (limit tabs)
import { mount } from './core/engine.js';
import { mountSuite } from './suite.js';
import monthlyAffordability from './calcs/monthly-affordability.js';
import qualify from './calcs/qualify.js';
import buyNowOrLater from './calcs/buy-now-or-later.js';
import buydown from './calcs/buydown.js';
import buyerCompensation from './calcs/buyer-compensation.js';
import titleEscrow from './calcs/title-escrow.js';
import sellOrRent from './calcs/sell-or-rent.js';
import truvalue from './calcs/truvalue.js';
import sellToNet from './calcs/sell-to-net.js';
import equityReview from './calcs/equity-review.js';
import homeEquity from './calcs/home-equity.js';
import refi from './calcs/refi.js';

const ALL = [monthlyAffordability, qualify, buyNowOrLater, buydown, buyerCompensation, titleEscrow, sellOrRent, truvalue, sellToNet, equityReview, homeEquity, refi];
const REGISTRY = Object.fromEntries(ALL.map((d) => [d.id, d]));

export const GROUPS = [
  { id: 'buyers', label: 'Buyers', ids: ['monthly-affordability', 'qualify', 'buy-now-or-later', 'buydown', 'buyer-compensation', 'title-escrow', 'sell-or-rent'] },
  { id: 'sellers', label: 'Sellers & owners', ids: ['truvalue', 'sell-to-net', 'equity-review', 'home-equity', 'refi'] },
];

const RESERVED = new Set(['sgCalc', 'title', 'subtitle', 'hideTitle', 'brand', 'contact', 'sgMounted', 'start', 'tools']);

// Mobile "fast tap" scripts on host sites (FastClick and similar) listen for touches on the
// page, cancel the native tap and re-send a click to event.target. Shadow DOM retargets that
// to our outer <div>, so taps never reach tabs, selects or inputs. Keeping touch events inside
// the widget lets the browser handle taps natively. Page scrolling is unaffected.
const TOUCH = ['touchstart', 'touchmove', 'touchend', 'touchcancel'];
function isolateTouches(el) {
  for (const t of TOUCH) el.addEventListener(t, (e) => e.stopPropagation(), { passive: true });
}

function mountEl(el) {
  if (el.dataset.sgMounted) return;
  isolateTouches(el);
  const d = el.dataset, g = window.SGCalcConfig || {};
  const overrides = {};
  for (const [k, v] of Object.entries(d)) if (!RESERVED.has(k)) overrides[k] = v;
  const config = {
    ...(d.title && { title: d.title }),
    ...(d.subtitle != null && { subtitle: d.subtitle }),
    hideTitle: d.hideTitle === 'true',
    brand: d.brand ?? g.brand ?? '',
    contact: d.contact ?? g.contact ?? '',
  };
  if (d.sgCalc === 'suite') {
    el.dataset.sgMounted = '1';
    mountSuite(el, REGISTRY, GROUPS, { ...config, overrides, start: d.start, tools: d.tools });
    return;
  }
  const def = REGISTRY[d.sgCalc];
  if (!def) { console.warn('[sg-calc] unknown calculator:', d.sgCalc, '— available: suite,', Object.keys(REGISTRY).join(', ')); return; }
  el.dataset.sgMounted = '1';
  mount(el, def, { overrides, config });
}

function scan(root = document) { root.querySelectorAll('[data-sg-calc]').forEach(mountEl); }

window.SGCalculators = { mount: mountEl, scan, list: () => Object.keys(REGISTRY), registry: REGISTRY };

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => scan());
else scan();
// Page builders sometimes inject embed HTML after load — watch for it.
new MutationObserver((muts) => {
  for (const m of muts) for (const n of m.addedNodes) if (n.nodeType === 1) {
    if (n.matches?.('[data-sg-calc]')) mountEl(n); else if (n.querySelector) scan(n);
  }
}).observe(document.documentElement, { childList: true, subtree: true });
