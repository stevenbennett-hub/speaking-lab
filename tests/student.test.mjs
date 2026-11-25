// Student experience (Slice 3): progress reading, studios, access, preview gating, script health.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import vm from "node:vm";

const read = p => readFileSync(new URL(p, import.meta.url), "utf8");
const json = p => JSON.parse(read(p));
const studios = json("../site/data/studios.json").experiences;
const units = json("../site/data/units.json");
const access = json("../site/data/access.json");
const journals = json("../site/data/journals.json").journals;

function progressWith(store) {
  const ctx = { localStorage: { getItem: k => (k in store ? store[k] : null) } };
  vm.runInNewContext(read("../site/js/progress.js"), ctx);
  return ctx.SLProgress;
}

test("progress: reads existing keys without changing them; 80% reading check + a practice test = completed", () => {
  const store = { "speakup-quiz-v1": JSON.stringify({ u: { 1: { best: 90 }, 2: { best: 60 } } }), "speakup-test-v1": JSON.stringify({ 1: { best: 70 } }) };
  const before = JSON.stringify(store);
  const P = progressWith(store);
  assert.deepEqual([P.unit(1).completed, P.unit(1).mastered, P.unit(1).started], [true, true, true]);
  assert.deepEqual([P.unit(2).completed, P.unit(2).mastered, P.unit(2).started], [false, false, true]);
  assert.deepEqual([P.unit(3).started, P.unit(3).quizBest], [false, null]);
  assert.equal(JSON.stringify(store), before, "nothing written");
  assert.equal(progressWith({ "speakup-quiz-v1": "not json" }).unit(1).started, false, "bad data is ignored, not fatal");
});

test("studios: coming-soon items have no link; available ones open a real site or an existing lab", () => {
  for (const x of studios) {
    assert.ok(x.title.en && x.title.es && x.blurb.en && x.blurb.es, x.id);
    assert.ok(x.units.length && x.units.every(u => u >= 1 && u <= 6) && x.units.includes(x.introduces), x.id);
    if (x.status === "coming") assert.ok(!x.href && !x.lab && !x.route, `${x.id} must not look functional`);
    else assert.ok(x.href ? /^https:\/\//.test(x.href) : x.route ? /^#\/(btp\/\d+|ai|research|research\/apa)$/.test(x.route) && (x.episode || x.content) && existsSync(new URL("../site/" + (x.episode || x.content), import.meta.url)) : units.labNames[x.lab], `${x.id} opens something real`);
  }
  const by = id => studios.find(x => x.id === id);
  assert.deepEqual(by("ad-detective").units, [6]); assert.equal(by("ad-detective").featured, true);
  assert.deepEqual(by("beyond-the-podium-ep1").units, [1]);
  assert.equal(by("research-studio").introduces, 2); assert.ok([3, 4, 5, 6].every(u => by("research-studio").units.includes(u)));
  assert.deepEqual(by("ai-coach").units, [1, 2, 3, 4, 5, 6]);
  assert.equal(by("apa-academy").audience, "col");
  for (const j of journals.filter(j => j.experience)) assert.ok(by(j.experience), `${j.id} links a known experience`);
});

test("teacher preview needs the teacher code; ?date= alone does nothing", () => {
  const boot = read("../site/js/boot.js");
  const gate = boot.indexOf('localStorage.getItem("speakup-teacher-ok")'), setp = boot.indexOf("SLSchedule.setPreviewDate(");
  assert.ok(gate > 0 && setp > gate, "preview is set only after the teacher check");
  // Slice 7: the development preview build may also use ?date= (dev is only true on the preview address with its
  // preview file; see tests/preview.test.mjs). On the student site the teacher code is still required.
  assert.match(boot, /var dev = !!\(B && B\.preview\);/);
  assert.match(boot, /if \(\(teacher \|\| dev\) && window\.SLSchedule\) preview = SLSchedule\.setPreviewDate/);
  assert.match(access.teacher.codeHash, /^[0-9a-f]{8}$/);
  const page = read("../site/index.html");
  assert.ok(page.includes('!k.startsWith("speakup-teacher-")'), "teacher unlock, drafts and preview are never copied into student backups");
});

test("new scripts parse and load after the page scripts", () => {
  for (const f of ["../site/js/student.js", "../site/js/progress.js", "../site/js/achievements.js", "../site/js/manage.js", "../site/js/teacher.js", "../site/js/boot.js", "../site/js/schedule.js", "../site/js/playbook.js"]) assert.doesNotThrow(() => new vm.Script(read(f)), f);
  assert.match(read("../site/js/boot.js"), /var AFTER = \["js\/progress\.js", "js\/achievements\.js", "js\/manage\.js", "js\/student\.js", "js\/teacher\.js", "js\/btp\.js", "js\/aistudio\.js", "js\/research\.js", "js\/playbook\.js"\];/, "Instructor Playbook (teacher-facing) loads last");
  assert.ok(read("../site/index.html").includes('<link rel="stylesheet" href="css/student.css">'));
});

test("student view keeps old links on the classic page and never shows locked content", () => {
  const s = read("../site/js/student.js");
  assert.match(s, /const isV2Hash = hs => hs === "" \|\| hs === "#" \|\| hs\.startsWith\("#\/"\);/);
  assert.match(s, /if \(!i\.open\) return/, "locked unit shows only its opening time");
  assert.match(s, /if \(day > t \|\| !S\.isOpen\(S\.lessonReleaseAt\(day, opts\(g\)\), now\(\)\)\)/, "future lessons stay closed");
  assert.match(s, /chooseLevel\("col", btn\)/, "college tile goes through the existing gate");
});
