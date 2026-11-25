// Slice 12 refinements: dark default for first-time visitors (saved choices kept), lab feedback and unit-unlock sounds
// through the central audio manager, revised AI notes, substitute extensions limited to what has been taught, the
// spring exit reflection, the chosen sound files, and documentation that matches the new navigation.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import vm from "node:vm";

const read = p => readFileSync(new URL(p, import.meta.url), "utf8");
const json = p => JSON.parse(read(p));
const plain = x => JSON.parse(JSON.stringify(x));
const page = read("../site/index.html"), sound = read("../site/js/sound.js"), student = read("../site/js/student.js");

function env(stored) {
  const ls = new Map(Object.entries(stored || {})), made = [], timers = [];
  class Audio { constructor(src) { this.src = src; this.paused = true; this.ended = false; made.push(this); } setAttribute() {} addEventListener() {} play() { this.paused = false; return Promise.resolve(); } pause() { this.paused = true; } }
  const manifest = json("../site/media/sfx/manifest.json");
  const w = { localStorage: { getItem: k => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => ls.set(k, String(v)) }, Audio, setTimeout: f => timers.push(f),
    matchMedia: () => ({ matches: false }), fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve(manifest) }),
    document: { documentElement: { dataset: {} }, body: { classList: { contains: () => false } }, getElementById: () => null, querySelectorAll: () => [], querySelector: () => null, addEventListener: () => {} } };
  w.window = w; vm.runInNewContext(sound, w);
  return { S: w.SLSound, ls, made, timers };
}
const tick = () => new Promise(r => setTimeout(r, 0));

test("dark mode is the default for first-time visitors; saved choices and earlier visitors keep their look", () => {
  const script = page.slice(page.indexOf("/* Slice 12 refinement: dark is the default"), page.indexOf("</script>", page.indexOf("/* Slice 12 refinement: dark is the default")));
  const run = stored => { const ls = new Map(Object.entries(stored)); const d = { dataset: {} }; vm.runInNewContext(script, { localStorage: { getItem: k => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => ls.set(k, v) }, document: { documentElement: d } }); return [d.dataset.theme, ls.get("speakup-theme")]; };
  assert.deepEqual(run({}), ["dark", undefined], "first visit: dark");
  assert.deepEqual(run({ "speakup-theme": "light" }), ["light", "light"], "a saved light choice is kept");
  assert.deepEqual(run({ "speakup-theme": "dark" }), ["dark", "dark"]);
  assert.deepEqual(run({ "speakup-path": "hs" }), ["light", "light"], "a student who used the site before keeps the light look they had");
  assert.match(read("../site/js/app.js"), /localStorage\.setItem\("speakup-theme", t\.value\)/, "Preferences still saves the choice");
});

test("lab feedback: one more correct result plays correct-answer, one more wrong result plays try-again", async () => {
  const { S, made, timers } = env({ "speakup-prefs-v1": JSON.stringify({ v: 1, sound: true, ach: true, volume: 60 }) }); S._arm();
  const counts = { ok: 1, no: 0 }, pane = { querySelectorAll: sel => ({ length: /\.ok/.test(sel) ? counts.ok : counts.no }) };
  const click = () => ({ target: { closest: sel => (sel === ".labpane" ? pane : {}) } });
  S.labFeedback(click()); counts.ok = 2; timers.shift()(); await tick(); await tick();
  assert.equal(made.length, 1); assert.match(made[0].src, /correct-answer\.mp3$/);
  made[0].paused = true; // finished
  S.labFeedback(click()); counts.no = 1; timers.shift()(); await tick(); await tick();
  assert.match(made[1].src, /try-again\.mp3$/);
  made[1].paused = true;
  S.labFeedback(click()); timers.shift()(); await tick(); await tick();
  assert.equal(made.length, 2, "no new result (a re-render, a language change): no sound");
  S.labFeedback({ target: { closest: () => null } }); assert.equal(timers.length, 0, "outside a lab: nothing");
  assert.match(sound, /document\.addEventListener\("click", labFeedback, true\)/, "wired once, centrally; the labs' own code is unchanged");
  const off = env(); off.S._arm(); off.S.labFeedback(click()); counts.ok = 3; off.timers.shift()(); await tick(); assert.equal(off.made.length, 0, "sound off by default");
});

test("unit unlock: once, only when a student deliberately opens a newly available unit; never on page load", async () => {
  const { S, ls, made } = env({ "speakup-prefs-v1": JSON.stringify({ v: 1, sound: true, ach: true }) }); S._arm();
  assert.equal(S.unitOpened(null, [1], false), false, "first visit records open units silently");
  assert.deepEqual(JSON.parse(ls.get("speakup-unlock-v1")).seen, [1]);
  assert.equal(S.unitOpened(1, [1], true), false, "already-open unit: no sound");
  assert.equal(S.unitOpened(2, [1, 2], true), true, "a newly available unit opened on purpose");
  await tick(); await tick(); assert.match(made[0].src, /unit-unlock\.mp3$/);
  assert.equal(S.unitOpened(2, [1, 2], true), false, "never twice");
  assert.equal(S.unitOpened(3, [1, 2, 3], false), false, "opened by a page load: recorded, silent");
  assert.equal(S.unitOpened(3, [1, 2, 3], true), false);
  assert.match(student, /SLSound\.unitOpened\(route\.id, openUnitIds\(\), booted\);\n    booted = true;/, "the first route after loading is never 'deliberate'");
});

test("substitute extensions match what the class has been taught; no rehearsal before the speech is assigned", () => {
  const P = (() => { const c = {}; vm.runInNewContext(read("../site/js/playbook.js"), c); return c.SLPlaybook; })();
  const pb = json("../site/data/playbook/unit-1.json"), u = json("../site/data/units.json").units[0];
  assert.equal(pb.overview.speechAssigned, "w01d4");
  const order = Object.keys(pb.lessons);
  for (let i = 0; i < order.length; i++) {
    const soFar = order.slice(0, i + 1), x = plain(P.subExtensions(pb, soFar, u));
    assert.equal(x.rehearsal, order[i] >= "w01d4", `${order[i]}: rehearsal only once the speech is assigned`);
    const taughtLabs = soFar.flatMap(k => pb.lessons[k].phases.map(p => p.lab).filter(Boolean));
    for (const l of x.labs) assert.ok(taughtLabs.includes(l) || pb.overview.subStarter.labs.includes(l), `${order[i]}: ${l} has been taught or is a starter lab`);
    const rows = plain(P.subTimeline(pb, [pb.lessons[order[i]]], { journal: true, labs: x.labs, reads: x.reads, speechWeek: x.rehearsal }));
    if (!x.rehearsal) assert.doesNotMatch(JSON.stringify(rows), /rehearse|note card/i, `${order[i]}: no speech rehearsal yet`);
    assert.equal(rows[rows.length - 1].to, 90);
  }
  assert.deepEqual(plain(P.subExtensions(pb, ["w01d1"], u)).labs, ["listenlab", "audlab"], "first day: listening and audience practice");
});

test("spring exit: the skipped Journal 3 prompt becomes the w01d4 exit; numbering untouched", () => {
  const P = (() => { const c = {}; vm.runInNewContext(read("../site/js/playbook.js"), c); return c.SLPlaybook; })();
  const pb = json("../site/data/playbook/unit-1.json"), J = json("../site/data/journals.json").journals, j03 = J.find(j => j.id === "j03");
  assert.deepEqual(plain(P.exitFor(pb, "w01d4", ["j01", "j02", "j04", "j05"], J)), { text: j03.prompt.en, from: "j03" }, "spring odd skips j03");
  assert.deepEqual(plain(P.exitFor(pb, "w01d4", ["j01", "j02", "j03", "j04", "j05"], J)), { text: pb.lessons.w01d4.exit, from: null }, "when Journal 3 is used, the lesson's own exit");
  assert.equal(pb.overview.exitFromJournal[0].status, "draft");
  assert.equal(json("../site/data/lessons.json").days.w01d4.exit, undefined, "lessons.json unchanged");
});

test("the chosen sound files are in place, small and recorded in the manifest", () => {
  const m = json("../site/media/sfx/manifest.json");
  for (const f of m.files) { assert.equal(f.present, true, f.id); const sz = statSync(new URL(`../site/media/sfx/${f.file}`, import.meta.url)).size; assert.ok(sz > 1000 && sz < 40000, `${f.file}: ${sz} bytes`); assert.equal(f.bytes, sz); }
  assert.equal(m.reviewed, false, "the library is reviewed only when Mr. Bennett says so");
});

test("documentation and in-app instructions match the new navigation", () => {
  assert.doesNotMatch(read("../docs/pilot/PILOT_GUIDE.md"), /Top bar → \*\*My work\*\*/);
  assert.match(read("../docs/pilot/PILOT_GUIDE.md"), /Preferences\*\* \(top right\) → \*\*Back up or restore my progress\*\*/);
  assert.match(page, /open Speak Up, go to <b>Preferences → Back up or restore my progress<\/b>/, "the backup dialog points to Preferences");
  assert.doesNotMatch(read("../docs/RELEASE_CHECKLIST.md"), /"My work → Download/);
  for (const f of ["../docs/pilot/PILOT_GUIDE.md", "../docs/playbook/DAILY_WORKFLOW.md", "../docs/TEACHER_WORKFLOW_TEST.md"]) assert.match(read(f), /not (a password or )?secure sign-in/i, `${f}: the teacher code is described honestly`);
});
