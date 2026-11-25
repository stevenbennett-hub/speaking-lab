// Teacher Lesson Manager (Slice 5): validation, overrides and history, extended lessons, export/import,
// draft isolation, presentation timer, no credentials.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const read = p => readFileSync(new URL(p, import.meta.url), "utf8");
const json = p => JSON.parse(read(p));
const load = f => { const c = {}; vm.runInNewContext(read(f), c); return c; };
const Mg = load("../site/js/manage.js").SLManage, S = load("../site/js/schedule.js").SLSchedule;
const plain = x => JSON.parse(JSON.stringify(x));
const data = () => ({ units: json("../site/data/units.json"), studios: json("../site/data/studios.json"), lessons: json("../site/data/lessons.json"),
  journals: json("../site/data/journals.json"), overrides: json("../site/data/overrides.json"), calendar: json("../site/data/calendar-2026-27.json"), pacing: json("../site/data/pacing.json"), aiperm: json("../site/data/ai-permissions.json") });
const TODAY = "2026-09-10";

test("the published data passes the same validation the Lesson Manager uses", () => {
  const v = Mg.validate(data(), { today: TODAY });
  assert.deepEqual(plain(v.errors), []);
});

test("the manager edits only lessons, journals and overrides — never the calendar or pacing guide", () => {
  assert.deepEqual(plain(Mg.EDITABLE), ["lessons", "journals", "overrides"]);
  const t = read("../site/js/teacher.js");
  assert.ok(!/W\.(calendar|pacing)\b/.test(t) && !/W\[["'](calendar|pacing)/.test(t));
});

test("validation catches missing fields, bad dates, duplicates, bad links and bad override types", () => {
  const d = data();
  d.lessons.days.w01d1.learn = { en: "", es: "" };
  d.lessons.days.w01d2.canvas = { url: "http://insecure.example" };
  d.lessons.days.w01d3.activities = ["not-a-lab"];
  d.journals.journals[1].id = d.journals.journals[0].id;
  d.overrides.overrides = [{ date: "2026-02-30", type: "closure", groups: "all", added: TODAY }, { date: "2026-09-20", type: "holiday", added: TODAY }, { date: "2026-09-21", type: "journal", journal: "nope", added: TODAY }, { date: "2026-09-22", type: "noJournal" }];
  d.overrides.releases = { "3": "2026-09-21 7am" };
  const v = Mg.validate(d), all = v.errors.map(e => `${e.file}|${e.where}|${e.msg}`).join("\n");
  for (const want of ["w01d1|Learning objective: English is empty", "w01d2|Canvas link must start with https://", "duplicate journal id", "date must be a real date", "type must be one of", 'journal "nope" does not exist', "added (the date it was entered) is required", "release must be a real date and time"]) assert.ok(all.includes(want), want);
  assert.ok(v.warnings.some(w => w.msg.includes('activity "not-a-lab"')), "unknown activity is a warning");
});

test("missing Spanish is flagged, not blocking", () => {
  const d = data(); d.lessons.days.w02d1.title = { en: "Ethics day", es: "" };
  const v = Mg.validate(d);
  assert.equal(v.errors.length, 0);
  assert.ok(v.warnings.some(w => w.where === "w02d1" && w.msg === "Lesson title: Spanish is missing"));
});

test("overrides: added today, never for past days; past overrides cannot be removed", () => {
  const o = Mg.addOverride({ overrides: [] }, { kind: "snow", date: "2026-09-16", note: "Snow day" }, TODAY);
  assert.deepEqual(plain(o.overrides[0]), { date: "2026-09-16", type: "closure", groups: "all", note: "Snow day", added: TODAY });
  assert.throws(() => Mg.addOverride(o, { kind: "assembly", date: "2026-09-01" }, TODAY), /Past classes are kept/);
  const a = Mg.addOverride(o, { kind: "assembly", date: "2026-09-14", groups: ["odd"] }, TODAY);
  assert.equal(a.overrides[0].type, "noJournal");
  assert.throws(() => Mg.removeOverride({ overrides: [{ date: "2026-09-08", type: "closure", added: "2026-09-01" }] }, 0, TODAY), /kept for history/);
  assert.equal(Mg.removeOverride(a, 0, TODAY).overrides.length, 1);
  assert.equal(Mg.isPast({ date: "2026-09-08", until: "2026-09-12" }, TODAY), false, "a range still running is not past");
});

test("history: a snow day entered through the manager leaves earlier classes and journal numbers unchanged", () => {
  const d = data(), opts = ov => ({ start: "2026-08-13", group: "odd", cal: d.calendar, units: d.units.units, journals: d.journals.journals, overrides: ov });
  const base = plain(S.meetings(opts({ overrides: [] })));
  const snow = Mg.addOverride({ overrides: [] }, { kind: "snow", date: "2026-09-17" }, TODAY);
  const after = plain(S.meetings(opts(snow)));
  assert.deepEqual(after.filter(r => r.date < TODAY), base.filter(r => r.date < TODAY));
  assert.ok(!after.some(r => r.date === "2026-09-17"));
});

test("extended lesson repeats the previous class's lesson; journals and numbers still follow the calendar", () => {
  const d = data(), opts = ov => ({ start: "2026-08-13", group: "odd", cal: d.calendar, units: d.units.units, journals: d.journals.journals, overrides: ov });
  const ext = Mg.addOverride({ overrides: [] }, { kind: "extend", date: "2026-09-14", groups: ["odd"] }, TODAY);
  const m = plain(S.meetings(opts(ext))), base = plain(S.meetings(opts({ overrides: [] })));
  const i = m.findIndex(r => r.date === "2026-09-14");
  assert.equal(m[i].extendOf, m[i - 1].date);
  assert.deepEqual(m.map(r => r.number), base.map(r => r.number), "journal numbers unchanged");
});

test("conflicts preview: weekends, already-closed days, wrong group, units out of order", () => {
  const d = data();
  d.overrides = { overrides: [{ date: "2026-09-12", type: "noJournal", groups: "all", added: TODAY }, { date: "2026-09-07", type: "closure", groups: "all", added: TODAY }, { date: "2026-09-15", type: "noJournal", groups: ["odd"], added: TODAY }], releases: { "4": "2026-09-01T07:00" } };
  const msgs = Mg.conflicts(d, S, "2026-08-13").map(c => c.msg).join("\n");
  for (const want of ["weekend", "already a no-school day (Labor Day)", "the odd group has no class this day", "Unit 4 opens before Unit 3"]) assert.ok(msgs.includes(want), want);
});

test("export: only changed files, in the site's exact format; import checks before replacing drafts", () => {
  const pub = data(), drafts = { lessons: JSON.parse(JSON.stringify(pub.lessons)), journals: pub.journals, overrides: pub.overrides };
  assert.equal(Mg.changed(pub, drafts).length, 0);
  drafts.lessons.days.w05d2.exit = { en: "One sentence: how do the two outlines differ?", es: "Una oración: ¿en qué se diferencian los dos esquemas?" };
  const ch = Mg.changed(pub, drafts);
  assert.deepEqual(plain(ch.map(c => c.path)), ["site/data/lessons.json"]);
  assert.equal(JSON.parse(ch[0].text).days.w05d2.exit.en, "One sentence: how do the two outlines differ?");
  assert.ok(ch[0].text.endsWith("}\n") && ch[0].text.includes('\n  "version"'), "two-space JSON with a final newline");
  // Import
  assert.equal(Mg.importFile("x.json", "not json", pub).ok, false);
  assert.equal(Mg.importFile("x.json", JSON.stringify({ hello: 1 }), pub).ok, false);
  const bad = JSON.parse(JSON.stringify(pub.lessons)); delete bad.days.w01d1;
  const r1 = Mg.importFile("lessons.json", JSON.stringify(bad), pub); assert.equal(r1.ok, false); assert.equal(r1.key, "lessons");
  const r2 = Mg.importFile("lessons.json", ch[0].text, pub); assert.equal(r2.ok, true);
  const bk = Mg.backup(drafts, TODAY), r3 = Mg.importFile("backup.json", bk, pub);
  assert.equal(r3.ok, true); assert.equal(r3.key, "backup"); assert.equal(r3.drafts.lessons.days.w05d2.exit.es.startsWith("Una"), true);
});

test("duplicating a lesson copies it as a draft for review", () => {
  const L = data().lessons; L.days.w08d1.status = { en: "approved", es: "approved" };
  const out = Mg.duplicateLesson(L, "w08d1", "w08d2");
  assert.equal(out.days.w08d2.learn.en, L.days.w08d1.learn.en);
  assert.deepEqual(plain(out.days.w08d2.status), { en: "draft", es: "draft" });
  assert.notEqual(L.days.w08d2.learn.en, out.days.w08d2.learn.en, "the original object is not changed");
});

test("drafts appear only for the teacher on their own browser, and never in student backups", () => {
  const boot = read("../site/js/boot.js"), page = read("../site/index.html");
  assert.match(boot, /if \(teacher\) try \{\s*if \(localStorage\.getItem\("speakup-teacher-preview"\) === "1"\)/);
  assert.ok(boot.indexOf('localStorage.getItem("speakup-teacher-ok")') < boot.indexOf("speakup-teacher-drafts-v1"));
  assert.ok(page.includes('!k.startsWith("speakup-teacher-")'));
});

test("presentation timer never starts by itself and has nothing to do with achievements", () => {
  const t = read("../site/js/teacher.js");
  assert.match(t, /let timer = \{ left: 600, run: false, id: null \};/);
  assert.ok(!/SLAchieve|speakup-achieve/.test(t), "no achievement code in the manager or presentation");
  assert.ok(!/setInterval\(tick, 1000\)[^;]*;\s*\}\s*\);?\s*$/.test(t.split("function viewPresent")[1].split("const fmtTimer")[0]), "no timer started while drawing");
});

test("no GitHub credentials, tokens or network publishing in the site", () => {
  for (const f of ["../site/js/teacher.js", "../site/js/manage.js", "../site/js/boot.js", "../site/js/student.js"]) {
    const s = read(f);
    assert.ok(!/api\.github\.com|Authorization:|ghp_[A-Za-z0-9]|github_pat_/.test(s), f);
  }
  assert.match(read("../site/js/teacher.js"), /No GitHub password or token is ever stored in this website/);
});

test("academic-year calendar is configurable and separate from reusable lessons", () => {
  const cfg = json("../site/data/config.json");
  assert.match(cfg.calendar, /^data\/calendar-[0-9-]+\.json$/);
  assert.ok(readFileSync(new URL(`../site/${cfg.calendar}`, import.meta.url)));
  assert.match(read("../site/js/boot.js"), /if \(cfg && \/\^data\\\/calendar-\[0-9-\]\+\\\.json\$\/\.test\(cfg\.calendar \|\| ""\)\) FILES\.calendar = cfg\.calendar;/);
  assert.ok(!JSON.stringify(json("../site/data/lessons.json")).match(/20\d\d-\d\d-\d\d/), "lessons contain no dates");
});

/* ---------- Slice 5 refinements ---------- */
test("realDate rejects impossible months and days without throwing", () => {
  for (const d of ["2026-13-01", "2026-00-10", "2026-02-31", "2026-02-29", "2026-1-01", "", null, undefined, 20260101, {}]) assert.doesNotThrow(() => Mg.realDate(d));
  assert.deepEqual(["2026-13-01", "2026-00-10", "2026-02-31", "2026-02-29"].map(Mg.realDate), [false, false, false, false]);
  assert.equal(Mg.realDate("2028-02-29"), true, "leap day");
  const d = data(); d.overrides.overrides = [{ date: "2026-13-01", type: "closure", groups: "all", added: "2026-14-02" }];
  const v = Mg.validate(d);
  assert.ok(v.errors.some(e => e.msg.startsWith("date must be a real date")) && v.errors.some(e => e.msg.startsWith("added")));
});

test("unit release dates must be real dates and times", () => {
  for (const bad of ["2027-02-31T07:00", "2026-13-01T07:00", "2026-09-21T24:00", "2026-09-21T7:00"]) {
    const d = data(); d.overrides.releases = { "3": bad };
    assert.ok(Mg.validate(d).errors.some(e => e.where === "release 3"), bad);
  }
  const ok = data(); ok.overrides.releases = { "3": "2026-09-21T07:00" };
  assert.equal(Mg.validate(ok).errors.length, 0);
});

test("an empty or broken journal library is an error, not a pass", () => {
  const empty = data(); empty.journals.journals = [];
  assert.ok(Mg.validate(empty).errors.some(e => e.msg === "the journal library is empty"));
  const notList = data(); notList.journals.journals = { a: 1 };
  assert.ok(Mg.validate(notList).errors.some(e => e.msg === "journals must be a list"));
  const holes = data(); holes.journals.journals.push(null);
  assert.ok(Mg.validate(holes).errors.some(e => e.msg === "journal entry is empty or not an object"));
  const missingUnit = data(); missingUnit.journals.journals = missingUnit.journals.journals.filter(j => j.unit !== 4);
  assert.ok(Mg.validate(missingUnit).errors.some(e => e.where === "Unit 4" && e.msg === "has no journals"));
});

test("null or malformed lesson records give clear errors instead of crashing", () => {
  const d = data(); d.lessons.days.w01d1 = null; d.lessons.days.w01d2 = "text"; d.lessons.days.w01d3.learn = "just a string"; d.lessons.days.w01d4.success = null; d.lessons.days.w01d5.activities = "rlab";
  let v; assert.doesNotThrow(() => { v = Mg.validate(d); });
  const msgs = v.errors.map(e => `${e.where}: ${e.msg}`);
  for (const want of ["w01d1: lesson record is empty or not an object", "w01d2: lesson record is empty or not an object", "w01d3: Learning objective: must have English and Spanish text", "w01d4: success criteria are missing", "w01d5: activities must be a list"]) assert.ok(msgs.some(m => m.startsWith(want)), want);
});

test("malformed imports return an actionable message, never an exception", () => {
  const pub = data();
  const cases = ["", "null", "[]", "42", "{\"days\": null}", "{\"days\": {\"w01d1\": null}}", "{\"journals\": []}", "{\"journals\": [null]}", "{\"overrides\": [null], \"releases\": \"x\"}", "{\"kind\": \"speakup-teacher-drafts\"}", "{\"kind\": \"speakup-teacher-drafts\", \"drafts\": {\"lessons\": {\"days\": 5}}}", "{oops"];
  for (const text of cases) {
    let r; assert.doesNotThrow(() => { r = Mg.importFile("x.json", text, pub); }, text);
    assert.equal(r.ok, false, text);
    assert.ok(typeof r.msg === "string" && r.msg.length > 10, `message for ${text}`);
  }
  assert.doesNotThrow(() => Mg.validate(null)); assert.doesNotThrow(() => Mg.validate({ lessons: 5, journals: "x", overrides: [] }));
});

test("approval goes back to draft when approved text is edited; teacher approvals are kept", () => {
  const before = { learn: { en: "I can A.", es: "Puedo A." }, lang: { en: "I can B.", es: "Puedo B." }, status: { en: "approved", es: "approved" } };
  const T = Mg.LESSON_TEXT;
  // Spanish edited, both left on "approved": Spanish resets, English stays.
  assert.deepEqual(plain(Mg.reviewAfterEdit(before, { ...before, learn: { en: "I can A.", es: "Puedo A, revisado." } }, { en: "approved", es: "approved" }, T)), { en: "approved", es: "draft" });
  // Whitespace only is not a substantive edit.
  assert.deepEqual(plain(Mg.reviewAfterEdit(before, { ...before, learn: { en: "I can A.  ", es: " Puedo A." } }, { en: "approved", es: "approved" }, T)), { en: "approved", es: "approved" });
  // Draft → approved in the same save is the teacher's decision and stays.
  const draft = { ...before, status: { en: "draft", es: "draft" } };
  assert.deepEqual(plain(Mg.reviewAfterEdit(draft, { ...draft, lang: { en: "I can C.", es: "Puedo C." } }, { en: "approved", es: "draft" }, T)), { en: "approved", es: "draft" });
  // Never approves on its own.
  assert.deepEqual(plain(Mg.reviewAfterEdit(draft, draft, { en: "draft", es: "draft" }, T)), { en: "draft", es: "draft" });
  // Journals: list fields count too.
  const j = { prompt: { en: "P", es: "P" }, frames: { en: ["A ___"], es: ["A ___"] }, status: { en: "approved", es: "approved" } };
  assert.deepEqual(plain(Mg.reviewAfterEdit(j, { ...j, frames: { en: ["B ___"], es: ["A ___"] } }, { en: "approved", es: "approved" }, Mg.JOURNAL_TEXT)), { en: "draft", es: "approved" });
  const t = read("../site/js/teacher.js");
  assert.match(t, /ls\.status = M\.reviewAfterEdit\(/); assert.match(t, /j\.status = M\.reviewAfterEdit\(/);
});

test("the manager says plainly what editing reusable content does to archived classes", () => {
  const t = read("../site/js/teacher.js");
  assert.match(t, /You are editing reusable teaching content/);
  assert.match(t, /The archive shows the current wording of a lesson/);
  assert.match(t, /Dates, journal numbers and which journal each class wrote do not change/);
});

test("AI permission on a lesson: known levels only, bilingual note, expanded needs a note (slice 7)", () => {
  const d = data(), k = Object.keys(d.lessons.days)[0], errs = () => Mg.validate(d, { today: TODAY }).errors.filter(e => e.where === k).map(e => e.msg).join(" | ");
  d.lessons.days[k].ai = { level: "coach" }; assert.equal(errs(), "");
  d.lessons.days[k].ai = { level: "anything" }; assert.match(errs(), /AI permission must be one of: none, grammar, coach, expanded/);
  d.lessons.days[k].ai = null; assert.match(errs(), /AI permission must be one of/);
  d.lessons.days[k].ai = { level: "expanded" }; assert.match(errs(), /expanded AI assistance needs a note/);
  d.lessons.days[k].ai = { level: "expanded", note: { en: "You may ask AI to suggest three possible hooks; choose and rewrite one yourself.", es: "" } };
  assert.equal(errs(), "", "an English note is enough to save; missing Spanish is a warning");
  assert.ok(Mg.validate(d, { today: TODAY }).warnings.some(w => w.where === k && /AI permission note/.test(w.msg)));
  d.lessons.days[k].ai = { level: "none", note: "x" }; assert.match(errs(), /note must have English and Spanish/);
  d.lessons.days[k].ai = { level: "grammar", eld: true }; assert.equal(errs(), "");
  d.lessons.days[k].ai = { level: "grammar", eld: "yes" }; assert.match(errs(), /English language development option must be true or false/);
  const P = json("../site/data/ai-permissions.json");
  assert.equal(P.default, "grammar", "class default: grammar and spelling feedback only");
  assert.deepEqual(P.levels.map(l => [l.id, l.rank]), [["none", 0], ["grammar", 1], ["coach", 2], ["expanded", 3]]);
  for (const l of P.levels) for (const f of ["name", "short", "explain"]) assert.ok(l[f].en && l[f].es, `${l.id} ${f}`);
  // Published lessons may carry AI settings once Mr. Bennett sets them in the Lesson Manager (Slice 10 workflow test);
  // whatever is published must pass the same validation.
  const pub = data(); assert.equal(Mg.validate(pub, { today: TODAY }).errors.filter(e => /AI permission|English language development/.test(e.msg)).length, 0);
});
