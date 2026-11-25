/* Speak Up | The Speaking Lab — My Learning Checklist, Weekly Grading Checkpoint and the instructor's weekly
   assessment overview.
   - Tasks come from the existing course data: the schedule engine (js/schedule.js: class meetings for the student's
     odd/even group, holidays, closures, extended lessons, journal numbers), the pacing guide (via the page's weekPlan,
     so short weeks fold exactly as Today's Lesson does), lessons.json (teacher-set activities, Canvas links),
     units.json (the unit speech and its points) and data/checklist.json (Unit 1 tasks and grading opportunities).
   - Graded means designated by Mr. Bennett: an assessment with status "approved" in checklist.json, the unit speech
     (units.json) or a journal set (10 journals = 100 points, the approved journal rule). "Proposed" grading
     opportunities are for his review and are never shown to students as graded. Nothing here invents points,
     weights, due dates or assessments.
   - Completion: "auto" only where Speaking Lab already keeps a reliable record (reading checks, The Art of Listening,
     The Respectful Audience Lab, the AI Coaching Studio). Everything else is a student-controlled checkbox, saved
     in this browser (speakup-checklist-v1, included in the existing progress backup). A checkbox is the student's
     own report: never a Canvas submission, a grade or a teacher verification. Checking tasks awards no points.
   - Canvas is the official gradebook. Speaking Lab never reads or writes Canvas.
   The core (no DOM) also runs in the Node tests. */
(function (root) {
  "use strict";
  const KEY = "speakup-checklist-v1", TKEY = "speakup-teacher-checklist-v1";
  const ISO = /^\d{4}-\d{2}-\d{2}$/;

  /* ======================= core (pure) ======================= */
  const twoL = (o, es) => (o ? (es ? o.es || o.en : o.en) : "");
  /** The student's checklist record. Anything malformed is ignored, never fatal. */
  function readStore(text) {
    const out = { v: 1, done: {}, canvas: {} };
    let r = null; try { r = JSON.parse(text || "null"); } catch (e) { return out; }
    if (!r || r.v !== 1 || typeof r !== "object") return out;
    for (const f of ["done", "canvas"]) {
      const o = r[f]; if (!o || typeof o !== "object" || Array.isArray(o)) continue;
      for (const [k, d] of Object.entries(o).slice(0, 2000)) if (/^[a-z0-9-]{1,80}$/.test(k) && ISO.test(d)) out[f][k] = d;
    }
    return out;
  }
  /** Check or uncheck one task (field "done" = completed, "canvas" = the student reports a Canvas submission). */
  function toggle(store, field, id, on, today) {
    const s = { v: 1, done: { ...store.done }, canvas: { ...store.canvas } };
    if (on) s[field][id] = today; else delete s[field][id];
    return s;
  }

  const pathOf = level => (level === "col" ? "col" : "hs");
  const isSpeech = it => !!it && it.speech;
  /** The unit speech: an approved graded assessment from units.json (name, points) on the pacing guide's speech days. */
  function speechAssessment(unit, level, tr) {
    tr = tr || (x => x);
    if (!unit || !unit.assign) return null;
    const a = unit.assign[pathOf(level)] || unit.assign.hs; if (!a) return null;
    const pts = (a.meta || []).map(x => /^(\d+)\s*points$/i.exec(String(x).trim())).find(Boolean);
    return { id: `u${unit.id}-speech`, unit: unit.id, status: "approved", derived: "units.json", points: pts ? Number(pts[1]) : null,
      title: { en: a.name, es: tr(a.name) }, rubric: `#/unit/${unit.id}/guide`,
      what: { en: (a.meta || []).filter(x => !/points$/i.test(x)).join(" · "), es: (a.meta || []).filter(x => !/points$/i.test(x)).map(tr).join(" · ") },
      canvas: { en: "Present in class on your speech day. Mr. Bennett scores speeches with the rubric in Canvas; there is nothing to upload here.", es: "Presenta en clase el día de tu discurso. El Sr. Bennett califica los discursos con la rúbrica en Canvas; aquí no hay nada que subir." } };
  }
  /** A journal set (approved rule: every 10 journals make one 100-point set). Collection dates are announced by Mr. Bennett. */
  const journalSet = set => ({ id: `journal-set-${set}`, status: "approved", derived: "journal rule", points: 100,
    title: { en: `Daily Learning Journal set ${set} (Journals ${(set - 1) * 10 + 1}–${set * 10})`, es: `Grupo ${set} del diario de aprendizaje (Diarios ${(set - 1) * 10 + 1}–${set * 10})` },
    what: { en: "This week you write the last journal of the set.", es: "Esta semana escribes el último diario del grupo." },
    canvas: { en: "Journals are handwritten and checked by Mr. Bennett; he announces when a set is collected. Typed journals (with his permission) go in Canvas.", es: "Los diarios se escriben a mano y los revisa el Sr. Bennett; él avisa cuándo se recoge un grupo. Los diarios escritos en la computadora (con su permiso) se entregan en Canvas." } });

  const assessById = (data, id) => ((data && data.assessments) || []).find(a => a.id === id) || null;
  const CHAPTER = /\bRead Ch(?:apter)?\.?\s*(\d{1,2})(?:\s*and\s*Ch\.?\s*(\d{1,2}))?/g;

  /**
   * Tasks for one class meeting.
   * ctx: { data (checklist.json), units, level, lessons (lessons.json days), tr (pacing text → display text, optional) }
   * meeting: a row from SLSchedule.meetings. parts: { keys: [lesson keys], items: [{ key, t, speech, due }] } for the
   * meeting's date (the source day of an extended lesson). Returns tasks in order: journal first, as in class.
   */
  function meetingTasks(ctx, meeting, parts) {
    const out = [], seen = new Set(), path = pathOf(ctx.level), tr = ctx.tr || (x => x);
    const unit = (ctx.units || []).find(u => u.id === meeting.unit) || null;
    const add = t => { if (!seen.has(t.id)) { seen.add(t.id); out.push({ date: meeting.date, ...t }); } };
    if (meeting.journal) add({ id: `journal-${meeting.journal.id}`.toLowerCase().replace(/[^a-z0-9-]/g, "-"), key: null, kinds: ["practice"], req: true, min: 15, report: "self", journal: meeting.number,
      href: unit ? `#/unit/${unit.id}/day/${meeting.date}` : null,
      title: { en: `Daily Learning Journal #${meeting.number}`, es: `Diario de aprendizaje #${meeting.number}` },
      how: { en: "Write for 10 minutes by hand, then stand and share with someone new.", es: "Escribe 10 minutos a mano y luego ponte de pie y comparte con alguien nuevo." },
      set: meeting.set });
    for (const it of (parts && parts.items) || []) {
      const key = it.key, curated = ctx.data && ctx.data.days && ctx.data.days[key];
      if (curated) {
        for (const c of curated) {
          if (c.path && c.path !== path) continue;
          const a = c.assess ? assessById(ctx.data, c.assess) : null;
          add({ ...c, key, assess: a, kinds: c.kinds.filter(k => k !== "graded" || a) });
        }
      } else {
        // Units without written tasks yet: readings and due items straight from the pacing text.
        const text = String(it.t || "");
        for (const m of text.matchAll(CHAPTER)) for (const n of [m[1], m[2]].filter(Boolean))
          add({ id: `${key}-read-ch${n}`, key, kinds: ["learn"], req: true, min: 20, report: "self", chapter: Number(n),
            title: { en: `Read Chapter ${n}`, es: `Lee el capítulo ${n}` }, how: { en: tr(text), es: tr(text) } });
        if (it.due && !it.speech) add({ id: `${key}-due`, key, kinds: ["practice"], req: true, min: null, report: "canvas",
          title: { en: tr(text), es: tr(text) }, how: { en: "The pacing guide lists something due today. Turn it in through Canvas if Mr. Bennett posts an assignment.", es: "El calendario indica una entrega para hoy. Entrégala en Canvas si el Sr. Bennett publica una tarea." } });
      }
      if (isSpeech(it)) {
        const a = speechAssessment(unit, ctx.level, ctx.tr);
        if (a) add({ id: a.id, key, kinds: ["graded"], req: true, min: null, report: "self", speech: true, assess: a, href: a.rubric,
          title: { en: `Speeches: ${a.title.en}`, es: `Discursos: ${a.title.es}` },
          how: { en: "Speech day. Present when it is your turn; listen respectfully to every speaker.", es: "Día de discursos. Presenta cuando sea tu turno; escucha con respeto a cada orador." } });
      }
      // Activities Mr. Bennett sets for the day in the Lesson Manager (lessons.json "activities").
      const ls = ctx.lessons && ctx.lessons[key];
      for (const lab of (ls && ls.activities) || []) {
        if (out.some(t => t.href === `#/labs/${lab}`)) continue;
        const name = ctx.labNames && ctx.labNames[lab];
        add({ id: `${key}-lab-${lab}`, key, kinds: ["practice"], req: true, min: 20, report: AUTO_LAB[lab] ? "auto" : "self", auto: AUTO_LAB[lab] || null, href: `#/labs/${lab}`,
          title: { en: name ? name[0] : lab, es: name ? name[1] : lab }, how: { en: "Today's activity in the Speaking Lab.", es: "La actividad de hoy en el Speaking Lab." } });
      }
    }
    return out;
  }
  const AUTO_LAB = { listenlab: "listen", audlab: "aud" };

  /** Whether a task is done, and how we know. src = the achievement engine's collected records (read only). */
  function completion(task, store, src) {
    if (task.report === "auto") {
      const n = o => Object.values(o || {}).filter(Boolean).length;
      let rec = null;
      if (/^quiz:\d$/.test(task.auto || "")) { const b = src && src.quiz ? src.quiz[task.auto.slice(5)] : null; if (b != null) rec = { best: b, mastered: b >= 80 }; }
      else if (task.auto === "listen" && src && src.listenFinal != null) rec = { best: src.listenFinal, mastered: src.listenFinal >= 80 };
      else if (task.auto === "aud" && src && src.audBest != null) rec = { best: src.audBest, of: 10 };
      else if (task.auto === "ai" && src && n(src.ai)) rec = { parts: n(src.ai), of: 3 };
      return rec ? { done: true, how: "auto", rec } : { done: false, how: "auto" };
    }
    if (task.report === "canvas") return store.canvas[task.id] ? { done: true, how: "canvas", on: store.canvas[task.id] } : { done: false, how: "canvas" };
    if (task.report === "self") return store.done[task.id] ? { done: true, how: "self", on: store.done[task.id] } : { done: false, how: "self" };
    return { done: false, how: "none" };
  }

  /** Assessment status after the teacher's draft changes (teacher view only). */
  const effective = (a, data) => (a && data && data.assessments ? (assessById(data, a.id) || a) : a);
  /**
   * The grading picture for one group's meetings in one instructional week.
   * Returns { approved: [{ a, dates }], proposed: [...], exception, ok }. A planned grading opportunity is not a
   * grade entered in Canvas; Speaking Lab cannot see the gradebook.
   */
  function weekGrading(ctx, meetings, partsFor, monday) {
    const approved = new Map(), proposed = new Map();
    const addTo = (map, a, date) => { const e = map.get(a.id) || { a, dates: [] }; if (!e.dates.includes(date)) e.dates.push(date); map.set(a.id, e); };
    for (const m of meetings) {
      for (const t of meetingTasks(ctx, m, partsFor(m))) {
        const a = effective(t.assess, ctx.data); if (!a) continue;
        if (a.path && a.path !== pathOf(ctx.level)) continue;
        addTo(a.status === "approved" ? approved : proposed, a, m.date);
      }
      if (m.number && m.number % 10 === 0) addTo(approved, journalSet(m.set), m.date);
    }
    const ex = ctx.data && ctx.data.exceptions && monday ? ctx.data.exceptions[monday] || null : null;
    return { approved: [...approved.values()], proposed: [...proposed.values()], exception: ex, ok: approved.size > 0, excused: !approved.size && !!ex };
  }
  /** Course week of a date for the checklist: the week containing it, else the next week with classes (or null). */
  function weekFor(v, today, monOf) {
    if (v.pre && v.pre.length && monOf(v.pre[0]) === monOf(today)) return { w: 0, days: v.pre, monday: monOf(v.pre[0]) };
    let i = v.weeks.findIndex(d => d.length && monOf(d[0]) === monOf(today));
    if (i < 0) i = v.weeks.findIndex(d => d.length && d[0] > today);
    if (i < 0 && v.pre && v.pre[0] > today) return { w: 0, days: v.pre, monday: monOf(v.pre[0]), next: true };
    return i < 0 ? null : { w: i + 1, days: v.weeks[i], monday: v.mons[i], next: monOf(v.weeks[i][0]) !== monOf(today) };
  }

  const core = { KEY, TKEY, readStore, toggle, meetingTasks, completion, weekGrading, weekFor, speechAssessment, journalSet, pathOf };

  /* ======================= browser ======================= */
  const X = root.SL2, D = root.SL_DATA, S = root.SLSchedule;
  if (!X || !D || !S || !root.document) { root.SLChecklist = { core }; return; }
  const { h, L } = X;
  const es = () => typeof lang !== "undefined" && lang === "es";
  const lvl = () => (typeof level !== "undefined" ? level : "hs");
  const T = o => twoL(o, es());
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const put = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const store = () => readStore(get(KEY));
  const ctxFor = data => ({ data, units: D.units.units, level: lvl(), lessons: D.lessons.days, labNames: D.units.labNames, tr: s => (typeof trText === "function" ? trText(s) : s) });
  const parts = (date, g) => { const p = X.dayParts ? X.dayParts(null, date, g) : null; return p ? { keys: p.keys, items: p.items.map((x, n) => ({ ...x, key: p.keys[n] })) } : { keys: [], items: [] }; };
  const partsFor = g => m => parts(m.extendOf || m.date, g);
  const fmtDay = d => new Date(d + "T12:00:00Z").toLocaleDateString(es() ? "es-US" : "en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
  const fmtTimeOf = at => { const [hh, mm] = at.slice(11).split(":").map(Number); return typeof fmtTime === "function" ? fmtTime(at.slice(11)) : `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, "0")} ${hh < 12 ? "a.m." : "p.m."}`; };
  const mins = n => (n ? L(`About ${n} min`, `Unos ${n} min`) : "");

  /* Icons: shapes differ (not only color), always beside a text label. */
  const ICO = {
    learn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5C6.5 4 9.5 4 12 5.5v13C9.5 17 6.5 17 4 18.5zM20 5.5C17.5 4 14.5 4 12 5.5v13c2.5-1.5 5.5-1.5 8 0z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    practice: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l4-1 11-11-3-3L5 16zM14 6l3 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    graded: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="17" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9 4h6v3H9zM8.5 13l2.5 2.5 4.5-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    achievement: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.3 6.8 19.1l1-5.8L3.5 9.2l5.9-.8z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    auto: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M7.5 12.5l3 3 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    open: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-dasharray="3 3"/></svg>',
    warn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l10 18H2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 10v5M12 17.5v.5" stroke="currentColor" stroke-width="2"/></svg>',
  };
  const kindChip = (k, proposed) => { const K = D.checklist.kinds[k]; if (!K) return "";
    return `<span class="ck-kind ck-${k}${proposed ? " is-proposed" : ""}">${ICO[k]}${h(proposed ? L("Proposed graded", "Calificación propuesta") : T(K))}</span>`; };

  let VIEW = "today"; // this page view only

  function src() { try { return X.achState().src; } catch (e) { return null; } }
  function chapterLink(n) { return typeof CH !== "undefined" && typeof BOOK !== "undefined" && CH[n] ? BOOK + CH[n][0] : null; }
  function taskHref(t) { return t.href || (t.chapter ? chapterLink(t.chapter) : null); }

  function stateLine(t, c) {
    if (c.how === "auto") {
      if (!c.done) return `<p class="ck-state">${ICO.open} ${L("Not recorded yet. Speaking Lab records this when you finish the activity.", "Aún no registrado. Speaking Lab lo registra cuando terminas la actividad.")}</p>`;
      const r = c.rec, det = r.best != null ? (r.of ? L(`best ${r.best} of ${r.of}`, `mejor ${r.best} de ${r.of}`) : L(`best ${r.best}%`, `mejor ${r.best}%`)) : r.parts != null ? L(`${r.parts} of ${r.of} skills mastered`, `${r.parts} de ${r.of} habilidades dominadas`) : "";
      return `<p class="ck-state is-auto">${ICO.auto} <b>${L("Recorded by Speaking Lab", "Registrado por Speaking Lab")}</b>${det ? ` · ${h(det)}` : ""}${r.mastered === false ? ` · ${L("80% or higher counts as mastered; retakes are allowed.", "80% o más cuenta como dominado; puedes repetirlo.")}` : ""}</p>`;
    }
    return "";
  }
  function control(t, c) {
    if (c.how === "auto") return `<span class="ck-auto-ic" aria-hidden="true">${c.done ? ICO.auto : ICO.open}</span><span class="ck-cbl">${c.done ? L("Recorded", "Registrado") : L("Automatic", "Automático")}</span>`;
    const id = `ck-${t.id}-${t.date}`, field = c.how === "canvas" ? "canvas" : "done";
    const label = c.how === "canvas" ? L("I submitted it in Canvas", "Lo entregué en Canvas") : t.speech ? L("I gave my speech", "Di mi discurso") : L("I did this", "Lo hice");
    return `<input type="checkbox" id="${h(id)}" data-ck-toggle="${h(t.id)}" data-ck-field="${field}"${c.done ? " checked" : ""}><label for="${h(id)}" class="ck-cbl">${label}<span class="sr">: ${h(T(t.title))}</span></label>`;
  }
  function taskItem(t, st, sr, opts) {
    const c = completion(t, st, sr), href = taskHref(t), ext = href && /^https?:/.test(href);
    const a = t.assess, graded = a && a.status === "approved";
    const kinds = t.kinds.filter(k => k !== "graded" || graded || opts.teacher).map(k => kindChip(k, k === "graded" && !graded)).join("");
    const meta = [!t.req ? `<span class="ck-opt">${L("Optional", "Opcional")}</span>` : `<span class="ck-req">${L("Required", "Obligatorio")}</span>`, mins(t.min), opts.due ? `${L("Due", "Fecha")}: ${h(fmtDay(t.date))}` : ""].filter(Boolean).join(" · ");
    const title = href ? `<a href="${h(href)}"${ext ? ' target="_blank" rel="noopener"' : ""}>${h(T(t.title))}${ext ? `<span class="sr"> ${L("(opens in a new tab)", "(se abre en una pestaña nueva)")}</span> ↗` : ""}</a>` : h(T(t.title));
    const submit = graded || (a && opts.teacher) ? `<p class="ck-canvas"><b>${L("How to turn it in:", "Cómo entregarlo:")}</b> ${h(T(a.canvas))}${a.points != null && graded ? ` <span class="ck-pts">${L(`${a.points} points`, `${a.points} puntos`)}</span>` : ""}</p>` : t.report === "canvas" ? `<p class="ck-canvas"><b>${L("Canvas:", "Canvas:")}</b> ${L("turn it in through Canvas when Mr. Bennett posts the assignment.", "entrégalo en Canvas cuando el Sr. Bennett publique la tarea.")}</p>` : "";
    const note = c.how === "canvas" && c.done ? `<p class="ck-state is-self">${L("You reported submitting this in Canvas. Speaking Lab can't see Canvas, so check Canvas to confirm your submission.", "Indicaste que lo entregaste en Canvas. Speaking Lab no puede ver Canvas; revisa Canvas para confirmar tu entrega.")}</p>`
      : c.how === "self" && c.done ? `<p class="ck-state is-self">${t.speech ? L("You checked this off. Your speech score comes from Mr. Bennett in Canvas.", "Lo marcaste. La calificación de tu discurso viene del Sr. Bennett en Canvas.") : L("You checked this off.", "Lo marcaste.")}</p>` : "";
    const badge = t.badge && (D.achievements.badges.find(b => b.id === t.badge) || null);
    return `<li class="ck-task${c.done ? " is-done" : ""}${graded ? " is-graded" : ""}">
      <div class="ck-ctl">${control(t, c)}</div>
      <div class="ck-body"><p class="ck-tags">${kinds}</p>
        <h4 class="ck-title">${title}</h4>
        <p class="ck-meta">${meta}</p>
        ${t.how ? `<p class="ck-how">${h(T(t.how))}</p>` : ""}
        ${badge ? `<p class="ck-small">${L("Counts toward the badge", "Cuenta para la insignia")} <a href="#/achievements">${h(X.pick(badge.title))}</a> (${L("not a grade", "no es una calificación")}).</p>` : ""}
        ${stateLine(t, c)}${note}${submit}</div></li>`;
  }

  /* ---------- student panel (Today's Lesson) ---------- */
  function studentWeek() {
    const g = X.group(); if (!g) return null;
    const v = X.weeks(), t = X.today(), W = weekFor(v, t, S.monOf);
    if (!W) return { g, t, W: null, meetings: [] };
    const all = S.meetings(X.opts(g)), meetings = all.filter(m => W.days.includes(m.date));
    return { g, t, W, meetings, all };
  }
  function progressBar(done, total, label) {
    const pct = total ? Math.round((done / total) * 100) : 0;
    return `<div class="ck-prog"><div class="ck-bar" aria-hidden="true"><i style="width:${pct}%"></i></div><p>${label}</p></div>`;
  }
  function checkpoint(wk, data, teacher) {
    const ctx = ctxFor(data), G = weekGrading(ctx, wk.meetings, partsFor(wk.g), wk.W && wk.W.monday);
    const item = (e, prop) => `<li class="${prop ? "is-proposed" : "is-approved"}"><p class="ck-tags">${kindChip("graded", prop)}${e.a.points != null && !prop ? ` <span class="ck-pts">${L(`${e.a.points} points`, `${e.a.points} puntos`)}</span>` : prop ? ` <span class="ck-small">${L("Points not set", "Puntos sin definir")}</span>` : ""}</p>
      <h4>${h(T(e.a.title))}</h4>${e.a.what && T(e.a.what) ? `<p class="ck-small">${h(T(e.a.what))}</p>` : ""}
      <p class="ck-small"><b>${e.a.id.startsWith("journal-set") ? L("Last journal of the set:", "Último diario del grupo:") : e.a.id.endsWith("-speech") ? L("Speech days:", "Días de discursos:") : L("Due:", "Fecha:")}</b> ${e.dates.map(fmtDay).map(h).join(", ")}</p>
      <p class="ck-small"><b>${L("Submit:", "Entrega:")}</b> ${h(T(e.a.canvas))}</p>${e.a.rubric ? `<p class="ck-small"><a href="${h(e.a.rubric)}">${L("Requirements and rubric", "Requisitos y rúbrica")} →</a></p>` : ""}</li>`;
    const none = G.excused ? `<p>${L("Mr. Bennett has not planned a graded assignment for this week", "El Sr. Bennett no planeó una tarea calificada para esta semana")}${G.exception.note ? ` (${h(T(G.exception.note))})` : ""}.</p>`
      : `<p>${L("No graded assignment is posted for this week in Speaking Lab. Check Canvas for anything Mr. Bennett adds.", "No hay una tarea calificada publicada para esta semana en Speaking Lab. Revisa Canvas por si el Sr. Bennett agrega algo.")}</p>`;
    return `<section class="ck-checkpoint" aria-labelledby="ckGH"><h3 id="ckGH">${ICO.graded} ${L("Weekly Grading Checkpoint", "Punto de control de calificaciones")}</h3>
      ${G.approved.length ? `<ul class="ck-glist">${G.approved.map(e => item(e, false)).join("")}</ul>` : none}
      ${teacher && G.proposed.length ? `<p class="ck-small"><b>${L("Proposed (teacher view only, not graded):", "Propuestas (solo vista del maestro, no calificadas):")}</b></p><ul class="ck-glist">${G.proposed.map(e => item(e, true)).join("")}</ul>` : ""}
      <p class="ck-small">${L("Canvas is the official place for assignments, submissions and grades. Speaking Lab shows what is planned; it does not submit, grade or confirm anything.", "Canvas es el lugar oficial para tareas, entregas y calificaciones. Speaking Lab muestra lo planeado; no entrega, califica ni confirma nada.")} <a href="https://myapps.classlink.com/home" target="_blank" rel="noopener">${L("Canvas through ClassLink", "Canvas por ClassLink")}<span class="sr"> ${L("(opens in a new tab)", "(se abre en una pestaña nueva)")}</span> ↗</a></p></section>`;
  }
  function legend() {
    return `<details class="ck-legend"><summary>${L("What the labels and checkmarks mean", "Qué significan las etiquetas y las marcas")}</summary>
      <ul class="ck-kinds">${["learn", "practice", "graded", "achievement"].map(k => `<li>${kindChip(k)} ${h(T(D.checklist.kinds[k].what))}</li>`).join("")}</ul>
      <ul class="ck-how-list">
        <li>${ICO.auto} <b>${L("Recorded by Speaking Lab", "Registrado por Speaking Lab")}</b>: ${L("the activity saved your result in this browser.", "la actividad guardó tu resultado en este navegador.")}</li>
        <li><b>${L("I did this", "Lo hice")}</b>: ${L("your own checkmark, for work done in class or outside Speaking Lab.", "tu propia marca, para trabajo hecho en clase o fuera de Speaking Lab.")}</li>
        <li><b>${L("I submitted it in Canvas", "Lo entregué en Canvas")}</b>: ${L("your own report. Speaking Lab can't see Canvas.", "tu propio aviso. Speaking Lab no puede ver Canvas.")}</li>
        <li><b>${L("Teacher-verified", "Verificado por el maestro")}</b>: ${L("only Mr. Bennett verifies work and enters grades, in Canvas. Speaking Lab never shows work as verified or graded.", "solo el Sr. Bennett verifica el trabajo y pone calificaciones, en Canvas. Speaking Lab nunca muestra un trabajo como verificado o calificado.")}</li></ul>
      <p class="ck-small">${L("Checkmarks are saved only in this browser and are included in your progress backup. They don't add learning points.", "Las marcas se guardan solo en este navegador y se incluyen en tu copia de progreso. No suman puntos de aprendizaje.")}</p></details>`;
  }
  function panel() {
    const wk = studentWeek(); if (!wk) return "";
    const st = store(), sr = src(), data = D.checklist, ctx = ctxFor(data);
    const tasksOf = m => meetingTasks(ctx, m, partsFor(wk.g)(m)).filter(t => t.date === m.date);
    // Same release rules as the lessons: a unit's tasks appear when the unit opens, a day's tasks when its lesson opens.
    const lockedMsg = m => !X.unitOpen(m.unit) ? L(`Unit ${m.unit} opens ${X.fmtAt(X.releasedAt(m.unit))}.`, `La Unidad ${m.unit} se abre el ${X.fmtAt(X.releasedAt(m.unit))}.`)
      : m.date === wk.t && !S.isOpen(S.lessonReleaseAt(m.date, X.opts(wk.g)), X.now()) ? L(`Today's tasks appear when the lesson opens at ${fmtTimeOf(S.lessonReleaseAt(m.date, X.opts(wk.g)))}.`, `Las tareas de hoy aparecen cuando se abre la lección a las ${fmtTimeOf(S.lessonReleaseAt(m.date, X.opts(wk.g)))}.`) : null;
    const seg = `<div class="ck-seg semtog" role="group" aria-label="${L("Checklist view", "Vista de la lista")}"><button type="button" data-ck-view="today" aria-pressed="${VIEW === "today"}">${L("Today", "Hoy")}</button><button type="button" data-ck-view="week" aria-pressed="${VIEW === "week"}">${L("This Week", "Esta semana")}</button></div>`;
    const count = list => { const req = list.filter((t, i) => t.req && list.findIndex(x => x.id === t.id) === i); /* a task on several days (speech days) counts once */ return { done: req.filter(t => completion(t, st, sr).done).length, total: req.length }; };
    let body = "";
    if (VIEW === "today") {
      const m = wk.all.find(x => x.date === wk.t), next = m ? null : wk.all.find(x => x.date > wk.t);
      if (m && lockedMsg(m)) body = `<p class="ck-none">${h(lockedMsg(m))}</p>`;
      else if (m) {
        const list = tasksOf(m), n = count(list);
        body = `${progressBar(n.done, n.total, L(`${n.done} of ${n.total} required tasks done today`, `${n.done} de ${n.total} tareas obligatorias hechas hoy`))}
          <ul class="ck-list">${list.map(t => taskItem(t, st, sr, {})).join("")}</ul>`;
      } else body = `<p class="ck-none">${next ? L(`No class today for your periods. Next class: ${fmtDay(next.date)}. Its tasks are in This Week.`, `Hoy no hay clase para tus periodos. Próxima clase: ${fmtDay(next.date)}. Sus tareas están en Esta semana.`) : L("No more classes this semester.", "No hay más clases este semestre.")}</p>`;
      const G = wk.W ? weekGrading(ctx, wk.meetings, partsFor(wk.g), wk.W.monday) : null;
      body += G ? `<p class="ck-teaser">${ICO.graded} <b>${L("Graded this week:", "Calificado esta semana:")}</b> ${G.approved.length ? G.approved.map(e => h(T(e.a.title))).join("; ") : L("nothing posted in Speaking Lab", "nada publicado en Speaking Lab")} · <button type="button" class="linkbtn" data-ck-view="week">${L("See This Week", "Ver Esta semana")}</button></p>` : "";
    } else if (!wk.W) body = `<p class="ck-none">${L("No more class weeks this semester.", "No hay más semanas de clase este semestre.")}</p>`;
    else {
      const days = wk.meetings.map(m => ({ m, lock: lockedMsg(m), list: lockedMsg(m) ? [] : tasksOf(m) })), all = days.flatMap(d => d.list), n = count(all);
      const wlabel = wk.W.w === 0 ? L("Getting started", "Primeros días") : L(`Week ${wk.W.w}`, `Semana ${wk.W.w}`);
      body = `<p class="ck-weekh">${h(wlabel)} · ${h(fmtDay(wk.W.days[0]))} – ${h(fmtDay(wk.W.days[wk.W.days.length - 1]))}${wk.W.next ? ` · ${L("next class week", "próxima semana de clases")}` : ""} · ${h(groupLabel(wk.g, es()))}</p>
        ${checkpoint(wk, data, false)}
        ${progressBar(n.done, n.total, L(`${n.done} of ${n.total} required tasks done this week`, `${n.done} de ${n.total} tareas obligatorias hechas esta semana`))}
        ${days.length ? days.map(d => `<section class="ck-day" aria-label="${h(fmtDay(d.m.date))}"><h3>${h(fmtDay(d.m.date))}${d.m.date === wk.t ? ` <span class="sl2-pill">${L("Today", "Hoy")}</span>` : ""}${d.m.note ? ` <span class="ck-small">(${h(d.m.note)})</span>` : ""}</h3>
          ${d.lock ? `<p class="ck-none">${h(d.lock)}</p>` : `<ul class="ck-list">${d.list.map(t => taskItem(t, st, sr, { due: false })).join("")}</ul>`}</section>`).join("") : `<p class="ck-none">${L("Your class does not meet this week.", "Tu clase no se reúne esta semana.")}</p>`}`;
    }
    return `<section class="sl2-card ck" aria-labelledby="ckH" data-notr>
      <div class="ck-head"><h2 class="sl2-h2" id="ckH">${ICO.practice} ${L("My Learning Checklist", "Mi lista de aprendizaje")}</h2>${seg}</div>
      ${D.checklist.status && D.checklist.status.en !== "approved" ? `<p class="ck-small">${L("Tasks are drafts awaiting Mr. Bennett's review.", "Las tareas son borradores en revisión del Sr. Bennett.")}</p>` : ""}
      ${body}${legend()}<p class="sr" role="status" id="ckLive"></p></section>`;
  }

  /* ---------- teacher: weekly assessment overview (Week planner) and Quick Teach ---------- */
  const tdraft = () => { try { const d = JSON.parse(get(TKEY) || "null"); if (d && d.assessments && d.days) return d; } catch (e) {} return JSON.parse(JSON.stringify(D.checklist)); };
  const stable = x => JSON.stringify(x, null, 2) + "\n";
  function changed() { const d = tdraft(); return stable(d) !== stable(D.checklist) ? [{ key: "checklist", path: "site/data/checklist.json", text: stable(d) }] : []; }
  const WARN = "No graded assignment has been planned for this instructional week.";
  /** Teacher context: tc = { sem, start, overrides, journals, withStart }. */
  function teacherWeekData(w, tc) {
    const v = S.courseWeeks(tc.start, D.calendar, tc.overrides), days = v.weeks[w - 1] || [], monday = v.mons[w - 1] || null;
    const data = tdraft(), out = { w, days, monday, data, groups: {} };
    for (const g of ["odd", "even"]) {
      const ms = S.meetings({ ...X.opts(g), start: tc.start, overrides: tc.overrides, journals: tc.journals }).filter(m => days.includes(m.date));
      const pf = m => tc.withStart(() => parts(m.extendOf || m.date, g));
      const G = { hs: weekGrading({ ...ctxFor(data), level: "hs" }, ms, pf, monday), col: weekGrading({ ...ctxFor(data), level: "col" }, ms, pf, monday) };
      const byKey = {}; ms.forEach(m => { const p = pf(m); p.keys.forEach(k => { (byKey[k] = byKey[k] || []).push(m.date); }); });
      out.groups[g] = { meetings: ms, G, byKey };
    }
    return out;
  }
  function semesterStrip(tc, cur) {
    const v = S.courseWeeks(tc.start, D.calendar, tc.overrides);
    const cells = v.weeks.map((d, i) => {
      const W = teacherWeekData(i + 1, tc), per = ["odd", "even"].map(g => { const G = W.groups[g].G.hs; return { g, st: G.ok ? "ok" : G.excused ? "ex" : "warn" }; });
      const worst = per.some(x => x.st === "warn") ? "warn" : per.some(x => x.st === "ex") ? "ex" : "ok";
      const word = st => st === "ok" ? L("graded work planned", "trabajo calificado planeado") : st === "ex" ? L("exception", "excepción") : L("no graded assignment planned", "sin tarea calificada");
      return `<li class="ck-sw is-${worst}${i + 1 === cur ? " is-cur" : ""}"><a href="#/teacher/week/${i + 1}"${i + 1 === cur ? ' aria-current="true"' : ""}><b>${L("Week", "Semana")} ${i + 1}</b>${per.map(x => `<span>${x.st === "ok" ? ICO.auto : x.st === "warn" ? ICO.warn : ICO.open} ${x.g === "odd" ? L("Odd", "Impar") : L("Even", "Par")}: ${h(word(x.st))}</span>`).join("")}</a></li>`;
    }).join("");
    return `<details class="ck-semester" open><summary>${L("Grading plan for the semester (high school pathway, both class groups)", "Plan de calificaciones del semestre (bachillerato, ambos grupos)")}</summary><ol class="ck-strip">${cells}</ol></details>`;
  }
  function teacherWeek(w, tc) {
    const W = teacherWeekData(w, tc), data = W.data, keys = [1, 2, 3, 4, 5].map(d => `w${String(w).padStart(2, "0")}d${d}`);
    const warn = ["odd", "even"].flatMap(g => ["hs", "col"].map(p => ({ g, p, G: W.groups[g].G[p] }))).filter(x => !x.G.ok && !x.G.excused && (x.p === "hs" || W.groups[x.g].G.hs.ok));
    const ctxH = { ...ctxFor(data), level: "hs" }, ctxC = { ...ctxFor(data), level: "col" };
    const rowTasks = k => { const m = { date: "x", unit: (S.unitOfWeek(D.units.units, w) || {}).id, journal: null }; const it = (W.groups.odd.byKey[k] || W.groups.even.byKey[k]) ? [{ key: k, t: paceText(k), speech: /^SPEECH /.test(paceText(k)), due: /\bdue\b/i.test(paceText(k)) }] : [];
      const hs = meetingTasks(ctxH, m, { keys: [k], items: it }), col = meetingTasks(ctxC, m, { keys: [k], items: it });
      return hs.concat(col.filter(t => !hs.some(x => x.id === t.id)).map(t => ({ ...t, colOnly: true }))); };
    const nm = t => `${h(T(t.title))}${t.colOnly ? ` <i>(${L("college", "universidad")})</i>` : t.path === "hs" ? ` <i>(${L("high school", "bachillerato")})</i>` : ""}${t.req ? "" : ` <i>(${L("optional", "opcional")})</i>`}`;
    const rows = keys.map(k => {
      const ls = D.lessons.days[k] || {}, ts = rowTasks(k), learn = ts.filter(t => t.kinds.includes("learn")), prac = ts.filter(t => t.kinds.includes("practice") && !t.assess);
      const prop = ts.filter(t => t.assess && effective(t.assess, data).status !== "approved"), appr = ts.filter(t => t.assess && effective(t.assess, data).status === "approved");
      const dt = g => (W.groups[g].byKey[k] || []).map(fmtDay).join(", ") || L("not taught (folded)", "no se enseña (plegado)");
      const canvasLines = ts.filter(t => t.assess).map(t => T(effective(t.assess, data).canvas));
      const btn = (t, on) => t.assess.derived ? `<span class="ck-small">(${L("from", "de")} ${h(t.assess.derived)})</span>` : `<button type="button" class="btn sm" data-ck-approve="${h(t.assess.id)}" data-ck-on="${on ? 1 : 0}">${on ? L("Approve as graded (draft)", "Aprobar como calificada (borrador)") : L("Return to proposed", "Volver a propuesta")}</button>`;
      return `<tr><th scope="row">${k}</th><td>${h(dt("odd"))}</td><td>${h(dt("even"))}</td><td>${h(X.pick(ls.learn) || "")}</td>
        <td>${learn.length ? `<ul>${learn.map(t => `<li>${nm(t)}</li>`).join("")}</ul>` : "—"}</td>
        <td>${prac.length ? `<ul>${prac.map(t => `<li>${nm(t)}</li>`).join("")}</ul>` : "—"}</td>
        <td>${prop.length ? `<ul>${prop.map(t => `<li>${kindChip("graded", true)} ${nm({ ...t, title: effective(t.assess, data).title })} ${btn(t, true)}</li>`).join("")}</ul>` : "—"}</td>
        <td>${appr.length ? `<ul>${appr.map(t => { const a = effective(t.assess, data); return `<li>${kindChip("graded")} ${h(T(a.title))}${a.points != null ? ` · ${L(`${a.points} points`, `${a.points} puntos`)}` : ` · ${L("points not set", "puntos sin definir")}`} ${btn(t, false)}</li>`; }).join("")}</ul>` : "—"}</td>
        <td>${canvasLines.length ? `<ul>${[...new Set(canvasLines)].map(x => `<li>${h(x)}</li>`).join("")}</ul>` : "—"}</td></tr>`;
    }).join("");
    const sets = ["odd", "even"].flatMap(g => W.groups[g].G.hs.approved.filter(e => e.a.id.startsWith("journal-set")).map(e => `${groupLabel(g, es())}: ${T(e.a.title)} (${e.dates.map(fmtDay).join(", ")})`));
    const ex = data.exceptions[W.monday];
    return `<section class="ck-teacher" aria-labelledby="ckTH">
      ${semesterStrip(tc, w)}
      <h2 class="sl2-h2" id="ckTH">${L("Weekly assessment overview", "Resumen semanal de evaluación")} · ${L("Week", "Semana")} ${w}</h2>
      ${warn.length ? warn.map(x => `<p class="pb-warn ck-warn" role="alert">${ICO.warn} <b>${L(WARN, "No se ha planeado una tarea calificada para esta semana de instrucción.")}</b> ${h(groupLabel(x.g, es()))}${x.p === "col" ? ` · ${L("college pathway", "ruta universitaria")}` : ""}.</p>`).join("") : ""}
      ${ex ? `<p class="ck-exnote">${L("Exception for this week:", "Excepción para esta semana:")} <b>${h(T(ex.note) || ex.reason)}</b> <button type="button" class="btn sm" data-ck-exoff="${h(W.monday)}">${L("Remove exception (draft)", "Quitar excepción (borrador)")}</button></p>`
        : `<details class="ck-exform"><summary>${L("Mark this week as an exception (no graded assignment)", "Marcar esta semana como excepción (sin tarea calificada)")}</summary>
          <p class="ck-small">${L("Use this only for weeks with no instruction or unusual scheduling (testing, a shortened week). It is saved as a draft and published with the other files.", "Úsalo solo para semanas sin instrucción o con un horario poco común (exámenes, semana corta). Se guarda como borrador y se publica con los demás archivos.")}</p>
          <p class="btp-row"><label>${L("Reason", "Motivo")} <select id="ckExReason"><option value="no-instruction">${L("No instruction this week", "Sin instrucción esta semana")}</option><option value="testing">${L("Testing interruption", "Interrupción por exámenes")}</option><option value="short-week">${L("Shortened week", "Semana corta")}</option><option value="other">${L("Other", "Otro")}</option></select></label>
          <label>${L("Note (optional)", "Nota (opcional)")} <input id="ckExNote" maxlength="120" autocomplete="off"></label>
          <button type="button" class="btn" data-ck-exon="${h(W.monday)}">${L("Save exception (draft)", "Guardar excepción (borrador)")}</button></p></details>`}
      <p class="ck-small">${L(`Semester dates: ${W.days.length ? `${fmtDay(W.days[0])} – ${fmtDay(W.days[W.days.length - 1])}` : "no class days"} (${W.groups.odd.meetings.length} odd and ${W.groups.even.meetings.length} even class meetings). Each planned day is listed once; the date columns show when each group has it, so tasks are never duplicated across groups.`, `Fechas del semestre: ${W.days.length ? `${fmtDay(W.days[0])} – ${fmtDay(W.days[W.days.length - 1])}` : "sin días de clase"} (${W.groups.odd.meetings.length} clases impares y ${W.groups.even.meetings.length} pares). Cada día planeado aparece una vez; las fechas muestran cuándo lo tiene cada grupo.`)}</p>
      <div class="sl2-tablewrap"><table class="sl2-table ck-ttable"><caption class="sr">${L("Weekly assessment overview", "Resumen semanal de evaluación")}</caption><thead><tr><th scope="col">${L("Day", "Día")}</th><th scope="col">${L("Odd", "Impar")}</th><th scope="col">${L("Even", "Par")}</th><th scope="col">${L("Learning objective", "Objetivo")}</th><th scope="col">${L("Required learning", "Aprendizaje obligatorio")}</th><th scope="col">${L("Practice", "Práctica")}</th><th scope="col">${L("Proposed graded", "Calificación propuesta")}</th><th scope="col">${L("Approved graded", "Calificación aprobada")}</th><th scope="col">${L("Canvas expectations", "Canvas")}</th></tr></thead><tbody>${rows}</tbody></table></div>
      ${sets.length ? `<p class="ck-small"><b>${L("Journal sets completed this week (approved, 100 points each):", "Grupos de diarios completados esta semana (aprobados, 100 puntos cada uno):")}</b> ${sets.map(h).join("; ")}</p>` : ""}
      <p class="ck-small">${L("A planned grading opportunity is not a grade entered in Canvas. Speaking Lab cannot see the Canvas gradebook. Approvals and exceptions are drafts in this browser until you publish data/checklist.json (Publish tab). Points are shown only where the course data already sets them.", "Una oportunidad de calificación planeada no es una calificación puesta en Canvas. Speaking Lab no puede ver el libro de calificaciones de Canvas. Las aprobaciones y excepciones son borradores en este navegador hasta que publiques data/checklist.json (pestaña Publicar). Los puntos aparecen solo donde los datos del curso ya los fijan.")} <a href="#/teacher/playbook/${(S.unitOfWeek(D.units.units, w) || {}).id || 1}">${L("Instructor Playbook", "Guía docente")} →</a></p></section>`;
  }
  function paceText(k) { const w = Number(k.slice(1, 3)), d = Number(k.slice(4)) - 1, p = (D.pacing.weeks[w] || [])[d]; return Array.isArray(p) ? p[0] : p || ""; }
  function quickTeach(day, g) {
    const ms = S.meetings(X.opts(g)).filter(m => m.date === day); if (!ms.length) return "";
    const data = tdraft(), ctx = { ...ctxFor(data), level: "hs" }, list = meetingTasks(ctx, ms[0], parts(ms[0].extendOf || day, g));
    const graded = list.filter(t => t.assess).map(t => { const a = effective(t.assess, data); return `<li>${kindChip("graded", a.status !== "approved")} ${h(T(a.title))}${a.points != null && a.status === "approved" ? ` · ${a.points} ${L("points", "puntos")}` : ""}</li>`; }).join("");
    const wk = S.courseWeekOf(day, X.weeks());
    return `<section class="pbq-card sl2-noprint ck-qt"><h3>${L("Student checklist and grading", "Lista del estudiante y calificaciones")}</h3><p class="ck-small">${L(`${list.length} tasks on students' checklist for this class (${list.filter(t => t.req).length} required).`, `${list.length} tareas en la lista de los estudiantes (${list.filter(t => t.req).length} obligatorias).`)}</p>${graded ? `<ul>${graded}</ul>` : `<p class="ck-small">${L("No graded or proposed assessment in this block.", "Sin evaluación calificada o propuesta en este bloque.")}</p>`}${wk ? `<p class="ck-small"><a href="#/teacher/week/${wk}">${L("Weekly assessment overview", "Resumen semanal de evaluación")} →</a></p>` : ""}</section>`;
  }

  /* ---------- events ---------- */
  root.document.addEventListener("click", e => {
    const v = e.target.closest && e.target.closest("[data-ck-view]");
    if (v) { VIEW = v.dataset.ckView === "week" ? "week" : "today"; X.refresh(); const b = root.document.querySelector(`.ck-seg [data-ck-view="${VIEW}"]`); if (b) b.focus(); return; }
    const ap = e.target.closest && e.target.closest("[data-ck-approve],[data-ck-exon],[data-ck-exoff]");
    if (!ap || !X.teacherOn()) return;
    const d = tdraft();
    if (ap.dataset.ckApprove) { const a = d.assessments.find(x => x.id === ap.dataset.ckApprove); if (a) a.status = ap.dataset.ckOn === "1" ? "approved" : "proposed"; }
    else if (ap.dataset.ckExon) { const r = (root.document.getElementById("ckExReason") || {}).value || "other", n = ((root.document.getElementById("ckExNote") || {}).value || "").trim().slice(0, 120);
      const label = { "no-instruction": ["No instruction this week", "Sin instrucción esta semana"], testing: ["Testing interruption", "Interrupción por exámenes"], "short-week": ["Shortened week", "Semana corta"], other: ["Other", "Otro"] }[r] || ["Other", "Otro"];
      d.exceptions[ap.dataset.ckExon] = { reason: r, note: { en: n || label[0], es: n || label[1] } }; }
    else if (ap.dataset.ckExoff) delete d.exceptions[ap.dataset.ckExoff];
    put(TKEY, JSON.stringify(d)); X.refresh();
  });
  root.document.addEventListener("change", e => {
    const c = e.target.closest && e.target.closest("[data-ck-toggle]"); if (!c) return;
    const s = toggle(store(), c.dataset.ckField === "canvas" ? "canvas" : "done", c.dataset.ckToggle, c.checked, X.today());
    put(KEY, JSON.stringify(s));
    const id = c.id; X.refresh();
    const again = root.document.getElementById(id); if (again) again.focus();
    const live = root.document.getElementById("ckLive"); if (live) live.textContent = c.checked ? L("Checked. Saved in this browser.", "Marcado. Guardado en este navegador.") : L("Unchecked.", "Desmarcado.");
  });

  root.SLChecklist = { core, panel, teacherWeek, quickTeach, changed, WARN };
  try { const r = X.route(); if (r && (r.name === "today" || r.name === "teacher")) X.refresh(); } catch (e) {}
})(typeof window !== "undefined" ? window : globalThis);
