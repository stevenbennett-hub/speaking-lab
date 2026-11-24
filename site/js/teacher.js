/* Speak Up | The Speaking Lab — Teacher Lesson Manager, presentation mode, substitute and weekly plans (Slice 5).
   Opens only in teacher view (a classroom pacing control, NOT secure sign-in: the site is public).
   Drafts are saved in THIS browser (speakup-teacher-drafts-v1). Saving never reaches student devices: you
   export the changed files (lessons.json, journals.json, overrides.json) and commit them to GitHub.
   Edits use the existing files and the existing schedule engine; the district calendar and pacing guide are
   never changed. No GitHub credentials, passwords or tokens are stored here. */
(function () {
  "use strict";
  const S = window.SLSchedule, M = window.SLManage, X = window.SL2, D = window.SL_DATA;
  if (!X || !M) return;
  const PUB = window.SL_PUBLISHED || D;
  const { h, L, pick, ICON } = X;
  const DKEY = "speakup-teacher-drafts-v1", PREV = "speakup-teacher-preview", SIZE = "speakup-present-size";
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const put = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };
  const clone = x => JSON.parse(JSON.stringify(x));
  const es = () => lang === "es";
  const teacher = () => window.SLAccess && SLAccess.teacherOn();

  /* ---------- drafts (this browser only) ---------- */
  function loadDrafts() { try { const d = JSON.parse(get(DKEY) || "null"); if (d && d.drafts) return d.drafts; } catch (e) {} return null; }
  let W = (() => { const d = loadDrafts() || {}; const o = {}; M.EDITABLE.forEach(k => { o[k] = d[k] ? d[k] : clone(PUB[k]); }); return o; })();
  const fullData = () => ({ ...PUB, ...W });
  function saveDrafts() { put(DKEY, JSON.stringify({ kind: "speakup-teacher-drafts", saved: X.today(), drafts: W })); }
  const changedFiles = () => M.changed(PUB, W);

  /* ---------- semester and group context (the manager's own, not the student's) ---------- */
  let sem = (S.semesterOf(D.calendar, X.today()) || "fall"), grp = (classGroup === "odd" || classGroup === "even") ? classGroup : "odd";
  const startOf = s => D.calendar.semesterStart[s];
  /** Run page functions as if the course started on this semester's start date. */
  function withStart(fn) { const s0 = startDate; startDate = startOf(sem); try { return fn(); } finally { startDate = s0; } }
  const weeksFor = () => S.courseWeeks(startOf(sem), D.calendar, W.overrides);
  const classDays = g => { const v = weeksFor(); return S.lessonDates(v, g, D.calendar); };
  const dateRange = w => { const v = weeksFor(), d = v.weeks[w - 1]; return d && d.length ? `${X.fmtShort(d[0])} – ${X.fmtShort(d[d.length - 1])}` : L("no class days", "sin días de clase"); };
  function plannedDates(key) { // dates this planned day is taught, per group, this semester
    const w = Number(key.slice(1, 3)), k = Number(key.slice(4)) - 1, out = {};
    withStart(() => ["odd", "even"].forEach(g => { const it = weekPlan(w, g).find(x => x.k === k); out[g] = it && it.date ? isoD(it.date) : null; }));
    return out;
  }

  /* ---------- small UI helpers ---------- */
  const badge = (st, langName) => `<span class="tm-st is-${st}">${langName}: ${st === "approved" ? L("approved", "aprobado") : L("draft", "borrador")}</span>`;
  const statusBadges = o => badge((o || {}).en || "draft", "EN") + " " + badge((o || {}).es || "draft", "ES");
  const missingEs = o => o && String(o.en || "").trim() && !String(o.es || "").trim() ? ` <span class="tm-miss">${L("Spanish missing", "Falta español")}</span>` : "";
  const fieldPair = (id, label, o, rows) => `<fieldset class="tm-pair"><legend>${label}${missingEs(o)}</legend>
      <label>English<textarea id="${id}-en" rows="${rows || 2}">${h((o && o.en) || "")}</textarea></label>
      <label lang="es">Español<textarea id="${id}-es" rows="${rows || 2}">${h((o && o.es) || "")}</textarea></label></fieldset>`;
  const listPair = (id, label, o, help) => `<fieldset class="tm-pair"><legend>${label}${o && o.en && o.en.length && (!o.es || o.es.length !== o.en.length || o.es.some(x => !x)) ? ` <span class="tm-miss">${L("Spanish missing", "Falta español")}</span>` : ""}</legend>${help ? `<p class="sl2-small">${help}</p>` : ""}
      <label>English <span class="sl2-small">${L("(one per line)", "(uno por línea)")}</span><textarea id="${id}-en" rows="4">${h(((o && o.en) || []).join("\n"))}</textarea></label>
      <label lang="es">Español <span class="sl2-small">${L("(one per line)", "(uno por línea)")}</span><textarea id="${id}-es" rows="4">${h(((o && o.es) || []).join("\n"))}</textarea></label></fieldset>`;
  const val = id => { const el = document.getElementById(id); return el ? el.value.trim() : ""; };
  const pairVal = id => ({ en: val(id + "-en"), es: val(id + "-es") });
  const listVal = id => ({ en: val(id + "-en").split("\n").map(x => x.trim()).filter(Boolean), es: val(id + "-es").split("\n").map(x => x.trim()).filter(Boolean) });
  const opt = (v, t, sel) => `<option value="${h(v)}"${sel ? " selected" : ""}>${h(t)}</option>`;
  function download(name, text) { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "application/json" })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  let flash = "";
  const say = msg => { flash = msg; };

  /* ---------- manager shell ---------- */
  const TABS = [["calendar", L("Calendar", "Calendario")], ["week", L("Week planner", "Plan semanal")], ["schedule", L("Schedule and releases", "Horario y aperturas")], ["journals", L("Journal library", "Biblioteca de diarios")], ["review", L("Review", "Revisión")], ["publish", L("Publish", "Publicar")], ["year", L("New semester or year", "Nuevo semestre o año")]];
  function shell(tab, body) {
    const ch = changedFiles();
    return `<div class="wrap sl2 tm" id="sl2-main" data-notr>
      <p class="sl2-back"><a href="#/">← ${L("My course", "Mi curso")}</a></p>
      <h1 class="sl2-h1">${L("Teacher Lesson Manager", "Administrador de lecciones")}</h1>
      <p class="tm-note" role="note">${L("Teacher view is a convenience and classroom pacing control, not secure sign-in. Your edits are saved as drafts in this browser only. Students see nothing until you export the changed files and commit them to GitHub (Publish tab).", "La vista del maestro es una comodidad y un control del ritmo de la clase, no un inicio de sesión seguro. Tus cambios se guardan como borradores solo en este navegador. Los estudiantes no ven nada hasta que exportes los archivos cambiados y los subas a GitHub (pestaña Publicar).")}
        ${ch.length ? ` <b>${L(`Unpublished changes: ${ch.map(c => c.path.split("/").pop()).join(", ")}.`, `Cambios sin publicar: ${ch.map(c => c.path.split("/").pop()).join(", ")}.`)}</b>` : ""}</p>
      <div class="tm-ctx">
        <label>${L("Semester", "Semestre")} <select data-tm-sem>${opt("fall", L("Fall 2026", "Otoño 2026"), sem === "fall")}${opt("spring", L("Spring 2027", "Primavera 2027"), sem === "spring")}</select></label>
        <label>${L("Class group", "Grupo")} <select data-tm-grp>${opt("odd", groupLabel("odd", es()) + " · " + GROUPS.odd.d[es() ? 1 : 0], grp === "odd")}${opt("even", groupLabel("even", es()) + " · " + GROUPS.even.d[es() ? 1 : 0], grp === "even")}</select></label>
        <a class="btn" href="#/present/${grp}">${L("Present today's lesson", "Presentar la lección de hoy")}</a>
      </div>
      <nav class="sl2-tabs" aria-label="${L("Lesson Manager sections", "Secciones del administrador")}">${TABS.map(([k, t]) => `<a href="#/teacher/${k}"${tab === k ? ' aria-current="page"' : ""}>${t}</a>`).join("")}</nav>
      ${flash ? `<p class="tm-flash" role="status">${h(flash)}</p>` : ""}
      ${body}</div>`;
  }
  function viewTeacher(r) {
    if (!teacher()) return `<div class="wrap sl2" id="sl2-main" data-notr><h1 class="sl2-h1">${L("Teacher Lesson Manager", "Administrador de lecciones")}</h1>
      <p>${L("Open teacher view first: on My course, choose Teacher and enter the teacher view code.", "Primero abre la vista del maestro: en Mi curso, elige Maestro y escribe el código.")}</p><p><button type="button" class="btn" data-sl2-teacher="1">${L("Teacher", "Maestro")}</button></p></div>`;
    const [tab, a1, a2] = r.args.length ? r.args : ["calendar"];
    let body = "";
    try {
      body = tab === "week" ? tabWeek(Number(a1) || currentWeek()) : tab === "day" ? tabLesson(a1) : tab === "date" ? tabDate(a1) : tab === "schedule" ? tabSchedule()
        : tab === "journals" ? tabJournals(a1) : tab === "review" ? tabReview(a1) : tab === "publish" ? tabPublish() : tab === "year" ? tabYear() : tab === "print" ? null : tabCalendar();
    } catch (e) { console.error(e); body = `<p class="tm-err">${h(String(e.message || e))}</p>`; }
    if (tab === "print") return printWeek(Number(a2) || currentWeek());
    const out = shell(tab === "day" ? "week" : tab === "date" ? "calendar" : tab, body); flash = ""; return out;
  }
  function currentWeek() { const v = weeksFor(), w = S.courseWeekOf(X.today(), v); if (w) return w; const next = [].concat(...v.weeks).find(d => d > X.today()); return next ? S.courseWeekOf(next, v) : 1; }

  /* ---------- calendar: every class day, preview, archive ---------- */
  function tabCalendar() {
    const t = X.today(), list = withStart(() => S.meetings({ ...X.opts(grp), start: startOf(sem), overrides: W.overrides, journals: W.journals.journals }));
    const rows = list.map(m => { const st = m.date < t ? L("Released", "Publicada") : m.date === t ? L("Today", "Hoy") : L("Upcoming", "Próxima");
      return `<tr class="${m.date === t ? "is-today" : ""}"><td><a href="#/teacher/date/${m.date}">${h(X.fmtLong(m.date))}</a></td><td>${m.week === 0 ? L("Start", "Inicio") : m.week}</td><td>${m.unit || "—"}</td><td>${m.journal ? `#${m.number} ${h(pick(m.journal.title || m.journal.focus))}` : L("No journal", "Sin diario")}</td><td>${[m.extendOf ? L("Extended lesson", "Lección extendida") : "", m.note ? h(m.note) : ""].filter(Boolean).join(" · ")}</td><td>${st}</td></tr>`; }).join("");
    return `<h2 class="sl2-h2">${L("Class days", "Días de clase")} · ${h(groupLabel(grp, es()))}</h2>
      <p class="sl2-small">${L("Every class meeting this semester for this group, with its journal. Open a day to preview it, present it, print a substitute plan or edit its lessons. Past days are the released-lesson archive.", "Cada clase de este semestre para este grupo, con su diario. Abre un día para verlo, presentarlo, imprimir un plan para suplente o editar sus lecciones. Los días pasados son el archivo de lecciones publicadas.")}</p>
      <div class="sl2-tablewrap"><table class="sl2-table"><thead><tr><th scope="col">${L("Date", "Fecha")}</th><th scope="col">${L("Week", "Semana")}</th><th scope="col">${L("Unit", "Unidad")}</th><th scope="col">${L("Journal", "Diario")}</th><th scope="col">${L("Notes", "Notas")}</th><th scope="col">${L("Status", "Estado")}</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  function tabDate(day) {
    if (!M.realDate(day)) return `<p>${L("Choose a date.", "Elige una fecha.")}</p>`;
    const mod = withStart(() => X.lessonModel(day, grp));
    if (!mod || !mod.meeting) return `<p><a href="#/teacher/calendar">← ${L("Calendar", "Calendario")}</a></p><p>${L("This group has no class on this day.", "Este grupo no tiene clase este día.")}</p>`;
    const m = mod.meeting, j = mod.journal;
    return `<p><a href="#/teacher/calendar">← ${L("Calendar", "Calendario")}</a></p>
      <h2 class="sl2-h2">${h(X.fmtLong(day))} · ${h(groupLabel(grp, es()))}</h2>
      <p>${L("Unit", "Unidad")} ${mod.unit} · ${mod.week === 0 ? L("Getting started", "Primeros días") : `${L("Week", "Semana")} ${mod.week}`} · ${L("Lesson:", "Lección:")} <b>${h(mod.title)}</b>${mod.extendOf ? ` · ${L("Extended from", "Extendida desde")} ${h(X.fmtShort(mod.extendOf))}` : ""}</p>
      <p>${j ? `${L("Journal", "Diario")} #${m.number} (${L("set", "grupo")} ${m.set}): ${h(pick(j.title || j.focus))}` : L("No journal for this class.", "Sin diario para esta clase.")}</p>
      <p class="sl2-btns"><a class="btn primary" href="#/present/${grp}/${day}">${L("Present", "Presentar")}</a> <a class="btn" href="#/sub/${grp}/${day}">${L("Substitute plan", "Plan para suplente")}</a> <a class="btn" href="?date=${day}#/unit/${mod.unit}/day/${day}">${L("Preview as a student", "Ver como estudiante")}</a>
        ${mod.keys.map(k => `<a class="btn" href="#/teacher/day/${k}">${L("Edit lesson", "Editar lección")} ${k}</a>`).join(" ")}</p>
      <h3 class="sl2-h3">${L("Objectives", "Objetivos")}</h3><ul>${mod.objectives.map(o => `<li>${h(pick(o.learn))}<br><span class="sl2-small">${h(pick(o.lang))}</span></li>`).join("")}</ul>
      <h3 class="sl2-h3">${L("Agenda", "Agenda")}</h3><ol>${mod.agenda.map(a => `<li>${h(a.t)}</li>`).join("")}</ol>
      <p class="sl2-small">${L("To change this day's schedule (snow day, assembly, extended lesson, a different journal), use Schedule and releases.", "Para cambiar el horario de este día (nieve, asamblea, lección extendida, otro diario), usa Horario y aperturas.")}</p>`;
  }

  /* ---------- week planner ---------- */
  function tabWeek(w) {
    const L5 = [1, 2, 3, 4, 5].map(d => `w${String(w).padStart(2, "0")}d${d}`);
    const pace = D.pacing.weeks[w] || [];
    const keys = M.dayKeys();
    const rows = L5.map((k, i) => { const ls = W.lessons.days[k] || {}, pd = plannedDates(k), p = pace[i], pt = Array.isArray(p) ? `${p[0]} / ${L("College:", "Universidad:")} ${p[1]}` : p || "";
      return `<tr><th scope="row">${k}</th><td>${h(ls.title ? pick(ls.title) : "")}<div class="sl2-small">${h(trText(pt))}</div></td><td>${h(pick(ls.learn))}</td>
        <td>${pd.odd ? h(X.fmtShort(pd.odd)) : "—"}</td><td>${pd.even ? h(X.fmtShort(pd.even)) : "—"}</td><td>${statusBadges(M.statusOf(W.lessons, k))}</td>
        <td><a class="btn" href="#/teacher/day/${k}">${L("Edit", "Editar")}</a>
          <label class="sr" for="dup-${k}">${L("Copy this lesson to", "Copiar esta lección a")}</label><select id="dup-${k}" data-tm-dupto="${k}"><option value="">${L("Copy to…", "Copiar a…")}</option>${keys.filter(x => x !== k).map(x => opt(x, x)).join("")}</select></td></tr>`; }).join("");
    return `<div class="tm-weeknav"><label>${L("Course week", "Semana del curso")} <select data-tm-week>${Array.from({ length: 16 }, (_, i) => opt(i + 1, `${L("Week", "Semana")} ${i + 1} · ${dateRange(i + 1)}`, i + 1 === w)).join("")}</select></label>
        <a class="btn" href="#/teacher/print/week/${w}">${L("Printable weekly plan", "Plan semanal para imprimir")}</a></div>
      <p class="sl2-small">${L(`Unit ${(S.unitOfWeek(D.units.units, w) || {}).id} · ${dateRange(w)}. Lessons follow the pacing guide's five planned days and are reused every semester; the dates show when each group has them this semester (90-minute blocks hold 2–3 planned days).`, `Unidad ${(S.unitOfWeek(D.units.units, w) || {}).id} · ${dateRange(w)}. Las lecciones siguen los cinco días del calendario y se reutilizan cada semestre; las fechas muestran cuándo las tiene cada grupo este semestre.`)}</p>
      <div class="sl2-tablewrap"><table class="sl2-table"><thead><tr><th scope="col">${L("Day", "Día")}</th><th scope="col">${L("Lesson and pacing", "Lección y calendario")}</th><th scope="col">${L("Learning objective", "Objetivo de aprendizaje")}</th><th scope="col">${L("Odd", "Impar")}</th><th scope="col">${L("Even", "Par")}</th><th scope="col">${L("Review", "Revisión")}</th><th scope="col"><span class="sr">${L("Actions", "Acciones")}</span></th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  /* ---------- daily lesson editor ---------- */
  function tabLesson(k) {
    const ls = W.lessons.days[k];
    if (!ls) return `<p>${L("Choose a lesson in the week planner.", "Elige una lección en el plan semanal.")}</p>`;
    const w = Number(k.slice(1, 3)), d = Number(k.slice(4)), p = (D.pacing.weeks[w] || [])[d - 1], pd = plannedDates(k), t = X.today();
    const taught = ["odd", "even"].filter(g => pd[g] && pd[g] <= t).map(g => `${groupLabel(g, es())} (${X.fmtShort(pd[g])})`);
    const st = M.statusOf(W.lessons, k), labs = Object.keys(D.units.labNames), studios = D.studios.experiences.filter(x => x.status === "available");
    const v = M.validate(fullData()), mine = [...v.errors, ...v.warnings].filter(e => e.file === "lessons" && e.where === k);
    return `<p><a href="#/teacher/week/${w}">← ${L(`Week ${w}`, `Semana ${w}`)}</a></p>
      <h2 class="sl2-h2">${L("Lesson", "Lección")} ${k} · ${L("Week", "Semana")} ${w}, ${L("day", "día")} ${d}</h2>
      <p><b>${L("Pacing guide (not changed here):", "Calendario (no se cambia aquí):")}</b> ${h(Array.isArray(p) ? `${p[0]} — ${L("College:", "Universidad:")} ${p[1]}` : p)}</p>
      <p class="sl2-small">${L(`This semester: ${groupLabel("odd", false)} ${pd.odd ? X.fmtShort(pd.odd) : "—"} · ${groupLabel("even", false)} ${pd.even ? X.fmtShort(pd.even) : "—"}.`, `Este semestre: ${groupLabel("odd", true)} ${pd.odd ? X.fmtShort(pd.odd) : "—"} · ${groupLabel("even", true)} ${pd.even ? X.fmtShort(pd.even) : "—"}.`)}
        ${taught.length ? `<b>${L(`Already taught: ${taught.join(", ")}. Edits will also show in the archive for those days; journal numbers do not change.`, `Ya se enseñó: ${taught.join(", ")}. Los cambios también aparecerán en el archivo de esos días; los números de diario no cambian.`)}</b>` : ""}</p>
      ${mine.length ? `<ul class="tm-issues">${mine.map(e => `<li>${h(e.msg)}</li>`).join("")}</ul>` : ""}
      <form class="tm-form" data-tm-lesson="${k}" novalidate>
        ${fieldPair("f-title", L("Lesson title (optional; otherwise the week's topic)", "Título de la lección (opcional; si no, el tema de la semana)"), ls.title)}
        ${fieldPair("f-learn", L("Learning objective", "Objetivo de aprendizaje"), ls.learn)}
        ${fieldPair("f-col", L("College learning objective (optional)", "Objetivo de aprendizaje universitario (opcional)"), ls.col)}
        ${fieldPair("f-lang", L("Language objective", "Objetivo de lenguaje"), ls.lang)}
        ${listPair("f-success", L("Success criteria", "Criterios de éxito"), ls.success)}
        ${listPair("f-agenda", L("Daily agenda (leave empty to use the pacing guide)", "Agenda del día (déjala vacía para usar el calendario)"), ls.agenda, L("The journal and exit check are added automatically.", "El diario y la revisión final se agregan solos."))}
        ${fieldPair("f-exit", L("Exit reflection (optional)", "Reflexión final (opcional)"), ls.exit)}
        <fieldset class="tm-checks"><legend>${L("Instructional activities and featured labs for this day", "Actividades y laboratorios destacados de este día")}</legend>
          ${labs.map(id => `<label><input type="checkbox" name="act" value="${id}"${(ls.activities || []).includes(id) ? " checked" : ""}> ${h(es() ? D.units.labNames[id][1] : D.units.labNames[id][0])}</label>`).join("")}
          ${studios.map(x => `<label><input type="checkbox" name="feat" value="${x.id}"${(ls.featured || []).includes(x.id) ? " checked" : ""}> ${h(pick(x.title))}</label>`).join("")}</fieldset>
        <fieldset class="tm-pair"><legend>${L("Canvas assignment link (optional)", "Enlace a la tarea de Canvas (opcional)")}</legend>
          <label>URL<input id="f-canvas-url" type="url" placeholder="https://…" value="${h((ls.canvas && ls.canvas.url) || "")}"></label>
          <label>${L("Label (English)", "Etiqueta (inglés)")}<input id="f-canvas-en" value="${h((ls.canvas && ls.canvas.label && ls.canvas.label.en) || "")}"></label>
          <label lang="es">${L("Label (Spanish)", "Etiqueta (español)")}<input id="f-canvas-es" value="${h((ls.canvas && ls.canvas.label && ls.canvas.label.es) || "")}"></label></fieldset>
        <fieldset class="tm-checks"><legend>${L("Review status (you decide; nothing is approved automatically)", "Estado de revisión (tú decides; nada se aprueba solo)")}</legend>
          <label>English <select id="f-st-en">${opt("draft", L("Draft", "Borrador"), st.en !== "approved")}${opt("approved", L("Approved", "Aprobado"), st.en === "approved")}</select></label>
          <label>Español <select id="f-st-es">${opt("draft", L("Draft", "Borrador"), st.es !== "approved")}${opt("approved", L("Approved", "Aprobado"), st.es === "approved")}</select></label></fieldset>
        <p class="sl2-btns"><button type="submit" class="btn primary">${L("Save draft", "Guardar borrador")}</button> <button type="button" class="btn" data-tm-revert="${k}">${L("Undo my changes to this lesson", "Deshacer mis cambios en esta lección")}</button></p>
        <p class="sl2-small">${L("Saving keeps the draft in this browser only. Use Publish to export it.", "Guardar mantiene el borrador solo en este navegador. Usa Publicar para exportarlo.")}</p>
      </form>`;
  }
  function saveLesson(k) {
    const old = W.lessons.days[k], ls = { ...old };
    const setPair = (f, id) => { const v = pairVal(id); if (v.en || v.es) ls[f] = v; else delete ls[f]; };
    setPair("title", "f-title"); setPair("learn", "f-learn"); setPair("col", "f-col"); setPair("lang", "f-lang"); setPair("exit", "f-exit");
    const sc = listVal("f-success"); ls.success = sc;
    const ag = listVal("f-agenda"); if (ag.en.length) ls.agenda = ag; else delete ls.agenda;
    const acts = [...document.querySelectorAll('.tm-form input[name="act"]:checked')].map(x => x.value), feat = [...document.querySelectorAll('.tm-form input[name="feat"]:checked')].map(x => x.value);
    if (acts.length) ls.activities = acts; else delete ls.activities;
    if (feat.length) ls.featured = feat; else delete ls.featured;
    const url = val("f-canvas-url"); if (url) ls.canvas = { url, label: { en: val("f-canvas-en"), es: val("f-canvas-es") } }; else delete ls.canvas;
    ls.status = { en: val("f-st-en") || "draft", es: val("f-st-es") || "draft" };
    W.lessons.days[k] = ls; saveDrafts();
    const v = M.validate(fullData()), mine = v.errors.filter(e => e.file === "lessons" && e.where === k);
    say(mine.length ? L(`Saved as a draft, but fix: ${mine.map(e => e.msg).join("; ")}`, `Guardado como borrador, pero corrige: ${mine.map(e => e.msg).join("; ")}`) : L(`Lesson ${k} saved as a draft in this browser.`, `Lección ${k} guardada como borrador en este navegador.`));
  }

  /* ---------- journal library ---------- */
  function tabJournals(id) {
    const J = W.journals.journals, j = J.find(x => x.id === id);
    const list = `<ul class="tm-jlist">${J.map(x => `<li><a href="#/teacher/journals/${x.id}"${x.id === id ? ' aria-current="true"' : ""}>${x.n ? `#${x.n}` : L("Flex", "Flexible")} · ${L("Unit", "Unidad")} ${x.unit} · ${h(pick(x.title || x.focus))}</a> ${statusBadges(x.status)}</li>`).join("")}</ul>`;
    if (!j) return `<p class="sl2-small">${L("The journals students write by hand, one per 90-minute block. Edit wording here; to use a different journal on a particular day, add a “Assign a specific journal” change in Schedule and releases.", "Los diarios que los estudiantes escriben a mano, uno por bloque de 90 minutos. Edita el texto aquí; para usar otro diario un día específico, agrega “Asignar un diario específico” en Horario y aperturas.")}</p>${list}`;
    return `<p><a href="#/teacher/journals">← ${L("All journals", "Todos los diarios")}</a></p>
      <h2 class="sl2-h2">${j.n ? `${L("Journal", "Diario")} #${j.n}` : L("Flex journal", "Diario flexible")} · ${L("Unit", "Unidad")} ${j.unit}</h2>
      <form class="tm-form" data-tm-journal="${j.id}" novalidate>
        ${fieldPair("j-title", L("Title (optional)", "Título (opcional)"), j.title)}
        ${fieldPair("j-focus", L("Class focus", "Enfoque de la clase"), j.focus)}
        ${fieldPair("j-prompt", L("Prompt", "Pregunta"), j.prompt, 4)}
        ${fieldPair("j-expect", L("Response expectations (optional; default: 10 minutes, write by hand)", "Expectativas de respuesta (opcional; por defecto: 10 minutos, a mano)"), j.expect)}
        ${fieldPair("j-alt", L("No-disclosure option (optional)", "Opción sin datos personales (opcional)"), j.alt)}
        ${fieldPair("j-share", L("Stand and share", "Ponte de pie y comparte"), j.share)}
        ${listPair("j-frames", L("Sentence starters", "Inicios de oración"), j.frames)}
        ${listPair("j-vocab", L("Academic vocabulary", "Vocabulario académico"), j.vocab)}
        <fieldset class="tm-checks"><legend>${L("Review status", "Estado de revisión")}</legend>
          <label>English <select id="j-st-en">${opt("draft", L("Draft", "Borrador"), j.status.en !== "approved")}${opt("approved", L("Approved", "Aprobado"), j.status.en === "approved")}</select></label>
          <label>Español <select id="j-st-es">${opt("draft", L("Draft", "Borrador"), j.status.es !== "approved")}${opt("approved", L("Approved", "Aprobado"), j.status.es === "approved")}</select></label></fieldset>
        <p class="sl2-btns"><button type="submit" class="btn primary">${L("Save draft", "Guardar borrador")}</button></p>
        <p class="sl2-small">${L("The handwritten routine stays the same: about 10 minutes of writing, then stand and share with someone new. Journal numbers come from the calendar and never change for past classes.", "La rutina a mano no cambia: unos 10 minutos de escritura y luego ponerse de pie y compartir con alguien nuevo. Los números de diario vienen del calendario y nunca cambian para clases pasadas.")}</p>
      </form>`;
  }
  function saveJournal(id) {
    const J = W.journals.journals, i = J.findIndex(x => x.id === id), j = { ...J[i] };
    const setPair = (f, el, req) => { const v = pairVal(el); if (v.en || v.es || req) j[f] = v; else delete j[f]; };
    setPair("title", "j-title"); setPair("focus", "j-focus", true); setPair("prompt", "j-prompt", true); setPair("expect", "j-expect"); setPair("share", "j-share", true);
    const alt = pairVal("j-alt"); j.alt = alt.en || alt.es ? alt : null;
    j.frames = listVal("j-frames"); j.vocab = listVal("j-vocab");
    j.status = { en: val("j-st-en") || "draft", es: val("j-st-es") || "draft" };
    J[i] = j; saveDrafts();
    const errs = M.validate(fullData()).errors.filter(e => e.file === "journals" && e.where === id);
    say(errs.length ? L(`Saved, but fix: ${errs.map(e => e.msg).join("; ")}`, `Guardado, pero corrige: ${errs.map(e => e.msg).join("; ")}`) : L("Journal saved as a draft in this browser.", "Diario guardado como borrador en este navegador."));
  }

  /* ---------- schedule and releases ---------- */
  function tabSchedule() {
    const t = X.today(), O = W.overrides.overrides || [], J = W.journals.journals;
    const kindOf = o => { const k = Object.entries(M.KINDS).find(([n, x]) => x.type === o.type && (n !== "snow" || o.groups === "all") && (n !== "closureGroup" || o.groups !== "all")); return k ? pick(k[1]) : o.type; };
    const rows = O.map((o, i) => { const past = M.isPast(o, t) || o.date < t;
      return `<tr><td>${h(X.fmtShort(o.date))}${o.until ? ` – ${h(X.fmtShort(o.until))}` : ""}</td><td>${h(kindOf(o))}${o.journal ? ` (${h(o.journal)})` : ""}</td><td>${o.groups === "all" || !o.groups ? L("All", "Todos") : o.groups.map(g => groupLabel(g, es())).join(", ")}</td><td>${h(o.note || "")}</td><td>${h(o.added || "")}</td>
        <td>${past ? `${ICON.lock} ${L("Past: kept for history", "Pasado: se conserva")}` : `<button type="button" class="btn" data-tm-rmov="${i}">${L("Remove", "Quitar")}</button>`}</td></tr>`; }).join("");
    const rel = W.overrides.releases || {};
    const relRows = D.units.units.map(u => { const def = S.unitReleaseAt(u.id, { start: startOf(sem), cal: D.calendar, units: D.units.units, overrides: { ...W.overrides, releases: {} } }), cur = rel[String(u.id)] || "";
      return `<tr><th scope="row">${L("Unit", "Unidad")} ${u.id}</th><td>${h(X.fmtAt(def))}</td><td><label class="sr" for="rel-${u.id}">${L(`Opening time for Unit ${u.id}`, `Apertura de la Unidad ${u.id}`)}</label><input type="datetime-local" id="rel-${u.id}" value="${h(cur)}"> <button type="button" class="btn" data-tm-rel="${u.id}">${L("Set", "Fijar")}</button>${cur ? ` <button type="button" class="btn" data-tm-relclear="${u.id}">${L("Use calendar", "Usar calendario")}</button>` : ""}</td></tr>`; }).join("");
    const cf = M.conflicts({ ...fullData(), overrides: W.overrides }, S, startOf(sem));
    return `<h2 class="sl2-h2">${L("Changes to the schedule", "Cambios al horario")}</h2>
      <p class="sl2-small">${L("These are kept separate from the district calendar and pacing guide, which are never edited. A snow day shifts the pacing for everyone, like a district closure. Changes for past days are locked so earlier lessons and journal numbers stay as they were. Times are Central Time.", "Se guardan aparte del calendario del distrito y del calendario de ritmo, que nunca se editan. Un día de nieve mueve el ritmo para todos, como un cierre del distrito. Los cambios de días pasados están bloqueados para que las lecciones y los números de diario anteriores no cambien. Las horas son del centro.")}</p>
      <form class="tm-form tm-add" data-tm-addov novalidate>
        <label>${L("What happened", "Qué pasa")} <select id="ov-kind">${Object.entries(M.KINDS).map(([k, x]) => opt(k, pick(x))).join("")}</select></label>
        <label>${L("Date", "Fecha")} <input type="date" id="ov-date" min="${t}" required></label>
        <label>${L("Through (optional)", "Hasta (opcional)")} <input type="date" id="ov-until" min="${t}"></label>
        <label>${L("Class group", "Grupo")} <select id="ov-groups">${opt("all", L("All classes", "Todas las clases"))}${opt("odd", groupLabel("odd", es()))}${opt("even", groupLabel("even", es()))}</select></label>
        <label>${L("Journal (for “Assign a specific journal”)", "Diario (para “Asignar un diario específico”)")} <select id="ov-journal">${opt("", "—")}${J.map(j => opt(j.id, `${j.n ? "#" + j.n : "Flex"} · U${j.unit} · ${pick(j.title || j.focus)}`)).join("")}</select></label>
        <label>${L("Note students see (optional)", "Nota que ven los estudiantes (opcional)")} <input id="ov-note" maxlength="80"></label>
        <p><button type="submit" class="btn primary">${L("Add as draft", "Agregar como borrador")}</button></p></form>
      <div class="sl2-tablewrap"><table class="sl2-table"><thead><tr><th scope="col">${L("Date", "Fecha")}</th><th scope="col">${L("Change", "Cambio")}</th><th scope="col">${L("Classes", "Clases")}</th><th scope="col">${L("Note", "Nota")}</th><th scope="col">${L("Entered", "Registrado")}</th><th scope="col"><span class="sr">${L("Actions", "Acciones")}</span></th></tr></thead><tbody>${rows || `<tr><td colspan="6">${L("No changes yet.", "Todavía no hay cambios.")}</td></tr>`}</tbody></table></div>
      <h2 class="sl2-h2">${L("Conflicts to check", "Conflictos para revisar")}</h2>
      ${cf.length ? `<ul class="tm-issues">${cf.map(c => `<li>${h(X.fmtShort(c.date))}: ${h(c.msg)}</li>`).join("")}</ul>` : `<p>${ICON.check} ${L("No conflicts found for this semester.", "No hay conflictos en este semestre.")}</p>`}
      <h2 class="sl2-h2">${L("Unit release dates and times", "Fechas y horas de apertura de unidades")}</h2>
      <p class="sl2-small">${L(`By default a unit opens at ${D.calendar.releaseTime} Central Time on its first class day. Set a different time only when you want it. Released units stay open for review.`, `Por defecto una unidad se abre a las ${D.calendar.releaseTime} (hora del centro) en su primer día de clase. Fija otra hora solo si lo necesitas. Las unidades abiertas siguen disponibles.`)}</p>
      <div class="sl2-tablewrap"><table class="sl2-table"><thead><tr><th scope="col">${L("Unit", "Unidad")}</th><th scope="col">${L("From the calendar", "Según el calendario")} (${sem === "fall" ? L("fall", "otoño") : L("spring", "primavera")})</th><th scope="col">${L("Your time (optional)", "Tu hora (opcional)")}</th></tr></thead><tbody>${relRows}</tbody></table></div>`;
  }

  /* ---------- review ---------- */
  function tabReview(filter) {
    const only = filter === "todo";
    const rows = M.dayKeys().map(k => { const st = M.statusOf(W.lessons, k), ls = W.lessons.days[k]; if (only && st.en === "approved" && st.es === "approved") return "";
      return `<tr><th scope="row"><a href="#/teacher/day/${k}">${k}</a></th><td>${h(pick(ls.learn))}${missingEs(ls.learn)}${missingEs(ls.lang)}</td><td>${["en", "es"].map(l => `<label class="sr" for="rv-${k}-${l}">${k} ${l}</label><select id="rv-${k}-${l}" data-tm-rv="lesson:${k}:${l}">${opt("draft", `${l.toUpperCase()}: ${L("draft", "borrador")}`, st[l] !== "approved")}${opt("approved", `${l.toUpperCase()}: ${L("approved", "aprobado")}`, st[l] === "approved")}</select>`).join(" ")}</td></tr>`; }).join("");
    const jrows = W.journals.journals.map(j => { if (only && j.status.en === "approved" && j.status.es === "approved") return "";
      return `<tr><th scope="row"><a href="#/teacher/journals/${j.id}">${j.n ? "#" + j.n : "Flex"} · U${j.unit}</a></th><td>${h(pick(j.title || j.focus))}${missingEs(j.prompt)}</td><td>${["en", "es"].map(l => `<label class="sr" for="rv-${j.id}-${l}">${j.id} ${l}</label><select id="rv-${j.id}-${l}" data-tm-rv="journal:${j.id}:${l}">${opt("draft", `${l.toUpperCase()}: ${L("draft", "borrador")}`, j.status[l] !== "approved")}${opt("approved", `${l.toUpperCase()}: ${L("approved", "aprobado")}`, j.status[l] === "approved")}</select>`).join(" ")}</td></tr>`; }).join("");
    const cnt = (arr, l) => arr.filter(s => s[l] === "approved").length;
    const ls = M.dayKeys().map(k => M.statusOf(W.lessons, k)), js = W.journals.journals.map(j => j.status);
    return `<p class="sl2-small">${L("Mark each lesson and journal as you review it, separately for English and Spanish. Nothing is approved automatically. Changes are drafts until published. The Word review document is still available (CLAUDE.md explains how to regenerate it).", "Marca cada lección y diario al revisarlos, por separado en inglés y español. Nada se aprueba solo. Los cambios son borradores hasta publicarlos.")}</p>
      <p><b>${L("Lessons approved:", "Lecciones aprobadas:")}</b> EN ${cnt(ls, "en")}/80 · ES ${cnt(ls, "es")}/80 · <b>${L("Journals approved:", "Diarios aprobados:")}</b> EN ${cnt(js, "en")}/${js.length} · ES ${cnt(js, "es")}/${js.length}
        · <a href="#/teacher/review${only ? "" : "/todo"}">${only ? L("Show all", "Mostrar todo") : L("Show only items that still need review", "Mostrar solo lo que falta revisar")}</a></p>
      <h2 class="sl2-h2">${L("Daily lessons", "Lecciones diarias")}</h2><div class="sl2-tablewrap"><table class="sl2-table"><tbody>${rows}</tbody></table></div>
      <h2 class="sl2-h2">${L("Journals", "Diarios")}</h2><div class="sl2-tablewrap"><table class="sl2-table"><tbody>${jrows}</tbody></table></div>`;
  }

  /* ---------- publish: validate, export, import, backup ---------- */
  function tabPublish() {
    const v = M.validate(fullData(), { today: X.today() }), ch = changedFiles(), cf = M.conflicts({ ...fullData() }, S, startOf(sem)), prev = get(PREV) === "1";
    return `<h2 class="sl2-h2">${L("1. Check", "1. Revisar")}</h2>
      ${v.errors.length ? `<p class="tm-err">${L(`${v.errors.length} problem(s) must be fixed before export:`, `${v.errors.length} problema(s) por corregir antes de exportar:`)}</p><ul class="tm-issues">${v.errors.map(e => `<li><b>${h(e.file)}</b> ${h(e.where)}: ${h(e.msg)}</li>`).join("")}</ul>` : `<p>${ICON.check} ${L("No errors.", "Sin errores.")}</p>`}
      ${v.warnings.length ? `<details><summary>${L(`${v.warnings.length} note(s) to review (for example, missing Spanish)`, `${v.warnings.length} nota(s) para revisar (por ejemplo, falta español)`)}</summary><ul class="tm-issues">${v.warnings.slice(0, 200).map(e => `<li><b>${h(e.file)}</b> ${h(e.where)}: ${h(e.msg)}</li>`).join("")}</ul></details>` : ""}
      ${cf.length ? `<p><b>${L("Schedule conflicts:", "Conflictos del horario:")}</b></p><ul class="tm-issues">${cf.map(c => `<li>${h(c.date)}: ${h(c.msg)}</li>`).join("")}</ul>` : ""}
      <h2 class="sl2-h2">${L("2. Preview", "2. Vista previa")}</h2>
      <label class="sl2-support"><input type="checkbox" data-tm-preview ${prev ? "checked" : ""}> ${L("Show my drafts in the student view on this browser only", "Mostrar mis borradores en la vista de estudiante solo en este navegador")}</label>
      <h2 class="sl2-h2">${L("3. Export changed files", "3. Exportar archivos cambiados")}</h2>
      ${ch.length ? `<ul>${ch.map(c => `<li><code>${h(c.path)}</code> <button type="button" class="btn" data-tm-dl="${c.key}"${v.errors.length ? " disabled" : ""}>${L("Download", "Descargar")}</button></li>`).join("")}</ul>` : `<p>${L("No changes from the published site.", "No hay cambios respecto al sitio publicado.")}</p>`}
      <ol class="tm-steps">
        <li>${L("Download the changed files above.", "Descarga los archivos cambiados.")}</li>
        <li>${L("On GitHub, open the speaking-lab repository, switch to the dev branch, open site/data, choose Add file → Upload files, and drop in the downloaded files (same names, replacing the old ones).", "En GitHub, abre el repositorio speaking-lab, cambia a la rama dev, abre site/data, elige Add file → Upload files y suelta los archivos descargados (mismos nombres, reemplazando los anteriores).")}</li>
        <li>${L("Commit. GitHub runs the tests automatically; a red X means something needs fixing and nothing is published.", "Haz commit. GitHub ejecuta las pruebas; una X roja significa que algo falta corregir y no se publica nada.")}</li>
        <li>${L("When you are ready for students, merge dev into main. Only main publishes the site.", "Cuando esté listo para los estudiantes, combina dev con main. Solo main publica el sitio.")}</li>
        <li>${L("After the site updates, choose “Clear drafts” here so this browser shows the published version again.", "Cuando el sitio se actualice, elige “Borrar borradores” para que este navegador muestre la versión publicada.")}</li></ol>
      <p class="sl2-small">${L("No GitHub password or token is ever stored in this website. You sign in to GitHub yourself.", "Este sitio nunca guarda contraseñas ni tokens de GitHub. Tú inicias sesión en GitHub.")}</p>
      <h2 class="sl2-h2">${L("4. Back up, restore or import", "4. Copia, restauración o importación")}</h2>
      <p class="sl2-btns"><button type="button" class="btn" data-tm-backup>${L("Download a backup of my drafts", "Descargar copia de mis borradores")}</button>
        <label class="btn" for="tm-import">${L("Import a file (backup, lessons.json, journals.json or overrides.json)", "Importar un archivo (copia, lessons.json, journals.json u overrides.json)")}</label><input type="file" id="tm-import" accept=".json,application/json" class="sr">
        <button type="button" class="btn" data-tm-discard>${L("Clear drafts (back to the published site)", "Borrar borradores (volver al sitio publicado)")}</button></p>
      <p class="sl2-small">${L("Drafts live only in this browser. Back them up before clearing browser data or switching computers; import the backup on the new computer. Imported files are checked before they replace your drafts.", "Los borradores viven solo en este navegador. Haz una copia antes de borrar los datos del navegador o cambiar de computadora; importa la copia en la nueva. Los archivos importados se revisan antes de reemplazar tus borradores.")}</p>`;
  }

  /* ---------- semester and year reuse ---------- */
  function tabYear() {
    return `<h2 class="sl2-h2">${L("Reusing the course", "Reutilizar el curso")}</h2>
      <p>${L("Teaching materials (pacing guide, lessons, journals, achievements) do not depend on dates and are reused every semester. Dates come from the academic-year calendar file named in data/config.json:", "Los materiales (calendario de ritmo, lecciones, diarios, logros) no dependen de fechas y se reutilizan cada semestre. Las fechas vienen del archivo de calendario del año escolar indicado en data/config.json:")} <code>${h(D.calendar ? "calendar-2026-27.json" : "")}</code>.</p>
      <ol class="tm-steps"><li>${L("Spring: nothing to do; choose Spring 2027 at the top to plan it.", "Primavera: no hay que hacer nada; elige Primavera 2027 arriba para planearla.")}</li>
        <li>${L("New school year: download the calendar template below, enter the district's no-school days, semester start and end dates and the Wednesday rotation anchor, and save it as data/calendar-YYYY-YY.json. Then change the calendar path in data/config.json and commit both on the dev branch. The tests check the dates.", "Nuevo año escolar: descarga la plantilla, escribe los días sin clase del distrito, las fechas de inicio y fin de semestre y el miércoles de referencia, y guárdala como data/calendar-AAAA-AA.json. Cambia la ruta en data/config.json y sube ambos a la rama dev. Las pruebas revisan las fechas.")}</li>
        <li>${L("Clear last year's schedule changes in overrides.json for the new year (keep a copy). Student progress is stored on each student's computer and is never touched.", "Quita los cambios de horario del año anterior en overrides.json para el nuevo año (guarda una copia). El progreso de los estudiantes está en sus computadoras y nunca se toca.")}</li></ol>
      <p><button type="button" class="btn" data-tm-caltpl>${L("Download a calendar template", "Descargar plantilla de calendario")}</button></p>`;
  }

  /* ---------- presentation mode ---------- */
  let timer = { left: 600, run: false, id: null };
  function viewPresent(r) {
    const g = r.args[0] === "odd" || r.args[0] === "even" ? r.args[0] : grp;
    const day = teacher() && M.realDate(r.args[1]) ? r.args[1] : X.today();
    const mod = withStart(() => X.lessonModel(day, g)), size = Number(get(SIZE)) || 28;
    const j = mod && mod.journal, m = mod && mod.meeting;
    const body = !mod || !m ? `<p class="pr-empty">${L(`No class for ${groupLabel(g, false)} on ${X.fmtLong(day)}.`, `No hay clase para ${groupLabel(g, true)} el ${X.fmtLong(day)}.`)}</p>`
      : `<p class="pr-date">${h(X.fmtLong(day))} · ${h(groupLabel(g, es()))} · ${L("Unit", "Unidad")} ${mod.unit}</p>
        <h1 class="pr-title">${h(mod.title)}</h1>
        <div class="pr-grid">
          <section><h2>${L("Learning objective", "Objetivo de aprendizaje")}</h2>${mod.objectives.map(o => `<p>${h(pick(o.learn))}</p>`).join("")}
            <h2>${L("Language objective", "Objetivo de lenguaje")}</h2>${mod.objectives.map(o => `<p>${h(pick(o.lang))}</p>`).join("")}</section>
          <section class="pr-journal">${j ? `<h2>${L("Journal", "Diario")} #${m.number}</h2><p class="pr-prompt">${h(pick(j.prompt))}</p>
            <p class="pr-small">${h(pick(j.expect || X.DEFAULT_EXPECT))} · ${L("Then stand and share with someone new:", "Luego ponte de pie y comparte con alguien nuevo:")} ${h(pick(j.share))}</p>` : `<h2>${L("No journal today", "Hoy no hay diario")}</h2>`}</section>
          ${j ? `<section><h2>${L("Vocabulary", "Vocabulario")}</h2><p>${j.vocab.en.map((w, i) => h(es() ? j.vocab.es[i] : w)).join(" · ")}</p>
            <h2>${L("Sentence starters", "Inicios de oración")}</h2><ul>${j.frames.en.map((f, i) => `<li>${h(es() ? j.frames.es[i] : f)}</li>`).join("")}</ul></section>` : ""}
          <section><h2>${L("Agenda", "Agenda")}</h2><ol><li>${L("Journal: 10 minutes, then stand and share", "Diario: 10 minutos y luego compartir")}</li>${mod.agenda.map(a => `<li>${h(a.t)}</li>`).join("")}${mod.exit ? `<li>${h(pick(mod.exit))}</li>` : ""}</ol></section>
        </div>`;
    return `<div class="pr" id="sl2-main" data-notr style="--pfs: ${size}px">
      <div class="pr-bar" role="toolbar" aria-label="${L("Presentation controls", "Controles de presentación")}">
        <a class="btn" href="${teacher() ? "#/teacher/calendar" : "#/"}">← ${L("Exit", "Salir")}</a>
        <button type="button" class="btn" data-pr-size="-2" aria-label="${L("Smaller text", "Texto más pequeño")}">A−</button>
        <button type="button" class="btn" data-pr-size="2" aria-label="${L("Larger text", "Texto más grande")}">A+</button>
        <button type="button" class="btn" data-pr-full>${L("Full screen", "Pantalla completa")}</button>
        <span class="pr-timer"><span id="pr-clock" role="timer" aria-live="off">${fmtTimer(timer.left)}</span>
          <button type="button" class="btn" data-pr-timer>${timer.run ? L("Pause", "Pausar") : L("Start 10-minute journal timer", "Iniciar 10 minutos de diario")}</button>
          <button type="button" class="btn" data-pr-reset>${L("Reset", "Reiniciar")}</button></span>
        ${teacher() ? `<label>${L("Group", "Grupo")} <select data-pr-grp>${opt("odd", groupLabel("odd", es()), g === "odd")}${opt("even", groupLabel("even", es()), g === "even")}</select></label>` : ""}
      </div>${body}</div>`;
  }
  const fmtTimer = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  function tick() { if (!timer.run) return; timer.left = Math.max(0, timer.left - 1); const c = document.getElementById("pr-clock"); if (c) c.textContent = fmtTimer(timer.left); if (!timer.left) { timer.run = false; clearInterval(timer.id); const b = document.querySelector("[data-pr-timer]"); if (b) b.textContent = L("Start 10-minute journal timer", "Iniciar 10 minutos de diario"); if (c) { c.textContent = L("Time — stand and share", "Tiempo: compartan"); c.setAttribute("aria-live", "polite"); } } }

  /* ---------- substitute plan and weekly plan (printable) ---------- */
  function planBlock(mod, g) {
    const j = mod.journal, m = mod.meeting, base = location.href.split("#")[0].split("?")[0];
    return `<section class="sp-block"><h2>${h(X.fmtLong(mod.day))} · ${h(groupLabel(g, false))} (${h(GROUPS[g].d[0])}, ${L("90-minute block", "bloque de 90 minutos")})</h2>
      <p><b>${L("Unit", "Unidad")} ${mod.unit}, ${mod.week === 0 ? L("getting started", "primeros días") : `${L("week", "semana")} ${mod.week}`}:</b> ${h(mod.title)}${mod.extendOf ? ` (${L("continues", "continúa")} ${h(X.fmtShort(mod.extendOf))})` : ""}</p>
      <h3>${L("Objectives", "Objetivos")}</h3><ul>${mod.objectives.map(o => `<li>${h(pick(o.learn))}<br><i>${L("Language:", "Lenguaje:")}</i> ${h(pick(o.lang))}</li>`).join("")}</ul>
      <h3>${L("Journal (start of class)", "Diario (inicio de clase)")}</h3>
      ${j ? `<p>${L(`Display Journal #${m.number}. Students write by hand in their journals for about 10 minutes (no devices needed). Then they stand and share with someone new.`, `Muestre el Diario #${m.number}. Los estudiantes escriben a mano unos 10 minutos. Luego se ponen de pie y comparten con alguien nuevo.`)}</p>
        <p class="sp-quote">${h(pick(j.prompt))}</p><p><i>${L("Stand and share:", "Compartir:")}</i> ${h(pick(j.share))}</p>${j.alt ? `<p><i>${L("Students who prefer not to share something personal:", "Si prefieren no compartir algo personal:")}</i> ${h(pick(j.alt))}</p>` : ""}`
        : `<p>${L("No journal for this class.", "No hay diario para esta clase.")}</p>`}
      <h3>${L("Activities", "Actividades")}</h3><ol>${mod.agenda.map(a => `<li>${h(a.t)}</li>`).join("")}${mod.exit ? `<li>${L("Exit reflection:", "Reflexión final:")} ${h(pick(mod.exit))}</li>` : ""}</ol>
      <h3>${L("Website links", "Enlaces")}</h3><ul><li>${L("Today's lesson:", "Lección de hoy:")} ${h(base)}#/unit/${mod.unit}</li><li>${L("Projector view:", "Vista para proyector:")} ${h(base)}#/present/${g}</li>${mod.activities.map(a => `<li>${h(D.units.labNames[a] ? D.units.labNames[a][0] : a)}: ${h(base)}#/unit/${mod.unit}/labs</li>`).join("")}${mod.canvas.map(c => `<li>Canvas: ${h(c.url)}</li>`).join("")}</ul>
      <h3>${L("Success criteria", "Criterios de éxito")}</h3><ul>${mod.success.map(s => `<li>${h(s)}</li>`).join("")}</ul></section>`;
  }
  function viewSub(r) {
    if (!teacher()) return `<div class="wrap sl2" id="sl2-main" data-notr><p>${L("The substitute plan is available in teacher view.", "El plan para suplente está disponible en la vista del maestro.")}</p></div>`;
    const day = M.realDate(r.args[1]) ? r.args[1] : X.today(), gs = r.args[0] === "both" ? ["odd", "even"] : [r.args[0] === "even" ? "even" : "odd"];
    const blocks = gs.map(g => { const mod = withStart(() => X.lessonModel(day, g)); return mod && mod.meeting ? planBlock(mod, g) : `<section class="sp-block"><h2>${h(X.fmtLong(day))} · ${h(groupLabel(g, false))}</h2><p>${L("No class for this group today.", "No hay clase para este grupo hoy.")}</p></section>`; }).join("");
    return `<div class="wrap sl2 sp" id="sl2-main" data-notr>
      <p class="sl2-noprint sl2-btns"><a class="btn" href="#/teacher/date/${day}">← ${L("Back", "Volver")}</a> <button type="button" class="btn primary" data-sl2-print>${L("Print", "Imprimir")}</button>
        <a class="btn" href="#/sub/odd/${day}">${groupLabel("odd", es())}</a> <a class="btn" href="#/sub/even/${day}">${groupLabel("even", es())}</a> <a class="btn" href="#/sub/both/${day}">${L("Both groups", "Ambos grupos")}</a></p>
      <h1 class="sl2-h1">${L("Substitute plan · Speech", "Plan para suplente · Oratoria")}</h1>
      <p>${L("Teacher: Mr. Bennett, Wyandotte High School. This plan contains no student information.", "Maestro: Sr. Bennett, Wyandotte High School. Este plan no contiene información de estudiantes.")}</p>
      ${blocks}
      <section class="sp-block"><h2>${L("Notes from the teacher", "Notas del maestro")}</h2><div class="sp-lines" aria-label="${L("Space for handwritten notes", "Espacio para notas a mano")}"></div>
        <h2>${L("Notes for the teacher (substitute)", "Notas para el maestro (suplente)")}</h2><div class="sp-lines"></div></section></div>`;
  }
  function printWeek(w) {
    const v = weeksFor(), days = (v.weeks[w - 1] || []).filter(d => S.groupOfDay(d, D.calendar) === grp);
    const blocks = days.map(d => { const mod = withStart(() => X.lessonModel(d, grp)); return mod && mod.meeting ? planBlock(mod, grp) : ""; }).join("");
    return `<div class="wrap sl2 sp" id="sl2-main" data-notr>
      <p class="sl2-noprint sl2-btns"><a class="btn" href="#/teacher/week/${w}">← ${L("Week planner", "Plan semanal")}</a> <button type="button" class="btn primary" data-sl2-print>${L("Print", "Imprimir")}</button></p>
      <h1 class="sl2-h1">${L(`Weekly plan · Week ${w}`, `Plan semanal · Semana ${w}`)} · ${h(groupLabel(grp, es()))}</h1><p>${h(dateRange(w))}</p>${blocks || `<p>${L("No classes this week for this group.", "No hay clases esta semana para este grupo.")}</p>`}</div>`;
  }

  /* ---------- events ---------- */
  // Redraw, then move focus to the status message so keyboard and screen-reader users hear the result.
  const rerender = () => { if (window.SL2) SL2.refresh(); const f = document.querySelector(".tm-flash"); if (f) { f.tabIndex = -1; f.focus({ preventScroll: false }); } };
  document.addEventListener("change", e => {
    const t = e.target;
    if (t.matches("[data-tm-sem]")) { sem = t.value; rerender(); }
    else if (t.matches("[data-tm-grp]")) { grp = t.value; rerender(); }
    else if (t.matches("[data-tm-week]")) location.hash = `#/teacher/week/${t.value}`;
    else if (t.matches("[data-tm-dupto]") && t.value) { const from = t.dataset.tmDupto, to = t.value; if (confirm(L(`Replace lesson ${to} with a copy of ${from}? It will be marked as a draft.`, `¿Reemplazar la lección ${to} con una copia de ${from}? Quedará como borrador.`))) { W.lessons = M.duplicateLesson(W.lessons, from, to); saveDrafts(); say(L(`Copied ${from} to ${to} (draft).`, `Se copió ${from} a ${to} (borrador).`)); } rerender(); }
    else if (t.matches("[data-tm-rv]")) { const [kind, id, l] = t.dataset.tmRv.split(":"); if (kind === "lesson") { const d = W.lessons.days[id]; d.status = { ...M.statusOf(W.lessons, id), [l]: t.value }; } else { const j = W.journals.journals.find(x => x.id === id); j.status = { ...j.status, [l]: t.value }; } saveDrafts(); }
    else if (t.matches("[data-tm-preview]")) { put(PREV, t.checked ? "1" : null); location.reload(); }
    else if (t.matches("[data-pr-grp]")) location.hash = `#/present/${t.value}`;
    else if (t.id === "tm-import" && t.files && t.files[0]) {
      const f = t.files[0], rd = new FileReader();
      rd.onload = () => { const r = M.importFile(f.name, String(rd.result), W);
        if (!r.ok) { say(r.msg || L(`Not imported: ${r.v.errors.slice(0, 3).map(e => e.msg).join("; ")}`, `No se importó: ${r.v.errors.slice(0, 3).map(e => e.msg).join("; ")}`)); rerender(); return; }
        if (r.key === "backup") M.EDITABLE.forEach(k => { if (r.drafts[k]) W[k] = r.drafts[k]; }); else W[r.key] = r.data;
        saveDrafts(); say(L(`Imported ${r.key === "backup" ? "your backup" : f.name} as drafts.`, `Se importó ${r.key === "backup" ? "tu copia" : f.name} como borrador.`)); rerender(); };
      rd.readAsText(f);
    }
  });
  document.addEventListener("submit", e => {
    const f = e.target;
    if (f.matches("[data-tm-lesson]")) { e.preventDefault(); saveLesson(f.dataset.tmLesson); rerender(); }
    else if (f.matches("[data-tm-journal]")) { e.preventDefault(); saveJournal(f.dataset.tmJournal); rerender(); }
    else if (f.matches("[data-tm-addov]")) { e.preventDefault();
      try { const g = val("ov-groups"), kind = val("ov-kind");
        if (kind === "journal" && !val("ov-journal")) throw new Error(L("Choose a journal.", "Elige un diario."));
        W.overrides = M.addOverride(W.overrides, { kind, date: val("ov-date"), until: val("ov-until") || undefined, groups: kind === "snow" ? "all" : g === "all" ? "all" : [g], note: val("ov-note"), journal: val("ov-journal") || undefined }, X.today());
        saveDrafts(); say(L("Added as a draft.", "Agregado como borrador."));
      } catch (er) { say(String(er.message || er)); } rerender(); }
  });
  document.addEventListener("click", e => {
    const t = e.target;
    const rm = t.closest("[data-tm-rmov]"); if (rm) { try { W.overrides = M.removeOverride(W.overrides, Number(rm.dataset.tmRmov), X.today()); saveDrafts(); say(L("Removed (draft).", "Quitado (borrador).")); } catch (er) { say(er.message); } rerender(); return; }
    const rl = t.closest("[data-tm-rel]"); if (rl) { const u = rl.dataset.tmRel, v = val(`rel-${u}`); if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) { say(L("Enter a date and time.", "Escribe fecha y hora.")); rerender(); return; } W.overrides = clone(W.overrides); W.overrides.releases = { ...(W.overrides.releases || {}), [u]: v }; saveDrafts(); say(L(`Unit ${u} opens ${v.replace("T", " ")} (draft).`, `La Unidad ${u} se abre ${v.replace("T", " ")} (borrador).`)); rerender(); return; }
    const rc = t.closest("[data-tm-relclear]"); if (rc) { W.overrides = clone(W.overrides); delete W.overrides.releases[rc.dataset.tmRelclear]; saveDrafts(); rerender(); return; }
    const rv = t.closest("[data-tm-revert]"); if (rv) { W.lessons.days[rv.dataset.tmRevert] = clone(PUB.lessons.days[rv.dataset.tmRevert]); saveDrafts(); say(L("Lesson restored to the published version.", "Lección restaurada a la versión publicada.")); rerender(); return; }
    const dl = t.closest("[data-tm-dl]"); if (dl) { const c = changedFiles().find(x => x.key === dl.dataset.tmDl); if (c) download(c.path.split("/").pop(), c.text); return; }
    if (t.closest("[data-tm-backup]")) { download(`speaking-lab-drafts-${X.today()}.json`, M.backup(W, X.today())); return; }
    if (t.closest("[data-tm-discard]")) { if (confirm(L("Clear all drafts on this browser? Download a backup first if you need them.", "¿Borrar todos los borradores en este navegador? Descarga una copia primero si los necesitas."))) { put(DKEY, null); put(PREV, null); location.reload(); } return; }
    if (t.closest("[data-tm-caltpl]")) { const c = clone(D.calendar); c.$comment = "TEMPLATE for a new academic year: replace every date (noSchool, semesterStart, semesterEnd, block.wednesdayAnchor) from the district calendar, then save as data/calendar-YYYY-YY.json and point data/config.json at it. " + (c.$comment || ""); download("calendar-template.json", JSON.stringify(c, null, 2) + "\n"); return; }
    const sz = t.closest("[data-pr-size]"); if (sz) { const n = Math.min(56, Math.max(18, (Number(get(SIZE)) || 28) + Number(sz.dataset.prSize))); put(SIZE, String(n)); const pr = document.querySelector(".pr"); if (pr) pr.style.setProperty("--pfs", n + "px"); return; }
    if (t.closest("[data-pr-full]")) { const el = document.documentElement; if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen(); return; }
    if (t.closest("[data-pr-timer]")) { timer.run = !timer.run; clearInterval(timer.id); if (timer.run) { if (!timer.left) timer.left = 600; timer.id = setInterval(tick, 1000); } t.closest("[data-pr-timer]").textContent = timer.run ? L("Pause", "Pausar") : L("Start 10-minute journal timer", "Iniciar 10 minutos de diario"); return; }
    if (t.closest("[data-pr-reset]")) { timer.run = false; clearInterval(timer.id); timer.left = 600; const c = document.getElementById("pr-clock"); if (c) c.textContent = fmtTimer(600); const b = document.querySelector("[data-pr-timer]"); if (b) b.textContent = L("Start 10-minute journal timer", "Iniciar 10 minutos de diario"); return; }
  });

  X.addRoute("teacher", { view: viewTeacher });
  X.addRoute("present", { view: viewPresent, after: () => document.body.classList.add("sl2-present") });
  X.addRoute("sub", { view: viewSub });
  window.addEventListener("hashchange", () => { if (!/^#\/present/.test(location.hash)) { document.body.classList.remove("sl2-present"); timer.run = false; clearInterval(timer.id); } });
  window.SLTeacher = { drafts: () => W };
})();
