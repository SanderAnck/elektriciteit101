// Simplified circuit simulation (no DOM, fully testable in Node).
//
// Method: nodal analysis. Every terminal is a node. Wires and closed
// switches are tiny resistances, loads have a fixed resistance, a battery
// cell is a voltage source with a small internal resistance (as a Norton
// equivalent). A LED is a resistance that only conducts forwards, found by
// iterating. The result for children is simple: off / dim / bright.

import { PARTS, MATERIALS, batteryOf } from './parts.js';

export const V_CELL = 1.5;
export const R_INT = 0.2;
const G_WIRE = 1000; // 1 milliohm
const G_MIN = 1e-9; // keeps floating nodes solvable
export const SHORT_CURRENT = 2; // amps through a battery that count as a short circuit
export const BURN_RATIO = 2.5; // a lamp or LED burns out above 2,5 × its normal current
const I_EPS = 0.005;

/** Current through a load with one cell and nothing else: "normal brightness". */
export const nominalCurrent = (R) => V_CELL / (R + R_INT);

export function levelOf(ratio) {
  if (ratio < 0.12) return 'uit';
  if (ratio < 0.7) return 'zwak';
  if (ratio < 1.4) return 'fel';
  return 'heelfel';
}

function conducts(part, opts) {
  if (opts.open?.has(part.id)) return false;
  if (part.broken) return false;
  if (opts.closed?.has(part.id)) return true;
  if (part.type === 'switch') return opts.controls?.[part.id] ?? Boolean(part.on);
  if (part.type === 'button') return opts.controls?.[part.id] ?? Boolean(opts.pressed?.has(part.id));
  if (part.type === 'material') return Boolean(MATERIALS[part.variant]?.conductor);
  return true;
}

/** Conductance of a two-terminal part, or 0 when it is open. */
function conductance(part, opts) {
  if (!conducts(part, opts)) return 0;
  if (opts.closed?.has(part.id)) return G_WIRE;
  if (part.type === 'switch' || part.type === 'button') return G_WIRE;
  if (part.type === 'material') return 1 / Math.max(MATERIALS[part.variant].R, 1 / G_WIRE);
  const R = PARTS[part.type].R;
  return R ? 1 / R : G_WIRE;
}

function solve(A, b) {
  const n = b.length;
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
    [A[col], A[piv]] = [A[piv], A[col]];
    [b[col], b[piv]] = [b[piv], b[col]];
    const d = A[col][col];
    if (Math.abs(d) < 1e-15) continue;
    for (let r = col + 1; r < n; r++) {
      const f = A[r][col] / d;
      if (!f) continue;
      for (let k = col; k < n; k++) A[r][k] -= f * A[col][k];
      b[r] -= f * b[col];
    }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = b[r];
    for (let k = r + 1; k < n; k++) s -= A[r][k] * x[k];
    x[r] = Math.abs(A[r][r]) < 1e-15 ? 0 : s / A[r][r];
  }
  return x;
}

class UnionFind {
  constructor(n) { this.p = Array.from({ length: n }, (_, i) => i); }
  find(i) { while (this.p[i] !== i) i = this.p[i] = this.p[this.p[i]]; return i; }
  union(a, b) { this.p[this.find(a)] = this.find(b); }
}

/**
 * Simulate a circuit.
 * opts: { pressed: Set<id> (push buttons held down),
 *         controls: { id: bool } (override switch/button state),
 *         open: Set<id> (treat part as removed), closed: Set<id> (treat as a wire) }
 * Returns { parts: { id: { level, ratio, current, reason, short? } },
 *           wires: { id: { current, hot } }, short, shortParts: [ids], overload: [ids that burn out],
 *           blown: [fuses that melt], anyCurrent }
 */
export function simulate(circuit, opts = {}) {
  const index = new Map();
  const node = (pid, term) => {
    const key = `${pid}:${term}`;
    if (!index.has(key)) index.set(key, index.size);
    return index.get(key);
  };
  const parts = circuit.parts.filter((p) => PARTS[p.type]);
  for (const p of parts) for (const t of PARTS[p.type].terminals) node(p.id, t.id);
  const byId = new Map(parts.map((p) => [p.id, p]));
  const wires = circuit.wires.filter((w) => byId.has(w.a.part) && byId.has(w.b.part));

  const n = index.size;
  const two = (p) => PARTS[p.type].terminals.map((t) => node(p.id, t.id));
  const leds = parts.filter((p) => PARTS[p.type].diode);
  const ledOn = new Map(leds.map((p) => [p.id, true]));

  let V = new Array(n).fill(0);
  for (let iter = 0; iter < 20; iter++) {
    const A = Array.from({ length: n }, () => new Array(n).fill(0));
    const b = new Array(n).fill(0);
    for (let i = 0; i < n; i++) A[i][i] += G_MIN;
    const stamp = (i, j, g) => {
      A[i][i] += g; A[j][j] += g; A[i][j] -= g; A[j][i] -= g;
    };
    for (const p of parts) {
      const [i, j] = two(p);
      if (p.type === 'battery') {
        if (opts.open?.has(p.id)) continue;
        const { cells } = batteryOf(p);
        const g = 1 / (R_INT * cells);
        stamp(i, j, g);
        b[j] += V_CELL * cells * g; // pushes current out of the + terminal
        b[i] -= V_CELL * cells * g;
        continue;
      }
      if (PARTS[p.type].diode && (p.broken || !ledOn.get(p.id)) && !opts.closed?.has(p.id)) continue;
      const g = conductance(p, opts);
      if (g) stamp(i, j, g);
    }
    for (const w of wires) stamp(node(w.a.part, w.a.term), node(w.b.part, w.b.term), G_WIRE);
    V = solve(A, b);

    // LED: conducts only from + (anode) to − (cathode).
    let changed = false;
    for (const p of leds) {
      const [i, j] = two(p);
      const fwd = V[i] - V[j];
      if (ledOn.get(p.id) && fwd < 0) { ledOn.set(p.id, false); changed = true; }
      else if (!ledOn.get(p.id) && fwd > 0.05) { ledOn.set(p.id, true); changed = true; }
    }
    if (!changed) break;
  }

  // Ideal conductors (wires, closed switches, metals) join terminals into one
  // point: a load whose two ends meet that way is bridged ("overbrugd").
  const uf = new UnionFind(n);
  for (const w of wires) uf.union(node(w.a.part, w.a.term), node(w.b.part, w.b.term));
  for (const p of parts) {
    if (p.type === 'battery' || PARTS[p.type].diode) continue;
    if (conductance(p, opts) >= G_WIRE * 0.99) uf.union(...two(p));
  }

  const res = { parts: {}, wires: {}, short: false, shortParts: [], overload: [], blown: [], anyCurrent: false };
  for (const p of parts) {
    const [i, j] = two(p);
    const dv = V[i] - V[j];
    if (p.type === 'battery') {
      // Current leaving the + terminal.
      const { cells } = batteryOf(p);
      const I = opts.open?.has(p.id) ? 0 : (V_CELL * cells - (V[j] - V[i])) / (R_INT * cells);
      const short = Math.abs(I) > SHORT_CURRENT;
      res.parts[p.id] = { level: Math.abs(I) > I_EPS ? 'fel' : 'uit', current: I, short, reason: short ? 'kortsluiting' : null };
      if (short) { res.short = true; res.shortParts.push(p.id); }
      if (Math.abs(I) > I_EPS) res.anyCurrent = true;
      continue;
    }
    let g = conductance(p, opts);
    if (PARTS[p.type].diode && (p.broken || !ledOn.get(p.id)) && !opts.closed?.has(p.id)) g = 0;
    const I = g * dv; // from first to second terminal
    const def = PARTS[p.type];
    const out = { current: I, level: Math.abs(I) > I_EPS ? 'fel' : 'uit', reason: null };
    if (def.load) {
      out.ratio = Math.abs(I) / nominalCurrent(def.R);
      out.level = levelOf(out.ratio);
      // Too much current: the lamp or LED burns out (the editor then marks it broken).
      if (def.burns && out.ratio > BURN_RATIO) { out.overload = true; res.overload.push(p.id); }
      if (out.level === 'uit') {
        if (p.broken) out.reason = 'kapot';
        else if (opts.open?.has(p.id)) out.reason = 'los';
        else if (uf.find(i) === uf.find(j)) out.reason = 'overbrugd';
        else if (def.diode && dv < -0.3) out.reason = 'verkeerd';
        else out.reason = 'open';
      }
    }
    // Too much current through a fuse: its thin wire melts and the circuit opens.
    if (def.fuse && Math.abs(I) > def.maxI) { out.blown = true; res.blown.push(p.id); }
    if (def.fuse && p.broken) out.reason = 'gesprongen';
    res.parts[p.id] = out;
  }
  for (const w of wires) {
    const I = G_WIRE * (V[node(w.a.part, w.a.term)] - V[node(w.b.part, w.b.term)]);
    res.wires[w.id] = { current: Math.abs(I) > I_EPS ? I : 0, hot: Math.abs(I) > SHORT_CURRENT };
  }
  return res;
}

/** Parts that do something visible when current flows. */
export const isOn = (sim, id) => sim.parts[id] && sim.parts[id].level !== 'uit';
