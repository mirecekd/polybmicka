# Tech Context

## Stack

- **Runtime:** Tampermonkey userscript v Google Chrome
- **Jazyk:** Vanilla JavaScript (ES2020+), zadny bundler, zadny framework
- **Target web:** Polymarket.com (React SPA)
- **Soubor:** jeden `.user.js` soubor, rucne importovany do Tampermonkey

## Tampermonkey API pouzite

- `@match` - `https://polymarket.com/*`
- `@run-at` - `document-idle`
- `@grant` - `window.onurlchange`, `GM_registerMenuCommand`, `GM_setValue`, `GM_getValue`
- `MutationObserver` pro cekani na dynamicke elementy

## Polymarket specificka

- SPA - URL se meni bez reload, nutno sledovat navigaci
- Live market URL: `https://polymarket.com/event/btc-updown-5m-{unix_timestamp}`
- Historical market ma tlacitko "Go to live market" (cerveny puntik + text)
- Pravy panel ma Buy/Sell taby, Up/Down buttony s cenou (napr. "Up 3c", "Down 98c")
- Amount input s quick buttons (+$1, +$5, +$10, +$100, Max)
- "Buy Up" / "Buy Down" submit button

## Omezeni

- DOM selektory se mohou menit pri deployi Polymarketu
- Ceny na buttonech jsou dynamicke (React re-render)
- 5min market expiruje a meni se URL - nutno detekovat prechod
- SPA navigace = `popstate` + `pushState` eventy

## Development workflow

- Editace v VS Code
- Rucny copy-paste do Tampermonkey editoru (nebo file:// import)
- Testovani primo na polymarket.com
