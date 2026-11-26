/**
 * Stroomkringen: centrale opslag in een Google Sheet (versie 2).
 *
 * Plak deze code in Extensies > Apps Script van een Google Sheet,
 * vul hieronder twee eigen codes in, en implementeer als web-app
 * (Uitvoeren als: ik, Toegang: iedereen). Zie google/KOPPELING.md.
 *
 * - De Chromebooks sturen hun voortgang met de KLASCODE. Per leerling
 *   wordt de voortgang van alle toestellen samengevoegd (beste sterren tellen).
 * - Met de KLASCODE kan een toestel ook een profiel terughalen dat op een
 *   ander toestel gemaakt is.
 * - Het leerkrachtendeel van de app leest alles met de LEERKRACHTCODE.
 * Er worden alleen voornamen/bijnamen, icoontjes en sterren bewaard.
 */

// ▼▼▼ Vul hier je twee codes in (zonder spaties) ▼▼▼
const KLASCODE = 'kies-een-klascode';
const LEERKRACHTCODE = 'kies-een-geheime-leerkrachtcode';
// ▲▲▲ ------------------------------------------ ▲▲▲

const SHEET_PUPILS = 'Leerlingen';
const SHEET_PROGRESS = 'Voortgang';
const PUPIL_HEADER = ['Leerling', 'Icoon', 'Lessen klaar', 'Sterren', 'Laatste toestel', 'Laatst gezien', 'leerling-id'];
const PROGRESS_HEADER = ['Leerling', 'Les', 'Titel', 'Sterren', 'Fouten', 'Hints', 'Klaar op', 'Toestel', 'Bijgewerkt', 'leerling-id'];

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Get a tab with the right header. A tab from an older version is renamed to "… (oud)". */
function sheet(name, header) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (sh && sh.getLastColumn() > 0) {
    const got = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].join('|');
    if (got !== header.join('|')) {
      const old = ss.getSheetByName(name + ' (oud)');
      if (old) ss.deleteSheet(old);
      sh.setName(name + ' (oud)');
      sh = null;
    }
  }
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(header);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, header.length).setFontWeight('bold');
  }
  return sh;
}

function readRows(sh, width) {
  const last = sh.getLastRow();
  return last > 1 ? sh.getRange(2, 1, last - 1, width).getValues() : [];
}

function writeRows(sh, width, rows) {
  const last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, width).clearContent();
  if (rows.length) sh.getRange(2, 1, rows.length, width).setValues(rows);
}

function iso(v) {
  return v instanceof Date ? v.toISOString() : v || '';
}

/** All pupils with their lessons: [{ id, name, icon, done, stars, lastDevice, lastSeen, lessons: { id: {...} } }] */
function loadAll() {
  const pupils = {};
  readRows(sheet(SHEET_PUPILS, PUPIL_HEADER), PUPIL_HEADER.length).forEach((r) => {
    pupils[String(r[6])] = { id: String(r[6]), name: r[0], icon: r[1], done: r[2], stars: r[3], lastDevice: r[4], lastSeen: iso(r[5]), lessons: {} };
  });
  readRows(sheet(SHEET_PROGRESS, PROGRESS_HEADER), PROGRESS_HEADER.length).forEach((r) => {
    const p = pupils[String(r[9])];
    if (p) p.lessons[r[1]] = { lessonId: Number(r[1]), title: r[2], stars: Number(r[3]) || 0, fails: Number(r[4]) || 0, hints: Number(r[5]) || 0, doneAt: iso(r[6]), device: r[7] };
  });
  return pupils;
}

function saveAll(pupils) {
  const now = new Date();
  const pupilRows = [];
  const progressRows = [];
  Object.keys(pupils).forEach((id) => {
    const p = pupils[id];
    const lessons = Object.keys(p.lessons).map((k) => p.lessons[k]).sort((a, b) => a.lessonId - b.lessonId);
    p.done = lessons.length;
    p.stars = lessons.reduce((n, l) => n + l.stars, 0);
    pupilRows.push([p.name, p.icon, p.done, p.stars, p.lastDevice || '', p.lastSeen ? new Date(p.lastSeen) : '', id]);
    lessons.forEach((l) => progressRows.push([p.name, l.lessonId, l.title, l.stars, l.fails, l.hints, l.doneAt ? new Date(l.doneAt) : '', l.device || '', now, id]));
  });
  pupilRows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  writeRows(sheet(SHEET_PUPILS, PUPIL_HEADER), PUPIL_HEADER.length, pupilRows);
  writeRows(sheet(SHEET_PROGRESS, PROGRESS_HEADER), PROGRESS_HEADER.length, progressRows);
}

/** Only what another device needs to find a profile (no progress details). */
function publicPupil(p) {
  return { id: p.id, name: p.name, icon: p.icon, done: p.done, stars: p.stars, lastDevice: p.lastDevice };
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json({ ok: false, error: 'Ongeldige gegevens.' });
  }
  if (body.klascode !== KLASCODE) return json({ ok: false, error: 'De klascode klopt niet.' });
  const action = body.action || 'sync';
  if (action === 'ping') return json({ ok: true, version: 2 });

  if (action === 'profiles') {
    const all = loadAll();
    return json({ ok: true, pupils: Object.keys(all).map((id) => publicPupil(all[id])) });
  }
  if (action === 'profile') {
    const p = loadAll()[String(body.id)];
    if (!p) return json({ ok: false, error: 'Dit profiel bestaat niet meer.' });
    return json({ ok: true, pupil: publicPupil(p), progress: Object.keys(p.lessons).map((k) => p.lessons[k]) });
  }
  if (action !== 'sync') return json({ ok: false, error: 'Onbekende vraag.' });

  const deviceName = String(body.deviceName || 'Toestel').slice(0, 40);
  const now = new Date().toISOString();
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const all = loadAll();
    // First what was deleted or reset on the device.
    (body.ops || []).slice(0, 500).forEach((op) => {
      const id = String(op.profileId);
      if (op.op === 'delete') delete all[id];
      if (op.op === 'reset' && all[id]) all[id].lessons = {};
    });
    // Then merge: the best result of every device counts.
    (body.pupils || []).slice(0, 200).forEach((p) => {
      const id = String(p.id);
      const cur = all[id] || (all[id] = { id: id, lessons: {} });
      cur.name = String(p.name).slice(0, 20);
      cur.icon = String(p.icon || '').slice(0, 4);
      cur.lastDevice = deviceName;
      cur.lastSeen = now;
    });
    (body.progress || []).slice(0, 2000).forEach((r) => {
      const p = all[String(r.profileId)];
      if (!p) return;
      const old = p.lessons[r.lessonId];
      const stars = Number(r.stars) || 0;
      if (!old || stars > old.stars || (stars === old.stars && String(r.doneAt) > String(old.doneAt))) {
        p.lessons[r.lessonId] = { lessonId: Number(r.lessonId), title: String(r.title || '').slice(0, 60), stars: stars, fails: Number(r.fails) || 0, hints: Number(r.hints) || 0, doneAt: r.doneAt || now, device: deviceName };
      }
    });
    saveAll(all);
  } finally {
    lock.releaseLock();
  }
  return json({ ok: true, savedAt: now });
}

/** Teacher overview: ?code=LEERKRACHTCODE */
function doGet(e) {
  const code = e && e.parameter && e.parameter.code;
  if (code !== LEERKRACHTCODE) return json({ ok: false, error: 'De leerkrachtcode klopt niet.' });
  const all = loadAll();
  const pupils = Object.keys(all).map((id) => {
    const p = all[id];
    const lessons = {};
    Object.keys(p.lessons).forEach((k) => (lessons[k] = p.lessons[k].stars));
    return { id: id, name: p.name, icon: p.icon, done: p.done, stars: p.stars, deviceName: p.lastDevice, lastSeen: p.lastSeen, lessons: lessons };
  });
  return json({ ok: true, version: 2, pupils: pupils });
}

/** Optional: run once from the editor to create the two tabs. */
function setup() {
  sheet(SHEET_PUPILS, PUPIL_HEADER);
  sheet(SHEET_PROGRESS, PROGRESS_HEADER);
}
