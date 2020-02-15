# Ma is elkések-e? (ma-is-elkesek-e.hu)

Vázolom a következő szituációt:

Pistike ül a buszon az élet gondjain elmélkedve, amikor a jármű beáll a megállóba. Pistike belegondol, hogy lehet le kéne itt szállni és inkább lesétálni innen már a maradék távot, mert a busz sokszor dugóba keveredik ezen a szakaszon és gyalog gyorsabban odaérhetne. Miközben ezen elmélkedik becsukódik az ajtó.

Pistike: "Jaj ne!"

A busz továbbgördül és Pistike meglátja az előttük álló hatalmas dugót.

Pistike: "Bárcsak lett volna rá mód, hogy előre megnézzem, hogy annyira be van-e állva ez az út szakasz, mint én!"

**HÁT VAN IS!** A *Ma is elkések-e?* weboldalon egy útszakasz megadásával megnézheted, hogy körülbelül mennyi idő alatt fogja megtenni a buszod ezt a távot.

Pistike: "Jajj de hülye voltam, hogy nem néztem rá  a *ma-is-elkesek-e.hu*-ra!"

## Használat

Letöltés után a projekt könyvtárán belül a *src* mappában szükséges létrehozni egy *config.js* fájlt a következő tartalommal:

```javascript
module.exports = {
	databaseUrl: "mongodb+srv://node-server:9ahtrXRyp5sRvm77@ma-is-elkesek-e-ejiov.mongodb.net/ma-is-elkesek-e?retryWrites=true&w=majority"
};
```

Ez a fájl biztonsági okokból nincs fent GitHub-on (tartalmaz minden adatot, ami az adatbázishoz való kapcsolódáshoz szükséges). Amint a repository nyilvánossá válik, ezek az adatok le lesznek cserélve (új felhasználónév, jelszó, stb) és ez a rész ki lesz törölve innen.

A szerver futtatásához szükséges a Node program. Indításhoz navigáljunk a projekt könyvtárán belül a *src* mappába egy parancssorban és írjuk be a következőt: 

```bash
npm install
node server.js -v
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

## Készítők

- [Bandi1234](https://github.com/Bandi1234 "Bandi1234 GitHub Profilja") - Frontend
- [hentesoposszum](https://github.com/hentesoposszum/ "hentesoposszum GitHub Profilja") - Backend
- [Kris030](https://github.com/Kris030 "Kris030 GitHub Profilja") - [Bandi1234](https://github.com/Bandi1234 "Bandi1234 GitHub Profilja") kódjának megtisztítása
