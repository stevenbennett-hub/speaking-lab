// My Learning Checklist, Weekly Grading Checkpoint and the instructor's weekly assessment overview (js/checklist.js,
// data/checklist.json). The pure core runs here with the real schedule engine (js/schedule.js) and the page's own
// weekPlan (read from site/index.html), so short weeks, holidays and odd/even blocks fold exactly as Today's Lesson does.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const read = p => readFileSync(new URL(p, import.meta.url), "utf8");
const json = p => JSON.parse(read(p));
const plain = x => JSON.parse(JSON.stringify(x));
const cal = json("../site/data/calendar-2026-27.json"), pacing = json("../site/data/pacing.json"), units = json("../site/data/units.json");
const journals = json("../site/data/journals.json").journals, overrides = json("../site/data/overrides.json"), lessons = json("../site/data/lessons.json");
const data = json("../site/data/checklist.json"), ach = json("../site/data/achievements.json");
const ck = read("../site/js/checklist.js"), page = read("../site/index.html");

const S = (() => { const c = {}; vm.runInNewContext(read("../site/js/schedule.js"), c); return c.SLSchedule; })();
const C = (() => { const c = {}; vm.runInNewContext(ck, c); return c.SLChecklist.core; })();

/** The page's weekPlan, unchanged, run with ISO-date stand-ins for the page's helpers. */
function fnSource(src, name) {
  const i = src.indexOf(`function ${name}(`); assert.ok(i >= 0, name);
  let d = 0, j = src.indexOf("{", i);
  for (; j < src.length; j++) { if (src[j] === "{") d++; else if (src[j] === "}" && --d === 0) break; }
  return src.slice(i, j + 1);
}
function planner(start, ov, level) {
  const v = S.courseWeeks(start, cal, ov);
  const env = { level, paceOf: w => pacing.weeks[w], courseWeeks: () => v, weekDays: w => v.weeks[w - 1] || [],
    classDays: (days, g) => (g ? days.filter(d => S.groupOfDay(d, cal) === g) : days), blockGroup: () => null };
  vm.runInNewContext(fnSource(page, "weekPlan") + "; this.weekPlan = weekPlan;", env);
  const key = (w, k) => `w${String(w).padStart(2, "0")}d${k + 1}`;
  // Same as student.js dayParts: the planned days that land on a date, with their lesson keys.
  const parts = (day, g) => {
    const w = S.courseWeekOf(day, v); if (w == null) return { keys: [], items: [] };
    const items = w === 0 ? [{ k: 0, t: "Getting started" }] : env.weekPlan(w, g).filter(x => x.date === day).map(x => ({ k: x.k, t: x.speech ? x.t.slice(7) : x.t, speech: x.speech, due: x.due }));
    return { keys: items.map(x => key(w === 0 ? 1 : w, x.k)), items: items.map(x => ({ ...x, key: key(w === 0 ? 1 : w, x.k) })) };
  };
  return { v, parts };
}
const setup = (sem, g, opts = {}) => {
  const start = cal.semesterStart[sem], ov = opts.overrides || overrides, level = opts.level || "hs";
  const P = planner(start, ov, level), meetings = S.meetings({ start, group: g, cal, units: units.units, journals, overrides: ov });
  const ctx = { data: opts.data || data, units: units.units, level, lessons: lessons.days, labNames: units.labNames };
  const tasks = m => C.meetingTasks(ctx, m, P.parts(m.extendOf || m.date, g));
  const week = w => meetings.filter(m => (P.v.weeks[w - 1] || []).includes(m.date));
  const grading = w => C.weekGrading(ctx, week(w), m => P.parts(m.extendOf || m.date, g), P.v.mons[w - 1]);
  return { P, meetings, ctx, tasks, week, grading };
};

test("daily task selection: the student's actual class day, journal first, from the Unit 1 data", () => {
  const T = setup("spring", "odd");
  const m = T.meetings.find(x => x.date === "2027-01-07"); // Thursday, odd periods, short first week
  const ids = T.tasks(m).map(t => t.id);
  assert.equal(ids[0], `journal-${m.journal.id}`.toLowerCase().replace(/[^a-z0-9-]/g, "-"), "the journal comes first, as in class");
  assert.deepEqual(plain(T.P.parts("2027-01-07", "odd").keys), ["w01d4", "w01d5"], "short week: two planned days in this block");
  for (const id of ["w01d4-read", "w01d4-strategies", "w01d4-object", "w01d4-rubric", "w01d5-quiz", "w01d5-delivery"]) assert.ok(ids.includes(id), id);
  assert.ok(!ids.includes("w01d4-artifact"), "college task hidden on the high school pathway");
  assert.ok(T.tasks(m).every(t => t.date === "2027-01-07"));
  assert.equal(T.meetings.find(x => x.date === "2027-01-05"), undefined, "Tuesday is an even-period day: no odd tasks");
});

test("weekly task selection: every class meeting in the instructional week, and nothing from other weeks", () => {
  const T = setup("spring", "even"), wk = T.week(2);
  assert.deepEqual(plain(wk.map(m => m.date)), ["2027-01-12", "2027-01-13", "2027-01-15"], "even: Tue, Wed (rotation), Fri");
  const all = wk.flatMap(T.tasks), keys = new Set(all.map(t => t.key).filter(Boolean));
  assert.ok([...keys].every(k => k.startsWith("w02")), "only week 2 lessons");
  const wf = C.weekFor(T.P.v, "2027-01-16", S.monOf);
  assert.equal(wf.w, 2, "a Saturday belongs to its own week");
  assert.equal(C.weekFor(T.P.v, "2027-01-18", S.monOf).w, 3, "MLK Day (no school) still shows week 3");
  const T2 = setup("fall", "odd");
  assert.equal(C.weekFor(T2.P.v, "2026-08-13", S.monOf).w, 0, "fall getting-started days are their own week");
});

test("odd/even: one task per planned day for both groups (same id, different dates); no duplicates", () => {
  const O = setup("spring", "odd"), E = setup("spring", "even");
  const oq = O.week(1).flatMap(O.tasks).find(t => t.id === "w01d5-quiz"), eq = E.week(1).flatMap(E.tasks).find(t => t.id === "w01d5-quiz");
  assert.ok(oq && eq); assert.notEqual(oq.date, eq.date);
  for (const T of [O, E]) for (const w of [1, 2]) {
    const ids = T.week(w).flatMap(T.tasks).filter(t => !t.speech).map(t => t.id);
    assert.equal(new Set(ids).size, ids.length, `week ${w}: no task appears twice (speech days share one speech task)`);
  }
  assert.match(ck, /Each planned day is listed once; the date columns show when each group has it, so tasks are never duplicated across groups\./);
});

test("holidays, closures and shortened weeks follow the schedule engine", () => {
  const T = setup("spring", "odd"), v = T.P.v;
  assert.ok(!v.weeks.flat().includes("2027-01-18"), "MLK Day has no class");
  for (const m of T.meetings) for (const t of T.tasks(m)) assert.ok(v.weeks.flat().concat(v.pre || []).includes(t.date), "tasks only on school days");
  // A teacher closure (testing day) removes that class and its tasks; nothing else moves.
  const closed = { ...overrides, overrides: (overrides.overrides || []).concat([{ date: "2027-01-07", type: "closure", groups: ["odd"], note: "State testing", added: "2026-12-01" }]) };
  const X = setup("spring", "odd", { overrides: closed });
  assert.equal(X.meetings.find(m => m.date === "2027-01-07"), undefined);
  assert.ok(!X.week(1).flatMap(X.tasks).some(t => t.date === "2027-01-07"));
  // An extended lesson repeats the previous class's tasks (the schedule engine's extendOf).
  const ext = { ...overrides, overrides: (overrides.overrides || []).concat([{ date: "2027-01-07", type: "extend", groups: ["odd"], added: "2026-12-01" }]) };
  const E = setup("spring", "odd", { overrides: ext }), em = E.meetings.find(m => m.date === "2027-01-07");
  assert.equal(em.extendOf, "2027-01-06");
  assert.ok(E.tasks(em).some(t => t.key === "w01d2"), "repeats the previous lesson's tasks");
  assert.match(ck, /partsFor = g => m => parts\(m\.extendOf \|\| m\.date, g\)/);
});

test("weekly grading: warning when no approved graded assignment; speech weeks and journal sets count; exceptions", () => {
  const T = setup("spring", "odd");
  const w1 = T.grading(1), w2 = T.grading(2);
  assert.equal(w1.ok, false, "Unit 1 week 1 has only proposed grading opportunities");
  assert.ok(w1.proposed.some(e => e.a.id === "u1-reading-check"));
  assert.equal(w2.ok, true); assert.equal(w2.approved[0].a.id, "u1-speech"); assert.equal(w2.approved[0].a.points, 50, "points from units.json, not invented");
  assert.match(ck, /const WARN = "No graded assignment has been planned for this instructional week\.";/);
  const withEx = { ...data, exceptions: { [T.P.v.mons[0]]: { reason: "short-week", note: { en: "Shortened week", es: "Semana corta" } } } };
  const X = setup("spring", "odd", { data: withEx }).grading(1);
  assert.equal(X.ok, false); assert.equal(X.excused, true, "an instructor exception silences the warning, without inventing a grade");
  // Journal sets: the week a group writes journal #10 has an approved 100-point set.
  const m10 = T.meetings.find(m => m.number === 10), wk = T.P.v.weeks.findIndex(d => d.includes(m10.date)) + 1;
  assert.ok(T.grading(wk).approved.some(e => e.a.id === "journal-set-1" && e.a.points === 100));
  assert.match(ck, /A planned grading opportunity is not a grade entered in Canvas\. Speaking Lab cannot see the Canvas gradebook\./);
});

test("draft versus approved: proposed opportunities are never shown to students as graded", () => {
  assert.ok(data.assessments.length >= 5);
  assert.ok(data.assessments.every(a => a.status === "proposed" && a.points === null), "nothing is approved or given points on Mr. Bennett's behalf");
  for (const k of Object.keys(data.days)) assert.match(k, /^w0[12]d[1-5]$/, "Unit 1 only (Units 2–6 wait for approval)");
  for (const t of Object.values(data.days).flat()) {
    if (t.assess) assert.ok(data.assessments.some(a => a.id === t.assess), t.assess);
    if (t.kinds.includes("graded")) assert.ok(t.assess, `${t.id}: graded only through an assessment`);
    if (t.badge) assert.ok(ach.badges.some(b => b.id === t.badge), t.badge);
    for (const k of t.kinds) assert.ok(["learn", "practice", "graded", "achievement"].includes(k));
  }
  assert.match(ck, /t\.kinds\.filter\(k => k !== "graded" \|\| graded \|\| opts\.teacher\)/, "students see Graded only when approved");
  assert.match(ck, /teacher && G\.proposed\.length \?/, "the checkpoint lists proposed items only in teacher view");
  const approved = { ...data, assessments: data.assessments.map(a => a.id === "u1-reading-check" ? { ...a, status: "approved" } : a) };
  assert.equal(setup("spring", "odd", { data: approved }).grading(1).ok, true, "after Mr. Bennett approves it, the week has a graded assignment");
  assert.match(ck, /if \(ap\.dataset\.ckApprove\)/); assert.match(ck, /if \(!ap \|\| !X\.teacherOn\(\)\) return;/, "only teacher view can approve (a draft until published)");
});

test("completion: automatic records, student checkmarks and student-reported Canvas submissions stay distinct", () => {
  const t = id => Object.values(data.days).flat().find(x => x.id === id);
  const st0 = C.readStore(null);
  assert.deepEqual(plain(C.completion(t("w01d5-quiz"), st0, { quiz: { 1: 85 } })), { done: true, how: "auto", rec: { best: 85, mastered: true } });
  assert.equal(C.completion(t("w01d5-quiz"), st0, { quiz: {} }).done, false);
  assert.equal(C.completion(t("w02d4-listen"), st0, { listenFinal: 70 }).rec.mastered, false);
  const s1 = C.toggle(st0, "done", "w01d3-drawing", true, "2027-01-06");
  assert.deepEqual(plain(C.completion(t("w01d3-drawing"), s1, {})), { done: true, how: "self", on: "2027-01-06" });
  const s2 = C.toggle(s1, "canvas", "w02d5-selfassess", true, "2027-01-15");
  assert.equal(C.completion(t("w02d5-selfassess"), s2, {}).how, "canvas");
  assert.equal(C.completion(t("w02d5-selfassess"), s1, {}).done, false);
  assert.deepEqual(plain(C.readStore('{"v":1,"done":{"x":"not a date","Bad Id":"2027-01-01","ok-1":"2027-01-01"},"canvas":[]}')), { v: 1, done: { "ok-1": "2027-01-01" }, canvas: {} }, "malformed entries are ignored");
  assert.match(ck, /Teacher-verified", "Verificado por el maestro"\)\}<\/b>: \$\{L\("only Mr\. Bennett verifies work and enters grades, in Canvas\. Speaking Lab never shows work as verified or graded\./);
});

test("Canvas language is accurate: never claims a submission, a grade or a verification", () => {
  assert.match(ck, /You reported submitting this in Canvas\. Speaking Lab can't see Canvas, so check Canvas to confirm your submission\./);
  assert.match(ck, /Speaking Lab shows what is planned; it does not submit, grade or confirm anything\./);
  for (const bad of [/has been submitted/i, /was submitted to Canvas/i, /\bwas graded\b/i, /\bverified by\b/i, /synced? (with|to) Canvas/i, /Canvas API/, /canvas\.instructure|\/api\/v1/i]) assert.doesNotMatch(ck + JSON.stringify(data), bad);
  assert.match(ck, /I submitted it in Canvas/);
});

test("no duplicate achievement points: checking off tasks never touches badges or points", () => {
  assert.doesNotMatch(ck, /SLAchieve\.|speakup-achieve-v1|\.points\(|track\(/, "reads records only through SL2.achState (the existing engine)");
  const writes = [...ck.matchAll(/put\((\w+),/g)].map(m => m[1]);
  assert.deepEqual([...new Set(writes)].sort(), ["KEY", "TKEY"], "writes only its own record and the teacher draft");
  assert.match(ck, /They don't add learning points\./);
});

test("backup and restoration: checklist progress is in the student backup; teacher drafts are not", () => {
  assert.match(ck, /const KEY = "speakup-checklist-v1", TKEY = "speakup-teacher-checklist-v1";/);
  assert.match(page, /k\.startsWith\("speakup-"\) && k !== "speakup-col-ok" && k !== "speakup-journal-ok" && !k\.startsWith\("speakup-teacher-"\)/, "existing backup rule: all speakup-* except teacher items");
  assert.match(page, /if \(k\.startsWith\("speakup-"\) && k !== "speakup-col-ok" && k !== "speakup-journal-ok" && !k\.startsWith\("speakup-teacher-"\) && typeof v === "string"\) \{ localStorage\.setItem\(k, v\);/, "restore brings it back");
  const rec = C.toggle(C.readStore(null), "done", "w01d1-tour", true, "2027-01-05");
  assert.deepEqual(Object.keys(rec).sort(), ["canvas", "done", "v"], "task ids and dates only: no names, reflections or text");
});

test("preview and production isolation; privacy", () => {
  assert.match(read("../site/js/boot.js"), /checklist: "data\/checklist\.json"/);
  assert.doesNotMatch(ck, /preview\.json|SLBuild|fetch\(|XMLHttpRequest|sendBeacon|https?:\/\/(?!myapps\.classlink\.com\/home|www\.w3\.org)/, "no network calls; the only address is the existing ClassLink link");
  assert.doesNotMatch(ck, /sessionStorage|document\.cookie|indexedDB/);
  assert.doesNotMatch(ck, /<input[^>]*type="text"|<textarea/, "students type nothing into the checklist");
  assert.match(read("../site/js/teacher.js"), /concat\(window\.SLChecklist && SLChecklist\.changed \? SLChecklist\.changed\(\) : \[\]\)/, "approvals publish as data/checklist.json through the existing Publish tab");
});

test("accessibility: labels, pressed state, text with every icon, keyboard focus kept", () => {
  assert.match(ck, /<input type="checkbox" id="\$\{h\(id\)\}" data-ck-toggle=/); assert.match(ck, /<label for="\$\{h\(id\)\}" class="ck-cbl">/);
  assert.match(ck, /data-ck-view="today" aria-pressed="\$\{VIEW === "today"\}"/);
  assert.match(ck, /role="status" id="ckLive"/);
  assert.ok((ck.match(/<svg viewBox="0 0 24 24" aria-hidden="true">/g) || []).length >= 7, "icons are decorative; text labels carry the meaning");
  assert.match(ck, /\$\{ICO\[k\]\}\$\{h\(proposed \? L\("Proposed graded", "Calificación propuesta"\) : T\(K\)\)\}/, "graded is a word, not only a color");
  assert.match(ck, /const again = root\.document\.getElementById\(id\); if \(again\) again\.focus\(\);/);
  assert.match(read("../site/css/app.css"), /\.ck-kind\.ck-graded \{[^}]*text-transform: uppercase/);
  assert.match(read("../site/js/student.js"), /\$\{window\.SLChecklist && SLChecklist\.panel \? SLChecklist\.panel\(\) : ""\}\n      <div class="sl2-panel">\$\{viewToday\(u\)\}<\/div>/, "on Today's Lesson, not a new navigation tab");
});
