// Slice 11 refinements: Quick Teach (default) and full plan from the same data, concise substitute plans with the
// configured site address (never localhost), Lesson Manager editing of playbook guidance (drafts, review status,
// validation, export), first-day onboarding before the journal, class-size speech capacity, verified video segments.
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
const pbjs = read("../site/js/playbook.js"), teacher = read("../site/js/teacher.js"), student = read("../site/js/student.js");

test("first class day: onboarding happens before the journal; later classes keep the journal-first routine", () => {
  const first = P.compose(pb, ["w01d1"], [], { first: true });
  assert.deepEqual(plain(first.pre.map(x => x.title)), ["Before the journal: find Today's Lesson"]);
  assert.ok(!first.plan.some(x => x.before));
  const later = P.compose(pb, ["w01d1", "w01d2"], [], { first: false });
  assert.equal(later.pre.length, 0, "not the first class day: nothing moves before the journal");
  assert.ok(pbjs.includes("compose(pb, r.keys, r.taught, { first: pb.unit === 1 && n === 0, perSpeaker: per })"), "only the first meeting of the course");
});

test("speech capacity from class size, speech length, feedback and transitions; warns, never reschedules", () => {
  assert.equal(P.perSpeaker(pb, {}, false), 3, "default: 2-minute speech + 0.5 feedback + 0.5 transition");
  assert.equal(P.perSpeaker(pb, {}, true), 4, "college: 3 + 0.5 + 0.5");
  assert.equal(P.perSpeaker(pb, { minutes: 1.5, feedback: 1, transition: 0.5 }, false), 3);
  const blocks = [P.compose(pb, ["w02d1", "w02d2", "w02d3"], [], { perSpeaker: 3 }), P.compose(pb, ["w02d4", "w02d5"], [], { perSpeaker: 3 })];
  const ok = P.capacity(blocks, 24, 3), short = P.capacity(blocks, 30, 3), none = P.capacity(blocks, null, 3);
  assert.equal(ok.slots, 24); assert.equal(ok.fits, true);
  assert.equal(short.fits, false); assert.equal(short.short, 6);
  assert.equal(none.fits, null, "no class size: no verdict, just an estimate");
  assert.match(pbjs, /Pacing and release dates are not changed automatically/);
  assert.doesNotMatch(pbjs, /overrides\.push|setItem\("speakup-teacher-drafts/, "the playbook never edits the schedule itself");
  assert.match(pbjs, /const PLAN = "speakup-teacher-planning-v1"/, "settings are local teacher data (not in student backups)");
});

test("one data source for Quick Teach, the full plan, the concise substitute plan and printing", () => {
  assert.match(pbjs, /body = a3 === "full" \? meetingPlan\(pb, ctx, a2, false\) : quick\(pb, ctx, a2, false\);/, "Quick Teach is the default for a date");
  for (const k of ["quick", "plan", "sub", "playbook"]) assert.ok(pbjs.includes(`${k}: "`), k);
  assert.match(teacher, /\["plan", "quick", "sub", "playbook"\]\.includes\(a1\)/);
  // Quick Teach shows what was asked for; every part comes from meetingBits() (the lesson data + playbook).
  const q = pbjs.slice(pbjs.indexOf("function quick("), pbjs.indexOf("/* ---------- full plan"));
  for (const k of ["<h3>Objectives</h3>", "<h3>Success criteria</h3>", "<h3>Materials</h3>", "<h3>Prepare</h3>", "<h3>Timed sequence</h3>", "<h3>Formative check</h3>", "<h3>Exit reflection</h3>", "<b>AI permission:</b>", "<b>Canvas:</b>", "Full instructional plan", "Print one page", "Substitute plan (1–2 pages)"]) assert.ok(q.includes(k), k);
  assert.ok(q.includes("meetingBits(pb, ctx, day)") && pbjs.slice(pbjs.indexOf("function meetingPlan("), pbjs.indexOf("function subPlan(")).includes("meetingBits(pb, ctx, day)"));
});

test("direct links: viewing guide and video, lab, textbook chapter, site page", () => {
  const p = { video: "v-model-iisd", lab: "mlab", read: 1, route: "#/ai/ownership" };
  const links = plain(P.linksFor(pb, p, { labName: () => "Communication Model Lab", chapter: n => ({ title: "The Basics of Public Speaking", url: "https://socialsci.libretexts.org/x/01" }) }));
  assert.deepEqual(links.map(l => l.kind), ["guide", "video", "lab", "read", "page"]);
  assert.equal(links[0].href, "#/teacher/playbook/1/videos#v-model-iisd");
  assert.equal(links[1].href, "https://www.youtube.com/watch?v=Btj94IHVc6I");
  assert.equal(links[2].href, "#lab-model");
  assert.equal(links[4].label, "AI Coaching Studio: Cognitive Ownership");
  const bad = structuredClone(pb); bad.lessons.w01d2.phases[0].lab = "nolab"; bad.lessons.w01d2.phases[1].route = "https://example.com"; bad.lessons.w01d2.phases[2].read = 40;
  const msgs = plain(P.validate(bad, ctx).errors).map(e => e.msg).join(" | ");
  assert.match(msgs, /unknown lab/); assert.match(msgs, /must be a site link/); assert.match(msgs, /chapter number 1–14/);
});

test("Lesson Manager editing: drafts, review status, validation and export; no competing lesson editor", () => {
  const was = pb.lessons.w01d3.phases[0].min, ed = structuredClone(pb.lessons.w01d3); ed.phases[0].min = was + 1;
  const out = P.applyLessonEdit(pb, "w01d3", ed, "draft");
  assert.equal(out.lessons.w01d3.phases[0].min, was + 1); assert.equal(pb.lessons.w01d3.phases[0].min, was, "the published copy is untouched");
  const appr = structuredClone(pb); appr.lessons.w01d3.status = "approved";
  assert.equal(P.applyLessonEdit(appr, "w01d3", ed, "approved").lessons.w01d3.status, "draft", "changing approved guidance sends it back to draft");
  assert.equal(P.applyLessonEdit(appr, "w01d3", structuredClone(appr.lessons.w01d3), "approved").lessons.w01d3.status, "approved", "an unchanged save keeps approval");
  // The editor never touches objectives, success criteria or journals.
  const form = pbjs.slice(pbjs.indexOf("function editLesson("), pbjs.indexOf("function editVideo("));
  assert.doesNotMatch(form, /pbe-(learn|lang|success|prompt|journal)/);
  assert.match(form, /Edit reusable lesson \$\{h\(key\)\}/, "objectives are edited in the existing lesson editor");
  for (const f of ["-min", "-teacher", "pbe-materials", "pbe-discuss", "pbe-ml", "pbe-access", "pbe-extend", "pbe-look", "pbe-exit", "pbe-sub", "pbe-status"]) assert.ok(form.includes(f), f);
  // Integration with the existing manager: same drafts store, Publish export, import, backup; EDITABLE unchanged.
  assert.match(teacher, /o\.playbook = d\.playbook \|\| \{\};/);
  assert.match(teacher, /M\.changed\(PUB, W\)\.concat\(window\.SLPlaybook && SLPlaybook\.changed \? SLPlaybook\.changed\(W\.playbook\) : \[\]\)/);
  assert.match(teacher, /v\.errors\.length \|\| \(c\.errors && c\.errors\.length\) \? " disabled" : ""/, "invalid playbook files can't be exported");
  assert.match(teacher, /if \(r\.drafts\.playbook\) W\.playbook = r\.drafts\.playbook;/, "backups restore playbook drafts");
  assert.match(teacher, /SLPlaybook\.importText\(String\(rd\.result\)\)/);
  assert.deepEqual(plain((() => { const c = {}; vm.runInNewContext(read("../site/js/manage.js"), c); return c.SLManage.EDITABLE; })()), ["lessons", "journals", "overrides"]);
});

test("video segments: only teacher-verified times, entered after previewing", () => {
  assert.throws(() => P.applyVideoEdit(pb, "v-fear-nacino", { start: "2:10", end: "7:05" }, false), /confirm you previewed/);
  assert.throws(() => P.applyVideoEdit(pb, "v-fear-nacino", { start: "two minutes", end: "" }, true), /minutes:seconds/);
  const out = P.applyVideoEdit(pb, "v-fear-nacino", { start: "2:10", end: "7:05" }, true);
  const v = out.videos.find(x => x.id === "v-fear-nacino");
  assert.deepEqual(plain([v.segment.start, v.segment.end, v.segment.verified]), ["2:10", "7:05", true]);
  assert.equal(plain(P.validate(out, ctx).errors).length, 0);
  assert.ok(pb.videos.every(x => x.segment.verified === true || (!x.segment.start && !x.segment.end)), "the published file never has unverified times");
  assert.match(pbjs, /Edit or enter verified times/); assert.match(pbjs, /Viewing guide/);
});

test("substitute plans: configured public address, classroom expectations, accommodations; never localhost", () => {
  const cfg = json("../site/data/config.json");
  assert.equal(cfg.site.production, "https://stevenbennett-hub.github.io/speaking-lab/");
  assert.equal(cfg.site.preview, "https://stevenbennett-hub.github.io/speaking-lab-preview/");
  assert.match(read("../site/js/boot.js"), /window\.SL_CONFIG = cfg \|\| \{\};/);
  const fn = student.slice(student.indexOf("function siteBase()"), student.indexOf("\n  }\n", student.indexOf("function siteBase()")) + 4);
  const run = (href, preview) => vm.runInNewContext(fn + "; siteBase()", { window: { SL_CONFIG: cfg, SLBuild: { preview } }, location: { href } });
  assert.equal(run("http://localhost:8768/index.html#/sub/odd/2026-08-24", false), cfg.site.production);
  assert.equal(run("http://127.0.0.1:8000/#/x", true), cfg.site.preview);
  assert.equal(run("https://stevenbennett-hub.github.io/speaking-lab-preview/index.html#/x", true), "https://stevenbennett-hub.github.io/speaking-lab-preview/");
  assert.match(teacher, /base = X\.siteBase\(\);/, "the full substitute plan uses it too");
  assert.doesNotMatch(teacher + pbjs, /location\.href\.split\("#"\)/, "no page address copied into printed plans");
  const cr = json("../site/data/playbook/classroom.json");
  assert.equal(cr.expectations.length, 8);
  for (const k of [/phones are checked in/i, /earbuds/i, /Close laptops/i, /seated during speeches unless an accommodation/i, /speaker finishes/i, /side conversations/i, /respect/i, /gum/i]) assert.ok(cr.expectations.some(e => k.test(e)), String(k));
  assert.match(cr.accommodations, /individual accommodations/); assert.match(cr.accommodations, /Do not ask students to explain/);
  assert.doesNotMatch(JSON.stringify(cr), /student name|student id|IEP number|diagnos/i);
});

test("open questions are flagged for the teacher, not changed", () => {
  assert.deepEqual(pb.overview.confirm.map(c => c.id), ["slides", "wording", "balance", "subfill"]); // Slice 12: substitute-time question added; the spring exit (j03exit) was recommended and is now a draft rule (overview.exitFromJournal)
  assert.equal(json("../site/data/lessons.json").days.w01d4.exit, undefined, "the spring exit is a playbook rule; lessons.json and journal numbering are unchanged");
  assert.match(json("../site/data/pacing.json").weeks["2"][1][0], /slides/, "the pacing line is unchanged until confirmed");
});
