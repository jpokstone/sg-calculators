// Number parsing & display helpers shared by every calculator.

export function num(v, fallback = 0) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : fallback;
  if (v == null) return fallback;
  const cleaned = String(v).replace(/[^0-9.\-]/g, '');
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return fallback;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : fallback;
}

const usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const usd2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const plain = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

export function money(n, cents = false) {
  if (!Number.isFinite(n)) return '—';
  const v = cents ? usd2.format(n) : usd0.format(Math.round(n));
  return v === '-$0' ? '$0' : v;
}

/** Signed money, e.g. "+$124" / "−$13,183" (true minus sign). */
export function moneyDelta(n) {
  if (!Number.isFinite(n) || Math.round(n) === 0) return '$0';
  return (n > 0 ? '+' : '−') + usd0.format(Math.abs(Math.round(n)));
}

export function pct(n, digits = 3) {
  if (!Number.isFinite(n)) return '—';
  return `${parseFloat(n.toFixed(digits))}%`;
}

export function grouped(n) {
  if (!Number.isFinite(n)) return '';
  return plain.format(n);
}

export function monthsToText(m) {
  if (!Number.isFinite(m) || m < 0) return '—';
  const total = Math.ceil(m);
  const y = Math.floor(total / 12), mo = total % 12;
  const parts = [];
  if (y) parts.push(`${y} yr${y > 1 ? 's' : ''}`);
  if (mo || !y) parts.push(`${mo} mo`);
  return parts.join(' ');
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function isoDate(d) {
  const z = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

export function parseDate(s) {
  if (s instanceof Date) return s;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date();
}

export function niceDate(d) {
  return parseDate(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
