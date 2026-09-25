// Embed loader. Finds every <div data-sg-calc="name"> on the page and mounts
// the calculator into it. Usage:
//   <div data-sg-calc="monthly-affordability"></div>
//   <script src="https://jpokstone.github.io/sg-calculators/calculators.js" defer></script>
//
// Optional attributes on the div:
//   data-title / data-subtitle / data-hide-title="true"
//   data-brand="GMR Real Estate"  data-contact="Greg Riley | (801) 808-7457"   (print header)
//   data-<field>="value" to override a default, e.g. data-rate="6.875" data-payment="3500"
import { mount } from './core/engine.js';
import monthlyAffordability from './calcs/monthly-affordability.js';

const REGISTRY = {
  [monthlyAffordability.id]: monthlyAffordability,
};

const RESERVED = new Set(['sgCalc', 'title', 'subtitle', 'hideTitle', 'brand', 'contact', 'sgMounted']);

function mountEl(el) {
  if (el.dataset.sgMounted) return;
  const def = REGISTRY[el.dataset.sgCalc];
  if (!def) { console.warn('[sg-calc] unknown calculator:', el.dataset.sgCalc, '— available:', Object.keys(REGISTRY).join(', ')); return; }
  el.dataset.sgMounted = '1';
  const d = el.dataset, g = window.SGCalcConfig || {};
  const overrides = {};
  for (const [k, v] of Object.entries(d)) if (!RESERVED.has(k)) overrides[k] = v;
  mount(el, def, {
    overrides,
    config: {
      ...(d.title && { title: d.title }),
      ...(d.subtitle != null && { subtitle: d.subtitle }),
      hideTitle: d.hideTitle === 'true',
      brand: d.brand ?? g.brand ?? '',
      contact: d.contact ?? g.contact ?? '',
    },
  });
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
