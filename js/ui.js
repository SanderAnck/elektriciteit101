// Shared UI helpers: escaping, toast, modal dialogs, tooltip, file download.

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

let toastTimer = null;

export function showToast(message, action) {
  const el = document.getElementById('toast');
  clearTimeout(toastTimer);
  el.innerHTML = '';
  const text = document.createElement('span');
  text.textContent = message;
  el.append(text);
  if (action) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn--small';
    btn.textContent = action.label;
    btn.addEventListener('click', () => { el.hidden = true; action.onClick(); });
    el.append(btn);
  }
  el.hidden = false;
  toastTimer = setTimeout(() => (el.hidden = true), action ? 8000 : 2800);
}

/**
 * Modal dialog. actions: [{ label, value, kind: 'primary'|'danger'|'ghost' }].
 * Resolves with the chosen value (or null on Esc / backdrop).
 * onMount(dialogEl, close) lets the caller wire up custom content.
 */
export function modal({ title, body = '', actions = [{ label: 'OK', value: true, kind: 'primary' }], onMount, wide = false, icon = '' }) {
  return new Promise((resolve) => {
    const root = document.getElementById('modal-root');
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `
      <div class="modal${wide ? ' modal--wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        ${icon ? `<div class="modal__icon">${icon}</div>` : ''}
        <h2 class="modal__title" id="modal-title">${esc(title)}</h2>
        <div class="modal__body">${body}</div>
        <div class="modal__actions">${actions
          .map((a, i) => `<button type="button" class="btn ${a.kind ? `btn--${a.kind}` : ''}" data-i="${i}">${esc(a.label)}</button>`)
          .join('')}</div>
      </div>`;
    const prevFocus = document.activeElement;
    const close = (value) => {
      document.removeEventListener('keydown', onKey, true);
      wrap.remove();
      prevFocus?.focus?.();
      resolve(value);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(null); }
      if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
        e.preventDefault();
        const primary = actions.findIndex((a) => a.kind === 'primary');
        if (primary >= 0) wrap.querySelector(`[data-i="${primary}"]`).click();
      }
    };
    wrap.addEventListener('pointerdown', (e) => { if (e.target === wrap) close(null); });
    wrap.querySelectorAll('.modal__actions [data-i]').forEach((b) =>
      b.addEventListener('click', () => {
        const a = actions[b.dataset.i];
        const v = typeof a.value === 'function' ? a.value(wrap) : a.value;
        if (v !== undefined) close(v);
      })
    );
    document.addEventListener('keydown', onKey, true);
    root.append(wrap);
    onMount?.(wrap, close);
    (wrap.querySelector('input, [autofocus]') || wrap.querySelector('.btn--primary') || wrap.querySelector('.btn'))?.focus();
  });
}

export const confirmModal = (title, body, okLabel = 'Ja', kind = 'danger') =>
  modal({ title, body: `<p>${esc(body)}</p>`, actions: [{ label: 'Nee', value: false, kind: 'ghost' }, { label: okLabel, value: true, kind }] });

export async function promptModal(title, { label = '', value = '', okLabel = 'OK', type = 'text', placeholder = '' } = {}) {
  return modal({
    title,
    body: `<label class="field"><span class="field__label">${esc(label)}</span>
      <input class="input" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" maxlength="40" autocomplete="off"></label>`,
    actions: [
      { label: 'Annuleren', value: null, kind: 'ghost' },
      { label: okLabel, kind: 'primary', value: (w) => w.querySelector('input').value },
    ],
  });
}

// ---------- Tooltip ----------

let tipTimer = null;

export function showTip(html, x, y, delay = 450) {
  const el = document.getElementById('tooltip');
  clearTimeout(tipTimer);
  const show = () => {
    el.innerHTML = html;
    el.hidden = false;
    const r = el.getBoundingClientRect();
    let left = x + 16;
    let top = y + 18;
    if (left + r.width > innerWidth - 8) left = x - r.width - 12;
    if (top + r.height > innerHeight - 8) top = y - r.height - 12;
    el.style.left = `${Math.max(8, left)}px`;
    el.style.top = `${Math.max(8, top)}px`;
  };
  if (!el.hidden) show();
  else tipTimer = setTimeout(show, delay);
}

export function hideTip() {
  clearTimeout(tipTimer);
  document.getElementById('tooltip').hidden = true;
}

// ---------- Files ----------

export function downloadJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function pickJsonFile() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (!file) return resolve(null);
      try {
        resolve(JSON.parse(await file.text()));
      } catch {
        reject(new Error('Dit bestand kan niet gelezen worden.'));
      }
    });
    input.click();
  });
}

export const slug = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'schakeling';
