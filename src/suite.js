// Tabbed hub: <div data-sg-calc="suite"></div>
// Buyers | Sellers toggle, scrollable tabs (a dropdown on narrow screens),
// shareable links (#calculator-id) with working back/forward, and shared
// values (rate, term, loan type, price) carried between tabs.
import { mount, ensureFonts } from './core/engine.js';
import { CSS } from './core/styles.js';
import { esc } from './core/format.js';

const SHARED = ['rate', 'term', 'loanType', 'price']; // carried between tabs in the same group

const SUITE_CSS = `
.suite-nav { display: grid; gap: 14px; margin: 0 0 26px; }
.suite-top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
.suite-grp { display: inline-flex; }
.suite-grp button { min-height: 40px; padding: 0 18px; font-size: 15px; }
.suite-tabs { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: thin; padding-bottom: 2px; scroll-snap-type: x proximity; }
.suite-tabs button { flex: none; scroll-snap-align: start; border: 1px solid var(--sg-khaki); background: var(--sg-bg); color: var(--sg-text);
  padding: 9px 14px; font-size: 14.5px; cursor: pointer; white-space: nowrap; }
.suite-tabs button:hover { border-color: var(--sg-tan); color: var(--sg-primary); }
.suite-tabs button[aria-selected=true] { background: var(--sg-cream); border-color: var(--sg-primary); color: var(--sg-primary); font-weight: 500; box-shadow: inset 0 -2px 0 var(--sg-primary); }
.suite-tabs button:focus-visible { outline: 2px solid var(--sg-primary); outline-offset: 2px; }
.suite-sel { display: none; }
@container (max-width: 560px) { .suite-tabs { display: none; } .suite-sel { display: flex; width: 100%; } .suite-grp { display: flex; width: 100%; } .suite-grp button { flex: 1; } }
.suite-body { border-top: 1px solid var(--sg-khaki); padding-top: 26px; }
`;

export function mountSuite(host, registry, groups, config = {}) {
  ensureFonts();
  const root = host.shadowRoot || host.attachShadow({ mode: 'open' });
  const only = config.tools ? new Set(config.tools.split(',').map((t) => t.trim())) : null;
  const grp = groups.map((g) => ({ ...g, ids: g.ids.filter((id) => registry[id] && (!only || only.has(id))) })).filter((g) => g.ids.length);
  const all = grp.flatMap((g) => g.ids);
  const groupOf = (id) => grp.find((g) => g.ids.includes(id)) || grp[0];
  const shared = {}; // per group id
  let current = null, handle = null, initial = {};

  root.innerHTML = `<style>${CSS}${SUITE_CSS}</style>
    <div class="sg suite">
      ${config.hideTitle ? '' : `<header class="sg-head"><h2 class="sg-title">${esc(config.title || 'Real Estate Calculators')}</h2>${config.subtitle ? `<p class="sg-sub">${esc(config.subtitle)}</p>` : ''}</header>`}
      <nav class="suite-nav" aria-label="Calculators">
        <div class="suite-top">
          ${grp.length > 1 ? `<div class="seg suite-grp" role="group" aria-label="Calculator group">${grp.map((g) => `<button type="button" data-grp="${g.id}">${esc(g.label)}</button>`).join('')}</div>` : ''}
          <div class="ig suite-sel"><select aria-label="Choose a calculator">${grp.map((g) => `<optgroup label="${esc(g.label)}">${g.ids.map((id) => `<option value="${id}">${esc(registry[id].short || registry[id].title)}</option>`).join('')}</optgroup>`).join('')}</select></div>
        </div>
        <div class="suite-tabs" role="tablist"></div>
      </nav>
      <div class="suite-body"></div>
    </div>`;

  const $ = (s) => root.querySelector(s);
  const tabsEl = $('.suite-tabs'), body = $('.suite-body'), sel = $('.suite-sel select');

  function renderTabs(g) {
    tabsEl.innerHTML = g.ids.map((id) => `<button type="button" role="tab" data-tab="${id}" aria-selected="${id === current}">${esc(registry[id].short || registry[id].title)}</button>`).join('');
    root.querySelectorAll('[data-grp]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.grp === g.id)));
  }

  function show(id, values = {}) {
    if (!registry[id] || !all.includes(id)) id = all[0];
    // Carry over only values the visitor actually changed (not another calculator's defaults).
    if (handle && current) {
      const pg = groupOf(current).id; shared[pg] = shared[pg] || {};
      for (const k of SHARED) if (handle.state[k] !== undefined && handle.state[k] !== '' && String(handle.state[k]) !== String(initial[k])) shared[pg][k] = handle.state[k];
    }
    current = id;
    const g = groupOf(id);
    renderTabs(g);
    sel.value = id;
    body.innerHTML = '';
    const el = document.createElement('div');
    body.appendChild(el);
    handle = mount(el, registry[id], {
      overrides: { ...config.overrides, ...(shared[g.id] || {}), ...values },
      config: { brand: config.brand, contact: config.contact },
      inSuite: true,
    });
    initial = { ...handle.state };
    tabsEl.querySelector('[aria-selected=true]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  function go(id, values) {
    if (location.hash !== '#' + id) history.pushState(null, '', '#' + id);
    show(id, values);
  }

  root.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab]');
    if (t) { go(t.dataset.tab); return; }
    const g = e.target.closest('[data-grp]');
    if (g) { const gg = grp.find((x) => x.id === g.dataset.grp); if (gg && !gg.ids.includes(current)) go(gg.ids[0]); }
  });
  sel.addEventListener('change', () => go(sel.value));
  root.addEventListener('sg-goto', (e) => {
    go(e.detail.id, e.detail.values);
    host.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  window.addEventListener('popstate', () => { const id = location.hash.slice(1); if (all.includes(id) && id !== current) show(id); });

  const start = location.hash.slice(1);
  show(all.includes(start) ? start : (config.start && all.includes(config.start) ? config.start : all[0]));
}
