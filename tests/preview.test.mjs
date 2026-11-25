// Development preview build (Slice 7): explicit switch, cannot activate on production, separate progress,
// college and teacher gates unchanged.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import vm from "node:vm";

const read = p => readFileSync(new URL(p, import.meta.url), "utf8");
const build = () => { const c = {}; vm.runInNewContext(read("../site/js/build.js"), c); return c.SLBuild; };
const B = build();
const loc = (pathname, hostname = "stevenbennett-hub.github.io") => ({ pathname, hostname });
const ON = { channel: "preview" };

test("preview turns on only at the preview address AND with the preview file", () => {
  assert.equal(B.decide(loc("/speaking-lab-preview/"), ON), true);
  assert.equal(B.decide(loc("/speaking-lab-preview/index.html"), ON), true);
  assert.equal(B.decide(loc("/speaking-lab-preview"), ON), true);
  // Production address: never, even if the file were somehow deployed there.
  assert.equal(B.decide(loc("/speaking-lab/"), ON), false);
  assert.equal(B.decide(loc("/speaking-lab/index.html"), ON), false);
  assert.equal(B.previewPlace(loc("/speaking-lab/")), false, "production never even requests data/preview.json");
  // Look-alike paths and missing or wrong files.
  assert.equal(B.decide(loc("/speaking-lab-previewx/"), ON), false);
  assert.equal(B.decide(loc("/x/speaking-lab-preview/"), ON), false);
  assert.equal(B.decide(loc("/speaking-lab-preview/"), null), false);
  assert.equal(B.decide(loc("/speaking-lab-preview/"), { channel: "production" }), false);
  assert.equal(B.decide(loc("/speaking-lab-preview/"), "preview"), false);
  // Local testing on this computer needs the file too.
  assert.equal(B.decide(loc("/", "localhost"), ON), true);
  assert.equal(B.decide(loc("/", "127.0.0.1"), null), false);
  assert.equal(B.preview, false, "off until activated");
});

test("the preview file is never committed, and the production workflow refuses it", () => {
  assert.equal(existsSync(new URL("../site/data/preview.json", import.meta.url)), false);
  const wf = read("../.github/workflows/deploy.yml");
  assert.match(wf, /test ! -e site\/data\/preview\.json/);
  assert.match(wf, /if: github\.ref == 'refs\/heads\/main'/);
  const prev = read("../docs/preview/deploy-preview.yml");
  assert.match(prev, /repository: stevenbennett-hub\/speaking-lab/); assert.match(prev, /ref: dev/);
  assert.ok(prev.indexOf("run: node --test") < prev.indexOf("echo"), "tests run before the preview file is added");
  assert.match(prev, /echo '\{ "channel": "preview" \}' > site\/data\/preview\.json/);
  assert.doesNotMatch(prev, /secrets\./, "no tokens needed");
});

test("boot asks for the preview file only at the preview address, and switches storage before reading progress", () => {
  const boot = read("../site/js/boot.js"), page = read("../site/index.html");
  assert.ok(page.indexOf('<script src="js/build.js"></script>') < page.indexOf('<script src="js/boot.js"></script>'));
  const place = boot.indexOf("B.previewPlace(location)"), fetchP = boot.indexOf('fetch("data/preview.json"');
  assert.ok(place > 0 && fetchP > place && boot.slice(place, fetchP).includes("?"), "the fetch is inside the preview-address branch");
  assert.equal((boot.match(/fetch\("data\/preview\.json"/g) || []).length, 1);
  const act = boot.indexOf("B.activate()"), cfg = boot.indexOf('fetch("data/config.json"'), teacher = boot.indexOf('localStorage.getItem("speakup-teacher-ok")');
  assert.ok(act > 0 && act < cfg && act < teacher, "storage is separated before anything reads saved progress");
  // ?date= : teacher code on the student site, or the preview build.
  assert.match(boot, /if \(\(teacher \|\| dev\) && window\.SLSchedule\) preview = SLSchedule\.setPreviewDate/);
  assert.match(boot, /DEVELOPMENT PREVIEW/);
});

test("only release dates change in preview: the college gate and teacher view are untouched", () => {
  const student = read("../site/js/student.js"), page = read("../site/index.html");
  assert.match(student, /const released = id => devPreview\(\) \|\| S\.isOpen\(releasedAt\(id\), now\(\)\);/);
  assert.equal((student.match(/devPreview\(\)/g) || []).length, 1, "used in exactly one place");
  assert.doesNotMatch(page.replace('<script src="js/build.js"></script>', ""), /SLBuild/, "the college gate in index.html does not know about preview");
  assert.match(student, /p === "col" && colUnlocked\(\)/, "college pathway still requires the college code");
  assert.match(student, /const teacherOn = \(\) => get\(K\.teacher\) === D\.access\.teacher\.codeHash;/);
  for (const f of ["teacher.js", "manage.js", "achievements.js", "btp.js", "aistudio.js", "schedule.js"]) assert.doesNotMatch(read(`../site/js/${f}`), /SLBuild/, `${f} has no preview behavior`);
  assert.equal(JSON.parse(read("../site/data/access.json")).college.enabled, false);
});

/** A tiny stand-in for the browser's Storage, with the same prototype shape. */
function fakeStorage() {
  class Storage { constructor() { Object.defineProperty(this, "_m", { value: new Map() }); } }
  Storage.prototype.getItem = function (k) { return this._m.has(String(k)) ? this._m.get(String(k)) : null; };
  Storage.prototype.setItem = function (k, v) { this._m.set(String(k), String(v)); };
  Storage.prototype.removeItem = function (k) { this._m.delete(String(k)); };
  Storage.prototype.key = function (i) { return [...this._m.keys()][i] ?? null; };
  Storage.prototype.clear = function () { this._m.clear(); };
  Object.defineProperty(Storage.prototype, "length", { configurable: true, get() { return this._m.size; } });
  return { Storage, local: new Storage(), session: new Storage() };
}

test("preview progress is kept apart: students' real progress is never read, changed or cleared", () => {
  const { Storage, local, session } = fakeStorage();
  local.setItem("speakup-quiz-v1", '{"u":{"1":{"best":90}}}'); local.setItem("addetective-v1", "real");
  assert.equal(B.namespaceStorage(local, Storage.prototype), true);
  assert.equal(B.namespaceStorage(local, Storage.prototype), false, "installed once");
  assert.equal(local.getItem("speakup-quiz-v1"), null, "preview does not see production progress");
  local.setItem("speakup-quiz-v1", '{"u":{"1":{"best":40}}}'); local.setItem("speakup-path", "hs");
  assert.equal(local.getItem("speakup-quiz-v1"), '{"u":{"1":{"best":40}}}');
  assert.equal(local.length, 2);
  assert.deepEqual([0, 1].map(i => local.key(i)).sort(), ["speakup-path", "speakup-quiz-v1"], "backups and progress readers see only preview keys");
  local.removeItem("speakup-path"); local.clear();
  assert.equal(local.length, 0);
  // Underneath, the real keys are intact.
  const raw = [...local._m.entries()];
  assert.deepEqual(raw, [["speakup-quiz-v1", '{"u":{"1":{"best":90}}}'], ["addetective-v1", "real"]]);
  // Other Storage objects (sessionStorage) are unaffected.
  session.setItem("a", "1"); assert.equal(session.getItem("a"), "1"); assert.equal(session.length, 1); assert.equal(session.key(0), "a");
});
