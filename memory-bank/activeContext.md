# Active Context

## Aktualni stav: v0.4.1

Plne funkcni Tampermonkey userscript pro Polymarket BTC Up/Down 5min markety.

## Features v0.4.1

- 100ms DOM sampling cen z #outcome-buttons
- 10s rolling window trend engine (streak detection)
- Signal generator: 75-97c, <2:30 (nebo <3:30 s Early), streak>=3, 1x/market
- 2 SIM/LIVE tlacitka (SIM priorita - blokuje LIVE)
- LIVE mode: outcome click -> +$1 -> trade button (~100ms)
- Safety net buy pri reverzu (1x, 75c+ pravidlo, profit accounting)
- Fresh toggle - auto-navigate na live market (30s delay, okamzite pri zapnuti)
- Early toggle - rozsiri trading window na 3:30 (210s)
- CLR profit reset
- Resolve display (parser pro Price to beat vs Current price, shadow DOM fallback)
- Persistent profit tracker se safety net accounting (GM_setValue)
- Cached BTC result pro resoluci
- Deduplikovany signal logging
- Overlay: 280px, rgb(58,58,58), 45vh log
- **NEW v0.4.1: Profit killswitch** - pokud profit klesne pod -$5, hlavni vypinac se vypne (OFF)
- **NEW v0.4.1: Cash balance scraping** - scrapuje cash z a[href="/portfolio"] v nav
- **NEW v0.4.1: Cash display** - 3. radek overlay, zeleny/cerveny, LOW! warning
- **NEW v0.4.1: Cash safety** - pokud cash < $12, skip trade (log 1x per market)

## UI Layout

```
PolyBMiCka v0.4.1               [ON]
Status: MONITORING              [Fresh]
Market: BTC 5min @ 13:30:00    [Early]
Cash: $15.47
Resolve: DOWN -122.60 ($71200.14)
Time: 2:56 HOT  Rules: >75c, <2:30, $1
UP: 6c  DOWN: 95c
Trend: FLAT 0c in 8.4s (streak: 1)
Signal: none
[SIM: ON]        [LIVE: OFF]
DOWN @ 77c $1
pot. profit: +$0.30
Profit from PolyBMiCka: $0.33  [CLR]
Log: ...
```

## DOM Selektory

- Up: `#outcome-buttons button.trading-button[value="0"]`
- Down: `#outcome-buttons button.trading-button[value="1"]`
- Buy tab: `button[role="radio"][value="BUY"]`
- Amount: `#market-order-amount-input`
- +$1: button s textem "+$1"
- Trade: `button.trading-button[data-color="blue"]`
- Go to live: `button[aria-label="Go to live market"]` nebo button > p "Go to live market"
- Price to beat: span "Price to beat" -> parent -> span $XX,XXX.XX
- Current price: span "Current price" -> parent -> number-flow-react (shadow DOM)
- Cash: `a[href="/portfolio"]` -> p s textem "$XX.XX"

## Zname problemy

- "Will resolve" parser nefunguje (shadow DOM number-flow-react - closed?)
- Fresh auto-navigate: dispatchEvent MouseEvent misto .click() pro React SPA
- Safety net profit: nyni spravne secita obe pozice

## TODO dalsi session

- Fix resolve parser (hook na fetch/WS?)
- Export tradu do JSON
- Overit LIVE buy sekvenci na skutecnem marketu
