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
  const store = new Map();
  let n = 0;
  const ctx = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ss },
    ContentService: { createTextOutput: (t) => ({ setMimeType: () => JSON.parse(t) }), MimeType: { JSON: 'json' } },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => store.get(k) ?? null, setProperty: (k, v) => store.set(k, v) }) },
    Utilities: { getUuid: () => `id${++n}-0000-0000` },
  };
  vm.createContext(ctx);
  const code = readFileSync(new URL('../google/Code.gs', import.meta.url), 'utf8')
    .replace("'kies-een-toestelcode'", "'toestel'").replace("'kies-een-geheime-leerkrachtcode'", "'geheim'");
  vm.runInContext(code, ctx);
  const raw = (body) => ctx.doPost({ postData: { contents: JSON.stringify(body) } });
  const dev = (body) => raw({ toestelcode: 'toestel', ...body });
  const teach = (body) => raw({ leerkrachtcode: 'geheim', ...body });
  return { ctx, raw, dev, teach, sheets, store };
}

test('apps script v3: classes, profiles per class, merging two devices', () => {
  const { raw, dev, teach, sheets } = load();
  const { version, epoch } = dev({ action: 'ping' });
  assert.equal(version, 3);
  assert.equal(raw({ toestelcode: 'nee', action: 'ping' }).ok, false);
  assert.equal(raw({ leerkrachtcode: 'nee', action: 'overview' }).ok, false);
  assert.equal(teach({ action: 'teacherPing' }).version, 3);

  teach({ action: 'addClass', name: '5A' });
  const classes = teach({ action: 'addClass', name: '6B' }).classes;
  assert.deepEqual(classes.map((c) => c.name), ['5A', '6B']);
  const [a, b] = classes;
  assert.deepEqual(dev({ action: 'classes', epoch }).classes.map((c) => c.id), [a.id, b.id]);

  // Lotte in 5A on CB 1, Mo in 6B on CB 2.
  dev({ action: 'sync', epoch, deviceName: 'CB 1', klasId: a.id, ops: [{ op: 'create', profileId: 'u1', klasId: a.id, name: 'Lotte', icon: '🦊' }], pupils: [{ id: 'u1' }],
    progress: [{ profileId: 'u1', lessonId: 1, title: 'Licht aan!', stars: 2, doneAt: '2026-01-01' }] });
  dev({ action: 'sync', epoch, deviceName: 'CB 2', ops: [{ op: 'create', profileId: 'u2', klasId: b.id, name: 'Mo', icon: '🐼' }], pupils: [{ id: 'u2' }] });
  // Unknown class: not created.
  dev({ action: 'sync', epoch, ops: [{ op: 'create', profileId: 'u3', klasId: 'nope', name: 'X' }] });
  // Lotte continues on CB 2: the best result counts.
  const r = dev({ action: 'sync', epoch, deviceName: 'CB 2', klasId: a.id, pupils: [{ id: 'u1' }],
    progress: [{ profileId: 'u1', lessonId: 1, stars: 1 }, { profileId: 'u1', lessonId: 2, stars: 3 }] });
  assert.equal(r.klas.name, '5A');

  const inA = dev({ action: 'profiles', epoch, klasId: a.id });
  assert.equal(inA.klas.name, '5A');
  assert.deepEqual(inA.pupils.map((p) => [p.name, p.stars, p.lastDevice]), [['Lotte', 5, 'CB 2']]);
  assert.deepEqual(dev({ action: 'profiles', epoch, klasId: b.id }).pupils.map((p) => p.name), ['Mo']);
  const one = dev({ action: 'profile', epoch, id: 'u1' });
  assert.deepEqual(one.progress.map((x) => [x.lessonId, x.stars]).sort(), [[1, 2], [2, 3]]);
  assert.equal(dev({ action: 'profile', epoch, id: 'zz' }).gone, true);

  const ov = teach({ action: 'overview' });
  assert.equal(ov.pupils.find((p) => p.id === 'u1').lessons[2], 3);
  assert.deepEqual(ov.classes.map((c) => c.pupils), [1, 1]);
  assert.deepEqual(sheets.get('Leerlingen').rows.slice(1).map((x) => x[0] + ':' + x[1]), ['5A:Lotte', '6B:Mo']);

  // Teacher: unlock, rename, reset, delete pupil, delete class.
  teach({ action: 'updateClass', id: a.id, unlockAll: true, name: '5A Zon' });
  assert.deepEqual(dev({ action: 'sync', epoch, klasId: a.id }).klas, { id: a.id, name: '5A Zon', unlockAll: true });
  teach({ action: 'resetPupil', id: 'u1' });
  assert.equal(dev({ action: 'profile', epoch, id: 'u1' }).progress.length, 0);
  teach({ action: 'deletePupil', id: 'u1' });
  // A device that still has Lotte hears she is gone, and she is not brought back.
  assert.deepEqual(dev({ action: 'sync', epoch, pupils: [{ id: 'u1' }], progress: [{ profileId: 'u1', lessonId: 1, stars: 3 }] }).gone, ['u1']);
  assert.equal(dev({ action: 'profiles', epoch, klasId: a.id }).pupils.length, 0);
  teach({ action: 'deleteClass', id: b.id });
  assert.equal(dev({ action: 'sync', epoch, klasId: b.id }).klas, null);
  assert.equal(teach({ action: 'overview' }).pupils.length, 0);
});

test('apps script v3: wiping the sheet makes every device start over', () => {
  const { dev, teach, sheets } = load();
  const { epoch } = dev({ action: 'ping' });
  const k = teach({ action: 'addClass', name: '5A' }).classes[0];
  dev({ action: 'sync', epoch, ops: [{ op: 'create', profileId: 'u1', klasId: k.id, name: 'Lotte', icon: '🦊' }] });
  const w = teach({ action: 'wipe' });
  assert.notEqual(w.epoch, epoch);
  assert.deepEqual(w.classes, []);
  assert.equal(sheets.get('Leerlingen').rows.length, 1); // header only
  // An old device is told to forget everything, and does not bring Lotte back.
  const res = dev({ action: 'sync', epoch, ops: [{ op: 'create', profileId: 'u1', klasId: k.id, name: 'Lotte' }] });
  assert.equal(res.reset, true);
  assert.equal(res.epoch, w.epoch);
  assert.equal(dev({ action: 'ping' }).epoch, w.epoch);
  assert.equal(teach({ action: 'overview' }).classes.length, 0);
});

test('apps script v3: tabs from an older version are kept aside as "(oud)"', () => {
  const { ctx, dev, sheets } = load();
  ctx.SpreadsheetApp.getActiveSpreadsheet().insertSheet('Leerlingen').appendRow(['Toestel', 'Leerling']);
  dev({ action: 'classes' });
  assert.ok(sheets.has('Leerlingen (oud)'));
  assert.equal(sheets.get('Leerlingen').rows[0][0], 'Klas');
});
