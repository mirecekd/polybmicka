# Progress

## Co funguje (v0.3.3)

- Monitoring 100ms sampling z DOM
- Trend engine 10s rolling window
- Signal generator (75-97c, <2:30, streak>=3, 1x/market)
- 2 SIM/LIVE tlacitka (SIM priorita)
- LIVE mode: outcome click -> +$1 -> trade button (~100ms)
- Safety net buy pri reverzu (1x, 75c+ pravidlo)
- Fresh toggle - auto-navigate na live market (30s delay nebo hned pri zapnuti)
- CLR profit reset
- Resolve display (zatim nefunguje - shadow DOM problem)
- Persistent profit tracker (GM_setValue)
- Cached BTC result pro resoluci
- Deduplikovany signal logging

## Zname problemy

- "Will resolve" parser nefunguje (shadow DOM number-flow-react)
- Safety net profit accounting - nescita obe pozice v resolveMarket
- Export vysledku neni implementovan

## TODO dalsi session

- Fix resolve parser (shadow DOM) - mozna hookovat na fetch/WS
- Safety net profit - secist hlavni + safety pozici
- Export tradu do JSON
- Overit LIVE buy sekvenci na skutecnem marketu
