// Achievements (Slice 4): criteria match real activities, no duplicate awards, progress untouched,
// teacher-verified and future badges never awarded online, accessible artwork, classic availability.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const read = p => readFileSync(new URL(p, import.meta.url), "utf8");
const cfg = JSON.parse(read("../site/data/achievements.json"));
const studios = JSON.parse(read("../site/data/studios.json")).experiences;
const page = read("../site/index.html");
const A = (() => { const c = {}; vm.runInNewContext(read("../site/js/achievements.js"), c); return c.SLAchieve; })();
const plain = x => JSON.parse(JSON.stringify(x));
const env = (store, labs) => ({ get: k => (k in store ? store[k] : null), labs: labs || {} });
const lab = (ids, mastered) => ids.map(id => ({ id, mastered: mastered.includes(id) }));
const RLAB = ["primary", "scholarly", "credibility", "evidence", "ai", "misinfo", "oral", "apa"];
const GLAB = ["roles", "jury", "votes", "groupthink", "conflict", "stages"];

test("configuration: every badge is bilingual, leveled, and uses only criteria the site can check", () => {
  const types = { quiz: 1, test: 1, lab: 1, labDone: 1, listenFinal: 1, audCheck: 1, improved: 1, btp: 1, ai: 1, teacher: 1, external: 1 };
  const ids = new Set();
  for (const b of cfg.badges) {
    assert.ok(!ids.has(b.id), `unique ${b.id}`); ids.add(b.id);
    assert.ok(["knowledge", "applied", "communication"].includes(b.level), b.id);
    assert.ok(["active", "pending-verification", "coming"].includes(b.status), b.id);
    for (const l of ["en", "es"]) assert.ok(b.title[l] && b.about[l], `${b.id} ${l}`);
    for (const c of b.criteria) { assert.ok(types[c.type], `${b.id} ${c.type}`); assert.ok(c.label.en && c.label.es, `${b.id} label`); }
    if (b.level === "communication") assert.equal(b.status, "pending-verification", `${b.id}: speaking mastery is teacher-verified only`);
    if (b.status === "active") assert.ok(b.criteria.every(c => c.type !== "teacher" && c.type !== "external"), `${b.id}: active badges use existing activities only`);
    if (b.status === "coming") assert.ok(b.criteria.some(c => c.type === "external" && studios.some(x => x.id === c.experience)), `${b.id}: names its future experience`);
    for (const i of b.integrations || []) assert.ok(studios.some(x => x.id === i), `${b.id} integration ${i}`);
    assert.ok(A.GLYPH[b.glyph], `${b.id} glyph`);
  }
  for (const n of ["Communication Explorer", "Active Listener", "Audience Awareness", "Source Detective", "Evidence Investigator", "Ethical Communicator", "Confident Speaker", "Master Storyteller", "Persuasion Detective", "Critical Thinker", "Bridge Builder", "Ethical AI User", "Independent Thinker", "Persistent Learner", "Master Communicator"])
    assert.ok(cfg.badges.some(b => b.title.en === n), n);
});

test("lab criteria name activities that exist in those labs", () => {
  const acts = { rlab: RLAB, glab: GLAB, plab: ["appeals", "cer", "fallacy", "rebuttal", "audience", "sources", "monroe", "builder"] };
  for (const b of cfg.badges) for (const c of b.criteria) if (c.type === "lab" || c.type === "labDone") c.acts.forEach(a => assert.ok(acts[c.lab].includes(a), `${b.id}: ${c.lab}.${a}`));
  assert.ok(page.includes('const ACTS = ["appeals", "cer", "fallacy", "rebuttal", "audience", "sources", "monroe", "builder"]'), "Persuasion Lab activity ids");
  assert.ok(page.includes('storageKey: "speakup-rlab-v1"') && page.includes('storageKey: "speakup-glab-v1"'));
});

test("nothing earned from an empty browser; teacher-verified and future badges never earned", () => {
  const src = A.collect(env({}));
  const res = A.evaluate(cfg, src, null);
  assert.ok(res.every(r => r.state !== "earned"));
  // Even with everything online done, communication and coming badges stay unearned.
  const full = A.collect(env({
    "speakup-quiz-v1": JSON.stringify({ u: { 1: { best: 100 }, 2: { best: 100 }, 3: { best: 100 }, 4: { best: 100 }, 5: { best: 100 }, 6: { best: 100 } } }),
    "speakup-test-v1": JSON.stringify({ 1: { best: 100 }, 2: { best: 100 }, 3: { best: 100 }, 4: { best: 100 }, 5: { best: 100 }, 6: { best: 100 } }),
    "speakup-aud-v1": JSON.stringify({ mc: { best: 10 } }), "speakup-listen-v1": JSON.stringify({ fin: { best: 100 } }),
    "speakup-plab-v1": JSON.stringify({ done: { appeals: true, fallacy: true } }),
    "speakup-btp-v1": JSON.stringify({ v: 1, eps: { ep1: { mastered: { detective: "2026-11-24", change: "2026-11-24", apply: "2026-11-24" } } } }),
    "speakup-ai-v1": JSON.stringify({ v: 1, mastered: { ethics: "2026-11-24", ownership: "2026-11-24", factcheck: "2026-11-24" } }),
  }, { rlab: lab(RLAB, RLAB), glab: lab(GLAB, GLAB) }));
  const r2 = A.evaluate(cfg, full, { v: 1, seen: {}, improved: { "quiz:1": "x", "quiz:2": "x", "test:3": "x" }, earned: {} });
  for (const r of r2) {
    if (r.status === "active") assert.equal(r.state, "earned", r.id);
    else assert.notEqual(r.state, "earned", `${r.id} must not be earned online`);
  }
});

test("each active badge follows its own criteria (and partial progress is shown, not awarded)", () => {
  const one = (store, labs) => Object.fromEntries(A.evaluate(cfg, A.collect(env(store, labs)), null).map(r => [r.id, r.state]));
  assert.equal(one({ "speakup-quiz-v1": JSON.stringify({ u: { 1: { best: 80 } } }) })["communication-explorer"], "earned");
  assert.equal(one({ "speakup-quiz-v1": JSON.stringify({ u: { 1: { best: 79 } } }) })["communication-explorer"], "progress");
  assert.equal(one({ "speakup-quiz-v1": JSON.stringify({ u: { 2: { best: 90 } } }) })["evidence-investigator"], "progress", "needs the test too");
  assert.equal(one({ "speakup-listen-v1": JSON.stringify({ fin: { best: 85 } }) })["active-listener"], "earned");
  assert.equal(one({ "speakup-aud-v1": JSON.stringify({ mc: { best: 7 } }) })["audience-awareness"], "progress");
  assert.equal(one({}, { rlab: lab(RLAB, ["primary", "scholarly", "credibility"]) })["source-detective"], "progress");
  assert.equal(one({}, { rlab: lab(RLAB, ["ai", "misinfo"]) })["ethical-ai-user"], "earned");
  assert.equal(one({}, { glab: lab(GLAB, GLAB) })["critical-thinker"], "earned");
  assert.equal(one({ "speakup-plab-v1": JSON.stringify({ done: { appeals: true } }) })["persuasion-detective"], "progress");
});

test("no duplicate awards: tracking twice changes nothing, and points are recalculated, not added up", () => {
  const src = A.collect(env({ "speakup-quiz-v1": JSON.stringify({ u: { 1: { best: 90 } } }) }));
  const a = A.track(cfg, src, null, "2026-09-02");
  assert.deepEqual(plain(a.newly), ["communication-explorer"]);
  const b = A.track(cfg, src, a.store, "2026-09-03");
  assert.deepEqual(plain(b.newly), []); assert.deepEqual(plain(b.store), plain(a.store));
  assert.equal(b.store.earned["communication-explorer"], "2026-09-02", "first-earned date kept");
  const p1 = A.points(cfg, src, A.evaluate(cfg, src, a.store)), p2 = A.points(cfg, src, A.evaluate(cfg, src, b.store));
  assert.equal(p1.total, p2.total); assert.equal(p1.total, cfg.points.quiz + cfg.points.badge);
});

test("persistent learner: improvement after a retry is recognized from the first score the site saw", () => {
  let s = null;
  const step = (u, best, day) => { const src = A.collect(env({ "speakup-quiz-v1": JSON.stringify({ u: Object.fromEntries(u.map((x, i) => [i + 1, { best: x }])) }) })); s = A.track(cfg, src, s, day).store; };
  step([50, 60, 40], [], "2026-09-01");
  assert.equal(Object.keys(s.improved).length, 0, "first sighting is the baseline");
  step([70, 60, 40], [], "2026-09-02");
  step([70, 85, 55], [], "2026-09-03");
  assert.equal(Object.keys(s.improved).length, 3);
  assert.equal(s.earned["persistent-learner"], "2026-09-03");
});

test("progress is preserved: the engine only reads the existing keys", () => {
  const store = { "speakup-quiz-v1": JSON.stringify({ u: { 1: { best: 90, refl: "x" } } }), "speakup-test-v1": "{}", "speakup-plab-v1": JSON.stringify({ done: { appeals: true } }) };
  const before = JSON.stringify(store);
  const src = A.collect(env(store)); A.track(cfg, src, null, "2026-09-02"); A.evaluate(cfg, src, null);
  assert.equal(JSON.stringify(store), before);
  assert.equal(A.collect(env({ "speakup-quiz-v1": "{broken" })).quiz[1], undefined, "bad data is ignored");
  assert.equal(A.KEY, "speakup-achieve-v1");
});

test("badge artwork is decorative and its state is always written in words", () => {
  for (const st of ["earned", "progress", "notstarted", "pending", "coming"]) {
    const svg = A.medallion(cfg.badges[0], st);
    assert.match(svg, /aria-hidden="true"/); assert.match(svg, /focusable="false"/);
    assert.ok(!/#[0-9a-f]{3,6}/i.test(svg), "theme tokens, not fixed colors (works in dark mode)");
  }
  const s = read("../site/js/student.js");
  assert.match(s, /const STATE_TXT = \{/); assert.match(s, /aria-label="\$\{L\("How to earn it"/);
  assert.match(read("../site/css/student.css"), /prefers-reduced-motion: no-preference\) \{ #sl2Toast/, "celebration animates only without reduced motion");
  assert.match(s, /setAttribute\("role", "status"\)/, "celebration is announced politely");
});

test("classic course guide follows the same release dates; teacher view opens future units", () => {
  const s = read("../site/js/student.js");
  assert.match(s, /const unitOpen = id => released\(id\) \|\| teacherOn\(\);/);
  assert.match(s, /window\.renderUnit = function \(\) \{[\s\S]*?if \(!unitOpen\(unitId\)\) \{ const el = \$id\("unitPanel"\); if \(el\) el\.innerHTML = lockedNotice\(unitId\);/);
  assert.match(s, /window\.renderTabs = function/);
  assert.match(s, /Released units stay open for review/);
  assert.match(s, /not a secure sign-in/, "the teacher code is described as a pacing control");
});

test("Voices of Change checks have their own key and copy over earlier answers once", () => {
  assert.ok(page.includes('KEY = "speakup-vcheck-v1", OLD = "speakup-listen-v1"'));
  const fn = page.match(/const migrateVoices = \(\) => \{[\s\S]*?\} catch \(e\) \{\} \};/)[0];
  const store = { "speakup-listen-v1": JSON.stringify({ tab: "open", fin: { best: 90 }, mlk: { first: { a: 1 }, pick: {}, done: {} } }) };
  const ls = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = v; } };
  const run = () => vm.runInNewContext(`const KEY = "speakup-vcheck-v1", OLD = "speakup-listen-v1"; ${fn} migrateVoices();`, { localStorage: ls, JSON, Object });
  run();
  assert.deepEqual(Object.keys(JSON.parse(store["speakup-vcheck-v1"])), ["mlk"]);
  assert.equal(JSON.parse(store["speakup-listen-v1"]).fin.best, 90, "Art of Listening record untouched");
  store["speakup-vcheck-v1"] = JSON.stringify({ mlk: { first: { a: 2 }, pick: {}, done: {} } }); run();
  assert.equal(JSON.parse(store["speakup-vcheck-v1"]).mlk.first.a, 2, "runs only once");
});
