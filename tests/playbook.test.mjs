// Instructor Playbook (Unit 1 prototype): data validates against the lesson data, no duplicated curriculum,
// meeting plans fit the real 90-minute blocks, teacher-only loading, honest video guides, no student information.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const read = p => readFileSync(new URL(p, import.meta.url), "utf8");
const json = p => JSON.parse(read(p));
const plain = x => JSON.parse(JSON.stringify(x));
const P = (() => { const c = {}; vm.runInNewContext(read("../site/js/playbook.js"), c); return c.SLPlaybook; })();
const pb = json("../site/data/playbook/unit-1.json");
const ctx = { units: json("../site/data/units.json").units, lessons: json("../site/data/lessons.json"), journals: json("../site/data/journals.json").journals };

test("the Unit 1 playbook validates against the lesson data and covers all ten planned days", () => {
  const v = P.validate(pb, ctx);
  assert.deepEqual(plain(v.errors), []);
  assert.deepEqual(Object.keys(pb.lessons), ["w01d1", "w01d2", "w01d3", "w01d4", "w01d5", "w02d1", "w02d2", "w02d3", "w02d4", "w02d5"]);
  assert.equal(pb.status, "draft", "draft until Mr. Bennett approves it");
  assert.deepEqual(pb.framework.map(f => f.id), ["learn", "observe", "investigate", "practice", "perform", "reflect"]);
  for (const [k, l] of Object.entries(pb.lessons)) {
    for (const f of ["essential", "vocab", "materials", "prep", "phases", "discuss", "misconceptions", "ml", "access", "extend", "formative", "ai", "canvas", "exit", "reflect", "sub"]) assert.ok(f in l, `${k} ${f}`);
  }
});

test("single source of truth: no objectives, success criteria or journal prompts copied into the playbook", () => {
  for (const l of Object.values(pb.lessons)) for (const f of ["learn", "lang", "col", "success", "prompt", "share"]) assert.ok(!(f in l), f);
  const bad = structuredClone(pb); bad.lessons.w01d1.learn = { en: "x" };
  assert.match(plain(P.validate(bad, ctx).errors).map(e => e.msg).join(" "), /belongs in lessons\.json/);
  const missing = structuredClone(pb); delete missing.lessons.w02d5;
  assert.match(plain(P.validate(missing, ctx).errors).map(e => e.msg).join(" "), /planned day has no playbook entry/);
  // The existing instructional sequence is preserved (titles follow the pacing guide).
  const seq = Object.values(pb.lessons).map(l => l.title).join(" | ");
  for (const s of ["Welcome", "transactional model", "back-to-back drawing", "Nerves", "delivery basics", "Ethics", "Speeches", "reflection"]) assert.match(seq, new RegExp(s, "i"), s);
});

test("video guides: real links, nothing invented, segments blank until previewed, alternatives for blocked videos", () => {
  const page = read("../site/index.html");
  for (const v of pb.videos) {
    assert.ok(page.includes(v.url), `${v.id} is a video already on the Speaking Lab`);
    // Blank until the teacher previews the video; times only when the teacher marked them verified (Lesson Manager editor).
    if (v.segment.verified) assert.ok(v.segment.start || v.segment.end, `${v.id}: verified needs a time`); else { assert.equal(v.segment.start, null); assert.equal(v.segment.end, null); }
    assert.ok(v.alternative && v.captions && v.language);
    assert.doesNotMatch(JSON.stringify(v), /autoplay|\bat \d+:\d{2}\b/i);
  }
  const bad = structuredClone(pb); bad.videos[0].segment.start = "1:05";
  assert.match(plain(P.validate(bad, ctx).errors).map(e => e.msg).join(" "), /must be marked verified/);
  bad.videos[0].segment.verified = true; assert.equal(plain(P.validate(bad, ctx).errors).length, 0, "after previewing, verified times are allowed");
});

test("meeting composition fits the real 2026–27 Unit 1 blocks for both groups and semesters", () => {
  // Planned days per meeting, as computed by the schedule (docs/playbook/RESOURCE_AUDIT.md).
  const runs = {
    "fall-odd": [["w01d1"], ["w01d1", "w01d2"], ["w01d3", "w01d4"], ["w01d5"], ["w02d1", "w02d2", "w02d3"], ["w02d4", "w02d5"]],
    "fall-even": [["w01d1"], ["w01d1", "w01d2", "w01d3"], ["w01d4", "w01d5"], ["w02d1", "w02d2"], ["w02d3", "w02d4"], ["w02d5"]],
    "spring-odd": [["w01d1", "w01d2", "w01d3"], ["w01d4", "w01d5"], ["w02d1", "w02d2", "w02d3"], ["w02d4", "w02d5"]],
    "spring-even": [["w01d1", "w01d2", "w01d3"], ["w01d4", "w01d5"], ["w02d1", "w02d2"], ["w02d3", "w02d4"], ["w02d5"]],
  };
  for (const [name, meetings] of Object.entries(runs)) {
    const taught = []; let speakers = 0;
    for (const keys of meetings) {
      const c = P.compose(pb, keys, taught.slice());
      assert.equal(c.over, 0, `${name} ${keys}: fits 72 minutes`);
      assert.equal(c.plan.reduce((n, x) => n + x.plan, 0) + c.free, 72, `${name} ${keys}: minutes add up`);
      speakers += c.speakers; keys.forEach(k => { if (!taught.includes(k)) taught.push(k); });
    }
    assert.ok(speakers >= 24, `${name}: room for at least 24 high school speakers (${speakers})`);
  }
  const rep = P.compose(pb, ["w01d1", "w01d2"], ["w01d1"]);
  assert.equal(rep.segs[0].repeat, true); assert.equal(rep.plan[0].title, "Review and catch-up for absent students");
  const crowded = P.compose(pb, ["w01d1", "w01d2", "w01d3"], []);
  assert.ok(crowded.shortened.length > 0 && crowded.over === 0, "a crowded block shortens core activities before cutting anything");
  assert.ok(crowded.plan.every(x => x.core), "stretch activities wait when the block is full");
});

test("teacher-only: students never load the playbook; it lives in the Lesson Manager, sub plan and print", () => {
  const s = read("../site/js/playbook.js"), t = read("../site/js/teacher.js");
  assert.equal((s.match(/fetch\(/g) || []).length, 2, "two fetches (the unit file and classroom.json), both inside load()");
  assert.ok(s.indexOf("fetch(") > s.indexOf("B.load = function"));
  for (const f of ["student.js", "btp.js", "aistudio.js", "research.js", "boot.js"]) assert.doesNotMatch(read(`../site/js/${f}`), /data\/playbook/, f);
  assert.match(t, /\["playbook", L\("Playbook", "Guía docente"\)\]/);
  assert.match(t, /tab === "playbook" \? \(window\.SLPlaybook \? SLPlaybook\.tab\(a1, a2, pbCtx\(\), r\.args\[3\], r\.args\[4\]\) : ""\)/);
  assert.match(t, /SLPlaybook\.print\(a1, a2, pbCtx\(\)\)/); assert.match(t, /SLPlaybook\.sub\(mod\)/);
  assert.match(t, /#\/teacher\/playbook\/\$\{mod\.unit\}\/\$\{day\}/, "each date links to its teacher plan");
  assert.doesNotMatch(s, /sendBeacon|XMLHttpRequest|setItem\("speakup-(?!teacher-)/);
  assert.match(s, /const NOTES = "speakup-teacher-notes-v1"/);
  assert.match(read("../site/index.html"), /!k\.startsWith\("speakup-teacher-"\)/, "teacher notes stay out of student backups");
});

test("UDL, multilingual and accessibility supports on every day; no reasons or student information asked", () => {
  for (const [k, l] of Object.entries(pb.lessons)) {
    assert.ok(l.ml.length >= 1 && l.access.length >= 1 && l.extend.length >= 1, k);
    assert.doesNotMatch(JSON.stringify(l), /why (they|you) need|diagnos|disability (status|type)|IEP number/i, k);
  }
  assert.doesNotMatch(JSON.stringify(pb.resources), /name:|student id|email|disab/i);
  assert.ok(pb.resources.length >= 6);
  assert.match(JSON.stringify(pb), /personal phones are not used/i, "district laptops, not phones");
});

test("Beyond the Podium supports Unit 1 without displacing required instruction", () => {
  assert.equal(pb.flex.journal, "j-u1-flex"); assert.ok(pb.flex.phases.every(p => p.core === false), "film stages only when the block has time");
  const d3 = pb.lessons.w01d3.phases;
  assert.ok(d3.filter(p => p.core).every(p => !/Beyond the Podium/.test(p.title)), "back-to-back drawing stays the core of w01d3");
  assert.match(pb.flex.note, /watching never counts/);
});
