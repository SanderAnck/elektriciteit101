// Circuit data model: plain JSON, easy to save, export and test.
//   { parts: [{ id, type, variant?, x, y, rot, on? }],
//     wires: [{ id, a: { part, term }, b: { part, term } }] }

import { PARTS, GRID } from './parts.js';

export const WORLD = { w: 960, h: 640 };

export const emptyCircuit = () => ({ parts: [], wires: [] });

export const clone = (c) => JSON.parse(JSON.stringify(c));

let counter = 0;
export const newId = (prefix) => `${prefix}${Date.now().toString(36)}${(counter++).toString(36)}`;

export function snap(v) {
  return Math.round(v / GRID) * GRID;
}

/** Keep a part centre inside the drawing area, on the grid. */
export function clampPos(x, y, w = WORLD.w, h = WORLD.h) {
  return {
    x: Math.min(Math.floor((w - 80) / GRID) * GRID, Math.max(80, snap(x))),
    y: Math.min(Math.floor((h - 40) / GRID) * GRID, Math.max(80, snap(y))),
  };
}

export function addPart(c, type, x, y, variant, world = WORLD) {
  const pos = clampPos(x, y, world.w, world.h);
  const part = { id: newId('p'), type, x: pos.x, y: pos.y, rot: 0 };
  if (variant) part.variant = variant;
  if (type === 'switch') part.on = false;
  c.parts.push(part);
  return part;
}

export function removePart(c, id) {
  c.parts = c.parts.filter((p) => p.id !== id);
  c.wires = c.wires.filter((w) => w.a.part !== id && w.b.part !== id);
}

export function removeWire(c, id) {
  c.wires = c.wires.filter((w) => w.id !== id);
}

const sameEnd = (e1, e2) => e1.part === e2.part && e1.term === e2.term;

/** Add a wire between two terminals unless it already exists. */
export function addWire(c, a, b) {
  if (sameEnd(a, b)) return null;
  if (c.wires.some((w) => (sameEnd(w.a, a) && sameEnd(w.b, b)) || (sameEnd(w.a, b) && sameEnd(w.b, a)))) return null;
  const wire = { id: newId('w'), a: { ...a }, b: { ...b } };
  c.wires.push(wire);
  return wire;
}

export function rotatePart(c, id) {
  const p = c.parts.find((pp) => pp.id === id);
  if (p) p.rot = ((p.rot || 0) + 90) % 360;
}

/** A free spot near the middle for parts added with a click. */
export function freeSpot(c, world = WORLD) {
  const cx = world.w / 2;
  const cy = world.h / 2;
  for (let r = 0; r < 12; r++) {
    for (let i = 0; i < Math.max(1, r * 6); i++) {
      const a = (i / Math.max(1, r * 6)) * Math.PI * 2;
      const pos = clampPos(cx + Math.cos(a) * r * 60, cy + Math.sin(a) * r * 60, world.w, world.h);
      if (c.parts.every((p) => Math.abs(p.x - pos.x) >= 160 || Math.abs(p.y - pos.y) >= 120)) return pos;
    }
  }
  return { x: cx, y: cy };
}

/** Drop wires that point at missing parts or terminals (e.g. from an old file). */
export function sanitize(c) {
  const out = { parts: [], wires: [] };
  for (const p of c?.parts || []) if (PARTS[p.type]) out.parts.push({ rot: 0, ...p });
  const has = (e) => {
    const p = out.parts.find((pp) => pp.id === e?.part);
    return p && PARTS[p.type].terminals.some((t) => t.id === e.term);
  };
  for (const w of c?.wires || []) if (has(w.a) && has(w.b)) out.wires.push(w);
  return out;
}

/** Undo/redo history of circuit snapshots. */
export class History {
  constructor(initial) {
    this.stack = [JSON.stringify(initial)];
    this.pos = 0;
  }
  push(c) {
    const s = JSON.stringify(c);
    if (s === this.stack[this.pos]) return;
    this.stack = this.stack.slice(0, this.pos + 1);
    this.stack.push(s);
    if (this.stack.length > 100) this.stack.shift();
    this.pos = this.stack.length - 1;
  }
  canUndo() { return this.pos > 0; }
  canRedo() { return this.pos < this.stack.length - 1; }
  undo() { if (this.canUndo()) this.pos--; return JSON.parse(this.stack[this.pos]); }
  redo() { if (this.canRedo()) this.pos++; return JSON.parse(this.stack[this.pos]); }
}
