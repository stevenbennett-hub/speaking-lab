/* Speak Up | The Speaking Lab — the unified student calendar (#/calendar).
   Single source of truth: this file stores no dates. Every event is computed when the page is drawn from
   - the schedule engine (js/schedule.js): the student's class meetings (odd/even, Wednesday rotation, extended
     lessons, closures), course weeks, the district no-school list and classroom overrides;
   - the page's weekPlan (through SL2.dayParts), so speech days, due items and short weeks fold exactly as Today's
     Lesson and the checklist do;
   - the page's due-date events (window.dueEvents: unit tests and finals, as Today's Lesson shows them);
   - units.json (unit titles, speech names and points) and data/checklist.json (approved assessments; proposed ones
     only in teacher view), through the checklist core;
   - the journal schedule (journal numbers; every 10 make an approved 100-point set).
   A published change to any of those appears here, on Today's Lesson, in the checklists, My Course and the Instructor
   Playbook at once. Teacher drafts can be previewed with the Lesson Manager's "Show my drafts" switch (js/boot.js).
   Graded = approved by Mr. Bennett (see js/checklist.js). Speeches show the class's performance window, never an
   individual speaking date. No points, due dates or assessments are invented. Canvas is the official gradebook.
   The core (no DOM) runs in the Node tests. */
(function (root) {
  "use strict";

  /* ======================= core (pure) ======================= */
  const CATS = ["graded", "speech", "journal", "assessment", "research", "prep", "unit", "noschool", "class"];
  const PREP = /\b(work day|note card|key-word|outline|choose your (object|artifact)|build slides|sign up|draft your|brainstorm|prepare|revisions?)\b/i;
  const REHEARSE = /\brehears/i;
  const RESEARCH = /\b(source|research|citation|bibliograph|references?|annotated)\b/i;
  const PD = /inservice|records? prep|professional|\bPD\b/i;
  const addDays = (s, n) => { const d = new Date(s + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  /** The sentence of a pacing entry that matched (sentences end at ". " before a capital letter, so "Ch. 4" stays whole). */
  const sentence = (t, re) => { const parts = String(t || "").split(/(?<=[a-z)]\.)\s+(?=[A-Z])/); return ((re && parts.find(p => re.test(p))) || parts[0]).replace(/\.$/, ""); };
  const monday = s => { const d = new Date(s + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); };

  /**
   * Every calendar event for one student (or for teacher preview).
   * ctx: { group, level, v (courseWeeks), meetings (SLSchedule.meetings for the group), partsFor(meeting), units,
   *        ck (the checklist core), checklist (data), lessons, labNames, noSchool ([from, to, reason]), overrides,
   *        dues ([{ type: "test"|"finals"|"due", d, end?, u?, t: [en, es] }] in ISO dates), tr, teacher }
   */
  function build(ctx) {
    const out = [], { ck } = ctx, tr = ctx.tr || (x => x), u = id => (ctx.units || []).find(x => x.id === id) || null;
    const days = [].concat(ctx.v.pre || [], ...ctx.v.weeks), first = monday(days[0]), last = days[days.length - 1];
    const lastDay = ctx.finalsEnd && ctx.finalsEnd > last ? ctx.finalsEnd : last;
    const cctx = { data: ctx.checklist, units: ctx.units, level: ctx.level, lessons: ctx.lessons, labNames: ctx.labNames, tr };
    const add = e => out.push({ end: null, graded: null, link: null, note: null, canvas: null, ...e });

    // Class meetings, unit transitions, journal sets, preparation and rehearsals, approved assessments, speeches.
    let prevUnit = null; const speech = {}, assessed = new Set();
    for (const m of ctx.meetings) {
      const p = ctx.partsFor(m), items = (p && p.items) || [];
      add({ id: `class-${m.date}`, type: "class", cat: "class", date: m.date, unit: m.unit, link: m.unit ? `#/unit/${m.unit}/day/${m.date}` : null,
        title: m.journal ? { en: `Class · Journal #${m.number}`, es: `Clase · Diario #${m.number}` } : { en: "Class", es: "Clase" },
        note: m.extendOf ? { en: `Extended lesson: continues the lesson from ${m.extendOf}.`, es: `Lección extendida: continúa la lección del ${m.extendOf}.` } : m.note ? { en: m.note, es: m.note } : null,
        keys: p ? p.keys : [] });
      if (m.unit && m.unit !== prevUnit) { const U = u(m.unit);
        add({ id: `unit-${m.unit}`, type: "unit", cat: "unit", date: m.date, unit: m.unit, link: `#/unit/${m.unit}`,
          title: { en: `Unit ${m.unit} begins${U ? `: ${U.title}` : ""}`, es: `Empieza la Unidad ${m.unit}${U ? `: ${tr(U.title)}` : ""}` } }); }
      prevUnit = m.unit || prevUnit;
      if (m.number && m.number % 10 === 0) { const js = ck.journalSet(m.set);
        add({ id: `journal-set-${m.set}`, type: "journal", cat: "journal", date: m.date, unit: m.unit, graded: { status: "approved", points: 100 },
          title: { en: `Journal set ${m.set} complete (Journals ${(m.set - 1) * 10 + 1}–${m.set * 10})`, es: `Grupo ${m.set} de diarios completo (Diarios ${(m.set - 1) * 10 + 1}–${m.set * 10})` },
          note: { en: "You write the last journal of the set in this class. Mr. Bennett announces when the set is collected.", es: "En esta clase escribes el último diario del grupo. El Sr. Bennett avisa cuándo se recoge." },
          canvas: js.canvas }); }
      for (const it of items) {
        const text = String(it.t || "");
        if (it.speech) { const list = (speech[m.unit] = speech[m.unit] || []); if (!list.includes(m.date)) list.push(m.date); continue; } // a block with two speech days is one class day
        const dup = s => out.some(e => e.date === m.date && e.title.en === s);
        if (REHEARSE.test(text)) { const s = `Rehearsal: ${sentence(text, REHEARSE)}`; if (!dup(s)) add({ id: `rehearse-${m.date}-${it.key}`, type: "rehearsal", cat: "prep", date: m.date, unit: m.unit, link: `#/unit/${m.unit}/day/${m.date}`, title: { en: s, es: `Ensayo: ${sentence(tr(text), null)}` } }); }
        else if (PREP.test(text) && !it.due) { const s = `Speech preparation: ${sentence(text, PREP)}`; if (!dup(s)) add({ id: `prep-${m.date}-${it.key}`, type: "prep", cat: "prep", date: m.date, unit: m.unit, link: `#/unit/${m.unit}/day/${m.date}`, title: { en: s, es: `Preparación del discurso: ${sentence(tr(text), null)}` } }); }
      }
      for (const t of ck.meetingTasks(cctx, m, p)) {
        const a = t.assess && (ctx.checklist && (ctx.checklist.assessments || []).find(x => x.id === t.assess.id)) || t.assess;
        if (!a || t.speech || a.derived || assessed.has(a.id)) continue;
        if (a.path && a.path !== ck.pathOf(ctx.level)) continue;
        if (a.status !== "approved" && !ctx.teacher) continue; // proposed opportunities: teacher view only
        assessed.add(a.id);
        add({ id: `assess-${a.id}`, type: "graded", cat: "graded", date: m.date, unit: m.unit, graded: { status: a.status, points: a.status === "approved" ? a.points : null },
          title: a.title, note: a.what, canvas: a.canvas, link: a.rubric || `#/unit/${m.unit}/day/${m.date}`, task: t.id });
      }
    }
    // Speeches: one performance window per unit for this class (never an individual speaking date).
    for (const [uid, ds] of Object.entries(speech)) {
      const U = u(Number(uid)), a = ck.speechAssessment(U, ctx.level, tr); if (!ds.length) continue;
      add({ id: `speech-${uid}`, type: "speech", cat: "speech", date: ds[0], end: ds[ds.length - 1], days: ds, unit: Number(uid),
        graded: a ? { status: "approved", points: a.points } : null, link: `#/unit/${uid}/guide`, task: a ? a.id : null,
        title: { en: `Speeches: ${a ? a.title.en : `Unit ${uid}`}`, es: `Discursos: ${a ? a.title.es : `Unidad ${uid}`}` },
        note: { en: `Performance window for your class: ${ds.length} class day${ds.length > 1 ? "s" : ""}. Mr. Bennett sets the speaking order.`, es: `Periodo de presentaciones de tu clase: ${ds.length} día${ds.length > 1 ? "s" : ""} de clase. El Sr. Bennett decide el orden.` },
        canvas: a ? a.canvas : null });
    }
    // Unit tests, finals and written work due, as the course calendar and Today's Lesson show them.
    for (const d of ctx.dues || []) {
      if (d.type === "speech") continue;
      if (d.d < first || d.d > lastDay) continue;
      const research = d.type === "due" && RESEARCH.test(d.t[0]);
      add({ id: `${d.type}-${d.u || "x"}-${d.d}`, type: d.type === "due" ? (research ? "research" : "due") : d.type, cat: d.type === "due" ? (research ? "research" : "assessment") : "assessment",
        date: d.d, end: d.end || null, unit: d.u || null, title: { en: d.t[0], es: d.t[1] }, link: d.u ? `#/unit/${d.u}/guide` : null,
        note: d.type === "test" ? { en: "Date from the course calendar. Check Canvas for whether it is graded.", es: "Fecha del calendario del curso. Revisa Canvas para saber si se califica." }
          : d.type === "finals" ? { en: "Follow your school’s finals schedule.", es: "Sigue el horario de exámenes de tu escuela." }
          : { en: "Due date from the pacing guide. Turn it in through Canvas when Mr. Bennett posts the assignment.", es: "Fecha del calendario de ritmo. Entrégalo en Canvas cuando el Sr. Bennett publique la tarea." } });
    }
    // No school: district days (holidays, breaks, professional development) and closures; class-only closures.
    for (const [a, b, r] of ctx.noSchool || []) {
      if (b < first || a > lastDay) continue;
      const pd = PD.test(r), closure = /closure|weather/i.test(r) && !/make-up/i.test(r);
      add({ id: `off-${a}`, type: pd ? "pd" : closure ? "closure" : "holiday", cat: "noschool", date: a, end: b !== a ? b : null, title: { en: r, es: (ctx.trOff || tr)(r) },
        note: pd ? { en: "No school for students (professional development).", es: "No hay clases para los estudiantes (capacitación docente)." } : { en: "No school.", es: "No hay clases." } });
    }
    for (const o of (ctx.overrides && ctx.overrides.overrides) || []) {
      if (o.type !== "closure" || o.groups === "all" || !Array.isArray(o.groups) || !o.groups.includes(ctx.group)) continue;
      add({ id: `closure-${o.date}`, type: "closure", cat: "noschool", date: o.date, end: o.until || null, title: { en: o.note || "No class for your periods", es: o.note || "No hay clase para tus periodos" },
        note: { en: "Mr. Bennett changed the schedule: your class does not meet.", es: "El Sr. Bennett cambió el horario: tu clase no se reúne." } });
    }
    // Shortened instructional weeks.
    ctx.v.weeks.forEach((d, i) => { if (d.length && d.length < 5) add({ id: `short-${i + 1}`, type: "short", cat: "noschool", date: ctx.v.mons[i], end: addDays(ctx.v.mons[i], 4), week: i + 1,
      title: { en: `Short week (${d.length} school days)`, es: `Semana corta (${d.length} días de clases)` },
      note: { en: "Some planned lessons fold together this week; your class days show what happens when.", es: "Algunas lecciones planeadas se combinan esta semana; tus días de clase muestran qué pasa cada día." } }); });
    const rank = { noschool: 0, unit: 1, speech: 2, graded: 3, journal: 4, assessment: 5, research: 6, prep: 7, class: 8 };
    return out.sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : rank[x.cat] - rank[y.cat]));
  }
  const onDay = (e, d) => (e.days ? e.days.includes(d) : e.end ? d >= e.date && d <= e.end : e.date === d);
  /** The next approved or dated responsibilities: graded work, speech windows, assessments, research and due items. */
  function upcoming(events, today, n) {
    return events.filter(e => ["graded", "speech", "journal", "assessment", "research"].includes(e.cat) && (e.end || e.date) >= today && (!e.graded || e.graded.status === "approved" || e.cat !== "graded")).slice(0, n || 6);
  }
  const core = { CATS, build, onDay, upcoming };

  /* ======================= browser ======================= */
  const X = root.SL2, D = root.SL_DATA, S = root.SLSchedule;
  if (!X || !D || !S || !root.document) { root.SLCalendar = { core }; return; }
  const { h, L, pick } = X;
  const es = () => typeof lang !== "undefined" && lang === "es";
  const T = o => (o ? (Array.isArray(o) ? (es() ? o[1] : o[0]) : es() ? o.es || o.en : o.en) : "");
  const CK = () => root.SLChecklist && root.SLChecklist.core;
  const isoOf = d => (typeof d === "string" ? d : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  const fmt = (d, o) => new Date(d + "T12:00:00Z").toLocaleDateString(es() ? "es-US" : "en-US", { timeZone: "UTC", ...(o || { weekday: "short", month: "short", day: "numeric" }) });
  const span = e => (e.days && e.days.length > 1 ? `${fmt(e.days[0])} – ${fmt(e.days[e.days.length - 1])}` : e.end && e.end !== e.date ? `${fmt(e.date)} – ${fmt(e.end)}` : fmt(e.date));

  const LABEL = {
    graded: ["Graded assignment", "Tarea calificada"], speech: ["Speeches", "Discursos"], journal: ["Journals", "Diarios"], assessment: ["Tests and due dates", "Exámenes y entregas"],
    research: ["Research checkpoints", "Puntos de control de investigación"], prep: ["Preparation and rehearsal", "Preparación y ensayo"], unit: ["Units", "Unidades"],
    noschool: ["No school and short weeks", "Sin clases y semanas cortas"], class: ["My class days", "Mis días de clase"],
  };
  const TYPE = {
    class: ["Class day", "Día de clase"], unit: ["Unit begins", "Empieza la unidad"], journal: ["Journal set", "Grupo de diarios"], speech: ["Speech performance window", "Periodo de discursos"],
    graded: ["Graded assignment", "Tarea calificada"], test: ["Unit test", "Examen de unidad"], finals: ["Finals", "Exámenes finales"], due: ["Written work due", "Entrega de trabajo escrito"],
    research: ["Research checkpoint", "Punto de control de investigación"], prep: ["Speech preparation", "Preparación del discurso"], rehearsal: ["Rehearsal", "Ensayo"],
    holiday: ["Holiday or break", "Feriado o vacaciones"], closure: ["School closure", "Cierre"], pd: ["Professional development (no school)", "Capacitación docente (sin clases)"], short: ["Short week", "Semana corta"],
  };
  const P = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"';
  const ICO = {
    graded: `<path ${P} d="M7 4h10v17H7zM10 4V2.8h4V4M9.5 13l2 2 3.5-4"/>`, speech: `<path ${P} d="M12 3a3 3 0 013 3v5a3 3 0 01-6 0V6a3 3 0 013-3zM6 11a6 6 0 0012 0M12 17v4"/>`,
    journal: `<path ${P} d="M6 3h11v18H6zM9 7h5M9 11h5M4 6h3M4 12h3M4 18h3"/>`, assessment: `<circle ${P} cx="12" cy="12" r="9"/><path ${P} d="M9.5 9.5a2.5 2.5 0 114 2c-1 .6-1.5 1-1.5 2M12 17v.3"/>`,
    research: `<circle ${P} cx="10.5" cy="10.5" r="6"/><path ${P} d="M15 15l5.5 5.5"/>`, prep: `<path ${P} d="M4 20l4-1 11-11-3-3L5 16zM14 6l3 3"/>`,
    unit: `<path ${P} d="M5 21V4M5 4h11l-2 4 2 4H5"/>`, noschool: `<circle ${P} cx="12" cy="12" r="9"/><path ${P} d="M6 6l12 12"/>`, class: `<path ${P} d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4"/>`,
  };
  const icon = c => `<svg class="cal-ic" viewBox="0 0 24 24" aria-hidden="true">${ICO[c] || ""}</svg>`;

  // Page state (this view only; nothing is stored).
  const ST = { view: "month", cursor: null, sel: null, off: new Set(), proposed: false };
  let CACHE = { key: "", events: [] };
  function events() {
    const g = X.group(), lv = typeof level !== "undefined" ? level : "hs";
    const key = [g, lv, X.today(), es() ? "es" : "en", X.teacherOn() && ST.proposed, JSON.stringify((D.checklist || {}).assessments || []).length].join("|");
    if (CACHE.key === key) return CACHE.events;
    if (!g || !CK()) return [];
    const v = X.weeks(), sem = S.semesterOf(D.calendar, (v.pre || v.weeks[0] || [])[0] || X.today()), fe = sem && D.calendar.semesterEnd && D.calendar.semesterEnd[sem];
    const dues = (typeof root.dueEvents === "function" ? root.dueEvents() : []).map(e => ({ type: e.type, d: isoOf(e.d), end: e.end ? isoOf(e.end) : null, u: e.u || null, t: e.t }));
    const ev = build({ group: g, level: lv, v, meetings: S.meetings(X.opts(g)), partsFor: m => { const p = X.dayParts(null, m.extendOf || m.date, g); return p ? { keys: p.keys, items: p.items.map((x, n) => ({ ...x, key: p.keys[n] })) } : { keys: [], items: [] }; },
      units: D.units.units, ck: CK(), checklist: D.checklist, lessons: D.lessons.days, labNames: D.units.labNames, noSchool: S.noSchoolList(D.calendar, D.overrides), overrides: D.overrides, trOff: r => (typeof REASON_ES !== "undefined" && REASON_ES[r]) || r,
      dues, finalsEnd: fe ? fe.last : null, tr: s => (typeof trText === "function" ? trText(s) : s), teacher: X.teacherOn() && ST.proposed });
    CACHE = { key, events: ev }; return ev;
  }
  const visible = ev => ev.filter(e => !ST.off.has(e.cat));
  const chip = (e, d) => { const prop = e.graded && e.graded.status !== "approved";
    return `<button type="button" class="cal-ev cal-${e.cat}${prop ? " is-proposed" : ""}${ST.sel === e.id ? " is-sel" : ""}" data-cal-ev="${h(e.id)}" aria-label="${h(`${T(TYPE[e.type] || LABEL[e.cat])}: ${T(e.title)}, ${span(e)}`)}">${icon(e.cat)}<span>${h(T(e.title))}</span>${e.graded && e.graded.status === "approved" ? `<b class="cal-g">${L("Graded", "Calificado")}</b>` : prop ? `<b class="cal-g is-p">${L("Proposed", "Propuesta")}</b>` : ""}</button>`; };

  function monthGrid(ev, t) {
    const c = ST.cursor, y = +c.slice(0, 4), mo = +c.slice(5, 7) - 1, firstD = `${c.slice(0, 7)}-01`;
    let d = S.monOf(firstD), rows = "";
    for (let wk = 0; wk < 6; wk++) {
      let cells = "", any = false;
      for (let i = 0; i < 5; i++) {
        const day = S.addDays(d, i), inM = +day.slice(5, 7) - 1 === mo && +day.slice(0, 4) === y; if (inM) any = true;
        const list = inM ? ev.filter(e => onDay(e, day)) : [], cls = list.some(e => e.cat === "class"), off = list.some(e => e.cat === "noschool" && e.type !== "short");
        cells += `<td class="${inM ? "" : "out"}${day === t ? " is-today" : ""}${cls ? " is-class" : ""}${off ? " is-off" : ""}">${inM ? `<span class="cal-dn">${+day.slice(8)}${day === t ? `<span class="sr"> (${L("today", "hoy")})</span>` : ""}</span>${list.filter(e => e.type !== "short").map(e => chip(e, day)).join("")}` : ""}</td>`;
      }
      if (any) { const sw = ev.find(e => e.type === "short" && e.date === d && !ST.off.has("noschool")); rows += `${sw ? `<tr class="cal-weeknote"><td colspan="5">${chip(sw)}</td></tr>` : ""}<tr>${cells}</tr>`; }
      d = S.addDays(d, 7);
    }
    const wd = es() ? ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const title = fmt(firstD, { month: "long", year: "numeric" });
    return `<div class="cal-nav"><button type="button" class="btn sm" data-cal-step="-1" aria-label="${L("Previous month", "Mes anterior")}">←</button><h2 class="sl2-h2" id="calTitle" aria-live="polite">${h(title)}</h2><button type="button" class="btn sm" data-cal-step="1" aria-label="${L("Next month", "Mes siguiente")}">→</button></div>
      <div class="sl2-tablewrap cal-wrap" tabindex="0" role="region" aria-labelledby="calTitle"><table class="cal-grid"><caption class="sr">${h(title)} · ${L("weekends are not shown", "no se muestran los fines de semana")}</caption><thead><tr>${wd.map(x => `<th scope="col">${x}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  function weekAgenda(ev, t) {
    const mon = S.monOf(ST.cursor), days = [0, 1, 2, 3, 4].map(i => S.addDays(mon, i)), v = X.weeks(), w = S.courseWeekOf(days.find(x => S.courseWeekOf(x, v) != null) || mon, v);
    const title = `${fmt(days[0], { month: "short", day: "numeric" })} – ${fmt(days[4], { month: "short", day: "numeric", year: "numeric" })}`;
    const short = ev.find(e => e.type === "short" && e.date === mon);
    return `<div class="cal-nav"><button type="button" class="btn sm" data-cal-step="-1" aria-label="${L("Previous week", "Semana anterior")}">←</button><h2 class="sl2-h2" id="calTitle" aria-live="polite">${h(title)}${w != null ? ` <span class="cal-wk">${w === 0 ? L("Getting started", "Primeros días") : L(`Course week ${w}`, `Semana ${w} del curso`)}</span>` : ""}</h2><button type="button" class="btn sm" data-cal-step="1" aria-label="${L("Next week", "Semana siguiente")}">→</button></div>
      ${short && !ST.off.has("noschool") ? `<p class="cal-shortnote">${icon("noschool")} <b>${h(T(short.title))}.</b> ${h(T(short.note))}</p>` : ""}
      <ol class="cal-agenda">${days.map(d => { const list = ev.filter(e => onDay(e, d) && e.type !== "short");
        return `<li class="${d === t ? "is-today" : ""}"><h3>${h(fmt(d, { weekday: "long", month: "long", day: "numeric" }))}${d === t ? ` <span class="sl2-pill">${L("Today", "Hoy")}</span>` : ""}</h3>${list.length ? `<ul class="cal-alist">${list.map(e => `<li>${chip(e, d)}${e.note && e.cat !== "class" ? `<span class="cal-anote">${h(T(e.note))}</span>` : ""}</li>`).join("")}</ul>` : `<p class="cal-none">${L("No class for your periods.", "No hay clase para tus periodos.")}</p>`}</li>`; }).join("")}</ol>`;
  }
  function details(ev) {
    const e = ev.find(x => x.id === ST.sel); if (!e) return `<p class="sl2-small">${L("Choose an event to see its details.", "Elige un evento para ver sus detalles.")}</p>`;
    const st = root.SLChecklist && e.task ? (() => { try { return CK().readStore(localStorage.getItem(CK().KEY)); } catch (x) { return null; } })() : null;
    const reported = st && e.task && (st.done[e.task] || st.canvas[e.task]);
    const g = e.graded;
    return `<h3 id="calDetH" tabindex="-1">${icon(e.cat)} ${h(T(e.title))}</h3>
      <p class="cal-dtype">${h(T(TYPE[e.type] || LABEL[e.cat]))} · <b>${h(e.days && e.days.length > 1 ? `${L("Performance window", "Periodo de presentaciones")}: ${span(e)}` : span(e))}</b></p>
      ${g ? `<p>${g.status === "approved" ? `<b class="cal-g">${L("Graded", "Calificado")}</b> ${g.points != null ? L(`${g.points} points`, `${g.points} puntos`) : L("Points not set", "Puntos sin definir")}` : `<b class="cal-g is-p">${L("Proposed (teacher view only, not graded)", "Propuesta (solo vista del maestro, no calificada)")}</b>`}</p>` : e.cat === "prep" || e.cat === "class" ? `<p class="sl2-small">${L("Practice, not graded.", "Práctica, no se califica.")}</p>` : ""}
      ${e.days && e.days.length > 1 ? `<p class="sl2-small">${L("Your class’s speech days:", "Días de discursos de tu clase:")} ${e.days.map(d => h(fmt(d))).join(", ")}</p>` : ""}
      ${e.note ? `<p>${h(T(e.note))}</p>` : ""}
      ${e.canvas ? `<p class="ck-canvas"><b>${L("How to turn it in:", "Cómo entregarlo:")}</b> ${h(T(e.canvas))}</p>` : ""}
      ${reported ? `<p class="sl2-small">${L(`You checked this off in your checklist on ${fmt(reported)}. That is your own record, not a submission or a grade; Canvas is the official record.`, `Lo marcaste en tu lista el ${fmt(reported)}. Es tu propio registro, no una entrega ni una calificación; Canvas es el registro oficial.`)}</p>` : ""}
      ${e.link ? `<p><a class="btn" href="${h(e.link)}">${e.cat === "class" ? L("Open this lesson", "Abrir esta lección") : /guide$/.test(e.link) ? L("Requirements and rubric", "Requisitos y rúbrica") : L("Open", "Abrir")} →</a></p>` : ""}`;
  }
  function deadlines(ev, t) {
    const list = upcoming(ev.filter(e => !ST.off.has(e.cat)), t, 6);
    return `<section class="sl2-card cal-dead" aria-labelledby="calDeadH"><h2 class="sl2-h3" id="calDeadH">${L("Upcoming deadlines", "Próximas fechas")}</h2>
      ${list.length ? `<ul class="cal-dlist">${list.map(e => `<li><button type="button" class="linkbtn cal-dl" data-cal-ev="${h(e.id)}" data-cal-go="${h(e.date)}">${icon(e.cat)} <b>${h(T(e.title))}</b></button>
        <span class="cal-dmeta">${h(T(TYPE[e.type] || LABEL[e.cat]))} · ${h(span(e))}${e.graded && e.graded.status === "approved" ? ` · <b class="cal-g">${L("Graded", "Calificado")}</b>${e.graded.points != null ? ` ${e.graded.points} ${L("pts", "pts")}` : ""}` : ""}</span>
        ${e.canvas ? `<span class="cal-dmeta">${h(T(e.canvas))}</span>` : ""}${e.link && /guide$/.test(e.link) ? `<a class="cal-dmeta" href="${h(e.link)}">${L("Requirements and rubric", "Requisitos y rúbrica")} →</a>` : ""}</li>`).join("")}</ul>` : `<p class="sl2-small">${L("Nothing coming up this semester.", "No hay nada próximo este semestre.")}</p>`}
      <p class="sl2-small">${L("Only work Mr. Bennett has designated as graded is marked Graded. Canvas is the official place for assignments, submissions and grades.", "Solo el trabajo que el Sr. Bennett designó como calificado aparece como Calificado. Canvas es el lugar oficial para tareas, entregas y calificaciones.")}</p></section>`;
  }
  function view() {
    const g = X.group(), t = X.today();
    if (!ST.cursor) ST.cursor = t;
    const head = `<p class="app-eyebrow">${L("Plan ahead", "Planea con tiempo")}</p><h1 class="sl2-h1">${L("Calendar", "Calendario")}</h1>`;
    if (!g) return `<div class="wrap sl2 app-view cal" id="sl2-main" data-notr>${head}<div class="sl2-card">${X.groupBar()}</div></div>`;
    const ev = events(), vis = visible(ev);
    const filt = `<div class="cal-filters" role="group" aria-label="${L("Show on the calendar", "Mostrar en el calendario")}">${CATS.map(c => `<button type="button" class="cal-f cal-${c}" data-cal-filter="${c}" aria-pressed="${!ST.off.has(c)}">${icon(c)}${h(T(LABEL[c]))}</button>`).join("")}</div>`;
    return `<div class="wrap sl2 app-view cal" id="sl2-main" data-notr>${head}
      <p class="sl2-lead">${L("Your class days, speeches, graded work and no-school days, from the same schedule as Today’s Lesson.", "Tus días de clase, discursos, trabajo calificado y días sin clases, del mismo calendario que la Lección de hoy.")}</p>
      <p class="sl2-meta">${L("Showing", "Mostrando")}: <b>${h(groupLabel(g, es()))}</b> (${h(es() ? D.calendar.block.groups[g].d[1] : D.calendar.block.groups[g].d[0])}${L(" + every other Wednesday", " + un miércoles sí y otro no")}) · <a href="#/">${L("Change on My Course", "Cambiar en Mi curso")}</a>${X.teacherOn() ? ` · <label class="cal-prop"><input type="checkbox" data-cal-proposed${ST.proposed ? " checked" : ""}> ${L("Teacher view: include proposed grading", "Vista del maestro: incluir calificaciones propuestas")}</label>${root.SL_DRAFT_PREVIEW ? ` · <b>${L("Showing your unpublished drafts", "Mostrando tus borradores sin publicar")}</b>` : ""}` : ""}</p>
      <div class="cal-bar"><div class="semtog cal-views" role="group" aria-label="${L("Calendar view", "Vista del calendario")}"><button type="button" data-cal-view="month" aria-pressed="${ST.view === "month"}">${L("Month", "Mes")}</button><button type="button" data-cal-view="week" aria-pressed="${ST.view === "week"}">${L("Week agenda", "Agenda semanal")}</button></div>
        <button type="button" class="btn" data-cal-today>${L("Today", "Hoy")}</button></div>
      ${filt}
      <div class="cal-layout"><div class="cal-main">${ST.view === "month" ? monthGrid(vis, t) : weekAgenda(vis, t)}</div>
        <aside class="cal-side">${deadlines(ev, t)}<section class="sl2-card cal-det" aria-labelledby="calDetT" aria-live="polite"><h2 class="sl2-h3" id="calDetT">${L("Event details", "Detalles del evento")}</h2>${details(ev)}</section></aside></div>
      <p class="sl2-small">${L("Dates come from the district calendar, your class periods and Mr. Bennett’s published plans; changes appear here, on Today’s Lesson and in your checklist at the same time. Canvas is the official gradebook.", "Las fechas vienen del calendario del distrito, tus periodos y los planes publicados del Sr. Bennett; los cambios aparecen aquí, en la Lección de hoy y en tu lista al mismo tiempo. Canvas es el registro oficial de calificaciones.")}</p></div>`;
  }

  const refocus = sel => { const el = root.document.querySelector(sel); if (el) el.focus(); };
  root.document.addEventListener("click", e => {
    if (!X.route() || X.route().name !== "calendar") return;
    const b = e.target.closest("[data-cal-step],[data-cal-today],[data-cal-view],[data-cal-filter],[data-cal-ev]"); if (!b) return;
    if (b.dataset.calStep) { const n = Number(b.dataset.calStep); if (ST.view === "month") { const d = new Date(ST.cursor.slice(0, 7) + "-15T12:00:00Z"); d.setUTCMonth(d.getUTCMonth() + n); ST.cursor = d.toISOString().slice(0, 10); } else ST.cursor = S.addDays(ST.cursor, 7 * n); X.refresh(); refocus(`[data-cal-step="${n}"]`); return; }
    if (b.hasAttribute("data-cal-today")) { ST.cursor = X.today(); X.refresh(); refocus("[data-cal-today]"); return; }
    if (b.dataset.calView) { ST.view = b.dataset.calView === "week" ? "week" : "month"; X.refresh(); refocus(`[data-cal-view="${ST.view}"]`); return; }
    if (b.dataset.calFilter) { const c = b.dataset.calFilter; if (ST.off.has(c)) ST.off.delete(c); else ST.off.add(c); X.refresh(); refocus(`[data-cal-filter="${c}"]`); return; }
    if (b.dataset.calEv) { ST.sel = b.dataset.calEv; if (b.dataset.calGo) ST.cursor = b.dataset.calGo; X.refresh(); refocus("#calDetH"); }
  });
  root.document.addEventListener("change", e => { if (e.target.matches && e.target.matches("[data-cal-proposed]") && X.teacherOn()) { ST.proposed = e.target.checked; CACHE.key = ""; X.refresh(); } });

  X.addRoute("calendar", { view });
  root.SLCalendar = { core, events: () => events() };
})(typeof window !== "undefined" ? window : globalThis);
