// App shell: hash router, top bar, service worker and update message.

import { views } from './views.js';
import { requestPersistentStorage } from './db.js';
import { getSettings, saveSettings, currentProfile, getProgress, setChangeHook } from './store.js';
import { scheduleSync, startAutoSync, pullProgress } from './cloud.js';
import { showToast, modal, hideTip } from './ui.js';
import { setSoundEnabled, setBuzzer } from './sound.js';

const DEFAULT_ROUTE = 'start';
const viewEl = document.getElementById('view');

function parseRoute() {
  const [name, param] = location.hash.replace(/^#\/?/, '').split('/');
  return { name: views[name] ? name : DEFAULT_ROUTE, param };
}

let renderId = 0;
let cleanup = null;

async function render() {
  const id = ++renderId;
  let { name, param } = parseRoute();
  const settings = await getSettings();
  const profile = await currentProfile();
  if (views[name].needsProfile && !profile) {
    history.replaceState(null, '', '#/profielen');
    name = 'profielen';
  }
  const progress = profile ? await getProgress(profile.id) : {};
  if (id !== renderId) return;
  // Progress from other devices: fetch in the background and refresh overview screens.
  if (profile && (name === 'start' || name === 'opdrachten')) {
    pullProgress(profile.id).then((changed) => { if (changed && id === renderId) render(); });
  }
  const view = views[name];

  if (cleanup) { try { cleanup(); } catch (err) { console.warn(err); } cleanup = null; }
  hideTip();
  setBuzzer(0);

  updateTopbar(view, profile, settings);
  document.title = `${view.title} · Stroomkringen`;
  document.body.classList.toggle('is-work', Boolean(view.work));

  const page = document.createElement('div');
  page.className = view.work ? 'page page--work' : 'page';
  viewEl.replaceChildren(page);
  const ctx = { settings, profile, progress, param };
  try {
    const c = await view.mount(page, ctx);
    if (typeof c === 'function') {
      if (id === renderId) cleanup = c;
      else c();
    }
  } catch (err) {
    console.error(err);
    page.innerHTML = '<div class="center-page"><p>Er ging iets mis bij het laden. Probeer de pagina opnieuw te laden.</p></div>';
  }
}

function updateTopbar(view, profile, settings) {
  for (const a of document.querySelectorAll('.nav__link')) {
    if (a.dataset.route === view.nav) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  const chip = document.getElementById('profile-chip');
  chip.hidden = !profile;
  if (profile) chip.innerHTML = `<span class="chip-icon">${profile.icon}</span><span class="chip-name"></span>`;
  if (profile) chip.querySelector('.chip-name').textContent = profile.name;
  const snd = document.getElementById('sound-toggle');
  snd.setAttribute('aria-pressed', String(settings.sound !== false));
  snd.title = settings.sound !== false ? 'Geluid staat aan' : 'Geluid staat uit';
  setSoundEnabled(settings.sound !== false);
}

document.getElementById('sound-toggle').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  const on = btn.getAttribute('aria-pressed') !== 'true';
  btn.setAttribute('aria-pressed', String(on));
  btn.title = on ? 'Geluid staat aan' : 'Geluid staat uit';
  setSoundEnabled(on);
  await saveSettings({ sound: on });
  showToast(on ? 'Geluid aan' : 'Geluid uit');
});

document.getElementById('help-btn').addEventListener('click', () =>
  modal({
    title: 'Hulp',
    wide: true,
    body: `
      <div class="help-grid">
        <div>
          <h3 class="help__sub">Zo bouw je</h3>
          <ul class="how-list">
            <li><b>Onderdeel plaatsen:</b> sleep het uit de gereedschapskist, of klik erop.</li>
            <li><b>Draad maken:</b> sleep van een bolletje naar een ander bolletje. Of klik op een bolletje en daarna op een tweede.</li>
            <li><b>Verplaatsen:</b> sleep het onderdeel.</li>
            <li><b>Schakelaar:</b> klik erop om hem aan of uit te zetten.</li>
            <li><b>Drukknop:</b> houd de muisknop ingedrukt.</li>
            <li><b>Meer knoppen:</b> klik op een onderdeel of draad, of klik met de rechtermuisknop.</li>
          </ul>
        </div>
        <div>
          <h3 class="help__sub">Sneltoetsen</h3>
          <table class="keys">
            <tr><td><kbd>R</kbd> of dubbelklik</td><td>Draaien</td></tr>
            <tr><td><kbd>Delete</kbd> / <kbd>Backspace</kbd></td><td>Verwijderen</td></tr>
            <tr><td><kbd>Ctrl</kbd> + <kbd>Z</kbd></td><td>Ongedaan maken</td></tr>
            <tr><td><kbd>Ctrl</kbd> + <kbd>Y</kbd></td><td>Opnieuw</td></tr>
            <tr><td><kbd>Esc</kbd></td><td>Annuleren</td></tr>
          </table>
        </div>
      </div>`,
    actions: [{ label: 'Begrepen', value: true, kind: 'primary' }],
  })
);

window.addEventListener('hashchange', render);

// The sheet decides: after a wipe, a removed class or a removed profile this device follows.
window.addEventListener('stroomkringen:reset', (e) => {
  const onTeacher = parseRoute().name === 'leerkracht';
  if (!onTeacher) showToast(e.detail?.reason === 'class' ? 'Deze klas bestaat niet meer. Kies je klas opnieuw.' : 'Alles is gewist door de leerkracht. Je begint opnieuw.');
  if (onTeacher) return;
  history.replaceState(null, '', '#/start');
  render();
});
window.addEventListener('stroomkringen:gone', () => {
  showToast('Dit profiel bestaat niet meer. Kies je profiel opnieuw.');
  if (parseRoute().name !== 'leerkracht') render();
});

// Service worker: offline support and automatic updates.
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const hadController = Boolean(navigator.serviceWorker.controller);
  const registration = await navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return;
    showToast('Er is een nieuwe versie van de app.', { label: 'Herladen', onClick: () => location.reload() });
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') registration.update().catch(() => {});
  });
}

if (!location.hash) history.replaceState(null, '', `#/${DEFAULT_ROUTE}`);
setChangeHook((change) => scheduleSync(change));
startAutoSync();
render();
registerServiceWorker().catch((err) => console.warn('Service worker failed', err));
requestPersistentStorage();
