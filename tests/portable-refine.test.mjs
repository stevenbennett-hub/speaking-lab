// Portable achievements review refinements (Nov 24, 2026): the backup button name, knowledge-badge competencies,
// the visible-not-hidden note, the backup-contents note, and the accessibility roadmap item.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = p => readFileSync(new URL(p, import.meta.url), "utf8");
const cert = read("../site/js/certificates.js"), cele = read("../site/js/celebrate.js"), page = read("../site/index.html");
const act = JSON.parse(read("../site/data/activities.json")), ach = JSON.parse(read("../site/data/achievements.json"));

test("the celebration action is called Back up my progress and still opens the backup", () => {
  assert.match(cele, /data-slc-save data-mywork="1">\$\{esc\(L\("Back up my progress", "Copiar mi progreso"\)\)\}/);
  assert.doesNotMatch(cele, /Save achievement|Guardar logro/);
  assert.doesNotMatch(read("../docs/CERTIFICATES.md"), /Save achievement/);
});

test("knowledge badges get competencies only from existing skills and only where supported", () => {
  const bs = act.badgeSkills, known = Object.keys(act.skills);
  assert.ok(bs && typeof bs.$comment === "string" && /Draft/.test(bs.$comment), "documented and draft");
  assert.deepEqual(bs["communication-explorer"], ["process"], "Unit 1: the communication process");
  assert.deepEqual(bs["evidence-investigator"], ["audience", "research", "organization"], "Unit 2: audience, research, structure");
  assert.equal(bs["persistent-learner"], undefined, "no single competency for improving any score");
  for (const [id, list] of Object.entries(bs)) {
    if (id === "$comment") continue;
    const b = ach.badges.find(x => x.id === id);
    assert.ok(b, `${id} is a real badge`);
    assert.equal(b.level, "knowledge", `${id}: only knowledge badges (others take skills from their activities)`);
    for (const s of list) assert.ok(known.includes(s), `${id}: ${s} is an existing competency`);
  }
  assert.match(cert, /for \(const s of \(\(cat\.badgeSkills \|\| \{\}\)\[b\.id\] \|\| \[\]\)\) if \(\(cat\.skills \|\| \{\}\)\[s\] && !out\.includes\(s\)\) out\.push\(s\);/);
  assert.equal(JSON.stringify(ach).includes("badgeSkills"), false, "criteria and points are unchanged");
});

test("names and reflections: visible on exported copies, never sent, never in metadata", () => {
  assert.match(cert, /Your name and reflection answers appear only where you can see them on the document\. Speaking Lab never sends them anywhere and never adds them to hidden file information \(metadata\) or to the file name\./);
  assert.equal((cert.match(/\$\{nameField\(\)\}\$\{NOTE\(\)\}\$\{NOTE2\(\)\}/g) || []).length, 2, "on the certificate and the portfolio");
  assert.match(cert, /Adding your name is optional\. Speaking Lab uses it temporarily/, "the original notice is unchanged");
  const r = read("../docs/privacy/STUDENT_PRIVACY_AND_DATA_HANDLING.md");
  assert.match(r, /\*\*Visible, not hidden\.\*\*/);
});

test("backups: practice responses and typed journals may hold voluntarily typed personal information", () => {
  const en = "Your backup also holds anything you typed in practice activities and typed journals, so keep it in your own Drive and don't share it. Certificate names and portfolio reflections are never included.";
  assert.ok(page.includes(`<p class="mw-note">${en}</p>`), "shown in the backup dialog");
  assert.ok(page.includes(JSON.stringify(en) + ": "), "with a draft Spanish translation");
  const r = read("../docs/privacy/STUDENT_PRIVACY_AND_DATA_HANDLING.md");
  assert.match(r, /\*\*Voluntarily entered information\.\*\*/);
  assert.match(r, /\*\*What a backup contains:\*\* the student's practice responses, scores and typed journals/);
});

test("accessible exports are on the future accessibility roadmap, not built now", () => {
  assert.match(read("../DEVELOPMENT_ROADMAP.md"), /## Future accessibility work \(needs approval\)\n- \*\*Accessible certificate and portfolio exports\.\*\*/);
  assert.doesNotMatch(cert, /\/StructTreeRoot|\/MarkInfo/, "no new export format was introduced");
});
