// Mounts a calculator definition into a host element (Shadow DOM), keeps state,
// re-renders results on every change, and produces the Print / Save PDF report.
import { CSS, PRINT_CSS, FONT_HREF, TOKENS } from './styles.js';
import { num, esc, grouped, isoDate, niceDate, money, pct } from './format.js';

const DISCLAIMER = 'Estimates only, for illustration. Actual rates, taxes, insurance, fees and loan terms vary by lender, title company and property. This is not a loan offer or commitment to lend.';

const PRINT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2"/><path d="M6 14h12v7H6z"/></svg>';

let fontsInjected = false;
export function ensureFonts(doc = document) {
  if (fontsInjected || doc.querySelector(`link[href="${FONT_HREF}"]`)) { fontsInjected = true; return; }
  // @font-face must live in the document (not the shadow root) to apply inside Shadow DOM.
  for (const [rel, href, cross] of [['preconnect', 'https://fonts.googleapis.com'], ['preconnect', 'https://fonts.gstatic.com', true], ['stylesheet', FONT_HREF]]) {
    const l = doc.createElement('link'); l.rel = rel; l.href = href; if (cross) l.crossOrigin = '';
    doc.head.appendChild(l);
  }
  fontsInjected = true;
}

// -- field rendering --
function tipHtml(t) { return t ? `<span class="tip" tabindex="0" role="img" aria-label="${esc(t)}" data-tip="${esc(t)}">i</span>` : ''; }

function displayMoney(v) { const n = num(v, NaN); return Number.isFinite(n) ? grouped(n) : ''; }

function fieldHtml(f, s, uid) {
  const id = `${uid}-${f.key}`;
  const label = `<label class="f-label" for="${id}"><span class="lbl">${esc(f.label)}${tipHtml(f.tip)}</span>${f.labelRight || ''}</label>`;
  const hint = f.hint ? `<div class="f-hint">${esc(f.hint)}</div>` : '';
  const ph = f.placeholder ? ` placeholder="${esc(f.placeholder)}"` : '';
  const txt = (key, val, extra = '') => `<input id="${id}" type="text" inputmode="decimal" autocomplete="off" data-k="${key}" data-fmt="${f.type === 'percent' || f.type === 'number' ? 'n' : 'm'}" value="${esc(val)}"${ph}${extra}>`;
  let body = '';
  switch (f.type) {
    case 'money':
      body = `<div class="ig"><span class="ad">$</span>${txt(f.key, displayMoney(s[f.key]))}</div>`; break;
    case 'percent':
      body = `<div class="ig">${txt(f.key, s[f.key] ?? '')}<span class="ad r">%</span></div>`; break;
    case 'number':
      body = `<div class="ig">${f.prefix ? `<span class="ad">${esc(f.prefix)}</span>` : ''}${txt(f.key, s[f.key] ?? '')}${f.suffix ? `<span class="ad r">${esc(f.suffix)}</span>` : ''}</div>`; break;
    case 'pctAmt': {
      const mode = s[f.key + 'Mode'] || '%';
      const val = mode === '%' ? (s[f.key] ?? '') : displayMoney(s[f.key + 'Amt']);
      body = `<div class="ig"><input id="${id}" type="text" inputmode="decimal" autocomplete="off" data-k="${f.key}" data-pa="1" data-fmt="${mode === '%' ? 'n' : 'm'}" value="${esc(val)}"${ph}>
        <span class="seg" role="group" aria-label="${esc(f.label)} as percent or dollars">
          <button type="button" data-seg="${f.key}Mode" data-v="%" aria-pressed="${mode === '%'}">%</button>
          <button type="button" data-seg="${f.key}Mode" data-v="$" aria-pressed="${mode === '$'}">$</button></span></div>`;
      break;
    }
    case 'period': {
      const per = s[f.key + 'Per'] || 'mo';
      body = `<div class="ig"><span class="ad">$</span>${txt(f.key, displayMoney(s[f.key]))}
        <span class="seg" role="group" aria-label="${esc(f.label)} period">
          <button type="button" data-seg="${f.key}Per" data-v="mo" aria-pressed="${per === 'mo'}">Mo</button>
          <button type="button" data-seg="${f.key}Per" data-v="yr" aria-pressed="${per === 'yr'}">Yr</button></span></div>`;
      break;
    }
    case 'select':
      body = `<div class="ig"><select id="${id}" data-k="${f.key}">${f.options.map(([v, l]) => `<option value="${esc(v)}"${String(s[f.key]) === String(v) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></div>`; break;
    case 'seg':
      body = `<div class="seg block" role="group" aria-label="${esc(f.label)}">${f.options.map(([v, l]) => `<button type="button" data-seg="${f.key}" data-v="${esc(v)}" aria-pressed="${String(s[f.key]) === String(v)}">${esc(l)}</button>`).join('')}</div>`; break;
    case 'date':
      body = `<div class="ig"><input id="${id}" type="date" data-k="${f.key}" value="${esc(s[f.key] || '')}"></div>`; break;
    case 'text':
      body = `<div class="ig"><input id="${id}" type="text" autocomplete="off" data-k="${f.key}" data-fmt="t" value="${esc(s[f.key] || '')}"${ph}></div>`; break;
    case 'check':
      return `<div class="f" data-field="${f.key}"><label class="chk"><input type="checkbox" data-k="${f.key}"${s[f.key] ? ' checked' : ''}> ${esc(f.label)}${tipHtml(f.tip)}</label>${hint}</div>`;
    default:
      body = '';
  }
  return `<div class="f" data-field="${f.key}">${label}${body}${hint}</div>`;
}

function fieldsHtml(list, s, uid) {
  let out = '', pending = null;
  for (const f of list) {
    const h = fieldHtml(f, s, uid);
    if (f.half) {
      if (pending) { out += `<div class="row2">${pending}${h}</div>`; pending = null; } else pending = h;
    } else { if (pending) { out += pending; pending = null; } out += h; }
  }
  return out + (pending || '');
}

// -- state --
function initialState(def, overrides) {
  const s = {};
  for (const f of def.fields) {
    const d = typeof f.default === 'function' ? f.default() : f.default;
    if (f.type === 'pctAmt') { s[f.key] = d?.pct ?? d ?? ''; s[f.key + 'Amt'] = d?.amt ?? ''; s[f.key + 'Mode'] = d?.mode ?? '%'; }
    else if (f.type === 'period') { s[f.key] = d?.value ?? d ?? ''; s[f.key + 'Per'] = d?.per ?? 'mo'; }
    else if (f.type === 'date') s[f.key] = d instanceof Date ? isoDate(d) : (d || '');
    else s[f.key] = d ?? '';
  }
  Object.assign(s, def.state || {});
  for (const [k, v] of Object.entries(overrides || {})) if (k in s) s[k] = v;
  return s;
}

function normalize(def, s) {
  const v = { missing: [] };
  for (const [k, val] of Object.entries(def.state || {})) v[k] = s[k] ?? val;
  for (const f of def.fields) {
    const raw = s[f.key];
    switch (f.type) {
      case 'money': case 'percent': case 'number': {
        const blank = raw === '' || raw == null;
        if (blank && f.required) v.missing.push(f.label);
        let n = num(raw, f.blankAs ?? 0);
        if (f.min != null) n = Math.max(f.min, n);
        if (f.max != null) n = Math.min(f.max, n);
        v[f.key] = n; break;
      }
      case 'pctAmt': {
        const base = f.base ? f.base(v) : 0;
        const mode = s[f.key + 'Mode'] || '%';
        v[f.key + 'Mode'] = mode;
        if (mode === '%') { v[f.key] = num(raw); v[f.key + 'Amt'] = base * v[f.key] / 100; }
        else { v[f.key + 'Amt'] = num(s[f.key + 'Amt']); v[f.key] = base > 0 ? v[f.key + 'Amt'] / base * 100 : 0; }
        break;
      }
      case 'period': {
        const n = num(raw); const per = s[f.key + 'Per'] || 'mo';
        v[f.key + 'Monthly'] = per === 'mo' ? n : n / 12; v[f.key + 'Annual'] = per === 'mo' ? n * 12 : n; v[f.key] = n; break;
      }
      case 'check': v[f.key] = !!raw; break;
      default: v[f.key] = raw;
    }
  }
  return v;
}

// -- minimal DOM morph (keeps focused/dragged controls alive between renders) --
function morph(from, to) {
  const a = [...from.childNodes], b = [...to.childNodes];
  for (let i = 0; i < b.length; i++) {
    const x = a[i], y = b[i];
    if (!x) { from.appendChild(y); continue; }
    if (x.nodeType !== y.nodeType || x.nodeName !== y.nodeName) { from.replaceChild(y, x); continue; }
    if (x.nodeType === 3) { if (x.nodeValue !== y.nodeValue) x.nodeValue = y.nodeValue; continue; }
    if (x.nodeType !== 1) continue;
    const keepOpen = x.tagName === 'DETAILS'; // keep the viewer's open/closed choice
    for (const { name } of [...x.attributes]) if (!y.hasAttribute(name) && !(keepOpen && name === 'open')) x.removeAttribute(name);
    for (const { name, value } of [...y.attributes]) if (x.getAttribute(name) !== value && !(keepOpen && name === 'open')) x.setAttribute(name, value);
    if (x.tagName === 'INPUT' && x !== x.getRootNode().activeElement) x.value = y.value;
    morph(x, y);
  }
  for (let i = a.length - 1; i >= b.length; i--) a[i].remove();
}

// -- mount --
let uidSeq = 0;
export function mount(host, def, opts = {}) {
  ensureFonts();
  const root = host.shadowRoot || host.attachShadow({ mode: 'open' });
  const uid = `sg${++uidSeq}`;
  const state = initialState(def, opts.overrides);
  const cfg = { title: def.title, subtitle: def.subtitle, ...opts.config };
  const groups = def.groups || [{ id: 'main' }, { id: 'more', title: 'Assumptions' }];

  const formHtml = groups.map((g) => {
    const list = def.fields.filter((f) => (f.group || 'main') === g.id);
    if (!list.length) return '';
    const inner = fieldsHtml(list, state, uid);
    return g.id === 'main' ? inner : `<details class="more" data-group="${g.id}"${g.open ? ' open' : ''}><summary>${esc(g.title)}</summary><div class="body">${inner}</div></details>`;
  }).join('');

  root.innerHTML = `<style>${CSS}</style>
    <div class="sg" part="calculator">
      ${cfg.hideTitle ? '' : `<header class="sg-head"><h2 class="sg-title">${esc(cfg.title)}</h2>${cfg.subtitle ? `<p class="sg-sub">${esc(cfg.subtitle)}</p>` : ''}</header>`}
      <div class="sg-grid">
        <form class="sg-form" novalidate>${formHtml}</form>
        <section class="sg-results" aria-live="polite" aria-label="Results"></section>
      </div>
      <footer class="sg-foot">
        <p class="disc">${esc(def.disclaimer || DISCLAIMER)}</p>
        <button type="button" class="btn ghost" data-act="print">${PRINT_ICON}Print / Save PDF</button>
      </footer>
      <div class="tt" role="tooltip"></div>
    </div>`;

  const $ = (sel) => root.querySelector(sel);
  const form = $('.sg-form'), results = $('.sg-results'), tt = $('.tt');
  form.addEventListener('submit', (e) => e.preventDefault());
  let last = { vals: null, result: null };

  function update() {
    const vals = normalize(def, state);
    for (const f of def.fields) {
      const el = form.querySelector(`[data-field="${f.key}"]`);
      if (el && f.showIf) el.hidden = !f.showIf(vals, state);
      if (el && f.dynamic) f.dynamic(el, vals, state);
    }
    let result, html;
    try {
      result = def.compute(vals, state);
      html = def.render(result, vals, state);
    } catch (e) {
      console.error('[sg-calc]', e);
      html = `<div class="empty"><div class="v">Something went wrong</div>Please check the inputs.</div>`;
    }
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    morph(results, tpl.content);
    last = { vals, result };
    syncForm();
  }

  function syncForm() {
    const active = root.activeElement;
    form.querySelectorAll('[data-k]').forEach((el) => {
      if (el === active) return;
      const k = el.dataset.k;
      if (el.type === 'checkbox') { el.checked = !!state[k]; return; }
      if (el.tagName === 'SELECT' || el.type === 'date') { el.value = state[k]; return; }
      let v;
      if (el.dataset.pa) v = (state[k + 'Mode'] || '%') === '%' ? state[k] : displayMoney(state[k + 'Amt']);
      else v = el.dataset.fmt === 'm' ? displayMoney(state[k]) : state[k];
      if (el.value !== String(v ?? '')) el.value = v ?? '';
    });
  }

  form.addEventListener('input', (e) => {
    const el = e.target.closest('[data-k]'); if (!el) return;
    const k = el.dataset.k;
    if (el.type === 'checkbox') state[k] = el.checked;
    else if (el.dataset.pa && (state[k + 'Mode'] || '%') === '$') state[k + 'Amt'] = el.value;
    else state[k] = el.value;
    update();
  });
  form.addEventListener('change', (e) => { const el = e.target.closest('select[data-k],input[type=date][data-k]'); if (el) { state[el.dataset.k] = el.value; update(); } });
  form.addEventListener('focusout', (e) => {
    const el = e.target.closest('input[data-fmt=m]'); if (!el) return;
    const n = num(el.value, NaN); el.value = Number.isFinite(n) ? grouped(n) : '';
  });

  root.addEventListener('click', (e) => {
    const seg = e.target.closest('[data-seg]');
    if (seg) {
      const key = seg.dataset.seg, v = seg.dataset.v;
      if (key.endsWith('Mode')) {
        // Convert so the displayed value stays equivalent when switching % ⇄ $.
        const base = def.fields.find((f) => f.key + 'Mode' === key);
        const vals = normalize(def, state);
        if (base && state[key] !== v) {
          if (v === '$') state[base.key + 'Amt'] = Math.round(vals[base.key + 'Amt']);
          else state[base.key] = +vals[base.key].toFixed(3);
        }
        const inp = form.querySelector(`[data-k="${base.key}"]`);
        if (inp) inp.dataset.fmt = v === '$' ? 'm' : 'n';
      }
      state[key] = v;
      seg.parentElement.querySelectorAll('[data-seg]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
      update(); return;
    }
    const set = e.target.closest('[data-set]');
    if (set) { state[set.dataset.set] = set.dataset.val; update(); return; }
    const act = e.target.closest('[data-act]');
    if (act?.dataset.act === 'print') printReport();
    if (act?.dataset.act && def.actions?.[act.dataset.act]) { def.actions[act.dataset.act](state, act.dataset); update(); }
  });
  results.addEventListener('input', (e) => {
    const el = e.target.closest('[data-bind]'); if (!el) return;
    state[el.dataset.bind] = el.value; update();
  });

  // Tooltips for [data-tip] (chart segments, help icons).
  const showTip = (el, x, y) => { tt.innerHTML = el.dataset.tip; tt.classList.add('on'); placeTip(x, y); };
  const placeTip = (x, y) => {
    const w = tt.offsetWidth, h = tt.offsetHeight;
    tt.style.left = Math.min(window.innerWidth - w - 8, Math.max(8, x - w / 2)) + 'px';
    tt.style.top = (y - h - 12 < 8 ? y + 18 : y - h - 12) + 'px';
  };
  root.addEventListener('pointerover', (e) => { const el = e.target.closest('[data-tip]'); if (el) showTip(el, e.clientX, e.clientY); });
  root.addEventListener('pointermove', (e) => { if (tt.classList.contains('on') && e.target.closest('[data-tip]')) placeTip(e.clientX, e.clientY); });
  root.addEventListener('pointerout', (e) => { if (e.target.closest('[data-tip]')) tt.classList.remove('on'); });
  root.addEventListener('focusin', (e) => { const el = e.target.closest('[data-tip]'); if (el) { const r = el.getBoundingClientRect(); showTip(el, r.left + r.width / 2, r.top); } });
  root.addEventListener('focusout', (e) => { if (e.target.closest('[data-tip]')) tt.classList.remove('on'); });

  // -- Print / Save PDF --
  function inputSummary() {
    const vals = last.vals;
    const out = [];
    for (const f of def.fields) {
      if (f.print === false || f.type === 'check') continue;
      if (f.showIf && !f.showIf(vals, state)) continue;
      const raw = state[f.key];
      let text = '';
      switch (f.type) {
        case 'money': text = raw === '' ? '' : money(vals[f.key]); break;
        case 'percent': text = raw === '' ? '' : pct(vals[f.key]); break;
        case 'number': text = raw === '' ? '' : `${grouped(vals[f.key])}${f.suffix ? ' ' + f.suffix.toLowerCase() : ''}`; break;
        case 'pctAmt': text = `${pct(vals[f.key])} (${money(vals[f.key + 'Amt'])})`; break;
        case 'period': text = vals[f.key] ? `${money(vals[f.key + 'Monthly'])}/mo` : ''; break;
        case 'select': case 'seg': text = (f.options.find(([v]) => String(v) === String(raw)) || [, raw])[1]; break;
        case 'date': text = raw ? niceDate(raw) : ''; break;
        default: text = raw;
      }
      if (text !== '' && text != null) out.push([f.label, text]);
    }
    return out;
  }

  function printReport() {
    const resHtml = def.printHtml ? def.printHtml(last.result, last.vals, state) : results.innerHTML;
    const brand = cfg.brand ? `<div class="rep-brand">${esc(cfg.brand)}</div>` : '';
    const contact = cfg.contact ? `<div class="rep-contact">${esc(cfg.contact).replace(/\|/g, '<br>')}</div>` : '';
    const inputs = inputSummary().map(([l, v]) => `<div class="r"><span class="l">${esc(l)}</span><span class="v num">${esc(v)}</span></div>`).join('');
    const doc = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(cfg.title)}</title>
      <link rel="stylesheet" href="${FONT_HREF}">
      <style>:root{${TOKENS}}${CSS.replace(/:host[^{]*\{[^}]*\}/g, '')}${PRINT_CSS}</style></head>
      <body><div class="sg">
        <div class="pbar"><button class="btn" onclick="window.print()">Print / Save as PDF</button><button class="btn ghost" onclick="window.close()">Close</button></div>
        <div class="rep-head"><div>${brand}<h2 class="sg-title" style="margin:4px 0 0">${esc(cfg.title)}</h2><div class="f-hint" style="margin-top:4px">Prepared ${niceDate(new Date())}</div></div>${contact}</div>
        <div class="rep-grid">
          <div class="rep-inputs"><h3>Your inputs</h3><div class="rows">${inputs}</div></div>
          <div class="rep-results"><div class="sg-results">${resHtml}</div></div>
        </div>
        <p class="disc" style="margin-top:22px">${esc(def.disclaimer || DISCLAIMER)}</p>
      </div>
      <script>document.querySelectorAll('details').forEach(d=>d.open=true);
        (document.fonts&&document.fonts.ready||Promise.resolve()).then(()=>setTimeout(()=>window.print(),250));<\/script></body></html>`;
    const w = window.open('', '_blank');
    if (w && w.document) { w.document.open(); w.document.write(doc); w.document.close(); return; }
    // Popup blocked (e.g. sandboxed embed) → print from a hidden iframe.
    const f = document.createElement('iframe');
    Object.assign(f.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
    document.body.appendChild(f);
    f.contentDocument.open(); f.contentDocument.write(doc.replace('setTimeout(()=>window.print(),250)', 'setTimeout(()=>{window.focus();window.print();},250)')); f.contentDocument.close();
    setTimeout(() => f.remove(), 60_000);
  }

  update();
  return { state, update, print: printReport };
}
