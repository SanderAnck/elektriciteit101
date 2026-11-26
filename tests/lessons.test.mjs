// Every lesson can be solved: a model solution passes the check (with the
// right answers), and a typical wrong attempt does not.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkStep } from '../js/lessons/checks.js';
import { LESSONS, BLOCKS, lessonById } from '../js/lessons/lessons.js';
import { keyOf } from '../js/circuit/parts.js';

/** Build a circuit from a short description: parts { name: 'type[:variant]' }, wires ['a.pos-b.a', ...]. */
function build(parts, wires, extra = {}) {
  const ps = Object.entries(parts).map(([id, t]) => {
    const [type, variant] = t.split(':');
    return { id, type, ...(variant ? { variant } : {}), x: 0, y: 0, rot: 0, ...(extra[id] || {}) };
  });
  const ws = wires.map((w, i) => {
    const [a, b] = w.split('-').map((x) => x.split('.'));
    return { id: `w${i}`, a: { part: a[0], term: a[1] }, b: { part: b[0], term: b[1] } };
  });
  return { parts: ps, wires: ws };
}

const answersOf = (step) => Object.fromEntries((step.questions || []).map((q, i) => [i, q.type === 'sort' ? Object.fromEntries(q.items.map((it) => [it.key, it.answer])) : q.answer]));

// Model solutions per lesson id, one circuit per step.
const SOLUTIONS = {
  1: [build({ b: 'battery', l: 'lamp' }, ['b.pos-l.a', 'l.b-b.neg'])],
  2: [build({ b: 'battery', l: 'lamp', s: 'switch' }, ['b.pos-s.a', 's.b-l.a', 'l.b-b.neg'])],
  3: [build({ b: 'battery', z: 'buzzer', k: 'button' }, ['b.pos-k.a', 'k.b-z.a', 'z.b-b.neg'])],
  4: [build({ bat: 'battery', sw: 'switch', lamp: 'lamp' }, ['bat.pos-sw.a', 'sw.b-lamp.a', 'lamp.b-bat.neg'], { sw: { on: true } })],
  5: [build({ b: 'battery', l1: 'lamp', l2: 'lamp' }, ['b.pos-l1.a', 'l1.b-l2.a', 'l2.b-b.neg'])],
  6: [build({ b: 'battery', l1: 'lamp', l2: 'lamp' }, ['b.pos-l1.a', 'l1.b-b.neg', 'b.pos-l2.a', 'l2.b-b.neg'])],
  7: [build({ b: 'battery', d: 'led' }, ['b.pos-d.pos', 'd.neg-b.neg'])],
  8: [build({ b: 'battery', l: 'lamp', m: 'material:munt' }, ['b.pos-m.a', 'm.b-l.a', 'l.b-b.neg'])],
  9: [
    build({ b: 'battery', l: 'lamp', s1: 'switch', s2: 'switch' }, ['b.pos-s1.a', 's1.b-s2.a', 's2.b-l.a', 'l.b-b.neg']),
    build({ b: 'battery', l: 'lamp', s1: 'switch', s2: 'switch' }, ['b.pos-s1.a', 's1.b-l.a', 'b.pos-s2.a', 's2.b-l.a', 'l.b-b.neg']),
  ],
  10: [
    build({ b: 'battery:plat', l1: 'lamp', l2: 'lamp', l3: 'lamp' }, ['b.pos-l1.a', 'l1.b-l2.a', 'l2.b-l3.a', 'l3.b-b.neg']),
    build({ b: 'battery:blok', r: 'resistor', d: 'led' }, ['b.pos-r.a', 'r.b-d.pos', 'd.neg-b.neg']),
  ],
  11: [
    build({ b: 'battery', s: 'switch', l: 'lamp', z: 'buzzer' }, ['b.pos-s.a', 's.b-l.a', 's.b-z.a', 'l.b-b.neg', 'z.b-b.neg']),
    build({ b: 'battery', s: 'switch', k: 'button', l: 'lamp', z: 'buzzer' }, ['b.pos-s.a', 's.b-l.a', 's.b-z.a', 'b.pos-k.a', 'k.b-z.a', 'l.b-b.neg', 'z.b-b.neg']),
  ],
  12: [build({ b: 'battery', m: 'motor', s: 'switch' }, ['b.pos-s.a', 's.b-m.a', 'm.b-b.neg'])],
  13: [build({ bat: 'battery', mat: 'material:munt', lamp: 'lamp' }, ['bat.pos-mat.a', 'mat.b-lamp.a', 'lamp.b-bat.neg'])],
  14: [build({ b: 'battery', l: 'lamp', d: 'led' }, ['b.pos-l.a', 'l.b-b.neg', 'b.pos-d.pos', 'd.neg-b.neg'])],
  15: [build({ b: 'battery', d: 'led', s: 'switch' }, ['b.pos-s.a', 's.b-d.pos', 'd.neg-b.neg'])],
  16: [build({ b: 'battery', l1: 'lamp', l2: 'lamp', s1: 'switch', s2: 'switch' }, ['b.pos-s1.a', 's1.b-l1.a', 'l1.b-b.neg', 'b.pos-s2.a', 's2.b-l2.a', 'l2.b-b.neg'])],
  17: [build({ bat: 'battery', sw: 'switch', lamp: 'lamp' }, ['bat.pos-sw.a', 'sw.b-lamp.a', 'lamp.b-bat.neg'], { sw: { on: true } })],
  18: [build({ b: 'battery', r: 'resistor', l: 'lamp' }, ['b.pos-r.a', 'r.b-l.a', 'l.b-b.neg'])],
  19: [build({ b: 'battery', p: 'material:potlood', l: 'lamp' }, ['b.pos-p.a', 'p.b-l.a', 'l.b-b.neg'])],
  20: [build({ b1: 'battery', b2: 'battery', l1: 'lamp', l2: 'lamp' }, ['b1.pos-b2.neg', 'b2.pos-l1.a', 'l1.b-l2.a', 'l2.b-b1.neg'])],
  21: [build({ b: 'battery', k: 'button', z: 'buzzer', l: 'lamp' }, ['b.pos-k.a', 'k.b-z.a', 'k.b-l.a', 'z.b-b.neg', 'l.b-b.neg'])],
  22: [build({ b: 'battery', f: 'fuse', l: 'lamp', k: 'button' }, ['b.pos-f.a', 'f.b-l.a', 'l.b-b.neg', 'l.a-k.a', 'k.b-l.b'])],
  23: [build({ b: 'battery', s1: 'switch', s2: 'switch', k: 'button', l: 'lamp' }, ['b.pos-s1.a', 's1.b-s2.a', 's2.b-k.a', 'k.b-l.a', 'l.b-b.neg'])],
  24: [build({ b: 'battery:blok', s1: 'switch', s2: 'switch', r1: 'resistor', r2: 'resistor', d1: 'led', d2: 'led' },
    ['b.pos-s1.a', 's1.b-r1.a', 'r1.b-d1.pos', 'd1.neg-b.neg', 'b.pos-s2.a', 's2.b-r2.a', 'r2.b-d2.pos', 'd2.neg-b.neg'])],
  25: [build({ b: 'battery', l1: 'lamp', l2: 'lamp', l3: 'lamp' }, ['b.pos-l1.a', 'l1.b-l2.a', 'l1.b-l3.a', 'l2.b-b.neg', 'l3.b-b.neg'])],
  26: [build({ b: 'battery', s: 'switch', r: 'resistor', k: 'button', m: 'motor' }, ['b.pos-s.a', 's.b-r.a', 'r.b-m.a', 'm.b-b.neg', 'r.a-k.a', 'k.b-r.b'])],
  27: [build({ b: 'battery', r: 'resistor', z: 'buzzer', s: 'switch' }, ['b.pos-r.a', 'r.b-z.a', 'z.b-b.neg', 'z.a-s.a', 's.b-z.b'])],
  28: [build({ b: 'battery:plat', s: 'switch', r: 'resistor', d: 'led' }, ['b.pos-s.a', 's.b-r.a', 'r.b-d.pos', 'd.neg-b.neg'])],
  29: [build({ b: 'battery', l1: 'lamp', l2: 'lamp', s: 'switch', m: 'motor' }, ['b.pos-l1.a', 'l1.b-b.neg', 'b.pos-l2.a', 'l2.b-b.neg', 'b.pos-s.a', 's.b-m.a', 'm.b-b.neg'])],
  30: [build({ b: 'battery', s: 'switch', l: 'lamp', k: 'button', z: 'buzzer', d: 'led' },
    ['b.pos-s.a', 's.b-l.a', 'l.b-b.neg', 'b.pos-k.a', 'k.b-z.a', 'z.b-b.neg', 'b.pos-d.pos', 'd.neg-b.neg'])],
};

// Typical mistakes that must NOT pass.
const WRONG = {
  12: build({ b: 'battery', m: 'motor', s: 'switch' }, ['b.pos-m.a', 'm.b-b.neg', 'b.pos-s.a']), // switch beside the circuit
  13: build({ bat: 'battery', mat: 'material:hout', lamp: 'lamp' }, ['bat.pos-mat.a', 'mat.b-lamp.a', 'lamp.b-bat.neg']),
  15: build({ b: 'battery', d: 'led', s: 'switch' }, ['b.pos-s.a', 's.b-d.neg', 'd.pos-b.neg']), // LED reversed
  16: build({ b: 'battery', l1: 'lamp', l2: 'lamp', s1: 'switch', s2: 'switch' }, ['b.pos-s1.a', 's1.b-s2.a', 's2.b-l1.a', 'l1.b-b.neg', 's2.b-l2.a', 'l2.b-b.neg']),
  18: build({ b: 'battery', l: 'lamp' }, ['b.pos-l.a', 'l.b-b.neg']),
  20: build({ b1: 'battery', b2: 'battery', l1: 'lamp', l2: 'lamp' }, ['b1.pos-l1.a', 'b2.pos-l1.a', 'l1.b-l2.a', 'l2.b-b1.neg', 'l2.b-b2.neg']), // batteries side by side
  21: build({ b: 'battery', k: 'button', z: 'buzzer', l: 'lamp' }, ['b.pos-k.a', 'k.b-z.a', 'z.b-b.neg', 'b.pos-l.a', 'l.b-b.neg']), // lamp always on
  22: build({ b: 'battery', f: 'fuse', l: 'lamp', k: 'button' }, ['b.pos-f.a', 'f.b-l.a', 'l.b-b.neg', 'b.pos-k.a', 'k.b-b.neg']), // short bypasses the fuse
  23: build({ b: 'battery', s1: 'switch', s2: 'switch', k: 'button', l: 'lamp' }, ['b.pos-s1.a', 's1.b-l.a', 'b.pos-s2.a', 's2.b-l.a', 'b.pos-k.a', 'k.b-l.a', 'l.b-b.neg']),
  24: build({ b: 'battery:blok', s1: 'switch', s2: 'switch', d1: 'led', d2: 'led' }, ['b.pos-s1.a', 's1.b-d1.pos', 'd1.neg-b.neg', 'b.pos-s2.a', 's2.b-d2.pos', 'd2.neg-b.neg']), // burns out
  25: build({ b: 'battery', l1: 'lamp', l2: 'lamp', l3: 'lamp' }, ['b.pos-l1.a', 'l1.b-l2.a', 'l2.b-l3.a', 'l3.b-b.neg']),
  26: build({ b: 'battery', s: 'switch', r: 'resistor', k: 'button', m: 'motor' }, ['b.pos-s.a', 's.b-k.a', 'k.b-m.a', 'm.b-b.neg']),
  27: build({ b: 'battery', z: 'buzzer', s: 'switch' }, ['b.pos-s.a', 's.b-z.a', 'z.b-b.neg']),
  28: build({ b: 'battery:plat', s: 'switch', d: 'led' }, ['b.pos-s.a', 's.b-d.pos', 'd.neg-b.neg']),
  29: build({ b: 'battery', l1: 'lamp', l2: 'lamp', s: 'switch', m: 'motor' }, ['b.pos-s.a', 's.b-l1.a', 'l1.b-b.neg', 's.b-l2.a', 'l2.b-b.neg', 's.b-m.a', 'm.b-b.neg']),
  30: build({ b: 'battery', s: 'switch', l: 'lamp', k: 'button', z: 'buzzer', d: 'led' }, ['b.pos-s.a', 's.b-l.a', 'l.b-b.neg', 'b.pos-k.a', 'k.b-z.a', 'z.b-b.neg', 's.b-d.pos', 'd.neg-b.neg']),
};

test('three blocks of ten lessons, every id once, old ids kept', () => {
  assert.deepEqual(BLOCKS.map((b) => b.ids.length), [10, 10, 10]);
  assert.equal(new Set(LESSONS.map((l) => l.id)).size, 30);
  for (let id = 1; id <= 30; id++) assert.ok(lessonById(id), `les ${id}`);
  assert.equal(lessonById(1).title, 'Licht aan!');
  assert.equal(lessonById(11).title, 'Eindopdracht: alarm');
  assert.deepEqual(LESSONS.map((l) => l.nr), Array.from({ length: 30 }, (_, i) => i + 1));
});

for (const lesson of LESSONS) {
  test(`les ${lesson.nr} (${lesson.title}) is op te lossen`, () => {
    const sols = SOLUTIONS[lesson.id];
    assert.ok(sols, 'model solution missing');
    assert.equal(sols.length, lesson.steps.length);
    lesson.steps.forEach((step, i) => {
      const c = sols[i];
      // only parts from the toolbox (plus the start circuit)
      const allowed = { ...(lesson.toolbox || {}) };
      for (const p of lesson.start?.parts || []) allowed[keyOf(p)] = (allowed[keyOf(p)] || 0) + 1;
      if (lesson.id !== 8) {
        const used = {};
        for (const p of c.parts) used[keyOf(p)] = (used[keyOf(p)] || 0) + 1;
        for (const [k, n] of Object.entries(used)) assert.ok((allowed[k] || 0) >= n, `${k} × ${n} niet in de gereedschapskist`);
      }
      const res = checkStep(c, step, answersOf(step));
      assert.equal(res.ok, true, `stap ${i + 1}: ${res.message}`);
      if (step.questions?.length) assert.equal(checkStep(c, step, {}).ok, false);
    });
    if (WRONG[lesson.id]) {
      const res = checkStep(WRONG[lesson.id], lesson.steps[0], answersOf(lesson.steps[0]));
      assert.equal(res.ok, false, 'a wrong circuit passed');
      assert.ok(res.message.length > 10);
    }
    if (lesson.start) assert.equal(checkStep(lesson.start, lesson.steps[0], answersOf(lesson.steps[0])).ok, false, 'the start circuit already passes');
  });
}

test('a melted fuse must be replaced, and a short without fuse never passes', () => {
  const step = lessonById(22).steps[0];
  const ok = SOLUTIONS[22][0];
  const melted = { ...ok, parts: ok.parts.map((p) => (p.type === 'fuse' ? { ...p, broken: true } : p)) };
  const r = checkStep(melted, step, answersOf(step));
  assert.equal(r.ok, false);
  assert.match(r.message, /Nieuw/);
  const noFuse = build({ b: 'battery', l: 'lamp', k: 'button' }, ['b.pos-l.a', 'l.b-b.neg', 'l.a-k.a', 'k.b-l.b']);
  assert.equal(checkStep(noFuse, lessonById(3).steps[0], {}).ok, false);
});
