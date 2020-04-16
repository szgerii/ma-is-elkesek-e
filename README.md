# Ma is elkések-e?

Az oldal a következő címen érhető el: [ma-is-elkesek-e.hu](http://ma-is-elkesek-e.hu)

Vázolom a következő szituációt:

Pistike ül a buszon az élet gondjain elmélkedve, amikor a jármű beáll a megállóba. Pistike belegondol, hogy lehet le kéne itt szállni és inkább lesétálni innen már a maradék távot, mert a busz sokszor dugóba keveredik ezen a szakaszon és gyalog gyorsabban odaérhetne. Miközben ezen elmélkedik becsukódik az ajtó.

Pistike: "Jaj ne!"

A busz továbbgördül és Pistike meglátja az előttük álló hatalmas dugót.

Pistike: "Bárcsak lett volna rá mód hogy előre megnézzem mennyire van beállva ez az út szakasz!"

**HÁT VAN IS!** A *Ma is elkések-e?* weboldalon egy útszakasz megadásával megnézheted, hogy körülbelül mennyi idő alatt fogja megtenni a buszod ezt a távot.

Pistike: "Jajj de hülye voltam, hogy nem néztem rá  a *ma-is-elkesek-e.hu*-ra!"

## Használat

### config.js

A szerver a futáshoz szükséges adatok a *src/config.js* fájlból olvassa ki. Ez a fájl viszont nem része a letöltött projektnek.

Ahhoz, hogy rendesen működjön a szerver másoljuk a *src/config.default.js* fájl tartalmát a *src/config.js* fájlba és cseréljük ki benne a < és > szimbólumok közé tett értékeket a saját (működő) adatainkra.

**MEGJEGYZÉS:** Ez a fájl része a Git által ignorált fájloknak, így a saját/ideiglenes értékek nem kerülnek fel GitHub-ra.

### Telepítés és indítás

A szerver futtatásához szükséges a Node program. Indításhoz navigáljunk a projekt könyvtárába egy parancssorban és írjuk be a következőt:

```bash
npm install
node src/server.js
```

Az első sor telepít mindent, amire a szervernek szüksége van (ezt csak egyszer kell futtatni), a második pedig elindítja azt.

A szerver a következő sorrendben választ portot a futásra:

1. PORT környezeti változó (ha van)
2. PORT változó a config.js fájlban (ha van)
3. 1104

### Naplózás

Ahhoz, hogy a szerver *beszédes* módban induljon el, adjuk meg a parancssorban a program indítása mellé a "-v" vagy a "--verbose" paramétereket. Ez az olyan alapvető dolgokat fogja a konzolra írni, mint a szerver indítás/leállítás, adatbázis kapcsolódás és alapvető leírás a hibákról, ha történnek. Ha részletesebb hibaüzeneteket szeretnénk látni, arra van az:

*Extra beszédes* mód. Ehhez "-xv"-t vagy "--extra-verbose"-t kell a szervernek megadni. Ez minden kapott kérést és elküldött választ naplózni fog, valamint az adatbázis ellenőrzéseket is. Hiba esetén kiírja az egész hiba objektumot.

Ha a naplót fájlba is szeretnénk menteni, akkor azt az "-o [könyvtár név]" paraméterrel tehetjük meg, ahol a könyvtár név megszabja, hogy hova fognak kerülni a napló fájlok. Minden szerver indításnál létre fog hozni egy **server-[időbélyeg].log** fájlt. **Ehhez a fájlhoz a szerver futása alatt nem tanácsos hozzányúlni**, mivel a program folyamatosan nyitva tart a fájllal egy stream-et. A fájlba írás alapból *extra bőbeszédű* módra van állítva, és ezt egyelőre nem lehet megváltoztatni.

## API leírás

A belső API (felhasználó kezelés, top 3 lista kezelés, stb.) leírása [itt érhető el](https://stoplight.io/p/docs/gh/hentesoposszum/ma-is-elkesek-e?group=master&utm_campaign=publish_dialog&utm_source=studio "API leírás").

## Készítők

- [Bandi1234](https://github.com/Bandi1234 "Bandi1234 GitHub Profilja") - Frontend
- [hentesoposszum](https://github.com/hentesoposszum/ "hentesoposszum GitHub Profilja") - Backend
- [Kris030](https://github.com/Kris030 "Kris030 GitHub Profilja") - tesztelés, design tisztítás, Bandi1234 kódjának tisztítása
