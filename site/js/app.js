/* Speak Up | The Speaking Lab — Slice 12 application views: Learning Labs (#/labs, #/labs/<lab id>), Resources
   (#/resources, #/resources/<area>), Preferences (#/preferences) and the teacher-only celebration demonstration
   (#/demo/celebrate). Registered with SL2.addRoute (js/student.js).
   Nothing here copies course content: labs, videos, speeches, rubrics, pacing, due dates and references are the page's
   existing sections, shown inside the application with SL2.host() (moved in and back out, never duplicated). Names,
   units, routes and progress come from units.json, studios.json, achievements.json and each lab's own records;
   data/activities.json adds only skills and activity types (draft). */
(function () {
  "use strict";
  const X = window.SL2, D = window.SL_DATA; if (!X) return;
  const { h, L, pick } = X;
  const es = () => lang === "es";
  const $id = id => document.getElementById(id);
  const CAT = D.activities || { activities: [], skills: {}, types: {}, portfolio: {} };
  const two = a => (a ? (es() ? a[1] : a[0]) : "");

  /* ---------- Learning Labs ---------- */
  const studioOf = id => D.studios.experiences.find(x => x.id === id);
  const labUnits = id => Object.entries(UNIT_LABS).filter(([, l]) => l.includes(id)).map(([u]) => Number(u));
  const labBlurb = id => { const s = document.querySelector(`#lp-${id} span`); return s ? s.textContent : ""; };
  const isCol = () => typeof level !== "undefined" && level === "col";
  /** One catalog entry → everything a card needs, from the existing data. Unknown or unavailable items never link. */
  function item(a) {
    if (a.kind === "lab") {
      if (!LAB_NAMES[a.id]) return null;
      return { a, title: two(LAB_NAMES[a.id]), blurb: labBlurb(a.id), units: labUnits(a.id), href: `#/labs/${a.id}`, open: true, opensAt: null };
    }
    if (a.kind === "studio") {
      const x = studioOf(a.id); if (!x) return null;
      if (x.audience === "col" && !isCol()) return null; // college-only studios stay hidden unless the authorized pathway is on
      const avail = x.status === "available", unitOk = x.units.some(u => X.unitOpen(u)), first = Math.min(...x.units);
      const href = avail && unitOk ? (x.route || (x.href ? (window.SLBuild && SLBuild.adHref ? SLBuild.adHref(x.href) : x.href) : null)) : null;
      return { a, x, title: pick(x.title), blurb: pick(x.blurb), units: x.units, href, external: !!(href && /^https?:/.test(href)), open: !!href, soon: !avail, opensAt: avail && !unitOk ? first : null };
    }
    if (a.kind === "section") return { a, title: two(a.title), blurb: two(a.blurb), units: (typeof SPEECHES !== "undefined" ? [...new Set(SPEECHES.map(s => s.unit))].sort() : []), href: a.route, open: true };
    return null;
  }
  /** Honest progress from each activity's own record (via the achievement engine's collector). */
  function progress(it, src) {
    const id = it.a.id, n = o => Object.values(o || {}).filter(Boolean).length;
    if (src.labs[id]) { const all = Object.keys(src.labs[id]).length; return L(`${n(src.labs[id])} of ${all} activities mastered`, `${n(src.labs[id])} de ${all} actividades dominadas`); }
    if (id === "plab") return n(src.plabDone) ? L(`${n(src.plabDone)} activities finished`, `${n(src.plabDone)} actividades terminadas`) : null;
    if (id === "audlab") return src.audBest != null ? L(`Audience check: best ${src.audBest} of 10`, `Revisión: mejor ${src.audBest} de 10`) : null;
    if (id === "listenlab") return src.listenFinal != null ? L(`Final check: best ${src.listenFinal}%`, `Revisión final: mejor ${src.listenFinal}%`) : null;
    if (id === "beyond-the-podium-ep1") { const e = src.btp.ep1 || {}; return L(`${n(e)} of 3 skills mastered`, `${n(e)} de 3 habilidades dominadas`); }
    if (id === "ai-coach") return L(`${n(src.ai)} of 3 skills mastered`, `${n(src.ai)} de 3 habilidades dominadas`);
    if (id === "research-studio") { const k = Object.keys(src.research || {}).filter(x => x !== "apa"); return L(`${k.filter(x => src.research[x]).length} skills mastered`, `${k.filter(x => src.research[x]).length} habilidades dominadas`); }
    if (id === "ad-detective") return L(`${n(src.ad)} of 6 cases solved on your own`, `${n(src.ad)} de 6 casos resueltos por tu cuenta`);
    return null;
  }
  const CRIT_ACT = c => (c.type === "lab" || c.type === "labDone" ? c.lab : c.type === "listenFinal" ? "listenlab" : c.type === "audCheck" ? "audlab" : c.type === "btp" ? "beyond-the-podium-ep1" : c.type === "ai" ? "ai-coach" : c.type === "research" ? (c.part === "apa" ? "apa-academy" : "research-studio") : c.type === "adcase" ? "ad-detective" : null);
  window.SLApp = { critActivity: c => CRIT_ACT(c), catalog: () => CAT }; // read by js/certificates.js (no copies)
  const relatedBadges = (id, st) => st.res.filter(r => r.status === "active" && r.badge.criteria.some(c => CRIT_ACT(c) === id));

  let F = null; // filters (this page view only)
  function todayIds() {
    const g = X.group(), t = X.today(), out = new Set();
    if (g) { const m = X.lessonModel(t, g); if (m && m.meeting && m.meeting.date === t) { m.activities.forEach(x => out.add(x)); m.featured.forEach(x => out.add(x)); } }
    return out;
  }
  function viewLabs() {
    const cur = X.currentUnitId(), st = X.achState(), today = todayIds();
    if (!F) F = { view: today.size ? "today" : cur ? "current" : "all", unit: "", skill: "", type: "", avail: "" };
    const items = CAT.activities.map(item).filter(Boolean);
    const keep = it => (F.view === "today" ? today.has(it.a.id) : F.view === "current" ? it.units.includes(cur) : true)
      && (!F.unit || it.units.includes(Number(F.unit))) && (!F.skill || it.a.skills.includes(F.skill)) && (!F.type || it.a.type === F.type)
      && (!F.avail || (F.avail === "now" ? it.open : !it.open));
    const list = items.filter(keep);
    const btp = items.find(it => it.a.type === "cinematic");
    const chip = (v, t) => `<button type="button" class="app-chip" data-app-view="${v}" aria-pressed="${F.view === v}">${t}</button>`;
    const sel = (k, label, opts) => `<label class="app-sel"><span>${label}</span><select data-app-f="${k}"><option value="">${L("Any", "Todos")}</option>${opts.map(([v, t]) => `<option value="${h(v)}"${String(F[k]) === String(v) ? " selected" : ""}>${h(t)}</option>`).join("")}</select></label>`;
    const card = it => {
      const rel = relatedBadges(it.a.id, st), pr = progress(it, st.src), isToday = today.has(it.a.id);
      const unitsTxt = it.units.length === 6 ? L("All units", "Todas las unidades") : `${it.units.length > 1 ? L("Units", "Unidades") : L("Unit", "Unidad")} ${it.units.join(", ")}`;
      const act = it.open ? `<a class="btn${isToday ? " primary" : ""}" href="${h(it.href)}" data-app-open${it.external ? ' target="_blank" rel="noopener"' : ""}>${it.external ? L("Open", "Abrir") : L("Explore", "Explorar")}<span class="sr"> ${h(it.title)}${it.external ? ` ${L("(opens in a new tab)", "(se abre en una pestaña nueva)")}` : ""}</span>${it.external ? " ↗" : " →"}</a>`
        : `<p class="app-avail">${X.ICON.lock} ${it.soon ? L("Coming later", "Llegará después") : L(`Opens with Unit ${it.opensAt}`, `Se abre con la Unidad ${it.opensAt}`)}</p>`;
      return `<li class="app-card app-act${isToday ? " is-today" : ""}${it.open ? "" : " is-locked"}">
        <p class="app-eyebrow">${isToday ? `<span class="app-today-pill">${L("Today", "Hoy")}</span> ` : ""}${h(unitsTxt)} · ${h(two(CAT.types[it.a.type]))}</p>
        <h3>${h(it.title)}</h3><p>${h(it.blurb)}</p>
        <ul class="app-skills" aria-label="${L("Skills", "Habilidades")}">${it.a.skills.map(s => `<li>${h(two(CAT.skills[s]))}</li>`).join("")}</ul>
        ${pr ? `<p class="app-prog">${X.ICON.half} ${h(pr)}</p>` : ""}
        ${rel.length ? `<p class="sl2-small">${L("Achievements", "Logros")}: ${rel.map(r => `${h(pick(r.badge.title))}${r.state === "earned" ? ` ${X.ICON.star}<span class="sr"> ${L("(earned)", "(obtenida)")}</span>` : ""}`).join(", ")}</p>` : ""}
        <div class="app-cardfoot">${act}</div></li>`;
    };
    return `<div class="wrap sl2 app-view app-labs" id="sl2-main" data-notr>
      <p class="app-eyebrow">${L("Practice · Investigate", "Practicar · Investigar")}</p>
      <h1 class="sl2-h1">${L("Learning Labs & Studios", "Laboratorios y estudios")}</h1>
      <p class="sl2-lead">${L("Interactive practice for your current unit and your communication goals. Retry as often as you like; opening an activity never counts as mastery.", "Práctica interactiva para tu unidad actual y tus metas de comunicación. Repite cuantas veces quieras; abrir una actividad nunca cuenta como dominio.")}</p>
      ${btp && btp.open ? `<section class="app-film" aria-labelledby="app-film-h"><div class="app-film-in">
        <p class="app-eyebrow">${L("Featured cinematic experience", "Experiencia cinematográfica destacada")} · ${L("Unit 1", "Unidad 1")}</p>
        <h2 id="app-film-h">${h(btp.title)}</h2><p>${h(btp.blurb)}</p>
        <p class="app-prog">${h(progress(btp, st.src) || "")}</p>
        <a class="btn primary" href="${h(btp.href)}" data-app-open>${L("Explore the episode", "Explorar el episodio")} →</a></div></section>` : ""}
      <div class="app-filters" role="group" aria-label="${L("Filter activities", "Filtrar actividades")}">
        ${today.size ? chip("today", L("Today", "Hoy")) : ""}${cur ? chip("current", L(`Current unit (${cur})`, `Unidad actual (${cur})`)) : ""}${chip("all", L("All activities", "Todas"))}
        ${sel("unit", L("Unit", "Unidad"), [1, 2, 3, 4, 5, 6].map(n => [n, `${L("Unit", "Unidad")} ${n}`]))}
        ${sel("skill", L("Skill", "Habilidad"), Object.entries(CAT.skills).map(([k, v]) => [k, two(v)]))}
        ${sel("type", L("Type", "Tipo"), Object.entries(CAT.types).map(([k, v]) => [k, two(v)]))}
        ${sel("avail", L("Availability", "Disponibilidad"), [["now", L("Available now", "Disponible")], ["later", L("Not open yet", "Todavía no")]])}
      </div>
      <p class="sl2-small" role="status">${L(`${list.length} of ${items.length} activities`, `${list.length} de ${items.length} actividades`)}</p>
      ${list.length ? `<ul class="app-grid app-acts">${list.map(card).join("")}</ul>` : `<p class="sl2-card">${L("No activities match these filters.", "Ninguna actividad coincide con estos filtros.")} <button type="button" class="linkbtn" data-app-view="all">${L("Show all activities", "Mostrar todas")}</button></p>`}
      <p class="sl2-small">${L("Progress is saved only in this browser and is not your grade. Canvas is the official record.", "El progreso se guarda solo en este navegador y no es tu calificación. Canvas es el registro oficial.")}</p>
    </div>`;
  }
  /** One lab inside the application: the page's own lab, moved in (its code and saved work are unchanged). */
  function viewLab(r) {
    const id = r.args[0];
    if (!LAB_NAMES[id]) return `<div class="wrap sl2 app-view" id="sl2-main" data-notr><h1 class="sl2-h1">${L("Activity not found", "Actividad no encontrada")}</h1><p><a class="btn" href="#/labs">← ${L("Learning Labs", "Laboratorios")}</a></p></div>`;
    const units = labUnits(id), a = CAT.activities.find(x => x.id === id);
    return `<div class="wrap sl2 app-view app-labhost" id="sl2-main"><div data-notr>
      <nav class="sl2-back app-crumbs" aria-label="${L("Breadcrumb", "Ruta")}"><a href="#/labs">← ${L("Learning Labs", "Laboratorios")}</a> <span aria-hidden="true">·</span> <a href="#/today">${L("Today’s Lesson", "Lección de hoy")}</a> <span aria-hidden="true">·</span> <a href="#/achievements">${L("My Achievements", "Mis logros")}</a></nav>
      <p class="app-eyebrow">${units.length ? `${units.length > 1 ? L("Units", "Unidades") : L("Unit", "Unidad")} ${units.join(", ")} · ` : ""}${h(two(CAT.types[a ? a.type : "lab"]))}</p>
      <h1 class="sl2-h1">${h(two(LAB_NAMES[id]))}</h1></div>
      <div id="app-slot-lab" class="app-slot"></div>
      <p class="sl2-back sl2-noprint" data-notr><a href="#/labs">← ${L("Back to Learning Labs", "Volver a los laboratorios")}</a></p></div>`;
  }
  function afterLab(r) {
    const id = r.args[0], slot = $id("app-slot-lab"); if (!slot || !LAB_NAMES[id]) return;
    if (!labsVisible().includes(id)) { labExtra = id; }
    renderLabUnit(); showLab(id);
    X.host("labs", slot); applyLang();
  }
  X.addRoute("labs", { view: r => (r.args && r.args[0] ? viewLab(r) : viewLabs()), after: r => { if (r.args && r.args[0]) afterLab(r); } });

  /* ---------- Resources ---------- */
  // Each area points at the page's existing section(s) or an existing studio; nothing is copied.
  const AREAS = [
    { id: "textbook", host: ["resources"], icon: "▤", k: ["Read", "Leer"], t: ["Textbook and readings", "Libro de texto y lecturas"], d: ["Exploring Public Speaking, chapter by chapter, plus slide decks and research tools.", "Exploring Public Speaking por capítulos, presentaciones y herramientas de investigación."] },
    { id: "videos", host: ["videos"], icon: "▷", k: ["Watch", "Ver"], t: ["Model speeches and videos", "Discursos modelo y videos"], d: ["Student example speeches and instructional videos for every unit.", "Discursos de ejemplo de estudiantes y videos para cada unidad."] },
    { id: "speeches", host: ["speeches"], icon: "❝", k: ["Analyze", "Analizar"], t: ["Voices of Change", "Voces del cambio"], d: ["Speeches that changed history, with analysis questions.", "Discursos que cambiaron la historia, con preguntas de análisis."] },
    { id: "assignments", go: () => `#/unit/${X.currentUnitId() || 1}/guide`, icon: "✎", k: ["Prepare", "Preparar"], t: ["Speech assignment guides", "Guías de los discursos"], d: ["Requirements for each speech in the unit guide.", "Los requisitos de cada discurso en la guía de la unidad."] },
    { id: "rubrics", host: ["rubrics"], icon: "✓", k: ["Prepare", "Preparar"], t: ["Rubrics", "Rúbricas"], d: ["The performance criteria for every speech.", "Los criterios de evaluación de cada discurso."] },
    { id: "research", host: ["references"], icon: "⌕", k: ["Investigate", "Investigar"], t: ["Research and citation", "Investigación y citas"], d: ["How to cite the textbook, course references, and the Research & Academic Integrity Studio.", "Cómo citar el libro, las referencias del curso y el Estudio de investigación e integridad académica."], links: [["#/research", ["Research & Academic Integrity Studio", "Estudio de investigación e integridad académica"]]] },
    { id: "policy", icon: "✦", k: ["Integrity", "Integridad"], t: ["Academic integrity and AI policy", "Integridad académica y política de IA"], d: ["The four AI permission levels, the class default, and why your own thinking matters.", "Los cuatro niveles de permiso de IA, el nivel de la clase y por qué importa tu propio pensamiento."], links: [["#/ai", ["AI Coaching Studio", "Estudio de coaching con IA"]], ["#/research/integrity", ["Plagiarism Investigator", "Investigador de plagio"]]] },
    { id: "pacing", host: ["pacing"], icon: "◷", k: ["Plan", "Planear"], t: ["Pacing guide", "Guía de ritmo"], d: ["What happens each week of the course.", "Lo que pasa cada semana del curso."] },
    { id: "dates", host: ["dates"], icon: "▦", k: ["Plan", "Planear"], t: ["Due dates", "Fechas de entrega"], d: ["Upcoming speeches and assignments.", "Próximos discursos y tareas."] },
    { id: "course", host: ["map", "about"], icon: "ℹ", k: ["Course", "Curso"], t: ["Course information", "Información del curso"], d: ["The course map, Mr. Bennett, and about this resource.", "El mapa del curso, el Sr. Bennett y acerca de este recurso."] },
  ];
  let rq = "";
  function viewResources() {
    const q = rq.trim().toLowerCase();
    const list = AREAS.filter(a => !q || [two(a.t), two(a.d), two(a.k)].join(" ").toLowerCase().includes(q));
    return `<div class="wrap sl2 app-view app-res" id="sl2-main" data-notr>
      <p class="app-eyebrow">${L("Read · Watch · Reference", "Leer · Ver · Consultar")}</p>
      <h1 class="sl2-h1">${L("Resources", "Recursos")}</h1>
      <p class="sl2-lead">${L("Everything you need to read, watch and prepare, without leaving Speaking Lab.", "Todo lo que necesitas leer, ver y preparar, sin salir de Speaking Lab.")}</p>
      <p class="app-search"><label for="appResQ">${L("Search resources", "Buscar recursos")}</label> <input id="appResQ" type="search" value="${h(rq)}" autocomplete="off"></p>
      <p class="sl2-small" role="status">${L(`${list.length} of ${AREAS.length} areas`, `${list.length} de ${AREAS.length} áreas`)}</p>
      <ul class="app-grid">${list.map(a => `<li class="app-card"><div class="app-icon" aria-hidden="true">${a.icon}</div><p class="app-eyebrow">${h(two(a.k))}</p>
        <h3><a class="app-cardlink" href="${a.go ? h(a.go()) : `#/resources/${a.id}`}">${h(two(a.t))}</a></h3><p>${h(two(a.d))}</p>
        ${a.links ? `<p class="sl2-small">${a.links.map(([href, t]) => `<a href="${href}">${h(two(t))}</a>`).join(" · ")}</p>` : ""}
        <div class="app-cardfoot"><span aria-hidden="true">${L("Open", "Abrir")} →</span></div></li>`).join("")}</ul>
      <p class="sl2-foot"><a href="#top">${L("Full course guide (all sections on one page)", "Guía completa del curso (todo en una página)")}</a></p>
    </div>`;
  }
  function viewPolicy() {
    const P = D.aiperm || { levels: [] }, def = P.levels.find(l => l.id === P.default);
    return `<div class="sl2-card"><h2 class="sl2-h2">${L("AI permission levels", "Niveles de permiso de IA")}</h2>
      <p>${L("Each assignment has one AI permission. Today's Lesson shows the one for your current work. When no level is set, the class default applies:", "Cada tarea tiene un permiso de IA. La Lección de hoy muestra el de tu trabajo actual. Si no hay uno, se aplica el de la clase:")} <b>${h(def ? pick(def.name) : "")}</b>.</p>
      <ul class="app-levels">${P.levels.map(l => `<li><b>${h(pick(l.name))}</b> · ${h(pick(l.explain))}</li>`).join("")}</ul>
      <p class="sl2-small">${L("Your words, your thinking, your voice: AI can coach, never author.", "Tus palabras, tu pensamiento, tu voz: la IA puede orientar, nunca escribir por ti.")}</p></div>`;
  }
  function viewArea(r) {
    const a = AREAS.find(x => x.id === r.args[0]);
    if (!a) return `<div class="wrap sl2 app-view" id="sl2-main" data-notr><h1 class="sl2-h1">${L("Resource not found", "Recurso no encontrado")}</h1><p><a class="btn" href="#/resources">← ${L("Resources", "Recursos")}</a></p></div>`;
    const chapters = a.id === "textbook" && typeof CH !== "undefined" ? `<section class="sl2-card"><h2 class="sl2-h3">${L("Chapters", "Capítulos")}</h2><ol class="app-chapters">${Object.entries(CH).map(([n, c]) => `<li value="${n}"><a href="${h(BOOK + c[0])}" target="_blank" rel="noopener">${h(trText(c[1]))}<span class="sr"> ${L("(opens in a new tab)", "(se abre en una pestaña nueva)")}</span> ↗</a></li>`).join("")}</ol></section>` : "";
    return `<div class="wrap sl2 app-view app-reshost" id="sl2-main"><div data-notr>
      <nav class="sl2-back app-crumbs" aria-label="${L("Breadcrumb", "Ruta")}"><a href="#/resources">← ${L("Resources", "Recursos")}</a> <span aria-hidden="true">·</span> <a href="#/today">${L("Today’s Lesson", "Lección de hoy")}</a></nav>
      <p class="app-eyebrow">${h(two(a.k))}</p><h1 class="sl2-h1">${h(two(a.t))}</h1>
      ${a.links ? `<p class="sl2-btns">${a.links.map(([href, t]) => `<a class="btn" href="${href}">${h(two(t))}</a>`).join(" ")}</p>` : ""}
      ${chapters}${a.id === "policy" ? viewPolicy() : ""}</div>
      <div id="app-slot-res" class="app-slot"></div>
      <p class="sl2-back sl2-noprint" data-notr><a href="#/resources">← ${L("Back to Resources", "Volver a Recursos")}</a></p></div>`;
  }
  X.addRoute("resources", {
    view: r => (r.args && r.args[0] ? viewArea(r) : viewResources()),
    after: r => { const a = r.args && AREAS.find(x => x.id === r.args[0]), slot = $id("app-slot-res"); if (a && a.host && slot) { a.host.forEach(id => X.host(id, slot)); applyLang(); } },
  });

  /* ---------- Preferences ---------- */
  let soundFiles = null;
  const fileCount = () => { if (soundFiles == null) fetch("media/sfx/manifest.json", { cache: "no-cache" }).then(r => (r.ok ? r.json() : null)).catch(() => null).then(m => { soundFiles = m && m.files ? m.files.filter(f => f.present).length : 0; if (X.route() && X.route().name === "preferences") X.refresh(); }); return soundFiles; };
  function viewPrefs() {
    const P = SLSound.prefs(), p = X.path(), g = X.group(), dark = document.documentElement.dataset.theme === "dark", n = fileCount();
    const radio = (name, val, cur, label, extra) => `<label class="app-radio"><input type="radio" name="${name}" value="${val}"${cur === val ? " checked" : ""}${extra || ""}> ${label}</label>`;
    const check = (k, label, dis) => `<label class="app-check"><input type="checkbox" data-app-pref="${k}"${P[k] ? " checked" : ""}${dis ? " disabled" : ""}> ${label}</label>`;
    return `<div class="wrap sl2 app-view app-prefs" id="sl2-main" data-notr>
      <p class="app-eyebrow">${L("Preferences", "Preferencias")}</p>
      <h1 class="sl2-h1">${L("Make Speaking Lab work for you", "Ajusta Speaking Lab a tu manera")}</h1>
      <p class="sl2-lead">${L("These settings are saved in this browser on this computer.", "Estos ajustes se guardan en este navegador, en esta computadora.")}</p>
      <div class="app-cols">
      <section class="app-card" aria-labelledby="pf-learn"><p class="app-eyebrow">${L("Learning preferences", "Preferencias de aprendizaje")}</p><h2 class="sl2-h2" id="pf-learn">${L("Course pathway", "Ruta del curso")}</h2>
        <fieldset class="app-fs"><legend class="sr">${L("Course pathway", "Ruta del curso")}</legend>
          ${radio("app-path", "hs", p, L("High School Speech", "Oratoria de preparatoria"), " data-app-path")}
          ${radio("app-path", "eld", p, L("High School Speech with language supports (learning English)", "Oratoria con apoyos de idioma (aprendo inglés)"), " data-app-path")}
          ${radio("app-path", "col", p, `College Public Speaking <span class="sl2-small">· ${X.colEnabled() ? L("instructor authorization required", "se requiere autorización del maestro") : L("not offered at this time", "no se ofrece en este momento")}</span>`, " data-app-path")}
        </fieldset>
        <p class="sl2-small">${L("Choosing the college pathway does not enroll you in a college course or award college credit.", "Elegir el nivel universitario no te inscribe en un curso universitario ni otorga créditos universitarios.")}</p>
        <h3 class="sl2-h3">${L("Class periods", "Periodos de clase")}</h3>
        <p class="sl2-btns"><button type="button" class="btn" data-sl2-grp="odd" aria-pressed="${g === "odd"}">${h(groupLabel("odd", es()))}</button> <button type="button" class="btn" data-sl2-grp="even" aria-pressed="${g === "even"}">${h(groupLabel("even", es()))}</button></p>
        <p class="sl2-small">${L("This sets your class days and journal numbers.", "Esto define tus días de clase y los números de tu diario.")}</p>
        <h3 class="sl2-h3">${L("Language", "Idioma")}</h3>
        <p class="sl2-btns"><button type="button" class="btn" data-app-lang="en" lang="en" aria-pressed="${!es()}">English</button> <button type="button" class="btn" data-app-lang="es" lang="es" aria-pressed="${es()}">Español</button></p>
        ${X.supportToggle(false)}
        <h3 class="sl2-h3">${L("Appearance", "Apariencia")}</h3>
        <fieldset class="app-fs"><legend class="sr">${L("Appearance", "Apariencia")}</legend>${radio("app-theme", "light", dark ? "dark" : "light", L("Light", "Claro"), " data-app-theme")}${radio("app-theme", "dark", dark ? "dark" : "light", L("Dark", "Oscuro"), " data-app-theme")}</fieldset>
      </section>
      <section class="app-card" aria-labelledby="pf-sound"><p class="app-eyebrow">${L("Sound and motion", "Sonido y movimiento")}</p><h2 class="sl2-h2" id="pf-sound">${L("Sound and motion", "Sonido y movimiento")}</h2>
        <p class="sl2-btns"><button type="button" class="btn primary" data-app-quiet>${L("Quiet Classroom: all sounds off", "Salón en silencio: sin sonidos")}</button></p>
        <p class="sl2-small">${L("Sound is off unless you turn it on. Speaking Lab never plays sound during videos, recordings or presentations. Everything shown with sound is also shown on screen.", "El sonido está apagado a menos que lo actives. Speaking Lab nunca suena durante videos, grabaciones o presentaciones. Todo lo que suena también se muestra en pantalla.")}</p>
        ${check("sound", `<b>${L("Sound", "Sonido")}</b>`)}
        <div class="app-sub">${check("ui", L("Interface sounds (opening a studio, saving a backup, header links)", "Sonidos de la interfaz (abrir un estudio, guardar una copia, enlaces del encabezado)"), !P.sound)}
        ${check("ach", L("Learning feedback and achievement sounds", "Sonidos de logros y retroalimentación"), !P.sound)}
        <label class="app-range">${L("Volume", "Volumen")} <input type="range" min="0" max="100" step="10" value="${P.volume}" data-app-pref="volume"${P.sound ? "" : " disabled"} aria-valuetext="${P.volume}%"> <span>${P.volume}%</span></label>
        <p class="sl2-btns"><button type="button" class="btn" data-app-sample="correct"${P.sound && n ? "" : " disabled"}>${L("Try a sound", "Probar un sonido")}</button></p>
        <p class="sl2-small">${n === 0 ? L("The sound files have not been added to Speaking Lab yet, so nothing will play.", "Los archivos de sonido todavía no se han agregado a Speaking Lab, así que no sonará nada.") : n == null ? "" : L(`${n} sounds available.`, `${n} sonidos disponibles.`)}</p></div>
        ${check("anim", `<b>${L("Achievement animations", "Animaciones de logros")}</b>`)}
        <fieldset class="app-fs"><legend>${L("Motion", "Movimiento")}</legend>${radio("app-motion", "device", P.motion, L("Follow my device setting", "Seguir el ajuste de mi dispositivo"), " data-app-motion")}${radio("app-motion", "reduce", P.motion, L("Reduce motion", "Reducir el movimiento"), " data-app-motion")}</fieldset>
        <p class="sl2-small">${SLSound.reducedMotion() ? L("Motion is reduced: celebrations appear without animation.", "Movimiento reducido: las celebraciones aparecen sin animación.") : L("Celebrations use a short, gentle animation you can close right away.", "Las celebraciones usan una animación breve y suave que puedes cerrar de inmediato.")}</p>
      </section>
      <section class="app-card" aria-labelledby="pf-work"><p class="app-eyebrow">${L("Your work", "Tu trabajo")}</p><h2 class="sl2-h2" id="pf-work">${L("Progress backup", "Copia de tu progreso")}</h2>
        <p>${L("Your progress is saved only in this browser on this computer. Clearing the browser or using another computer starts fresh unless you restore a backup file.", "Tu progreso se guarda solo en este navegador y en esta computadora. Si borras el navegador o usas otra computadora, empiezas de nuevo a menos que restaures una copia.")}</p>
        <p class="sl2-btns"><button type="button" class="btn" data-mywork="1">${L("Back up or restore my progress", "Copiar o restaurar mi progreso")}</button></p>
        <p class="sl2-small">${L("Restoring asks you to confirm first, because it replaces what is saved on this computer.", "Restaurar te pide confirmar primero, porque reemplaza lo guardado en esta computadora.")}</p>
      </section>
      <section class="app-card" aria-labelledby="pf-teach"><p class="app-eyebrow">${L("Teacher", "Maestro")}</p><h2 class="sl2-h2" id="pf-teach">${L("Teacher access", "Acceso del maestro")}</h2>
        <p class="sl2-small">${L("A classroom convenience code for Mr. Bennett, not a secure sign-in.", "Un código de conveniencia para el Sr. Bennett, no un inicio de sesión seguro.")}</p>
        <p class="sl2-btns"><button type="button" class="btn" data-sl2-teacher="1">${L("Teacher tools", "Herramientas del maestro")}</button></p>
      </section>
      </div>
      <p role="status" class="sl2-small" id="appPrefMsg"></p>
    </div>`;
  }
  X.addRoute("preferences", { view: viewPrefs });
  const msg = t => { const m = $id("appPrefMsg"); if (m) m.textContent = t; };
  const keepFocus = sel => { X.refresh(); const f = document.querySelector(sel); if (f) f.focus(); };
  document.addEventListener("change", e => {
    const t = e.target;
    if (t.matches("[data-app-pref]")) { const k = t.dataset.appPref; SLSound.set({ [k]: k === "volume" ? Number(t.value) : t.checked }); keepFocus(`[data-app-pref="${k}"]`); msg(L("Saved.", "Guardado.")); return; }
    if (t.matches("[data-app-motion]")) { SLSound.set({ motion: t.value }); keepFocus(`[data-app-motion][value="${t.value}"]`); return; }
    if (t.matches("[data-app-theme]")) { document.documentElement.dataset.theme = t.value; try { localStorage.setItem("speakup-theme", t.value); } catch (er) {} const b = $id("themeBtn"); if (b) b.setAttribute("aria-pressed", String(t.value === "dark")); return; }
    if (t.matches("[data-app-path]")) { const v = t.value; if (v === "col") { chooseLevel("col", t); keepFocus('[data-app-path][value="col"]'); } else { X.choosePath(v, t, true); keepFocus(`[data-app-path][value="${v}"]`); } return; }
    if (t.matches("[data-app-f]")) { F[t.dataset.appF] = t.value; keepFocus(`[data-app-f="${t.dataset.appF}"]`); }
  });
  document.addEventListener("input", e => { if (e.target.id === "appResQ") { rq = e.target.value; const pos = e.target.selectionStart; X.refresh(); const q = $id("appResQ"); if (q) { q.focus(); try { q.setSelectionRange(pos, pos); } catch (er) {} } } });
  document.addEventListener("click", e => {
    const t = e.target;
    const v = t.closest("[data-app-view]"); if (v) { F.view = v.dataset.appView; if (F.view === "all") F.unit = F.skill = F.type = F.avail = ""; keepFocus(`[data-app-view="${F.view}"]`); return; }
    if (t.closest("[data-app-quiet]")) { SLSound.quiet(); keepFocus("[data-app-quiet]"); msg(L("Quiet Classroom is on: all sounds are off. Visual feedback stays on.", "Salón en silencio activado: no hay sonidos. Los mensajes visuales siguen activos.")); return; }
    const sm = t.closest("[data-app-sample]"); if (sm) { SLSound.sample(sm.dataset.appSample); return; }
    const lg = t.closest("[data-app-lang]"); if (lg) { setLang(lg.dataset.appLang); keepFocus(`[data-app-lang="${lg.dataset.appLang}"]`); return; }
    if (t.closest("[data-app-open]")) SLSound.cue("open");
    if (t.closest("#mwBackup")) SLSound.cue("backup");
  });

  /* ---------- teacher demonstration of celebrations (nothing is awarded or saved) ---------- */
  X.addRoute("demo", { view: () => {
    if (!X.teacherOn()) return `<div class="wrap sl2 app-view" id="sl2-main" data-notr><h1 class="sl2-h1">${L("Teacher tools", "Herramientas del maestro")}</h1><p>${L("This page needs teacher view.", "Esta página necesita la vista del maestro.")}</p><p><button type="button" class="btn" data-sl2-teacher="1">${L("Teacher tools", "Herramientas del maestro")}</button></p></div>`;
    const B = id => D.achievements.badges.find(b => b.id === id), opts = [["knowledge", ["communication-explorer"]], ["applied", ["active-listener"]], ["verified", ["confident-speaker"]], ["milestone", ["master-ad-detective"]], ["several", ["communication-explorer", "active-listener", "bridge-builder"]]];
    return `<div class="wrap sl2 app-view" id="sl2-main" data-notr><p class="sl2-back"><a href="#/teacher">← ${L("Lesson Manager", "Administrador de lecciones")}</a></p>
      <p class="app-eyebrow">${L("Teacher demonstration", "Demostración para el maestro")}</p><h1 class="sl2-h1">${L("Achievement celebrations", "Celebraciones de logros")}</h1>
      <p>${L("Replay each celebration style. Nothing is awarded, no points are added and no progress changes. Students see a celebration only when they earn a badge for the first time.", "Repite cada estilo de celebración. No se otorga nada, no se suman puntos y no cambia ningún progreso. Los estudiantes ven una celebración solo cuando obtienen una insignia por primera vez.")}</p>
      <ul class="app-grid">${opts.map(([k, ids]) => `<li class="app-card"><h3>${k === "several" ? L("Several at once", "Varios a la vez") : h(L(SLCelebrate.TIER[k][0], SLCelebrate.TIER[k][1]))}</h3><p class="sl2-small">${ids.map(id => h(pick(B(id).title))).join(", ")}</p><p class="sl2-btns"><button type="button" class="btn" data-app-demo="${ids.join(",")}">${L("Play", "Reproducir")}</button> <a class="btn" href="#/certificate/${ids[0]}/demo">${L("Sample certificate", "Certificado de muestra")}</a></p></li>`).join("")}</ul>
      <p class="sl2-small">${L("Teacher-verified badges (gold) stay pending for students until a real teacher verification process exists.", "Las insignias verificadas por el maestro (doradas) siguen pendientes para los estudiantes hasta que exista un proceso real de verificación.")}</p></div>`;
  } });
  document.addEventListener("click", e => { const b = e.target.closest("[data-app-demo]"); if (!b || !X.teacherOn()) return; SLCelebrate.show(b.dataset.appDemo.split(",").map(id => D.achievements.badges.find(x => x.id === id)), { demo: true, points: D.achievements.points.badge }); });

  /* ---------- header labels (EN/ES) ---------- */
  const label = () => { const s = $id("soundBtn"); if (s) { s.querySelector("span").textContent = L("Mute sounds", "Silenciar"); } };
  const baseApply = window.applyLang; window.applyLang = function () { const r = baseApply.apply(this, arguments); label(); return r; };
  label();
})();
