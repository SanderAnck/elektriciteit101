# Centrale opslag in Google Drive

Met deze koppeling sturen alle Chromebooks de voortgang van hun leerlingen naar één
Google Sheet in jouw Drive. In het leerkrachtendeel van de app zie je dan alle toestellen
samen. Op de Chromebooks hoeft niemand met Google in te loggen.

Wat wordt verstuurd: de naam van het toestel, de voornaam of bijnaam en het icoontje van
elke leerling, en per les de sterren, het aantal fouten en hints en wanneer de les af was.
Niets anders.

## 1. Maak de Google Sheet

1. Ga naar [sheets.new](https://sheets.new) met je (privé) Google-account.
2. Geef de sheet een naam, bv. **Stroomkringen voortgang**.

## 2. Plak het script

1. Kies in de sheet **Extensies → Apps Script**.
2. Wis alles in `Code.gs` en plak de volledige inhoud van
   [`google/Code.gs`](Code.gs) uit deze repo.
3. Vul bovenaan twee eigen codes in, zonder spaties:
   - `KLASCODE`: de Chromebooks gebruiken die om gegevens te sturen (bv. `klas5b-2026`).
   - `LEERKRACHTCODE`: alleen jij gebruikt die om alles te bekijken. Kies iets geheims.
4. Klik op het diskette-icoon (**Project opslaan**).

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

## 4. Koppel de app

1. Open de app, ga naar het **leerkrachtendeel** (hoedje rechtsboven).
2. Vul onder **Centrale opslag (Google Drive)** de URL, de klascode en een naam voor dit
   toestel in, en klik op **Koppelen**. Klopt alles, dan zie je "Gekoppeld!".
3. Klik op **Koppellink voor andere toestellen**. De link staat nu op je klembord.
   Open die link één keer op elke Chromebook (bv. via Classroom of mail) en geef het
   toestel een naam. Klaar.

## 5. Bekijk de voortgang

- In de app: leerkrachtendeel → **Alle toestellen** → vul je leerkrachtcode in →
  **Gegevens ophalen**.
- Of open de sheet in Drive: tabblad **Leerlingen** (overzicht) en **Voortgang**
  (per les).

Een Chromebook stuurt zijn gegevens telkens als een leerling een les afrondt, een profiel
maakt of als er iets gereset wordt. Zonder internet onthoudt hij dat en stuurt hij later.

## Het script aanpassen

Pas je het script aan (bv. een nieuwe code)? Kies dan **Implementeren → Implementaties
beheren → potloodje → Versie: Nieuwe versie → Implementeren**. De URL blijft dezelfde.

## Later naar de schooldrive

Werkt de test? Herhaal dan dezelfde stappen met een sheet op je schoolaccount (als de
beheerder web-apps toelaat), en vul in de app de nieuwe URL in. De koppellink van de nieuwe
URL zet alle Chromebooks om.
