# Product Context

## Proc tento projekt existuje

Polymarket nabizi 5-minutove BTC Up/Down trhy, kde se sazi na to, jestli cena Bitcoinu pujde nahoru nebo dolu. Ceny podilu (napr. Up 3c / Down 98c) se meni v realnem case. Pokud cena podilu konzistentne roste (napr. Up jde z 3c na 10c), je mozne koupit levne a prodat draze behem sekund.

Problem je, ze to rucne klikat je pomale a neefektivni. PolyBMiCka automatizuje monitoring a (pozdeji) samotne obchodovani.

## Jak to ma fungovat

1. Skript bezi na pozadi v Chrome pri otevrene Polymarket strance
2. Sleduje ceny Up/Down podilu v realnem case (cteni z DOM)
3. Pocita kratkodoba trend (smer, sila, konzistence)
4. Zobrazuje overlay panel s aktualni situaci
5. (Pozdeji) automaticky provadi mikro-obchody za $1

## UX cile

- Minimalni zasah do Polymarket UI
- Maly overlay panel vedle buy/sell karty
- Jasny ON/OFF toggle
- Transparentni logging - uzivatel vidi co skript dela a proc
- Zadne prekvapive akce - vse je viditelne

## Rizika a omezeni

- Spread a fees mohou smazat mikro-zisk
- Latence DOM cteni vs. skutecna cena
- Polymarket muze zmenit UI/DOM strukturu
- Regulatorni riziko automatizovaneho obchodovani
