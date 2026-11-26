/**
 * Stroomkringen: centrale opslag in een Google Sheet (versie 3).
 *
 * Plak deze code in Extensies > Apps Script van een NIEUWE Google Sheet,
 * vul hieronder twee eigen codes in, en implementeer als web-app
 * (Uitvoeren als: ik, Toegang: iedereen). Zie google/KOPPELING.md.
 *
 * - Klassen, leerlingen en voortgang staan in deze sheet. De toestellen houden
 *   enkel een tijdelijke kopie bij.
 * - De Chromebooks gebruiken de TOESTELCODE (via de koppellink).
 * - Het leerkrachtendeel gebruikt de LEERKRACHTCODE: klassen beheren,
 *   overzicht, leerlingen resetten of verwijderen, de sheet volledig wissen.
 * Er worden alleen voornamen/bijnamen, icoontjes en sterren bewaard.
 */

// ▼▼▼ Vul hier je twee codes in (zonder spaties) ▼▼▼
const TOESTELCODE = 'kies-een-toestelcode';
const LEERKRACHTCODE = 'kies-een-geheime-leerkrachtcode';
// ▲▲▲ -------------------------------------------- ▲▲▲

const VERSION = 3;
const TABS = {
  Klassen: ['Klas', 'Alle lessen vrij', 'Aangemaakt', 'klas-id'],
  Leerlingen: ['Klas', 'Leerling', 'Icoon', 'Lessen klaar', 'Sterren', 'Laatste toestel', 'Laatst gezien', 'klas-id', 'leerling-id'],
  Voortgang: ['Klas', 'Leerling', 'Les', 'Titel', 'Sterren', 'Fouten', 'Hints', 'Klaar op', 'Toestel', 'leerling-id'],
};

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function props() {
  return PropertiesService.getScriptProperties();
}

/** Changes when the teacher wipes the sheet: devices then forget their copy. */
function epoch() {
  let e = props().getProperty('EPOCH');
  if (!e) {
    e = newEpoch();
    props().setProperty('EPOCH', e);
  }
  return e;
}

function newEpoch() {
  return Date.now().toString(36) + '-' + Utilities.getUuid().slice(0, 6);
}

function tab(name) {
  const header = TABS[name];
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

function rows(name) {
  const sh = tab(name);
  const last = sh.getLastRow();
  return last > 1 ? sh.getRange(2, 1, last - 1, TABS[name].length).getValues() : [];
}

function write(name, data) {
  const sh = tab(name);
  const width = TABS[name].length;
  const last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, width).clearContent();
  if (data.length) sh.getRange(2, 1, data.length, width).setValues(data);
}

const iso = (v) => (v instanceof Date ? v.toISOString() : v || '');
const date = (v) => (v ? new Date(v) : '');
const id = () => Utilities.getUuid().slice(0, 8);

/** Everything in memory: { classes: { id: {...} }, pupils: { id: { ..., lessons: { n: {...} } } } } */
function load() {
  const db = { classes: {}, pupils: {} };
  rows('Klassen').forEach((r) => {
    if (r[3]) db.classes[String(r[3])] = { id: String(r[3]), name: String(r[0]), unlockAll: r[1] === true || r[1] === 'ja', createdAt: iso(r[2]) };
  });
  rows('Leerlingen').forEach((r) => {
    if (r[8]) db.pupils[String(r[8])] = { id: String(r[8]), klasId: String(r[7]), name: String(r[1]), icon: String(r[2]), lastDevice: String(r[5]), lastSeen: iso(r[6]), lessons: {} };
  });
  rows('Voortgang').forEach((r) => {
    const p = db.pupils[String(r[9])];
    if (p) p.lessons[r[2]] = { lessonId: Number(r[2]), title: String(r[3]), stars: Number(r[4]) || 0, fails: Number(r[5]) || 0, hints: Number(r[6]) || 0, doneAt: iso(r[7]), device: String(r[8]) };
  });
  return db;
}

function save(db) {
  const cls = Object.keys(db.classes).map((k) => db.classes[k]).sort((a, b) => a.name.localeCompare(b.name));
  write('Klassen', cls.map((c) => [c.name, c.unlockAll ? 'ja' : 'nee', date(c.createdAt), c.id]));
  const className = (k) => (db.classes[k] ? db.classes[k].name : '?');
  const pupils = Object.keys(db.pupils).map((k) => db.pupils[k]).filter((p) => db.classes[p.klasId]);
  pupils.sort((a, b) => className(a.klasId).localeCompare(className(b.klasId)) || a.name.localeCompare(b.name));
  const pr = [];
  const lr = [];
  pupils.forEach((p) => {
    const lessons = Object.keys(p.lessons).map((k) => p.lessons[k]).sort((a, b) => a.lessonId - b.lessonId);
    pr.push([className(p.klasId), p.name, p.icon, lessons.length, lessons.reduce((n, l) => n + l.stars, 0), p.lastDevice || '', date(p.lastSeen), p.klasId, p.id]);
    lessons.forEach((l) => lr.push([className(p.klasId), p.name, l.lessonId, l.title, l.stars, l.fails, l.hints, date(l.doneAt), l.device || '', p.id]));
  });
  write('Leerlingen', pr);
  write('Voortgang', lr);
}

function summary(p) {
  const lessons = Object.keys(p.lessons).map((k) => p.lessons[k]);
  return { id: p.id, klasId: p.klasId, name: p.name, icon: p.icon, done: lessons.length, stars: lessons.reduce((n, l) => n + l.stars, 0), lastDevice: p.lastDevice, lastSeen: p.lastSeen };
}

function classList(db) {
  return Object.keys(db.classes).map((k) => {
    const c = db.classes[k];
    return { id: c.id, name: c.name, unlockAll: c.unlockAll, pupils: Object.keys(db.pupils).filter((p) => db.pupils[p].klasId === c.id).length };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

function withLock(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

// ---------- Device actions (TOESTELCODE) ----------

function deviceAction(body) {
  const a = body.action;
  if (a === 'ping') return { ok: true, version: VERSION, epoch: epoch() };
  // A device that still has data from before a wipe must forget it.
  if (body.epoch && body.epoch !== epoch()) return { ok: false, reset: true, epoch: epoch(), error: 'De gegevens zijn gewist door de leerkracht.' };
  if (a === 'classes') return { ok: true, epoch: epoch(), classes: classList(load()) };
  if (a === 'profiles') {
    const db = load();
    const list = Object.keys(db.pupils).map((k) => db.pupils[k]).filter((p) => p.klasId === String(body.klasId)).map(summary);
    const k = db.classes[String(body.klasId)];
    return { ok: true, epoch: epoch(), klas: k ? { id: k.id, name: k.name, unlockAll: k.unlockAll } : null, pupils: list };
  }
  if (a === 'profile') {
    const db = load();
    const p = db.pupils[String(body.id)];
    if (!p) return { ok: false, gone: true, error: 'Dit profiel bestaat niet meer.' };
    return { ok: true, pupil: summary(p), progress: Object.keys(p.lessons).map((k) => p.lessons[k]) };
  }
  if (a === 'sync') {
    return withLock(() => {
      const db = load();
      const deviceName = String(body.deviceName || 'Toestel').slice(0, 40);
      const now = new Date().toISOString();
      (body.ops || []).slice(0, 500).forEach((op) => {
        const pid = String(op.profileId);
        if (op.op === 'create' && db.classes[String(op.klasId)] && !db.pupils[pid]) {
          db.pupils[pid] = { id: pid, klasId: String(op.klasId), name: String(op.name).slice(0, 20), icon: String(op.icon || '').slice(0, 4), lastDevice: deviceName, lastSeen: now, lessons: {} };
        }
        if (op.op === 'delete') delete db.pupils[pid];
        if (op.op === 'reset' && db.pupils[pid]) db.pupils[pid].lessons = {};
      });
      const gone = [];
      (body.pupils || []).slice(0, 200).forEach((p) => {
        const cur = db.pupils[String(p.id)];
        if (!cur || !db.classes[cur.klasId]) return gone.push(String(p.id)); // deleted centrally: not brought back
        cur.lastDevice = deviceName;
        cur.lastSeen = now;
      });
      (body.progress || []).slice(0, 2000).forEach((r) => {
        const p = db.pupils[String(r.profileId)];
        if (!p) return;
        const old = p.lessons[r.lessonId];
        const stars = Number(r.stars) || 0;
        if (!old || stars > old.stars) {
          p.lessons[r.lessonId] = { lessonId: Number(r.lessonId), title: String(r.title || '').slice(0, 60), stars: stars, fails: Number(r.fails) || 0, hints: Number(r.hints) || 0, doneAt: r.doneAt || now, device: deviceName };
        }
      });
      save(db);
      const k = body.klasId ? db.classes[String(body.klasId)] : undefined;
      const klas = k ? { id: k.id, name: k.name, unlockAll: k.unlockAll } : body.klasId ? null : undefined;
      return { ok: true, epoch: epoch(), gone: gone, klas: klas, savedAt: now };
    });
  }
  return { ok: false, error: 'Onbekende vraag.' };
}

// ---------- Teacher actions (LEERKRACHTCODE) ----------

function teacherAction(body) {
  const a = body.action;
  if (a === 'teacherPing') return { ok: true, version: VERSION, epoch: epoch() };
  if (a === 'overview') {
    const db = load();
    const pupils = Object.keys(db.pupils).map((k) => {
      const p = db.pupils[k];
      const s = summary(p);
      s.lessons = {};
      Object.keys(p.lessons).forEach((n) => (s.lessons[n] = p.lessons[n].stars));
      return s;
    }).filter((p) => db.classes[p.klasId]);
    return { ok: true, classes: classList(db), pupils: pupils };
  }
  return withLock(() => {
    const db = load();
    if (a === 'addClass') {
      const name = String(body.name || '').trim().slice(0, 30);
      if (!name) return { ok: false, error: 'Geef de klas een naam.' };
      const c = { id: id(), name: name, unlockAll: false, createdAt: new Date().toISOString() };
      db.classes[c.id] = c;
    } else if (a === 'updateClass') {
      const c = db.classes[String(body.id)];
      if (!c) return { ok: false, error: 'Deze klas bestaat niet meer.' };
      if (body.name !== undefined) c.name = String(body.name).trim().slice(0, 30) || c.name;
      if (body.unlockAll !== undefined) c.unlockAll = Boolean(body.unlockAll);
    } else if (a === 'deleteClass') {
      const kid = String(body.id);
      delete db.classes[kid];
      Object.keys(db.pupils).forEach((k) => { if (db.pupils[k].klasId === kid) delete db.pupils[k]; });
    } else if (a === 'resetPupil') {
      if (db.pupils[String(body.id)]) db.pupils[String(body.id)].lessons = {};
    } else if (a === 'deletePupil') {
      delete db.pupils[String(body.id)];
    } else if (a === 'wipe') {
      db.classes = {};
      db.pupils = {};
      props().setProperty('EPOCH', newEpoch());
    } else {
      return { ok: false, error: 'Onbekende vraag.' };
    }
    save(db);
    return { ok: true, epoch: epoch(), classes: classList(db) };
  });
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json({ ok: false, error: 'Ongeldige gegevens.' });
  }
  if (body.leerkrachtcode !== undefined) {
    if (body.leerkrachtcode !== LEERKRACHTCODE) return json({ ok: false, error: 'De leerkrachtcode klopt niet.' });
    return json(teacherAction(body));
  }
  if (body.toestelcode !== TOESTELCODE) return json({ ok: false, error: 'De toestelcode klopt niet.' });
  return json(deviceAction(body));
}

/** Open the web-app address in a browser to check that it works. */
function doGet() {
  return ContentService.createTextOutput('Het Stroomkringen-script (versie ' + VERSION + ') werkt. Vul dit adres in de app in.');
}

/** Optional: run once from the editor to create the tabs. */
function setup() {
  Object.keys(TABS).forEach(tab);
  epoch();
}
