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
  journals: json("../site/data/journals.json"), overrides: json("../site/data/overrides.json"), calendar: json("../site/data/calendar-2026-27.json"), pacing: json("../site/data/pacing.json") });
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
  for (const want of ["w01d1|Learning objective: English is empty", "w01d2|Canvas link must start with https://", "duplicate journal id", "date must be a real date", "type must be one of", 'journal "nope" does not exist', "added (the date it was entered) is required", "release must be YYYY-MM-DDTHH:MM"]) assert.ok(all.includes(want), want);
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
