// Run with: node --test tests/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../js/circuit/sim.js';
import { checkStep } from '../js/lessons/checks.js';
import { flipPart, rotatePart } from '../js/circuit/model.js';
import { LESSONS } from '../js/lessons/lessons.js';

let n = 0;
const P = (type, extra = {}) => ({ id: `${type}${n++}`, type, x: 0, y: 0, rot: 0, ...extra });
const W = (a, ta, b, tb) => ({ id: `w${n++}`, a: { part: a.id, term: ta }, b: { part: b.id, term: tb } });

function single(type = 'lamp', extra) {
  const bat = P('battery');
  const l = P(type, extra);
  return { bat, l, c: { parts: [bat, l], wires: [W(bat, 'pos', l, l.type === 'led' ? 'pos' : 'a'), W(l, l.type === 'led' ? 'neg' : 'b', bat, 'neg')] } };
}

test('closed circuit lights the lamp', () => {
  const { c, l } = single();
  const s = simulate(c);
  assert.equal(s.parts[l.id].level, 'fel');
  assert.equal(s.short, false);
});

test('open circuit: lamp off with reason open', () => {
  const { c, l } = single();
  c.wires.pop();
  const s = simulate(c);
  assert.equal(s.parts[l.id].level, 'uit');
  assert.equal(s.parts[l.id].reason, 'open');
});

test('series lamps are dim, parallel lamps bright', () => {
  const bat = P('battery'); const a = P('lamp'); const b = P('lamp');
  const series = { parts: [bat, a, b], wires: [W(bat, 'pos', a, 'a'), W(a, 'b', b, 'a'), W(b, 'b', bat, 'neg')] };
  let s = simulate(series);
  assert.equal(s.parts[a.id].level, 'zwak');
  assert.equal(s.parts[b.id].level, 'zwak');
  const par = { parts: [bat, a, b], wires: [W(bat, 'pos', a, 'a'), W(a, 'b', bat, 'neg'), W(bat, 'pos', b, 'a'), W(b, 'b', bat, 'neg')] };
  s = simulate(par);
  assert.equal(s.parts[a.id].level, 'fel');
  assert.equal(s.parts[b.id].level, 'fel');
});

test('two cells in series make the lamp extra bright', () => {
  const b1 = P('battery'); const b2 = P('battery'); const l = P('lamp');
  const c = { parts: [b1, b2, l], wires: [W(b1, 'pos', b2, 'neg'), W(b2, 'pos', l, 'a'), W(l, 'b', b1, 'neg')] };
  assert.equal(simulate(c).parts[l.id].level, 'heelfel');
});

test('LED only works the right way round', () => {
  const { c, l } = single('led');
  assert.notEqual(simulate(c).parts[l.id].level, 'uit');
  const bat = c.parts[0];
  const rev = { parts: c.parts, wires: [W(bat, 'pos', l, 'neg'), W(l, 'pos', bat, 'neg')] };
  const s = simulate(rev);
  assert.equal(s.parts[l.id].level, 'uit');
  assert.equal(s.parts[l.id].reason, 'verkeerd');
});

test('short circuit is detected, bridged lamp is explained', () => {
  const { c, bat, l } = single();
  c.wires.push(W(bat, 'pos', bat, 'neg'));
  let s = simulate(c);
  assert.equal(s.short, true);
  const { c: c2, l: l2 } = single();
  const bat2 = P('battery'); const l3 = P('lamp');
  // lamp l3 in series with l2, but bridged by a wire
  const c3 = { parts: [bat2, l2, l3], wires: [W(bat2, 'pos', l2, 'a'), W(l2, 'b', l3, 'a'), W(l3, 'b', bat2, 'neg'), W(l3, 'a', l3, 'b')] };
  s = simulate(c3);
  assert.equal(s.parts[l3.id].reason, 'overbrugd');
  assert.equal(s.parts[l2.id].level, 'fel');
  assert.equal(s.short, false);
  void c2; void l;
});

test('switch and push button control the circuit', () => {
  const bat = P('battery'); const l = P('lamp'); const sw = P('switch', { on: false });
  const c = { parts: [bat, l, sw], wires: [W(bat, 'pos', sw, 'a'), W(sw, 'b', l, 'a'), W(l, 'b', bat, 'neg')] };
  assert.equal(simulate(c).parts[l.id].level, 'uit');
  sw.on = true;
  assert.equal(simulate(c).parts[l.id].level, 'fel');
  const btn = P('button');
  const c2 = { parts: [bat, l, btn], wires: [W(bat, 'pos', btn, 'a'), W(btn, 'b', l, 'a'), W(l, 'b', bat, 'neg')] };
  assert.equal(simulate(c2).parts[l.id].level, 'uit');
  assert.equal(simulate(c2, { pressed: new Set([btn.id]) }).parts[l.id].level, 'fel');
});

test('materials: coin conducts, plastic does not, pencil lead is weak', () => {
  for (const [variant, want] of [['munt', 'fel'], ['plastic', 'uit'], ['potlood', 'zwak']]) {
    const bat = P('battery'); const l = P('lamp'); const m = P('material', { variant });
    const c = { parts: [bat, l, m], wires: [W(bat, 'pos', m, 'a'), W(m, 'b', l, 'a'), W(l, 'b', bat, 'neg')] };
    assert.equal(simulate(c).parts[l.id].level, want, variant);
  }
});

test('lesson checks accept a correct circuit and reject a wrong one', () => {
  const lesson1 = LESSONS.find((l) => l.id === 1);
  const { c } = single();
  assert.equal(checkStep(c, lesson1.steps[0], {}).ok, true);
  c.wires.pop();
  assert.equal(checkStep(c, lesson1.steps[0], {}).ok, false);
});

test('lesson 9: AND and OR with two switches', () => {
  const step = LESSONS.find((l) => l.id === 9).steps;
  const bat = P('battery'); const l = P('lamp'); const s1 = P('switch'); const s2 = P('switch');
  const and = { parts: [bat, l, s1, s2], wires: [W(bat, 'pos', s1, 'a'), W(s1, 'b', s2, 'a'), W(s2, 'b', l, 'a'), W(l, 'b', bat, 'neg')] };
  const or = { parts: [bat, l, s1, s2], wires: [W(bat, 'pos', s1, 'a'), W(bat, 'pos', s2, 'a'), W(s1, 'b', l, 'a'), W(s2, 'b', l, 'a'), W(l, 'b', bat, 'neg')] };
  assert.equal(checkStep(and, step[0], {}).ok, true);
  assert.equal(checkStep(or, step[0], {}).ok, false);
  assert.equal(checkStep(or, step[1], {}).ok, true);
  assert.equal(checkStep(and, step[1], {}).ok, false);
});

test('lesson 5 and 6: series vs parallel', () => {
  const bat = P('battery'); const a = P('lamp'); const b = P('lamp');
  const series = { parts: [bat, a, b], wires: [W(bat, 'pos', a, 'a'), W(a, 'b', b, 'a'), W(b, 'b', bat, 'neg')] };
  const par = { parts: [bat, a, b], wires: [W(bat, 'pos', a, 'a'), W(a, 'b', bat, 'neg'), W(bat, 'pos', b, 'a'), W(b, 'b', bat, 'neg')] };
  const l5 = LESSONS.find((l) => l.id === 5).steps[0];
  const l6 = LESSONS.find((l) => l.id === 6).steps[0];
  const answers = (step) => Object.fromEntries((step.questions || []).map((q, i) => [i, q.answer]));
  assert.equal(checkStep(series, l5, answers(l5)).ok, true);
  assert.equal(checkStep(par, l5, answers(l5)).ok, false);
  assert.equal(checkStep(par, l6, answers(l6)).ok, true);
  assert.equal(checkStep(series, l6, answers(l6)).ok, false);
});

test('a short circuit never passes a check', () => {
  const lesson1 = LESSONS.find((l) => l.id === 1);
  const { c, bat } = single();
  c.wires.push(W(bat, 'pos', bat, 'neg'));
  assert.equal(checkStep(c, lesson1.steps[0], {}).ok, false);
});

test('every lesson start circuit and data are valid', () => {
  for (const l of LESSONS) {
    assert.ok(l.title && l.intro && l.steps.length, `lesson ${l.id}`);
    for (const s of l.steps) assert.ok(s.goal && s.check && s.hints.length, `lesson ${l.id} step`);
  }
});

test('lessons 2, 3, 4, 7, 8 and the final one accept a correct solution', () => {
  const L = (id) => LESSONS.find((l) => l.id === id);
  const ALARM = LESSONS.find((l) => l.title.startsWith('Eindopdracht')).id;
  const bat = P('battery'); const lamp = P('lamp'); const sw = P('switch'); const btn = P('button');
  const buz = P('buzzer'); const led = P('led');
  // 2: switch in series with lamp
  const c2 = { parts: [bat, lamp, sw], wires: [W(bat, 'pos', sw, 'a'), W(sw, 'b', lamp, 'a'), W(lamp, 'b', bat, 'neg')] };
  assert.equal(checkStep(c2, L(2).steps[0]).ok, true);
  // switch next to the lamp (always on) is wrong
  const c2b = { parts: [bat, lamp, sw], wires: [W(bat, 'pos', lamp, 'a'), W(lamp, 'b', bat, 'neg'), W(sw, 'a', bat, 'pos')] };
  assert.equal(checkStep(c2b, L(2).steps[0]).ok, false);
  // 3: doorbell with push button (a switch is not accepted)
  const c3 = { parts: [bat, buz, btn], wires: [W(bat, 'pos', btn, 'a'), W(btn, 'b', buz, 'a'), W(buz, 'b', bat, 'neg')] };
  assert.equal(checkStep(c3, L(3).steps[0]).ok, true);
  const c3b = { parts: [bat, buz, sw], wires: [W(bat, 'pos', sw, 'a'), W(sw, 'b', buz, 'a'), W(buz, 'b', bat, 'neg')] };
  assert.equal(checkStep(c3b, L(3).steps[0]).ok, false);
  // 4: start circuit fails, fixed one passes
  const start = structuredClone(L(4).start);
  assert.equal(checkStep(start, L(4).steps[0]).ok, false);
  start.parts.find((p) => p.id === 'sw').on = true; // checks try the switch on anyway
  start.wires.push({ id: 'fix', a: { part: 'lamp', term: 'b' }, b: { part: 'bat', term: 'neg' } });
  assert.equal(checkStep(start, L(4).steps[0]).ok, true);
  // 7: LED plus the question
  const c7 = { parts: [bat, led], wires: [W(bat, 'pos', led, 'pos'), W(led, 'neg', bat, 'neg')] };
  assert.equal(checkStep(c7, L(7).steps[0], { 0: 1 }).ok, true);
  assert.equal(checkStep(c7, L(7).steps[0], {}).ok, false);
  const c7b = { parts: [bat, led], wires: [W(bat, 'pos', led, 'neg'), W(led, 'pos', bat, 'neg')] };
  assert.match(checkStep(c7b, L(7).steps[0], { 0: 1 }).message, /verkeerd om/);
  // 8: material in series with the lamp, all sorted
  const m = P('material', { variant: 'hout' });
  const c8 = { parts: [bat, lamp, m], wires: [W(bat, 'pos', m, 'a'), W(m, 'b', lamp, 'a'), W(lamp, 'b', bat, 'neg')] };
  const q = L(8).steps[0].questions[0];
  const sorted = Object.fromEntries(q.items.map((it) => [it.key, it.answer]));
  assert.equal(checkStep(c8, L(8).steps[0], { 0: sorted }).ok, true);
  assert.equal(checkStep(c8, L(8).steps[0], { 0: { ...sorted, hout: 'geleider' } }).ok, false);
  // 10: alarm
  const lamp2 = P('lamp');
  const c10 = { parts: [bat, sw, lamp2, buz], wires: [W(bat, 'pos', sw, 'a'), W(sw, 'b', lamp2, 'a'), W(sw, 'b', buz, 'a'), W(lamp2, 'b', bat, 'neg'), W(buz, 'b', bat, 'neg')] };
  assert.equal(checkStep(c10, L(ALARM).steps[0]).ok, true);
  const c10b = { parts: [...c10.parts, btn], wires: [...c10.wires, W(bat, 'pos', btn, 'a'), W(btn, 'b', sw, 'b')] };
  assert.equal(checkStep(c10b, L(ALARM).steps[1]).ok, true);
  assert.equal(checkStep(c10, L(ALARM).steps[1]).ok, false);
});

test('strong batteries: a lamp burns out, lamps in series or a resistor protect it', () => {
  const plat = P('battery', { variant: 'plat' }); const l = P('lamp');
  const one = { parts: [plat, l], wires: [W(plat, 'pos', l, 'a'), W(l, 'b', plat, 'neg')] };
  let s = simulate(one);
  assert.deepEqual(s.overload, [l.id]);
  l.broken = true;
  s = simulate(one);
  assert.equal(s.parts[l.id].level, 'uit');
  assert.equal(s.parts[l.id].reason, 'kapot');
  assert.equal(s.short, false);
  // three lamps in series on 4,5 V: normal brightness, nothing burns
  const a = P('lamp'); const b = P('lamp'); const c = P('lamp');
  const series = { parts: [plat, a, b, c], wires: [W(plat, 'pos', a, 'a'), W(a, 'b', b, 'a'), W(b, 'b', c, 'a'), W(c, 'b', plat, 'neg')] };
  s = simulate(series);
  assert.equal(s.overload.length, 0);
  assert.equal(s.parts[a.id].level, 'fel');
  // lesson 10
  const les = LESSONS.find((x) => x.id === 10);
  assert.equal(checkStep(series, les.steps[0], { 0: 1 }).ok, true);
  l.broken = false;
  assert.equal(checkStep(one, les.steps[0], { 0: 1 }).ok, false);
  const aa = P('battery'); const l2 = P('lamp');
  const normal = { parts: [aa, l2, plat], wires: [W(aa, 'pos', l2, 'a'), W(l2, 'b', aa, 'neg')] };
  assert.equal(checkStep(normal, les.steps[0], { 0: 1 }).ok, false); // not on the flat battery
  // 9 V: LED burns alone, survives with a resistor
  const blok = P('battery', { variant: 'blok' }); const led = P('led'); const r = P('resistor');
  const bare = { parts: [blok, led], wires: [W(blok, 'pos', led, 'pos'), W(led, 'neg', blok, 'neg')] };
  assert.deepEqual(simulate(bare).overload, [led.id]);
  const safe = { parts: [blok, led, r], wires: [W(blok, 'pos', r, 'a'), W(r, 'b', led, 'pos'), W(led, 'neg', blok, 'neg')] };
  assert.equal(simulate(safe).overload.length, 0);
  assert.equal(checkStep(safe, les.steps[1]).ok, true);
  assert.equal(checkStep(bare, les.steps[1]).ok, false);
});

test('the burn-out facts in the explanations match the simulation', () => {
  const chain = (variant, nLamps, type = 'lamp') => {
    const bat = P('battery', variant ? { variant } : {});
    const lamps = Array.from({ length: nLamps }, () => P(type));
    const t = (l, side) => (type === 'led' ? (side === 'in' ? 'pos' : 'neg') : side === 'in' ? 'a' : 'b');
    const wires = [W(bat, 'pos', lamps[0], t(lamps[0], 'in'))];
    for (let i = 1; i < lamps.length; i++) wires.push(W(lamps[i - 1], t(lamps[i - 1], 'out'), lamps[i], t(lamps[i], 'in')));
    wires.push(W(lamps.at(-1), t(lamps.at(-1), 'out'), bat, 'neg'));
    return simulate({ parts: [bat, ...lamps], wires }).overload.length > 0;
  };
  const twoAA = () => {
    const a = P('battery'); const b = P('battery'); const l = P('lamp');
    return simulate({ parts: [a, b, l], wires: [W(a, 'pos', b, 'neg'), W(b, 'pos', l, 'a'), W(l, 'b', a, 'neg')] });
  };
  assert.equal(chain(null, 1), false); // 1,5 V: fine
  const s = twoAA();
  assert.equal(s.overload.length, 0); // 3 V: extra bright, no burn
  assert.equal(chain('plat', 1), true); // 4,5 V: one lamp burns
  assert.equal(chain('plat', 2), false); // two in series survive
  assert.equal(chain('blok', 2), true); // 9 V: two burn
  assert.equal(chain('blok', 3), false); // three in series survive
  assert.equal(chain('plat', 1, 'led'), true);
});

test('rotating keeps the circuit, turning the battery around reverses the motor', () => {
  const bat = P('battery'); const m = P('motor');
  const c = { parts: [bat, m], wires: [W(bat, 'pos', m, 'a'), W(m, 'b', bat, 'neg')] };
  const before = simulate(c).parts[m.id].current;
  assert.ok(before > 0);
  rotatePart(c, bat.id); rotatePart(c, bat.id);
  assert.ok(simulate(c).parts[m.id].current > 0); // rotating 180° does not change the wires
  flipPart(c, bat.id);
  assert.ok(simulate(c).parts[m.id].current < 0); // + and − swapped: the motor turns the other way
  assert.equal(bat.rot, 0);
});
