# SG Calculators

Embeddable real-estate calculators for Signature Group Real Estate websites. Each calculator renders inside its own Shadow DOM, so the host site's CSS can't break it and it can't affect the host site.

## Embed a calculator

Paste this into any HTML / custom-code block:

```html
<div data-sg-calc="monthly-affordability"
     data-brand="GMR Real Estate"
     data-contact="Greg Riley | (801) 808-7457 | greg@gmr-realestate.com"></div>
<script src="https://jpokstone.github.io/sg-calculators/calculators.js" defer></script>
```

- Include the `<script>` once per page, even when the page has several calculators.
- `data-brand` and `data-contact` appear on the Print / Save PDF report. Use `|` for line breaks.
- Optional: `data-title="…"`, `data-subtitle="…"`, `data-hide-title="true"`.
- To override a default for one embed, add `data-<field>`, for example `data-rate="6.875"` or `data-payment="3500"`.

## Available calculators

| `data-sg-calc` | Calculator |
|---|---|
| `monthly-affordability` | Monthly Affordability |

## Updating defaults

Market defaults (interest rate, tax %, insurance %, fees) live in `src/core/defaults.js`. After you push a change, every embed picks it up on its next page load.

⚠️ **Title insurance premiums are placeholder estimates.** Replace `TITLE_RATES` in `src/core/defaults.js` with your title partner's Utah rate schedule.

## Theming

The colors come from gmr-realestate.com. To override any of them on the host page:

```css
[data-sg-calc] { --sg-primary: #553F27; --sg-cream: #F8F5EE; }
```

## How it loads

`calculators.js` is a tiny loader. It imports `src/index.js` as an ES module from the same folder, so there's no build step: edit a file in `src/`, push, and GitHub Pages serves the new version within about 10 minutes.

## Development

```bash
npm install
npm test                 # finance unit tests
python3 -m http.server   # then open http://localhost:8000/demo/
npm run build            # optional: single-file bundle in dist/
```

`demo/index.html` loads the calculator into a page with deliberately hostile CSS, to prove the styles are isolated.
