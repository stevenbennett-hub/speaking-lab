// site/data/*.json is the single source of truth. The page must read it, never carry its own copy.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pageSource, constSource } from "./lib/page-constants.mjs";

const src = pageSource();
const load = f => JSON.parse(readFileSync(new URL(`../site/data/${f}`, import.meta.url), "utf8"));
const units = load("units.json"), pacing = load("pacing.json"), cal = load("calendar-2026-27.json"), obj = load("objectives.json"), ov = load("overrides.json");

test("the page reads curriculum data from SL_DATA instead of inline copies", () => {
  const expect = { UNITS: "SL_DATA.units.units", UNIT_LABS: "SL_DATA.units.unitLabs", LAB_NAMES: "SL_DATA.units.labNames",
    PACE: "SL_DATA.pacing.weeks", PACE_SPRING: "SL_DATA.pacing.springWeeks", PLAN3_SPRING: "SL_DATA.pacing.unit3SpringPlan",
    PRESETS: "SL_DATA.calendar.semesterStart", SEM_END: "SL_DATA.calendar.semesterEnd", GROUPS: "SL_DATA.calendar.block.groups", OBJ: "SL_DATA.objectives.units" };
  for (const [k, v] of Object.entries(expect)) assert.equal(constSource(src, k), v, k);
  assert.match(constSource(src, "NO_SCHOOL"), /^SLSchedule\.noSchoolList\(SL_DATA\.calendar, SL_DATA\.overrides\)/);
  assert.ok(!src.includes('"2026-09-07", "2026-09-07", "Labor Day"'), "no inline calendar copy left");
  assert.ok(!src.includes('short: "Talk to Me"'), "no inline unit copy left");
});

test("six units with the fields the page uses", () => {
  assert.equal(units.units.length, 6);
  units.units.forEach((u, i) => {
    assert.equal(u.id, i + 1);
    for (const f of ["weeks", "short", "title", "blurb", "reads", "rubric", "dueWeek", "plan", "assign"]) assert.ok(u[f] !== undefined, `unit ${u.id} ${f}`);
    assert.ok(u.assign.hs && u.assign.col, `unit ${u.id} assignments`);
    assert.ok(units.unitLabs[u.id].every(l => units.labNames[l]), `unit ${u.id} labs exist`);
  });
});

test("every course week belongs to exactly one unit", () => {
  const weeks = units.units.flatMap(u => u.weeks).sort((a, b) => a - b);
  assert.deepEqual(weeks, Array.from({ length: 16 }, (_, i) => i + 1));
});

test("pacing has 16 weeks of 5 planned days; split days give [high school, college]", () => {
  for (let w = 1; w <= 16; w++) {
    assert.equal(pacing.weeks[w].length, 5, `week ${w}`);
    for (const d of pacing.weeks[w]) assert.ok(typeof d === "string" ? d.length : d.length === 2 && d.every(x => x.length), `week ${w}`);
  }
});

test("calendar dates are real, ordered and inside the school year", () => {
  const real = d => /^\d{4}-\d{2}-\d{2}$/.test(d) && new Date(d + "T12:00:00Z").toISOString().slice(0, 10) === d;
  let prev = "";
  for (const [a, b, why] of cal.noSchool) {
    assert.ok(real(a) && real(b), `${a}..${b}`);
    assert.ok(a <= b && a >= prev, `${a} order`);
    assert.ok(a >= "2026-07-01" && b <= "2027-06-30" && why, why);
    prev = a;
  }
  for (const sem of ["fall", "spring"]) {
    const e = cal.semesterEnd[sem];
    assert.ok(real(cal.semesterStart[sem]) && real(e.last) && real(e.fs) && cal.semesterStart[sem] < e.fs && e.fs <= e.last, sem);
  }
  assert.equal(new Date(cal.block.wednesdayAnchor + "T12:00:00Z").getUTCDay(), 3, "anchor is a Wednesday");
  assert.ok(["odd", "even"].includes(cal.block.wednesdayAnchorGroup));
  assert.equal(cal.timeZone, "America/Chicago");
});

test("objectives exist for all six units, both pathways", () => {
  for (let u = 1; u <= 6; u++) {
    const o = obj.units[u];
    assert.ok(o.learn.hs.length && o.learn.col.length && o.lang.length && o.frames.length, `unit ${u}`);
  }
});

test("overrides are well formed", () => {
  const types = ["closure", "noJournal", "journal", "extend"];
  for (const o of ov.overrides) {
    assert.ok(types.includes(o.type), o.type);
    assert.match(o.date, /^\d{4}-\d{2}-\d{2}$/);
    if (o.until) assert.ok(o.until >= o.date);
    assert.ok(o.groups === undefined || o.groups === "all" || (Array.isArray(o.groups) && o.groups.every(g => g === "odd" || g === "even")));
    if (o.type === "journal") assert.ok(o.journal, "journal override names a journal id");
    assert.match(o.added || "", /^\d{4}-\d{2}-\d{2}$/, "every override records the date it was added");
  }
  for (const [u, at] of Object.entries(ov.releases || {})) {
    assert.ok(units.units.some(x => String(x.id) === u), `release for unit ${u}`);
    assert.match(at, /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/, `release time for unit ${u} is Central Time YYYY-MM-DDTHH:MM`);
  }
  assert.match(cal.releaseTime, /^([01]\d|2[0-3]):[0-5]\d$/);
});

test("lessons.json: lesson-specific objectives for all 80 planned days, English and Spanish", () => {
  const lessons = load("lessons.json").days;
  for (let w = 1; w <= 16; w++) for (let d = 1; d <= 5; d++) {
    const k = `w${String(w).padStart(2, "0")}d${d}`, L = lessons[k];
    assert.ok(L, k);
    for (const f of ["learn", "lang"]) for (const l of ["en", "es"]) assert.ok(L[f][l] && L[f][l].trim(), `${k} ${f}.${l}`);
    if (L.col) for (const l of ["en", "es"]) assert.ok(L.col[l].trim(), `${k} col.${l}`);
    assert.ok(L.success.en.length >= 2 && L.success.en.length === L.success.es.length, `${k} success`);
    assert.ok(L.learn.en.startsWith("I can") && L.lang.en.startsWith("I can"), `${k} objectives are "I can" statements`);
    // Where the pacing guide gives college a different plan, the lesson has a college objective.
    if (Array.isArray(pacing.weeks[w][d - 1])) assert.ok(L.col, `${k} college objective (pacing differs)`);
  }
  assert.equal(Object.keys(lessons).length, 80);
});
