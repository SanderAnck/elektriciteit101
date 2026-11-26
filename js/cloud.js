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

const OLD_SCRIPT = 'Je Google-script is een oudere versie. Plak de nieuwe code uit google/Code.gs en implementeer een nieuwe versie (zie de handleiding).';

/** Check the web app address and class code. */
export async function testConnection(url, code) {
  if (!checkUrl(url)) throw new Error('Dit is geen adres van een Google Apps Script-web-app (https://script.google.com/…/exec).');
  const res = await post(url, { action: 'ping', klascode: code });
  if (!(res.version >= 2)) throw new Error(OLD_SCRIPT);
  return res;
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
    const ops = s.cloudOps || [];
    await post(s.cloudUrl, {
      action: 'sync',
      klascode: s.cloudCode,
      deviceId: s.deviceId,
      deviceName: s.deviceName || 'Toestel',
      ops,
      pupils,
      progress: progress.filter((r) => r.done).map((r) => ({ profileId: r.profileId, lessonId: r.lessonId, title: title(r.lessonId), stars: r.stars, fails: r.fails, hints: r.hints, doneAt: r.doneAt })),
    });
    // Ops added while we were sending stay for the next round.
    const now = await getSettings();
    await saveSettings({ cloudOps: (now.cloudOps || []).slice(ops.length), cloudDirty: (now.cloudOps || []).length > ops.length, cloudLastSync: new Date().toISOString(), cloudError: null });
    return true;
  } catch (err) {
    await saveSettings({ cloudDirty: true, cloudError: err.message || 'Geen verbinding' });
    return false;
  }
}

let timer = null;

/** Something changed: send it soon (and again later if we are offline). */
export async function scheduleSync(change = null, delay = 1500) {
  const s = await getSettings();
  if (!isConnected(s)) return;
  // Deletes and resets must also happen centrally, in order.
  const ops = change?.op ? (change.profileIds || []).map((profileId) => ({ op: change.op, profileId })) : [];
  if (!s.cloudDirty || ops.length) await saveSettings({ cloudDirty: true, cloudOps: [...(s.cloudOps || []), ...ops] });
  clearTimeout(timer);
  timer = setTimeout(() => syncNow(), delay);
}

/** At start-up and when the connection returns: send what is still waiting. */
export function startAutoSync() {
  getSettings().then(async (s) => {
    if (!isConnected(s)) return;
    // After the teacher updated the Google script to version 2, every device sends everything once.
    if (!(s.cloudVersion >= 2) && navigator.onLine) {
      try {
        const res = await post(s.cloudUrl, { action: 'ping', klascode: s.cloudCode });
        if (res.version >= 2) { await saveSettings({ cloudVersion: res.version, cloudDirty: true }); return syncNow(); }
      } catch { /* try again next time */ }
    }
    if (s.cloudDirty) syncNow();
  });
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

// ---------- Profiles on other devices ----------

async function requireV2(s) {
  if (s.cloudVersion >= 2) return;
  const res = await post(s.cloudUrl, { action: 'ping', klascode: s.cloudCode });
  if (!(res.version >= 2)) throw new Error(OLD_SCRIPT);
  await saveSettings({ cloudVersion: res.version });
}

/** Profiles known centrally: [{ id, name, icon, done, stars, lastDevice }]. */
export async function listRemoteProfiles() {
  const s = await getSettings();
  if (!isConnected(s)) return [];
  await requireV2(s);
  if (s.cloudDirty) await syncNow();
  return (await post(s.cloudUrl, { action: 'profiles', klascode: s.cloudCode })).pupils || [];
}

async function fetchProfile(id) {
  const s = await getSettings();
  await requireV2(s);
  return post(s.cloudUrl, { action: 'profile', klascode: s.cloudCode, id });
}

/** Bring a profile from another device to this one, with its progress. */
export async function importRemoteProfile(id) {
  const res = await fetchProfile(id);
  const p = res.pupil;
  const existing = await db.get('profiles', p.id);
  await db.put('profiles', { ...(existing || { createdAt: new Date().toISOString() }), id: p.id, name: p.name, icon: p.icon });
  await mergeProgress(p.id, res.progress || []);
  await saveSettings({ currentProfile: p.id });
  return p;
}

/** Merge central progress into this device: the best result counts. Returns true when something changed. */
export async function mergeProgress(profileId, rows) {
  let changedAny = false;
  for (const r of rows) {
    const id = `${profileId}:${r.lessonId}`;
    const old = await db.get('progress', id);
    if (old?.done && (old.stars || 0) >= (r.stars || 0)) continue;
    await db.put('progress', { id, profileId, lessonId: Number(r.lessonId), done: true, stars: r.stars || 0, fails: r.fails || 0, hints: r.hints || 0, doneAt: r.doneAt || new Date().toISOString() });
    changedAny = true;
  }
  return changedAny;
}

let lastPull = 0;

/** Fetch what this pupil did on other devices. Returns true when something new came in. */
export async function pullProgress(profileId, { force = false } = {}) {
  const s = await getSettings();
  if (!isConnected(s) || !navigator.onLine) return false;
  if (!force && Date.now() - lastPull < 30000) return false;
  lastPull = Date.now();
  try {
    if (s.cloudDirty) await syncNow();
    if ((await getSettings()).cloudDirty) return false; // pending deletes/resets first
    const res = await fetchProfile(profileId);
    return await mergeProgress(profileId, res.progress || []);
  } catch {
    return false;
  }
}
