// Slice 12: the unified application. Audio manager (off by default, intentional interaction, no overlap, never over
// video or presentations, missing files fail silently, volume), motion preferences, celebration integrity, Learning
// Labs and Resources built from existing data, full-block substitute plans, one authoritative AI permission.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import vm from "node:vm";

const read = p => readFileSync(new URL(p, import.meta.url), "utf8");
const json = p => JSON.parse(read(p));
const plain = x => JSON.parse(JSON.stringify(x));
const student = read("../site/js/student.js"), app = read("../site/js/app.js"), sound = read("../site/js/sound.js"), cele = read("../site/js/celebrate.js"), pbjs = read("../site/js/playbook.js");

/* A small browser stand-in for js/sound.js. */
function soundEnv({ stored, media = [], present = false, reduce = false, presenting = false } = {}) {
  const ls = new Map(stored ? [["speakup-prefs-v1", JSON.stringify(stored)]] : []), made = [], listeners = {};
  class Audio { constructor(src) { this.src = src; this.paused = true; this.ended = false; this.volume = 1; made.push(this); } setAttribute() {} addEventListener() {} play() { this.paused = false; return Promise.resolve(); } pause() { this.paused = true; } }
  const doc = {
    documentElement: { dataset: {} }, body: { classList: { contains: c => presenting && c === "sl2-present" } },
    getElementById: () => null, querySelectorAll: () => media, querySelector: () => null,
    addEventListener: (t, f) => { (listeners[t] = listeners[t] || []).push(f); },
  };
  const manifest = { files: json("../site/media/sfx/manifest.json").files.map(f => ({ ...f, present })) };
  const w = { localStorage: { getItem: k => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => ls.set(k, String(v)) }, document: doc, Audio,
    matchMedia: () => ({ matches: reduce }), fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve(manifest) }) };
  w.window = w; vm.runInNewContext(sound, w);
  return { S: w.SLSound, ls, made, doc, listeners };
}

test("audio is off by default; preferences persist in speakup-prefs-v1", () => {
  const { S, ls } = soundEnv();
  assert.deepEqual(plain(S.prefs()), { v: 1, sound: false, ui: false, ach: false, volume: 60, anim: true, motion: "device" });
  assert.equal(S.blocked("correct"), "off");
  S.set({ sound: true, ach: true, volume: 40 });
  assert.equal(JSON.parse(ls.get("speakup-prefs-v1")).volume, 40);
  assert.equal(soundEnv({ stored: JSON.parse(ls.get("speakup-prefs-v1")) }).S.prefs().sound, true, "a new page load reads the saved choice");
  S.quiet(); assert.deepEqual([S.prefs().sound, S.prefs().ui, S.prefs().ach], [false, false, false], "Quiet Classroom turns every sound off");
  assert.equal(S.prefs().anim, true, "visual feedback stays on");
});

test("sound needs an intentional interaction, respects channels and never plays on page load", async () => {
  const { S, made } = soundEnv({ stored: { v: 1, sound: true, ui: false, ach: true, volume: 50 }, present: true });
  assert.equal(S.blocked("correct"), "no-interaction", "nothing plays until the student interacts after the page loads");
  assert.equal(made.length, 0, "loading the page creates no audio");
  S._arm();
  assert.equal(S.blocked("ui"), "channel-off", "interface sounds need their own opt-in");
  assert.equal(S.blocked("correct"), null);
  assert.equal(await S.cue("correct"), true);
  assert.equal(made.length, 1); assert.equal(made[0].volume, 0.5, "volume setting is applied");
  assert.match(made[0].src, /^media\/sfx\/correct-answer\.mp3$/, "local files only");
});

test("no overlapping sounds; an achievement may replace feedback, never the reverse", async () => {
  const { S, made } = soundEnv({ stored: { v: 1, sound: true, ui: true, ach: true, volume: 60 }, present: true }); S._arm();
  await S.cue("correct");
  assert.equal(S.blocked("tryagain"), "busy", "same priority waits");
  assert.equal(S.blocked("ui"), "busy", "an interface sound never interrupts feedback");
  assert.equal(S.blocked("badge-applied"), null, "an achievement sound may replace it");
  await S.cue("badge-applied"); assert.equal(made[0].paused, true, "the earlier sound stopped"); assert.equal(made.length, 2);
});

test("never over a playing video or recording, or in presentation mode; missing files fail silently", async () => {
  const on = { v: 1, sound: true, ui: true, ach: true, volume: 60 };
  const v = soundEnv({ stored: on, present: true, media: [{ paused: false, ended: false, currentTime: 3 }] }); v.S._arm();
  assert.equal(v.S.blocked("correct"), "media-playing");
  const p = soundEnv({ stored: on, present: true, presenting: true }); p.S._arm();
  assert.equal(p.S.blocked("correct"), "presenting");
  const m = soundEnv({ stored: on, present: false }); m.S._arm();
  assert.equal(await m.S.cue("correct"), false); assert.equal(m.made.length, 0, "a file not marked present is never requested");
  assert.equal(await m.S.cue("nonsense"), false);
});

test("motion: device reduced-motion and the student's setting; animations toggle", () => {
  assert.equal(soundEnv({ reduce: true }).S.reducedMotion(), true, "follows the device setting");
  assert.equal(soundEnv({ stored: { v: 1, motion: "reduce" } }).S.reducedMotion(), true);
  const a = soundEnv({ stored: { v: 1, anim: false } });
  assert.equal(a.S.animations(), false); assert.equal(a.doc.documentElement.dataset.anim, "off");
  const css = read("../site/css/app.css");
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.slc \* \{ animation: none !important; \}/);
  assert.match(css, /:root\[data-motion="reduce"\] \.slc \*, :root\[data-anim="off"\] \.slc \* \{ animation: none !important; \}/);
  assert.match(css, /--t-fast: 140ms; --t-med: 200ms; --t-slow: 250ms;/, "120–250 ms interface transitions");
});

test("sound library: manifest matches the files, local hosting, no ElevenLabs calls or keys", () => {
  const m = json("../site/media/sfx/manifest.json");
  assert.equal(m.files.length, 11);
  for (const f of m.files) assert.equal(f.present, existsSync(new URL(`../site/media/sfx/${f.file}`, import.meta.url)), `${f.file}: present must match the folder`);
  assert.match(m.generator, /ElevenLabs/); if (m.reviewed === true) assert.ok(m.files.every(f => f.present), "reviewed only once every file is in place");
  const all = ["student", "app", "sound", "celebrate", "teacher", "playbook", "btp", "aistudio", "research"].map(f => read(`../site/js/${f}.js`)).join("\n");
  assert.doesNotMatch(all, /api\.elevenlabs|xi-api-key|elevenlabs\.io\/v1/i, "students' browsers never call ElevenLabs");
  const plays = [...all.matchAll(/new (root\.)?Audio\(/g)].length;
  assert.equal(plays, 1, "one place plays interface sounds: js/sound.js");
  assert.doesNotMatch(sound, /\.autoplay\s*=|autoplay=|setAttribute\("autoplay"/, "never autoplays");
});

test("celebrations only for badges earned while the page is open; never on load, refresh, restore or import", () => {
  assert.match(student, /if \(t\.newly\.length && achPrimed\) celebrate\(t\.newly\);\n    achPrimed = true;/);
  assert.ok(student.indexOf("try { achState(); } catch (e) {} // records anything already earned, silently") < student.indexOf("window.SL2 = {"), "the first evaluation on each page load is silent");
  assert.match(read("../site/index.html"), /setTimeout\(\(\) => location\.reload\(\), 900\)/, "restoring a backup reloads the page, so the restored badges are recorded silently");
  assert.doesNotMatch(cele, /localStorage|setItem|SLAchieve\.track|points\(/, "the celebration never writes progress, points or badges");
  assert.match(cele, /filter\(b => b && \(o\.demo \|\| b\.status === "active"\)\)/, "pending teacher-verified badges are never celebrated for students");
  assert.match(cele, /if \(e\.key === "Escape"\) \{ e\.preventDefault\(\); close\(\); return; \}/, "dismiss at once");
  assert.match(cele, /if \(isOpen\(\)\) \{ queue = queue\.concat\(items\); render\(\); return true; \}/, "several at once: one after another");
  assert.match(cele, /href="#\/certificate\//, "route to the certificate, which links back to My Achievements (portable achievements update)");
});

test("the engine never awards twice; demonstration mode changes nothing", () => {
  const c = {}; vm.runInNewContext(read("../site/js/achievements.js"), c); const A = c.SLAchieve, cfg = json("../site/data/achievements.json");
  const get = k => (k === "speakup-quiz-v1" ? JSON.stringify({ u: { 1: { best: 90 } } }) : null);
  const src = A.collect({ get, labs: {} });
  const one = A.track(cfg, src, null, "2026-08-20"), two = A.track(cfg, src, one.store, "2026-08-21");
  assert.deepEqual(plain(one.newly), ["communication-explorer"]); assert.deepEqual(plain(two.newly), [], "repeating the activity earns nothing new");
  assert.equal(two.store.earned["communication-explorer"], "2026-08-20", "the first date is kept");
  const pts = A.points(cfg, src, A.evaluate(cfg, src, two.store)).total;
  assert.equal(pts, A.points(cfg, src, A.evaluate(cfg, src, one.store)).total, "points are recalculated, never added twice");
  assert.match(app, /SLCelebrate\.show\([^;]*\{ demo: true, points: D\.achievements\.points\.badge \}\)/);
  assert.match(app, /if \(!b \|\| !X\.teacherOn\(\)\) return;/, "demonstration only in teacher view");
  for (const b of cfg.badges.filter(b => b.level === "communication")) assert.equal(b.status, "pending-verification", `${b.id} stays protected`);
});

test("Learning Labs: every listed activity exists; unavailable ones never link; progress from real records", () => {
  const cat = json("../site/data/activities.json"), units = json("../site/data/units.json"), studios = json("../site/data/studios.json").experiences;
  for (const a of cat.activities) {
    if (a.kind === "lab") assert.ok(units.labNames[a.id], `${a.id} is a real lab`);
    if (a.kind === "studio") assert.ok(studios.find(x => x.id === a.id), `${a.id} is a real studio`);
    for (const s of a.skills) assert.ok(cat.skills[s], `${a.id}: skill ${s}`); assert.ok(cat.types[a.type], `${a.id}: type`);
  }
  for (const id of Object.keys(units.labNames)) assert.ok(cat.activities.some(a => a.id === id), `${id} is in Learning Labs`);
  for (const x of studios) assert.ok(cat.activities.some(a => a.id === x.id), `${x.id} is in Learning Labs`);
  assert.match(app, /const href = avail && unitOk \?/, "a studio links only when it is available and its unit is open");
  assert.match(app, /if \(x\.audience === "col" && !isCol\(\)\) return null;/, "college-only studios stay hidden");
  assert.doesNotMatch(app, /estimated|minutes to complete/i, "no invented completion times");
  for (const id of [...cat.portfolio.independent, ...cat.portfolio.milestone]) assert.ok(json("../site/data/achievements.json").badges.some(b => b.id === id), id);
  assert.equal(cat.status, "draft");
});

test("Today's Lesson shows readings, videos, AI permission, reminders and progress from the existing data", () => {
  const day = student.slice(student.indexOf("function viewDay("), student.indexOf("/* ---------- archive"));
  for (const k of ["CH[c]", "VIDEOS[u.id]", "SPEECHES", "aiCard(M.ai)", "Assignment reminder", "My progress in this unit", "Success criteria", "sl2-journal", "Stand and share"]) assert.ok(day.includes(k), k);
  assert.match(student, /Opening a page never counts as mastery/);
});

test("preferences: pathway through the existing gate; college stays off by default; codes are not security", () => {
  assert.match(app, /if \(v === "col"\) \{ chooseLevel\("col", t\);/, "college goes through the existing instructor gate");
  assert.equal(json("../site/data/access.json").college.enabled, false);
  assert.match(app, /not a secure sign-in/);
  assert.match(student, /function choosePath\(p, btn, stay\)/);
  assert.match(read("../site/index.html"), /if \(!window\.confirm\(es \?/, "restore asks before replacing saved work");
});

/* ---------- teacher workflow ---------- */
const P = (() => { const c = {}; vm.runInNewContext(pbjs, c); return c.SLPlaybook; })();
const pb = json("../site/data/playbook/unit-1.json");
const runs = {
  "fall-odd": [["w01d1"], ["w01d1", "w01d2"], ["w01d3", "w01d4"], ["w01d5"], ["w02d1", "w02d2", "w02d3"], ["w02d4", "w02d5"]],
  "fall-even": [["w01d1"], ["w01d1", "w01d2", "w01d3"], ["w01d4", "w01d5"], ["w02d1", "w02d2"], ["w02d3", "w02d4"], ["w02d5"]],
  "spring-odd": [["w01d1", "w01d2", "w01d3"], ["w01d4", "w01d5"], ["w02d1", "w02d2", "w02d3"], ["w02d4", "w02d5"]],
  "spring-even": [["w01d1", "w01d2", "w01d3"], ["w01d4", "w01d5"], ["w02d1", "w02d2"], ["w02d3", "w02d4"], ["w02d5"]],
};
test("substitute plans account for the whole 90-minute block in every Unit 1 meeting", () => {
  for (const [name, meetings] of Object.entries(runs)) {
    const taught = [];
    for (const keys of meetings) {
      const segs = keys.filter(k => !taught.includes(k)).map(k => pb.lessons[k]);
      const rows = plain(P.subTimeline(pb, segs, { journal: true, labs: ["Communication Model Lab"], reads: ["Ch. 1"] }));
      const where = `${name} ${keys}`;
      assert.equal(rows[0].from, 0); assert.equal(rows[rows.length - 1].to, 90, `${where}: ends at 90`);
      rows.forEach((r, i) => { assert.ok(r.to > r.from, where); if (i) assert.equal(r.from, rows[i - 1].to, `${where}: no gaps`); });
      for (const k of ["journal", "exit", "final"]) assert.ok(rows.some(r => r.kind === k), `${where}: ${k}`);
      assert.ok(rows.some(r => r.kind === "practice" || r.kind === "lesson"), `${where}: meaningful practice`);
      assert.doesNotMatch(JSON.stringify(rows), /score (the )?speeches|grade (the )?speech/i, `${where}: substitutes never grade speeches`);
      keys.forEach(k => { if (!taught.includes(k)) taught.push(k); });
    }
  }
  assert.match(pbjs, /<h3>Plan \(all 90 minutes\)<\/h3>/);
});

test("one authoritative AI permission; contradicting playbook notes are flagged, not changed", () => {
  const days = json("../site/data/lessons.json").days, perm = json("../site/data/ai-permissions.json");
  const cl = plain(P.aiConflicts(pb, days, perm));
  // Refinement: the draft notes now say "no AI activity is planned" and that the class default applies, so none conflict.
  assert.deepEqual(cl, [], "no Unit 1 teaching note contradicts the permission");
  for (const k of ["w01d1", "w01d2", "w01d3", "w01d4", "w01d5", "w02d3", "w02d4", "w02d5"]) assert.match(pb.lessons[k].ai, /no AI activity is planned[\s\S]*grammar and spelling feedback only applies to written work/i, k);
  // The check still catches a contradicting note, and clears when the lesson is set to Not permitted.
  const bad = structuredClone(pb); bad.lessons.w01d1.ai = "No AI use today.";
  const flagged = plain(P.aiConflicts(bad, days, perm));
  assert.deepEqual(flagged.map(x => [x.key, x.id]), [["w01d1", days.w01d1 && days.w01d1.ai ? days.w01d1.ai.level : perm.default]], "the permission shown is the lesson's setting or the class default");
  const set = structuredClone(days); set.w01d1 = { ...set.w01d1, ai: { level: "none" } };
  assert.ok(!P.aiConflicts(bad, set, perm).some(x => x.key === "w01d1"), "once the lesson is set to Not permitted, the flag clears");
  assert.equal(P.AI_STRICT.test("No AI activity is planned today."), false, "a planned-activity note is not a prohibition");
  assert.equal(days.w01d1.ai, undefined, "the lesson's AI setting was not changed");
  // Every teacher view and export reads the same setting: Quick Teach, full plan, substitute plans, projector.
  assert.match(pbjs, /<h4>AI permission<\/h4>\$\{aiBlock\(pb, key, lesson\)\}/);
  assert.doesNotMatch(pbjs, /<h4>AI permission<\/h4><p>\$\{h\(ls\.ai/, "the playbook note is never shown as the permission");
  assert.match(pbjs, /<b>AI permission today:<\/b> \$\{ai \? h\(X\.pick\(ai\.name\)\)/, "concise substitute plan");
  assert.match(pbjs, /AI permission notes:/, "listed under Needs your confirmation");
  assert.match(read("../site/js/teacher.js"), /const lv = X\.aiLevel\(mod\.ai\.level\)/, "projector and full substitute plan use the lesson model");
  assert.match(read("../site/js/aistudio.js"), /SL2\.aiNow\(\)|aiNow\(/, "the AI Coaching Studio uses the current assignment's setting");
});

test("Quick Teach shows the day at a glance and stays generated from the same data", () => {
  const q = pbjs.slice(pbjs.indexOf("function quick("), pbjs.indexOf("/* ---------- full plan"));
  for (const k of ["Objectives", "Timed sequence", "Success criteria", "Prepare", "Materials", "Journal and stand and share", "Direct links", "Formative check", "Exit reflection", "AI permission:", "Canvas:"]) assert.ok(q.includes(k), k);
  assert.ok(q.includes("meetingBits(pb, ctx, day)") && q.includes("linksFor(pb, pb.lessons[x.key].phases[x.i], env)"));
});
