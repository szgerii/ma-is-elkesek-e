# Ma is elkések-e?

~~Az oldal a következő címen érhető el: [ma-is-elkesek-e.hu](http://ma-is-elkesek-e.hu)~~

## Jelenlegi állapot

A BKK API-ba behozott változások (főképp a nyilvánosan elérhető részek teljes megszüntetése) következtében le kellett állítanunk a weboldalt, mivel már nem volt képes az eredeti céljainak eleget tenni. Sajnos még ha szereznénk is kulcsot, úgy néz ki a teljes BKK API-al interaktáló részt újra kéne írni strukturális változások miatt.

## Használat

### config.js

A szerver a futáshoz szükséges adatokat a *src/config.js* fájlból olvassa ki. Ez a fájl viszont nem része a letöltött projektnek.

Ahhoz, hogy rendesen működjön a szerver másoljuk a *src/config.default.js* fájl tartalmát a *src/config.js* fájlba és cseréljük ki benne a < és > szimbólumok közé tett értékeket a saját rendszerünk adataira.

**MEGJEGYZÉS:** Ez a fájl része a Git által ignorált fájloknak, így nem kell félni, hogy a saját/ideiglenes értékeink felkerülnek GitHub-ra.

### Telepítés és indítás

A szerver futtatásához szükséges a Node program. Indításhoz navigáljunk a projekt könyvtárába egy parancssorban és írjuk be a következőt:

```bash
npm install
```

Ez telepít mindent, amire a szervernek szüksége van a futáshoz (ezt elég egyszer futtatni).

A szervert a következő parancsok egyikével indíthatjuk el:

```bash
npm start
node src/server.js -v
```

**MEGJEGYZÉS**: A "-v" paraméter a naplózás szintjét állítja. Részletekért lásd a [Naplózás](#naplózás) szekciót.

A szerver a következő sorrendben választ portot a futásra:

1. PORT környezeti változó (ha van)
2. PORT változó a config.js fájlban (ha van)
3. 1104

### Naplózás

Ahhoz, hogy a szerver *verbose* módban induljon el, adjuk meg a parancssorban a program indítása mellé a "-v" vagy a "--verbose" paramétereket. Ez az olyan alapvető dolgokat fogja a konzolra írni, mint a szerver indítás/leállítás, adatbázis kapcsolódás és alapvető leírás a hibákról, ha történnek. Ha részletesebb hibaüzeneteket szeretnénk látni, arra van az:

*Extra verbose* mód. Ehhez "-xv"-t vagy "--extra-verbose"-t kell a szervernek megadni. Ez minden kapott kérést és elküldött választ naplózni fog, valamint az adatbázis ellenőrzéseket is. Hiba esetén kiírja az egész hiba objektumot.

Ha a naplót fájlba is szeretnénk menteni, akkor azt az "-o [könyvtár név]" paraméterrel tehetjük meg, ahol a könyvtár név megszabja, hogy hova fognak kerülni a napló fájlok. Minden szerver indításnál létre fog hozni egy **server-[időbélyeg].log** fájlt. **Ehhez a fájlhoz a szerver futása alatt nem tanácsos hozzányúlni**, mivel a program folyamatosan nyitva tart a fájllal egy stream-et. A fájlba írás alapból *extra verbose* módra van állítva, és ezt egyelőre nem is lehet megváltoztatni.

### Fejlesztés

Ha szeretnénk, hogy a szerver magától újrainduljon a fájlok módosítása után, használjuk a "dev" nevű npm scriptet.

```bash
npm run dev
```

Ez megegyezik a következő futtatásával:

```bash
npx nodemon -q src/server.js -xv
```

### Build

Ha az oldalt élőben szeretnénk futtatni, érdemes előtte **Bob, the buildtool** segítségét kérni (bob.js). Ez a script minimalizálja (whitespace kivétel, változó nevek rövidítése, stb.) és tömöríti (szövegeket veszteségmentesen, képeket veszteségesen) a nyilvános fájlokat. Ez gyorsabb válaszidőkhöz vezet a szerver részéről.

Bob a készített fájlokat a *dist* mappába rakja (felülírva a mappa előző verzióját). Ahhoz, hogy a szerver ezeket kezdje használni a PRODUCTION környezeti változónak bármilyen, nem üres értéket kell adni.

Bob futtatása:

```bash
npm run build
```

PRODUCTION változó beállítása (Linux):

```bash
export PRODUCTION=1
```

## Készítők

- [Bandi1234](https://github.com/Bandi1234 "Bandi1234 GitHub Profilja") - Frontend
- [szgerii](https://github.com/szgerii/ "szgerii GitHub Profilja") - Backend
- [Kris030](https://github.com/Kris030 "Kris030 GitHub Profilja") - tesztelés, design tisztítás, Bandi1234 kódjának tisztítása
