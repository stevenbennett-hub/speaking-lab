// Schedule engine: same course weeks as the original page, Chicago time, block schedule, and journal assignment.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const read = p => readFileSync(new URL(p, import.meta.url), "utf8");
const json = p => JSON.parse(read(p));
const engine = () => { const ctx = {}; vm.runInNewContext(read("../site/js/schedule.js"), ctx); return ctx.SLSchedule; };
const S = engine();
const plain = x => JSON.parse(JSON.stringify(x));
const cal = json("../site/data/calendar-2026-27.json");
const units = json("../site/data/units.json").units;
const journals = json("../site/data/journals.json").journals;
const golden = json("./fixtures/calendar-golden.json");
const NONE = { overrides: [] };
// Results from the engine are copied into this realm so deepEqual compares plain values.
const M = o => plain(S.meetings(o)), JF = (d, o) => plain(S.journalFor(d, o));
const opts = (sem, group, overrides = NONE) => ({ start: cal.semesterStart[sem], group, cal, units, journals, overrides });

test("course weeks and class days match the original page for 73 start dates (golden)", () => {
  for (const [start, exp] of Object.entries(golden.cases)) {
    const v = S.courseWeeks(start, cal, NONE);
    assert.deepEqual(plain({ ...v, odd: S.lessonDates(v, "odd", cal), even: S.lessonDates(v, "even", cal) }), exp, start);
  }
});

test("Wednesday rotation matches the original page for every Wednesday of the year", () => {
  for (const [d, g] of Object.entries(golden.wed)) assert.equal(S.groupOfDay(d, cal), g, d);
  // Confirmed by the teacher in the page's notes: Jan 6 odd, Jan 13 even, Mar 24 even, Dec 2 even.
  assert.deepEqual(["2027-01-06", "2027-01-13", "2027-03-24", "2026-12-02"].map(d => S.groupOfDay(d, cal)), ["odd", "even", "even", "even"]);
  assert.equal(S.groupOfDay("2026-11-28", cal), null, "Saturday");
});

test("today is the Chicago date, whatever the laptop's zone, across midnight and DST changes", () => {
  const at = iso => S.chicagoToday(new Date(iso));
  assert.equal(at("2026-09-03T04:30:00Z"), "2026-09-02"); // 11:30 pm CDT
  assert.equal(at("2026-09-03T05:30:00Z"), "2026-09-03"); // 12:30 am CDT
  assert.equal(at("2026-11-01T05:30:00Z"), "2026-11-01"); // 12:30 am CDT, the night DST ends
  assert.equal(at("2026-11-02T05:30:00Z"), "2026-11-01"); // 11:30 pm CST
  assert.equal(at("2027-03-14T07:30:00Z"), "2027-03-14"); // 1:30 am CST, just before DST starts
  assert.equal(at("2027-03-15T04:30:00Z"), "2027-03-14"); // 11:30 pm CDT
  assert.equal(S.addDays("2026-11-01", 1), "2026-11-02");
  assert.equal(S.addDays("2027-03-14", -1), "2027-03-13");
});

test("teacher preview date only accepts a real date", () => {
  const E = engine();
  assert.equal(E.setPreviewDate("2026-02-30"), null);
  assert.equal(E.setPreviewDate("2026-09-02"), "2026-09-02");
  assert.equal(E.chicagoToday(), "2026-09-02");
  assert.equal(E.chicagoToday(new Date("2027-01-06T15:00:00Z")), "2027-01-06", "an explicit time ignores the preview");
});

for (const sem of ["fall", "spring"]) for (const group of ["odd", "even"]) {
  test(`journals, ${sem} semester, ${group} periods`, () => {
    const m = M(opts(sem, group));
    const noSchool = S.noSchoolList(cal, NONE);
    const E = cal.semesterEnd[sem];
    const written = m.filter(r => r.journal);
    // Only this group's class days, never a no-school day, never finals.
    for (const r of m) {
      assert.equal(S.groupOfDay(r.date, cal), group, r.date);
      assert.equal(S.offReason(noSchool, r.date), null, r.date);
      assert.ok(r.date >= cal.semesterStart[sem] && r.date < E.fs, r.date);
    }
    // Numbers count up by one; every 10 make a set.
    written.forEach((r, i) => { assert.equal(r.number, i + 1); assert.equal(r.set, Math.ceil((i + 1) / 10)); });
    // A journal is never repeated, and units come in order.
    assert.equal(new Set(written.map(r => r.journal.id)).size, written.length);
    assert.deepEqual(written.map(r => r.unit), [...written.map(r => r.unit)].sort((a, b) => a - b));
    // Each journal belongs to the unit its class falls in.
    for (const r of written) assert.equal(r.journal.unit, r.unit, r.date);
    // Every unit keeps its first and its last core journal, even when holidays shorten it.
    for (const u of units) {
      const core = journals.filter(j => j.unit === u.id && !j.flex).map(j => j.id), got = written.filter(r => r.unit === u.id).map(r => r.journal.id);
      assert.equal(got[0], core[0], `unit ${u.id} first`);
      assert.ok(got.includes(core.at(-1)), `unit ${u.id} last`);
    }
    // Every class day in the course has a row: journal, or an honest "none".
    assert.equal(m.length, S.lessonDates(S.courseWeeks(cal.semesterStart[sem], cal, NONE), group, cal).length);
  });
}

test("first classes of each semester get Journal 1 on the right days", () => {
  assert.equal(M(opts("fall", "odd"))[0].date, "2026-08-13");  // Thursday start: odd periods first
  assert.equal(M(opts("fall", "even"))[0].date, "2026-08-14");
  for (const [sem, g] of [["fall", "odd"], ["fall", "even"], ["spring", "odd"], ["spring", "even"]]) assert.equal(M(opts(sem, g))[0].journal.id, "j01");
});

test("a short unit drops a middle journal, not the reflection (spring odd, Unit 1 has 4 classes)", () => {
  const u1 = M(opts("spring", "odd")).filter(r => r.unit === 1).map(r => r.journal.id);
  assert.deepEqual(u1, ["j01", "j02", "j04", "j05"]);
});

test("a long unit uses its flex journal once, before the reflection (fall Unit 1 has a 6th class)", () => {
  const u1 = M(opts("fall", "odd")).filter(r => r.unit === 1);
  assert.deepEqual(u1.map(r => r.journal && r.journal.id), ["j01", "j02", "j03", "j04", "j-u1-flex", "j05"]);
  assert.equal(u1[4].journal.title.en, "When Communication Breaks Down");
  assert.equal(u1[5].number, 6, "the reflection is journal 6 for this class");
});

test("journalFor gives today's class, or the next class on a weekend or holiday", () => {
  const o = opts("fall", "odd");
  const today = JF("2026-08-13", o);
  assert.equal(today.state, "today"); assert.equal(today.journal.id, "j01");
  const fallBreak = JF("2026-11-24", o); // Fall Break
  assert.equal(fallBreak.state, "next"); assert.equal(fallBreak.date, "2026-11-30");
  const sat = JF("2026-08-15", o);
  assert.equal(sat.state, "next"); assert.equal(sat.date, "2026-08-17");
  assert.equal(JF("2026-12-16", o).state, "done", "finals week");
});

test("override: a whole-school closure removes the class and shifts the pacing", () => {
  const snow = { overrides: [{ date: "2026-09-02", type: "closure", groups: "all", note: "Snow day" }] };
  const base = S.courseWeeks("2026-08-13", cal, NONE), moved = S.courseWeeks("2026-08-13", cal, snow);
  assert.ok(base.weeks.flat().includes("2026-09-02") && !moved.weeks.flat().includes("2026-09-02"));
  const before = M(opts("fall", "odd")), after = M(opts("fall", "odd", snow));
  assert.ok(before.some(r => r.date === "2026-09-02") && !after.some(r => r.date === "2026-09-02"));
});

test("override: a one-group closure affects only that group", () => {
  const assembly = { overrides: [{ date: "2026-08-20", type: "closure", groups: ["odd"], note: "Assembly" }] };
  assert.ok(!M(opts("fall", "odd", assembly)).some(r => r.date === "2026-08-20"));
  assert.deepEqual(M(opts("fall", "even", assembly)), M(opts("fall", "even")));
});

test("override: noJournal keeps the class but does not count a journal", () => {
  const testing = { overrides: [{ date: "2026-08-17", type: "noJournal", groups: "all", note: "Testing" }] };
  const m = M(opts("fall", "odd", testing)), day = m.find(r => r.date === "2026-08-17");
  assert.equal(day.journal, null); assert.equal(day.number, null); assert.equal(day.note, "Testing");
  assert.equal(m.find(r => r.journal).number, 1);
  // With one class taken by testing, fall Unit 1 has five journal classes: the five core journals, no flex.
  assert.deepEqual(m.filter(r => r.unit === 1 && r.journal).map(r => r.journal.id), ["j01", "j02", "j03", "j04", "j05"]);
  assert.equal(m.filter(r => r.journal).length, M(opts("fall", "odd")).filter(r => r.journal).length - 1);
});

test("override: journal assigns a specific journal to one class", () => {
  const pick = { overrides: [{ date: "2026-08-17", type: "journal", journal: "j03", groups: ["odd"] }] };
  assert.equal(M(opts("fall", "odd", pick)).find(r => r.date === "2026-08-17").journal.id, "j03");
});

test("overrides spanning several days (until) apply to each day", () => {
  const trip = { overrides: [{ date: "2026-08-17", until: "2026-08-21", type: "noJournal", groups: "all" }] };
  const m = M(opts("fall", "even", trip));
  assert.ok(m.filter(r => r.date >= "2026-08-17" && r.date <= "2026-08-21").every(r => r.journal === null));
});

test("history: an override added later never changes earlier classes or their journal numbers", () => {
  // A snow day in Unit 2, entered on Sep 10. Unit 2 gets shorter, but classes before Sep 10 must not change.
  const snow = { overrides: [{ date: "2026-09-16", type: "closure", groups: "all", note: "Snow day", added: "2026-09-10" }] };
  for (const g of ["odd", "even"]) {
    const base = M(opts("fall", g)), withSnow = M(opts("fall", g, snow));
    assert.deepEqual(withSnow.filter(r => r.date < "2026-09-10"), base.filter(r => r.date < "2026-09-10"), g);
    assert.ok(!withSnow.some(r => r.date === "2026-09-16"), "the snow day itself is removed");
    const ids = withSnow.filter(r => r.journal).map(r => r.journal.id);
    assert.equal(new Set(ids).size, ids.length, "no journal repeats");
    const u2 = withSnow.filter(r => r.unit === 2 && r.journal).map(r => r.journal.id);
    assert.equal(u2.at(-1), "j12", "Unit 2 still ends with its last journal");
  }
});

test("history: a retroactive override (added after the day it names) changes nothing", () => {
  const late = { overrides: [{ date: "2026-08-20", type: "closure", groups: "all", note: "Entered late", added: "2026-08-25" }] };
  assert.deepEqual(M(opts("fall", "odd", late)), M(opts("fall", "odd")));
  assert.deepEqual(plain(S.courseWeeks("2026-08-13", cal, late)), plain(S.courseWeeks("2026-08-13", cal, NONE)));
});

test("Central Time now: 24-hour clock, any laptop zone, DST-safe; preview shows noon", () => {
  assert.equal(S.chicagoNow(new Date("2026-08-13T11:59:00Z")), "2026-08-13T06:59"); // CDT
  assert.equal(S.chicagoNow(new Date("2026-08-13T12:00:00Z")), "2026-08-13T07:00");
  assert.equal(S.chicagoNow(new Date("2027-01-05T13:00:00Z")), "2027-01-05T07:00"); // CST
  assert.equal(S.chicagoNow(new Date("2026-11-01T05:30:00Z")), "2026-11-01T00:30");
  const E = engine(); E.setPreviewDate("2027-02-03");
  assert.equal(E.chicagoNow(), "2027-02-03T12:00"); assert.equal(E.isPreview(), true);
  assert.equal(S.isPreview(), false);
});

test("units open at 7:00 a.m. Central on their first class day, or at a teacher-approved time", () => {
  const o = { start: "2026-08-13", cal, units, overrides: NONE };
  assert.equal(S.unitReleaseAt(1, o), "2026-08-13T07:00");
  const v = S.courseWeeks("2026-08-13", cal, NONE);
  assert.equal(S.unitReleaseAt(2, o), `${v.weeks[2][0]}T07:00`);
  assert.equal(S.unitReleaseAt(6, o), `${v.weeks[12][0]}T07:00`);
  const early = { ...o, overrides: { overrides: [], releases: { "3": "2026-09-18T15:30" } } };
  assert.equal(S.unitReleaseAt(3, early), "2026-09-18T15:30");
  assert.equal(S.isOpen("2026-08-13T07:00", "2026-08-13T06:59"), false);
  assert.equal(S.isOpen("2026-08-13T07:00", "2026-08-13T07:00"), true);
  assert.equal(S.lessonReleaseAt("2026-09-02", o), "2026-09-02T07:00");
  assert.equal(S.unitReleaseAt(1, { ...o, start: "2027-01-05" }), "2027-01-05T07:00");
});

test("course week of a date", () => {
  const v = S.courseWeeks("2026-08-13", cal, NONE);
  assert.equal(S.courseWeekOf("2026-08-13", v), 0);
  assert.equal(S.courseWeekOf("2026-08-17", v), 1);
  assert.equal(S.courseWeekOf("2026-11-24", v), null, "Fall Break");
});
