// Central storage in a Google Sheet through a small Apps Script web app
// (see google/Code.gs and google/KOPPELING.md, script version 3).
//
// When a device is connected, the sheet is the truth: classes, profiles and
// progress live there. The device only keeps a temporary copy of the pupil who
// is working on it, plus results that could not be sent yet.
// No Google login on the Chromebooks: they only know the web app address and
// the device code (both come with the koppellink).

import { db } from './db.js';
import { getSettings, saveSettings } from './store.js';
import { LESSONS } from './lessons/lessons.js';

export const MIN_VERSION = 3;

/** Connected = linked to a version 3 script (older links are ignored). */
export const isConnected = (s) => Boolean(s.cloudUrl && s.cloudCode && s.cloudEpoch);

export function checkUrl(url) {
  return /^https:\/\/script\.google(usercontent)?\.com\//.test(url);
}

const OLD_SCRIPT = 'Je Google-script is een oudere versie. Plak de nieuwe code uit google/Code.gs in een nieuwe sheet en implementeer die (zie de handleiding).';

async function rawPost(url, body) {
  // text/plain avoids a CORS preflight, which Apps Script does not answer.
  let res;
  try {
    res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow' });
  } catch {
    // Google answers without CORS headers when it wants a login: the web app is not open to everyone.
    throw new Error(navigator.onLine
      ? 'Google gaf geen toegang. Controleer bij Implementeren: "Uitvoeren als: Ik" en "Wie heeft toegang: Iedereen" (niet "Iedereen met een Google-account"). Open het adres ook eens in een nieuw tabblad: je moet "Het Stroomkringen-script (versie 3) werkt" zien.'
      : 'Geen internetverbinding.');
  }
  if (!res.ok) throw new Error(`De server antwoordde niet (${res.status}).`);
  return res.json().catch(() => { throw new Error('Onverwacht antwoord. Is de web-app goed geïmplementeerd (toegang: iedereen)?'); });
}

async function post(url, body) {
  const data = await rawPost(url, body);
  if (!data.ok) throw new Error(data.error || 'Er ging iets mis.');
  return data;
}

const emit = (name, detail) => window.dispatchEvent(new CustomEvent(`stroomkringen:${name}`, { detail }));

/** Remove all pupil data from this device (the settings stay). */
export async function wipeLocalData() {
  for (const store of ['profiles', 'progress', 'drafts', 'circuits']) await db.clear(store);
}

async function removeLocalProfile(id) {
  for (const r of await db.getAll('progress')) if (r.profileId === id) await db.delete('progress', r.id);
  for (const d of await db.getAll('drafts')) if (d.id.startsWith(`${id}:`)) await db.delete('drafts', d.id);
  for (const c of await db.getAll('circuits')) if (c.profileId === id) await db.delete('circuits', c.id);
  await db.delete('profiles', id);
}

/** The teacher wiped the sheet (or the class is gone): start over on this device. */
async function startOver(newEpoch, reason) {
  await wipeLocalData();
  await saveSettings({ cloudEpoch: newEpoch || (await getSettings()).cloudEpoch, cloudKlas: null, currentProfile: null, cloudOps: [], cloudDirty: false, cloudError: null });
  emit('reset', { reason });
}

class ResetError extends Error {}

/** A request from this device (device code + epoch). */
async function ask(action, extra = {}) {
  const s = await getSettings();
  if (!isConnected(s)) throw new Error('Dit toestel is niet gekoppeld.');
  const data = await rawPost(s.cloudUrl, { action, toestelcode: s.cloudCode, epoch: s.cloudEpoch, ...extra });
  if (data.reset) {
    await startOver(data.epoch, 'wipe');
    throw new ResetError('De leerkracht heeft alle gegevens gewist.');
  }
  if (!data.ok) {
    const err = new Error(data.error || 'Er ging iets mis.');
    err.gone = Boolean(data.gone);
    throw err;
  }
  return data;
}

/** Check the web app address and device code. Returns { version, epoch }. */
export async function testConnection(url, code) {
  if (!checkUrl(url)) throw new Error('Dit is geen adres van een Google Apps Script-web-app (https://script.google.com/…/exec).');
  const res = await post(url, { action: 'ping', toestelcode: code });
  if (!(res.version >= MIN_VERSION)) throw new Error(OLD_SCRIPT);
  return res;
}

/**
 * Link this device to the sheet. Local pupil data is removed: the device
 * starts as new. With klasId the device is set to that class at once.
 */
export async function connect({ url, code, deviceName, klasId = null }) {
  const res = await testConnection(url, code);
  const s = await getSettings();
  const same = s.cloudUrl === url && s.cloudCode === code && s.cloudEpoch === res.epoch;
  if (!same) await wipeLocalData();
  await saveSettings({
    cloudUrl: url, cloudCode: code, cloudEpoch: res.epoch, deviceName: deviceName || s.deviceName || 'Toestel',
    ...(same ? {} : { cloudKlas: null, currentProfile: null, cloudOps: [], cloudDirty: false, cloudLastSync: null }),
    cloudError: null,
  });
  if (klasId) {
    const klas = (await listClasses()).find((c) => c.id === klasId);
    if (klas && (await getSettings()).cloudKlas?.id !== klas.id) await chooseClass(klas);
  }
}

/** Unlink this device and remove all pupil data from it. */
export async function disconnect() {
  await wipeLocalData();
  await saveSettings({ cloudUrl: '', cloudCode: '', cloudEpoch: null, cloudKlas: null, currentProfile: null, cloudOps: [], cloudDirty: false, cloudLastSync: null, cloudError: null });
  teacherCode = null;
}

// ---------- Classes and profiles ----------

export async function listClasses() {
  return (await ask('classes')).classes || [];
}

/** This device now works for this class. */
export async function chooseClass(klas) {
  const s = await getSettings();
  if (s.cloudDirty) await syncNow();
  for (const p of await db.getAll('profiles')) await removeLocalProfile(p.id);
  await saveSettings({ cloudKlas: klas ? { id: klas.id, name: klas.name, unlockAll: Boolean(klas.unlockAll) } : null, currentProfile: null });
}

/** Profiles of the class of this device, from the sheet. */
export async function listClassProfiles() {
  const s = await getSettings();
  if (!s.cloudKlas) return [];
  if (s.cloudDirty) await syncNow();
  const res = await ask('profiles', { klasId: s.cloudKlas.id });
  if (!res.klas) {
    await saveSettings({ cloudKlas: null, currentProfile: null });
    throw new Error('Deze klas bestaat niet meer. Kies je klas opnieuw.');
  }
  await saveSettings({ cloudKlas: res.klas });
  return res.pupils || [];
}

/** Work as this pupil on this device: fetch the profile and its progress. */
export async function openRemoteProfile(id) {
  const res = await ask('profile', { id });
  const p = res.pupil;
  const existing = await db.get('profiles', p.id);
  await db.put('profiles', { ...(existing || { createdAt: new Date().toISOString() }), id: p.id, name: p.name, icon: p.icon, klasId: p.klasId });
  await replaceProgress(p.id, res.progress || []);
  await saveSettings({ currentProfile: p.id });
  pruneOthers();
  return p;
}

/** Make the local copy equal to the sheet, but keep results that were not sent yet. */
async function replaceProgress(profileId, rows) {
  let changedAny = false;
  const central = new Map(rows.map((r) => [Number(r.lessonId), r]));
  for (const old of await db.getAll('progress')) {
    if (old.profileId !== profileId || old.pending) continue;
    if (!central.has(Number(old.lessonId))) { await db.delete('progress', old.id); changedAny = true; }
  }
  for (const r of central.values()) {
    const id = `${profileId}:${r.lessonId}`;
    const old = await db.get('progress', id);
    if (old?.pending) continue;
    if (old?.done && old.stars === (r.stars || 0)) continue;
    await db.put('progress', { id, profileId, lessonId: Number(r.lessonId), done: true, stars: r.stars || 0, fails: r.fails || 0, hints: r.hints || 0, doneAt: r.doneAt || new Date().toISOString() });
    changedAny = true;
  }
  return changedAny;
}

/** Only the pupil who works on this device stays here, once everything is sent. */
async function pruneOthers() {
  const s = await getSettings();
  if (!isConnected(s) || s.cloudDirty) return;
  const pending = new Set((await db.getAll('progress')).filter((r) => r.pending).map((r) => r.profileId));
  for (const p of await db.getAll('profiles')) {
    if (p.id !== s.currentProfile && !pending.has(p.id)) await removeLocalProfile(p.id);
  }
}

// ---------- Sending ----------

let sending = null;

/** Send what is waiting on this device. Returns true when sent. */
export function syncNow() {
  if (!sending) sending = doSync().finally(() => { sending = null; });
  return sending;
}

async function doSync() {
  const s = await getSettings();
  if (!isConnected(s)) return false;
  const profiles = await db.getAll('profiles');
  const all = await db.getAll('progress');
  const pending = all.filter((r) => r.done && r.pending);
  const title = (id) => LESSONS.find((l) => l.id === id)?.title || '';
  const ops = s.cloudOps || [];
  try {
    const res = await ask('sync', {
      deviceName: s.deviceName || 'Toestel',
      klasId: s.cloudKlas?.id || undefined,
      ops,
      pupils: profiles.map((p) => ({ id: p.id })),
      progress: pending.map((r) => ({ profileId: r.profileId, lessonId: r.lessonId, title: title(r.lessonId), stars: r.stars, fails: r.fails, hints: r.hints, doneAt: r.doneAt })),
    });
    // Results saved again while we were sending stay pending.
    for (const r of pending) {
      const now = await db.get('progress', r.id);
      if (now && now.doneAt === r.doneAt) await db.put('progress', { ...now, pending: false });
    }
    const after = await getSettings();
    await saveSettings({ cloudOps: (after.cloudOps || []).slice(ops.length), cloudDirty: (after.cloudOps || []).length > ops.length || (await db.getAll('progress')).some((r) => r.pending), cloudLastSync: new Date().toISOString(), cloudError: null });
    if (res.klas === null && s.cloudKlas) {
      await startOver(null, 'class');
      return true;
    }
    if (res.klas) await saveSettings({ cloudKlas: res.klas });
    for (const id of res.gone || []) {
      await removeLocalProfile(id);
      if ((await getSettings()).currentProfile === id) {
        await saveSettings({ currentProfile: null });
        emit('gone', { id });
      }
    }
    await pruneOthers();
    return true;
  } catch (err) {
    if (err instanceof ResetError) return false;
    await saveSettings({ cloudDirty: true, cloudError: err.message || 'Geen verbinding' });
    return false;
  }
}

let timer = null;

/** Something changed: send it soon (and again later if we are offline). */
export async function scheduleSync(change = null, delay = 1500) {
  const s = await getSettings();
  if (!isConnected(s)) return;
  let ops = [];
  if (change?.op === 'create') {
    const p = change.profile;
    ops = [{ op: 'create', profileId: p.id, klasId: p.klasId, name: p.name, icon: p.icon }];
    delay = 0;
  } else if (change?.op) {
    ops = (change.profileIds || []).map((profileId) => ({ op: change.op, profileId }));
  }
  await saveSettings({ cloudDirty: true, cloudOps: [...(s.cloudOps || []), ...ops] });
  clearTimeout(timer);
  timer = setTimeout(() => syncNow(), delay);
}

/** At start-up and when the connection returns: send what is still waiting. */
export function startAutoSync() {
  const retry = () => getSettings().then((s) => { if (isConnected(s) && s.cloudDirty && navigator.onLine) syncNow(); });
  retry();
  window.addEventListener('online', retry);
  setInterval(retry, 5 * 60 * 1000);
}

let lastPull = 0;

/** Fetch the class settings again (the teacher may have opened or locked the lessons). Returns true when they changed. */
async function refreshKlas() {
  const s = await getSettings();
  if (!s.cloudKlas) return false;
  const k = (await listClasses()).find((c) => c.id === s.cloudKlas.id);
  if (!k) {
    await startOver(null, 'class');
    return true;
  }
  const klas = { id: k.id, name: k.name, unlockAll: Boolean(k.unlockAll) };
  if (klas.name === s.cloudKlas.name && klas.unlockAll === Boolean(s.cloudKlas.unlockAll)) return false;
  await saveSettings({ cloudKlas: klas });
  return true;
}

/**
 * Bring the local copy of this pupil up to date with the sheet (work on other
 * devices, resets by the teacher). Returns true when something changed.
 */
export async function pullProgress(profileId, { force = false } = {}) {
  const s = await getSettings();
  if (!isConnected(s) || !navigator.onLine) return false;
  if (!force && Date.now() - lastPull < 5000) return false;
  lastPull = Date.now();
  try {
    const klasChanged = await refreshKlas();
    if (!(await getSettings()).cloudKlas) return true; // class removed
    if (s.cloudDirty) await syncNow();
    if ((await getSettings()).currentProfile !== profileId) return true; // removed by the sync
    if ((await getSettings()).cloudDirty) return klasChanged;
    const res = await ask('profile', { id: profileId });
    const klasId = (await getSettings()).cloudKlas?.id;
    if (klasId && res.pupil.klasId !== klasId) throw Object.assign(new Error('Andere klas'), { gone: true });
    return (await replaceProgress(profileId, res.progress || [])) || klasChanged;
  } catch (err) {
    if (err instanceof ResetError) return true;
    if (err.gone) {
      await removeLocalProfile(profileId);
      await saveSettings({ currentProfile: null });
      emit('gone', { id: profileId });
      return true;
    }
    return false;
  }
}

// ---------- Koppellink ----------

/** A link that connects another Chromebook in one click (optionally to one class). */
export function linkFor(s, klasId = null) {
  const o = { u: s.cloudUrl, c: s.cloudCode };
  if (klasId) o.k = klasId;
  const payload = btoa(unescape(encodeURIComponent(JSON.stringify(o))));
  return `${location.origin}${location.pathname}#/koppel/${payload}`;
}

export function parseLink(param) {
  try {
    const o = JSON.parse(decodeURIComponent(escape(atob(param))));
    if (o && checkUrl(o.u) && o.c) return { url: o.u, code: o.c, klasId: o.k || null };
  } catch { /* fall through */ }
  return null;
}

// ---------- Teacher (LEERKRACHTCODE, only kept in memory) ----------

let teacherCode = null;

export const teacherLoggedIn = () => Boolean(teacherCode);
export const teacherLogout = () => { teacherCode = null; };

export async function teacherLogin(code) {
  const s = await getSettings();
  const res = await post(s.cloudUrl, { action: 'teacherPing', leerkrachtcode: code });
  if (!(res.version >= MIN_VERSION)) throw new Error(OLD_SCRIPT);
  teacherCode = code;
  return res;
}

/** Teacher actions: overview, addClass, updateClass, deleteClass, resetPupil, deletePupil, wipe. */
export async function teacher(action, extra = {}) {
  const s = await getSettings();
  if (!teacherCode) throw new Error('Log eerst in met de leerkrachtcode.');
  const res = await post(s.cloudUrl, { action, leerkrachtcode: teacherCode, ...extra });
  // After a wipe this device starts over too.
  if (res.epoch && res.epoch !== s.cloudEpoch) await startOver(res.epoch, 'wipe');
  return res;
}
