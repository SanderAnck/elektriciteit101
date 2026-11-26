// De 10 opdrachten, als gewone gegevens.
// Je kan teksten aanpassen of een les toevoegen zonder de rest van de code
// te kennen. Per les:
//   id          volgnummer (lessen komen vrij in deze volgorde)
//   title       korte titel
//   icon        tekening op de kaart: battery, lamp, led, buzzer, motor, switch, button, resistor, material:munt …
//   intro       1 tot 3 korte zinnen: wat ga je leren?
//   toolbox     onderdelen in de gereedschapskist met het aantal (draden zijn altijd onbeperkt)
//   start       (optioneel) een schakeling die al klaar staat
//   steps       één of meer stappen, elk met:
//       goal       het doel, in één zin
//       check      de regels waaraan de schakeling moet voldoen (zie js/lessons/checks.js)
//       questions  (optioneel) vragen: { q, options: [...], answer: nummer van het juiste antwoord, vanaf 0 }
//       hints      hints, van een kleine tip naar bijna de oplossing
//   success     tekst bij succes
//   wistJeDat   "Wist je dat?" met het verband met het dagelijks leven
//   eindterm    (voor de leerkracht) waar de les bij aansluit

const MAT = ['munt', 'paperclip', 'potlood', 'alufolie', 'plastic', 'hout', 'papier', 'rubber'];

export const LESSONS = [
  {
    id: 1,
    title: 'Licht aan!',
    icon: 'lamp',
    intro: 'Een lampje brandt alleen als de stroom een rondje kan maken: van de batterij, door het lampje en terug naar de batterij.',
    toolbox: { battery: 1, lamp: 1 },
    steps: [
      {
        goal: 'Laat het lampje branden.',
        check: [{ rule: 'aan', part: 'lamp' }],
        hints: [
          'Sleep de batterij en het lampje naar het raster.',
          'Sleep een draad van een bolletje van de batterij naar een bolletje van het lampje.',
          'Je hebt twee draden nodig: één van de + naar het lampje en één van het lampje terug naar de −.',
        ],
      },
    ],
    success: 'Je maakte een gesloten stroomkring!',
    wistJeDat: 'In een zaklamp zit precies zo’n kring: batterij, lampje en een stukje metaal dat als draad werkt.',
    eindterm: 'Een eenvoudige stroomkring bouwen; open en gesloten kring.',
  },
  {
    id: 2,
    title: 'Aan en uit',
    icon: 'switch',
    intro: 'Met een schakelaar kan je de kring openen en sluiten. Zo zet je het lampje aan en uit.',
    toolbox: { battery: 1, lamp: 1, switch: 1 },
    steps: [
      {
        goal: 'Bouw een kring waarmee je het lampje aan en uit zet met de schakelaar.',
        check: [{ rule: 'bediend', part: 'lamp', by: 'switch' }],
        hints: [
          'Klik op de schakelaar om hem aan of uit te zetten.',
          'De schakelaar moet ín de kring staan: de stroom moet erdoor.',
          'Batterij + → schakelaar → lampje → batterij −.',
        ],
      },
    ],
    success: 'Je schakelaar opent en sluit de kring!',
    wistJeDat: 'Elke lichtschakelaar thuis doet hetzelfde: hij maakt de kring open of dicht.',
    eindterm: 'De functie van een schakelaar in een stroomkring.',
  },
  {
    id: 3,
    title: 'Ding-dong',
    icon: 'buzzer',
    intro: 'Een deurbel werkt alleen zolang je op de knop drukt. Dat doet een drukknop.',
    toolbox: { battery: 1, buzzer: 1, button: 1, switch: 1 },
    steps: [
      {
        goal: 'Bouw een deurbel: de zoemer zoemt alleen als je op de drukknop drukt.',
        check: [{ rule: 'bediend', part: 'buzzer', by: 'button' }],
        hints: [
          'Houd de muisknop ingedrukt op de drukknop om hem in te drukken.',
          'Een schakelaar blijft aan staan. Voor een bel heb je de drukknop nodig.',
          'Batterij + → drukknop → zoemer → batterij −.',
        ],
      },
    ],
    success: 'Ding-dong! Je deurbel werkt.',
    wistJeDat: 'Ook het knopje van de lift en de toetsen van een toetsenbord zijn drukknoppen.',
    eindterm: 'Verschil tussen schakelaar en drukknop; toepassingen in het dagelijks leven.',
  },
  {
    id: 4,
    title: 'Zoek de fout',
    icon: 'material:paperclip',
    intro: 'Deze kring werkt niet. Er zijn twee fouten: de kring is niet gesloten. Kan jij ze vinden?',
    toolbox: {},
    start: {
      parts: [
        { id: 'bat', type: 'battery', x: 440, y: 440, rot: 180 },
        { id: 'sw', type: 'switch', x: 440, y: 200, rot: 0, on: false },
        { id: 'lamp', type: 'lamp', x: 720, y: 320, rot: 90 },
      ],
      wires: [
        { id: 'w1', a: { part: 'bat', term: 'pos' }, b: { part: 'sw', term: 'a' } },
        { id: 'w2', a: { part: 'sw', term: 'b' }, b: { part: 'lamp', term: 'a' } },
      ],
    },
    steps: [
      {
        goal: 'Zoek de twee fouten en herstel de kring zodat het lampje brandt.',
        check: [{ rule: 'aan', part: 'lamp' }],
        hints: [
          'Volg de weg van de stroom met je vinger, vanaf de + van de batterij.',
          'Kijk goed naar de schakelaar. Staat hij aan?',
          'Een bolletje van het lampje heeft nog geen draad. Verbind het met de − van de batterij.',
        ],
      },
    ],
    success: 'Je vond de onderbreking en sloot de kring!',
    wistJeDat: 'Werkt een lamp thuis niet? Dan is de kring vaak ergens open, bijvoorbeeld een kapot draadje in de lamp.',
    eindterm: 'Open en gesloten kring herkennen; fouten opsporen.',
  },
  {
    id: 5,
    title: 'Achter elkaar',
    icon: 'lamp',
    intro: 'Je kan twee lampjes achter elkaar zetten. Dat noemen we een serieschakeling.',
    toolbox: { battery: 1, lamp: 2 },
    steps: [
      {
        goal: 'Zet twee lampjes achter elkaar in één kring.',
        check: [{ rule: 'serie', part: 'lamp', count: 2 }],
        questions: [
          { q: 'Hoe branden de lampjes, vergeleken met één lampje?', options: ['Feller', 'Even fel', 'Zwakker'], answer: 2 },
          { q: 'Haal een draad los. Wat gebeurt er met het andere lampje?', options: ['Het blijft branden', 'Het gaat ook uit'], answer: 1 },
        ],
        hints: [
          'De stroom moet eerst door het ene lampje en dan door het andere.',
          'Batterij + → lampje 1 → lampje 2 → batterij −.',
          'Er is maar één weg voor de stroom. Is die weg open, dan werkt niets meer.',
        ],
      },
    ],
    success: 'In een serieschakeling delen de lampjes één weg. Ze branden zwakker.',
    wistJeDat: 'Bij oude kerstverlichting stonden de lampjes in serie: was er één kapot, dan deed de hele slinger het niet meer.',
    eindterm: 'Serieschakeling bouwen en effecten waarnemen.',
  },
  {
    id: 6,
    title: 'Naast elkaar',
    icon: 'lamp',
    intro: 'Je kan twee lampjes ook naast elkaar zetten: elk krijgt een eigen weg. Dat is een parallelschakeling.',
    toolbox: { battery: 1, lamp: 2 },
    steps: [
      {
        goal: 'Zet twee lampjes naast elkaar, elk met een eigen weg naar de batterij.',
        check: [{ rule: 'parallel', part: 'lamp', count: 2 }],
        questions: [
          { q: 'Hoe branden de lampjes nu?', options: ['Zwakker dan één lampje', 'Even fel als één lampje'], answer: 1 },
          { q: 'Haal één lampje los. Wat doet het andere?', options: ['Het blijft branden', 'Het gaat ook uit'], answer: 0 },
        ],
        hints: [
          'Een bolletje mag meer dan één draad hebben.',
          'Maak eerst een kring met één lampje. Verbind daarna het tweede lampje met dezelfde + en −.',
          'Lampje 1: + en −. Lampje 2: ook + en −. Twee rondjes, één batterij.',
        ],
      },
    ],
    success: 'In een parallelschakeling heeft elk lampje een eigen weg. Ze branden fel.',
    wistJeDat: 'De lampen in je huis staan parallel. Daarom kan je in de keuken het licht uitdoen terwijl het in de living blijft branden.',
    eindterm: 'Parallelschakeling bouwen en vergelijken met serie.',
  },
  {
    id: 7,
    title: 'Plus en min',
    icon: 'led',
    intro: 'Een LED is een speciaal lampje: hij werkt maar in één richting. Let op de + en de −!',
    toolbox: { battery: 1, led: 1 },
    steps: [
      {
        goal: 'Laat de LED branden.',
        check: [{ rule: 'aan', part: 'led' }],
        questions: [{ q: 'Draai de LED om (toets R of de draaiknop). Wat gebeurt er?', options: ['Hij brandt feller', 'Hij brandt niet meer', 'Er verandert niets'], answer: 1 }],
        hints: [
          'Kijk naar de + en de − bij de LED.',
          'De + van de LED moet naar de + van de batterij.',
          'Brandt hij niet? Draai de LED om of wissel de draden.',
        ],
      },
    ],
    success: 'De LED brandt, want de stroom gaat de goede richting uit.',
    wistJeDat: 'LED-lampen gebruiken veel minder energie dan gewone lampjes. Bijna alle lampen zijn nu LED’s.',
    eindterm: 'Richting van de stroom; polariteit van een LED.',
  },
  {
    id: 8,
    title: 'Geleider of isolator?',
    icon: 'material:munt',
    intro: 'Sommige stoffen laten stroom door: geleiders. Andere niet: isolatoren. Test het zelf!',
    toolbox: { battery: 1, lamp: 1, ...Object.fromEntries(MAT.map((m) => [`material:${m}`, 1])) },
    steps: [
      {
        goal: 'Bouw een testkring met een materiaal erin. Test alle materialen en sorteer ze.',
        check: [{ rule: 'testplek', part: 'material', with: 'lamp' }],
        questions: [
          {
            type: 'sort',
            q: 'Laat het de stroom door?',
            categories: [
              { key: 'geleider', label: 'Geleider' },
              { key: 'isolator', label: 'Isolator' },
            ],
            items: [
              { key: 'munt', label: 'Munt', answer: 'geleider' },
              { key: 'paperclip', label: 'Paperclip', answer: 'geleider' },
              { key: 'potlood', label: 'Potloodstift', answer: 'geleider' },
              { key: 'alufolie', label: 'Alufolie', answer: 'geleider' },
              { key: 'plastic', label: 'Plastic', answer: 'isolator' },
              { key: 'hout', label: 'Hout', answer: 'isolator' },
              { key: 'papier', label: 'Papier', answer: 'isolator' },
              { key: 'rubber', label: 'Rubber', answer: 'isolator' },
            ],
          },
        ],
        hints: [
          'Bouw een kring met batterij en lampje, en laat één plek open voor het materiaal.',
          'Het materiaal moet ín de kring staan, net als een schakelaar.',
          'Wissel van materiaal: verwijder het ene en zet het volgende op dezelfde plek. Brandt het lampje? Dan is het een geleider.',
        ],
      },
    ],
    success: 'Metalen zijn goede geleiders. Plastic, hout, papier en rubber zijn isolatoren.',
    wistJeDat: 'Daarom zit er plastic of rubber rond elektrische draden: zo krijg je geen schok. Raak nooit het stopcontact aan!',
    eindterm: 'Geleiders en isolatoren onderzoeken; veilig omgaan met elektriciteit.',
  },
  {
    id: 9,
    title: 'Slimme schakelaars',
    icon: 'switch',
    intro: 'Met twee schakelaars kan je slimme kringen maken. Moeten ze allebei aan, of volstaat er één?',
    toolbox: { battery: 1, lamp: 1, switch: 2 },
    steps: [
      {
        goal: 'Het lampje brandt alleen als BEIDE schakelaars aan staan.',
        check: [{ rule: 'en', part: 'lamp', by: 'switch' }],
        hints: [
          'Zet de schakelaars achter elkaar, net als de lampjes in les 5.',
          'Batterij + → schakelaar 1 → schakelaar 2 → lampje → batterij −.',
        ],
      },
      {
        goal: 'Pas je kring aan: nu brandt het lampje als ÉÉN van de schakelaars aan staat.',
        check: [{ rule: 'of', part: 'lamp', by: 'switch' }],
        hints: [
          'Zet de schakelaars naast elkaar, net als de lampjes in les 6.',
          'Elke schakelaar krijgt een eigen weg van de + naar het lampje.',
        ],
      },
    ],
    success: 'Achter elkaar: allebei nodig. Naast elkaar: één is genoeg.',
    wistJeDat: 'Een snijmachine start pas als je twee knoppen tegelijk indrukt: zo zijn je handen veilig. En een trapverlichting kan je aanzetten vanaf twee plaatsen.',
    eindterm: 'Schakelaars in serie en parallel; logische toepassingen.',
  },
  {
    id: 10,
    title: 'Eindopdracht: alarm',
    icon: 'buzzer',
    intro: 'Toon wat je kan! Bouw een alarm voor je kamerdeur met een lampje en een zoemer.',
    toolbox: { battery: 2, lamp: 2, buzzer: 1, switch: 2, button: 1, led: 1 },
    steps: [
      {
        goal: 'De schakelaar is je deur. Gaat hij aan, dan gaan het lampje én de zoemer samen aan.',
        check: [
          { rule: 'bediend', part: 'lamp', by: 'switch' },
          { rule: 'bediend', part: 'buzzer', by: 'switch' },
        ],
        hints: [
          'Eén schakelaar moet het lampje en de zoemer allebei bedienen.',
          'Zet het lampje en de zoemer naast elkaar, en de schakelaar vlak bij de batterij.',
          'Batterij + → schakelaar → (lampje én zoemer naast elkaar) → batterij −.',
        ],
      },
      {
        goal: 'Extra: voeg een drukknop toe om de zoemer te testen, ook als de deur dicht is.',
        check: [{ rule: 'of', part: 'buzzer', by: ['switch', 'button'] }],
        hints: [
          'De drukknop moet naast de schakelaar staan, net als in les 9.',
          'Verbind de drukknop met dezelfde twee bolletjes als de schakelaar.',
        ],
      },
    ],
    success: 'Je bouwde een echt alarm. Je bent een stroomkring-expert!',
    wistJeDat: 'Echte alarmen werken met een contact in de deur: gaat de deur open, dan wordt een kring gesloten of geopend.',
    eindterm: 'Kennis combineren in een technisch systeem (ontwerpen, maken, testen).',
  },
];

export const lessonById = (id) => LESSONS.find((l) => l.id === Number(id));
