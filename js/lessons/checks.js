// Lesson checks: turn the rules written in lessons.js into a yes/no answer
// with a friendly message. Based on the simulation, never on a fixed
// drawing, so every correct solution counts.
//
// Rules (use them in lessons.js under `check`):
//   { rule: 'aan', part: 'lamp', count: 1 }          at least `count` of these work (with all switches on)
//   { rule: 'aan', part: 'lamp', met: 'battery:plat' }  … and they get their energy from that battery
//   { rule: 'bediend', part: 'lamp', by: 'switch' }   works when every `by` is on, stops when every `by` is off
//   { rule: 'serie', part: 'lamp', count: 2 }         `count` of these work and stand one after the other
//   { rule: 'parallel', part: 'lamp', count: 2 }      `count` of these work brightly, each on its own branch
//   { rule: 'en', part: 'lamp', by: 'switch' }        works only when ALL `by` parts are on (at least 2)
//   { rule: 'of', part: 'lamp', by: ['switch','button'] }  works when ONE of the `by` parts is on (at least 2)
//   { rule: 'testplek', part: 'material', with: 'lamp' }   a material sits in the circuit of the lamp
// A short circuit, or a lamp or LED that would burn out, in any switch position always fails the check.
// Every rule may carry its own `fout` text, shown when it is not met.

import { simulate, isOn } from '../circuit/sim.js';
import { keyOf } from '../circuit/parts.js';

const asList = (v) => (Array.isArray(v) ? v : [v]);
const matches = (p, type) => asList(type).some((t) => keyOf(p) === t || p.type === t);

function controlsOf(circuit, by) {
  return circuit.parts.filter((p) => (p.type === 'switch' || p.type === 'button') && (!by || matches(p, by)));
}

/** All on/off combinations of the switches and buttons (max 64). */
function combos(circuit) {
  const ctrl = controlsOf(circuit).slice(0, 6);
  const out = [];
  for (let m = 0; m < 1 << ctrl.length; m++) {
    const c = {};
    ctrl.forEach((p, i) => (c[p.id] = Boolean(m & (1 << i))));
    out.push(c);
  }
  return out;
}

function allSet(circuit, value, only) {
  const c = {};
  for (const p of controlsOf(circuit)) c[p.id] = only && !only.includes(p.id) ? true : value;
  return c;
}

const PART_WORDS = {
  lamp: ['het lampje', 'de lampjes'],
  led: ['de LED', 'de LEDs'],
  buzzer: ['de zoemer', 'de zoemers'],
  motor: ['de motor', 'de motoren'],
};
const BATTERY_WORDS = { battery: 'gewone batterij', 'battery:plat': 'platte batterij', 'battery:blok': 'blokbatterij' };
const word = (part, many = false) => (PART_WORDS[part] || ['het onderdeel', 'de onderdelen'])[many ? 1 : 0];

function working(circuit, sim, part) {
  return circuit.parts.filter((p) => matches(p, part) && isOn(sim, p.id));
}

const RULES = {
  aan(c, r) {
    const count = r.count || 1;
    const sim = simulate(c, { controls: allSet(c, true) });
    const on = working(c, sim, r.part);
    if (on.length >= count) {
      if (!r.met) return null;
      const bats = c.parts.filter((p) => matches(p, r.met));
      if (!bats.length) return `Gebruik de ${BATTERY_WORDS[r.met] || 'batterij'} in je kring.`;
      const without = simulate(c, { controls: allSet(c, true), open: new Set(bats.map((b) => b.id)) });
      if (on.some((p) => !isOn(without, p.id))) return null;
      return `${cap(word(r.part, count > 1))} moet${count > 1 ? 'en' : ''} branden op de ${BATTERY_WORDS[r.met] || 'batterij'}.`;
    }
    if (c.parts.some((p) => matches(p, r.part) && p.broken))
      return `${cap(word(r.part))} is doorgebrand. Klik erop en kies “Nieuw”, en maak de stroom minder sterk.`;
    const has = c.parts.filter((p) => matches(p, r.part)).length;
    if (has < count) return `Je hebt nog niet genoeg onderdelen: zet ${count > 1 ? `${count} keer ` : ''}${word(r.part)} op het raster.`;
    if (r.part === 'led' && c.parts.some((p) => p.type === 'led' && sim.parts[p.id]?.reason === 'verkeerd'))
      return 'De LED staat verkeerd om. Draai hem om: de + van de LED naar de + van de batterij.';
    if (c.parts.some((p) => matches(p, r.part) && sim.parts[p.id]?.reason === 'overbrugd'))
      return `Er loopt een draad rond ${word(r.part)}: de stroom neemt die makkelijke weg.`;
    return `${cap(word(r.part, count > 1))} ${count > 1 ? 'werken' : 'werkt'} nog niet. Is de kring helemaal gesloten?`;
  },

  bediend(c, r) {
    const by = controlsOf(c, r.by);
    const byName = r.by === 'button' ? 'drukknop' : 'schakelaar';
    if (!by.length) return `Gebruik een ${byName} in je kring.`;
    const ids = by.map((p) => p.id);
    const onSim = simulate(c, { controls: allSet(c, true) });
    const offSim = simulate(c, { controls: allSet(c, false, ids) });
    const good = working(c, onSim, r.part).filter((p) => !isOn(offSim, p.id));
    if (good.length) return null;
    if (!working(c, onSim, r.part).length) return `Als de ${byName} aan staat, werkt ${word(r.part)} nog niet. Is de kring gesloten?`;
    return `${cap(word(r.part))} blijft werken als de ${byName} uit staat. Zet de ${byName} ín de kring, niet ernaast.`;
  },

  serie(c, r) {
    const count = r.count || 2;
    const sim = simulate(c, { controls: allSet(c, true) });
    const on = working(c, sim, r.part);
    if (on.length < count) return RULES.aan(c, { ...r, count });
    for (const a of on) {
      const s = simulate(c, { controls: allSet(c, true), open: new Set([a.id]) });
      if (on.some((b) => b !== a && isOn(s, b.id))) return `${cap(word(r.part, true))} staan nog niet achter elkaar. De stroom moet eerst door het ene en dan door het andere.`;
    }
    return null;
  },

  parallel(c, r) {
    const count = r.count || 2;
    const sim = simulate(c, { controls: allSet(c, true) });
    const on = working(c, sim, r.part);
    if (on.length < count) return RULES.aan(c, { ...r, count });
    for (const a of on) {
      const s = simulate(c, { controls: allSet(c, true), open: new Set([a.id]) });
      if (on.some((b) => b !== a && !isOn(s, b.id))) return `${cap(word(r.part, true))} staan nog achter elkaar. Geef elk een eigen weg naar de batterij.`;
    }
    if (on.some((p) => sim.parts[p.id].level === 'zwak')) return `${cap(word(r.part, true))} branden nog zwak. Verbind elk rechtstreeks met de batterij.`;
    return null;
  },

  en(c, r) {
    const by = controlsOf(c, r.by);
    if (by.length < 2) return 'Gebruik twee schakelaars.';
    return logic(c, r, by, (states) => states.every(Boolean), 'Het lampje mag alleen werken als BEIDE schakelaars aan staan. Zet ze achter elkaar.');
  },

  of(c, r) {
    const by = controlsOf(c, r.by);
    if (by.length < 2) return asList(r.by).length > 1 ? 'Gebruik een schakelaar én een drukknop.' : 'Gebruik twee schakelaars.';
    return logic(c, r, by, (states) => states.some(Boolean), `${cap(word(r.part))} moet werken als ÉÉN van de knoppen aan staat. Geef elke knop een eigen weg.`);
  },

  testplek(c, r) {
    const mats = c.parts.filter((p) => matches(p, r.part || 'material'));
    if (!mats.length) return 'Zet een materiaal in je kring.';
    for (const m of mats) {
      const asConductor = simulate(c, { controls: allSet(c, true), closed: new Set([m.id]) });
      const asInsulator = simulate(c, { controls: allSet(c, true), open: new Set([m.id]) });
      const lamps = c.parts.filter((p) => matches(p, r.with || 'lamp'));
      if (lamps.some((l) => isOn(asConductor, l.id) && !isOn(asInsulator, l.id))) return null;
    }
    return 'Het materiaal zit nog niet in de kring. De stroom moet door het materiaal én door het lampje.';
  },
};

function logic(c, r, by, want, message) {
  // Try every on/off state of the `by` controls, others stay on.
  for (let m = 0; m < 1 << Math.min(by.length, 6); m++) {
    const states = by.map((_, i) => Boolean(m & (1 << i)));
    const controls = allSet(c, true);
    by.forEach((p, i) => (controls[p.id] = states[i]));
    const sim = simulate(c, { controls });
    const on = working(c, sim, r.part).length > 0;
    if (on !== want(states)) {
      if (m === (1 << by.length) - 1 && !on) return RULES.aan(c, r);
      return message;
    }
  }
  return null;
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Check one lesson step. answers: { questionIndex: chosenIndex | { item: category } }.
 * Returns { ok, message }.
 */
export function checkStep(circuit, step, answers = {}) {
  for (const controls of combos(circuit)) {
    const s = simulate(circuit, { controls });
    if (s.short)
      return { ok: false, message: 'Er is kortsluiting! De stroom gaat dan rechtstreeks van + naar −. Haal die draad weg.' };
    if (s.overload.length) {
      const p = circuit.parts.find((pp) => pp.id === s.overload[0]);
      return { ok: false, message: `Pas op: ${p.type === 'led' ? 'de LED' : 'het lampje'} brandt door, want de batterij is te sterk. Remt iets de stroom af?` };
    }
  }
  for (const r of asList(step.check)) {
    const fn = RULES[r.rule];
    if (!fn) continue;
    const msg = fn(circuit, r);
    if (msg) return { ok: false, message: r.fout || msg };
  }
  const qs = step.questions || [];
  for (let i = 0; i < qs.length; i++) {
    const q = qs[i];
    const a = answers[i];
    if (q.type === 'sort') {
      const wrong = q.items.filter((it) => (a || {})[it.key] !== it.answer);
      if (wrong.length) return { ok: false, message: a && Object.keys(a).length === q.items.length ? `Nog ${wrong.length} ${wrong.length === 1 ? 'materiaal staat' : 'materialen staan'} in de verkeerde groep. Test ze nog eens!` : 'Sorteer eerst alle materialen.' };
    } else if (a !== q.answer) {
      return { ok: false, message: a === undefined ? 'Beantwoord ook de vraag.' : 'Je schakeling is goed, maar kijk nog eens naar je antwoord op de vraag.' };
    }
  }
  return { ok: true, message: step.goed || 'Goed gedaan!' };
}

/** Stars for a finished lesson: fewer wrong checks and hints = more stars. */
export function starsFor(fails, hints) {
  const p = fails + hints;
  return p === 0 ? 3 : p <= 2 ? 2 : 1;
}
