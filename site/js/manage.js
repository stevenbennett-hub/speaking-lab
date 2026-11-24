/* Speak Up | The Speaking Lab — Lesson Manager core (Slice 5). Pure functions, no DOM: used by the
   Teacher Lesson Manager (js/teacher.js) and by the Node tests, so the site and the tests check data the
   same way. It edits the existing files only (lessons.json, journals.json, overrides.json); it never
   changes the district calendar or the pacing guide. Nothing here publishes anything: the teacher exports
   changed files and commits them to GitHub. */
(function (root) {
  "use strict";
  const EDITABLE = ["lessons", "journals", "overrides"];
  const FILE = { lessons: "site/data/lessons.json", journals: "site/data/journals.json", overrides: "site/data/overrides.json" };
  const ISO = /^\d{4}-\d{2}-\d{2}$/, AT = /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/;
  const realDate = d => ISO.test(d || "") && new Date(d + "T12:00:00Z").toISOString().slice(0, 10) === d;
  const dayKeys = () => { const k = []; for (let w = 1; w <= 16; w++) for (let d = 1; d <= 5; d++) k.push(`w${String(w).padStart(2, "0")}d${d}`); return k; };
  const TYPES = ["closure", "noJournal", "journal", "extend"];
  const clone = x => JSON.parse(JSON.stringify(x));

  /** Teacher-friendly override kinds, mapped onto the existing override types (no new scheduling system). */
  const KINDS = {
    snow: { type: "closure", groups: "all", en: "Snow day / school closure (shifts the pacing guide)", es: "Día de nieve / cierre escolar (mueve el calendario)" },
    closureGroup: { type: "closure", en: "No class for one group (class-specific exception)", es: "Sin clase para un grupo (excepción de clase)" },
    assembly: { type: "noJournal", en: "Assembly or shortened class (no journal)", es: "Asamblea o clase corta (sin diario)" },
    noJournal: { type: "noJournal", en: "No-journal day (testing, field trip…)", es: "Día sin diario (examen, excursión…)" },
    extend: { type: "extend", en: "Extended lesson (repeat the previous lesson)", es: "Lección extendida (repetir la lección anterior)" },
    journal: { type: "journal", en: "Assign a specific journal", es: "Asignar un diario específico" },
  };

  /* ---------- validation ---------- */
  /** Check the editable files against the rest of the site. Returns { errors: [...], warnings: [...] } of
      { file, where, msg }. Errors block export; warnings are shown for review. */
  function validate(d, opt) {
    const today = (opt && opt.today) || "";
    const E = [], W = [], err = (file, where, msg) => E.push({ file, where, msg }), warn = (file, where, msg) => W.push({ file, where, msg });
    const labs = (d.units && d.units.labNames) || {}, studios = new Set(((d.studios && d.studios.experiences) || []).map(x => x.id));
    const both = (o, file, where, name, required) => {
      if (!o) { if (required) err(file, where, `${name}: missing`); return; }
      if (!String(o.en || "").trim()) (required ? err : warn)(file, where, `${name}: English is empty`);
      if (!String(o.es || "").trim()) warn(file, where, `${name}: Spanish is missing`);
    };
    // lessons.json
    const L = d.lessons || {};
    if (!L.days || typeof L.days !== "object") err("lessons", "", "days is missing");
    else {
      for (const k of dayKeys()) if (!L.days[k]) err("lessons", k, "lesson is missing for this planned day");
      for (const [k, ls] of Object.entries(L.days)) {
        if (!/^w(0[1-9]|1[0-6])d[1-5]$/.test(k)) { err("lessons", k, "not a planned-day key (w01d1 … w16d5)"); continue; }
        both(ls.learn, "lessons", k, "Learning objective", true);
        both(ls.lang, "lessons", k, "Language objective", true);
        if (ls.col) both(ls.col, "lessons", k, "College learning objective", false);
        if (ls.title) both(ls.title, "lessons", k, "Lesson title", false);
        if (ls.exit) both(ls.exit, "lessons", k, "Exit reflection", false);
        for (const f of ["success", "agenda"]) if (ls[f]) {
          if (!Array.isArray(ls[f].en) || !ls[f].en.length) (f === "success" ? err : warn)("lessons", k, `${f}: needs at least one English item`);
          else if (!Array.isArray(ls[f].es) || ls[f].es.length !== ls[f].en.length || ls[f].es.some(x => !String(x).trim())) warn("lessons", k, `${f}: Spanish items missing or not matching`);
        }
        if (!ls.success) err("lessons", k, "success criteria are missing");
        for (const a of ls.activities || []) if (!labs[a]) warn("lessons", k, `activity "${a}" is not a Speaking Lab lab`);
        for (const s of ls.featured || []) if (!studios.has(s)) warn("lessons", k, `featured experience "${s}" does not exist`);
        if (ls.canvas) { if (!/^https:\/\//.test(ls.canvas.url || "")) err("lessons", k, "Canvas link must start with https://"); if (ls.canvas.label) both(ls.canvas.label, "lessons", k, "Canvas link label", false); }
        if (ls.status) for (const l of ["en", "es"]) if (ls.status[l] && !["draft", "approved"].includes(ls.status[l])) err("lessons", k, `status.${l} must be draft or approved`);
      }
    }
    // journals.json
    const J = (d.journals && d.journals.journals) || [], ids = new Set(), units = new Set(((d.units && d.units.units) || []).map(u => u.id));
    J.forEach((j, i) => {
      const where = j.id || `#${i}`;
      if (!j.id) err("journals", where, "id is missing"); else if (ids.has(j.id)) err("journals", where, "duplicate journal id"); else ids.add(j.id);
      if (!units.has(j.unit)) err("journals", where, "unit must be 1–6");
      for (const f of ["focus", "prompt", "share"]) both(j[f], "journals", where, f, true);
      if (j.expect) both(j.expect, "journals", where, "Response expectations", false);
      for (const f of ["frames", "vocab"]) { if (!j[f] || !Array.isArray(j[f].en) || !j[f].en.length) err("journals", where, `${f}: needs at least one English item`); else if (!Array.isArray(j[f].es) || j[f].es.length !== j[f].en.length) warn("journals", where, `${f}: Spanish items missing or not matching`); }
      if (j.experience && !studios.has(j.experience)) warn("journals", where, `experience "${j.experience}" does not exist`);
      if (!j.status || !["draft", "approved"].includes(j.status.en) || !["draft", "approved"].includes(j.status.es)) err("journals", where, "status.en and status.es must be draft or approved");
    });
    const nums = J.filter(j => !j.flex).map(j => j.n);
    nums.forEach((n, i) => { if (n !== i + 1) err("journals", J.filter(j => !j.flex)[i].id, `planned number should be ${i + 1}`); });
    J.filter(j => j.flex && j.before).forEach(j => { if (!J.some(x => x.id === j.before && x.unit === j.unit && !x.flex)) err("journals", j.id, `before: "${j.before}" is not a core journal in Unit ${j.unit}`); });
    // overrides.json
    const O = (d.overrides && d.overrides.overrides) || [];
    O.forEach((o, i) => {
      const where = `${o.date || "?"} ${o.type || "?"}`;
      if (!TYPES.includes(o.type)) err("overrides", where, `type must be one of ${TYPES.join(", ")}`);
      if (!realDate(o.date)) err("overrides", where, "date must be a real date (YYYY-MM-DD)");
      if (o.until && (!realDate(o.until) || o.until < o.date)) err("overrides", where, "until must be a real date on or after the date");
      if (!realDate(o.added)) err("overrides", where, "added (the date it was entered) is required");
      if (!(o.groups === undefined || o.groups === "all" || (Array.isArray(o.groups) && o.groups.length && o.groups.every(g => g === "odd" || g === "even")))) err("overrides", where, 'groups must be "all", ["odd"], ["even"] or both');
      if (o.type === "journal" && !ids.has(o.journal)) err("overrides", where, `journal "${o.journal}" does not exist`);
      if (realDate(o.added) && realDate(o.date) && o.added > (o.until || o.date)) warn("overrides", where, "entered after the day(s) it names: it will not change those past classes (history rule)");
    });
    for (const [u, at] of Object.entries((d.overrides && d.overrides.releases) || {})) {
      if (!units.has(Number(u))) err("overrides", `release ${u}`, "no such unit");
      if (!AT.test(at)) err("overrides", `release ${u}`, "release must be YYYY-MM-DDTHH:MM (Central Time)");
    }
    if (today) O.filter(o => realDate(o.added) && o.added > today).forEach(o => warn("overrides", `${o.date} ${o.type}`, "added date is in the future"));
    return { errors: E, warnings: W };
  }

  /** Scheduling conflicts to preview before publishing. sched = window.SLSchedule; start = semester start. */
  function conflicts(d, sched, start) {
    const out = [], cal = d.calendar, O = (d.overrides && d.overrides.overrides) || [];
    const v = sched.courseWeeks(start, cal, d.overrides), all = [].concat(v.pre || [], ...v.weeks);
    const list = sched.noSchoolList(cal, { overrides: [] });
    O.forEach(o => {
      for (let day = o.date; day <= (o.until || o.date); day = sched.addDays(day, 1)) {
        const why = sched.offReason(list, day), dow = sched.dow(day);
        if (why) out.push({ date: day, msg: `already a no-school day (${why})` });
        else if (dow === 0 || dow === 6) out.push({ date: day, msg: "weekend" });
        else if (Array.isArray(o.groups) && o.groups.length === 1 && sched.groupOfDay(day, cal) !== o.groups[0]) out.push({ date: day, msg: `the ${o.groups[0]} group has no class this day` });
      }
    });
    const seen = {};
    O.forEach(o => { const k = `${o.date}|${JSON.stringify(o.groups || "all")}`; if (seen[k] && seen[k] !== o.type) out.push({ date: o.date, msg: `two different overrides for the same class (${seen[k]} and ${o.type})` }); seen[k] = o.type; });
    const rel = (d.overrides && d.overrides.releases) || {}, units = d.units.units.map(u => u.id);
    let prev = "";
    for (const u of units) { const at = rel[String(u)] || sched.unitReleaseAt(u, { start, cal, units: d.units.units, overrides: d.overrides }); if (at && prev && at < prev) out.push({ date: at.slice(0, 10), msg: `Unit ${u} opens before Unit ${u - 1}` }); if (at) prev = at; }
    if (!all.length) out.push({ date: start, msg: "no class days found for this semester" });
    return out;
  }

  /* ---------- history protection ---------- */
  /** An override for a day before today is history: it can be viewed but not changed or removed,
      because past classes, lessons and journal numbers were shown with it. */
  const isPast = (o, today) => (o.until || o.date) < today;
  /** Add an override the way the manager does: stamped with today's date as `added`. */
  function addOverride(overrides, o, today) {
    if (!realDate(o.date) || o.date < today) throw new Error("Choose today or a future date. Past classes are kept as they were.");
    const out = clone(overrides); out.overrides = out.overrides || [];
    const k = KINDS[o.kind] || {}, rec = { date: o.date, type: k.type || o.type, groups: o.groups || k.groups || "all", note: o.note || "", added: today };
    if (o.until) rec.until = o.until; if (rec.type === "journal") rec.journal = o.journal;
    out.overrides.push(rec); out.overrides.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    return out;
  }
  function removeOverride(overrides, index, today) {
    const o = overrides.overrides[index];
    if (!o) throw new Error("No such override.");
    if (isPast(o, today) || o.date < today) throw new Error("This override is in the past and is kept for history.");
    const out = clone(overrides); out.overrides.splice(index, 1); return out;
  }

  /* ---------- drafts, export, import ---------- */
  const stable = x => JSON.stringify(x, null, 2) + "\n";
  /** Which editable files differ from the published ones. */
  function changed(published, drafts) {
    return EDITABLE.filter(k => drafts[k] && stable(drafts[k]) !== stable(published[k])).map(k => ({ key: k, path: FILE[k], text: stable(drafts[k]) }));
  }
  /** Read an imported file: which data file it is, and whether it is valid with the rest of the site. */
  function importFile(name, text, current) {
    let obj; try { obj = JSON.parse(text); } catch (e) { return { ok: false, msg: "This is not a JSON file." }; }
    const key = obj && obj.days ? "lessons" : obj && Array.isArray(obj.journals) ? "journals" : obj && Array.isArray(obj.overrides) ? "overrides" : obj && obj.kind === "speakup-teacher-drafts" ? "backup" : null;
    if (!key) return { ok: false, msg: "This file is not lessons.json, journals.json, overrides.json or a Lesson Manager backup." };
    if (key === "backup") { const next = { ...current, ...obj.drafts }; const v = validate(next); return { ok: !v.errors.length, key, drafts: obj.drafts, v }; }
    const next = { ...current, [key]: obj }, v = validate(next);
    return { ok: !v.errors.length, key, data: obj, v };
  }
  const backup = (drafts, today) => stable({ kind: "speakup-teacher-drafts", saved: today, drafts });

  /** Copy one planned day's lesson onto another (keeps the target's review status as draft). */
  function duplicateLesson(lessons, from, to) {
    if (!lessons.days[from] || !lessons.days[to]) throw new Error("Unknown planned day.");
    const out = clone(lessons); out.days[to] = { ...clone(lessons.days[from]), status: { en: "draft", es: "draft" } }; return out;
  }
  const statusOf = (lessons, k) => (lessons.days[k] && lessons.days[k].status) || lessons.status || { en: "draft", es: "draft" };

  root.SLManage = { EDITABLE, FILE, KINDS, TYPES, validate, conflicts, isPast, addOverride, removeOverride, changed, importFile, backup, duplicateLesson, statusOf, dayKeys, realDate };
})(typeof window !== "undefined" ? window : globalThis);
