// Slice 9: language support preferences, digital journal option, college Unit 5 objectives, Ad Detective and
// teacher verification safeguards, accessibility fixes, release documents.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";
import vm from "node:vm";

const read = p => readFileSync(new URL(p, import.meta.url), "utf8");
const json = p => JSON.parse(read(p));
const student = read("../site/js/student.js"), page = read("../site/index.html");
const hash = (kind, code) => { let x = 0x811c9dc5; for (const b of new TextEncoder().encode(`speakup-${kind}:` + String(code).trim())) { x ^= b; x = Math.imul(x, 0x01000193) >>> 0; } return x.toString(16).padStart(8, "0"); };

test("language support: three preferences, not proficiency levels; same goals; earlier choices carry over", () => {
  assert.match(student, /const SUPPORT_LEVELS = \["guided", "supported", "independent"\];/);
  assert.match(student, /level: "speakup-support-level"/, "a new key; the old translation key is kept");
  assert.match(student, /support: "speakup-support"/);
  assert.match(student, /path\(\) === "eld" \? "guided" : "supported"/, "the learning-English pathway starts on Guided; others on Supported");
  assert.match(student, /const supportsOn = \(\) => supportLevel\(\) === "guided" \|\| get\(K\.support\) === "1";/);
  assert.match(student, /A learning preference, not a language level\. Change it anytime; your progress stays\./);
  assert.doesNotMatch(student, /WIDA|proficiency level \d|Level [1-6] \(Entering|Emerging|Bridging/i, "no formal proficiency labels");
  // Independent folds sentence starters; Guided adds a short step list; objectives are never swapped by level.
  assert.match(student, /supportLevel\(\) === "independent" \? `<details class="sl2-fold">/);
  assert.match(student, /supportLevel\(\) === "guided" \? `<ol class="sl2-steps-mini"/);
  assert.doesNotMatch(student, /supportLevel\(\)[^\n]{0,80}(objectives|learn|success)/, "learning objectives are the same at every level");
  // Backups include the preference (all speakup-* keys except the access switches).
  assert.match(page, /k !== "speakup-col-ok" && k !== "speakup-journal-ok" && !k\.startsWith\("speakup-teacher-"\)/);
  for (const f of ["btp.js", "research.js"]) assert.match(read(`../site/js/${f}`), /SL2\.supportLevel\(\) === "guided" \? " open" : ""/, `${f}: vocabulary opens for Guided`);
});

test("digital journal: instructor-authorized, local only, never graded or marked complete; handwritten stays the routine", () => {
  const A = json("../site/data/access.json");
  assert.match(A.journal.codeHash, /^[0-9a-f]{8}$/);
  assert.equal(A.journal.codeHash, hash("journal", "type-journal-4826"), "matches the code given to Mr. Bennett");
  assert.match(student, /journalOk: "speakup-journal-ok", journal: "speakup-journal-v1"/);
  assert.match(student, /hash\("journal", v\) === D\.access\.journal\.codeHash/);
  assert.match(student, /Handwritten journals are the class routine\./);
  assert.match(student, /Typing here doesn't mark your journal as done or graded/);
  assert.match(student, /copy it into the Canvas assignment for Journal #/);
  for (const k of ["data-sl2-jprint", "data-sl2-jcopy", "data-sl2-jdl"]) assert.ok(student.includes(k), k);
  const dj = student.slice(student.indexOf("function digitalJournal"), student.indexOf("const DEFAULT_EXPECT"));
  assert.doesNotMatch(dj, /fetch\(|sendBeacon|XMLHttpRequest|achState|mastered|earned/, "nothing sent, nothing awarded");
  assert.match(dj, /<label for="\$\{id\}" class="sr">/, "the text area has a label");
  assert.equal((page.match(/k !== "speakup-journal-ok"/g) || []).length, 2, "the unlock is not copied by backup or restore");
});

test("college pathway: Unit 5 now has daily college objectives (draft); college still off by default", () => {
  const L = json("../site/data/lessons.json").days;
  const u5 = ["w11d1", "w11d2", "w11d3", "w11d4", "w11d5", "w12d1", "w12d2", "w12d3", "w12d5"];
  for (const k of u5) { assert.ok(L[k].col && L[k].col.en.startsWith("I can") && L[k].col.es.startsWith("Puedo"), k); }
  assert.notEqual(json("../site/data/lessons.json").status.en, "approved", "lessons stay drafts until reviewed");
  assert.equal(json("../site/data/access.json").college.enabled, false);
  const rv = read("../docs/reviews/college-pathway-review.md");
  assert.match(rv, /off by default/); assert.match(rv, /Nothing here implies concurrent enrollment has been approved/);
});

test("Ad Detective: only its versioned mastery summary is read, never its own work (Slice 10 integration)", () => {
  for (const f of ["student.js", "progress.js", "research.js", "aistudio.js", "btp.js"]) assert.doesNotMatch(read(`../site/js/${f}`), /addetective/, `${f} does not read Ad Detective progress`);
  const ach = read("../site/js/achievements.js");
  assert.doesNotMatch(ach, /addetective-v1/, "Ad Detective's own work is never read");
  assert.deepEqual(ach.match(/addetective-[a-z0-9-]+/g).filter((v, i, a) => a.indexOf(v) === i), ["addetective-mastery-v1"]);
  const pr = read("../docs/proposals/ad-detective-integration.md");
  assert.match(pr, /Show the answer/); assert.match(pr, /addetective-mastery-v1/);
  const ad = json("../site/data/studios.json").experiences.find(x => x.id === "ad-detective");
  assert.equal(ad.href, "https://stevenbennett-hub.github.io/ad-detective/", "Ad Detective itself is unchanged and still linked");
});

test("teacher-verified communication badges stay pending; no student can verify them", () => {
  const cfg = json("../site/data/achievements.json");
  for (const id of ["confident-speaker", "master-storyteller", "master-communicator"]) {
    const b = cfg.badges.find(x => x.id === id); assert.ok(b, id); assert.equal(b.status, "pending-verification", id);
    assert.ok(b.criteria.every(c => c.type === "teacher" || c.type === "external" || b.status !== "active"));
  }
  assert.match(read("../docs/proposals/teacher-verified-achievements.md"), /Canvas is the record/);
});

test("accessibility fixes stay fixed", () => {
  assert.equal((page.match(/id="ob-title"/g) || []).length, 0, "no clash with the Outline Builder's title field");
  assert.match(page, /<h3 id="ob-heading">/);
  assert.match(read("../site/css/student.css"), /\.sl2-table thead th \{[^}]*background: var\(--surface\);/, "table headers keep their contrast");
  assert.match(read("../site/css/student.css"), /min-width: min\(16em, 100%\)/, "menus reflow at 320 px");
  assert.match(page, /@media \(prefers-reduced-motion: no-preference\) \{ html \{ scroll-behavior: smooth; \} \}/);
  assert.match(page, /scroll-padding-top/);
  const r = read("../docs/reviews/accessibility-performance-review.md");
  assert.match(r, /WCAG 2\.2 AA/); assert.match(r, /not\*\* a formal conformance claim/);
});

test("Episode 1 film: supplied file in place, under GitHub's limits, never autoplayed", () => {
  const f = new URL("../site/media/btp/ep1/beyond_the_podium_final.mp4", import.meta.url);
  assert.ok(existsSync(f)); const size = statSync(f).size;
  assert.ok(size > 10e6 && size < 25e6, "the approved 15.9 MB film; under the 25 MB web-upload and 100 MB GitHub limits");
  assert.doesNotMatch(read("../site/js/btp.js").replace(/\/\*[\s\S]*?\*\//g, ""), /autoplay/i);
  const ep = json("../site/data/btp/episode-1.json");
  assert.equal(ep.media.poster.available, false, "no thumbnail was supplied, and none was generated");
});

test("release documents exist", () => {
  const c = read("../docs/RELEASE_CHECKLIST.md");
  for (const k of ["Instructional approval", "Spanish", "Media", "College", "Preview and production storage", "Scheduling", "Lesson Manager", "Achievements", "Accessibility", "District laptop", "School network", "pilot", "GitHub deployment", "Backup and rollback"]) assert.match(c, new RegExp(k, "i"), k);
});
