// Unified student calendar (js/calendar.js). The core runs here with the real schedule engine (js/schedule.js), the
// page's own weekPlan (read from site/index.html) and the checklist core, so it is checked against the same sources as
// Today's Lesson and the weekly checklist. Browser interactions are covered by the RC2 browser checks.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const read = p => readFileSync(new URL(p, import.meta.url), "utf8");
const json = p => JSON.parse(read(p));
const plain = x => JSON.parse(JSON.stringify(x));
const cal = json("../site/data/calendar-2026-27.json"), pacing = json("../site/data/pacing.json"), units = json("../site/data/units.json");
const journals = json("../site/data/journals.json").journals, overrides = json("../site/data/overrides.json"), lessons = json("../site/data/lessons.json");
const checklist = json("../site/data/checklist.json"), page = read("../site/index.html"), calSrc = read("../site/js/calendar.js");
const S = (() => { const c = {}; vm.runInNewContext(read("../site/js/schedule.js"), c); return c.SLSchedule; })();
const CK = (() => { const c = {}; vm.runInNewContext(read("../site/js/checklist.js"), c); return c.SLChecklist.core; })();
const CAL = (() => { const c = {}; vm.runInNewContext(calSrc, c); return c.SLCalendar.core; })();

function fnSource(src, name) { const i = src.indexOf(`function ${name}(`); let d = 0, j = src.indexOf("{", i); for (; j < src.length; j++) { if (src[j] === "{") d++; else if (src[j] === "}" && --d === 0) break; } return src.slice(i, j + 1); }
function setup(sem, g, o = {}) {
  const start = cal.semesterStart[sem], ov = o.overrides || overrides, level = o.level || "hs", data = o.checklist || checklist;
  const v = S.courseWeeks(start, cal, ov);
  const env = { level, paceOf: w => pacing.weeks[w], courseWeeks: () => v, weekDays: w => v.weeks[w - 1] || [], classDays: (days, gg) => (gg ? days.filter(d => S.groupOfDay(d, cal) === gg) : days), blockGroup: () => null };
  vm.runInNewContext(fnSource(page, "weekPlan") + "; this.weekPlan = weekPlan;", env);
  const key = (w, k) => `w${String(w).padStart(2, "0")}d${k + 1}`;
  const parts = day => { const w = S.courseWeekOf(day, v); if (w == null) return { keys: [], items: [] };
    const items = w === 0 ? [{ k: 0, t: "Getting started" }] : env.weekPlan(w, g).filter(x => x.date === day).map(x => ({ k: x.k, t: x.speech ? x.t.slice(7) : x.t, speech: x.speech, due: x.due }));
    return { keys: items.map(x => key(w === 0 ? 1 : w, x.k)), items: items.map(x => ({ ...x, key: key(w === 0 ? 1 : w, x.k) })) }; };
  const meetings = S.meetings({ start, group: g, cal, units: units.units, journals, overrides: ov });
  const ev = CAL.build({ group: g, level, v, meetings, partsFor: m => parts(m.extendOf || m.date), units: units.units, ck: CK, checklist: data, lessons: lessons.days, labNames: units.labNames,
    noSchool: S.noSchoolList(cal, ov), overrides: ov, dues: o.dues || [], teacher: !!o.teacher });
  return { v, meetings, ev, parts };
}

test("class days follow the student's odd/even periods and the Wednesday rotation", () => {
  const O = setup("spring", "odd"), E = setup("spring", "even");
  const od = O.ev.filter(e => e.type === "class").map(e => e.date), ed = E.ev.filter(e => e.type === "class").map(e => e.date);
  assert.deepEqual(plain(od), plain(O.meetings.map(m => m.date)), "one class event per meeting (same as Today's Lesson)");
  assert.ok(od.every(d => S.groupOfDay(d, cal) === "odd")); assert.ok(ed.every(d => S.groupOfDay(d, cal) === "even"));
  assert.ok(!od.some(d => ed.includes(d)), "odd and even never share a class day");
  assert.ok(od.includes("2027-01-06") && ed.includes("2027-01-13") && od.includes("2027-01-20"), "Wednesdays alternate week by week");
  assert.ok(O.ev.find(e => e.type === "class" && e.date === "2027-01-07").link === "#/unit/1/day/2027-01-07", "each class links to its lesson");
});

test("holidays, breaks, professional development, closures and short weeks", () => {
  const O = setup("spring", "odd");
  assert.ok(O.ev.some(e => e.cat === "noschool" && e.date === "2027-01-18" && /MLK/.test(e.title.en)), "MLK Day");
  assert.ok(!O.ev.some(e => e.type === "class" && e.date === "2027-01-18"), "no class on a holiday");
  assert.ok(O.ev.some(e => e.type === "short" && e.date === O.v.mons[0]), "the short first week is flagged");
  const F = setup("fall", "odd");
  assert.ok(F.ev.some(e => e.type === "pd"), "professional development days are labelled (no school)");
  // A teacher closure for one group (e.g. a testing day) removes that class and shows why.
  const ov = { ...overrides, overrides: (overrides.overrides || []).concat([{ date: "2027-01-07", type: "closure", groups: ["odd"], note: "State testing", added: "2026-12-01" }]) };
  const X = setup("spring", "odd", { overrides: ov }), Y = setup("spring", "even", { overrides: ov });
  assert.ok(!X.ev.some(e => e.type === "class" && e.date === "2027-01-07"));
  assert.ok(X.ev.some(e => e.type === "closure" && e.date === "2027-01-07" && e.title.en === "State testing"));
  assert.ok(!Y.ev.some(e => e.type === "closure" && e.date === "2027-01-07"), "the other group is not affected");
});

test("schedule overrides: extended lessons appear on the class day; changes flow through without a second database", () => {
  const ov = { ...overrides, overrides: (overrides.overrides || []).concat([{ date: "2027-01-07", type: "extend", groups: ["odd"], added: "2026-12-01" }]) };
  const X = setup("spring", "odd", { overrides: ov }), c = X.ev.find(e => e.type === "class" && e.date === "2027-01-07");
  assert.match(c.note.en, /Extended lesson: continues the lesson from 2027-01-06/);
  assert.doesNotMatch(calSrc, /localStorage\.setItem|"20\d\d-\d\d-\d\d"/, "the calendar stores no dates of its own");
  assert.match(calSrc, /meetings: S\.meetings\(X\.opts\(g\)\)/); assert.match(calSrc, /noSchool: S\.noSchoolList\(D\.calendar, D\.overrides\)/);
  assert.match(calSrc, /root\.dueEvents\(\)/, "unit tests and finals come from the same due-date events as Today's Lesson");
});

test("speech performance windows: one window per unit, never an individual speaking date", () => {
  for (const g of ["odd", "even"]) {
    const T = setup("spring", g), sp = T.ev.filter(e => e.type === "speech");
    assert.ok(sp.length >= 5, "one window per unit with speeches");
    const u1 = sp.find(e => e.unit === 1), speechDays = T.meetings.filter(m => T.parts(m.date).items.some(i => i.speech && T.parts(m.date).keys.length) && m.unit === 1).map(m => m.date);
    assert.deepEqual(plain(u1.days), plain(speechDays), "the class's speech meetings, same as the checklist's speech days");
    assert.equal(u1.date, u1.days[0]); assert.equal(u1.end, u1.days[u1.days.length - 1]);
    assert.deepEqual(plain(u1.graded), { status: "approved", points: 50 }, "points from units.json");
    assert.match(u1.note.en, /Performance window for your class: \d+ class days?\. Mr\. Bennett sets the speaking order\./);
  }
});

test("journal sets: the class that writes the 10th journal; collection announced by Mr. Bennett (no invented deadline)", () => {
  const T = setup("spring", "odd"), m10 = T.meetings.find(m => m.number === 10), e = T.ev.find(x => x.type === "journal" && x.id === "journal-set-1");
  assert.equal(e.date, m10.date); assert.equal(e.graded.points, 100);
  assert.match(e.note.en, /Mr\. Bennett announces when the set is collected\./);
});

test("approved versus proposed: students see only approved grading; teacher view can include proposed", () => {
  const S1 = setup("spring", "odd");
  assert.ok(!S1.ev.some(e => e.graded && e.graded.status !== "approved"), "no proposed items for students");
  const T1 = setup("spring", "odd", { teacher: true }), p = T1.ev.filter(e => e.type === "graded");
  assert.ok(p.length >= 3 && p.every(e => e.graded.status === "proposed" && e.graded.points === null));
  const approved = { ...checklist, assessments: checklist.assessments.map(a => a.id === "u1-reading-check" ? { ...a, status: "approved" } : a) };
  const A = setup("spring", "odd", { checklist: approved }), rc = A.ev.find(e => e.id === "assess-u1-reading-check");
  assert.ok(rc && rc.graded.status === "approved" && rc.graded.points === null, "approved without points: shown as graded, points not set");
  assert.equal(rc.date, setup("spring", "odd").meetings.find(m => setup("spring", "odd").parts(m.date).keys.includes("w01d5")).date, "on the class that teaches w01d5");
});

test("upcoming deadlines: approved work, speech windows and dated assessments, in date order from today", () => {
  const dues = [{ type: "test", d: "2027-01-07", u: 1, t: ["Unit 1 test (Reading Check)", "Examen de la Unidad 1"] }, { type: "due", d: "2027-02-04", u: 2, t: ["Research & Outline Lab due", "Entrega"] }];
  const T = setup("spring", "odd", { dues }), up = CAL.upcoming(T.ev, "2027-01-08", 6);
  assert.ok(up.length && up.every((e, i) => i === 0 || up[i - 1].date <= e.date));
  assert.ok(up.every(e => (e.end || e.date) >= "2027-01-08"), "nothing past");
  assert.equal(up[0].type, "speech", "the Unit 1 speech window is next");
  assert.ok(T.ev.some(e => e.type === "research" && e.date === "2027-02-04"), "research checkpoints from due items about sources and research");
  assert.ok(!up.some(e => e.cat === "class" || e.cat === "prep"), "practice is not a deadline");
});

test("college pathway: pathway-specific speech and assessments", () => {
  const C = setup("spring", "odd", { level: "col" }), sp = C.ev.find(e => e.type === "speech" && e.unit === 1);
  assert.match(sp.title.en, /Personal Artifact Speech/);
  const H = setup("spring", "odd", { level: "hs", teacher: true });
  assert.ok(!H.ev.some(e => e.id === "assess-u1-outline-col"), "college-only assessment hidden on the high school pathway");
});

test("bilingual: every event has English and Spanish text", () => {
  for (const e of setup("fall", "even").ev) { assert.ok(e.title.en && e.title.es, e.id); if (e.note) assert.ok(e.note.en && e.note.es, e.id); }
  assert.match(page, /"Calendar": "Calendario"/);
});

test("navigation, accessibility, privacy and preview isolation", () => {
  assert.match(page, /<a href="#\/">My Course<\/a><a href="#\/calendar">Calendar<\/a><a href="#\/labs">Learning Labs<\/a>/, "between My Course and Learning Labs");
  assert.match(calSrc, /X\.addRoute\("calendar", \{ view \}\);/);
  assert.match(calSrc, /data-cal-filter="\$\{c\}" aria-pressed=/); assert.match(calSrc, /data-cal-view="month" aria-pressed=/);
  assert.match(calSrc, /aria-label="\$\{h\(`\$\{T\(TYPE\[e\.type\] \|\| LABEL\[e\.cat\]\)\}: \$\{T\(e\.title\)\}, \$\{span\(e\)\}`\)\}"/, "every event button says its type, title and date");
  assert.match(calSrc, /<th scope="col">/); assert.match(calSrc, /<caption class="sr">/); assert.match(calSrc, /aria-live="polite"/);
  assert.match(calSrc, /<svg class="cal-ic" viewBox="0 0 24 24" aria-hidden="true">/, "icons are decorative; text labels carry meaning");
  assert.match(calSrc, /<b class="cal-g">\$\{L\("Graded", "Calificado"\)\}<\/b>/, "graded is a word, not only a color");
  assert.doesNotMatch(calSrc, /fetch\(|XMLHttpRequest|sendBeacon|\.ics|preview\.json|SLBuild|google|outlook|https?:\/\//i, "no external calendar services, network or preview-only behavior");
  assert.match(read("../site/js/boot.js"), /if \(cd && cd\.assessments && cd\.days\) data\.checklist = cd;/, "teacher draft preview includes grading approvals (teacher view only)");
  assert.match(read("../site/js/checklist.js"), /data-ck-calprev/, "the weekly assessment overview previews the student calendar");
  assert.match(calSrc, /You checked this off in your checklist on \$\{fmt\(reported\)\}\. That is your own record, not a submission or a grade; Canvas is the official record\./);
});
