// De opdrachten, als gewone gegevens.
// Je kan teksten aanpassen of een les toevoegen zonder de rest van de code
// te kennen. Per les:
//   id          vast nummer van de les (de voortgang hangt eraan: nooit wijzigen of hergebruiken)
//               De volgorde van de lessen staat in ORDER onderaan; ze komen in die volgorde vrij.
//   title       korte titel
//   icon        tekening op de kaart: battery, battery:plat, battery:blok, lamp, led, buzzer, motor, switch, button, resistor, material:munt …
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

const BASE = [
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
        questions: [{ q: 'Klik op de LED en kies “Omdraaien”. Wat gebeurt er?', options: ['Hij brandt feller', 'Hij brandt niet meer', 'Er verandert niets'], answer: 1 }],
        hints: [
          'Kijk naar de + en de − bij de LED.',
          'De + van de LED moet naar de + van de batterij.',
          'Brandt hij niet? Klik op de LED en kies “Omdraaien”.',
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
          'Zet de schakelaars achter elkaar, net als de lampjes bij “Achter elkaar”.',
          'Batterij + → schakelaar 1 → schakelaar 2 → lampje → batterij −.',
        ],
      },
      {
        goal: 'Pas je kring aan: nu brandt het lampje als ÉÉN van de schakelaars aan staat.',
        check: [{ rule: 'of', part: 'lamp', by: 'switch' }],
        hints: [
          'Zet de schakelaars naast elkaar, net als de lampjes bij “Naast elkaar”.',
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
    title: 'Te sterk!',
    icon: 'battery:plat',
    intro: 'Er zijn sterke en zwakke batterijen. Is de batterij te sterk voor een lampje, dan brandt het draadje in het lampje door. Probeer het maar!',
    toolbox: { battery: 1, 'battery:plat': 1, 'battery:blok': 1, lamp: 3, led: 1, resistor: 1 },
    steps: [
      {
        goal: 'Sluit één lampje aan op de platte batterij. Wat gebeurt er? Laat daarna lampjes veilig branden op de platte batterij.',
        check: [{ rule: 'aan', part: 'lamp', met: 'battery:plat' }],
        questions: [
          { q: 'Wat gebeurt er met één lampje op de platte batterij?', options: ['Het brandt zwak', 'Het brandt door', 'Er gebeurt niets'], answer: 1 },
        ],
        hints: [
          'Brandt een lampje door? Klik erop en kies “Nieuw” om het te vervangen.',
          'Als lampjes achter elkaar staan, krijgt elk lampje minder stroom.',
          'Zet drie lampjes achter elkaar op de platte batterij.',
        ],
      },
      {
        goal: 'Laat de LED branden op de blokbatterij, zonder dat hij doorbrandt.',
        check: [{ rule: 'aan', part: 'led', met: 'battery:blok' }],
        hints: [
          'Een weerstand remt de stroom af.',
          'Zet de weerstand achter de LED, in dezelfde kring.',
          'Blokbatterij + → weerstand → LED (+ naar +) → blokbatterij −.',
        ],
      },
    ],
    success: 'Een sterke batterij geeft meer stroom. Te veel stroom laat een lampje doorbranden. Meer lampjes achter elkaar of een weerstand remmen de stroom af.',
    wistJeDat: 'Op elk lampje en elk toestel staat hoeveel volt het aankan. Het stopcontact geeft 230 volt: dat is meer dan 150 gewone batterijen samen, en levensgevaarlijk!',
    eindterm: 'Spanning van een bron afstemmen op een verbruiker; veilig omgaan met elektriciteit.',
  },
  {
    id: 11,
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
          'De drukknop moet naast de schakelaar staan, net als bij “Slimme schakelaars”.',
          'Verbind de drukknop met dezelfde twee bolletjes als de schakelaar.',
        ],
      },
    ],
    success: 'Je bouwde een echt alarm. Je bent een stroomkring-expert!',
    wistJeDat: 'Echte alarmen werken met een contact in de deur: gaat de deur open, dan wordt een kring gesloten of geopend.',
    eindterm: 'Kennis combineren in een technisch systeem (ontwerpen, maken, testen).',
  },
];


// Nieuwe lessen (id 12 tot 30).
const EXTRA = [
  // ---------- Makkelijk ----------
  {
    id: 12,
    title: 'Draaien maar!',
    icon: 'motor',
    intro: 'Een motor zet elektrische energie om in beweging. Zo werkt een ventilator of een elektrische tandenborstel.',
    toolbox: { battery: 1, motor: 1, switch: 1 },
    steps: [
      {
        goal: 'Laat de motor draaien en zet hem aan en uit met de schakelaar.',
        check: [{ rule: 'bediend', part: 'motor', by: 'switch' }],
        questions: [
          { q: 'Wat maakt de motor van de elektrische energie?', options: ['Licht', 'Beweging', 'Geluid'], answer: 1 },
          { q: 'Klik op de batterij en kies “Omdraaien”. Wat gebeurt er?', options: ['De motor stopt', 'De motor draait de andere kant op', 'De motor draait sneller'], answer: 1 },
        ],
        hints: [
          'Een motor werkt net als een lampje: de stroom moet erdoor en terug naar de batterij.',
          'Zet de schakelaar ín de kring, tussen de batterij en de motor.',
          'Batterij + → schakelaar → motor → batterij −.',
        ],
      },
    ],
    success: 'De motor draait! En met de batterij omgekeerd draait hij de andere kant op.',
    wistJeDat: 'Een elektrische auto heeft een grote motor en een heel grote batterij. Achteruitrijden? Dan laat de auto de stroom andersom door de motor lopen.',
    eindterm: 'Energieomzetting: elektrische energie wordt beweging.',
  },
  {
    id: 13,
    title: 'Het gat in de kring',
    icon: 'material:plastic',
    intro: 'Alles lijkt goed aangesloten, maar het lampje brandt niet. Er zit een stof in de kring die geen stroom doorlaat.',
    toolbox: { 'material:munt': 1, 'material:hout': 1 },
    start: {
      parts: [
        { id: 'bat', type: 'battery', x: 440, y: 440, rot: 180 },
        { id: 'mat', type: 'material', variant: 'plastic', x: 440, y: 200, rot: 0 },
        { id: 'lamp', type: 'lamp', x: 720, y: 320, rot: 90 },
      ],
      wires: [
        { id: 'w1', a: { part: 'bat', term: 'pos' }, b: { part: 'mat', term: 'a' } },
        { id: 'w2', a: { part: 'mat', term: 'b' }, b: { part: 'lamp', term: 'a' } },
        { id: 'w3', a: { part: 'lamp', term: 'b' }, b: { part: 'bat', term: 'neg' } },
      ],
    },
    steps: [
      {
        goal: 'Vervang het stuk dat de kring open houdt, zodat het lampje brandt.',
        check: [{ rule: 'aan', part: 'lamp' }],
        questions: [{ q: 'Waarom brandde het lampje eerst niet?', options: ['Plastic is een isolator', 'De batterij is leeg', 'Het lampje is kapot'], answer: 0 }],
        hints: [
          'Klik op elk onderdeel. Welk stuk laat de stroom niet door?',
          'Plastic is een isolator. Haal het weg en zet een ander materiaal op die plek.',
          'Hout is ook een isolator. Een munt is van metaal.',
        ],
      },
    ],
    success: 'Metaal laat de stroom door, plastic en hout niet.',
    wistJeDat: 'De stekker van een lamp heeft metalen pinnen voor de stroom en een plastic omhulsel zodat je veilig kan vastnemen.',
    eindterm: 'Geleiders en isolatoren herkennen in een stroomkring.',
  },
  {
    id: 14,
    title: 'Welke richting?',
    icon: 'led',
    intro: 'Een lampje en een LED lijken op elkaar. Maar wat gebeurt er als de stroom de andere kant op gaat?',
    toolbox: { battery: 1, lamp: 1, led: 1 },
    steps: [
      {
        goal: 'Laat het lampje en de LED samen branden, elk met een eigen weg naar de batterij.',
        check: [{ rule: 'parallel', part: ['lamp', 'led'], count: 2, fout: 'Het lampje en de LED moeten allebei fel branden, elk met een eigen weg naar de batterij.' }],
        questions: [{ q: 'Draai daarna de batterij om. Wat blijft branden?', options: ['Allebei', 'Alleen het lampje', 'Alleen de LED', 'Niets'], answer: 1 }],
        hints: [
          'Maak eerst een kring met het lampje. Verbind daarna de LED met dezelfde + en −.',
          'Brandt de LED niet? Klik erop en kies “Omdraaien”: de + van de LED moet naar de + van de batterij.',
          'Klik op de batterij en kies “Omdraaien”: de + en de − wisselen van plaats. Kijk goed!',
        ],
      },
    ],
    success: 'Een lampje werkt in beide richtingen. Een LED maar in één richting.',
    wistJeDat: 'Daarom moet je batterijen in een speelgoedje of afstandsbediening altijd met de + op de juiste plaats steken.',
    eindterm: 'Richting van de stroom; verschil tussen lampje en LED.',
  },
  {
    id: 15,
    title: 'Zaklamp',
    icon: 'led',
    intro: 'Een zaklamp heeft een batterij, een lampje en een schakelaar. Maak er zelf een, met een zuinige LED.',
    toolbox: { battery: 1, led: 1, lamp: 1, switch: 1, button: 1 },
    steps: [
      {
        goal: 'Bouw een zaklamp: de LED gaat aan en uit met de schakelaar.',
        check: [{ rule: 'bediend', part: 'led', by: 'switch' }],
        questions: [{ q: 'Waarom zitten er in zaklampen vaak LED’s?', options: ['Ze zijn zuinig, de batterij gaat langer mee', 'Ze zijn groter', 'Ze werken zonder batterij'], answer: 0 }],
        hints: [
          'Een zaklamp blijft aan als je loslaat. Welke knop doet dat?',
          'Let op de + en − van de LED.',
          'Batterij + → schakelaar → LED (+ eerst) → batterij −.',
        ],
      },
    ],
    success: 'Je zaklamp werkt. Klaar voor een tocht in het donker!',
    wistJeDat: 'In een gsm zit ook een LED als zaklamp. Hij gebruikt zo weinig stroom dat je batterij nauwelijks leegloopt.',
    eindterm: 'Een eenvoudig technisch systeem bouwen met een gegeven doel.',
  },

  // ---------- Gemiddeld ----------
  {
    id: 16,
    title: 'Elk zijn eigen knop',
    icon: 'switch',
    intro: 'In je huis heeft elke kamer een eigen lichtschakelaar. Doe je het licht in de keuken uit, dan blijft het in de living branden.',
    toolbox: { battery: 1, lamp: 2, switch: 2 },
    steps: [
      {
        goal: 'Twee lampjes, twee schakelaars: elke schakelaar bedient zijn eigen lampje.',
        check: [{ rule: 'eigen', part: 'lamp', by: 'switch', count: 2 }],
        hints: [
          'De lampjes moeten naast elkaar staan, elk op een eigen weg.',
          'Zet op elke weg één schakelaar, vóór het lampje.',
          'Weg 1: + → schakelaar 1 → lampje 1 → −. Weg 2: + → schakelaar 2 → lampje 2 → −.',
        ],
      },
    ],
    success: 'Naast elkaar en elk een eigen schakelaar: zo zit het ook in je huis.',
    wistJeDat: 'In een huis kunnen tientallen lampen en toestellen naast elkaar staan. Ze krijgen allemaal stroom, en elk heeft een eigen schakelaar.',
    eindterm: 'Parallelschakeling met afzonderlijke bediening; toepassing in de woning.',
  },
  {
    id: 17,
    title: 'Kortsluiting!',
    icon: 'battery',
    intro: 'Iemand heeft een draad verkeerd gelegd. Nu is er kortsluiting: dat is gevaarlijk!',
    toolbox: {},
    start: {
      parts: [
        { id: 'bat', type: 'battery', x: 440, y: 440, rot: 180 },
        { id: 'sw', type: 'switch', x: 440, y: 200, rot: 0, on: true },
        { id: 'lamp', type: 'lamp', x: 720, y: 320, rot: 90 },
      ],
      wires: [
        { id: 'w1', a: { part: 'bat', term: 'pos' }, b: { part: 'sw', term: 'a' } },
        { id: 'w2', a: { part: 'sw', term: 'b' }, b: { part: 'lamp', term: 'a' } },
        { id: 'w3', a: { part: 'lamp', term: 'b' }, b: { part: 'bat', term: 'neg' } },
        { id: 'w4', a: { part: 'lamp', term: 'a' }, b: { part: 'lamp', term: 'b' } },
      ],
    },
    steps: [
      {
        goal: 'Zoek de draad die de kortsluiting maakt en haal hem weg.',
        check: [{ rule: 'bediend', part: 'lamp', by: 'switch' }],
        questions: [
          { q: 'Waarom brandde het lampje niet?', options: ['De stroom nam de makkelijke weg door de draad', 'De schakelaar stond uit', 'Het lampje was kapot'], answer: 0 },
          { q: 'Wat gebeurt er bij kortsluiting met de batterij en de draden?', options: ['Ze worden heel heet', 'Ze laden op', 'Er gebeurt niets'], answer: 0 },
        ],
        hints: [
          'Volg alle draden. Welke draad gaat van het ene bolletje van het lampje naar het andere?',
          'Die draad is een makkelijke weg rond het lampje: van + naar − zonder iets ertussen.',
          'Klik op de draad die naast het lampje loopt en verwijder hem.',
        ],
      },
    ],
    success: 'Opgelost! Zonder de foute draad moet de stroom weer door het lampje.',
    wistJeDat: 'Kortsluiting is de oorzaak van veel branden. Gebruik daarom nooit kapotte kabels en steek nooit metalen voorwerpen in een stopcontact.',
    eindterm: 'Kortsluiting herkennen en vermijden; veilig omgaan met elektriciteit.',
  },
  {
    id: 18,
    title: 'Rem de stroom',
    icon: 'resistor',
    intro: 'Een weerstand maakt het de stroom moeilijk. Wat doet dat met een lampje?',
    toolbox: { battery: 1, lamp: 1, resistor: 1 },
    steps: [
      {
        goal: 'Laat het lampje zwak branden met behulp van de weerstand.',
        check: [{ rule: 'helderheid', part: 'lamp', level: 'zwak' }],
        questions: [{ q: 'Wat doet de weerstand?', options: ['Hij remt de stroom af', 'Hij maakt extra stroom', 'Hij geeft zelf licht'], answer: 0 }],
        hints: [
          'Maak eerst een kring met het lampje.',
          'De weerstand moet in dezelfde kring staan, achter het lampje.',
          'Batterij + → weerstand → lampje → batterij −.',
        ],
      },
    ],
    success: 'De weerstand remt de stroom: het lampje krijgt minder en brandt zwakker.',
    wistJeDat: 'Met een dimmer kan je thuis het licht zachter zetten. Vroeger zat daar een weerstand in die je groter of kleiner draaide.',
    eindterm: 'Invloed van een weerstand op de stroom in een kring.',
  },
  {
    id: 19,
    title: 'Geleidt een potlood?',
    icon: 'material:potlood',
    intro: 'Een potloodstift is geen metaal. Laat ze toch stroom door? En even goed als een munt?',
    toolbox: { battery: 1, lamp: 1, 'material:potlood': 1, 'material:munt': 1 },
    steps: [
      {
        goal: 'Bouw een testkring en zet de potloodstift erin. Vergelijk daarna met de munt.',
        check: [{ rule: 'testplek', part: 'material:potlood', with: 'lamp', fout: 'De potloodstift moet in de kring staan, samen met het lampje.' }],
        questions: [{ q: 'Hoe brandt het lampje met de potloodstift?', options: ['Even fel als met de munt', 'Zwakker dan met de munt', 'Helemaal niet'], answer: 1 }],
        hints: [
          'Bouw een kring met batterij en lampje en laat één plek open.',
          'Zet de potloodstift op die open plek. Kijk naar het lampje.',
          'Wissel dan de potloodstift voor de munt. Wat zie je?',
        ],
      },
    ],
    success: 'Grafiet geleidt, maar minder goed dan metaal: het remt de stroom een beetje af.',
    wistJeDat: 'Teken je met een potlood een dikke, donkere lijn op papier, dan kan daar een beetje stroom door. Probeer het eens met je leerkracht!',
    eindterm: 'Geleiders vergelijken: goede en minder goede geleiders.',
  },
  {
    id: 20,
    title: 'Dubbele kracht',
    icon: 'battery',
    intro: 'Twee lampjes achter elkaar branden zwak. Kan je ze toch fel laten branden, met een extra batterij?',
    toolbox: { battery: 2, lamp: 2 },
    steps: [
      {
        goal: 'Zet twee lampjes achter elkaar en laat ze allebei fel branden.',
        check: [
          { rule: 'serie', part: 'lamp', count: 2 },
          { rule: 'helderheid', part: 'lamp', level: 'fel', fout: 'De lampjes branden nog zwak. Zet de twee batterijen achter elkaar: de + van de ene aan de − van de andere.' },
        ],
        questions: [{ q: 'Twee batterijen achter elkaar duwen…', options: ['even hard als één', 'twee keer zo hard', 'minder hard'], answer: 1 }],
        hints: [
          'Met één batterij branden twee lampjes achter elkaar zwak.',
          'Zet de batterijen achter elkaar: de + van batterij 1 aan de − van batterij 2.',
          'Staan de batterijen tegen elkaar in (+ aan +), dan duwen ze tegen elkaar en werkt er niets.',
        ],
      },
    ],
    success: 'Twee batterijen achter elkaar geven 3 volt: dubbele kracht!',
    wistJeDat: 'In een afstandsbediening zitten vaak twee batterijen achter elkaar. Samen geven ze 3 volt.',
    eindterm: 'Bronnen in serie; spanning en helderheid.',
  },
  {
    id: 21,
    title: 'Bel voor iedereen',
    icon: 'buzzer',
    intro: 'Iemand die niet goed hoort, hoort de deurbel niet. Een lampje dat mee flitst, helpt!',
    toolbox: { battery: 1, buzzer: 1, lamp: 1, button: 1 },
    steps: [
      {
        goal: 'Druk je op de drukknop, dan zoemt de zoemer én brandt het lampje.',
        check: [
          { rule: 'bediend', part: 'buzzer', by: 'button' },
          { rule: 'bediend', part: 'lamp', by: 'button' },
        ],
        questions: [{ q: 'Waarom een lampje bij de bel?', options: ['Zo ziet iemand die niet hoort dat er gebeld wordt', 'Zo klinkt de bel luider', 'Zo gaat de batterij langer mee'], answer: 0 }],
        hints: [
          'Eén drukknop moet twee onderdelen bedienen.',
          'Zet de zoemer en het lampje naast elkaar. De drukknop komt vlak bij de batterij.',
          'Batterij + → drukknop → (zoemer én lampje naast elkaar) → batterij −.',
        ],
      },
    ],
    success: 'Horen of zien: iedereen weet nu dat er iemand aan de deur staat.',
    wistJeDat: 'Er bestaan ook wekkers die trillen en flitsen, en rookmelders met een flitslicht voor mensen die doof zijn.',
    eindterm: 'Een technisch systeem aanpassen aan de noden van de gebruiker.',
  },

  // ---------- Moeilijk ----------
  {
    id: 22,
    title: 'De zekering',
    icon: 'fuse',
    intro: 'Een zekering beschermt tegen kortsluiting: bij te veel stroom smelt haar draadje en gaat de kring open. Test het zelf!',
    toolbox: { battery: 1, lamp: 1, fuse: 1, button: 1 },
    steps: [
      {
        goal: 'Laat het lampje branden met een zekering in de kring. Leg dan een drukknop rond het lampje: druk je, dan is er kortsluiting en moet de zekering springen.',
        check: [{ rule: 'beschermd', part: 'lamp' }],
        questions: [{ q: 'Waarom springt de zekering als je drukt?', options: ['Er gaat veel te veel stroom door', 'De batterij is leeg', 'Het lampje is kapot'], answer: 0 }],
        hints: [
          'Maak eerst een kring: batterij + → zekering → lampje → batterij −.',
          'Verbind de drukknop met de twee bolletjes van het lampje. Druk: de stroom neemt de makkelijke weg.',
          'Gesprongen? Laat los, klik op de zekering en kies “Nieuw”. Druk dan op “Controleer”.',
        ],
      },
    ],
    success: 'De zekering sprong en de batterij bleef veilig. Zo beschermt een zekering je huis.',
    wistJeDat: 'In elk huis hangt een zekeringkast. Springt er een zekering, dan is er ergens te veel stroom. Een volwassene zoekt eerst de oorzaak en zet hem dan pas terug aan.',
    eindterm: 'Veiligheid: de werking van een zekering bij kortsluiting.',
  },
  {
    id: 23,
    title: 'De geheime kluis',
    icon: 'button',
    intro: 'Een kluis gaat alleen open als alles klopt. Bouw een kluis met drie knoppen!',
    toolbox: { battery: 1, lamp: 1, switch: 2, button: 1 },
    steps: [
      {
        goal: 'Het lampje (de kluis is open) brandt alleen als beide schakelaars aan staan ÉN je op de drukknop drukt.',
        check: [{ rule: 'en', part: 'lamp', by: ['switch', 'button'], fout: 'De kluis mag alleen opengaan als ALLE drie de knoppen aan staan. Zet ze achter elkaar.' }],
        hints: [
          'Als alles aan moet staan, zet je de knoppen achter elkaar.',
          'Er is maar één weg voor de stroom, door alle drie de knoppen.',
          'Batterij + → schakelaar 1 → schakelaar 2 → drukknop → lampje → batterij −.',
        ],
      },
    ],
    success: 'Alleen wie alle drie de knoppen kent, krijgt de kluis open!',
    wistJeDat: 'Ook een wasmachine start pas als de deur dicht is én je op start drukt. Zo kan er geen water uit lopen.',
    eindterm: 'Schakelaars in serie: alle voorwaarden moeten voldaan zijn (EN).',
  },
  {
    id: 24,
    title: 'Verkeerslicht',
    icon: 'led',
    intro: 'Een verkeerslicht heeft lampen die je elk apart aanzet. Maar deze keer heb je alleen een sterke blokbatterij…',
    toolbox: { 'battery:blok': 1, led: 2, switch: 2, resistor: 2 },
    steps: [
      {
        goal: 'Twee LED’s op de blokbatterij, elk met een eigen schakelaar. Geen enkele LED mag doorbranden.',
        check: [
          { rule: 'aan', part: 'led', count: 2, met: 'battery:blok' },
          { rule: 'eigen', part: 'led', by: 'switch', count: 2, fout: 'Nog niet elke LED heeft een eigen schakelaar. Zet je een schakelaar uit, dan mag alleen de LED van die schakelaar uitgaan.' },
        ],
        hints: [
          '9 volt is te sterk voor een LED alleen. Wat remt de stroom af?',
          'Geef elke LED een eigen weg met een eigen schakelaar, net als bij “Elk zijn eigen knop”.',
          'Weg 1: + → schakelaar → weerstand → LED → −. Weg 2 net zo.',
        ],
      },
    ],
    success: 'Je verkeerslicht werkt, en de weerstanden beschermen de LED’s.',
    wistJeDat: 'Verkeerslichten werken nu bijna allemaal met LED’s. Ze zijn feller en gaan jaren mee.',
    eindterm: 'Parallelschakeling, bediening en bescherming met weerstanden combineren.',
  },
  {
    id: 25,
    title: 'Hoofdweg en zijwegen',
    icon: 'lamp',
    intro: 'Je kan serie en parallel ook combineren. Dat heet een gemengde schakeling.',
    toolbox: { battery: 1, lamp: 3 },
    steps: [
      {
        goal: 'Eén lampje staat op de hoofdweg. Daarna splitst de weg in twee: op elke zijweg één lampje.',
        check: [{ rule: 'gemengd', part: 'lamp' }],
        questions: [
          { q: 'Welk lampje brandt het felst?', options: ['Het lampje op de hoofdweg', 'De lampjes op de zijwegen', 'Ze branden even fel'], answer: 0 },
          { q: 'Haal het lampje op de hoofdweg weg. Wat gebeurt er?', options: ['Alles gaat uit', 'De andere twee branden feller', 'Er verandert niets'], answer: 0 },
        ],
        hints: [
          'Begin met batterij + → lampje 1.',
          'Na lampje 1 gaat de weg in twee: elk zijlampje krijgt een draad van lampje 1.',
          'De andere bolletjes van de zijlampjes gaan allebei naar de − van de batterij.',
        ],
      },
    ],
    success: 'Alle stroom gaat door de hoofdweg en verdeelt zich dan over de zijwegen.',
    wistJeDat: 'In je huis is de hoofdweg de dikke kabel naar de zekeringkast. Daarna splitst hij in veel zijwegen naar alle kamers.',
    eindterm: 'Gemengde schakelingen bouwen en de stroomverdeling verklaren.',
  },
  {
    id: 26,
    title: 'Turboventilator',
    icon: 'motor',
    intro: 'Een ventilator heeft een gewone stand en een turbostand. Kan jij er een bouwen?',
    toolbox: { battery: 1, motor: 1, switch: 1, button: 1, resistor: 1 },
    steps: [
      {
        goal: 'De schakelaar zet de ventilator aan: hij draait traag. Druk je op de drukknop, dan draait hij snel.',
        check: [
          { rule: 'bediend', part: 'motor', by: 'switch' },
          { rule: 'tweestanden', part: 'motor', by: 'button', uit: 'zwak', aan: 'fel' },
        ],
        hints: [
          'Traag draaien: zet een weerstand in de kring van de motor.',
          'Snel draaien: de stroom moet om de weerstand heen kunnen.',
          'Verbind de drukknop met de twee bolletjes van de weerstand. Druk je, dan neemt de stroom de makkelijke weg.',
        ],
      },
    ],
    success: 'Je gebruikte een overbrugging met opzet: de drukknop laat de stroom om de weerstand heen gaan.',
    wistJeDat: 'Een haardroger of een mixer heeft ook verschillende standen. Binnenin wordt de stroom op een andere manier door de onderdelen gestuurd.',
    eindterm: 'Een weerstand en een overbrugging doelgericht gebruiken.',
  },
  {
    id: 27,
    title: 'Koekjesalarm',
    icon: 'buzzer',
    intro: 'Wie snoept er stiekem uit de koekjesdoos? Het deksel drukt de schakelaar aan. Gaat het deksel open, dan moet het alarm afgaan!',
    toolbox: { battery: 1, buzzer: 1, switch: 1, resistor: 1, lamp: 1 },
    steps: [
      {
        goal: 'Staat de schakelaar aan (deksel dicht), dan is het stil. Staat hij uit (deksel open), dan zoemt de zoemer.',
        check: [{ rule: 'omgekeerd', part: 'buzzer', by: 'switch' }],
        questions: [{ q: 'Waarom zoemt de zoemer niet als de schakelaar aan staat?', options: ['De stroom neemt de makkelijke weg door de schakelaar', 'De batterij is leeg', 'De kring is open'], answer: 0 }],
        hints: [
          'Denk aan overbruggen: een draad rond een onderdeel laat het stoppen.',
          'Zet de schakelaar rond de zoemer. Maar pas op voor kortsluiting!',
          'Batterij + → weerstand → zoemer → batterij −, en de schakelaar verbind je met de twee bolletjes van de zoemer.',
        ],
      },
    ],
    success: 'Sluw! Je gebruikte overbruggen om een alarm te maken dat afgaat als de kring opengaat.',
    wistJeDat: 'Veel echte alarmen werken zo: zolang het raam dicht is, is er een gesloten kring. Wordt die onderbroken, dan gaat het alarm af.',
    eindterm: 'Een probleem oplossen met een technisch systeem (ontwerpen, maken, testen).',
  },
  {
    id: 28,
    title: 'Nachtlampje',
    icon: 'battery:plat',
    intro: 'Je wil een nachtlampje met een LED. In de kast ligt alleen nog een platte batterij van 4,5 volt.',
    toolbox: { 'battery:plat': 1, led: 1, switch: 1, resistor: 1, lamp: 1 },
    steps: [
      {
        goal: 'Laat de LED veilig branden op de platte batterij en zet hem aan en uit met de schakelaar.',
        check: [
          { rule: 'aan', part: 'led', met: 'battery:plat' },
          { rule: 'bediend', part: 'led', by: 'switch' },
        ],
        hints: [
          'Een LED alleen brandt door op 4,5 volt.',
          'Zet iets in dezelfde kring dat de stroom afremt.',
          'Platte batterij + → schakelaar → weerstand → LED (+ eerst) → platte batterij −.',
        ],
      },
    ],
    success: 'Je stemde je kring af op de batterij. Slaapwel!',
    wistJeDat: 'In elke LED-lamp thuis zit een klein elektronisch schakelingetje dat de stroom precies goed maakt voor de LED’s.',
    eindterm: 'Spanning van een bron afstemmen op een verbruiker.',
  },
  {
    id: 29,
    title: 'Kermismolen',
    icon: 'motor',
    intro: 'Op de kermis branden de lampjes de hele avond. De molen draait alleen als de kermisbaas hem aanzet.',
    toolbox: { battery: 1, motor: 1, lamp: 2, switch: 1 },
    steps: [
      {
        goal: 'Twee lampjes branden altijd. De schakelaar zet alleen de motor aan en uit.',
        check: [
          { rule: 'altijd', part: 'lamp', count: 2 },
          { rule: 'bediend', part: 'motor', by: 'switch' },
        ],
        hints: [
          'Alles moet naast elkaar staan, elk op een eigen weg.',
          'De lampjes krijgen elk een eigen weg zonder schakelaar.',
          'Alleen op de weg van de motor staat de schakelaar.',
        ],
      },
    ],
    success: 'De lichtjes branden en de molen draait wanneer jij wil!',
    wistJeDat: 'Een kermisattractie heeft vaak honderden lampjes, allemaal naast elkaar. Valt er één uit, dan blijven de andere branden.',
    eindterm: 'Parallelschakeling met gedeeltelijke bediening ontwerpen.',
  },
  {
    id: 30,
    title: 'Meesterproef: de slimme gang',
    icon: 'switch',
    intro: 'Toon dat je een echte elektricien bent! Ontwerp de elektriciteit voor een gang, met één batterij.',
    toolbox: { battery: 1, lamp: 1, buzzer: 1, led: 1, switch: 1, button: 1, resistor: 1 },
    steps: [
      {
        goal: 'De schakelaar bedient het lampje, de drukknop de deurbel (zoemer), en de LED brandt altijd als nachtlichtje.',
        check: [
          { rule: 'bediend', part: 'lamp', by: 'switch' },
          { rule: 'bediend', part: 'buzzer', by: 'button' },
          { rule: 'altijd', part: 'led' },
        ],
        hints: [
          'Drie onderdelen die elk iets anders doen: geef ze elk een eigen weg naar de batterij.',
          'Op de weg van het lampje staat de schakelaar, op de weg van de zoemer de drukknop.',
          'De LED krijgt een eigen weg zonder knop. Let op de + en −!',
        ],
      },
    ],
    success: 'Proficiat! Je ontwierp een volledige installatie. Je bent een echte elektricien!',
    wistJeDat: 'Een elektricien tekent eerst een schema van alle wegen, schakelaars en zekeringen voor hij begint. Zo’n schema moet goedgekeurd worden voor je in een nieuw huis mag wonen.',
    eindterm: 'Kennis combineren in een technisch systeem (ontwerpen, maken, testen).',
  },
];

/** The three blocks, each with the lessons in the order they unlock. */
export const BLOCKS = [
  { key: 'makkelijk', title: 'Makkelijk', icon: '🟢', intro: 'De basis: een kring sluiten, schakelaars, geleiders en LED’s.', ids: [1, 2, 3, 4, 12, 13, 7, 14, 8, 15] },
  { key: 'gemiddeld', title: 'Gemiddeld', icon: '🟠', intro: 'Serie en parallel, kortsluiting, weerstanden en sterke batterijen.', ids: [5, 6, 9, 16, 17, 18, 19, 20, 10, 21] },
  { key: 'moeilijk', title: 'Moeilijk', icon: '🔴', intro: 'Uitdagingen: zekering, gemengde schakelingen, slimme alarmen en een meesterproef.', ids: [11, 22, 23, 24, 25, 26, 27, 28, 29, 30] },
];

const ALL = new Map([...BASE, ...EXTRA].map((l) => [l.id, l]));

/** All lessons in unlock order, with their block and their number in that order (nr). */
export const LESSONS = BLOCKS.flatMap((b) => b.ids.map((id) => ({ ...ALL.get(id), block: b.key })));
LESSONS.forEach((l, i) => (l.nr = i + 1));

export const lessonById = (id) => LESSONS.find((l) => l.id === Number(id));
