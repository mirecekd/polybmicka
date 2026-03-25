# Tech Context

## Stack

- **Runtime:** Tampermonkey userscript v Google Chrome
- **Jazyk:** Vanilla JavaScript (ES2020+), zadny bundler, zadny framework
- **Target web:** Polymarket.com (React SPA)
- **Soubor:** jeden `.user.js` soubor, rucne importovany do Tampermonkey
- **Licence:** MIT

## Tampermonkey API pouzite

- `@match` - `https://polymarket.com/*`
- `@run-at` - `document-idle`
- `@grant` - `window.onurlchange`, `GM_registerMenuCommand`, `GM_setValue`, `GM_getValue`
- `MutationObserver` neni pouzit - misto toho polling s setInterval

## Polymarket DOM specificka (March 2026)

- SPA - URL se meni bez reload, nutno sledovat navigaci
- Live market URL: `https://polymarket.com/event/btc-updown-5m-{unix_timestamp}`
- Outcome buttons: `#outcome-buttons` container, Up=value="0", Down=value="1"
- data-color se meni: green/red = selected, gray = unselected
- Ceny v unicode cent: `57\u00A2` v separatnich spanech
- Buy/Sell taby: `button[role="radio"][value="BUY/SELL"]`
- Amount input: `#market-order-amount-input`
- Trade button: `button.trading-button[data-color="blue"]`
- Go to live market: `button[aria-label="Go to live market"]`
- Price to beat: span s $XX,XXX.XX textem
- Current price: number-flow-react web component se shadow DOM (--current CSS var na .digit)
- React SPA: dispatchEvent MouseEvent misto .click() pro navigaci

## Persistent storage (GM_setValue)

- `enabled` - monitoring ON/OFF
- `buyMode` - OFF/SIM/LIVE
- `freshEnabled` - auto-navigate toggle
- `earlyEnabled` - extended trading window
- `totalProfit` - cumulative sim profit
- `trades` - JSON array trade history

## Development workflow

- Editace v VS Code
- Rucny copy-paste do Tampermonkey editoru
- Testovani primo na polymarket.com
- Git repo lokalni, 40+ commitu
