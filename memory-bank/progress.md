# Progress

## Co funguje (v0.4.0)

- Monitoring 100ms sampling z DOM
- Trend engine 10s rolling window
- Signal generator (75-97c, <2:30 nebo <3:30 s Early, streak>=3, 1x/market)
- 2 SIM/LIVE tlacitka (SIM priorita)
- LIVE mode: outcome click -> +$1 -> trade button (~100ms)
- Safety net buy pri reverzu (1x, 75c+ pravidlo)
- Safety net profit accounting (main + safety secitane)
- Fresh toggle - auto-navigate (30s delay, okamzite pri zapnuti)
- Early toggle - rozsiri trading window na 3:30
- CLR profit reset
- Resolve display (parser zatim nefunguje - shadow DOM)
- Persistent profit tracker (GM_setValue)
- Cached BTC result pro resoluci
- Deduplikovany signal logging
- Multiline sim trade display
- Background rgb(58,58,58)
- MIT LICENSE
- README s plnym popisem features

## Git statistiky

- 40+ commitu
- Branch: main
- Posledni commit: 769d251

## Zname problemy

- "Will resolve" parser nefunguje (shadow DOM number-flow-react)
- Fresh click nefunguje vzdy (dispatchEvent vs React routing)
- Export vysledku neni implementovan

## TODO dalsi session

- Fix resolve parser (hook na fetch/WS misto DOM)
- Export tradu do JSON (download)
- Overit LIVE buy sekvenci na skutecnem marketu
- Safety net: overit ze se spravne klikne na opacnou stranu
