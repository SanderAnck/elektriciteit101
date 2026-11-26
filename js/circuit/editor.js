// Interactive circuit editor on an SVG board.
// Mouse and touchpad friendly: parts snap to the grid, terminals are big
// "magnets", wires are made by dragging (or clicking) from terminal to
// terminal. Simulation results come from sim.js; drawings from draw.js.

import { PARTS, GRID, terminalPos } from './parts.js';
import { WORLD, clampPos, addPart, addWire, removePart, removeWire, rotatePart, flipPart, freeSpot, History, clone } from './model.js';
import { simulate, nominalCurrent } from './sim.js';
import { drawPart, DEFS } from './draw.js';

const NS = 'http://www.w3.org/2000/svg';
const MAGNET = 44; // world units around a terminal that still count as "on it"
const DRAG_START = 6;
const WIRE_COLORS = ['#E03131', '#1C7ED6', '#2F9E44', '#F08C00', '#7048E8', '#0C8599'];

function wirePath(p1, p2) {
  const d = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  const k = Math.min(120, Math.max(30, d * 0.45));
  const c1 = `${p1.x + p1.dx * k} ${p1.y + p1.dy * k}`;
  const c2 = `${p2.x + (p2.dx || 0) * k} ${p2.y + (p2.dy || 0) * k}`;
  return `M${p1.x} ${p1.y} C${c1} ${c2} ${p2.x} ${p2.y}`;
}

export class Editor {
  /**
   * opts: { circuit, onChange(circuit, sim), onSelect(selection), onHover(info|null), canAdd(key) }
   */
  constructor(svg, opts = {}) {
    this.svg = svg;
    this.opts = opts;
    this.circuit = clone(opts.circuit || { parts: [], wires: [] });
    this.history = new History(this.circuit);
    this.selection = null; // { kind: 'part'|'wire', id }
    this.pressed = new Set();
    this.mode = null; // drag state
    this.showDots = opts.showDots !== false;
    this.phase = new Map();
    this.sim = null;

    this.world = { ...WORLD };
    svg.innerHTML = `${DEFS}
      <defs><pattern id="grid" width="${GRID}" height="${GRID}" patternUnits="userSpaceOnUse">
        <circle cx="0" cy="0" r="1.8" class="grid-dot"/><circle cx="${GRID}" cy="0" r="1.8" class="grid-dot"/>
        <circle cx="0" cy="${GRID}" r="1.8" class="grid-dot"/><circle cx="${GRID}" cy="${GRID}" r="1.8" class="grid-dot"/></pattern></defs>
      <rect class="board" x="0" y="0" width="${WORLD.w}" height="${WORLD.h}" rx="18"/>
      <rect class="board-grid" x="0" y="0" width="${WORLD.w}" height="${WORLD.h}" fill="url(#grid)" pointer-events="none"/>
      <g class="layer-wires"></g><g class="layer-dots"></g><g class="layer-parts"></g><g class="layer-terms"></g><g class="layer-ghost"></g>`;
    this.L = {
      wires: svg.querySelector('.layer-wires'),
      dots: svg.querySelector('.layer-dots'),
      parts: svg.querySelector('.layer-parts'),
      terms: svg.querySelector('.layer-terms'),
      ghost: svg.querySelector('.layer-ghost'),
    };

    this.handlers = {
      pointerdown: (e) => this.onDown(e),
      pointermove: (e) => this.onMove(e),
      pointerup: (e) => this.onUp(e),
      pointercancel: (e) => this.onUp(e, true),
      contextmenu: (e) => this.onContext(e),
      pointerleave: () => this.opts.onHover?.(null),
    };
    for (const [k, fn] of Object.entries(this.handlers)) svg.addEventListener(k, fn);

    // The board is always 640 units high and as wide as the screen allows.
    this.resizeObserver = new ResizeObserver(() => this.fit());
    this.resizeObserver.observe(svg);
    this.fit();
    this.render();
    this.raf = requestAnimationFrame((t) => this.animate(t));
  }

  fit() {
    const r = this.svg.getBoundingClientRect();
    const aspect = r.width && r.height ? r.width / r.height : WORLD.w / WORLD.h;
    const maxX = Math.max(0, ...this.circuit.parts.map((p) => p.x + 80));
    const w = Math.max(WORLD.w, Math.round(WORLD.h * aspect), maxX);
    if (w === this.world.w && this.svg.getAttribute('viewBox')) return;
    this.world.w = w;
    this.svg.setAttribute('viewBox', `0 0 ${w} ${WORLD.h}`);
    for (const el of this.svg.querySelectorAll('.board, .board-grid')) el.setAttribute('width', w);
    this.opts.onResize?.();
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    this.destroyed = true;
    for (const [k, fn] of Object.entries(this.handlers)) this.svg.removeEventListener(k, fn);
  }

  // ---------- Public actions ----------

  setCircuit(c, { resetHistory = false } = {}) {
    this.circuit = clone(c);
    this.fit();
    this.selection = null;
    this.pressed.clear();
    if (resetHistory) this.history = new History(this.circuit);
    else this.commit();
    this.render();
    this.opts.onSelect?.(null);
  }

  commit() {
    this.history.push(this.circuit);
  }

  undo() { this.circuit = this.history.undo(); this.afterHistory(); }
  redo() { this.circuit = this.history.redo(); this.afterHistory(); }
  afterHistory() {
    this.selection = null;
    this.cancelWire();
    this.render();
    this.opts.onSelect?.(null);
  }

  clear() {
    this.circuit = { parts: [], wires: [] };
    this.commit();
    this.select(null);
  }

  rotateSelected() {
    if (this.selection?.kind !== 'part') return;
    rotatePart(this.circuit, this.selection.id);
    this.commit();
    this.render();
  }

  /** Turn a battery or LED around: + and − swap, the wires stay. */
  flipSelected() {
    if (this.selection?.kind !== 'part') return;
    flipPart(this.circuit, this.selection.id);
    this.commit();
    this.render();
  }

  /** Replace a burnt-out lamp or LED by a new one. */
  repairSelected() {
    const p = this.selection?.kind === 'part' ? this.part(this.selection.id) : null;
    if (!p?.broken) return;
    delete p.broken;
    this.commit();
    this.render();
    this.opts.onSelect?.(this.selection);
  }

  deleteSelected() {
    const s = this.selection;
    if (!s) return;
    if (s.kind === 'part') removePart(this.circuit, s.id);
    else removeWire(this.circuit, s.id);
    this.commit();
    this.select(null);
  }

  /** Add a part with a click on the toolbox: a free spot near the middle. */
  addAtFreeSpot(key) {
    const pos = freeSpot(this.circuit, this.world);
    return this.add(key, pos.x, pos.y);
  }

  /** Drop a part dragged from the toolbox. Returns false outside the board. */
  dropAt(key, clientX, clientY) {
    const r = this.svg.getBoundingClientRect();
    if (clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom) return false;
    const w = this.toWorld(clientX, clientY);
    this.add(key, w.x, w.y);
    return true;
  }

  add(key, x, y) {
    const [type, variant] = key.split(':');
    const part = addPart(this.circuit, type, x, y, variant, this.world);
    this.commit();
    this.select({ kind: 'part', id: part.id });
    return part;
  }

  setDots(on) {
    this.showDots = on;
    if (!on) this.L.dots.innerHTML = '';
  }

  select(sel) {
    this.selection = sel;
    this.render();
    this.opts.onSelect?.(sel);
  }

  cancelWire() {
    if (this.mode?.kind === 'wire' || this.mode?.kind === 'wire-click') {
      this.mode = null;
      this.L.ghost.innerHTML = '';
      this.render();
      return true;
    }
    return false;
  }

  /** Client (screen) position just above the selection, for the action bar. */
  selectionAnchor() {
    const s = this.selection;
    if (!s) return null;
    let x, y;
    if (s.kind === 'part') {
      const p = this.part(s.id);
      if (!p) return null;
      x = p.x; y = p.y - 60;
    } else {
      const el = this.L.wires.querySelector(`[data-wire="${s.id}"] .wire`);
      if (!el) return null;
      const L = el.getTotalLength();
      const pt = el.getPointAtLength(L / 2);
      x = pt.x; y = pt.y - 24;
    }
    const m = this.svg.getScreenCTM();
    return { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f };
  }

  part(id) {
    return this.circuit.parts.find((p) => p.id === id);
  }

  // ---------- Pointer handling ----------

  toWorld(clientX, clientY) {
    const pt = this.svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    return pt.matrixTransform(this.svg.getScreenCTM().inverse());
  }

  nearestTerminal(w, exclude) {
    let best = null;
    let bestD = MAGNET;
    for (const p of this.circuit.parts) {
      for (const t of PARTS[p.type].terminals) {
        if (exclude && exclude.part === p.id && exclude.term === t.id) continue;
        const tp = terminalPos(p, t.id);
        const d = Math.hypot(tp.x - w.x, tp.y - w.y);
        if (d < bestD) { bestD = d; best = { part: p.id, term: t.id }; }
      }
    }
    return best;
  }

  onDown(e) {
    if (e.button === 2) return; // right click: handled by contextmenu
    this.opts.onHover?.(null);
    const w = this.toWorld(e.clientX, e.clientY);
    const termEl = e.target.closest('[data-term]');
    const partEl = e.target.closest('[data-part]');
    const wireEl = e.target.closest('[data-wire]');

    // Second click of a click-click wire.
    if (this.mode?.kind === 'wire-click') {
      const to = termEl ? { part: termEl.dataset.part, term: termEl.dataset.term } : this.nearestTerminal(w, this.mode.from);
      this.finishWire(to);
      return;
    }

    this.svg.setPointerCapture(e.pointerId);
    if (termEl) {
      this.mode = { kind: 'wire', from: { part: termEl.dataset.part, term: termEl.dataset.term }, start: w, moved: false };
      this.drawGhost(w);
      return;
    }
    if (partEl) {
      const p = this.part(partEl.dataset.part);
      this.mode = { kind: 'part', id: p.id, start: w, dx: p.x - w.x, dy: p.y - w.y, moved: false };
      if (p.type === 'button') {
        this.pressed.add(p.id);
        this.render();
      }
      return;
    }
    if (wireEl) {
      this.mode = null;
      this.select({ kind: 'wire', id: wireEl.dataset.wire });
      return;
    }
    this.mode = null;
    this.select(null);
  }

  onMove(e) {
    const w = this.toWorld(e.clientX, e.clientY);
    const m = this.mode;
    if (!m) {
      const partEl = e.target.closest('[data-part]');
      const termEl = e.target.closest('[data-term]');
      if (termEl) this.opts.onHover?.({ kind: 'term', part: this.part(termEl.dataset.part), term: termEl.dataset.term, x: e.clientX, y: e.clientY });
      else if (partEl) this.opts.onHover?.({ kind: 'part', part: this.part(partEl.dataset.part), x: e.clientX, y: e.clientY });
      else this.opts.onHover?.(null);
      return;
    }
    this.opts.onHover?.(null);
    if (m.kind === 'wire' || m.kind === 'wire-click') {
      if (Math.hypot(w.x - m.start.x, w.y - m.start.y) > DRAG_START) m.moved = true;
      this.drawGhost(w);
      return;
    }
    if (m.kind === 'part') {
      if (!m.moved && Math.hypot(w.x - m.start.x, w.y - m.start.y) < DRAG_START) return;
      if (!m.moved) {
        m.moved = true;
        if (this.pressed.delete(m.id)) this.render();
        this.svg.classList.add('is-dragging');
      }
      const p = this.part(m.id);
      const pos = clampPos(w.x + m.dx, w.y + m.dy, this.world.w, this.world.h);
      if (pos.x !== p.x || pos.y !== p.y) {
        p.x = pos.x;
        p.y = pos.y;
        this.render();
      }
    }
  }

  onUp(e, cancelled = false) {
    const m = this.mode;
    if (this.svg.hasPointerCapture?.(e.pointerId)) this.svg.releasePointerCapture(e.pointerId);
    this.svg.classList.remove('is-dragging');
    if (!m) return;
    const w = this.toWorld(e.clientX, e.clientY);
    if (m.kind === 'wire') {
      if (!m.moved && !cancelled) {
        // A click on a terminal: the next click finishes the wire.
        this.mode = { ...m, kind: 'wire-click' };
        return;
      }
      this.finishWire(cancelled ? null : this.nearestTerminal(w, m.from));
      return;
    }
    if (m.kind === 'part') {
      this.mode = null;
      const p = this.part(m.id);
      if (m.moved) {
        this.commit();
        this.select({ kind: 'part', id: m.id });
        return;
      }
      if (p.type === 'button') this.pressed.delete(p.id);
      // Double click (two clicks on the same part, close together) rotates.
      const now = performance.now();
      const dbl = this.lastClick && this.lastClick.id === p.id && now - this.lastClick.t < 420;
      this.lastClick = dbl ? null : { id: p.id, t: now };
      if (dbl && p.type !== 'switch' && p.type !== 'button' && !cancelled) {
        this.selection = { kind: 'part', id: p.id };
        this.rotateSelected();
        this.opts.onSelect?.(this.selection);
        return;
      }
      if (p.type === 'switch' && !cancelled) {
        p.on = !p.on;
        this.commit();
      }
      this.select({ kind: 'part', id: m.id });
    }
  }

  finishWire(to) {
    const from = this.mode?.from;
    this.mode = null;
    this.L.ghost.innerHTML = '';
    if (from && to) {
      const wire = addWire(this.circuit, from, to);
      if (wire) {
        wire.color = WIRE_COLORS[this.circuit.wires.length % WIRE_COLORS.length];
        this.commit();
        this.select({ kind: 'wire', id: wire.id });
        return;
      }
    }
    this.render();
  }

  onContext(e) {
    e.preventDefault();
    const partEl = e.target.closest('[data-part]');
    const wireEl = e.target.closest('[data-wire]');
    if (partEl) this.select({ kind: 'part', id: partEl.dataset.part });
    else if (wireEl) this.select({ kind: 'wire', id: wireEl.dataset.wire });
  }

  drawGhost(w) {
    const m = this.mode;
    const fromPart = this.part(m.from.part);
    const p1 = terminalPos(fromPart, m.from.term);
    const target = this.nearestTerminal(w, m.from);
    let p2 = { x: w.x, y: w.y };
    if (target) p2 = terminalPos(this.part(target.part), target.term);
    this.L.ghost.innerHTML = `<path class="wire-ghost" d="${wirePath(p1, p2)}"/>`;
    for (const el of this.L.terms.querySelectorAll('.term--target')) el.classList.remove('term--target');
    if (target) this.L.terms.querySelector(`[data-part="${target.part}"][data-term="${target.term}"]`)?.classList.add('term--target');
  }

  // ---------- Rendering ----------

  render() {
    if (this.destroyed) return;
    const c = this.circuit;
    let sim = simulate(c, { pressed: this.pressed });
    // Too much current: those lamps and LEDs burn out for good (until replaced).
    // A fuse melts first: it protects the battery and the wires.
    for (let round = 0; round < 3; round++) {
      const gone = sim.blown.length ? sim.blown : sim.overload;
      if (!gone.length) break;
      for (const id of gone) { const p = this.part(id); if (p) p.broken = true; }
      // Part of the same step: undo goes back to before the wire that burnt it.
      this.history.replace(c);
      this.opts.onBurn?.(gone);
      sim = simulate(c, { pressed: this.pressed });
    }
    this.sim = sim;
    const sel = this.selection;
    const byId = new Map(c.parts.map((p) => [p.id, p]));

    this.L.wires.innerHTML = c.wires
      .map((wr, i) => {
        const pa = byId.get(wr.a.part);
        const pb = byId.get(wr.b.part);
        if (!pa || !pb) return '';
        const d = wirePath(terminalPos(pa, wr.a.term), terminalPos(pb, wr.b.term));
        const st = sim.wires[wr.id];
        const cls = ['wire-g', sel?.kind === 'wire' && sel.id === wr.id ? 'is-selected' : '', st?.hot ? 'is-hot' : ''].join(' ');
        const color = wr.color || WIRE_COLORS[i % WIRE_COLORS.length];
        return `<g class="${cls}" data-wire="${wr.id}"><path class="wire-hit" d="${d}"/><path class="wire-sel" d="${d}"/><path class="wire" d="${d}" style="stroke:${color}"/></g>`;
      })
      .join('');

    this.L.parts.innerHTML = c.parts
      .map((p) => {
        const st = sim.parts[p.id];
        const cls = ['part', `part--${p.type}`, sel?.kind === 'part' && sel.id === p.id ? 'is-selected' : ''].join(' ');
        return `<g class="${cls}" data-part="${p.id}" transform="translate(${p.x} ${p.y}) rotate(${p.rot || 0})">
          <rect class="part-hit" x="-62" y="-46" width="124" height="86" rx="16"/>
          ${drawPart(p, st, { pressed: this.pressed.has(p.id) })}</g>`;
      })
      .join('');

    const wired = new Set();
    for (const wr of c.wires) { wired.add(`${wr.a.part}:${wr.a.term}`); wired.add(`${wr.b.part}:${wr.b.term}`); }
    const drawing = this.mode?.kind === 'wire' || this.mode?.kind === 'wire-click';
    this.L.terms.innerHTML = c.parts
      .flatMap((p) =>
        PARTS[p.type].terminals.map((t) => {
          const tp = terminalPos(p, t.id);
          const from = drawing && this.mode.from.part === p.id && this.mode.from.term === t.id;
          const cls = ['term', wired.has(`${p.id}:${t.id}`) ? 'is-wired' : '', from ? 'term--from' : '', drawing ? 'term--drawing' : ''].join(' ');
          return `<g class="${cls}" data-part="${p.id}" data-term="${t.id}" transform="translate(${tp.x} ${tp.y})">
            <circle class="term-hit" r="22"/><circle class="term-dot" r="9"/></g>`;
        })
      )
      .join('');

    this.opts.onChange?.(c, sim);
  }

  animate(t) {
    if (this.destroyed) return;
    const dt = Math.min(0.05, (t - (this.lastT || t)) / 1000);
    this.lastT = t;
    if (this.showDots && this.sim) {
      const out = [];
      for (const el of this.L.wires.querySelectorAll('[data-wire]')) {
        const id = el.dataset.wire;
        const I = this.sim.wires[id]?.current || 0;
        if (!I) continue;
        const path = el.querySelector('.wire');
        const L = path.getTotalLength();
        const ratio = Math.abs(I) / nominalCurrent(10);
        const speed = Math.min(320, Math.max(28, ratio * 70));
        const ph = ((this.phase.get(id) || 0) + speed * dt * Math.sign(I)) % 28;
        this.phase.set(id, ph);
        const n = Math.floor(L / 28);
        const hot = this.sim.wires[id].hot;
        for (let k = 0; k <= n; k++) {
          let s = k * 28 + ph;
          if (s < 0) s += 28;
          if (s > L) continue;
          const pt = path.getPointAtLength(s);
          out.push(`<circle class="dot${hot ? ' dot--hot' : ''}" cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="4.5"/>`);
        }
      }
      this.L.dots.innerHTML = out.join('');
    }
    this.raf = requestAnimationFrame((tt) => this.animate(tt));
  }
}
