// Screens. Each view: { title, nav, needsProfile, work, mount(page, ctx) -> cleanup? }

import { esc, modal, confirmModal, promptModal, showToast, downloadJson, pickJsonFile, slug } from './ui.js';
import { db } from './db.js';
import {
  getSettings, saveSettings, listProfiles, createProfile, deleteProfile, getProgress, saveLessonResult, resetProgress,
  isUnlocked, totals, getDraft, saveDraft, deleteDraft, listCircuits, saveCircuit, PROFILE_ICONS, reloadSettings,
} from './store.js';
import { LESSONS, lessonById } from './lessons/lessons.js';
import { checkStep, starsFor } from './lessons/checks.js';
import { mountWorkspace, statusText, ICON } from './workspace.js';
import { partIcon } from './circuit/draw.js';
import { partName, partInfo, keyOf } from './circuit/parts.js';
import { explainHtml } from './circuit/explain.js';
import { sanitize, emptyCircuit, clone } from './circuit/model.js';
import { playSuccess, playOops, playClick } from './sound.js';
import { isConnected, testConnection, syncNow, fetchOverview, linkFor, parseLink, scheduleSync, listRemoteProfiles, importRemoteProfile, pullProgress } from './cloud.js';

// Navigate; re-render when we are already on that address.
const go = (hash) => {
  if (location.hash === hash) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = hash;
};
const starsHtml = (n, max = 3) =>
  `<span class="stars" aria-label="${n} van ${max} sterren">${Array.from({ length: max }, (_, i) => `<span class="star${i < n ? ' is-on' : ''}">★</span>`).join('')}</span>`;

// ---------- Profiles ----------

async function newProfileDialog() {
  let icon = PROFILE_ICONS[Math.floor(Math.random() * PROFILE_ICONS.length)];
  const res = await modal({
    title: 'Nieuw profiel',
    body: `<label class="field"><span class="field__label">Je voornaam of bijnaam</span>
        <input class="input" maxlength="20" autocomplete="off" placeholder="bv. Lotte"></label>
      <div class="field__label">Kies een icoontje</div>
      <div class="icon-pick">${PROFILE_ICONS.map((i) => `<button type="button" class="icon-pick__btn${i === icon ? ' is-on' : ''}" data-icon="${i}">${i}</button>`).join('')}</div>
      <p class="field__error" hidden>Vul een naam in.</p>`,
    actions: [
      { label: 'Annuleren', value: null, kind: 'ghost' },
      {
        label: 'Maak profiel', kind: 'primary',
        value: (w) => {
          const name = w.querySelector('input').value.trim();
          if (!name) { w.querySelector('.field__error').hidden = false; return undefined; }
          return { name, icon };
        },
      },
    ],
    onMount: (w) => {
      w.querySelector('.icon-pick').addEventListener('click', (e) => {
        const b = e.target.closest('[data-icon]');
        if (!b) return;
        icon = b.dataset.icon;
        w.querySelectorAll('.icon-pick__btn').forEach((x) => x.classList.toggle('is-on', x === b));
      });
    },
  });
  if (!res) return null;
  return createProfile(res.name, res.icon);
}

async function profilePicker(page, ctx, { title = 'Wie ben jij?' } = {}) {
  const profiles = await listProfiles();
  page.innerHTML = `
    <div class="center-page">
      <h1 class="hero-title">${esc(title)}</h1>
      <p class="hero-sub">Kies je profiel, zo bewaar je je eigen sterren en schakelingen.</p>
      <div class="profiles">
        ${profiles.map((p) => `<button type="button" class="profile-tile${ctx.profile?.id === p.id ? ' is-current' : ''}" data-id="${p.id}">
            <span class="profile-tile__icon">${esc(p.icon)}</span><span class="profile-tile__name">${esc(p.name)}</span></button>`).join('')}
        <button type="button" class="profile-tile profile-tile--new" data-new><span class="profile-tile__icon">＋</span><span class="profile-tile__name">Nieuw profiel</span></button>
      </div>
      ${isConnected(ctx.settings) ? '<button type="button" class="btn btn--ghost find-profile" data-find>🔎 Mijn profiel staat op een ander toestel</button>' : ''}
    </div>`;
  page.querySelector('.profiles').addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.new !== undefined) {
      const p = await newProfileDialog();
      if (p) go('#/start');
      return;
    }
    await saveSettings({ currentProfile: b.dataset.id });
    playClick();
    pullProgress(b.dataset.id, { force: true }).finally(() => go('#/start'));
  });
  page.querySelector('[data-find]')?.addEventListener('click', () => findRemoteProfile(profiles));
}

/** Pick a profile that was made on another (connected) device. */
async function findRemoteProfile(localProfiles) {
  let remote;
  showToast('Profielen ophalen…');
  try {
    remote = await listRemoteProfiles();
  } catch (err) {
    return showToast(err.message || 'Geen verbinding.');
  }
  const local = new Set(localProfiles.map((p) => p.id));
  const others = remote.filter((p) => !local.has(p.id)).sort((a, b) => String(a.name).localeCompare(String(b.name), 'nl'));
  const id = await modal({
    title: 'Zoek je profiel',
    wide: true,
    body: others.length
      ? `<p class="muted">Klik op je naam. Je sterren komen mee naar dit toestel.</p>
         <div class="profiles profiles--remote">${others.map((p) => `<button type="button" class="profile-tile" data-remote="${esc(p.id)}">
           <span class="profile-tile__icon">${esc(p.icon)}</span><span class="profile-tile__name">${esc(p.name)}</span>
           <span class="profile-tile__meta">★ ${Number(p.stars) || 0}${p.lastDevice ? ` · ${esc(p.lastDevice)}` : ''}</span></button>`).join('')}</div>`
      : '<p class="muted">Er zijn geen andere profielen gevonden. Is je profiel al eens verstuurd vanaf het andere toestel?</p>',
    actions: [{ label: 'Annuleren', value: null, kind: 'ghost' }],
    onMount: (w, close) => w.querySelector('.modal__body').addEventListener('click', (e) => {
      const t = e.target.closest('[data-remote]');
      if (t) close(t.dataset.remote);
    }),
  });
  if (!id) return;
  try {
    const p = await importRemoteProfile(id);
    showToast(`Welkom terug, ${p.name}!`);
    go('#/start');
  } catch (err) {
    showToast(err.message || 'Ophalen lukte niet.');
  }
}

// ---------- Start ----------

const start = {
  title: 'Start',
  nav: 'start',
  async mount(page, ctx) {
    if (!ctx.profile) return profilePicker(page, ctx, { title: 'Welkom bij Stroomkringen!' });
    const t = totals(ctx.progress);
    page.innerHTML = `
      <div class="center-page">
        <h1 class="hero-title">Hoi ${esc(ctx.profile.name)} <span class="hero-icon">${esc(ctx.profile.icon)}</span></h1>
        <p class="hero-sub">Wat wil je doen? <a href="#/profielen" class="link">Niet ${esc(ctx.profile.name)}? Kies je profiel.</a></p>
        <div class="choices">
          <a class="choice choice--sandbox" href="#/zandbak">
            <div class="choice__art">${partIcon('battery')}${partIcon('lamp', { on: true })}${partIcon('motor')}</div>
            <div class="choice__title">Zandbak</div>
            <div class="choice__text">Bouw vrij met alle onderdelen. Probeer alles uit!</div>
          </a>
          <a class="choice choice--lessons" href="#/opdrachten">
            <div class="choice__art">${partIcon('switch', { on: true })}${partIcon('buzzer')}${partIcon('led', { on: true })}</div>
            <div class="choice__title">Opdrachten</div>
            <div class="choice__text">${LESSONS.length} lessen van makkelijk naar moeilijk.</div>
            <div class="choice__meta">${t.done} van ${t.max} lessen · <span class="star is-on">★</span> ${t.stars}</div>
          </a>
        </div>
      </div>`;
  },
};

const profielen = {
  title: 'Profielen',
  nav: 'start',
  mount: (page, ctx) => profilePicker(page, ctx),
};

// ---------- Sandbox ----------

function sandboxPanel(part, sim) {
  if (!part) {
    return `<div class="panel__section">
        <h2 class="panel__title">Zandbak</h2>
        <p class="panel__text">Bouw wat je wil. Probeer eens:</p>
        <ul class="idea-list">
          <li>Twee lampjes achter elkaar, en daarna naast elkaar.</li>
          <li>Twee batterijen achter elkaar: brandt het lampje feller?</li>
          <li>Een lampje op de blokbatterij. Oei! Hoe red je het?</li>
          <li>Een motor: wat gebeurt er als je de batterij omdraait?</li>
          <li>Welke materialen laten de stroom door?</li>
        </ul>
      </div>
      <div class="panel__section panel__section--tips">
        <h3 class="panel__sub">Zo werkt het</h3>
        <ul class="how-list">
          <li><b>Slepen</b> uit de gereedschapskist, of klikken.</li>
          <li><b>Draad:</b> sleep van bolletje naar bolletje.</li>
          <li><b>Klik</b> op een onderdeel voor uitleg.</li>
          <li><b>Dubbelklik</b> of <kbd>R</kbd> om te draaien.</li>
        </ul>
      </div>`;
  }
  return `<div class="panel__section">
      <div class="panel__part">${partIcon(keyOf(part), { on: sim?.parts[part.id]?.level !== 'uit' && part.type !== 'battery' })}</div>
      <h2 class="panel__title">${esc(partName(part))}</h2>
      <p class="panel__text">${esc(partInfo(part))}</p>
      ${explainHtml(part, sim, esc)}
    </div>`;
}

const zandbak = {
  title: 'Zandbak',
  nav: 'zandbak',
  needsProfile: true,
  work: true,
  async mount(page, ctx) {
    const draft = await getDraft(ctx.profile.id, 'zandbak');
    let selected = null;
    let saveTimer = null;
    const ws = mountWorkspace(page, {
      toolbox: null,
      circuit: sanitize(draft || emptyCircuit()),
      settings: ctx.settings,
      panelCollapsible: true,
      panelHtml: sandboxPanel(null),
      toolbarExtra: `<div class="bar-group">
          <button type="button" class="tbtn" data-act="save" title="Opslaan">${ICON.save}<span>Opslaan</span></button>
          <button type="button" class="tbtn" data-act="open" title="Openen">${ICON.open}<span>Openen</span></button></div>`,
      onBack: () => go('#/start'),
      onSetting: (patch) => saveSettings(patch),
      onChange: (c, sim) => {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => saveDraft(ctx.profile.id, 'zandbak', c), 400);
        if (selected) {
          selected = c.parts.find((p) => p.id === selected.id) || null;
          ws && (ws.els.panel.innerHTML = sandboxPanel(selected, sim));
        }
      },
      onSelect: (part, sim) => {
        selected = part;
        ws.els.panel.innerHTML = sandboxPanel(part, sim);
      },
      onClear: async () => {
        if (await confirmModal('Alles wissen?', 'Je hele schakeling verdwijnt van het werkblad.', 'Wis alles')) ws.editor.clear();
      },
      onAction: async (act) => {
        if (act === 'save') saveDialog();
        if (act === 'open') openDialog();
      },
    });

    async function saveDialog() {
      if (!ws.editor.circuit.parts.length) return showToast('Je werkblad is nog leeg.');
      const name = await promptModal('Schakeling opslaan', { label: 'Geef je schakeling een naam', placeholder: 'bv. Mijn deurbel', okLabel: 'Opslaan' });
      if (name === null) return;
      await saveCircuit(ctx.profile.id, name, clone(ws.editor.circuit));
      showToast('Opgeslagen!');
    }

    async function openDialog() {
      const list = await listCircuits(ctx.profile.id);
      const row = (c) => `<li class="saved"><span class="saved__name">${esc(c.name)}</span>
          <span class="saved__date">${new Date(c.savedAt).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })}</span>
          <button type="button" class="btn btn--small btn--primary" data-open="${c.id}">Openen</button>
          <button type="button" class="btn btn--small btn--ghost" data-export="${c.id}" title="Als bestand bewaren">Bestand</button>
          <button type="button" class="btn btn--small btn--ghost btn--icon" data-del="${c.id}" title="Verwijderen" aria-label="Verwijderen">${ICON.trash}</button></li>`;
      await modal({
        title: 'Schakeling openen',
        wide: true,
        body: list.length ? `<ul class="saved-list">${list.map(row).join('')}</ul>` : '<p class="muted">Je hebt nog niets opgeslagen.</p>',
        actions: [
          { label: 'Bestand importeren', kind: 'ghost', value: 'import' },
          { label: 'Huidige als bestand', kind: 'ghost', value: 'export' },
          { label: 'Sluiten', kind: 'primary', value: null },
        ],
        onMount: (w, close) => {
          w.querySelector('.modal__body').addEventListener('click', async (e) => {
            const b = e.target.closest('button');
            if (!b) return;
            const c = list.find((x) => x.id === (b.dataset.open || b.dataset.export || b.dataset.del));
            if (b.dataset.open) {
              ws.editor.setCircuit(sanitize(c.data));
              close(null);
              showToast(`“${c.name}” geopend.`);
            } else if (b.dataset.export) {
              downloadJson({ app: 'stroomkringen', kind: 'circuit', name: c.name, data: c.data }, `${slug(c.name)}.json`);
            } else if (b.dataset.del) {
              close(null);
              if (await confirmModal('Verwijderen?', `“${c.name}” wordt verwijderd.`, 'Verwijder')) await db.delete('circuits', c.id);
              openDialog();
            }
          });
        },
      }).then(async (v) => {
        if (v === 'export') {
          downloadJson({ app: 'stroomkringen', kind: 'circuit', name: 'Mijn schakeling', data: ws.editor.circuit }, 'schakeling.json');
        } else if (v === 'import') {
          try {
            const f = await pickJsonFile();
            if (!f) return;
            if (f.app !== 'stroomkringen' || f.kind !== 'circuit') throw new Error('Dit is geen schakeling van Stroomkringen.');
            ws.editor.setCircuit(sanitize(f.data));
            await saveCircuit(ctx.profile.id, f.name || 'Geïmporteerd', sanitize(f.data));
            showToast('Schakeling geïmporteerd en opgeslagen.');
          } catch (err) {
            showToast(err.message);
          }
        }
      });
    }

    return () => {
      clearTimeout(saveTimer);
      saveDraft(ctx.profile.id, 'zandbak', ws.editor.circuit);
      ws.destroy();
    };
  },
};

// ---------- Lessons overview ----------

const opdrachten = {
  title: 'Opdrachten',
  nav: 'opdrachten',
  needsProfile: true,
  async mount(page, ctx) {
    const t = totals(ctx.progress);
    page.innerHTML = `
      <div class="lessons-page">
        <div class="lessons-head">
          <h1 class="page-title">Opdrachten</h1>
          <div class="lessons-total">${t.done} van ${t.max} lessen · <span class="star is-on">★</span> ${t.stars} van ${t.max * 3}</div>
        </div>
        <div class="lesson-grid">
          ${LESSONS.map((l, i) => {
            const rec = ctx.progress[l.id];
            const open = isUnlocked(l.id, ctx.progress, ctx.settings);
            const next = open && !rec?.done && (i === 0 || ctx.progress[LESSONS[i - 1].id]?.done || ctx.settings.unlockAll);
            return `<a class="lesson-card${open ? '' : ' is-locked'}${rec?.done ? ' is-done' : ''}${next ? ' is-next' : ''}" ${open ? `href="#/les/${l.id}"` : 'aria-disabled="true"'}>
                <span class="lesson-card__num">${l.id}</span>
                <span class="lesson-card__art">${partIcon(l.icon, { on: Boolean(rec?.done) })}</span>
                <span class="lesson-card__title">${esc(l.title)}</span>
                <span class="lesson-card__foot">${open ? (rec?.done ? starsHtml(rec.stars) : next ? '<span class="tag tag--accent">Start</span>' : starsHtml(0)) : `<span class="lock">🔒 Eerst les ${LESSONS[i - 1].id}</span>`}</span>
              </a>`;
          }).join('')}
        </div>
      </div>`;
    page.querySelector('.lesson-grid').addEventListener('click', (e) => {
      if (e.target.closest('.is-locked')) showToast('Deze les komt vrij als je de vorige les af hebt.');
    });
  },
};

// ---------- One lesson ----------

function questionHtml(q, i, answers) {
  if (q.type === 'sort') {
    const a = answers[i] || {};
    return `<div class="question" data-q="${i}">
        <div class="question__q">${esc(q.q)}</div>
        <div class="sort">${q.items.map((it) => `<div class="sort__row">
            <span class="sort__icon">${partIcon(`material:${it.key}`)}</span><span class="sort__label">${esc(it.label)}</span>
            ${q.categories.map((c) => `<button type="button" class="chip${a[it.key] === c.key ? ' is-on' : ''}" data-sort="${it.key}" data-cat="${c.key}">${esc(c.label)}</button>`).join('')}
          </div>`).join('')}</div></div>`;
  }
  return `<div class="question" data-q="${i}">
      <div class="question__q">${esc(q.q)}</div>
      <div class="options">${q.options.map((o, j) => `<button type="button" class="chip${answers[i] === j ? ' is-on' : ''}" data-opt="${j}">${esc(o)}</button>`).join('')}</div>
    </div>`;
}

const les = {
  title: 'Les',
  nav: 'opdrachten',
  needsProfile: true,
  work: true,
  async mount(page, ctx) {
    const lesson = lessonById(ctx.param);
    if (!lesson) return go('#/opdrachten');
    if (!isUnlocked(lesson.id, ctx.progress, ctx.settings)) {
      showToast('Deze les is nog op slot.');
      return go('#/opdrachten');
    }
    document.title = `Les ${lesson.id}: ${lesson.title} · Stroomkringen`;
    const place = `les${lesson.id}`;
    const draft = await getDraft(ctx.profile.id, place);
    const state = { step: draft?.step || 0, fails: draft?.fails || 0, hints: 0, shownHints: draft?.shownHints || 0, totalHints: draft?.totalHints || 0, answers: draft?.answers || {}, feedback: null };
    const startCircuit = () => sanitize(lesson.start ? clone(lesson.start) : emptyCircuit());
    let saveTimer = null;
    let ws = null;
    let selectedId = null;
    let lastExplain = '';
    const selectedPart = () => (selectedId && ws?.editor.part(selectedId)) || null;
    const persist = () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        if (ws) saveDraft(ctx.profile.id, place, { circuit: ws.editor.circuit, step: state.step, fails: state.fails, shownHints: state.shownHints, totalHints: state.totalHints, answers: state.answers });
      }, 400);
    };

    const panel = () => {
      const step = lesson.steps[state.step];
      const qs = step.questions || [];
      const hintsLeft = step.hints.length - state.shownHints;
      return `
        <div class="panel__section lesson-panel">
          <div class="lesson-panel__eyebrow">Les ${lesson.id}${lesson.steps.length > 1 ? ` · stap ${state.step + 1} van ${lesson.steps.length}` : ''}</div>
          <h2 class="panel__title">${esc(lesson.title)}</h2>
          <div class="goal"><span class="goal__icon" aria-hidden="true">🎯</span><div><div class="goal__label">Doel</div>${esc(step.goal)}</div></div>
          ${qs.map((q, i) => questionHtml(q, i, state.answers)).join('')}
          ${state.feedback ? `<div class="feedback feedback--${state.feedback.ok ? 'good' : 'bad'}" role="status"><span aria-hidden="true">${state.feedback.ok ? '✔' : '✖'}</span> ${esc(state.feedback.message)}</div>` : ''}
          ${state.shownHints ? `<ol class="hints">${step.hints.slice(0, state.shownHints).map((h) => `<li>${esc(h)}</li>`).join('')}</ol>` : ''}
          ${selectedPart() ? `<div class="lesson-explain"><h3 class="panel__sub">${esc(partName(selectedPart()))}</h3>${explainHtml(selectedPart(), ws.sim, esc)}</div>` : '<p class="lesson-tip">Tip: klik op een onderdeel om te zien waarom het werkt of niet werkt.</p>'}
        </div>
        <div class="lesson-panel__actions">
          <button type="button" class="btn btn--ghost" data-hint ${hintsLeft ? '' : 'disabled'}>💡 Hint${hintsLeft ? ` (${hintsLeft})` : ''}</button>
          <button type="button" class="btn btn--primary btn--big" data-check>Controleer</button>
        </div>`;
    };
    const renderPanel = () => {
      const scroll = ws.els.panel.scrollTop;
      ws.els.panel.innerHTML = panel();
      ws.els.panel.scrollTop = scroll;
      const sel = selectedPart();
      lastExplain = sel ? explainHtml(sel, ws.sim, esc) : '';
    };

    ws = mountWorkspace(page, {
      toolbox: lesson.toolbox,
      circuit: sanitize(draft?.circuit || startCircuit()),
      settings: ctx.settings,
      panelCollapsible: false,
      panelHtml: '',
      toolbarExtra: `<div class="bar-group"><button type="button" class="tbtn" data-act="intro" title="Uitleg van de les">${ICON.info}<span>Uitleg</span></button></div>`,
      onBack: () => go('#/opdrachten'),
      onSetting: (patch) => saveSettings(patch),
      onChange: () => {
        if (!ws) return;
        const sel = selectedPart();
        const key = sel ? explainHtml(sel, ws.sim, esc) : '';
        if ((state.feedback && !state.feedback.ok) || key !== lastExplain) {
          if (state.feedback && !state.feedback.ok) state.feedback = null;
          renderPanel();
        }
        persist();
      },
      onSelect: (part) => { selectedId = part?.id || null; renderPanel(); },
      onClear: async () => {
        if (await confirmModal('Opnieuw beginnen?', 'Je schakeling verdwijnt en je begint deze stap opnieuw.', 'Begin opnieuw')) ws.editor.setCircuit(startCircuit());
      },
      onAction: (act) => { if (act === 'intro') intro(); },
    });
    renderPanel();

    ws.els.panel.addEventListener('click', async (e) => {
      const opt = e.target.closest('[data-opt]');
      const sort = e.target.closest('[data-sort]');
      const step = lesson.steps[state.step];
      if (opt) {
        state.answers[opt.closest('[data-q]').dataset.q] = Number(opt.dataset.opt);
        state.feedback = null;
        renderPanel(); persist();
      } else if (sort) {
        const qi = sort.closest('[data-q]').dataset.q;
        state.answers[qi] = { ...(state.answers[qi] || {}), [sort.dataset.sort]: sort.dataset.cat };
        state.feedback = null;
        renderPanel(); persist();
      } else if (e.target.closest('[data-hint]')) {
        if (state.shownHints < step.hints.length) { state.shownHints++; state.totalHints++; }
        renderPanel(); persist();
      } else if (e.target.closest('[data-check]')) {
        const res = checkStep(ws.editor.circuit, step, state.answers);
        state.feedback = res;
        if (!res.ok) {
          state.fails++;
          playOops();
          renderPanel(); persist();
          return;
        }
        if (state.step < lesson.steps.length - 1) {
          playSuccess();
          await modal({ title: 'Goed zo!', icon: '✔', body: `<p>${esc(res.message)}</p><p class="muted">Op naar stap ${state.step + 2}.</p>`, actions: [{ label: 'Volgende stap', value: true, kind: 'primary' }] });
          state.step++;
          state.shownHints = 0;
          state.feedback = null;
          renderPanel(); persist();
          return;
        }
        await finish();
      }
    });

    async function finish() {
      const stars = starsFor(state.fails, state.totalHints);
      await saveLessonResult(ctx.profile.id, lesson.id, { stars, fails: state.fails, hints: state.totalHints });
      clearTimeout(saveTimer);
      await deleteDraft(ctx.profile.id, place);
      playSuccess();
      const next = LESSONS[LESSONS.findIndex((l) => l.id === lesson.id) + 1];
      const v = await modal({
        title: 'Les gelukt!',
        body: `<div class="win-stars">${starsHtml(stars)}</div>
          <p class="win-text">${esc(lesson.success)}</p>
          <div class="didyouknow"><div class="didyouknow__label">💡 Wist je dat?</div>${esc(lesson.wistJeDat)}</div>`,
        actions: [
          { label: 'Naar het overzicht', value: 'overview', kind: 'ghost' },
          ...(next ? [{ label: `Volgende les: ${next.title}`, value: 'next', kind: 'primary' }] : [{ label: 'Klaar!', value: 'overview', kind: 'primary' }]),
        ],
      });
      if (v === 'next' && next) go(`#/les/${next.id}`);
      else go('#/opdrachten');
    }

    function intro() {
      return modal({
        title: `Les ${lesson.id}: ${lesson.title}`,
        body: `<div class="intro-art">${partIcon(lesson.icon, { on: true })}</div>
          <p class="intro-text">${esc(lesson.intro)}</p>
          <div class="goal"><span class="goal__icon" aria-hidden="true">🎯</span><div><div class="goal__label">Doel</div>${esc(lesson.steps[state.step].goal)}</div></div>`,
        actions: [{ label: 'Aan de slag!', value: true, kind: 'primary' }],
      });
    }
    if (!draft) intro();

    return () => {
      clearTimeout(saveTimer);
      if (!document.hidden) saveDraft(ctx.profile.id, place, { circuit: ws.editor.circuit, step: state.step, fails: state.fails, shownHints: state.shownHints, totalHints: state.totalHints, answers: state.answers });
      ws.destroy();
    };
  },
};

// ---------- Teacher ----------

function cloudSettingsHtml(s) {
  const on = isConnected(s);
  const last = s.cloudLastSync ? new Date(s.cloudLastSync).toLocaleString('nl-BE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'nog nooit';
  return `<section class="card">
    <h2 class="card__title">Centrale opslag (Google Drive)</h2>
    <p class="muted small">Stuur de voortgang van dit toestel naar jouw Google Sheet. Hoe je die maakt, staat in <a href="https://github.com/SanderAnck/elektriciteit101/blob/main/google/KOPPELING.md" target="_blank" rel="noopener">de handleiding</a>.</p>
    <label class="field"><span class="field__label">Adres van de web-app</span><input class="input input--small" name="cloudUrl" value="${esc(s.cloudUrl || '')}" placeholder="https://script.google.com/macros/s/…/exec"></label>
    <label class="field"><span class="field__label">Klascode</span><input class="input input--small" name="cloudCode" value="${esc(s.cloudCode || '')}" autocomplete="off"></label>
    <label class="field"><span class="field__label">Naam van dit toestel</span><input class="input input--small" name="deviceName" value="${esc(s.deviceName || '')}" placeholder="bv. Chromebook 7"></label>
    <div class="btn-col">
      <button type="button" class="btn btn--primary" data-cloud-save>${on ? 'Opslaan en testen' : 'Koppelen'}</button>
      ${on ? `<button type="button" class="btn" data-cloud-sync>Nu versturen</button>
      <button type="button" class="btn" data-cloud-link>Koppellink voor andere toestellen</button>` : ''}
    </div>
    ${on ? `<p class="muted small">Laatst verstuurd: ${esc(last)}${s.cloudDirty ? ' · er wacht nog iets' : ''}${s.cloudError ? ` · <span class="text-bad">${esc(s.cloudError)}</span>` : ''}</p>` : ''}
  </section>`;
}

function cloudOverviewHtml(s) {
  if (!isConnected(s)) return '';
  return `<section class="card">
    <h2 class="card__title">Alle toestellen</h2>
    <div class="cloud-fetch">
      <input class="input input--small" type="password" name="cloudTeacherCode" value="${esc(s.cloudTeacherCode || '')}" placeholder="Leerkrachtcode uit het script" autocomplete="off">
      <button type="button" class="btn btn--primary" data-cloud-fetch>Gegevens ophalen</button>
    </div>
    <div class="cloud-overview"><p class="muted small">Haal de voortgang op van alle gekoppelde Chromebooks.</p></div>
  </section>`;
}

function overviewTable(pupils) {
  if (!pupils.length) return '<p class="muted">Er is nog niets binnengekomen.</p>';
  pupils.sort((a, b) => String(a.deviceName).localeCompare(String(b.deviceName), 'nl') || String(a.name).localeCompare(String(b.name), 'nl'));
  const when = (iso) => (iso ? new Date(iso).toLocaleString('nl-BE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
  return `<div class="table-wrap"><table class="progress-table">
    <thead><tr><th>Laatste toestel</th><th>Leerling</th>${LESSONS.map((l) => `<th title="${esc(l.title)}">${l.id}</th>`).join('')}<th>★</th><th>Laatst gezien</th></tr></thead>
    <tbody>${pupils.map((p) => `<tr><td>${esc(p.deviceName)}</td><td class="who">${esc(p.icon)} ${esc(p.name)}</td>
      ${LESSONS.map((l) => { const st = Number(p.lessons?.[l.id]) || 0; return `<td class="cell${st ? ' is-done' : ''}">${st ? '★'.repeat(st) : '·'}</td>`; }).join('')}
      <td class="tot">${Number(p.stars) || 0}</td><td class="muted">${esc(when(p.lastSeen))}</td></tr>`).join('')}</tbody></table></div>`;
}

// One-click setup on a Chromebook: #/koppel/<code from the teacher's link>
const koppel = {
  title: 'Koppelen',
  nav: 'leerkracht',
  async mount(page, ctx) {
    const cfg = parseLink(ctx.param || '');
    if (!cfg) { showToast('Deze koppellink is niet geldig.'); return go('#/start'); }
    const name = await promptModal('Toestel koppelen', { label: 'Geef dit toestel een naam, zodat je het herkent', value: ctx.settings.deviceName || '', placeholder: 'bv. Chromebook 7', okLabel: 'Koppel' });
    if (name === null) return go('#/start');
    try {
      await testConnection(cfg.cloudUrl, cfg.cloudCode);
      await saveSettings({ ...cfg, deviceName: name.trim() || 'Toestel', cloudDirty: true, cloudVersion: 2 });
      await syncNow();
      showToast('Dit toestel is gekoppeld.');
    } catch (err) {
      showToast(`Koppelen lukte niet: ${err.message}`);
    }
    history.replaceState(null, '', '#/start');
    go('#/start');
  },
};

let teacherOk = false;

const leerkracht = {
  title: 'Leerkracht',
  nav: 'leerkracht',
  async mount(page, ctx) {
    if (!teacherOk) {
      const code = await promptModal('Leerkrachtendeel', { label: 'Geef de code in', type: 'password', okLabel: 'Open' });
      if (code === null) return go('#/start');
      if (code !== ctx.settings.teacherCode) {
        showToast('Die code klopt niet.');
        return go('#/start');
      }
      teacherOk = true;
    }
    const profiles = await listProfiles();
    const all = await db.getAll('progress');
    const prog = (pid, lid) => all.find((r) => r.profileId === pid && r.lessonId === lid);
    page.innerHTML = `
      <div class="teacher">
        <div class="teacher__head">
          <h1 class="page-title">Leerkrachtendeel</h1>
          <a class="btn btn--ghost" href="#/start">Sluiten</a>
        </div>
        <div class="teacher__grid">
          <div class="teacher__col">
          <section class="card">
            <h2 class="card__title">Voortgang op dit toestel</h2>
            ${profiles.length ? `<div class="table-wrap"><table class="progress-table">
              <thead><tr><th>Leerling</th>${LESSONS.map((l) => `<th title="${esc(l.title)}">${l.id}</th>`).join('')}<th>★</th><th></th></tr></thead>
              <tbody>${profiles.map((p) => {
                const t = totals(Object.fromEntries(all.filter((r) => r.profileId === p.id).map((r) => [r.lessonId, r])));
                return `<tr><td class="who">${esc(p.icon)} ${esc(p.name)}</td>
                  ${LESSONS.map((l) => { const r = prog(p.id, l.id); return `<td class="cell${r?.done ? ' is-done' : ''}">${r?.done ? `${'★'.repeat(r.stars)}` : '·'}</td>`; }).join('')}
                  <td class="tot">${t.stars}</td>
                  <td class="row-actions"><button type="button" class="btn btn--small btn--ghost" data-reset="${p.id}">Reset</button>
                  <button type="button" class="btn btn--small btn--ghost" data-delete="${p.id}">Verwijder</button></td></tr>`;
              }).join('')}</tbody></table></div>` : '<p class="muted">Er zijn nog geen leerlingprofielen op dit toestel.</p>'}
          </section>
          ${cloudOverviewHtml(ctx.settings)}
          </div>
          <div class="teacher__col">
          <section class="card">
            <h2 class="card__title">Instellingen</h2>
            <label class="switch-row"><input type="checkbox" data-unlock ${ctx.settings.unlockAll ? 'checked' : ''}><span>Alle lessen vrijgeven</span></label>
            <p class="muted small">Staat dit uit, dan komt elke les pas vrij als de vorige gelukt is.</p>
            <hr class="divider">
            <div class="btn-col">
              <button type="button" class="btn" data-export>Back-up exporteren</button>
              <button type="button" class="btn" data-import>Back-up importeren</button>
              <button type="button" class="btn" data-code>Code wijzigen</button>
              <button type="button" class="btn btn--danger" data-reset-all>Voortgang van iedereen resetten</button>
            </div>
            <p class="muted small">Versie ${esc(self.APP_VERSION)} · ${isConnected(ctx.settings) ? 'Voortgang wordt ook centraal bewaard.' : 'Alle gegevens blijven op dit toestel.'}</p>
          </section>
          ${cloudSettingsHtml(ctx.settings)}
          </div>
        </div>
      </div>`;
    const reload = () => views.leerkracht.mount(page, { ...ctx, settings: { ...ctx.settings } });
    page.onchange = async (e) => {
      if (e.target.matches('[data-unlock]')) {
        ctx.settings = await saveSettings({ unlockAll: e.target.checked });
        showToast(e.target.checked ? 'Alle lessen zijn vrijgegeven.' : 'Lessen komen weer één voor één vrij.');
      }
    };
    page.querySelector('.teacher').addEventListener('click', async (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.reset) {
        const p = profiles.find((x) => x.id === b.dataset.reset);
        if (await confirmModal(`Voortgang van ${p.name} resetten?`, `Alle sterren en lessen van deze leerling worden gewist${isConnected(ctx.settings) ? ', ook in de centrale opslag' : ''}.`, 'Reset')) { await resetProgress(p.id); reload(); }
      } else if (b.dataset.delete) {
        const p = profiles.find((x) => x.id === b.dataset.delete);
        if (await confirmModal(`Profiel ${p.name} verwijderen?`, `Het profiel, de voortgang en de opgeslagen schakelingen worden gewist${isConnected(ctx.settings) ? ', ook in de centrale opslag' : ''}.`, 'Verwijder')) { await deleteProfile(p.id); reload(); }
      } else if (b.matches('[data-reset-all]')) {
        if (await confirmModal('Iedereen resetten?', 'De voortgang van alle leerlingen op dit toestel wordt gewist. De profielen blijven bestaan.', 'Reset iedereen')) { await resetProgress(null); reload(); }
      } else if (b.matches('[data-export]')) {
        downloadJson(await db.exportAll(), `stroomkringen-backup-${new Date().toISOString().slice(0, 10)}.json`);
      } else if (b.matches('[data-import]')) {
        try {
          const f = await pickJsonFile();
          if (!f) return;
          if (!(await confirmModal('Back-up importeren?', 'Alle gegevens op dit toestel worden vervangen door die uit het bestand.', 'Importeer'))) return;
          await db.importAll(f);
          reloadSettings();
          scheduleSync();
          ctx.settings = await getSettings();
          showToast('Back-up geïmporteerd.');
          reload();
        } catch (err) {
          showToast(err.message);
        }
      } else if (b.matches('[data-cloud-save]')) {
        const url = page.querySelector('[name="cloudUrl"]').value.trim();
        const code = page.querySelector('[name="cloudCode"]').value.trim();
        const deviceName = page.querySelector('[name="deviceName"]').value.trim();
        if (!url && !code) {
          ctx.settings = await saveSettings({ cloudUrl: '', cloudCode: '', deviceName });
          showToast('Centrale opslag staat uit.');
          return reload();
        }
        b.disabled = true;
        try {
          await testConnection(url, code);
          ctx.settings = await saveSettings({ cloudUrl: url, cloudCode: code, deviceName, cloudDirty: true, cloudVersion: 2 });
          await syncNow();
          showToast('Gekoppeld! De voortgang van dit toestel is verstuurd.');
          reload();
        } catch (err) {
          showToast(err.message || 'Geen verbinding.');
          b.disabled = false;
        }
      } else if (b.matches('[data-cloud-sync]')) {
        b.disabled = true;
        const ok = await syncNow();
        ctx.settings = await getSettings();
        showToast(ok ? 'Verstuurd!' : `Niet gelukt: ${ctx.settings.cloudError}`);
        reload();
      } else if (b.matches('[data-cloud-link]')) {
        const link = linkFor(ctx.settings);
        try { await navigator.clipboard.writeText(link); showToast('Koppellink gekopieerd. Open hem op elke Chromebook.'); }
        catch { await modal({ title: 'Koppellink', body: `<p>Open deze link op elke Chromebook:</p><input class="input" readonly value="${esc(link)}">`, actions: [{ label: 'Sluiten', value: true, kind: 'primary' }] }); }
      } else if (b.matches('[data-cloud-fetch]')) {
        const tcode = page.querySelector('[name="cloudTeacherCode"]').value.trim();
        const out = page.querySelector('.cloud-overview');
        out.innerHTML = '<p class="muted">Bezig met ophalen…</p>';
        try {
          const pupils = await fetchOverview(ctx.settings.cloudUrl, tcode);
          ctx.settings = await saveSettings({ cloudTeacherCode: tcode });
          out.innerHTML = overviewTable(pupils);
        } catch (err) {
          out.innerHTML = `<p class="feedback feedback--bad">${esc(err.message || 'Geen verbinding.')}</p>`;
        }
      } else if (b.matches('[data-code]')) {
        const code = await promptModal('Nieuwe code', { label: 'Kies een nieuwe code voor het leerkrachtendeel', okLabel: 'Bewaar' });
        if (code && code.trim()) { ctx.settings = await saveSettings({ teacherCode: code.trim() }); showToast('Code gewijzigd.'); }
      }
    });
  },
};

export const views = { start, profielen, zandbak, opdrachten, les, leerkracht, koppel };
