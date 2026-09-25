// HTML-string builders for results panels. Each calculator's render() composes these.
import { esc, money } from './format.js';

export const SERIES = ['var(--sg-s1)', 'var(--sg-s2)', 'var(--sg-s3)', 'var(--sg-s4)', 'var(--sg-s5)'];

/** Big centered number. */
export function headline(label, value, sub = '') {
  return `<div class="hl"><div class="k">${esc(label)}</div><div class="v num">${esc(value)}</div>${sub ? `<div class="s">${sub}</div>` : ''}</div>`;
}

/**
 * Label/value rows. Each row: [label, value, opts?] where opts =
 * { strong, total, neg, sub, color, tip }.
 */
export function rows(list) {
  return `<div class="rows">${list.filter(Boolean).map(([l, v, o = {}]) => {
    const cls = ['r', o.strong && 'strong', o.total && 'total'].filter(Boolean).join(' ');
    const sw = o.color ? `<span class="sw" style="background:${o.color}"></span>` : '';
    const sub = o.sub ? `<small>${esc(o.sub)}</small>` : '';
    return `<div class="${cls}"><span class="l">${sw}<span>${esc(l)}${sub}</span></span><span class="v num${o.neg ? ' neg' : ''}">${esc(v)}</span></div>`;
  }).join('')}</div>`;
}

/** Section block with optional right-aligned total. */
export function block(title, inner, total = '') {
  return `<div class="blk"><div class="blk-h"><h3>${esc(title)}</h3>${total ? `<span class="t num">${esc(total)}</span>` : ''}</div>${inner}</div>`;
}

/**
 * Part-to-whole: one stacked bar + legend rows with values (identity never color-alone).
 * items: [{ label, value }] — zero values are dropped; colors assigned in fixed slot order
 * by the item's position in the *full* list so a series keeps its color when others hide.
 */
export function breakdown(items, fmt = (v) => money(v)) {
  const withColor = items.map((it, i) => ({ ...it, color: it.color || SERIES[i % SERIES.length] }));
  const shown = withColor.filter((it) => it.value > 0.5);
  const total = shown.reduce((t, it) => t + it.value, 0) || 1;
  const bar = shown.map((it) => `<i style="flex:${it.value / total};background:${it.color}" data-tip="<b>${esc(it.label)}</b><br>${esc(fmt(it.value))} · ${Math.round(it.value / total * 100)}%"></i>`).join('');
  return `<div class="bar" role="img" aria-label="${esc(shown.map((it) => `${it.label} ${fmt(it.value)}`).join(', '))}">${bar}</div>`
    + rows(shown.map((it) => [it.label, fmt(it.value), { color: it.color }]));
}

/** Range slider bound to a state key. */
export function slider({ key, label, value, min, max, step = 1, display, ticks = [] }) {
  return `<div class="sl"><div class="sl-h"><span>${esc(label)}</span><span class="v num">${esc(display ?? value)}</span></div>
    <input type="range" data-bind="${key}" min="${min}" max="${max}" step="${step}" value="${value}" aria-label="${esc(label)}">
    ${ticks.length ? `<div class="sl-ticks">${ticks.map((t) => `<span>${esc(t)}</span>`).join('')}</div>` : ''}</div>`;
}

/** Tab strip bound to a state key. */
export function tabs(key, options, current) {
  return `<div class="tabs" role="tablist">${options.map(([v, l]) =>
    `<button type="button" role="tab" data-set="${key}" data-val="${esc(v)}" aria-selected="${String(v) === String(current)}">${esc(l)}</button>`).join('')}</div>`;
}

/** Collapsible itemized list (e.g. detailed closing costs). groups: [[title, [[label, amount]]]] */
export function itemized(summary, groups, fmt = (v) => money(v)) {
  return `<details class="items"><summary>${esc(summary)}</summary>${groups.map(([g, items]) =>
    `<div class="grp">${esc(g)}</div>` + rows(items.map(([l, v]) => [l, fmt(v), { neg: v < 0 }]))).join('')}</details>`;
}

export const note = (html, warn = false) => `<div class="note${warn ? ' warn' : ''}">${html}</div>`;
export const empty = (title, text) => `<div class="empty"><div class="v">${esc(title)}</div>${esc(text)}</div>`;

/** Segmented toggle inside results, bound to a state key. */
export function seg(key, options, current, label = '') {
  return `<div class="seg rs" role="group"${label ? ` aria-label="${esc(label)}"` : ''}>${options.map(([v, l]) =>
    `<button type="button" data-set="${key}" data-val="${esc(v)}" aria-pressed="${String(v) === String(current)}">${esc(l)}</button>`).join('')}</div>`;
}

/** − value + stepper bound to a state key (integer). */
export function stepper(key, value, min = 0, max = 360, label = '') {
  const v = +value;
  return `<span class="stp"><button type="button" data-set="${key}" data-val="${Math.max(min, v - 1)}" aria-label="Decrease ${esc(label)}"${v <= min ? ' disabled' : ''}>−</button><b class="num">${v}</b><button type="button" data-set="${key}" data-val="${Math.min(max, v + 1)}" aria-label="Increase ${esc(label)}"${v >= max ? ' disabled' : ''}>+</button></span>`;
}

/**
 * Side-by-side comparison cards.
 * cards: [{ kicker, title, value, sub, rows, tone: 'best'|'', badge }]
 */
export function cards(list) {
  return `<div class="cards c${list.length}">${list.map((c) => `<div class="card${c.tone ? ' ' + c.tone : ''}">
    ${c.badge ? `<span class="badge">${esc(c.badge)}</span>` : ''}
    ${c.kicker ? `<div class="ck">${esc(c.kicker)}</div>` : ''}
    <div class="cv num">${esc(c.value)}</div>
    ${c.sub ? `<div class="cs">${c.sub}</div>` : ''}
    ${c.rows ? rows(c.rows) : ''}${c.extra || ''}</div>`).join('')}</div>`;
}

/**
 * Table with a label column. cols: header labels (first is the row-label header).
 * body: [[label, ...cells, opts?]] where opts = { strong, total, hl: colIndex }.
 */
export function table(cols, body, opts = {}) {
  const head = `<tr>${cols.map((c, i) => `<th${i ? ' class="n"' : ''}${opts.best === i ? ' data-best' : ''}>${c}</th>`).join('')}</tr>`;
  const trs = body.filter(Boolean).map((r) => {
    const o = typeof r[r.length - 1] === 'object' && !Array.isArray(r[r.length - 1]) && r[r.length - 1] !== null ? r[r.length - 1] : {};
    const cells = o === r[r.length - 1] ? r.slice(0, -1) : r;
    return `<tr class="${[o.strong && 'strong', o.total && 'total'].filter(Boolean).join(' ')}">${cells.map((c, i) => i ? `<td class="n num"${opts.best === i ? ' data-best' : ''}>${c}</td>` : `<th scope="row">${esc(c)}</th>`).join('')}</tr>`;
  }).join('');
  return `<div class="tblw"><table class="tbl"><thead>${head}</thead><tbody>${trs}</tbody></table></div>`;
}

/** Small stat tiles. items: [[label, value, sub?]] */
export function stats(items) {
  return `<div class="stats">${items.filter(Boolean).map(([l, v, s]) => `<div class="st"><div class="k">${esc(l)}</div><div class="v num">${esc(v)}</div>${s ? `<div class="s">${esc(s)}</div>` : ''}</div>`).join('')}</div>`;
}

/** Button that opens another calculator in the tabbed suite (hidden when embedded standalone). */
export function goto(id, values, label) {
  return `<button type="button" class="goto" data-goto="${esc(id)}" data-with="${esc(JSON.stringify(values || {}))}">${esc(label)} →</button>`;
}

export const para = (html) => `<p class="para">${html}</p>`;
