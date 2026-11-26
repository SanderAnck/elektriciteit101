# Centrale opslag in Google Drive (versie 3)

Met deze koppeling staan alle **klassen, leerlingprofielen en sterren** in één Google Sheet
in jouw Drive. De Chromebooks houden enkel een tijdelijke kopie bij van de leerling die er
op dat moment aan werkt. Op de Chromebooks hoeft niemand met Google in te loggen.

Wat er in de sheet komt: de klasnamen, de voornaam of bijnaam en het icoontje van elke
leerling, de naam van het laatste toestel, en per les de sterren, het aantal fouten en
hints en wanneer de les af was. Niets anders.

## 1. Maak een nieuwe Google Sheet

1. Ga naar [sheets.new](https://sheets.new) met je (privé) Google-account.
2. Geef de sheet een naam, bv. **Stroomkringen**.

## 2. Plak het script

1. Kies in de sheet **Extensies → Apps Script**.
2. Wis alles in `Code.gs` en plak de volledige inhoud van
   [`google/Code.gs`](Code.gs) uit deze repo.
3. Vul bovenaan twee eigen codes in, zonder spaties:
   - `TOESTELCODE`: de Chromebooks gebruiken die. Ze zit in de koppellink, dus de
     leerlingen moeten ze nooit typen (bv. `stroom-2026`).
   - `LEERKRACHTCODE`: alleen jij gebruikt die om klassen te beheren, alles te bekijken
     en de sheet te wissen. Kies iets geheims en gebruik niet dezelfde als de toestelcode.
4. Klik op het diskette-icoon (**Project opslaan**).
5. Optioneel: kies bovenaan de functie `setup` en klik op **Uitvoeren**. Dan staan de
   tabbladen *Klassen*, *Leerlingen* en *Voortgang* er meteen. Anders komen ze vanzelf.

## 3. Implementeer als web-app

1. Klik rechtsboven op **Implementeren → Nieuwe implementatie**.
2. Klik op het tandwieltje naast *Type selecteren* en kies **Web-app**.
3. Vul in:
   - Beschrijving: `Stroomkringen`
   - **Uitvoeren als: Ik**
   - **Wie heeft toegang: Iedereen**
4. Klik op **Implementeren**. Google vraagt toestemming: kies je account,
   klik op **Geavanceerd → Ga naar … (onveilig)** en **Toestaan**. Dat is normaal voor
   een eigen script: het script mag dan alleen in deze sheet schrijven.
5. Kopieer de **URL van de web-app**. Die eindigt op `/exec`.

## 4. Koppel je eigen toestel

1. Open de app en ga naar het **leerkrachtendeel** (hoedje rechtsboven, code `1234`
   zolang het toestel niet gekoppeld is).
2. Vul bij **Koppelen aan Google Sheet** de URL, de toestelcode en een naam voor dit
   toestel in en klik op **Koppelen**. Wat er nog lokaal op dit toestel stond, wordt gewist.
3. Geef daarna je **leerkrachtcode** in. Vanaf nu opent het leerkrachtendeel met die code.

## 5. Maak je klassen

1. Typ bij **Klassen** een naam (bv. `5A`) en klik op **Klas toevoegen**. Herhaal voor
   elke klas.
2. Vink **Alle lessen vrij** aan als die klas niet les per les hoeft te werken.
3. Klik bij een klas op **Koppellink**. De link staat nu op je klembord.

## 6. Koppel de Chromebooks

Open op elke Chromebook één keer de koppellink (bv. via Classroom of mail) en geef het
toestel een naam (bv. `Chromebook 7`). Klaar:

- Met de **koppellink van een klas** staat de Chromebook meteen in die klas.
- Met de **koppellink zonder klas** (bij *Dit toestel*) kiest de leerling eerst zijn klas.

De leerling kiest daarna zijn profiel uit de lijst van zijn klas, of maakt een nieuw
profiel. Werkt hij morgen op een andere Chromebook, dan kiest hij daar gewoon dezelfde
naam: de sterren komen mee uit de sheet.

## 7. Beheer en overzicht

In het leerkrachtendeel:

- **Klassen**: toevoegen, hernoemen, verwijderen, alle lessen vrijgeven, koppellink.
- **Voortgang**: kies een klas en zie per leerling de sterren per les. Met **Reset** en
  **Verwijder** pas je een leerling aan op alle toestellen tegelijk.
- **Dit toestel**: naam, *Nu versturen*, koppellink zonder klas, *Ontkoppelen*.

In Drive zie je dezelfde gegevens in de tabbladen **Klassen**, **Leerlingen** en
**Voortgang**. Pas de gegevens liefst in de app aan, niet in de sheet zelf.

Een Chromebook stuurt zijn gegevens telkens als een leerling een les afrondt of een profiel
maakt. Zonder internet onthoudt hij dat en stuurt hij het later.

## 8. Opnieuw beginnen

Leerkrachtendeel → **Opnieuw beginnen** → **Google Sheet volledig wissen** → typ `WISSEN`.
Alle klassen, profielen en sterren verdwijnen uit de sheet. Het script, de URL en de
koppelingen blijven werken. Elke Chromebook merkt het bij de volgende verbinding en begint
vanzelf als nieuw. Daarna maak je je klassen opnieuw aan.

## Het script bijwerken naar een nieuwe versie

1. Open de sheet → **Extensies → Apps Script**.
2. Noteer je twee codes bovenaan.
3. Wis alles en plak de nieuwe code uit [`google/Code.gs`](Code.gs). Vul je twee codes
   opnieuw in, precies zoals ze waren. Klik op **Opslaan**.
4. **Implementeren → Implementaties beheren** → klik op het **potloodje** →
   bij *Versie* kies **Nieuwe versie** → **Implementeren**.
   Zo blijft de URL dezelfde en hoef je de Chromebooks niet opnieuw te koppelen.
   (Kies dus niet "Nieuwe implementatie": dat geeft een nieuwe URL.)

## Van versie 2 naar 3

Versie 3 werkt met klassen en hoort in een **nieuwe** sheet (stappen 1 tot 6). Toestellen die
nog aan de oude sheet gekoppeld waren, gebruiken die niet meer: open op elke Chromebook de
nieuwe koppellink. De oude sheet mag je daarna weggooien.

## Later naar de schooldrive

Werkt de test? Herhaal dan dezelfde stappen met een sheet op je schoolaccount (als de
beheerder web-apps toelaat). De nieuwe koppellinks zetten alle Chromebooks om.
