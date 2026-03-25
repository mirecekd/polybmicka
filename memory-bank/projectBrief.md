# PolyBMiCka - Project Brief

## Nazev

PolyBMiCka = Polymarket Bitcoin Micro Cycle clicking automat

## Cil

Tampermonkey userscript pro Google Chrome, ktery na Polymarket strance "Bitcoin Up or Down - 5 Minutes" monitoruje ceny Up/Down podilu, pocita trend a (pozdeji) automaticky provadi mikro-obchody.

## Klicove pozadavky

1. **Faze 1 (aktualni):** Pozorovaci rezim - monitoring cen, trend, UI overlay, zadne skutecne obchody
2. **Faze 2:** Simulator signalu - hypotheticke buy/sell signaly
3. **Faze 3:** Guarded execution - skutecne klikani s tvrdymi guardy
4. **Faze 4:** Lepsí data source - hook na fetch/WS misto DOM-only

## Omezeni

- Skript se importuje rucne do Tampermonkey (= jeden .user.js soubor, vanilla JS)
- Polymarket je SPA - dynamicky DOM, URL se meni bez page reload
- Trhy se meni kazdych 5 minut - novy URL s unix timestamp
- Live market URL pattern: `https://polymarket.com/event/btc-updown-5m-{timestamp}`
- Historical market ma tlacitko "Go to live market"

## Uzivatelsky scenar

1. Uzivatel otevre Polymarket BTC 5min page
2. Skript rozpozna historical vs. live market
3. Na live marketu zacne sampling cen z Up/Down buttonu
4. Overlay panel vedle buy/sell karty ukazuje: trend, ceny, signal, log
5. Toggle ON/OFF pro celý system
