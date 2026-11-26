// Part catalogue: names, explanations, electrical behaviour and terminals.
// Pure data, no DOM. Coordinates are in world units, relative to the part's
// centre before rotation. Every part has two terminals 120 units apart.

export const GRID = 40;

const AB = [
  { id: 'a', x: -60, y: 0 },
  { id: 'b', x: 60, y: 0 },
];

export const PARTS = {
  battery: {
    name: 'Batterij',
    info: 'Een batterij geeft energie. De stroom loopt van de + door de kring terug naar de −.',
    terminals: [
      { id: 'neg', x: -60, y: 0, label: '−' },
      { id: 'pos', x: 60, y: 0, label: '+' },
    ],
  },
  lamp: {
    name: 'Lampje',
    info: 'Een lampje geeft licht als er stroom door het draadje in het glas loopt. Is de batterij te sterk, dan brandt het draadje door.',
    R: 10,
    load: true,
    burns: true,
    terminals: AB,
  },
  led: {
    name: 'LED',
    info: 'Een LED is een zuinig lampje. Hij werkt maar in één richting: de + (lange poot) naar de + van de batterij.',
    R: 10,
    load: true,
    burns: true,
    diode: true,
    terminals: [
      { id: 'pos', x: -60, y: 0, label: '+' },
      { id: 'neg', x: 60, y: 0, label: '−' },
    ],
  },
  buzzer: {
    name: 'Zoemer',
    info: 'Een zoemer maakt geluid als er stroom door loopt. Handig voor een deurbel of alarm.',
    R: 15,
    load: true,
    terminals: AB,
  },
  motor: {
    name: 'Motor',
    info: 'Een motor draait als er stroom door loopt. Draai de batterij om en hij draait de andere kant op!',
    R: 8,
    load: true,
    terminals: AB,
  },
  switch: {
    name: 'Schakelaar',
    info: 'Een schakelaar opent of sluit de kring. Klik erop om hem aan of uit te zetten.',
    control: true,
    terminals: AB,
  },
  button: {
    name: 'Drukknop',
    info: 'Een drukknop sluit de kring alleen zolang je erop drukt. Houd de muisknop ingedrukt.',
    control: true,
    terminals: AB,
  },
  resistor: {
    name: 'Weerstand',
    info: 'Een weerstand remt de stroom af. Een lampje erachter brandt dan zwakker.',
    R: 20,
    terminals: AB,
  },
  material: {
    name: 'Testmateriaal',
    info: 'Test of een materiaal de stroom doorlaat.',
    terminals: AB,
  },
};

// Materials for testing conductors and insulators.
// R: resistance when it conducts (pencil lead conducts, but not very well).
export const MATERIALS = {
  munt: { name: 'Munt', conductor: true, R: 0.001 },
  paperclip: { name: 'Paperclip', conductor: true, R: 0.001 },
  potlood: { name: 'Potloodstift', conductor: true, R: 12 },
  alufolie: { name: 'Aluminium\u00ADfolie', conductor: true, R: 0.001 },
  plastic: { name: 'Plastic', conductor: false },
  hout: { name: 'Hout', conductor: false },
  papier: { name: 'Papier', conductor: false },
  rubber: { name: 'Rubber', conductor: false },
};

// Battery types. cells: how many 1,5 V cells inside (more cells = stronger).
// A part without variant is the normal 1,5 V battery.
export const BATTERIES = {
  aa: { name: 'Batterij', label: '1,5 V', cells: 1, info: 'Een gewone batterij (1,5 volt). Ze geeft energie: de stroom loopt van de + door de kring terug naar de −.' },
  plat: { name: 'Platte batterij', label: '4,5 V', cells: 3, info: 'Een platte batterij (4,5 volt) is drie keer zo sterk als een gewone batterij. Eén lampje alleen brandt erdoor!' },
  blok: { name: 'Blokbatterij', label: '9 V', cells: 6, info: 'Een blokbatterij (9 volt) is zes keer zo sterk als een gewone batterij. Lampjes en LED’s branden erdoor, tenzij je de stroom afremt.' },
};

export const batteryOf = (part) => BATTERIES[part.variant] || BATTERIES.aa;

/** Toolbox key for a part: 'lamp', 'material:munt' or 'battery:plat'. */
export const keyOf = (part) => {
  if (part.type === 'material') return `material:${part.variant}`;
  if (part.type === 'battery' && part.variant && part.variant !== 'aa') return `battery:${part.variant}`;
  return part.type;
};

export function partName(part) {
  if (part.type === 'material') return MATERIALS[part.variant]?.name || 'Materiaal';
  if (part.type === 'battery') return `${batteryOf(part).name} ${batteryOf(part).label}`;
  return PARTS[part.type]?.name || part.type;
}

export function partInfo(part) {
  if (part.type === 'battery') return batteryOf(part).info;
  if (part.type === 'material') {
    const m = MATERIALS[part.variant];
    return `${m.name}. Laat het de stroom door? Zet het in een kring met een lampje en kijk.`;
  }
  return PARTS[part.type]?.info || '';
}

export function keyName(key) {
  const [type, variant] = key.split(':');
  return partName({ type, variant });
}

export function keyInfo(key) {
  const [type, variant] = key.split(':');
  return partInfo({ type, variant });
}

/** Rotate a local point by a multiple of 90 degrees. */
export function rotatePoint(x, y, rot) {
  switch (((rot % 360) + 360) % 360) {
    case 90: return { x: -y, y: x };
    case 180: return { x: -x, y: -y };
    case 270: return { x: y, y: -x };
    default: return { x, y };
  }
}

/** World position and outward direction of a terminal. */
export function terminalPos(part, termId) {
  const t = PARTS[part.type].terminals.find((tt) => tt.id === termId);
  const p = rotatePoint(t.x, t.y, part.rot || 0);
  const len = Math.hypot(t.x, t.y) || 1;
  const d = rotatePoint(t.x / len, t.y / len, part.rot || 0);
  return { x: part.x + p.x, y: part.y + p.y, dx: d.x, dy: d.y };
}
