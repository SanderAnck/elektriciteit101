// App data on top of db.js: settings, pupil profiles, progress and drafts.

import { db } from './db.js';
import { LESSONS } from './lessons/lessons.js';

const DEFAULTS = { id: 'app', sound: true, dots: true, unlockAll: false, currentProfile: null, teacherCode: '1234', panelOpen: true };

let cache = null;

export async function getSettings() {
  if (!cache) cache = { ...DEFAULTS, ...((await db.get('settings', 'app')) || {}) };
  return cache;
}

export async function saveSettings(patch) {
  cache = { ...(await getSettings()), ...patch };
  await db.put('settings', cache);
  return cache;
}

export const reloadSettings = () => { cache = null; };

export const PROFILE_ICONS = ['🦊', '🐼', '🦉', '🐙', '🐢', '🦖', '🐝', '🦁', '🐬', '🚀', '⚡', '🌈', '⚽', '🎸', '🍀', '🤖'];

export async function listProfiles() {
  return (await db.getAll('profiles')).sort((a, b) => a.name.localeCompare(b.name, 'nl'));
}

export async function currentProfile() {
  const s = await getSettings();
  if (!s.currentProfile) return null;
  return (await db.get('profiles', s.currentProfile)) || null;
}

export async function createProfile(name, icon) {
  const p = { id: `u${Date.now().toString(36)}`, name: name.trim().slice(0, 20), icon, createdAt: new Date().toISOString() };
  await db.put('profiles', p);
  await saveSettings({ currentProfile: p.id });
  return p;
}

export async function deleteProfile(id) {
  await resetProgress(id);
  for (const c of await db.getAll('circuits')) if (c.profileId === id) await db.delete('circuits', c.id);
  for (const d of await db.getAll('drafts')) if (d.id.startsWith(`${id}:`)) await db.delete('drafts', d.id);
  await db.delete('profiles', id);
  const s = await getSettings();
  if (s.currentProfile === id) await saveSettings({ currentProfile: null });
}

/** Progress of one pupil: { lessonId: record }. */
export async function getProgress(profileId) {
  const out = {};
  for (const r of await db.getAll('progress')) if (r.profileId === profileId) out[r.lessonId] = r;
  return out;
}

export async function saveLessonResult(profileId, lessonId, { stars, fails, hints }) {
  const id = `${profileId}:${lessonId}`;
  const old = (await db.get('progress', id)) || {};
  const rec = { id, profileId, lessonId, done: true, stars: Math.max(old.stars || 0, stars), fails, hints, doneAt: new Date().toISOString() };
  await db.put('progress', rec);
  return rec;
}

export async function resetProgress(profileId) {
  for (const r of await db.getAll('progress')) if (!profileId || r.profileId === profileId) await db.delete('progress', r.id);
  for (const d of await db.getAll('drafts')) if (d.id.includes(':les') && (!profileId || d.id.startsWith(`${profileId}:`))) await db.delete('drafts', d.id);
}

export function isUnlocked(lessonId, progress, settings) {
  if (settings.unlockAll) return true;
  const i = LESSONS.findIndex((l) => l.id === Number(lessonId));
  return i <= 0 || Boolean(progress[LESSONS[i - 1].id]?.done);
}

export function totals(progress) {
  const done = LESSONS.filter((l) => progress[l.id]?.done).length;
  const stars = LESSONS.reduce((s, l) => s + (progress[l.id]?.stars || 0), 0);
  return { done, stars, max: LESSONS.length };
}

export async function getDraft(profileId, place) {
  return (await db.get('drafts', `${profileId}:${place}`))?.data || null;
}

export async function saveDraft(profileId, place, data) {
  await db.put('drafts', { id: `${profileId}:${place}`, data, savedAt: new Date().toISOString() });
}

export async function deleteDraft(profileId, place) {
  await db.delete('drafts', `${profileId}:${place}`);
}

export async function listCircuits(profileId) {
  return (await db.getAll('circuits')).filter((c) => c.profileId === profileId).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export async function saveCircuit(profileId, name, data, id) {
  const rec = { id: id || `c${Date.now().toString(36)}`, profileId, name: name.trim().slice(0, 40) || 'Mijn schakeling', data, savedAt: new Date().toISOString() };
  await db.put('circuits', rec);
  return rec;
}
