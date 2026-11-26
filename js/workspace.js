// The work screen shared by the sandbox and the lessons:
// toolbar on top, toolbox left, board in the middle, panel right.

import { Editor } from './circuit/editor.js';
import { PARTS, keyOf, keyName, keyInfo, partName, partInfo, MATERIALS } from './circuit/parts.js';
import { partIcon } from './circuit/draw.js';
import { esc, showTip, hideTip } from './ui.js';
import { setBuzzer, playClick } from './sound.js';

export const BASIC_KEYS = ['battery', 'lamp', 'led', 'buzzer', 'motor', 'switch', 'button', 'resistor'];
export const MATERIAL_KEYS = Object.keys(MATERIALS).map((m) => `material:${m}`);

const ICON = {
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  undo: '<svg viewBox="0 0 24 24"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>',
  redo: '<svg viewBox="0 0 24 24"><path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/></svg>',
  rotate: '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v5h-5"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  clear: '<svg viewBox="0 0 24 24"><path d="M3 21h18"/><path d="M7 17l-3-3 9-9 6 6-6 6z"/></svg>',
  dots: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="2.2"/><circle cx="12" cy="12" r="2.2"/><circle cx="19" cy="12" r="2.2"/></svg>',
  save: '<svg viewBox="0 0 24 24"><path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/></svg>',
  open: '<svg viewBox="0 0 24 24"><path d="M3 7V5h7l2 2h9v12H3z"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/></svg>',
  panel: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/></svg>',
};
export { ICON };

const LEVEL_TEXT = {
  lamp: { uit: 'Het lampje brandt niet.', zwak: 'Het lampje brandt zwak.', fel: 'Het lampje brandt fel.', heelfel: 'Het lampje brandt extra fel!' },
  led: { uit: 'De LED brandt niet.', zwak: 'De LED brandt zwak.', fel: 'De LED brandt.', heelfel: 'De LED brandt extra fel!' },
  buzzer: { uit: 'De zoemer is stil.', zwak: 'De zoemer zoemt zachtjes.', fel: 'De zoemer zoemt.', heelfel: 'De zoemer zoemt luid!' },
  motor: { uit: 'De motor staat stil.', zwak: 'De motor draait traag.', fel: 'De motor draait.', heelfel: 'De motor draait heel snel!' },
};

const REASON_TEXT = {
  open: 'De kring is niet gesloten.',
  overbrugd: 'Overbrugd: de stroom gaat door de draad ernaast, niet erdoor.',
  verkeerd: 'Verkeerd om! De + van de LED moet naar de + van de batterij.',
};

/** One sentence about what a part is doing right now. */
export function statusText(part, sim) {
  const st = sim?.parts[part.id];
  if (!st) return '';
  if (part.type === 'battery') return st.short ? '⚠ Kortsluiting! De batterij wordt heel warm.' : st.level === 'uit' ? 'Er loopt geen stroom.' : 'Er loopt stroom door de kring.';
  if (part.type === 'switch') return part.on ? 'De schakelaar staat aan: de kring is hier dicht.' : 'De schakelaar staat uit: de kring is hier open.';
  if (part.type === 'button') return 'Houd de muisknop ingedrukt om te drukken.';
  if (part.type === 'material') {
    const m = MATERIALS[part.variant];
    return st.level === 'uit' ? 'Er gaat nu geen stroom door.' : `Er gaat stroom door de ${m.name.toLowerCase()}!`;
  }
  if (part.type === 'resistor') return st.level === 'uit' ? 'Er gaat nu geen stroom door.' : 'De weerstand remt de stroom af.';
  const t = LEVEL_TEXT[part.type]?.[st.level] || '';
  const explain = st.level === 'uit' && REASON_TEXT[st.reason] && (sim.anyCurrent || st.reason === 'verkeerd');
  return explain ? `${t} ${REASON_TEXT[st.reason]}` : t;
}

/**
 * Mount the work screen in `root`.
 * opts: { toolbox: { key: max } | null (all, unlimited), circuit, settings,
 *         toolbarExtra: html, panelHtml: html, panelCollapsible, onChange(circuit, sim),
 *         onSelect(part|null, sim), onBack() }
 */
export function mountWorkspace(root, opts) {
  const limited = Boolean(opts.toolbox);
  const keys = limited ? Object.keys(opts.toolbox) : [...BASIC_KEYS, ...MATERIAL_KEYS];
  const basic = keys.filter((k) => !k.startsWith('material:'));
  const mats = keys.filter((k) => k.startsWith('material:'));

  const tile = (k) => `<button type="button" class="tool" data-key="${k}" aria-label="${esc(keyName(k))}">
      ${partIcon(k)}<span class="tool__name">${esc(keyName(k))}</span>${limited ? '<span class="tool__count"></span>' : ''}</button>`;

  root.innerHTML = `
    <div class="work${opts.settings.panelOpen === false && opts.panelCollapsible ? ' work--panel-closed' : ''}">
      <div class="work__bar">
        <button type="button" class="btn btn--back" data-act="back">${ICON.back}<span>Terug</span></button>
        <div class="bar-group">
          <button type="button" class="tbtn" data-act="undo" title="Ongedaan maken (Ctrl+Z)">${ICON.undo}<span>Ongedaan</span></button>
          <button type="button" class="tbtn" data-act="redo" title="Opnieuw (Ctrl+Y)">${ICON.redo}<span>Opnieuw</span></button>
        </div>
        <div class="bar-group">
          <button type="button" class="tbtn" data-act="rotate" title="Draaien (R)">${ICON.rotate}<span>Draai</span></button>
          <button type="button" class="tbtn" data-act="delete" title="Verwijderen (Delete)">${ICON.trash}<span>Verwijder</span></button>
          <button type="button" class="tbtn" data-act="clear" title="Alles wissen">${ICON.clear}<span>Alles wissen</span></button>
        </div>
        <div class="bar-group">
          <button type="button" class="tbtn tbtn--toggle" data-act="dots" aria-pressed="${opts.settings.dots !== false}" title="Toon de stroom als bolletjes">${ICON.dots}<span>Stroom zien</span></button>
        </div>
        <div class="bar-spacer"></div>
        ${opts.toolbarExtra || ''}
        ${opts.panelCollapsible ? `<button type="button" class="tbtn" data-act="panel" title="Zijpaneel tonen of verbergen">${ICON.panel}<span>Paneel</span></button>` : ''}
      </div>
      <aside class="toolbox" aria-label="Gereedschapskist">
        <h2 class="toolbox__title">Gereedschapskist</h2>
        ${basic.length ? `<div class="tools">${basic.map(tile).join('')}</div>` : ''}
        ${mats.length ? `<h3 class="toolbox__sub">Testmateriaal</h3><div class="tools">${mats.map(tile).join('')}</div>` : ''}
        <div class="tool-wire">
          <svg viewBox="0 0 48 24" aria-hidden="true"><circle cx="6" cy="12" r="5"/><path d="M10 12 C20 0 28 24 38 12"/><circle cx="42" cy="12" r="5"/></svg>
          <span><b>Draad</b>Sleep van bolletje naar bolletje.</span>
        </div>
      </aside>
      <div class="stage">
        <svg class="board-svg" role="img" aria-label="Werkblad met je schakeling"></svg>
        <div class="notices" aria-live="polite"></div>
        <div class="empty-hint" hidden>Sleep een onderdeel uit de gereedschapskist naar hier.</div>
        <div class="selbar" hidden>
          <span class="selbar__name"></span>
          <button type="button" class="sbtn" data-act="rotate" title="Draaien (R)">${ICON.rotate}<span>Draai</span></button>
          <button type="button" class="sbtn sbtn--danger" data-act="delete" title="Verwijderen (Delete)">${ICON.trash}<span>Verwijder</span></button>
        </div>
      </div>
      <aside class="panel">${opts.panelHtml || ''}</aside>
    </div>`;

  const els = {
    work: root.querySelector('.work'),
    svg: root.querySelector('.board-svg'),
    notices: root.querySelector('.notices'),
    empty: root.querySelector('.empty-hint'),
    selbar: root.querySelector('.selbar'),
    panel: root.querySelector('.panel'),
    stage: root.querySelector('.stage'),
  };

  const ws = { root, els, editor: null, sim: null, destroy };
  let lastNotice = '';

  const countOf = (k) => ws.editor ? ws.editor.circuit.parts.filter((p) => keyOf(p) === k).length : 0;
  const canAdd = (k) => !limited || countOf(k) < opts.toolbox[k];

  function updateToolbox() {
    for (const b of root.querySelectorAll('.tool')) {
      const k = b.dataset.key;
      if (limited) {
        const left = opts.toolbox[k] - countOf(k);
        b.querySelector('.tool__count').textContent = `×${Math.max(0, left)}`;
        b.disabled = left <= 0;
      }
    }
  }

  function updateBar() {
    const e = ws.editor;
    const sel = e.selection;
    root.querySelector('.work__bar [data-act="undo"]').disabled = !e.history.canUndo();
    root.querySelector('.work__bar [data-act="redo"]').disabled = !e.history.canRedo();
    root.querySelector('.work__bar [data-act="rotate"]').disabled = sel?.kind !== 'part';
    root.querySelector('.work__bar [data-act="delete"]').disabled = !sel;
    root.querySelector('.work__bar [data-act="clear"]').disabled = !e.circuit.parts.length;
    // Action bar for the selection, at a fixed spot so it never covers a terminal.
    const part = sel?.kind === 'part' ? e.part(sel.id) : null;
    if (!sel || (sel.kind === 'part' && !part)) { els.selbar.hidden = true; return; }
    els.selbar.hidden = false;
    els.selbar.querySelector('.selbar__name').textContent = part ? partName(part) : 'Draad';
    els.selbar.querySelector('[data-act="rotate"]').hidden = sel.kind !== 'part';
  }

  function updateNotices(c, sim) {
    const n = [];
    if (sim.short) {
      n.push(`<div class="notice notice--bad"><span class="notice__icon" aria-hidden="true">⚠</span><div><b>Kortsluiting!</b> De stroom gaat rechtstreeks van + naar −, zonder lampje of zoemer erop. In het echt worden de batterij en de draden heel heet: gevaarlijk, er kan brand ontstaan! Haal die draad weg.</div></div>`);
    }
    if (c.parts.some((p) => p.type === 'led' && sim.parts[p.id]?.reason === 'verkeerd')) {
      n.push(`<div class="notice notice--warn"><span class="notice__icon" aria-hidden="true">±</span><div><b>De LED staat verkeerd om.</b> Een LED werkt maar in één richting. Draai hem om: de + van de LED naar de + van de batterij.</div></div>`);
    }
    if (!sim.short && sim.anyCurrent && c.parts.some((p) => PARTS[p.type].load && sim.parts[p.id]?.reason === 'overbrugd')) {
      n.push(`<div class="notice notice--info"><span class="notice__icon" aria-hidden="true">↪</span><div><b>Overbrugd.</b> Een draad loopt rond een onderdeel. De stroom neemt die makkelijke weg en gaat er niet door. Daarom werkt het niet.</div></div>`);
    }
    const html = n.join('');
    if (html !== lastNotice) { els.notices.innerHTML = html; lastNotice = html; }
    els.empty.hidden = c.parts.length > 0;
  }

  function buzzLevel(c, sim) {
    let lv = 0;
    for (const p of c.parts) {
      if (p.type !== 'buzzer') continue;
      lv = Math.max(lv, { uit: 0, zwak: 1, fel: 2, heelfel: 3 }[sim.parts[p.id]?.level] || 0);
    }
    setBuzzer(lv);
  }

  ws.editor = new Editor(els.svg, {
    circuit: opts.circuit,
    showDots: opts.settings.dots !== false,
    onResize: () => ws.editor && updateBar(),
    onChange: (c, sim) => {
      ws.sim = sim;
      if (!ws.editor) return;
      updateToolbox();
      updateBar();
      updateNotices(c, sim);
      buzzLevel(c, sim);
      opts.onChange?.(c, sim);
    },
    onSelect: (sel) => {
      updateBar();
      const p = sel?.kind === 'part' ? ws.editor.part(sel.id) : null;
      opts.onSelect?.(p, ws.sim);
    },
    onHover: (h) => {
      if (!h) return hideTip();
      if (h.kind === 'term') {
        const t = PARTS[h.part.type].terminals.find((tt) => tt.id === h.term);
        const lbl = t.label ? ` <b>${t.label}</b>` : '';
        return showTip(`<div class="tip__title">Aansluitpunt${lbl}</div><div>Sleep hiervandaan een draad naar een ander bolletje.</div>`, h.x, h.y, 300);
      }
      showTip(`<div class="tip__title">${esc(partName(h.part))}</div><div>${esc(partInfo(h.part))}</div><div class="tip__status">${esc(statusText(h.part, ws.sim))}</div>`, h.x, h.y);
    },
  });
  // First render happened inside the constructor before ws.editor was set.
  ws.editor.render();

  // ---------- Toolbar ----------
  root.querySelector('.work').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    const act = b.dataset.act;
    const ed = ws.editor;
    if (act === 'back') opts.onBack?.();
    if (act === 'undo') ed.undo();
    if (act === 'redo') ed.redo();
    if (act === 'rotate') ed.rotateSelected();
    if (act === 'delete') ed.deleteSelected();
    if (act === 'clear') opts.onClear ? opts.onClear() : ed.clear();
    if (act === 'dots') {
      const on = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', String(on));
      ed.setDots(on);
      opts.onSetting?.({ dots: on });
    }
    if (act === 'panel') {
      els.work.classList.toggle('work--panel-closed');
      opts.onSetting?.({ panelOpen: !els.work.classList.contains('work--panel-closed') });
      requestAnimationFrame(updateBar);
    }
    opts.onAction?.(act, b);
  });

  // ---------- Toolbox: drag or click ----------
  let drag = null;
  for (const b of root.querySelectorAll('.tool')) {
    b.addEventListener('pointerdown', (e) => {
      if (b.disabled || e.button !== 0) return;
      e.preventDefault();
      b.setPointerCapture(e.pointerId);
      drag = { key: b.dataset.key, x: e.clientX, y: e.clientY, ghost: null, btn: b };
    });
    b.addEventListener('pointermove', (e) => {
      if (!drag || drag.btn !== b) return;
      if (!drag.ghost && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6) {
        drag.ghost = document.createElement('div');
        drag.ghost.className = 'drag-ghost';
        drag.ghost.innerHTML = partIcon(drag.key);
        document.body.append(drag.ghost);
        hideTip();
      }
      if (drag.ghost) {
        drag.ghost.style.left = `${e.clientX}px`;
        drag.ghost.style.top = `${e.clientY}px`;
        drag.ghost.classList.toggle('is-over', isOverBoard(e));
      }
    });
    const end = (e, cancel) => {
      if (!drag || drag.btn !== b) return;
      const d = drag;
      drag = null;
      d.ghost?.remove();
      if (cancel || !canAdd(d.key)) return;
      if (d.ghost) {
        if (ws.editor.dropAt(d.key, e.clientX, e.clientY)) playClick();
      } else {
        ws.editor.addAtFreeSpot(d.key);
        playClick();
      }
    };
    b.addEventListener('pointerup', (e) => end(e, false));
    b.addEventListener('pointercancel', (e) => end(e, true));
    b.addEventListener('mouseenter', (e) => showTip(`<div class="tip__title">${esc(keyName(b.dataset.key))}</div><div>${esc(keyInfo(b.dataset.key))}</div><div class="tip__status">Sleep me naar het werkblad, of klik.</div>`, e.clientX, e.clientY));
    b.addEventListener('mouseleave', hideTip);
  }
  const isOverBoard = (e) => {
    const r = els.svg.getBoundingClientRect();
    return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  };

  // ---------- Keyboard shortcuts ----------
  const onKey = (e) => {
    if (document.querySelector('.modal-backdrop')) return;
    if (e.target.closest?.('input, textarea, select')) return;
    const ed = ws.editor;
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === 'z' && !e.shiftKey) { e.preventDefault(); ed.undo(); }
    else if ((e.ctrlKey || e.metaKey) && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); ed.redo(); }
    else if (k === 'r' && !e.ctrlKey && !e.metaKey) ed.rotateSelected();
    else if (k === 'delete' || k === 'backspace') { e.preventDefault(); ed.deleteSelected(); }
    else if (k === 'escape') { if (!ed.cancelWire()) ed.select(null); }
  };
  document.addEventListener('keydown', onKey);
  const onResize = () => updateBar();
  window.addEventListener('resize', onResize);

  function destroy() {
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', onResize);
    ws.editor.destroy();
    setBuzzer(0);
    hideTip();
  }

  return ws;
}
