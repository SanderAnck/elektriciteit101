// Runs google/Code.gs against a tiny fake of the Google Apps Script services.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function fakeSheets() {
  const sheets = new Map();
  const mk = (name) => {
    const sh = {
      name, rows: [],
      getLastRow: () => sh.rows.length,
      getLastColumn: () => (sh.rows[0] || []).length,
      appendRow: (r) => sh.rows.push([...r]),
      setFrozenRows() {},
      setName: (n) => { sheets.delete(sh.name); sh.name = n; sheets.set(n, sh); },
      getRange: (r, c, nr, nc) => ({
        getValues: () => sh.rows.slice(r - 1, r - 1 + nr).map((row) => Array.from({ length: nc }, (_, i) => row[c - 1 + i] ?? '')),
        setValues: (vals) => vals.forEach((v, i) => (sh.rows[r - 1 + i] = [...v])),
        clearContent: () => { sh.rows.length = r - 1; },
        setFontWeight() {},
      }),
    };
    sheets.set(name, sh);
    return sh;
  };
  const ss = { getSheetByName: (n) => sheets.get(n) || null, insertSheet: (n) => mk(n), deleteSheet: (sh) => sheets.delete(sh.name) };
  return { ss, sheets };
}

function load() {
  const { ss, sheets } = fakeSheets();
  const ctx = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ss },
    ContentService: { createTextOutput: (t) => ({ setMimeType: () => JSON.parse(t) }), MimeType: { JSON: 'json' } },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  };
  vm.createContext(ctx);
  const code = readFileSync(new URL('../google/Code.gs', import.meta.url), 'utf8').replace("'kies-een-klascode'", "'klas'").replace("'kies-een-geheime-leerkrachtcode'", "'geheim'");
  vm.runInContext(code, ctx);
  const post = (body) => ctx.doPost({ postData: { contents: JSON.stringify({ klascode: 'klas', ...body }) } });
  return { ctx, post, sheets };
}

test('apps script: merge progress from two devices, find and fetch a profile, reset and delete', () => {
  const { ctx, post, sheets } = load();
  assert.equal(post({ action: 'ping' }).version, 2);
  assert.equal(ctx.doPost({ postData: { contents: JSON.stringify({ klascode: 'nee', action: 'ping' }) } }).ok, false);
  const pupil = { id: 'u1', name: 'Lotte', icon: '🦊' };
  post({ deviceName: 'CB 1', pupils: [pupil], progress: [{ profileId: 'u1', lessonId: 1, title: 'Licht aan!', stars: 2, doneAt: '2026-01-01' }] });
  post({ deviceName: 'CB 2', pupils: [pupil], progress: [{ profileId: 'u1', lessonId: 1, stars: 1, doneAt: '2026-01-02' }, { profileId: 'u1', lessonId: 2, stars: 3, doneAt: '2026-01-02' }] });
  const list = post({ action: 'profiles' }).pupils;
  assert.equal(list.length, 1);
  assert.equal(list[0].stars, 5); // best of lesson 1 (2) + lesson 2 (3)
  assert.equal(list[0].lastDevice, 'CB 2');
  const one = post({ action: 'profile', id: 'u1' });
  assert.deepEqual(one.progress.map((r) => [r.lessonId, r.stars]).sort(), [[1, 2], [2, 3]]);
  const overview = ctx.doGet({ parameter: { code: 'geheim' } });
  assert.equal(overview.pupils[0].lessons[2], 3);
  assert.equal(ctx.doGet({ parameter: { code: 'x' } }).ok, false);
  post({ deviceName: 'CB 1', ops: [{ op: 'reset', profileId: 'u1' }], pupils: [pupil], progress: [] });
  assert.equal(post({ action: 'profiles' }).pupils[0].stars, 0);
  post({ deviceName: 'CB 1', ops: [{ op: 'delete', profileId: 'u1' }] });
  assert.equal(post({ action: 'profiles' }).pupils.length, 0);
  assert.ok(sheets.has('Leerlingen') && sheets.has('Voortgang'));
});

test('apps script: an old tab layout is kept aside as "(oud)"', () => {
  const { post, sheets } = load();
  const sh = sheets.get('Leerlingen') || null;
  assert.equal(sh, null);
  // simulate a version 1 tab
  post({ action: 'ping' });
  const { ss } = { ss: null };
  void ss;
  const fake = load();
  fake.ctx.SpreadsheetApp.getActiveSpreadsheet().insertSheet('Leerlingen').appendRow(['Toestel', 'Leerling']);
  fake.post({ deviceName: 'CB', pupils: [{ id: 'a', name: 'A', icon: '' }] });
  assert.ok(fake.sheets.has('Leerlingen (oud)'));
  assert.equal(fake.post({ action: 'profiles' }).pupils.length, 1);
});
