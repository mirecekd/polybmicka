# System Patterns

## Architektura userscriptu

```
Bootstrap
  |
  +-- URL Router (detekce live vs historical, SPA navigace)
  |
  +-- DOM Watcher (MutationObserver, ceka na trading panel)
  |
  +-- Page Adapter (selektory pro UI elementy)
  |     +-- findTradingPanel()
  |     +-- findBuySellTabs()
  |     +-- findUpDownButtons()
  |     +-- findAmountControls()
  |     +-- findGoToLiveMarketButton()
  |
  +-- Market Reader (sampling cen z Up/Down buttonu)
  |     +-- parsePrice(buttonText) -> number
  |     +-- sample() -> { timestamp, upPrice, downPrice }
  |
  +-- Trend Engine (analyza trendu)
  |     +-- rolling window 10s
  |     +-- slope calculation
  |     +-- signal generation
  |
  +-- UI Overlay (vlastni panel)
  |     +-- toggle ON/OFF
  |     +-- status display
  |     +-- trend indicator
  |     +-- price display
  |     +-- signal display
  |     +-- log panel
  |
  +-- Execution Engine (zatim simulated)
        +-- BUY_SIM / SELL_SIM
        +-- (Faze 3: guarded real clicks)
```

## Klicove patterny

- **Observer pattern:** MutationObserver pro cekani na DOM elementy
- **Polling:** setInterval pro sampling cen (250-500ms)
- **Rolling window:** posledních N vzorku pro trend kalkulaci
- **State machine:** IDLE -> MONITORING -> SIGNAL -> (SIMULATED_BUY -> SIMULATED_SELL)
- **Guard clauses:** pred kazdou akci overit stav (spravna stranka, spravny tab, toggle ON)

## Konvence

- Vsechny DOM selektory na jednom miste (page adapter) pro snadnou aktualizaci
- Overlay panel ma fixni CSS, nepropousti eventy do Polymarket UI
- Console log prefix `[PolyBMiCka]` pro snadne filtrovani
