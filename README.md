# Stroomkringen

Interactieve STEM-app voor het 5de en 6de leerjaar: bouw en test elektrische stroomkringen
met batterijen, lampjes, LED's, zoemers, motoren, schakelaars, drukknoppen en draden.
Met een vrije **zandbak** en **11 opdrachten** van makkelijk naar moeilijk.

Progressive Web App (PWA): één statische site, geen backend, geen build-stap, geen
npm-dependencies. Alle gegevens blijven lokaal op het toestel (IndexedDB): geen login,
geen account, geen tracking. Gemaakt voor laptops en Chromebooks in liggende stand
(vanaf 1366×768); op een te klein scherm toont de app een melding.

## Structuur

| Pad | Inhoud |
| --- | --- |
| `index.html` | App-shell met topbalk en navigatie |
| `css/app.css` | Design system: kleurtokens, typografie, knoppen, kaarten, werkscherm |
| `js/app.js` | Hash-router (`#/start`, `#/zandbak`, `#/opdrachten`, `#/les/3`, `#/leerkracht`), topbalk, service worker |
| `js/views.js` | Schermen: start, profielen, zandbak, opdrachten, les, leerkrachtendeel |
| `js/workspace.js` | Werkscherm: knoppenbalk, gereedschapskist, werkblad, zijpaneel, sneltoetsen |
| `js/cloud.js` | Optionele centrale opslag in een Google Sheet |
| `google/` | Apps Script voor de Google Sheet en de handleiding `KOPPELING.md` |
| `js/store.js` | Instellingen, leerlingprofielen, voortgang, opgeslagen schakelingen |
| `js/db.js` | IndexedDB-opslag plus export/import (back-up) |
| `js/ui.js` | Meldingen, dialoogvensters, tooltip, bestanden |
| `js/sound.js` | Geluid (zoemer, succes) met de Web Audio API |
| `js/version.js` | Versienummer, verhogen bij elke wijziging |
| `js/circuit/parts.js` | Onderdelen: namen, uitleg, aansluitpunten, weerstand |
| `js/circuit/model.js` | Schakeling als JSON, raster, ongedaan maken/opnieuw |
| `js/circuit/sim.js` | Simulatie (los van de tekeningen, testbaar in Node) |
| `js/circuit/explain.js` | Uitleg per onderdeel: waarom het werkt, waarom niet, wanneer het doorbrandt |
| `js/circuit/draw.js` | SVG-tekeningen van de onderdelen |
| `js/circuit/editor.js` | Slepen, draden trekken, selecteren, stroombolletjes |
| `js/lessons/lessons.js` | **De lessen als gegevens** (zie hieronder) |
| `js/lessons/checks.js` | Regels voor de knop "Controleer" |
| `tests/` | Tests voor simulatie en lescontroles |
| `sw.js` | Service worker voor offline gebruik |
| `icons/` | App-iconen |

## Hoe de simulatie werkt

Elke aansluiting is een knooppunt. Draden en gesloten schakelaars zijn heel kleine
weerstanden, lampjes, zoemers en motoren hebben een vaste weerstand, een batterijcel is een
spanningsbron met een kleine inwendige weerstand. Een LED geleidt alleen van + naar −.
Met de knooppuntmethode volgt de stroom door elk onderdeel; kinderen zien enkel
**uit / zwak / fel / extra fel**, nooit getallen.

- Twee lampjes in serie branden zwak, parallel even fel als één lampje.
- Twee batterijen in serie: extra fel.
- Drie batterijtypes: gewone batterij (1,5 V), platte batterij (4,5 V, 3 cellen) en blokbatterij (9 V, 6 cellen).
- Te veel stroom (meer dan 2,5 × normaal) laat een lampje of LED **doorbranden**. Het blijft kapot tot je het vervangt (knop "Nieuw"). Lampjes in serie of een weerstand remmen de stroom af.
- Een LED verkeerd om brandt niet, met een hint.
- Een onderdeel met een draad ernaast is *overbrugd* en werkt niet, met uitleg.
- Kortsluiting (zeer grote stroom door de batterij): rode, warme batterij, rode draden en een waarschuwing.

## Lessen aanpassen of toevoegen

Open `js/lessons/lessons.js`. Elke les is een blok met `title`, `intro`, `toolbox`
(onderdelen en aantal), eventueel een `start`-schakeling, en één of meer `steps` met een
`goal`, `check`-regels, vragen en `hints`. De beschikbare regels staan bovenaan
`js/lessons/checks.js`, bijvoorbeeld:

```js
check: [{ rule: 'bediend', part: 'lamp', by: 'switch' }]   // schakelaar bedient het lampje
check: [{ rule: 'serie', part: 'lamp', count: 2 }]         // twee lampjes in serie
```

De controle gebeurt met de simulatie: elke juiste oplossing telt, ongeacht de tekening.
Sterren: 3 zonder fout en zonder hint, 2 bij hoogstens 2 fouten/hints samen, anders 1.

### Aansluiting bij de onderwijsdoelen

De lessen werken rond de stroomkring (open/gesloten), schakelaar en drukknop, serie- en
parallelschakeling, de richting van de stroom (LED), geleiders en isolatoren, en veilig
omgaan met elektriciteit (kortsluiting, stopcontact). Per les staat in `eindterm` waar ze
bij aansluit.

## Leerkrachtendeel

Via het hoedje rechtsboven. Standaardcode: **1234** (te wijzigen in het leerkrachtendeel).
Daar zie je de voortgang per leerling, geef je alle lessen vrij, reset je voortgang en
maak je een back-up (export/import als bestand).

## Centrale opslag (optioneel)

Standaard blijft alles op het toestel. Koppel je een Google Sheet, dan staan klassen,
profielen en sterren centraal en houden de Chromebooks enkel een tijdelijke kopie bij.
Leerlingen kiezen hun klas en hun profiel, op elk gekoppeld toestel. Vanuit de app beheer
je de klassen en kan je de sheet volledig wissen om opnieuw te beginnen.
Zie [`google/KOPPELING.md`](google/KOPPELING.md).

## Lokaal testen

```sh
python3 -m http.server 8000
```

en open `http://localhost:8000`. Tests voor de simulatie (Node 18 of nieuwer):

```sh
node --test tests/*.test.mjs
```

## Publiceren

De site draait op GitHub Pages vanaf de `main`-branch (map `/`).
Verhoog `js/version.js` bij elke wijziging, zodat geïnstalleerde apps de update ophalen.
