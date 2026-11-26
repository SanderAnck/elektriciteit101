// Child-friendly explanations per part: what is it, why does it work (or not)
// right now, and good-to-know facts such as when a lamp burns out.
// Pure text, no DOM. The numbers in the facts are checked in tests/.

import { MATERIALS, batteryOf } from './parts.js';

// Facts that are always true for this kind of part.
const FACTS = {
  battery: [
    'Binnenin zit chemische energie. Die duwt de stroom uit de + door de kring en terug naar de −.',
    'De stroom raakt niet op in een lampje: wat aan de + vertrekt, komt allemaal terug bij de −.',
    'Hoe meer volt, hoe harder de batterij duwt: een platte batterij (4,5 V) duwt drie keer zo hard als een gewone (1,5 V), een blokbatterij (9 V) zes keer zo hard.',
    'Verbind nooit + en − rechtstreeks met een draad: dat is kortsluiting. De batterij wordt dan heel heet.',
  ],
  lamp: [
    'In het glas zit een heel dun draadje. Gaat er stroom door, dan wordt het zo heet dat het licht geeft.',
    'Eén lampje kan één gewone batterij (1,5 V) aan, en ook twee achter elkaar (3 V): dan brandt het extra fel.',
    'Op een platte batterij (4,5 V) brandt één lampje door. Twee of meer lampjes achter elkaar kunnen het wel aan.',
    'Op een blokbatterij (9 V) heb je minstens drie lampjes achter elkaar nodig, anders branden ze door.',
    'Lampjes naast elkaar krijgen elk de volle kracht van de batterij: op een te sterke batterij branden ze allemaal door.',
  ],
  led: [
    'Een LED laat de stroom maar in één richting door: van de + (lange poot) naar de − (korte poot).',
    'Hij is zuinig en wordt bijna niet warm.',
    'Net als een lampje kan hij één of twee gewone batterijen aan. Op 4,5 V of 9 V brandt hij door, tenzij je er een weerstand of een lampje achter zet.',
  ],
  buzzer: [
    'Binnenin trilt een plaatje heel snel heen en weer als er stroom door loopt. Dat hoor je als een zoem.',
    'Hoe meer stroom, hoe luider. Een zoemer brandt in deze app niet door.',
  ],
  motor: [
    'In de motor zitten een magneet en een spoel van koperdraad. De stroom maakt de spoel magnetisch, zodat hij gaat draaien.',
    'Draai de batterij om, dan loopt de stroom andersom en draait de motor de andere kant op.',
    'Meer stroom: de motor draait sneller.',
  ],
  switch: [
    'Binnenin zit een metalen brugje. Aan: het brugje raakt beide kanten en de kring is dicht. Uit: er is een opening.',
    'Een schakelaar blijft in zijn stand, net als het lichtknopje thuis.',
    'Twee schakelaars achter elkaar: allebei moeten aan. Naast elkaar: één is genoeg.',
  ],
  button: [
    'Een veertje duwt het brugje weg. Alleen zolang je drukt, raakt het brugje beide kanten.',
    'Daarom werkt een deurbel alleen zolang je op de knop drukt.',
  ],
  resistor: [
    'Een weerstand maakt het de stroom moeilijker. Er gaat dan minder stroom door de hele kring.',
    'Zo bescherm je een LED of lampje tegen een te sterke batterij: één weerstand achter een LED is genoeg op een blokbatterij (9 V).',
  ],
  fuse: [
    'In de zekering zit een heel dun draadje. Gaat er te veel stroom door, dan wordt het zo heet dat het smelt: de zekering springt en de kring is open.',
    'Zo beschermt een zekering tegen kortsluiting: de stroom stopt voordat de draden heet worden en er brand ontstaat.',
    'Thuis zitten de zekeringen in de zekeringkast. Springt er een, dan zoek je eerst de fout voordat je hem weer aanzet.',
    'Een zekering moet in de kring staan, vlak bij de batterij, zodat alle stroom erdoor gaat.',
  ],
  material: [
    'Een geleider laat stroom door. Metalen zoals een munt, een paperclip en aluminiumfolie zijn goede geleiders.',
    'Een isolator laat geen stroom door: plastic, hout, papier en rubber.',
    'Een potloodstift (grafiet) geleidt, maar niet zo goed: het lampje brandt dan zwak.',
  ],
};

export function factsFor(part) {
  return FACTS[part.type] || [];
}

const LOAD = { lamp: 'het lampje', led: 'de LED', buzzer: 'de zoemer', motor: 'de motor' };
const WORKS = { lamp: 'brandt', led: 'brandt', buzzer: 'zoemt', motor: 'draait' };

/** Why the part does (or does not) work right now. Returns { ok, title, text }. */
export function explainNow(part, sim) {
  const st = sim?.parts?.[part.id];
  if (!st) return null;
  const name = LOAD[part.type];

  if (part.type === 'battery') {
    const b = batteryOf(part);
    if (st.short) return { ok: false, title: 'Kortsluiting!', text: 'De + en de − zijn verbonden zonder lampje of zoemer ertussen. Niets remt de stroom af, dus er gaat heel veel stroom door. De batterij en de draden worden heet: in het echt kan er brand ontstaan. Haal die draad weg.' };
    if (st.level === 'uit') return { ok: false, title: 'Er loopt geen stroom', text: 'De kring is niet gesloten. De stroom moet een weg hebben van de + , door een onderdeel, terug naar de −.' };
    return { ok: true, title: 'De batterij duwt de stroom rond', text: `Deze ${b.name.toLowerCase()} (${b.label}) duwt de stroom door de kring, van de + terug naar de −.` };
  }

  if (name) {
    if (part.broken) {
      return { ok: false, title: `Waarom ${part.type === 'led' ? 'is de LED' : 'is het lampje'} kapot?`, text: `Er ging te veel stroom door. ${part.type === 'led' ? 'De LED werd' : 'Het dunne draadje werd'} zo heet dat ${part.type === 'led' ? 'hij stukging' : 'het smolt'}: doorgebrand. De batterij was te sterk. Gebruik een zwakkere batterij, of zet lampjes of een weerstand achter elkaar zodat de stroom afgeremd wordt. Kies daarna “Nieuw”.` };
    }
    if (st.level === 'uit') {
      if (st.reason === 'overbrugd') return { ok: false, title: `Waarom ${WORKS[part.type] === 'brandt' ? 'brandt' : 'werkt'} ${name} niet?`, text: `Er loopt een draad rond ${name}. De stroom kiest de makkelijkste weg: door de draad, niet door ${name}. We zeggen: ${name} is overbrugd. Haal die draad weg.` };
      if (st.reason === 'verkeerd') return { ok: false, title: 'Waarom brandt de LED niet?', text: 'De LED staat verkeerd om. Hij laat de stroom maar in één richting door: de + van de LED moet naar de + van de batterij. Klik erop en kies “Omdraaien”.' };
      return { ok: false, title: `Waarom ${WORKS[part.type] === 'brandt' ? 'brandt' : 'werkt'} ${name} niet?`, text: 'De kring is niet gesloten. Misschien is er een losse draad, staat een schakelaar uit, of zit er een isolator in de weg. De stroom kan dan niet rond.' };
    }
    const why = `De kring is gesloten: de stroom gaat van de +, door ${name}, terug naar de −.`;
    if (st.level === 'zwak') return { ok: true, title: `${cap(name)} ${WORKS[part.type]} zwak`, text: `${why} Maar er gaat weinig stroom door: ${name} staat achter elkaar met andere onderdelen, of iets remt de stroom af (een weerstand of een potloodstift).` };
    if (st.level === 'heelfel') {
      const warn = part.type === 'lamp' || part.type === 'led' ? ` Nog meer stroom en ${name} brandt door!` : '';
      return { ok: true, title: `${cap(name)} ${WORKS[part.type]} extra ${part.type === 'motor' ? 'snel' : part.type === 'buzzer' ? 'luid' : 'fel'}`, text: `${why} De batterij is sterk, dus er gaat veel stroom door.${warn}` };
    }
    return { ok: true, title: `Waarom ${WORKS[part.type]} ${name}?`, text: why };
  }

  if (part.type === 'switch') {
    return part.on
      ? { ok: true, title: 'De schakelaar staat aan', text: 'Het metalen brugje raakt beide kanten: de kring is hier dicht en de stroom kan erdoor.' }
      : { ok: false, title: 'De schakelaar staat uit', text: 'Het brugje staat omhoog: er is een opening in de kring. De stroom kan hier niet door. Klik erop om hem aan te zetten.' };
  }
  if (part.type === 'button') return { ok: true, title: 'Drukknop', text: 'Druk en houd de muisknop ingedrukt: dan raakt het brugje beide kanten en is de kring dicht. Laat je los, dan is de kring weer open.' };
  if (part.type === 'fuse') {
    if (part.broken) return { ok: false, title: 'De zekering is gesprongen', text: 'Er ging veel te veel stroom door: kortsluiting! Het dunne draadje smolt en de kring ging open. Zo werd de batterij beschermd. Haal eerst de fout weg en kies dan “Nieuw”.' };
    return st.level === 'uit'
      ? { ok: true, title: 'De zekering is heel', text: 'Er gaat nu geen stroom door. Gaat er straks te veel stroom door, dan springt ze.' }
      : { ok: true, title: 'De zekering laat de stroom door', text: 'Er gaat gewoon stroom door, niet te veel. Bij kortsluiting zou het draadje smelten.' };
  }
  if (part.type === 'resistor') {
    return st.level === 'uit'
      ? { ok: false, title: 'Er gaat geen stroom door', text: 'De weerstand zit nog niet in een gesloten kring.' }
      : { ok: true, title: 'De weerstand remt de stroom', text: 'Er gaat stroom door, maar minder dan zonder weerstand. Alles in dezelfde kring krijgt minder stroom.' };
  }
  if (part.type === 'material') {
    const m = MATERIALS[part.variant];
    if (!m.conductor) return { ok: false, title: `${m.name} is een isolator`, text: `${m.name} laat geen stroom door. Daarom is de kring hier open, ook al zit alles goed vast.` };
    if (st.level === 'uit') return { ok: true, title: `${m.name} is een geleider`, text: `${m.name} laat stroom door. Er gaat nu nog niets door, want de kring is niet gesloten.` };
    return { ok: true, title: `${m.name} is een geleider`, text: part.variant === 'potlood' ? 'Grafiet laat stroom door, maar niet zo goed: het remt de stroom een beetje af.' : `${m.name} is van metaal: metaal laat stroom heel goed door.` };
  }
  return null;
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** HTML block for a panel: why now + facts. `esc` escapes text. */
export function explainHtml(part, sim, esc) {
  const now = explainNow(part, sim);
  const facts = factsFor(part);
  return `
    ${now ? `<div class="why why--${now.ok ? 'ok' : 'no'}"><div class="why__title">${now.ok ? '✔' : '✖'} ${esc(now.title)}</div><p>${esc(now.text)}</p></div>` : ''}
    ${facts.length ? `<h3 class="panel__sub">Goed om te weten</h3><ul class="facts">${facts.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}`;
}
