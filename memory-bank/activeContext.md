# Active Context

## Aktualni stav: v0.5.2

Plne funkcni Tampermonkey userscript pro Polymarket BTC Up/Down 5min markety.

## Features v0.5.x

- 100ms DOM sampling cen z #outcome-buttons
- 10s rolling window trend engine (streak detection)
- Signal generator: 75-97c, streak>=3, 1x/market
- 3-tier timing: default 1:30, Early 2:30, Earlier 3:30 (cycling button)
- 2 SIM/LIVE tlacitka (SIM priorita - blokuje LIVE)
- LIVE mode: outcome click -> +$1 -> trade button
- Safety net buy pri reverzu (1x, 75c+ pravidlo, profit accounting, skip +$1)
- Safety net display: UP/DOWN lines + P&L scenarios
- Fresh toggle - auto-navigate na live market (30s delay)
- Race mode - buy pri BTC diff >= $100 (modre tlacitko vedle Cash)
- CLR profit reset
- Resolve display (parser pro Price to beat vs Current price)
- Cash scraping z "Cash" label v nav (ne Portfolio)
- Cash display na radku 3 s Race tlacitkem
- Cash safety: LIVE blokuje pokud cash < $12, SIM ignoruje
- Profit killswitch: profit < -$5 -> hlavni vypinac OFF
- Page leave killswitch: odchod z BTC 5min -> OFF
- Overlay hidden na non-BTC stranach, visible na BTC 5min
- Persistent profit tracker (GM_setValue)
- Shortened labels: T: (trend), S: (signal), Profit: (bez "from PolyBMiCka")
- Dynamic rules display (meni se s Early/Earlier)

## UI Layout

```
PolyBMiCka v0.5.2               [ON]
Status: MONITORING              [Fresh]
Market: BTC 5min @ 13:30:00    [Earlier]
Cash: $15.47                    [Race]
Resolve: DOWN -122.60 ($71200.14)
Time: 2:56 HOT  Rules: >75c, <3:30, $1
UP: 6c  DOWN: 95c
T: FLAT 0c in 8.4s (streak: 1)
S: none
[SIM: ON]        [LIVE: OFF]
DOWN @ 77c $1
pot. profit: +$0.30
Profit: $0.33                   [CLR]
Log: ...
```

## Trade Button - LIVE klik NEFUNGUJE

Button DOM: `button.trading-button[data-color="blue"][data-three-dee][data-tapstate="rest"]`
Text je rozdeleny na jednotlive spany s opacity: "B","u","y"," ","D","o","w","n"

### Co jsme zkouseli a nefunguje:

1. **btn.click()** - nefunguje (puvodni implementace)
2. **pointerdown/mousedown -> pointerup/mouseup -> click** (setTimeout 50ms) - nefunguje
3. **focus() + KeyboardEvent Enter keydown/keyup + click()** - nefunguje
4. **React __reactProps$ onClick** + centered PointerEvent/MouseEvent sequence - aktualni, otestovat

### Mozne dalsi pokusy:

- Vyhledat React fiber strom a najit onClick handler vyse
- Pouzit HTMLElement.prototype.click pres unsafeWindow
- Hook na Polymarket API misto DOM klikani
- Puppeteer-like approach pres CDP (nesplnitelne v userscriptu)

## DOM Selektory

- Up: `#outcome-buttons button.trading-button[value="0"]`
- Down: `#outcome-buttons button.trading-button[value="1"]`
- Buy tab: `button[role="radio"][value="BUY"]`
- Amount: `#market-order-amount-input`
- +$1: button s textem "+$1"
- Trade: `button.trading-button[data-color="blue"]`
- Go to live: `button[aria-label="Go to live market"]`
- Price to beat: span "Price to beat" -> parent -> span $XX,XXX.XX
- Current price: span "Current price" -> parent -> number-flow-react (shadow DOM)
- Cash: iterace `a[href="/portfolio"]` -> p "Cash" + p "$XX.XX"

## TODO dalsi session

- Fix LIVE trade button click (hlavni blocker!)
- Fix resolve parser (hook na fetch/WS?)
- Export tradu do JSON
