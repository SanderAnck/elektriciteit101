// Central storage (optional): send this device's progress to a Google Sheet
// through a small Apps Script web app (see google/Code.gs and google/KOPPELING.md).
// No Google login on the Chromebooks: they only know the web app address and
// the class code. Only first names / nicknames, icons and stars are sent.

import { db } from './db.js';
import { getSettings, saveSettings } from './store.js';
import { LESSONS } from './lessons/lessons.js';

export const isConnected = (s) => Boolean(s.cloudUrl && s.cloudCode);

async function post(url, body) {
  // text/plain avoids a CORS preflight, which Apps Script does not answer.
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`De server antwoordde niet (${res.status}).`);
  const data = await res.json().catch(() => { throw new Error('Onverwacht antwoord. Is de web-app goed geïmplementeerd (toegang: iedereen)?'); });
  if (!data.ok) throw new Error(data.error || 'Er ging iets mis.');
  return data;
}

export function checkUrl(url) {
  return /^https:\/\/script\.google(usercontent)?\.com\//.test(url);
}

/** Check the web app address and class code. */
export async function testConnection(url, code) {
  if (!checkUrl(url)) throw new Error('Dit is geen adres van een Google Apps Script-web-app (https://script.google.com/…/exec).');
  return post(url, { action: 'ping', klascode: code });
}

/** Send the full progress of this device. Returns true when sent. */
export async function syncNow() {
  const s = await getSettings();
  if (!isConnected(s)) return false;
  const profiles = await db.getAll('profiles');
  const progress = await db.getAll('progress');
  const title = (id) => LESSONS.find((l) => l.id === id)?.title || '';
  const pupils = profiles.map((p) => {
    const mine = progress.filter((r) => r.profileId === p.id && r.done);
    return { id: p.id, name: p.name, icon: p.icon, done: mine.length, stars: mine.reduce((n, r) => n + (r.stars || 0), 0) };
  });
  try {
    await post(s.cloudUrl, {
      klascode: s.cloudCode,
      deviceId: s.deviceId,
      deviceName: s.deviceName || 'Toestel',
      pupils,
      progress: progress.filter((r) => r.done).map((r) => ({ profileId: r.profileId, lessonId: r.lessonId, title: title(r.lessonId), stars: r.stars, fails: r.fails, hints: r.hints, doneAt: r.doneAt })),
    });
    await saveSettings({ cloudDirty: false, cloudLastSync: new Date().toISOString(), cloudError: null });
    return true;
  } catch (err) {
    await saveSettings({ cloudDirty: true, cloudError: err.message || 'Geen verbinding' });
    return false;
  }
}

let timer = null;

/** Something changed: send it soon (and again later if we are offline). */
export async function scheduleSync(delay = 1500) {
  const s = await getSettings();
  if (!isConnected(s)) return;
  if (!s.cloudDirty) await saveSettings({ cloudDirty: true });
  clearTimeout(timer);
  timer = setTimeout(() => syncNow(), delay);
}

/** At start-up and when the connection returns: send what is still waiting. */
export function startAutoSync() {
  getSettings().then((s) => { if (isConnected(s) && s.cloudDirty) syncNow(); });
  window.addEventListener('online', () => getSettings().then((s) => { if (isConnected(s) && s.cloudDirty) syncNow(); }));
  setInterval(() => getSettings().then((s) => { if (isConnected(s) && s.cloudDirty && navigator.onLine) syncNow(); }), 5 * 60 * 1000);
}

/** Teacher overview of all devices. */
export async function fetchOverview(url, teacherCode) {
  if (!checkUrl(url)) throw new Error('Vul eerst het adres van de web-app in.');
  const res = await fetch(`${url}?code=${encodeURIComponent(teacherCode)}`);
  if (!res.ok) throw new Error(`De server antwoordde niet (${res.status}).`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Er ging iets mis.');
  return data.pupils;
}

/** A link that sets up the connection on another Chromebook in one click. */
export function linkFor(s) {
  const payload = btoa(unescape(encodeURIComponent(JSON.stringify({ u: s.cloudUrl, c: s.cloudCode }))));
  return `${location.origin}${location.pathname}#/koppel/${payload}`;
}

export function parseLink(param) {
  try {
    const o = JSON.parse(decodeURIComponent(escape(atob(param))));
    if (o && checkUrl(o.u) && o.c) return { cloudUrl: o.u, cloudCode: o.c };
  } catch { /* fall through */ }
  return null;
}
