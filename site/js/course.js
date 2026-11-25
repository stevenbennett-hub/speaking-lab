/* Speak Up | The Speaking Lab — course welcome, Course Essentials and The History & Voices of Wyandotte (RC2 refinement).
   Nothing here is new course content. The welcome video (with its captions and transcript), the course purpose, Mr.
   Bennett's introduction and philosophy, the course map, due dates, the Wyandotte photograph and Voices from Wyandotte
   are the classic page's own elements, shown here with SL2.host (moved in, then back; never copied). Grading, schedule,
   AI and expectations facts are read from the data files and the labs' own lists (window.SL_EXPECT, window.SL_NORMS).
   No grading policy, assignment requirement, classroom expectation or historical fact is invented here; where the course
   has no approved text, the page says where to find it (Canvas, Mr. Bennett) instead.
   Routes: #/course (welcome and Course Essentials), #/course/<section>, #/wyandotte. No new navigation tab. */
(function () {
  "use strict";
  const X = window.SL2, D = window.SL_DATA, S = window.SLSchedule;
  if (!X || !D) return;
  const { h, L, pick } = X;
  const es = () => typeof lang !== "undefined" && lang === "es";
  const two = a => (Array.isArray(a) ? (es() ? a[1] : a[0]) : pick(a));
  const $id = id => document.getElementById(id);
  const WKEY = "speakup-welcome-v1"; // "open" | "closed": a per-browser display preference (no personal data)
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const put = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const ext = L("(opens in a new tab)", "(se abre en una pestaña nueva)");
  const lvl = () => (typeof level !== "undefined" && level === "col" ? "col" : "hs");
  const translate = () => { if (typeof applyLang === "function") try { applyLang(); } catch (e) {} };

  /* ---------- Course Essentials: six sections ---------- */
  const SECTIONS = [
    { id: "overview", icon: "▤", t: ["Course Overview", "Panorama del curso"], d: ["What the course is, the six units and their speeches, and Mr. Bennett.", "Qué es el curso, las seis unidades y sus discursos, y el Sr. Bennett."] },
    { id: "grading", icon: "✓", t: ["Grading and Assignments", "Calificaciones y tareas"], d: ["What is graded, where it is graded, and how Speaking Lab and Canvas fit together.", "Qué se califica, dónde se califica y cómo se relacionan Speaking Lab y Canvas."] },
    { id: "expectations", icon: "◎", t: ["Classroom Expectations", "Expectativas de la clase"], d: ["The daily routine and how we listen to every speaker.", "La rutina diaria y cómo escuchamos a cada orador."] },
    { id: "schedule", icon: "▦", t: ["Course Schedule", "Calendario del curso"], d: ["Class periods, when lessons open, and the due dates for your class.", "Periodos de clase, cuándo se abren las lecciones y las fechas de tu clase."] },
    { id: "ai", icon: "✦", t: ["Responsible AI Use", "Uso responsable de la IA"], d: ["The four AI permission levels and the class default.", "Los cuatro niveles de permiso de IA y el nivel de la clase."] },
    { id: "progress", icon: "★", t: ["Achievements and Progress", "Logros y progreso"], d: ["Badges, learning points, certificates and keeping your progress safe.", "Insignias, puntos de aprendizaje, certificados y cómo cuidar tu progreso."] },
  ];
  const secHref = id => `#/course/${id}`;
  const essentialsNav = cur => `<nav class="cw-ess" aria-label="${L("Course essentials", "Lo esencial del curso")}"><span class="cw-ess-h">${L("Course essentials", "Lo esencial del curso")}:</span>${SECTIONS.map(s => `<a href="${secHref(s.id)}"${s.id === cur ? ' aria-current="page"' : ""}>${h(two(s.t))}</a>`).join("")}</nav>`;

  /* ---------- welcome (My Course and #/course) ---------- */
  const HOW = [
    [["Every class, open <b>Today’s Lesson</b>. Class starts with the Daily Learning Journal: 10 minutes by hand, then stand and share with someone new.", "En cada clase, abre la <b>Lección de hoy</b>. La clase empieza con el diario de aprendizaje: 10 minutos a mano y luego ponte de pie y comparte con alguien nuevo."]],
    [["<b>My Learning Checklist</b> on Today’s Lesson shows today’s and this week’s tasks, and what will be graded.", "<b>Mi lista de aprendizaje</b> en la Lección de hoy muestra las tareas de hoy y de la semana, y lo que se calificará."]],
    [["Practice in <b>Learning Labs</b>. Find readings, videos and rubrics in <b>Resources</b>.", "Practica en los <b>Laboratorios</b>. Encuentra lecturas, videos y rúbricas en <b>Recursos</b>."]],
    [["Turn in graded work in <b>Canvas</b>, the official gradebook.", "Entrega el trabajo calificado en <b>Canvas</b>, el registro oficial de calificaciones."]],
    [["Your progress is saved only in this browser. Back it up in <b>Preferences</b>; see your badges in <b>My Achievements</b>.", "Tu progreso se guarda solo en este navegador. Haz una copia en <b>Preferencias</b>; mira tus insignias en <b>Mis logros</b>."]],
  ];
  /** The collapsible welcome. Open until the student collapses it (remembered in this browser only). */
  function welcome(opts) {
    opts = opts || {};
    const open = opts.always || get(WKEY) !== "closed";
    return `<section class="sl2-card cw" aria-labelledby="cwH" data-notr>
      <details class="cw-fold" data-cw${open ? " open" : ""}${opts.always ? " data-cw-keep" : ""}>
        <summary><span class="cw-sum"><span class="app-eyebrow">${L("Welcome", "Bienvenida")}</span><span class="cw-title" id="cwH">${L("Welcome to Speech & Communication", "Bienvenidos a Oratoria y Comunicación")}</span>
          <span class="cw-sub">${L("Mr. Bennett’s welcome video, what this course is about, and how to use Speaking Lab.", "El video de bienvenida del Sr. Bennett, de qué se trata el curso y cómo usar Speaking Lab.")}</span></span>
          <span class="cw-tog" aria-hidden="true"></span></summary>
        <div class="cw-grid">
          <div class="cw-video" id="cw-slot-video"></div>
          <div class="cw-text">
            <h3>${L("Why this course", "Por qué este curso")}</h3><div id="cw-slot-why"></div>
            <h3>${L("Meet Mr. Bennett", "Conoce al Sr. Bennett")}</h3><div id="cw-slot-bio"></div>
            <details class="cw-philo"><summary>${L("Mr. Bennett’s educational philosophy", "La filosofía educativa del Sr. Bennett")}</summary><div id="cw-slot-philo"></div></details>
            <h3>${L("How to use Speaking Lab", "Cómo usar Speaking Lab")}</h3>
            <ol class="cw-how">${HOW.map(x => `<li>${two(x[0])}</li>`).join("")}</ol>
            <p class="sl2-btns"><a class="btn primary" href="#/today">${L("Continue to Today’s Lesson", "Continuar a la Lección de hoy")} →</a> <a class="btn" href="#/course/overview">${L("Course essentials", "Lo esencial del curso")}</a></p>
          </div>
        </div>
      </details>
      ${essentialsNav()}</section>`;
  }
  function mountWelcome() {
    const v = $id("cw-slot-video"); if (!v) return;
    X.host("welcomeFig", v);
    X.host("courseLede", $id("cw-slot-why")); X.host("courseWhy", $id("cw-slot-why"));
    X.host("aboutBio", $id("cw-slot-bio")); X.host("aboutPhilo", $id("cw-slot-philo"));
    const vid = $id("welcomeVid"); if (vid) { vid.removeAttribute("autoplay"); vid.autoplay = false; vid.preload = "none"; }
    translate();
  }
  const pauseWelcome = () => { const v = $id("welcomeVid"); if (v && !v.paused) try { v.pause(); } catch (e) {} };
  document.addEventListener("toggle", e => {
    const d = e.target; if (!d.matches || !d.matches("details[data-cw]")) return;
    if (!d.open) pauseWelcome();
    if (!d.hasAttribute("data-cw-keep")) put(WKEY, d.open ? "open" : "closed");
  }, true);
  window.addEventListener("hashchange", pauseWelcome);

  /* ---------- section views ---------- */
  const card = (title, body, id) => `<section class="sl2-card cs-sec"${id ? ` id="${id}"` : ""}><h2 class="sl2-h3">${title}</h2>${body}</section>`;
  const assignOf = u => (u.assign ? u.assign[lvl()] || u.assign.hs : null);
  function viewOverview() {
    const units = D.units.units.map(u => { const a = assignOf(u); return `<li><b>${L("Unit", "Unidad")} ${u.id}: ${h(trText(u.title))}</b> <span class="sl2-small">(${L("weeks", "semanas")} ${u.weeks.join("–")})</span><br><span>${h(trText(u.blurb))}</span>${a ? `<br><span class="sl2-small">${L("Speech", "Discurso")}: <b>${h(trText(a.name))}</b> · ${a.meta.map(x => h(trText(x))).join(" · ")}</span>` : ""}</li>`; }).join("");
    return `${card(L("What this course is", "Qué es este curso"), `<div id="cs-slot-why"></div>`)}
      ${card(L("Six units, one voice", "Seis unidades, una voz"), `<ol class="cs-units">${units}</ol><p class="sl2-small"><a href="#/">${L("Open My Course", "Abrir Mi curso")} →</a> · <a href="#/resources/assignments">${L("Speech assignment guides", "Guías de los discursos")} →</a></p>`)}
      <div id="cs-slot-host"></div>`;
  }
  function viewGrading() {
    const units = D.units.units.map(u => { const a = assignOf(u); if (!a) return ""; const pts = a.meta.find(x => /points$/i.test(x));
      return `<tr><th scope="row">${L("Unit", "Unidad")} ${u.id}</th><td>${h(trText(a.name))}</td><td>${pts ? h(trText(pts)) : "—"}</td><td><a href="#/unit/${u.id}/guide">${L("Requirements and rubric", "Requisitos y rúbrica")}</a></td></tr>`; }).join("");
    const approved = ((D.checklist && D.checklist.assessments) || []).filter(a => a.status === "approved");
    return card(L("Canvas is the official gradebook", "Canvas es el registro oficial de calificaciones"), `<p>${L("Mr. Bennett posts assignments, collects submissions and enters grades in Canvas. Speaking Lab helps you learn, practice and prepare, and shows what is planned. It never submits work, enters grades or confirms anything in Canvas.", "El Sr. Bennett publica tareas, recibe entregas y pone calificaciones en Canvas. Speaking Lab te ayuda a aprender, practicar y prepararte, y muestra lo planeado. Nunca entrega trabajos, pone calificaciones ni confirma nada en Canvas.")}</p>
        <p><a class="btn" href="https://myapps.classlink.com/home" target="_blank" rel="noopener">${L("Canvas through ClassLink", "Canvas por ClassLink")}<span class="sr"> ${ext}</span> ↗</a></p>`)
      + card(L("Graded work already set in the course", "Trabajo calificado ya establecido en el curso"), `<div class="sl2-tablewrap"><table class="sl2-table"><caption class="sr">${L("Graded assignment by unit", "Tarea calificada por unidad")}</caption><thead><tr><th scope="col">${L("Unit", "Unidad")}</th><th scope="col">${L("Assignment", "Tarea")}</th><th scope="col">${L("Points", "Puntos")}</th><th scope="col"><span class="sr">${L("Link", "Enlace")}</span></th></tr></thead><tbody>${units}</tbody></table></div>
        <p><b>${L("Daily Learning Journals:", "Diarios de aprendizaje:")}</b> ${L("one per class, handwritten; every 10 journals make one 100-point set. Mr. Bennett announces when a set is collected.", "uno por clase, a mano; cada 10 diarios forman un grupo de 100 puntos. El Sr. Bennett avisa cuándo se recoge un grupo.")}</p>
        ${approved.length ? `<p><b>${L("Other graded assignments Mr. Bennett has designated:", "Otras tareas calificadas que designó el Sr. Bennett:")}</b></p><ul>${approved.map(a => `<li>${h(pick(a.title))}${a.points != null ? ` · ${a.points} ${L("points", "puntos")}` : ""}</li>`).join("")}</ul>` : ""}
        <p class="sl2-small">${L("Grading weights and other grading policies are not listed in Speaking Lab. Check Canvas and ask Mr. Bennett.", "Los porcentajes y otras políticas de calificación no aparecen en Speaking Lab. Revisa Canvas y pregúntale al Sr. Bennett.")}</p>`)
      + card(L("Your daily and weekly checklists", "Tus listas diarias y semanales"), `<ul class="cs-list">
        <li>${L("<b>My Learning Checklist</b> (on Today’s Lesson) lists what to do today and this week: readings, journals, labs and practice.", "<b>Mi lista de aprendizaje</b> (en la Lección de hoy) muestra qué hacer hoy y esta semana: lecturas, diarios, laboratorios y práctica.")}</li>
        <li>${L("The <b>Weekly Grading Checkpoint</b> shows only the work Mr. Bennett has designated as graded for the week, with dates, points (where set) and how to turn it in.", "El <b>Punto de control de calificaciones</b> muestra solo el trabajo que el Sr. Bennett designó como calificado para la semana, con fechas, puntos (si están definidos) y cómo entregarlo.")}</li>
        <li>${L("Checkmarks are your own record of what you did. “I submitted it in Canvas” is your own report: always check Canvas to confirm.", "Las marcas son tu propio registro de lo que hiciste. “Lo entregué en Canvas” es tu propio aviso: revisa siempre Canvas para confirmar.")}</li>
        <li>${L("Not grades: badges, learning points, certificates, lab scores and checkmarks in Speaking Lab.", "No son calificaciones: las insignias, los puntos de aprendizaje, los certificados, las puntuaciones de los laboratorios y las marcas en Speaking Lab.")}</li></ul>
        <p class="sl2-btns"><a class="btn primary" href="#/today" data-ck-goto="today">${L("My Learning Checklist: Today", "Mi lista: Hoy")}</a> <a class="btn" href="#/today" data-ck-goto="week">${L("This Week and graded work", "Esta semana y lo calificado")}</a> <a class="btn" href="#/resources/rubrics">${L("Rubrics", "Rúbricas")}</a></p>`);
  }
  function viewExpectations() {
    const exp = window.SL_EXPECT || [], norms = window.SL_NORMS;
    return card(L("The daily routine", "La rutina diaria"), `<ul class="cs-list"><li>${L("Every class opens with the Daily Learning Journal: 10 minutes handwritten, then stand and share with someone new.", "Cada clase empieza con el diario de aprendizaje: 10 minutos a mano y luego ponte de pie y comparte con alguien nuevo.")}</li>
        <li>${L("Use AI only as the current assignment’s permission allows (see Responsible AI Use).", "Usa la IA solo como lo permite la tarea actual (ver Uso responsable de la IA).")}</li></ul>`)
      + card(L("During speeches: the six audience expectations", "Durante los discursos: las seis expectativas del público"), `${exp.length ? `<ol class="cs-exp">${exp.map(x => `<li><b>${h(two(x.n))}</b>${x.note ? `<br><span class="sl2-small">${h(two(x.note))}</span>` : ""}</li>`).join("")}</ol>` : ""}
        <p>${L("Speech day: computers closed, earbuds out, stay seated, and give every speaker your full attention.", "Día de discursos: computadoras cerradas, sin audífonos, quédate sentado y dale a cada orador toda tu atención.")}</p>
        ${norms ? `<p class="sl2-small">${h(two(norms.acc))}</p>` : ""}
        <p class="sl2-btns"><a class="btn" href="#/labs/audlab">${L("The Respectful Audience Lab", "El laboratorio del público respetuoso")}</a> <a class="btn" href="#/labs/listenlab">${L("The Art of Listening", "El arte de escuchar")}</a></p>`)
      + `<p class="sl2-small">${L("These come from the class labs. Mr. Bennett explains any other classroom rules in class.", "Estas expectativas vienen de los laboratorios de la clase. El Sr. Bennett explica en clase cualquier otra regla.")}</p>`;
  }
  function viewSchedule() {
    const B = D.calendar.block, g = X.group(), rt = (D.calendar.releaseTime || "07:00").replace(/^0/, "");
    const fmt = d => new Date(d + "T12:00:00Z").toLocaleDateString(es() ? "es-US" : "en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
    const sem = k => (D.calendar.semesterStart && D.calendar.semesterStart[k] ? `${fmt(D.calendar.semesterStart[k])}${D.calendar.semesterEnd && D.calendar.semesterEnd[k] ? ` – ${fmt(D.calendar.semesterEnd[k].last)}` : ""}` : "");
    return card(L("How the schedule works", "Cómo funciona el calendario"), `<ul class="cs-list">
        <li>${L(`90-minute blocks. Periods ${B.groups.odd.p} meet ${B.groups.odd.d[0]}; periods ${B.groups.even.p} meet ${B.groups.even.d[0]}. Wednesdays switch every week.`, `Bloques de 90 minutos. Los periodos ${B.groups.odd.p} van ${B.groups.odd.d[1]}; los periodos ${B.groups.even.p} van ${B.groups.even.d[1]}. Los miércoles se turnan cada semana.`)}</li>
        <li>${L(`Each lesson opens at ${rt} a.m. Central Time on its class day. Units open on their first class day; opened units stay open for review.`, `Cada lección se abre a las ${rt} a. m. (hora del centro) el día de la clase. Las unidades se abren en su primer día de clase y siguen abiertas para repasar.`)}</li>
        <li>${L("Holidays, district no-school days and any class changes Mr. Bennett makes are already in your dates.", "Los días festivos, los días sin clases del distrito y los cambios que haga el Sr. Bennett ya están en tus fechas.")}</li>
        ${sem("fall") ? `<li>${L("1st semester", "1.er semestre")}: ${h(sem("fall"))} · ${L("2nd semester", "2.º semestre")}: ${h(sem("spring"))}</li>` : ""}</ul>
        <p>${g ? L(`Your class: periods ${B.groups[g].p}.`, `Tu clase: periodos ${B.groups[g].p}.`) : L("Choose your class periods on My Course to see your own dates.", "Elige tus periodos en Mi curso para ver tus fechas.")}</p>
        <p class="sl2-btns"><a class="btn primary" href="#/today" data-ck-goto="week">${L("This week’s checklist", "La lista de esta semana")}</a> <a class="btn" href="#/resources/pacing">${L("Pacing guide (all 16 weeks)", "Guía de ritmo (16 semanas)")}</a></p>`)
      + `<div id="cs-slot-host"></div>`;
  }
  function viewAI() {
    const P = D.aiperm || { levels: [] }, def = P.levels.find(l => l.id === P.default);
    return card(L("AI is a coach, never an author", "La IA es una guía, nunca la autora"), `<p>${L("Each assignment has one AI permission, shown on Today’s Lesson. When an assignment doesn’t set one, the class default applies:", "Cada tarea tiene un permiso de IA, que aparece en la Lección de hoy. Si una tarea no tiene uno, se aplica el de la clase:")} <b>${h(def ? pick(def.name) : "")}</b>.</p>
        <ul class="cs-list">${P.levels.map(l => `<li><b>${h(pick(l.name))}</b> · ${h(pick(l.explain))}</li>`).join("")}</ul>
        <p class="sl2-btns"><a class="btn primary" href="#/ai">${L("AI Coaching Studio", "Estudio de coaching con IA")}</a> <a class="btn" href="#/resources/policy">${L("Academic integrity and AI policy", "Integridad académica y política de IA")}</a></p>`);
  }
  function viewProgress() {
    return card(L("Badges and learning points", "Insignias y puntos de aprendizaje"), `<ul class="cs-list">
        <li>${L("Badges come only from activities you complete in Speaking Lab. Opening a page never counts.", "Las insignias vienen solo de actividades que completas en Speaking Lab. Abrir una página nunca cuenta.")}</li>
        <li>${L("Teacher-verified speaking badges stay pending until Mr. Bennett has a real way to verify them.", "Las insignias orales verificadas por el maestro quedan pendientes hasta que el Sr. Bennett tenga una forma real de verificarlas.")}</li>
        <li>${L("Badges, learning points and certificates are learning records, not grades, credits or credentials. Canvas is the official record.", "Las insignias, los puntos y los certificados son registros de aprendizaje, no calificaciones, créditos ni credenciales. Canvas es el registro oficial.")}</li></ul>
        <p class="sl2-btns"><a class="btn primary" href="#/achievements">${L("My Achievements", "Mis logros")}</a> <a class="btn" href="#/portfolio">${L("My Communication Achievement Portfolio", "Mi portafolio de logros de comunicación")}</a></p>`)
      + card(L("Keep your progress safe", "Cuida tu progreso"), `<ul class="cs-list">
        <li>${L("Your progress (including checklist checkmarks) is saved only in this browser on this computer. Nothing is sent anywhere.", "Tu progreso (incluidas las marcas de la lista) se guarda solo en este navegador y en esta computadora. No se envía a ningún lugar.")}</li>
        <li>${L("Download a backup file and keep it in your Google Drive; restore it on another computer.", "Descarga una copia y guárdala en tu Google Drive; restáurala en otra computadora.")}</li>
        <li>${L("Certificates and portfolios are records you can keep or share; they can’t restore progress.", "Los certificados y portafolios son registros que puedes guardar o compartir; no restauran el progreso.")}</li></ul>
        <p class="sl2-btns"><button type="button" class="btn" data-mywork="1">${L("Back up my progress", "Copiar mi progreso")}</button> <a class="btn" href="#/preferences">${L("Preferences", "Preferencias")}</a></p>`);
  }
  const VIEWS = { overview: viewOverview, grading: viewGrading, expectations: viewExpectations, schedule: viewSchedule, ai: viewAI, progress: viewProgress };
  const HOSTS = { overview: { why: ["courseLede", "courseWhy"], host: ["map", "about"] }, schedule: { host: ["dates"] } };

  function viewCourse(r) {
    const id = r.args && r.args[0];
    if (!id) return `<div class="wrap sl2 app-view cs" id="sl2-main" data-notr>
      <nav class="sl2-back app-crumbs" aria-label="${L("Breadcrumb", "Ruta")}"><a href="#/">← ${L("My Course", "Mi curso")}</a></nav>
      <p class="app-eyebrow">${L("Speech & Communication", "Oratoria y Comunicación")}</p><h1 class="sl2-h1">${L("Welcome and course essentials", "Bienvenida y lo esencial del curso")}</h1>
      ${welcome({ always: true })}
      <ul class="app-grid cs-grid">${SECTIONS.map(s => `<li class="app-card"><div class="app-icon" aria-hidden="true">${s.icon}</div><h2><a class="app-cardlink" href="${secHref(s.id)}">${h(two(s.t))}</a></h2><p>${h(two(s.d))}</p><div class="app-cardfoot"><span aria-hidden="true">${L("Open", "Abrir")} →</span></div></li>`).join("")}</ul></div>`;
    const s = SECTIONS.find(x => x.id === id);
    if (!s) return `<div class="wrap sl2 app-view" id="sl2-main" data-notr><h1 class="sl2-h1">${L("Page not found", "Página no encontrada")}</h1><p><a class="btn" href="#/course">← ${L("Course essentials", "Lo esencial del curso")}</a></p></div>`;
    return `<div class="wrap sl2 app-view cs" id="sl2-main"><div data-notr>
      <nav class="sl2-back app-crumbs" aria-label="${L("Breadcrumb", "Ruta")}"><a href="#/">← ${L("My Course", "Mi curso")}</a> <span aria-hidden="true">·</span> <a href="#/course">${L("Welcome and course essentials", "Bienvenida y lo esencial del curso")}</a></nav>
      <p class="app-eyebrow">${L("Course essentials", "Lo esencial del curso")}</p><h1 class="sl2-h1">${h(two(s.t))}</h1>
      ${essentialsNav(s.id)}
      ${VIEWS[s.id]()}</div>
      <p class="sl2-back sl2-noprint" data-notr><a href="#/course">← ${L("All course essentials", "Todo lo esencial del curso")}</a> · <a href="#/today">${L("Today’s Lesson", "Lección de hoy")}</a></p></div>`;
  }
  function afterCourse(r) {
    const id = r.args && r.args[0];
    if (!id) { mountWelcome(); return; }
    const H = HOSTS[id]; if (!H) return;
    if (H.why) H.why.forEach(x => X.host(x, $id("cs-slot-why")));
    if (H.host) H.host.forEach(x => X.host(x, $id("cs-slot-host")));
    translate();
  }

  /* ---------- The History & Voices of Wyandotte ---------- */
  const photoSrc = () => { const im = document.querySelector("#wyPhoto img"); return im ? im.getAttribute("src") : ""; };
  /** The feature card at the bottom of My Course, beneath the units. */
  function feature() {
    const src = photoSrc();
    return `<section class="wy-feature" aria-labelledby="wyFH" data-notr>
      ${src ? `<img class="wy-fimg" src="${h(src)}" alt="" width="800" height="400">` : ""}
      <div class="wy-ftext"><p class="app-eyebrow">${L("Wyandotte High School · Kansas City, Kansas", "Wyandotte High School · Kansas City, Kansas")}</p>
        <h2 class="wy-ftitle" id="wyFH">${L("The History & Voices of Wyandotte", "La historia y las voces de Wyandotte")}</h2>
        <p class="wy-fsub">${L("Our School. Our Stories. Our Voices.", "Nuestra escuela. Nuestras historias. Nuestras voces.")}</p>
        <p>${L("Explore our school and the Wyandotte graduates who used their voices.", "Explora nuestra escuela y a los egresados de Wyandotte que usaron su voz.")}</p>
        <p><a class="btn primary" href="#/wyandotte">${L("Explore our story", "Explora nuestra historia")} →</a></p></div></section>`;
  }
  function viewWyandotte() {
    return `<div class="wrap sl2 app-view wy" id="sl2-main"><div data-notr>
      <nav class="sl2-back app-crumbs" aria-label="${L("Breadcrumb", "Ruta")}"><a href="#/">← ${L("My Course", "Mi curso")}</a> <span aria-hidden="true">·</span> <a href="#/resources">${L("Resources", "Recursos")}</a></nav>
      <header class="wy-hero"><p class="app-eyebrow">${L("Wyandotte High School · Kansas City, Kansas", "Wyandotte High School · Kansas City, Kansas")}</p>
        <h1 class="sl2-h1">${L("The History & Voices of Wyandotte", "La historia y las voces de Wyandotte")}</h1>
        <p class="wy-sub">${L("Our School. Our Stories. Our Voices.", "Nuestra escuela. Nuestras historias. Nuestras voces.")}</p>
        <p class="sl2-lead">${L("Understanding where we come from helps us discover what we have to say.", "Entender de dónde venimos nos ayuda a descubrir lo que tenemos que decir.")}</p></header>
      ${X.teacherOn() ? `<p class="sl2-teachnote" role="note">${L("Teacher view: this page shows only the school's existing materials (the school photograph, Voices from Wyandotte with its sources, and its linked clip). Nothing was added. To add history, photographs or student voices, provide approved materials and their sources.", "Vista del maestro: esta página muestra solo los materiales existentes (la foto de la escuela, Voces de Wyandotte con sus fuentes y su clip). No se agregó nada. Para agregar historia, fotos o voces de estudiantes, proporciona materiales aprobados y sus fuentes.")}</p>` : ""}
      <div class="wy-grid">
        <section class="sl2-card wy-sec" aria-labelledby="wyHistH"><h2 class="sl2-h2" id="wyHistH">${L("Our school", "Nuestra escuela")}</h2>
          <div id="wy-slot-photo"></div>
          <p class="sl2-small">${L("Learn more about the school’s history:", "Aprende más sobre la historia de la escuela:")} <a href="https://en.wikipedia.org/wiki/Wyandotte_High_School" target="_blank" rel="noopener">${L("Wikipedia: Wyandotte High School", "Wikipedia: Wyandotte High School")}<span class="sr"> ${ext}</span> ↗</a></p></section>
        <section class="sl2-card wy-sec" aria-label="${L("Voices of Wyandotte", "Voces de Wyandotte")}"><div id="wy-slot-voices"></div></section>
      </div></div>
      <p class="sl2-back sl2-noprint" data-notr><a href="#/">← ${L("Back to My Course", "Volver a Mi curso")}</a> · <a href="#/today">${L("Today’s Lesson", "Lección de hoy")}</a></p></div>`;
  }
  function afterWyandotte() {
    X.host("wyPhoto", $id("wy-slot-photo"));
    X.host("wyMic", $id("wy-slot-voices")); X.host("wyVoices", $id("wy-slot-voices"));
    if (typeof renderWyVoices === "function") try { renderWyVoices(); } catch (e) {}
    translate();
  }

  X.addRoute("course", { view: viewCourse, after: afterCourse });
  X.addRoute("wyandotte", { view: viewWyandotte, after: afterWyandotte });
  /** Called by student.js after drawing My Course. */
  function afterHome() { mountWelcome(); }
  window.SLCourse = { welcome, feature, afterHome, SECTIONS, WKEY };
  try { const r = X.route(); if (r && r.name === "home") X.refresh(); } catch (e) {}
})();
