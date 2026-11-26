/**
 * Stroomkringen: centrale opslag in een Google Sheet.
 *
 * Plak deze code in Extensies > Apps Script van een (lege) Google Sheet,
 * kies hieronder twee eigen codes, en implementeer als web-app
 * (Uitvoeren als: ik, Toegang: iedereen). Zie google/KOPPELING.md.
 *
 * - De Chromebooks sturen hun voortgang (POST) met de KLASCODE.
 * - Het leerkrachtendeel van de app leest alles (GET) met de LEERKRACHTCODE.
 * Er worden alleen voornamen/bijnamen en sterren bewaard.
 */

// ▼▼▼ Kies hier twee eigen codes (zonder spaties) ▼▼▼
const KLASCODE = 'kies-een-klascode';
const LEERKRACHTCODE = 'kies-een-geheime-leerkrachtcode';
// ▲▲▲ ---------------------------------------------- ▲▲▲

const SHEET_PROGRESS = 'Voortgang';
const SHEET_PUPILS = 'Leerlingen';
const PROGRESS_HEADER = ['Toestel', 'Leerling', 'Icoon', 'Les', 'Titel', 'Sterren', 'Fouten', 'Hints', 'Klaar op', 'Bijgewerkt', 'toestel-id', 'leerling-id'];
const PUPIL_HEADER = ['Toestel', 'Leerling', 'Icoon', 'Lessen klaar', 'Sterren', 'Laatst gezien', 'toestel-id', 'leerling-id'];

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function sheet(name, header) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(header);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, header.length).setFontWeight('bold');
  }
  return sh;
}

/** Replace all rows of one device in a sheet. idCol is the 1-based column with the device id. */
function replaceDeviceRows(sh, header, idCol, deviceId, rows) {
  const last = sh.getLastRow();
  const keep = last > 1 ? sh.getRange(2, 1, last - 1, header.length).getValues().filter((r) => String(r[idCol - 1]) !== deviceId) : [];
  const all = keep.concat(rows);
  if (last > 1) sh.getRange(2, 1, last - 1, header.length).clearContent();
  if (all.length) sh.getRange(2, 1, all.length, header.length).setValues(all);
}

/** A Chromebook sends its full state: { klascode, deviceId, deviceName, pupils: [...], progress: [...] } */
function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json({ ok: false, error: 'Ongeldige gegevens.' });
  }
  if (body.klascode !== KLASCODE) return json({ ok: false, error: 'De klascode klopt niet.' });
  if (body.action === 'ping') return json({ ok: true });
  const deviceId = String(body.deviceId || '').slice(0, 40);
  if (!deviceId) return json({ ok: false, error: 'Toestel onbekend.' });
  const deviceName = String(body.deviceName || 'Toestel').slice(0, 40);
  const now = new Date();

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const names = {};
    const pupils = (body.pupils || []).slice(0, 200).map((p) => {
      names[p.id] = p;
      return [deviceName, String(p.name).slice(0, 20), String(p.icon || '').slice(0, 4), Number(p.done) || 0, Number(p.stars) || 0, now, deviceId, String(p.id)];
    });
    const progress = (body.progress || []).slice(0, 2000).map((r) => {
      const p = names[r.profileId] || {};
      return [deviceName, String(p.name || '?').slice(0, 20), String(p.icon || '').slice(0, 4), Number(r.lessonId), String(r.title || '').slice(0, 60), Number(r.stars) || 0, Number(r.fails) || 0, Number(r.hints) || 0, r.doneAt ? new Date(r.doneAt) : '', now, deviceId, String(r.profileId)];
    });
    replaceDeviceRows(sheet(SHEET_PUPILS, PUPIL_HEADER), PUPIL_HEADER, 7, deviceId, pupils);
    replaceDeviceRows(sheet(SHEET_PROGRESS, PROGRESS_HEADER), PROGRESS_HEADER, 11, deviceId, progress);
  } finally {
    lock.releaseLock();
  }
  return json({ ok: true, savedAt: now.toISOString() });
}

/** The teacher area asks for everything: ?code=LEERKRACHTCODE */
function doGet(e) {
  const code = e && e.parameter && e.parameter.code;
  if (code !== LEERKRACHTCODE) return json({ ok: false, error: 'De leerkrachtcode klopt niet.' });
  const read = (name, header) => {
    const sh = sheet(name, header);
    const last = sh.getLastRow();
    return last > 1 ? sh.getRange(2, 1, last - 1, header.length).getValues() : [];
  };
  const pupils = read(SHEET_PUPILS, PUPIL_HEADER).map((r) => ({
    deviceName: r[0], name: r[1], icon: r[2], done: r[3], stars: r[4], lastSeen: r[5] instanceof Date ? r[5].toISOString() : r[5], deviceId: r[6], profileId: String(r[7]), lessons: {},
  }));
  const byKey = {};
  pupils.forEach((p) => (byKey[p.deviceId + ':' + p.profileId] = p));
  read(SHEET_PROGRESS, PROGRESS_HEADER).forEach((r) => {
    const p = byKey[r[10] + ':' + r[11]];
    if (p) p.lessons[r[3]] = r[5];
  });
  return json({ ok: true, pupils: pupils });
}

/** Optional: run once from the editor to create the two tabs. */
function setup() {
  sheet(SHEET_PUPILS, PUPIL_HEADER);
  sheet(SHEET_PROGRESS, PROGRESS_HEADER);
}
