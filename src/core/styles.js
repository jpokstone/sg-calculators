// Scoped styles. Injected into each calculator's Shadow DOM, so host-site CSS
// can't leak in and ours can't leak out. Override any token from the host page:
//   [data-sg-calc] { --sg-primary: #553F27; }

export const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Cormorant:wght@400;500;600&family=Halant:wght@400;500;600&display=swap';

export const TOKENS = `
  --sg-primary: #553F27;      /* GMR brown — buttons, headings, key numbers */
  --sg-primary-ink: #ffffff;
  --sg-ink: #3D3A31;          /* warm dark grey */
  --sg-text: #505050;
  --sg-muted: #7A756B;
  --sg-cream: #F8F5EE;        /* results surface */
  --sg-khaki: #E5E4DB;        /* hairlines on cream, chips */
  --sg-tan: #CBB994;          /* light tan accent */
  --sg-border: #DCDCDC;
  --sg-bg: #FFFFFF;
  --sg-focus: rgba(85, 63, 39, .28);
  --sg-good: #2F6B3A;
  --sg-bad: #9B2C1F;
  --sg-s1: #985A1A; --sg-s2: #009087; --sg-s3: #B98510; --sg-s4: #7B4CB0; --sg-s5: #CC4E36;
  --sg-font-display: 'Cormorant', 'Cormorant Garamond', Georgia, serif;
  --sg-font-body: 'Halant', Georgia, 'Times New Roman', serif;
`;

export const CSS = `
:host { all: initial; display: block; ${TOKENS} }
:host([hidden]) { display: none; }
*, *::before, *::after { box-sizing: border-box; }
.sg { font-family: var(--sg-font-body); font-size: 15px; line-height: 1.45; color: var(--sg-text);
  background: var(--sg-bg); container-type: inline-size; -webkit-font-smoothing: antialiased; }
.num, .sg input { font-variant-numeric: lining-nums tabular-nums; }
button, input, select { font: inherit; color: inherit; }
[hidden] { display: none !important; }

/* header */
.sg-head { margin: 0 0 22px; }
.sg-title { font-family: var(--sg-font-display); font-weight: 500; font-size: 32px; line-height: 1.1;
  letter-spacing: .02em; text-transform: uppercase; color: var(--sg-primary); margin: 0 0 6px; }
.sg-sub { margin: 0; font-size: 15px; color: var(--sg-text); max-width: 62ch; }

/* layout */
.sg-grid { display: grid; gap: 28px; grid-template-columns: minmax(0, 1fr); }
@container (min-width: 760px) {
  .sg-grid { grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: 36px; align-items: start; }
  .sg-results { position: sticky; top: 16px; }
}

/* form */
.sg-form { display: grid; gap: 16px; align-content: start; }
.f { display: grid; gap: 6px; min-width: 0; }
.f-label { display: flex; align-items: center; justify-content: space-between; gap: 8px;
  font-size: 14px; font-weight: 500; color: var(--sg-primary); }
.f-label .lbl { display: inline-flex; align-items: center; gap: 6px; }
.f-hint { font-size: 12.5px; color: var(--sg-muted); margin-top: -2px; }
.ig { display: flex; align-items: stretch; min-height: 44px; background: var(--sg-bg);
  border: 1px solid var(--sg-border); transition: border-color .15s, box-shadow .15s; }
.ig:focus-within { border-color: var(--sg-primary); box-shadow: 0 0 0 3px var(--sg-focus); }
.ig .ad { flex: none; display: grid; place-items: center; min-width: 40px; padding: 0 10px; background: var(--sg-cream);
  color: var(--sg-primary); font-weight: 500; border-right: 1px solid var(--sg-border); }
.ig .ad.r { border-right: 0; border-left: 1px solid var(--sg-border); }
.ig input, .ig select { flex: 1 1 0; width: 100%; min-width: 0; border: 0; outline: 0; background: transparent; padding: 0 12px;
  font-size: 16px; color: var(--sg-ink); }
.ig input::placeholder { color: #A9A49A; }
.ig select { appearance: none; -webkit-appearance: none; cursor: pointer; padding-right: 36px;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%23553F27' stroke-width='1.5'/%3E%3C/svg%3E") no-repeat right 14px center; }
.ig input[type=date] { font-size: 15px; }
.row2 { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px; }

/* segmented toggle (%/$, Mo/Yr, Buyer/Seller/Split) */
.seg { display: inline-flex; border: 1px solid var(--sg-border); background: var(--sg-bg); }
.ig .seg { border: 0; border-left: 1px solid var(--sg-border); }
.seg button { border: 0; background: transparent; padding: 0 12px; min-height: 30px; min-width: 38px; cursor: pointer;
  font-size: 13.5px; color: var(--sg-muted); }
.seg button + button { border-left: 1px solid var(--sg-border); }
.seg button[aria-pressed=true] { background: var(--sg-primary); color: var(--sg-primary-ink); }
.seg button:focus-visible { outline: 2px solid var(--sg-primary); outline-offset: -2px; }
.seg.block { display: flex; } .seg.block button { flex: 1; min-height: 40px; }

/* checkbox */
.chk { display: flex; align-items: center; gap: 10px; font-size: 14.5px; color: var(--sg-ink); cursor: pointer; }
.chk input { width: 18px; height: 18px; accent-color: var(--sg-primary); margin: 0; }

/* help tip */
.tip { display: inline-grid; place-items: center; width: 16px; height: 16px; border-radius: 50%;
  border: 1px solid var(--sg-tan); color: var(--sg-primary); font-size: 11px; line-height: 1; cursor: help; font-weight: 600; }
.tip:focus-visible { outline: 2px solid var(--sg-primary); outline-offset: 2px; }

/* collapsible sections */
details.more { border-top: 1px solid var(--sg-khaki); padding-top: 12px; }
details.more > summary { list-style: none; cursor: pointer; display: flex; align-items: center; justify-content: space-between;
  font-family: var(--sg-font-display); font-size: 21px; font-weight: 500; color: var(--sg-primary); padding: 2px 0; }
details.more > summary::-webkit-details-marker { display: none; }
details.more > summary::after { content: ''; width: 9px; height: 9px; border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor; transform: rotate(45deg) translate(-2px, -2px); transition: transform .2s; }
details.more[open] > summary::after { transform: rotate(-135deg) translate(-2px, -2px); }
details.more > .body { display: grid; gap: 16px; padding-top: 14px; }
details.more > summary:focus-visible { outline: 2px solid var(--sg-primary); outline-offset: 4px; }

/* results */
.sg-results { background: var(--sg-cream); border: 1px solid var(--sg-khaki); padding: 26px; min-width: 0; }
@container (max-width: 480px) { .sg-results { padding: 20px 16px; } .sg-title { font-size: 27px; } }
.hl { text-align: center; padding: 4px 0 18px; }
.hl .k { font-size: 12.5px; letter-spacing: .12em; text-transform: uppercase; color: var(--sg-muted); }
.hl .v { font-family: var(--sg-font-display); font-weight: 500; font-size: 54px; line-height: 1.05; color: var(--sg-primary);
  font-variant-numeric: lining-nums; margin: 4px 0 2px; overflow-wrap: anywhere; }
.hl .s { font-size: 14px; color: var(--sg-text); }
@container (max-width: 480px) { .hl .v { font-size: 44px; } }
.blk { padding: 18px 0 4px; border-top: 1px solid var(--sg-khaki); }
.blk:first-child { border-top: 0; padding-top: 0; }
.blk-h { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; margin: 0 0 10px; }
.blk-h h3 { margin: 0; font-family: var(--sg-font-display); font-weight: 500; font-size: 22px; color: var(--sg-primary); }
.blk-h .t { font-family: var(--sg-font-display); font-weight: 600; font-size: 22px; color: var(--sg-ink); font-variant-numeric: lining-nums; }
.rows { display: grid; }
.r { display: flex; justify-content: space-between; gap: 14px; padding: 8px 0; border-bottom: 1px solid var(--sg-khaki); font-size: 15px; }
.r:last-child { border-bottom: 0; }
.r .l { color: var(--sg-text); display: flex; align-items: center; gap: 8px; min-width: 0; }
.r .l small { display: block; font-size: 12.5px; color: var(--sg-muted); }
.r .v { color: var(--sg-ink); font-weight: 500; white-space: nowrap; font-variant-numeric: lining-nums tabular-nums; }
.r.strong .l, .r.strong .v { color: var(--sg-primary); font-weight: 600; }
.r.total { border-top: 1px solid var(--sg-primary); border-bottom: 0; margin-top: 2px; }
.r.total .l, .r.total .v { color: var(--sg-primary); font-weight: 600; font-size: 16px; }
.r .v.neg { color: var(--sg-good); }
.sw { width: 10px; height: 10px; border-radius: 2px; flex: none; }

/* stacked part-to-whole bar */
.bar { display: flex; gap: 2px; height: 14px; margin: 4px 0 12px; }
.bar i { display: block; height: 100%; min-width: 3px; cursor: default; }
.bar i:first-child { border-radius: 4px 0 0 4px; } .bar i:last-child { border-radius: 0 4px 4px 0; }
.bar i:only-child { border-radius: 4px; }
.bar i:hover { filter: brightness(1.08); }

/* slider */
.sl { padding: 16px 0 6px; }
.sl-h { display: flex; justify-content: space-between; align-items: baseline; font-size: 14px; color: var(--sg-primary); font-weight: 500; }
.sl-h .v { color: var(--sg-ink); font-variant-numeric: lining-nums; }
.sl input[type=range] { width: 100%; margin: 10px 0 2px; accent-color: var(--sg-primary); height: 24px; cursor: pointer; }
.sl-ticks { display: flex; justify-content: space-between; font-size: 12px; color: var(--sg-muted); }

/* tabs */
.tabs { display: flex; gap: 22px; border-bottom: 1px solid var(--sg-khaki); margin: -6px 0 18px; overflow-x: auto; }
.tabs button { border: 0; background: none; padding: 8px 0 10px; font-size: 15px; color: var(--sg-muted); cursor: pointer;
  border-bottom: 2px solid transparent; margin-bottom: -1px; white-space: nowrap; }
.tabs button[aria-selected=true] { color: var(--sg-primary); border-bottom-color: var(--sg-primary); font-weight: 500; }
.tabs button:focus-visible { outline: 2px solid var(--sg-primary); outline-offset: 2px; }

/* itemized expander inside results */
details.items { margin-top: 6px; }
details.items > summary { cursor: pointer; font-size: 14px; color: var(--sg-primary); text-decoration: underline;
  text-underline-offset: 3px; list-style: none; padding: 6px 0; }
details.items > summary::-webkit-details-marker { display: none; }
details.items .grp { font-size: 12.5px; letter-spacing: .1em; text-transform: uppercase; color: var(--sg-muted); margin: 12px 0 2px; }
details.items .r { font-size: 14px; padding: 6px 0; }

/* callouts */
.note { font-size: 14px; color: var(--sg-ink); background: var(--sg-bg); border-left: 3px solid var(--sg-tan); padding: 10px 12px; margin: 12px 0 0; }
.note.warn { border-left-color: var(--sg-bad); }
.empty { text-align: center; padding: 40px 10px; color: var(--sg-muted); }
.empty .v { font-family: var(--sg-font-display); font-size: 24px; color: var(--sg-primary); margin-bottom: 4px; }

/* buttons & footer */
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 0 22px;
  border: 1px solid var(--sg-primary); background: var(--sg-primary); color: var(--sg-primary-ink); cursor: pointer; font-size: 16px; font-weight: 500; }
.btn.ghost { background: transparent; color: var(--sg-primary); }
.btn:hover { filter: brightness(1.12); }
.btn:focus-visible { outline: 2px solid var(--sg-primary); outline-offset: 3px; }
.sg-foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 14px; margin-top: 22px; }
.disc { font-size: 12px; color: var(--sg-muted); max-width: 70ch; margin: 0; }
.sg-foot .btn svg { width: 16px; height: 16px; }

/* tooltip */
.tt { position: fixed; z-index: 2147483647; pointer-events: none; background: var(--sg-ink); color: #fff; font-size: 13px;
  padding: 7px 10px; max-width: 260px; line-height: 1.35; box-shadow: 0 4px 14px rgba(0,0,0,.18); opacity: 0; transition: opacity .12s; }
.tt.on { opacity: 1; }
.tt b { font-weight: 600; }

@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
`;

// Extra rules used only in the printable report.
export const PRINT_CSS = `
@page { margin: 0.55in; }
body { margin: 0; background: #fff; }
.sg { container-type: normal; font-size: 13px; }
.rep-head { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid var(--sg-primary);
  padding-bottom: 10px; margin-bottom: 18px; gap: 20px; }
.rep-brand { font-family: var(--sg-font-display); font-size: 22px; color: var(--sg-primary); font-weight: 500; letter-spacing: .04em; text-transform: uppercase; }
.rep-contact { font-size: 12px; color: var(--sg-text); text-align: right; }
.rep-grid { display: grid; grid-template-columns: 1fr 1.35fr; gap: 26px; align-items: start; }
.rep-inputs h3, .rep-results h3.h { font-family: var(--sg-font-display); font-weight: 500; font-size: 19px; color: var(--sg-primary); margin: 0 0 8px; }
.sg-results { position: static; padding: 18px; }
.hl .v { font-size: 40px; }
.no-print, .tabs, .sl input, .sl-ticks { display: none !important; }
details.items > summary { display: none; }
.r, details.items .r { padding: 5px 0; font-size: 13px; }
* { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
@media screen { body { padding: 32px; max-width: 980px; margin: 0 auto; } .pbar { display: flex; gap: 10px; margin-bottom: 20px; } }
@media print { .pbar { display: none; } }
`;
