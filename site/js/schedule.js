/* Speak Up | The Speaking Lab — schedule engine.
   One place for: today's date in America/Chicago, course weeks, the 90-minute odd/even block schedule
   (with alternating Wednesdays), classroom overrides, and which Daily Learning Journal a class does on a date.
   Dates are ISO strings ("2026-08-13") and all arithmetic uses UTC noon, so daylight saving time and the
   laptop's own time zone never shift a day. Plain script: works in the browser (window.SLSchedule) and in
   Node tests (globalThis.SLSchedule). Client clocks and this logic can be changed by anyone; it is a
   classroom guide, not access control. */
(function (root) {
  "use strict";
  const TZ = "America/Chicago";
  const DAY = 86400000;
  const toD = iso => new Date(iso + "T12:00:00Z");
  const iso = d => d.toISOString().slice(0, 10);
  const addDays = (s, n) => iso(new Date(toD(s).getTime() + n * DAY));
  const dow = s => toD(s).getUTCDay(); // 0 Sun … 6 Sat
  const monOf = s => addDays(s, -((dow(s) + 6) % 7));
  const isWeekday = s => { const w = dow(s); return w > 0 && w < 6; };

  let previewDate = null;
  /** Today's calendar date in America/Chicago, whatever time zone the laptop is set to. */
  function chicagoToday(now) {
    if (previewDate && now === undefined) return previewDate;
    return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now || new Date());
  }
  /** Teacher preview (display only). The page turns it on only after the teacher code; see js/boot.js. */
  function setPreviewDate(s) { previewDate = /^\d{4}-\d{2}-\d{2}$/.test(s || "") && iso(toD(s)) === s ? s : null; return previewDate; }
  const isPreview = () => !!previewDate;
  /** Now in America/Chicago as "YYYY-MM-DDTHH:MM" (24-hour). A preview day is shown as of 12:00 noon. */
  function chicagoNow(now) {
    if (previewDate && now === undefined) return previewDate + "T12:00";
    const p = {}; new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(now || new Date()).forEach(x => { p[x.type] = x.value; });
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
  }

  /* ---------- overrides ---------- */
  function expandOverrides(overrides) {
    const out = [];
    for (const o of (overrides && overrides.overrides) || []) {
      const end = o.until || o.date;
      for (let d = o.date; d <= end; d = addDays(d, 1)) out.push({ date: d, type: o.type, groups: o.groups || "all", note: o.note || "", journal: o.journal || null, added: o.added || "" });
    }
    return out;
  }
  /* History rule: an override never changes a class that happened before the override was added
     (`added`, the date the teacher entered it). Past journal numbers and lessons therefore stay as they were. */
  const appliesOn = (o, day) => !o.added || o.added <= day;
  const known = (overrides, day) => ({ ...(overrides || {}), overrides: ((overrides && overrides.overrides) || []).filter(o => !o.added || o.added <= day) });
  const hitsGroup = (o, g) => o.groups === "all" || (Array.isArray(o.groups) && (!g || o.groups.includes(g)));
  /** District no-school ranges plus whole-school closures from overrides (these move the pacing too). */
  function noSchoolList(cal, overrides) {
    const extra = expandOverrides(overrides)
      .filter(o => o.type === "closure" && o.groups === "all" && appliesOn(o, o.date))
      .map(o => [o.date, o.date, o.note || "Closure"]);
    return cal.noSchool.concat(extra).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  }
  const offReason = (list, s) => { const r = list.find(([a, b]) => s >= a && s <= b); return r ? r[2] : null; };

  /* ---------- semesters and course weeks (same rules the page has used since Nov 2026) ---------- */
  function semesterOf(cal, s) {
    const fy = Number(cal.semesterStart.fall.slice(0, 4)), sy = Number(cal.semesterStart.spring.slice(0, 4));
    if (s >= `${fy}-07-01` && s < `${fy + 1}-01-01`) return "fall";
    if (s >= `${sy}-01-01` && s < `${sy}-07-01`) return "spring";
    return null;
  }
  /** Mon–Fri course weeks from a start date. A Thursday/Friday start makes "getting started" days (pre);
      weeks with no school are breaks; 16 course weeks, then flex days, then finals. */
  function courseWeeks(startISO, cal, overrides) {
    const list = noSchoolList(cal, overrides);
    const sem = semesterOf(cal, startISO), E = sem && cal.semesterEnd[sem];
    const school = s => s >= startISO && isWeekday(s) && !offReason(list, s);
    const v = { pre: null, weeks: [], breaks: [], flex: [], finals: null, mons: [] };
    let mon = monOf(startISO), guard = 0;
    while (guard++ < 60) {
      const all = [0, 1, 2, 3, 4].map(i => addDays(mon, i)), days = all.filter(school);
      if (E && mon > E.last) break;
      const finalsWk = E && all.some(d => d >= E.fs);
      if (!days.length) { if (v.weeks.length && v.weeks.length < 16) v.breaks.push({ after: v.weeks.length, start: all[0], end: all[4], r: offReason(list, all[0]) || "" }); }
      else if (!v.weeks.length && !v.pre && dow(startISO) >= 4 && mon === monOf(startISO)) v.pre = days;
      else if (v.weeks.length < 16 && !(finalsWk && v.weeks.length >= 16)) { v.weeks.push(days); v.mons.push(mon); }
      else if (finalsWk) { v.finals = days.filter(d => d >= E.fs && d <= E.last); const before = days.filter(d => d < E.fs); if (before.length) v.flex.push(before); }
      else v.flex.push(days);
      if (!E && v.weeks.length >= 16) break;
      mon = addDays(mon, 7);
    }
    return v;
  }

  /* ---------- block schedule ---------- */
  const other = g => (g === "odd" ? "even" : "odd");
  /** Wednesdays alternate every calendar week, including weeks with no school. */
  function wedGroupOf(s, cal) {
    const n = Math.round((toD(monOf(s)) - toD(monOf(cal.block.wednesdayAnchor))) / (7 * DAY));
    return ((n % 2) + 2) % 2 === 0 ? cal.block.wednesdayAnchorGroup : other(cal.block.wednesdayAnchorGroup);
  }
  /** "odd" (periods 1,3,5,7: Mon/Thu), "even" (2,4,6,8: Tue/Fri), Wednesday by rotation; null on weekends. */
  function groupOfDay(s, cal) { const w = dow(s); return w === 1 || w === 4 ? "odd" : w === 2 || w === 5 ? "even" : w === 3 ? wedGroupOf(s, cal) : null; }
  /** Class days in the course (getting-started days + 16 weeks) for one group, or every day when g is empty. */
  function lessonDates(v, g, cal) { const all = [].concat(v.pre || [], ...v.weeks); return g ? all.filter(d => groupOfDay(d, cal) === g) : all; }

  /* ---------- Daily Learning Journals ---------- */
  function unitOfWeek(units, w) { return units.find(u => u.weeks.includes(w)) || null; }
  /** Every class meeting for one block group, in order, with its course week, unit, and journal (if any).
      Rules (approved Nov 24, 2026):
      - One journal per 90-minute block. The number is that group's own count of journals written, so every
        10 make a 100-point set.
      - Journals are assigned class by class, in date order, using only what was known on that day (see the
        history rule above). Earlier classes keep their journal and number when later overrides arrive.
      - When a unit has more classes than core journals, the unit's flex journal is used once, placed before
        the journal named in its `before` (the unit reflection) when possible; any further class shows no journal.
      - When holidays leave fewer classes than journals, middle journals are skipped: the first and the last
        (usually the reflection) are always kept.
      Overrides: "closure" removes the class; "noJournal" keeps the class without a journal;
      "journal" (with `journal: "<id>"`) assigns that journal to the class; "extend" keeps the class and
      its journal but repeats the previous class's lesson (row.extendOf). None of them edits the pacing guide. */
  function meetings(opts) {
    const { start, group, cal, units, journals, overrides } = opts;
    if (group !== "odd" && group !== "even") throw new Error("group must be odd or even");
    const cache = {};
    const rowsFor = ovs => {
      const key = JSON.stringify(ovs.overrides || []);
      if (cache[key]) return cache[key];
      const v = courseWeeks(start, cal, ovs);
      const ov = expandOverrides(ovs).filter(o => hitsGroup(o, group) && appliesOn(o, o.date));
      const weekOf = d => { if (v.pre && v.pre.includes(d)) return 0; const i = v.weeks.findIndex(w => w.includes(d)); return i < 0 ? null : i + 1; };
      const rows = [];
      for (const d of lessonDates(v, group, cal)) {
        const hit = ov.filter(o => o.date === d);
        if (hit.some(o => o.type === "closure")) continue;
        const week = weekOf(d), unit = unitOfWeek(units, week === 0 ? 1 : week);
        const pick = hit.find(o => o.type === "journal");
        rows.push({ date: d, week, unit: unit ? unit.id : null, writes: !!unit && !hit.some(o => o.type === "noJournal"),
          forced: pick ? pick.journal : null, extend: hit.some(o => o.type === "extend"), note: hit.map(o => o.note).filter(Boolean).join("; ") });
      }
      return (cache[key] = rows);
    };
    const final = rowsFor(overrides || { overrides: [] });
    const used = new Set(), skipped = new Set(), out = []; let n = 0;
    for (const r of final) {
      let j = null, k = null;
      if (r.writes) {
        if (r.forced) j = journals.find(x => x.id === r.forced) || null;
        else {
          const list = journals.filter(x => x.unit === r.unit);
          const slots = rowsFor(known(overrides, r.date)).filter(x => x.unit === r.unit && x.date >= r.date && x.writes && !x.forced).length;
          const seq = list.filter(x => !x.flex && !used.has(x.id) && !skipped.has(x.id));
          const flex = list.find(x => x.flex && !used.has(x.id));
          if (slots > seq.length && flex) { const at = flex.before ? seq.findIndex(x => x.id === flex.before) : -1; seq.splice(at < 0 ? seq.length : at, 0, flex); }
          if (!seq.length) j = null;
          else if (slots >= seq.length) j = seq[0];
          else if (slots <= 1) { j = seq[seq.length - 1]; seq.slice(0, -1).forEach(x => skipped.add(x.id)); }
          else { j = seq[0]; const p1 = Math.round((seq.length - 1) / (slots - 1)); seq.slice(1, p1).forEach(x => skipped.add(x.id)); }
          k = out.filter(x => x.unit === r.unit && x.meetingInUnit).length + 1;
        }
        if (j) used.add(j.id);
      }
      const row = { date: r.date, week: r.week, unit: r.unit, number: null, set: null, journal: null, note: r.note };
      if (r.extend && out.length) row.extendOf = out[out.length - 1].extendOf || out[out.length - 1].date; // repeats the previous class's lesson
      if (k) row.meetingInUnit = k;
      if (j) { n++; row.number = n; row.set = Math.ceil(n / 10); row.journal = j; }
      out.push(row);
    }
    return out;
  }
  /** The journal for a block group on a date: today's class, or the next class if there is none today. */
  function journalFor(dateISO, opts) {
    const all = meetings(opts);
    const today = all.find(m => m.date === dateISO);
    if (today) return { state: "today", ...today };
    const next = all.find(m => m.date > dateISO);
    return next ? { state: "next", ...next } : { state: "done" };
  }

  /* ---------- scheduled availability (Central Time) ---------- */
  const releaseTime = (cal, overrides) => (overrides && overrides.releaseTime) || cal.releaseTime || "07:00";
  /** When a unit opens: an explicit teacher-approved time (overrides.releases["3"] = "2026-09-21T07:00"), or the
      first school day of the unit's first course week (Unit 1: the first class day) at the release time. */
  function unitReleaseAt(unitId, opts) {
    const { start, cal, units, overrides } = opts;
    const exp = overrides && overrides.releases && overrides.releases[String(unitId)];
    if (exp) return exp;
    const v = courseWeeks(start, cal, overrides), u = units.find(x => x.id === unitId);
    const first = unitId === 1 && v.pre ? v.pre[0] : (v.weeks[u.weeks[0] - 1] || [])[0];
    return first ? `${first}T${releaseTime(cal, overrides)}` : null;
  }
  /** A day's lesson opens at the release time on that day (Central Time). */
  const lessonReleaseAt = (dateISO, opts) => `${dateISO}T${releaseTime(opts.cal, opts.overrides)}`;
  const isOpen = (atISO, nowISO) => !!atISO && atISO <= nowISO;
  /** The course week for a date: 0 = getting-started days, 1–16, or null (break, flex, finals, outside the course). */
  function courseWeekOf(dateISO, v) { if (v.pre && v.pre.includes(dateISO)) return 0; const i = v.weeks.findIndex(w => w.includes(dateISO)); return i < 0 ? null : i + 1; }

  root.SLSchedule = { TZ, chicagoToday, chicagoNow, setPreviewDate, isPreview, unitReleaseAt, lessonReleaseAt, isOpen, courseWeekOf, appliesOn, addDays, dow, monOf, semesterOf, noSchoolList, offReason, courseWeeks, wedGroupOf, groupOfDay, lessonDates, unitOfWeek, meetings, journalFor };
})(typeof window !== "undefined" ? window : globalThis);
