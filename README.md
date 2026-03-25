# PolyBMiCka

Polymarket Bitcoin Micro Cycle clicking automat - Tampermonkey userscript pro monitoring a simulaci obchodovani na Polymarket BTC Up/Down 5-minutovych trzich.

<div align="center">

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/mirecekdg)

</div>

## Co to dela

Tampermonkey skript, ktery na Polymarket strance BTC Up/Down 5-minute marketu:

- Cte ceny Up/Down podilu v realnem case (kazdych 100ms)
- Pocita 10s trend (smer, sila, streak)
- Ukazuje overlay panel s cenami, trendem, timerem, resolve predikci a signalem
- Simuluje nebo provadi nakupy podle pravidel
- Pocita simulovany/realny profit a uklada ho persistentne
- Safety net buy pri reverzu marketu
- Auto-navigate na dalsi market (Fresh toggle)

## Instalace

1. Nainstaluj [Tampermonkey](https://www.tampermonkey.net/) do Google Chrome
2. Otevri Tampermonkey Dashboard > "+" (novy skript)
3. Smaz default obsah a vloz cely obsah `polybmicka.user.js`
4. Uloz (Ctrl+S)
5. Otevri [Polymarket BTC 5min market](https://polymarket.com/event/btc-updown-5m-)

## Pouziti

- **ON/OFF** - zapne/vypne monitoring cen
- **Fresh ON/OFF** - auto-navigate na dalsi live market po expiraci (30s delay)
- **SIM: ON/OFF** - zapne simulovane nakupy (nic se skutecne nekupuje)
- **LIVE: ON/OFF** - zapne skutecne nakupy (SIM musi byt OFF)
- **CLR** - resetuje profit na $0
- Signal se zobrazi jen kdyz jsou splneny vsechny podminky
- Profit se uklada mezi sessions

## Obchodni pravidla

| Pravidlo | Hodnota |
|----------|---------|
| Max nakup | $1 za market |
| Min cena | >75c |
| Max cena | <=97c |
| Max cas | <2:30 do konce |
| Min streak | >=3 consecutive |
| Safety net | 1x pri reverzu (75c+ pravidlo) |

## Overlay panel

- **Resolve** - realtime predikce vysledku z BTC Price to beat vs Current price
- **Timer** - odpocet z URL timestampu, HOT kdyz < 2:30
- **UP/DOWN** - aktualni ceny podilu
- **Trend** - smer, zmena, streak za poslednich 10s
- **Signal** - kdy by skript nakoupil
- **Sim** - aktualni simulovana pozice
- **Profit from PolyBMiCka** - persistentni celkovy profit

## Disclaimer

Toto je experimentalni nastroj. Pouzivejte na vlastni riziko. Automatizovane obchodovani nese provozni, trzni i regulatorni riziko.

## Author

Vyvinuto agentem Agent Zero headless, bez lidske supervize - pouze na zaklade pocatecnich instrukci a pristupu. Pokud se vam tato prace libi, neni snazsi cesta, nez prispet na muj provoz:

<div align="center">

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/mirecekdg)

</div>