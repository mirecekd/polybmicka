# PolyBMiCka

Polymarket Bitcoin Micro Cycle clicking automat - Tampermonkey userscript pro monitoring a simulaci obchodovani na Polymarket BTC Up/Down 5-minutovych trzich.

<div align="center">

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/mirecekdg)

</div>

## Co to dela

Tampermonkey skript, ktery na Polymarket strance BTC Up/Down 5-minute marketu:

- Cte ceny Up/Down podilu v realnem case (kazdych 500ms)
- Pocita 10s trend (smer, sila, streak)
- Ukazuje overlay panel s cenami, trendem, timerem a signalem
- Simuluje nakupy podle pravidel (>75c, <2min do konce, streak>=3)
- Pocita simulovany profit a uklada ho persistentne

## Instalace

1. Nainstaluj [Tampermonkey](https://www.tampermonkey.net/) do Google Chrome
2. Otevri Tampermonkey Dashboard > "+" (novy skript)
3. Smaz default obsah a vloz cely obsah `polybmicka.user.js`
4. Uloz (Ctrl+S)
5. Otevri [Polymarket BTC 5min market](https://polymarket.com/event/btc-updown-5m-)

## Pouziti

- **ON/OFF** - zapne/vypne monitoring cen
- **SIM BUY: ON/OFF** - zapne/vypne simulovane nakupy (nic se skutecne nekupuje)
- Signal se zobrazi jen kdyz jsou splneny vsechny podminky
- Profit se uklada mezi sessions

## Obchodni pravidla

| Pravidlo | Hodnota |
|----------|---------|
| Max nakup | $1 za market |
| Min cena | >75c |
| Max cas | <2 min do konce |
| Min streak | >=3 consecutive |

## Disclaimer

Toto je experimentalni nastroj. Nic se skutecne nekupuje - vsechno je simulace. Pouzivejte na vlastni riziko.
