// Slice 10: 720p film copy, visual descriptions, Spanish captions (draft), technoference wording, Ad Detective mastery
// summary and Master Ad Detective, preview link separation, teacher-verified badges, typed-journal notice, pilot documents.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import vm from "node:vm";

const read = p => readFileSync(new URL(p, import.meta.url), "utf8");
const json = p => JSON.parse(read(p));
const media = f => new URL(`../site/media/btp/ep1/${f}`, import.meta.url);
const plain = x => JSON.parse(JSON.stringify(x));
const cues = txt => txt.split(/\r?\n\r?\n/).map(b => b.split(/\r?\n/)).filter(b => b.some(l => l.includes("-->"))).map(b => { const i = b.findIndex(l => l.includes("-->")); return { t: b[i], text: b.slice(i + 1).join(" ") }; });

test("film: 1080p original unchanged; optional 720p copy about 5–6 MB; student chooses", () => {
  const orig = readFileSync(media("beyond_the_podium_final.mp4"));
  assert.equal(createHash("sha256").update(orig).digest("hex"), "86e415a2b68b75752ae5227b29cef8559aabdb5660cc710c43e5decc200e0a81", "the supplied film is byte-for-byte unchanged");
  const s = statSync(media("beyond_the_podium_720p.mp4")).size;
  assert.ok(s > 4e6 && s < 6.5e6, `720p copy is ${s} bytes`);
  const ep = json("../site/data/btp/episode-1.json");
  assert.equal(ep.media.video720.src, "media/btp/ep1/beyond_the_podium_720p.mp4"); assert.equal(ep.media.video720.available, true);
  const B = (() => { const c = {}; vm.runInNewContext(read("../site/js/btp.js"), c); return c.SLBtp; })();
  assert.equal(B.pickQuality("hd", { saveData: true }), "hd", "the student's choice wins");
  assert.equal(B.pickQuality("", { saveData: true }), "low"); assert.equal(B.pickQuality("", { effectiveType: "3g" }), "low"); assert.equal(B.pickQuality("", { effectiveType: "4g" }), "hd"); assert.equal(B.pickQuality(), "hd");
  assert.equal(ep.media.poster.available, false, "thumbnail still a missing dependency; none generated");
  assert.ok(!existsSync(media("beyond_the_podium_thumbnail.jpg")));
});

test("technoference feedback is Mr. Bennett's exact wording", () => {
  const ep = json("../site/data/btp/episode-1.json");
  const b = ep.stages.flatMap(s => s.barriers || []).find(x => x.id === "techno");
  assert.equal(b.why.en, "The dialogue alone does not establish technoference. Now observe the opening of the film. Alex is holding a phone while Jordan is working on the group assignment.\n\nDoes the presence of a phone automatically mean that technoference is occurring? What additional evidence would help you determine whether technology is interfering with their communication or collaboration?\n\nDiscuss your observations with a partner. Distinguish what you can directly observe from what you are assuming.");
  assert.deepEqual(b.evidence, ["none"], "still no evidence in the words");
  assert.match(read("../site/css/student.css"), /\.btp-pl \{ white-space: pre-line; \}/, "the three paragraphs show as paragraphs");
});

test("Spanish captions: draft, same cues and timings as the English; hidden until reviewed", () => {
  const en = cues(read("../site/media/btp/ep1/captions.en.vtt")), es = cues(read("../site/media/btp/ep1/captions.es.vtt"));
  assert.equal(es.length, en.length); es.forEach((c, i) => assert.equal(c.t, en[i].t, `cue ${i + 1} timing`));
  assert.match(read("../site/media/btp/ep1/captions.es.vtt"), /NOTE[^\n]*(draft|borrador)/i);
  const ep = json("../site/data/btp/episode-1.json");
  assert.equal(ep.media.captions.es.reviewed, false);
  assert.match(read("../site/js/btp.js"), /captions\.es[^\n]*reviewed/, "the player checks the review flag");
});

test("visual descriptions: transcript rows and timed tracks describe actions only, marked for review", () => {
  const ep = json("../site/data/btp/episode-1.json");
  const d = ep.transcript.filter(l => l.speaker === "Description");
  assert.ok(d.length >= 3); assert.match(d[0].en, /Alex[^.]*phone/); assert.ok(d.every(l => l.es && l.es !== l.en));
  for (const l of ["en", "es"]) { assert.equal(ep.media.descriptions[l].available, true); assert.equal(ep.media.descriptions[l].reviewed, false); }
  const en = cues(read("../site/media/btp/ep1/descriptions.en.vtt")), es = cues(read("../site/media/btp/ep1/descriptions.es.vtt"));
  assert.equal(en.length, es.length); en.forEach((c, i) => assert.equal(c.t, es[i].t));
  for (const c of en) assert.doesNotMatch(c.text, /\b(angry|sad|upset|frustrated|annoyed|guilty|hurt)\b/i, "no emotions or motives: students infer those");
  const btp = read("../site/js/btp.js");
  assert.match(btp, /speechSynthesis/); assert.match(btp, /data-btp="describe"/);
  assert.doesNotMatch(btp.replace(/\/\*[\s\S]*?\*\//g, ""), /autoplay/i);
  assert.ok(existsSync(new URL("../docs/reviews/btp-audio-description.md", import.meta.url)));
});

test("Ad Detective: only the validated, versioned summary counts; each case once", () => {
  const ctx = {}; vm.runInNewContext(read("../site/js/achievements.js"), ctx); const A = ctx.SLAchieve, cfg = json("../site/data/achievements.json");
  const good = { v: 1, app: "ad-detective", cases: { 1: "2026-11-24", 2: "2026-11-24", 3: "2026-11-25", 4: "2026-11-30", 5: "2026-12-01", 6: "2026-12-02" } };
  assert.deepEqual(plain(A.adCases(good)), { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true });
  assert.deepEqual(plain(A.adCases({ ...good, v: 2 })), {}, "other versions ignored");
  assert.deepEqual(plain(A.adCases({ ...good, app: "other" })), {});
  assert.deepEqual(plain(A.adCases({ v: 1, app: "ad-detective", cases: { 1: "yes", 2: "2026-13-45", 7: "2026-11-24" } })), { 1: false, 2: false, 3: false, 4: false, 5: false, 6: false });
  assert.deepEqual(plain(A.adCases(null)), {}); assert.deepEqual(plain(A.adCases({ v: 1, app: "ad-detective", cases: [] })), {});
  const env = o => ({ get: k => (k in o ? o[k] : null), labs: {} });
  const src = A.collect(env({ "addetective-mastery-v1": JSON.stringify(good), "addetective-v1": JSON.stringify({ cases: { 1: { watched: true } } }) }));
  const res = A.evaluate(cfg, src, null), mad = res.find(r => r.id === "master-ad-detective");
  assert.equal(mad.state, "earned");
  const pts = A.points(cfg, src, res);
  assert.equal(pts.ad, 6);
  assert.equal(A.points(cfg, A.collect(env({ "addetective-mastery-v1": JSON.stringify(good) })), res).total, pts.total, "recalculated, never added twice");
  const part = A.collect(env({ "addetective-mastery-v1": JSON.stringify({ v: 1, app: "ad-detective", cases: { 1: "2026-11-24", 5: "2026-11-24" } }) }));
  const r2 = A.evaluate(cfg, part, null).find(r => r.id === "master-ad-detective");
  assert.equal(r2.state, "progress"); assert.deepEqual(plain(r2.parts.map(p => [p.have, p.need])), [[1, 3], [0, 1], [1, 1], [0, 1]]);
  // Watching or opening Ad Detective (its own record) is never read.
  assert.equal(A.evaluate(cfg, A.collect(env({ "addetective-v1": JSON.stringify({ cases: { 1: { watched: true, brief: true } } }) })), null).find(r => r.id === "master-ad-detective").state, "notstarted");
});

test("Master Ad Detective covers the four areas; Persuasion Detective unchanged", () => {
  const cfg = json("../site/data/achievements.json"), b = cfg.badges.find(x => x.id === "master-ad-detective");
  assert.equal(b.level, "applied"); assert.equal(b.status, "active"); assert.deepEqual(b.units, [6]);
  assert.deepEqual(b.criteria.map(c => c.cases), [[1, 2, 3], [4], [5], [6]]);
  for (const w of ["Persuasive appeals", "Logical fallacies", "Misleading claims", "Ethical advertising"]) assert.ok(b.criteria.some(c => c.label.en.startsWith(w)), w);
  assert.match(b.about.en, /shown answers don't/); assert.match(b.about.en, /teacher reads your written analysis/);
  const pd = cfg.badges.find(x => x.id === "persuasion-detective");
  assert.deepEqual(plain(pd.criteria), [{ type: "labDone", lab: "plab", acts: ["appeals", "fallacy"], label: { en: "Persuasion & Rhetoric Lab: finish the appeals and fallacies activities", es: "Laboratorio de persuasión y retórica: termina las actividades de apelaciones y falacias" } }]);
  assert.equal(json("../site/data/studios.json").experiences.find(x => x.id === "ad-detective").href, "https://stevenbennett-hub.github.io/ad-detective/", "production link unchanged");
});

test("preview build sends Ad Detective links to its preview address; production untouched", () => {
  const c = {}; vm.runInNewContext(read("../site/js/build.js"), c); const B = c.SLBuild;
  assert.equal(B.adHref("https://stevenbennett-hub.github.io/ad-detective/"), "https://stevenbennett-hub.github.io/ad-detective-preview/");
  assert.equal(B.adHref("https://stevenbennett-hub.github.io/ad-detective/#/case/2"), "https://stevenbennett-hub.github.io/ad-detective-preview/#/case/2");
  assert.equal(B.adHref("https://stevenbennett-hub.github.io/speaking-lab/"), "https://stevenbennett-hub.github.io/speaking-lab/");
  assert.equal(B.adHref("https://example.com/ad-detective/"), "https://example.com/ad-detective/");
  const src = read("../site/js/build.js");
  assert.ok(src.indexOf("addEventListener") > src.indexOf("B.activate = function"), "rewriting is attached only when the preview activates");
  assert.ok(existsSync(new URL("../docs/preview/ad-detective-preview.md", import.meta.url)));
  assert.match(read("../docs/proposals/ad-detective-integration.md"), /not deployed/);
});

test("teacher-verified badges: pending, Canvas is the record, mapping uses the real rubric levels", () => {
  const cfg = json("../site/data/achievements.json");
  for (const id of ["confident-speaker", "master-storyteller", "master-communicator"]) {
    const b = cfg.badges.find(x => x.id === id); assert.equal(b.status, "pending-verification"); assert.match(b.about.en, /Canvas is the official record/);
    assert.ok(b.criteria.every(c => c.type === "teacher"));
  }
  const m = read("../docs/proposals/teacher-verified-rubric-mapping.md"), page = read("../site/index.html");
  assert.match(page, /const LEVELS = \["Exceeds", "Meets", "Approaching", "Beginning", "Missing"\];/, "the rubric's own five levels");
  for (const row of ["Audience Connection & Preparation", "Confidence & Engagement", "Clear Structure", "Engaging Storytelling", "Poise", "Eye Contact & Gestures", "Arguments & Evidence"]) {
    assert.ok(m.includes(row), row); assert.ok(page.includes(`row("${row}"`), `${row} exists in the rubrics`);
  }
  assert.match(m, /Meets or Exceeds/); assert.match(m, /No criteria or scales were invented/);
  assert.doesNotMatch(read("../docs/proposals/teacher-verified-achievements.md"), /≥ 3/, "no invented scale");
});

test("typed journal: the five facts, no reasons asked, nothing collected", () => {
  const s = read("../site/js/student.js");
  for (const f of [/not a password or secure login/, /saved only in this browser on this device/, /turn it in through Canvas/, /not graded automatically/, /can't check whether a journal was done, handwritten or typed/]) assert.match(s, f);
  const block = s.slice(s.indexOf("const JOURNAL_FACTS"), s.indexOf("const DEFAULT_EXPECT"));
  assert.doesNotMatch(block, /disab|accommodat|IEP|504|reason|why do you/i);
  assert.doesNotMatch(block, /fetch\(|sendBeacon|XMLHttpRequest/);
});

test("pilot, workflow and readiness documents", () => {
  const g = read("../docs/pilot/PILOT_GUIDE.md");
  for (const k of ["Introduce Speaking Lab", "learning pathway", "Language support", "Enter the unit", "objectives", "Handwritten journal", "Stand and share", "Interactive activity", "Achievements", "Back up"]) assert.match(g, new RegExp(k, "i"), k);
  const q = read("../docs/pilot/STUDENT_FEEDBACK.md");
  for (const k of ["Navigation", "Clarity", "Engagement", "Language support", "Accessibility", "Loading speed", "Usefulness", "one change"]) assert.match(q, new RegExp(k, "i"), k);
  assert.match(q, /Do not write your name/); assert.doesNotMatch(q.split("For the teacher")[0], /(Name|Student ID|Email|Period)\s*:/i);
  const c = read("../docs/RELEASE_CHECKLIST.md");
  for (const k of ["Technically complete", "Instructionally reviewed", "Ready for classroom pilot", "Approved for production", "Do not merge `dev` into `main`"]) assert.ok(c.includes(k), k);
  const w = read("../docs/TEACHER_WORKFLOW_TEST.md");
  for (let n = 1; n <= 12; n++) assert.match(w, new RegExp(`\\| ${n} \\|`), `workflow step ${n}`);
  assert.match(w, /Limitations/);
  const r = read("../DEVELOPMENT_ROADMAP.md");
  assert.match(r, /paused/); assert.doesNotMatch(r, /\| 9 \|[^\n]*awaiting review/); assert.doesNotMatch(r, /Achievement integrations\.\*\* Ad Detective completion/, "done work is not listed as future work");
  assert.ok(existsSync(new URL("../docs/reviews/student-experience-review.md", import.meta.url)));
});
