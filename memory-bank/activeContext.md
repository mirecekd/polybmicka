# Active Context

## Aktualni focus

Faze 1 - vytvoreni zakladniho monitorovaciho Tampermonkey skriptu.

## Co delame ted

- Tvorime skeleton userscriptu s:
  - Tampermonkey hlavickou
  - URL detekcí (live vs historical)
  - DOM observerem pro trading panel
  - Zakladnim UI overlay panelem (toggle, status, ceny)
  - Price sampling z Up/Down buttonu
  - Jednoduchym trend pocitanim
  - Console loggingem

## Rozhodnuti

- Zacneme cistym vanilla JS bez bundleru
- Jeden soubor `.user.js`
- DOM-only pristup (cteme ceny primo z buttonu)
- Zadne skutecne obchody v Fazi 1
- Sampling interval: 500ms

## Dalsi kroky

1. Vytvorit skeleton userscriptu
2. Otestovat na Polymarket - overit selektory
3. Doladit selektory podle skutecneho DOMu
4. Pridat trend engine
5. Pridat signal generator (simulated)

## Dulezite poznatky

- URL live marketu: `polymarket.com/event/btc-updown-5m-{timestamp}`
- Timestamp v URL je unix timestamp (napr. 1774429200 = 25.3.2026 10:00 CET)
- Ceny na buttonech jsou ve formatu "Up Xc" nebo "Down Xc" (centy)
- Polymarket je React SPA - DOM se meni dynamicky
