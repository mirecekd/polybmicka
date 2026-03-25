# Active Context

## Aktualni focus

v0.3.0 - 3-state buy mode (OFF/SIM/LIVE) s moznosti skutecneho obchodovani.

## Co uz funguje (v0.2.2)

- Monitoring cen z DOM (100ms sampling)
- Trend engine (10s rolling window, streak detection)
- Signal generovani (>75c, <2:30 remaining, streak>=3)
- Simulovany nakup s profit trackerem (persistent GM_setValue)
- Winner detekce z BTC Price to beat vs Current price (cached)
- Kliknuti +$1 na Polymarket UI pri sim buy
- CLR button pro reset profitu
- Overlay: 280px, 45vh log, timer, prices, trend, signal, sim trade, profit

## Aktualni stav v0.3.3

- 2 separatni SIM/LIVE tlacitka (SIM ma prioritu - blokuje LIVE)
- Trading window: 150s (2:30) od konce marketu
- Cenove okno: 75c < cena <= 97c
- LIVE mode: klikne Buy tab + outcome + +$1 + Buy Up/Down za ~100ms
- "Will resolve" row - realtime predikce z Price to beat vs Current price (shadow DOM parser)
- Cached BTC result pro spravnou resoluci pri expiraci
- CLR button pro reset profitu
- Persistentni profit tracker (GM_setValue)
- 100ms sampling, deduplikovany signal logging

## TODO pro dalsi session

- Fix "Will resolve" parseru (shadow DOM `number-flow-react` nefunguje spolehlive)
- Safety net buy pri reverzu (stejne pravidla: 75c+, 1x za market, opacna strana)
- Export vysledku do JSON souboru (download)

## Dulezite DOM selektory

- Up button: `#outcome-buttons button.trading-button[value="0"]`
- Down button: `#outcome-buttons button.trading-button[value="1"]`
- Buy tab: `button[role="radio"][value="BUY"]`
- Amount: `#market-order-amount-input`
- +$1: button s textem "+$1"
- Trade/Buy button: `button.trading-button[data-color="blue"]` (text "Buy Up" / "Buy Down")
- Price to beat: span "Price to beat" -> parent -> span.text-heading-2xl
- Current price: span "Current price" -> parent -> number-flow-react
