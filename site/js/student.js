/* Speak Up | The Speaking Lab — student experience (Speaking Lab 2.0).
   Routes (hash):  #/  dashboard (or the entrance on a first visit) · #/start  entrance
                   #/unit/N  the unit, opening on today's Daily Learning Dashboard
                   #/unit/N/lessons  archive · #/unit/N/day/YYYY-MM-DD  one past lesson
                   #/unit/N/guide  the unit's readings, assignment, rubric, checks · #/unit/N/labs  labs and studios
   Any other hash (#units, #unit-3, #lab-research, #final, …) shows the classic one-page course guide exactly as
   before, so every old link still works. Inside a unit, the existing unit guide (#units) and labs (#labs) are
   moved into the unit and back, so their tools, progress and Spanish keep working unchanged.
   Availability (locked units, future lessons) follows the district calendar in Central Time. It is a classroom
   guide, not security: anyone can read the public files or change their own browser. Runs after the page's
   scripts (see js/boot.js) and uses their globals: lang, level, classGroup, startDate, unitId, UNITS, … */
(function () {
  "use strict";
  const D = window.SL_DATA, S = window.SLSchedule, P = window.SLProgress;
  const K = { path: "speakup-path", support: "speakup-support", level: "speakup-support-level", group: "speakup-group", teacher: "speakup-teacher-ok", journalOk: "speakup-journal-ok", journal: "speakup-journal-v1" };
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const put = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };
  const es = () => lang === "es";
  const L = (en, sp) => (es() ? sp : en);
  const pick = o => (o ? (es() ? o.es || o.en : o.en) : "");
  const other = o => (o ? (es() ? o.en : o.es || "") : "");
  const h = s => esc(String(s == null ? "" : s));
  const pad = n => String(n).padStart(2, "0");
  const $id = id => document.getElementById(id);

  /* ---------- access (deterrents only) ---------- */
  function hash(kind, code) { let x = 0x811c9dc5; for (const b of new TextEncoder().encode(`speakup-${kind}:` + String(code).trim())) { x ^= b; x = Math.imul(x, 0x01000193) >>> 0; } return x.toString(16).padStart(8, "0"); }
  const teacherOn = () => get(K.teacher) === D.access.teacher.codeHash;
  window.SLAccess = { hash, teacherOn };
  /* Module availability (classroom pacing control, not security). A unit is open once its release time
     (Central Time) has passed; released units stay open for review. Teacher view opens future units too. */
  const releasedAt = id => S.unitReleaseAt(id, opts(group() || "odd"));
  const devPreview = () => !!(window.SLBuild && window.SLBuild.preview); // development preview build only (js/build.js)
  const released = id => devPreview() || S.isOpen(releasedAt(id), now());
  const unitOpen = id => released(id) || teacherOn();

  /* ---------- pathway and supports ---------- */
  const path = () => { const p = get(K.path); return p === "hs" || p === "eld" || (p === "col" && colUnlocked()) ? p : null; };
  /* Language support preference (slice 9): guided | supported | independent. A learning preference the student can
     change anytime, never a proficiency level; progress is unaffected. Translations (speakup-support = "1") are always
     on for Guided and optional for the others. Earlier choices carry over: the "learning English" pathway starts on
     Guided; everyone else on Supported. Learning goals are the same at every level. */
  const SUPPORT_LEVELS = ["guided", "supported", "independent"];
  const supportLevel = () => { const v = get(K.level); return SUPPORT_LEVELS.includes(v) ? v : path() === "eld" ? "guided" : "supported"; };
  const supportsOn = () => supportLevel() === "guided" || get(K.support) === "1";
  const group = () => (classGroup === "odd" || classGroup === "even" ? classGroup : null);

  /* ---------- schedule helpers ---------- */
  const today = () => S.chicagoToday();
  const now = () => S.chicagoNow();
  const cal = () => D.calendar;
  const opts = g => ({ start: startDate, group: g, cal: cal(), units: D.units.units, journals: D.journals.journals, overrides: D.overrides });
  const weeks = () => S.courseWeeks(startDate, cal(), D.overrides);
  const unitById = id => D.units.units.find(u => u.id === id);
  const fmtLong = iso => parseD(iso).toLocaleDateString(es() ? "es-US" : "en-US", { weekday: "long", month: "long", day: "numeric" });
  const fmtShort = iso => parseD(iso).toLocaleDateString(es() ? "es-US" : "en-US", { weekday: "short", month: "short", day: "numeric" });
  const fmtAt = at => at ? `${fmtShort(at.slice(0, 10))}, ${fmtTime(at.slice(11))}` : "";
  function fmtTime(hm) { const [H, M] = hm.split(":").map(Number); return es() ? `${H}:${pad(M)}` : `${((H + 11) % 12) + 1}:${pad(M)} ${H < 12 ? "a.m." : "p.m."}`; }
  const lessonKey = (w, k) => `w${pad(w)}d${k + 1}`;

  function unitInfo(u) {
    const at = releasedAt(u.id), open = unitOpen(u.id), preview = open && !released(u.id);
    const pr = P.unit(u.id);
    const state = !open ? "locked" : pr.completed ? "completed" : pr.started ? "inprogress" : "available";
    return { u, at, open, preview, pr, state };
  }
  /** The unit students should be in now: today's course week, or the next class's week; null once the course ends. */
  function currentUnitId() {
    const v = weeks(), t = today();
    let w = S.courseWeekOf(t, v);
    if (w == null) { const next = [].concat(v.pre || [], ...v.weeks).find(d => d > t); if (!next) return null; w = S.courseWeekOf(next, v); }
    const u = S.unitOfWeek(D.units.units, w === 0 ? 1 : w); return u ? u.id : null;
  }

  /* ---------- icons (decorative; every state also has words) ---------- */
  const ICON = {
    lock: '<svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16"><path fill="currentColor" d="M4 7V5a4 4 0 118 0v2h1v8H3V7zm2 0h4V5a2 2 0 10-4 0z"/></svg>',
    check: '<svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16"><path fill="currentColor" d="M6.2 11.6L2.6 8l1.4-1.4 2.2 2.2L12 3l1.4 1.4z"/></svg>',
    half: '<svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path fill="currentColor" d="M8 1.8a6.2 6.2 0 010 12.4z"/></svg>',
    open: '<svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    star: '<svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16"><path fill="currentColor" d="M8 1l2.1 4.3 4.7.7-3.4 3.3.8 4.7L8 11.8 3.8 14l.8-4.7L1.2 6l4.7-.7z"/></svg>',
    pen: '<svg aria-hidden="true" viewBox="0 0 16 16" width="18" height="18"><path fill="currentColor" d="M11.5 1.5l3 3L5 14H2v-3zM10 4l2 2"/></svg>',
    people: '<svg aria-hidden="true" viewBox="0 0 16 16" width="18" height="18"><circle cx="5" cy="5" r="2.5" fill="currentColor"/><circle cx="11" cy="5" r="2.5" fill="currentColor"/><path fill="currentColor" d="M0 14c0-3 2.2-5 5-5s5 2 5 5zm8.5 0c0-1.6-.5-3-1.4-4 .9-.6 2.2-1 3.9-1 2.8 0 5 2 5 5z"/></svg>',
  };
  const STATE = {
    locked: { icon: "lock", en: "Locked", es: "Bloqueada" },
    available: { icon: "open", en: "Available", es: "Disponible" },
    inprogress: { icon: "half", en: "In progress", es: "En progreso" },
    completed: { icon: "check", en: "Completed", es: "Completada" },
  };

  /* ---------- shell ---------- */
  const root = document.createElement("div");
  root.id = "sl2"; root.hidden = true;
  const mainEl = document.querySelector("main");
  mainEl.parentNode.insertBefore(root, mainEl);
  const homes = {};
  ["units", "labs"].forEach(id => { const el = $id(id); if (el) { const mark = document.createComment(`sl2:${id}`); el.parentNode.insertBefore(mark, el); homes[id] = { el, mark }; } });
  const putHome = () => Object.values(homes).forEach(({ el, mark }) => { if (el.parentNode !== mark.parentNode || el.previousSibling !== mark) mark.parentNode.insertBefore(el, mark.nextSibling); });
  const skip = document.querySelector("a.skip");

  let route = null, lastV2 = "#/", pendingLab = null;
  const EXTRA = {}; // routes added by other scripts (js/teacher.js): name → { view(route) → html, after(route) }
  const isV2Hash = hs => hs === "" || hs === "#" || hs.startsWith("#/");
  function parse(hs) {
    const p = hs.replace(/^#\/?/, "").split("/").filter(Boolean);
    if (!p.length) return { name: path() ? "home" : "start" };
    if (p[0] === "start") return { name: "start" };
    if (p[0] === "achievements") return { name: "achievements" };
    if (EXTRA[p[0]]) return { name: p[0], args: p.slice(1) };
    if (p[0] === "unit" && /^[1-6]$/.test(p[1] || "")) {
      const id = Number(p[1]);
      if (p[2] === "lessons") return { name: "unit", id, tab: "lessons" };
      if (p[2] === "guide") return { name: "unit", id, tab: "guide" };
      if (p[2] === "labs") return { name: "unit", id, tab: "labs" };
      if (p[2] === "day" && /^\d{4}-\d{2}-\d{2}$/.test(p[3] || "")) return { name: "unit", id, tab: "today", day: p[3] };
      return { name: "unit", id, tab: "today" };
    }
    return { name: "home" };
  }
  const LAB_HASH = { "lab-research": 1, "outline-builder": 1, "lab-persuasion": 1, "lab-model": 1, "lab-body-language": 1, "lab-nonverbal": 1, "lab-group": 1, "lab-impromptu": 1, "lab-story": 1, "lab-audience": 1, "lab-listening": 1, "listening-refresher": 1, "audience-refresher": 1 };

  function go() {
    const hs = location.hash;
    if (!isV2Hash(hs)) {
      const tgt = hs.length > 1 && document.getElementById(decodeURIComponent(hs.slice(1)));
      // An in-page link or a lab link while inside a unit stays inside the unit.
      if (route && route.name === "unit" && !root.hidden && (tgt && root.contains(tgt) || LAB_HASH[hs.slice(1)])) {
        if (LAB_HASH[hs.slice(1)] && route.tab !== "labs") { route.tab = "labs"; draw(); }
        return;
      }
      classic(); return;
    }
    lastV2 = hs || "#/";
    route = parse(hs);
    draw(true);
  }
  function classic() {
    const wasUnit = route && route.name === "unit";
    route = null; putHome(); root.hidden = true; mainEl.hidden = false;
    if (wasUnit) renderUnit();
    if (skip) skip.setAttribute("href", "#main");
    markNav(false);
    document.body.classList.remove("sl2-on");
  }

  /* ---------- draw ---------- */
  function draw(focus) {
    if (!route) return;
    if (route.name === "home" && !path()) route = { name: "start" };
    putHome();
    mainEl.hidden = true; root.hidden = false; document.body.classList.add("sl2-on");
    if (skip) skip.setAttribute("href", "#sl2-main");
    markNav(true);
    root.innerHTML = EXTRA[route.name] ? EXTRA[route.name].view(route) : route.name === "start" ? viewStart() : route.name === "unit" ? viewUnit() : route.name === "achievements" ? viewAchievements() : viewHome();
    if (EXTRA[route.name] && EXTRA[route.name].after) EXTRA[route.name].after(route);
    if (route.name === "unit") mountUnitParts();
    if (focus) { const hd = root.querySelector("h1"); if (hd) { hd.tabIndex = -1; hd.focus({ preventScroll: true }); } window.scrollTo(0, 0); }
  }
  /** In the student view, "My course" is the current header link. */
  function markNav(on) {
    document.querySelectorAll("header nav.links a").forEach(a => { if (a.getAttribute("href") === "#/") { if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); } else if (on) a.removeAttribute("aria-current"); });
    const start = document.querySelector('header nav.links a[href="#top"]');
    if (!on && start && !document.querySelector("header nav.links a[aria-current]")) start.setAttribute("aria-current", "location");
  }
  const navLabel = () => { const a = document.querySelector('header nav.links [href="#/"]'); if (a) a.textContent = L("My course", "Mi curso"); };
  const refresh = () => { navLabel(); if (route && !root.hidden) { const y = window.scrollY; draw(false); window.scrollTo(0, y); } };

  const dot = x => (/\.$/.test(x) ? x : x + ".");
  const teacherNote = at => `<p class="sl2-teachnote" role="note">${L(`Teacher view: students cannot open this unit until ${dot(fmtAt(at))}`, `Vista del maestro: los estudiantes no pueden abrir esta unidad hasta el ${dot(fmtAt(at))}`)}</p>`;
  /** The notice shown instead of an unreleased unit's lessons, in the student view and the classic guide. */
  function lockedNotice(id) {
    const cur = currentUnitId();
    return `<div class="sl2-card sl2-locked" data-notr><p>${ICON.lock} <b>${L(`Unit ${id} is not open yet.`, `La Unidad ${id} todavía no está abierta.`)}</b> ${L(`It opens ${fmtAt(releasedAt(id))} (Central Time). Released units stay open for review.`, `Se abre el ${fmtAt(releasedAt(id))} (hora del centro). Las unidades ya abiertas siguen disponibles para repasar.`)}</p>
      <p>${L("Vocabulary, practice labs, research resources and the rubrics stay available.", "El vocabulario, los laboratorios de práctica, los recursos de investigación y las rúbricas siguen disponibles.")}</p>
      ${cur && unitOpen(cur) ? `<p><a class="btn" href="#/unit/${cur}">${L(`Go to the current unit (Unit ${cur})`, `Ir a la unidad actual (Unidad ${cur})`)}</a></p>` : `<p><a class="btn" href="#/">${L("My course", "Mi curso")}</a></p>`}</div>`;
  }

  /* ---------- entrance: three pathways ---------- */
  function viewStart() {
    const colOk = COL_ENABLED;
    const tile = (p, title, sub, body, extra) => `<button type="button" class="sl2-path${p === "col" ? " is-locked" : ""}" data-sl2-path="${p}"${p === "col" && !colOk ? ' aria-describedby="sl2-colnote"' : ""}>
        <span class="sl2-path-t">${title}</span><span class="sl2-path-s">${sub}</span><span class="sl2-path-b">${body}</span>${extra || ""}</button>`;
    return `<div class="wrap sl2" data-notr id="sl2-main">
      <h1 class="sl2-h1">${L("Welcome to the Speaking Lab", "Te damos la bienvenida al Speaking Lab")}</h1>
      <p class="sl2-lead">${L("Choose how you will use the Speaking Lab. You can change this anytime.", "Elige cómo vas a usar el Speaking Lab. Puedes cambiarlo cuando quieras.")}</p>
      <div class="sl2-paths">
        ${tile("col", L("I am a college student", "Soy estudiante universitario"), L("College Public Speaking", "College Public Speaking"),
          L("Instructor authorization required.", "Se requiere autorización del maestro."),
          `<span class="sl2-lockline">${ICON.lock} <span id="sl2-colnote">${colOk ? L("Teacher code required", "Se necesita el código del maestro") : L("Not offered at this time", "No se ofrece en este momento")}</span></span>`)}
        ${tile("hs", L("I am a speech student", "Soy estudiante de oratoria"), L("High School Speech", "Oratoria de preparatoria"),
          L("Six units, one clear lesson each day, and practice labs for every speech.", "Seis unidades, una lección clara cada día y laboratorios de práctica para cada discurso."))}
        ${tile("eld", L("I am learning English", "Estoy aprendiendo inglés"), L("High School Speech with language supports", "Oratoria de preparatoria con apoyos de idioma"),
          L("The same course and goals, with vocabulary, sentence starters and English–Spanish side by side.", "El mismo curso y las mismas metas, con vocabulario, inicios de oración e inglés y español lado a lado."))}
      </div>
      <p class="sl2-note">${L("Choosing the college pathway does not enroll you in a college course or award college credit.", "Elegir el nivel universitario no te inscribe en un curso universitario ni otorga créditos universitarios.")}</p>
      <p class="sl2-foot"><a href="#top">${L("Watch Mr. Bennett's welcome video and see the full course guide", "Ver el video de bienvenida del Sr. Bennett y la guía completa del curso")}</a></p>
    </div>`;
  }
  function choosePath(p, btn) {
    if (p === "col") { chooseLevel("col", btn); return; } // the existing gate decides; stays closed while college is off
    put(K.path, p); setLevel("hs");
    if (p === "eld") { put(K.support, "1"); if (!get(K.level)) put(K.level, "guided"); }
    location.hash = "#/"; if (route) { route = parse("#/"); draw(true); }
  }

  /* ---------- dashboard: six unit tiles ---------- */
  function viewHome() {
    const cur = currentUnitId(), infos = D.units.units.map(unitInfo), g = group(), t = today();
    const p = path(), pname = p === "eld" ? L("Speech student, learning English", "Estudiante de oratoria que aprende inglés") : p === "col" ? "College Public Speaking" : L("High School Speech", "Oratoria de preparatoria");
    const curInfo = cur && infos.find(i => i.u.id === cur);
    let todayLine = "";
    if (g) {
      const jf = S.journalFor(t, opts(g));
      todayLine = jf.state === "today" ? L(`You have class today, ${fmtLong(t)}.`, `Hoy tienes clase, ${fmtLong(t)}.`)
        : jf.state === "next" ? L(`No class today for your periods. Next class: ${fmtLong(jf.date)}.`, `Hoy no hay clase para tus periodos. Próxima clase: ${fmtLong(jf.date)}.`)
        : L("The course is complete. You can review every unit.", "El curso terminó. Puedes repasar todas las unidades.");
    }
    return `<div class="wrap sl2" data-notr id="sl2-main">
      <div class="sl2-top">
        <div><h1 class="sl2-h1">${L("My course", "Mi curso")}</h1>
          <p class="sl2-meta">${h(pname)} · <a href="#/start">${L("Change pathway", "Cambiar")}</a></p></div>
        ${supportToggle()}
      </div>
      ${groupBar()}
      ${todayLine ? `<p class="sl2-today">${h(todayLine)}</p>` : ""}
      ${curInfo && curInfo.open ? `<p><a class="btn primary sl2-go" href="#/unit/${cur}">${L(`Go to today's lesson · Unit ${cur}`, `Ir a la lección de hoy · Unidad ${cur}`)}</a></p>` : ""}
      ${achLink()}
      <h2 class="sl2-h2">${L("Units", "Unidades")}</h2>
      <ol class="sl2-tiles">${infos.map(i => tile(i, i.u.id === cur)).join("")}</ol>
      <p class="sl2-small">${L("Progress is saved only in this browser on this computer, and it is not your official grade. Use My work to back it up.", "El progreso se guarda solo en este navegador y en esta computadora, y no es tu calificación oficial. Usa Mi trabajo para hacer una copia.")}</p>
      <p class="sl2-foot"><a href="#top">${L("Full course guide (all sections on one page)", "Guía completa del curso (todo en una página)")}</a> · <button type="button" class="linkbtn" data-mywork="1">${L("My work", "Mi trabajo")}</button> · <button type="button" class="linkbtn" data-sl2-teacher="1">${L("Teacher", "Maestro")}</button>${teacherOn() ? ` · <a href="#/teacher">${L("Lesson Manager", "Administrador de lecciones")}</a> · <a href="#/present">${L("Present today's lesson", "Presentar la lección de hoy")}</a>` : ""}</p>
    </div>`;
  }
  function tile(i, isCur) {
    const u = i.u, st = STATE[i.state], title = trText(u.title), blurb = trText(u.blurb).split(/(?<=\.)\s/)[0];
    const pr = i.pr, prog = i.state === "locked" ? L(`Opens ${fmtAt(i.at)}`, `Se abre el ${fmtAt(i.at)}`)
      : pr.quizBest == null && pr.testBest == null ? L("Not started on this computer", "Sin empezar en esta computadora")
      : [pr.quizBest != null ? L(`Reading check ${pr.quizBest}%`, `Comprobación de lectura ${pr.quizBest}%`) : "", pr.testBest != null ? L(`Practice test ${pr.testBest}%`, `Examen de práctica ${pr.testBest}%`) : ""].filter(Boolean).join(" · ");
    const action = !i.open ? "" : `<a class="btn${isCur ? " primary" : ""} sl2-tile-go" href="#/unit/${u.id}" aria-label="${h((isCur ? L("Continue", "Continuar") : i.state === "completed" ? L("Review", "Repasar") : i.state === "inprogress" ? L("Continue", "Continuar") : L("Start", "Empezar")) + " " + L("Unit", "Unidad") + " " + u.id + ": " + title)}">${isCur || i.state === "inprogress" ? L("Continue", "Continuar") : i.state === "completed" ? L("Review", "Repasar") : L("Start", "Empezar")}</a>`;
    return `<li class="sl2-tile is-${i.state}${isCur ? " is-current" : ""}" style="--acc: var(--u${u.id})">
      <p class="sl2-tile-n">${L("Unit", "Unidad")} ${u.id}${isCur ? ` <span class="sl2-cur">${L("Current unit", "Unidad actual")}</span>` : ""}</p>
      <h3 class="sl2-tile-t">${h(title)}</h3>
      <p class="sl2-tile-b">${h(blurb)}</p>
      <p class="sl2-state">${ICON[st.icon]} <span>${es() ? st.es : st.en}</span>${pr.mastered ? ` <span class="sl2-ach">${ICON.star} ${L("Reading check mastered", "Comprobación de lectura dominada")}</span>` : ""}</p>
      <p class="sl2-tile-p">${h(prog)}</p>
      ${action}
    </li>`;
  }
  const SUPPORT_TXT = {
    guided: [["Guided", "Guiado"], ["English and Spanish side by side, vocabulary open, sentence frames and step-by-step help.", "Inglés y español lado a lado, vocabulario abierto, marcos de oración y ayuda paso a paso."]],
    supported: [["Supported", "Con apoyo"], ["Academic vocabulary and sentence starters; Spanish when you turn it on.", "Vocabulario académico e inicios de oración; español cuando lo actives."]],
    independent: [["Independent", "Independiente"], ["Academic English; supports stay folded until you open them.", "Inglés académico; los apoyos quedan cerrados hasta que los abras."]],
  };
  let supFoldOpen = false; // keeps the compact panel open after a change (the page redraws)
  function supportToggle(compact) {
    const lv = supportLevel(), on = supportsOn();
    if (compact) return `<details class="sl2-supfold"${supFoldOpen ? " open" : ""}><summary>${L("Language support", "Apoyo de idioma")}: <b>${es() ? SUPPORT_TXT[lv][0][1] : SUPPORT_TXT[lv][0][0]}</b>${on && lv !== "guided" ? ` · ${L("Spanish on", "Inglés visible")}` : ""}</summary>${supportToggle(false)}</details>`;
    return `<fieldset class="sl2-support"><legend>${L("Language support", "Apoyo de idioma")}</legend>
      <div class="sl2-supopts">${SUPPORT_LEVELS.map(v => `<label title="${h(es() ? SUPPORT_TXT[v][1][1] : SUPPORT_TXT[v][1][0])}"><input type="radio" name="sl2-suplv" value="${v}" data-sl2-suplv${lv === v ? " checked" : ""}> ${es() ? SUPPORT_TXT[v][0][1] : SUPPORT_TXT[v][0][0]}</label>`).join("")}</div>
      <p class="sl2-small">${h(es() ? SUPPORT_TXT[lv][1][1] : SUPPORT_TXT[lv][1][0])}</p>
      <label class="sl2-suptr"><input type="checkbox" data-sl2-support ${on ? "checked" : ""} ${lv === "guided" ? "disabled" : ""}> ${L("Show Spanish (English) side by side", "Mostrar inglés (español) lado a lado")}</label>
      <p class="sl2-small">${L("A learning preference, not a language level. Change it anytime; your progress stays.", "Es una preferencia de aprendizaje, no un nivel de idioma. Cámbiala cuando quieras; tu progreso se conserva.")}</p></fieldset>`;
  }
  function groupBar() {
    const g = group();
    if (g) return `<p class="sl2-meta">${L("Your class:", "Tu clase:")} <b>${h(groupLabel(g, es()))}</b> (${h(es() ? GROUPS[g].d[1] : GROUPS[g].d[0])}${L(" + every other Wednesday", " + un miércoles sí y otro no")}) · <button type="button" class="linkbtn" data-sl2-grp="">${L("Change", "Cambiar")}</button></p>`;
    return `<div class="sl2-grp" role="group" aria-labelledby="sl2-grpq"><p id="sl2-grpq"><b>${L("Which class periods are you in?", "¿En qué periodos estás?")}</b> ${L("This sets your class days and your journal numbers.", "Esto define tus días de clase y los números de tu diario.")}</p>
      <button type="button" class="btn" data-sl2-grp="odd">${h(groupLabel("odd", es()))} · ${h(es() ? GROUPS.odd.d[1] : GROUPS.odd.d[0])}</button>
      <button type="button" class="btn" data-sl2-grp="even">${h(groupLabel("even", es()))} · ${h(es() ? GROUPS.even.d[1] : GROUPS.even.d[0])}</button></div>`;
  }

  /* ---------- unit environment ---------- */
  function viewUnit() {
    const u = unitById(route.id), i = unitInfo(u), title = trText(u.title);
    const tabs = [["today", L("Today", "Hoy"), ""], ["lessons", L("Lessons and journals", "Lecciones y diarios"), "/lessons"], ["guide", L("Unit guide", "Guía de la unidad"), "/guide"], ["labs", L("Labs and studios", "Laboratorios y estudios"), "/labs"]];
    const head = `<p class="sl2-back"><a href="#/">← ${L("All units", "Todas las unidades")}</a></p>
      <p class="sl2-kicker">${L("Unit", "Unidad")} ${u.id} · <span class="sl2-state-in">${ICON[STATE[i.state].icon]} ${es() ? STATE[i.state].es : STATE[i.state].en}</span></p>
      <h1 class="sl2-h1">${h(title)}</h1>${supportToggle(true)}${i.preview ? teacherNote(i.at) : ""}`;
    if (!i.open) return `<div class="wrap sl2 sl2-unit" style="--acc: var(--u${u.id})" id="sl2-main" data-notr>${head}${lockedNotice(u.id)}</div>`;
    return `<div class="wrap sl2 sl2-unit" style="--acc: var(--u${u.id})" id="sl2-main">
      <div data-notr>${head}
      <nav class="sl2-tabs" aria-label="${L("Unit sections", "Secciones de la unidad")}">${tabs.map(([k, t, p]) => `<a href="#/unit/${u.id}${p}"${route.tab === k ? ' aria-current="page"' : ""}>${t}</a>`).join("")}</nav></div>
      <div class="sl2-panel" id="sl2-panel">${route.tab === "today" ? `<div data-notr>${route.day ? viewDay(u, route.day, true) : viewToday(u)}</div>` : route.tab === "lessons" ? `<div data-notr>${viewArchive(u)}</div>` : route.tab === "labs" ? `<div data-notr>${viewStudios(u)}</div><div id="sl2-slot-labs"></div>` : `<div id="sl2-slot-units"></div>`}</div>
    </div>`;
  }
  /** Put the page's existing unit guide or labs into the unit, set to this unit. */
  function mountUnitParts() {
    const id = route.id, slot = $id(route.tab === "guide" ? "sl2-slot-units" : route.tab === "labs" ? "sl2-slot-labs" : "");
    if (!slot) return;
    if (unitId !== id || labAll || labExtra) { finalTab = false; unitId = id; labExtra = null; labAll = false; spAll = false; spExtra = null; rubricId = UNITS[id - 1].rubric; }
    renderTabs(); renderUnit();
    if (typeof renderLabUnit === "function") { renderLabUnit(); renderSpeechGrid(); renderSpeech(); }
    const el = homes[route.tab === "guide" ? "units" : "labs"].el; slot.appendChild(el);
    if (route.tab === "labs") { let cur = get("speakup-lab"); if (!labsVisible().includes(cur)) cur = labsVisible()[0]; if (cur) showLab(cur); }
    applyLang();
    if (route.tab === "labs" && pendingLab) { const id = pendingLab; pendingLab = null; openLab(id); }
  }
  function viewStudios(u) {
    const list = D.studios.experiences.filter(x => x.units.includes(u.id) && (x.audience === "all" || level === "col"));
    if (!list.length) return "";
    return `<h2 class="sl2-h2">${L("Featured experiences and studios", "Experiencias destacadas y estudios")}</h2><ul class="sl2-studios">${list.map(x => studioCard(x, u.id)).join("")}</ul>`;
  }
  function studioCard(x, uid) {
    const intro = x.introduces === uid && x.units.length > 1 ? ` <span class="sl2-pill">${L("Introduced in this unit", "Se presenta en esta unidad")}</span>` : "";
    const act = x.status !== "available" ? `<span class="sl2-soon">${L("Coming soon", "Próximamente")}</span>`
      : x.route ? `<a class="btn" href="${h(x.route)}">${L("Open", "Abrir")}<span class="sr"> ${h(pick(x.title))}</span></a>`
      : x.href ? `<a class="btn" href="${h(x.href)}" target="_blank" rel="noopener">${L("Open", "Abrir")}<span class="sr"> ${h(pick(x.title))} ${L("(opens in a new tab)", "(se abre en una pestaña nueva)")}</span> ↗</a>`
      : x.lab ? `<button type="button" class="btn" data-sl2-lab="${h(x.lab)}">${L("Open", "Abrir")} ${h(es() ? LAB_NAMES[x.lab][1] : LAB_NAMES[x.lab][0])}</button>` : "";
    return `<li class="sl2-card sl2-studio${x.featured ? " is-featured" : ""}"><h3>${h(pick(x.title))}${intro}</h3><p>${h(pick(x.blurb))}</p>${act}</li>`;
  }

  /* ---------- Daily Learning Dashboard ---------- */
  function viewToday(u) {
    const g = group();
    if (!g) return `<div class="sl2-card">${groupBar()}</div>`;
    const t = today(), jf = S.journalFor(t, opts(g));
    const past = S.meetings(opts(g)).filter(m => m.unit === u.id && m.date <= t);
    const last = past[past.length - 1];
    if (jf.state === "today" && jf.unit === u.id) return viewDay(u, t, false);
    // Not a class day for this unit right now: say so honestly, and point to the right place.
    let msg;
    if (jf.state === "done") msg = L("The course is complete. Your lessons and journals stay here for review.", "El curso terminó. Tus lecciones y diarios quedan aquí para repasar.");
    else if (jf.state === "today") msg = L(`Today's class is in Unit ${jf.unit}.`, `La clase de hoy es de la Unidad ${jf.unit}.`);
    else {
      const off = offReason(t), dow = parseD(t).getDay(), why = off ? (es() ? (REASON_ES[off] || off) : off) : dow === 0 || dow === 6 ? L("the weekend", "fin de semana") : L("not a class day for your periods", "no es día de clase para tus periodos");
      msg = L(`No class today (${why}). Next class: ${fmtLong(jf.date)}, Unit ${jf.unit}. The lesson opens that morning at ${fmtTime(D.calendar.releaseTime)}.`, `Hoy no hay clase (${why}). Próxima clase: ${fmtLong(jf.date)}, Unidad ${jf.unit}. La lección se abre esa mañana a las ${fmtTime(D.calendar.releaseTime)}.`);
    }
    return `<div class="sl2-card sl2-status"><h2 class="sl2-h2">${L("Today", "Hoy")} · ${h(fmtLong(t))}</h2><p>${h(msg)}</p>
      <p>${jf.state === "today" && jf.unit !== u.id ? `<a class="btn primary" href="#/unit/${jf.unit}">${L(`Go to Unit ${jf.unit}`, `Ir a la Unidad ${jf.unit}`)}</a> ` : ""}${last ? `<a class="btn" href="#/unit/${u.id}/day/${last.date}">${L("Open the most recent lesson", "Abrir la lección más reciente")} (${h(fmtShort(last.date))})</a> ` : ""}<a class="btn" href="#/unit/${u.id}/lessons">${L("All lessons", "Todas las lecciones")}</a></p></div>
`;
  }
  function dayParts(u, day, g) {
    const v = weeks(), w = S.courseWeekOf(day, v);
    if (w == null) return null;
    const items = w === 0 ? [{ k: 0, t: L("Getting started: course overview and a low-stakes speaking warm-up.", "Primeros días: presentación del curso y un calentamiento oral sin presión."), pre: true }]
      : weekPlan(w, g).filter(x => x.date && isoD(x.date) === day).map(x => ({ k: x.k, t: x.speech ? x.t.slice(7) : x.t, speech: x.speech, due: x.due }));
    const keys = items.map(x => lessonKey(w === 0 ? 1 : w, x.k));
    return { w, items, keys, lessons: keys.map(k => D.lessons.days[k]).filter(Boolean) };
  }
  /** Everything about one class, from the existing data: used by the student dashboard, presentation mode,
      the substitute plan and the weekly plan, so they always agree. Lesson fields the teacher adds in the
      Lesson Manager (title, agenda, exit, activities, Canvas link, featured labs) replace the defaults. */
  function lessonModel(day, g) {
    const m = S.meetings(opts(g)).find(x => x.date === day) || null;
    const src = m && m.extendOf ? m.extendOf : day, parts = dayParts(null, src, g);
    if (!parts) return null;
    const ls = parts.lessons, w = parts.w === 0 ? 1 : parts.w, col = level === "col", unit = m ? m.unit : (S.unitOfWeek(D.units.units, w) || {}).id;
    const titled = ls.find(x => x.title && pick(x.title));
    const agenda = parts.items.flatMap((x, n) => { const own = ls[n] && ls[n].agenda; return own ? (es() ? own.es : own.en).map(t => ({ t, speech: false })) : [{ t: trText(x.t), speech: x.speech }]; });
    const dues = window.nextDues ? nextDues(20).filter(e => (e.type === "speech" ? e.days.some(d => isoD(d) === day) : isoD(e.d) === day)) : [];
    const uniq = a => [...new Set(a)];
    return {
      day, group: g, meeting: m, unit, week: parts.w, extendOf: m && m.extendOf || null, keys: parts.keys, lessons: ls,
      title: titled ? pick(titled.title) : trText(topicOf(w)) || "", topic: trText(topicOf(w)) || "",
      objectives: ls.map(x => ({ learn: col && x.col ? x.col : x.learn, lang: x.lang })),
      journal: m ? m.journal : null, agenda, dues,
      success: ls.flatMap(x => (es() ? x.success.es : x.success.en)),
      exit: (ls.find(x => x.exit) || {}).exit || null,
      activities: uniq(ls.flatMap(x => x.activities || [])), featured: uniq(ls.flatMap(x => x.featured || [])),
      canvas: ls.filter(x => x.canvas && x.canvas.url).map(x => x.canvas),
      ai: aiOf(ls),
      draft: ls.some(x => (x.status || D.lessons.status || {}).en !== "approved"),
    };
  }
  /* ---------- assignment-specific AI permission (data/ai-permissions.json; lessons.json "ai") ---------- */
  const aiLevel = id => ((D.aiperm && D.aiperm.levels) || []).find(l => l.id === id) || null;
  /** The permission for a class day: the lesson's setting, the more restrictive one if two lessons differ, else the default. */
  function aiOf(ls) {
    const set = (ls || []).filter(x => x && x.ai && aiLevel(x.ai.level));
    if (!set.length) return { level: (D.aiperm && D.aiperm.default) || "grammar", note: null, eld: false, set: false };
    const top = set.reduce((a, b) => (aiLevel(b.ai.level).rank < aiLevel(a.ai.level).rank ? b : a));
    // ELD support only when every lesson that day explicitly allows it, and never with "not permitted".
    const eld = top.ai.level !== "none" && set.every(x => x.ai.eld === true);
    return { level: top.ai.level, note: top.ai.note || null, eld, set: true };
  }
  /** The permission for the student's current assignment: today's class, or the most recent class before today. */
  function aiNow(g) {
    g = g || group(); if (!g) return null;
    const t = today(), past = S.meetings(opts(g)).filter(m => m.date <= t), m = past[past.length - 1];
    if (!m) return { ...aiOf([]), day: null };
    const mod = lessonModel(m.date, g);
    return { ...(mod ? mod.ai : aiOf([])), day: m.date };
  }
  function aiCard(ai, compact) {
    const lv = aiLevel(ai.level); if (!lv) return "";
    return `<section class="sl2-card sl2-ai is-${h(lv.id)}" aria-label="${L("AI permission", "Permiso de IA")}"><p class="sl2-kicker">${L("AI on today's work", "IA en el trabajo de hoy")}</p>
      <p class="sl2-ai-level"><b>${h(pick(lv.name))}</b></p>${compact ? "" : `<p>${h(pick(lv.explain))}</p>`}
      ${ai.eld && D.aiperm.eld ? `<p class="sl2-ai-note"><b>${h(pick(D.aiperm.eld.name))}.</b> ${compact ? "" : h(pick(D.aiperm.eld.explain))}</p>` : ""}
      ${ai.note ? `<p class="sl2-ai-note"><b>${L("Mr. Bennett's note:", "Nota del Sr. Bennett:")}</b> ${h(pick(ai.note))}</p>` : ""}
      <p class="sl2-small"><a href="#/ai">${L("AI Coaching Studio: Your Thinking. Your Voice.", "Estudio de coaching con IA: Tu pensamiento. Tu voz.")}</a></p></section>`;
  }
  /* ---------- optional digital journal (instructor-authorized accessibility alternative) ----------
     Handwritten journals stay the routine. With Mr. Bennett's code (access.json journal.codeHash; this browser only,
     never in backups) a student can type the journal instead: drafts stay in this browser (speakup-journal-v1), and can
     be printed, copied or downloaded for Canvas. Nothing is graded, sent or marked complete. */
  const journalOk = () => !!(D.access.journal && get(K.journalOk) === D.access.journal.codeHash);
  const jStore = () => { try { const r = JSON.parse(get(K.journal) || "null"); return r && r.v === 1 && r.entries && typeof r.entries === "object" ? r : { v: 1, entries: {} }; } catch (e) { return { v: 1, entries: {} }; } };
  /* Slice 10: the five facts about typed journals, shown before and after unlocking. Nothing asks why a student types. */
  const JOURNAL_FACTS = [
    ["The code is a classroom permission from Mr. Bennett, not a password or secure login.", "El código es un permiso de clase del Sr. Bennett, no una contraseña ni un inicio de sesión seguro."],
    ["What you type is saved only in this browser on this device. It is not sent to anyone.", "Lo que escribes se guarda solo en este navegador, en este dispositivo. No se envía a nadie."],
    ["When Mr. Bennett asks for it, turn it in through Canvas (copy it in or upload the download).", "Cuando el Sr. Bennett lo pida, entrégalo en Canvas (cópialo o sube el archivo descargado)."],
    ["Typed responses are not graded automatically.", "Las respuestas escritas aquí no se califican automáticamente."],
    ["This site can't check whether a journal was done, handwritten or typed. Mr. Bennett checks that.", "Este sitio no puede comprobar si se hizo un diario, a mano o escrito. El Sr. Bennett lo revisa."],
  ];
  const journalFacts = () => `<ul class="sl2-small sl2-jfacts">${JOURNAL_FACTS.map(f => `<li>${L(f[0], f[1])}</li>`).join("")}</ul>`;
  function digitalJournal(day, m, j) {
    if (!D.access.journal) return "";
    if (!journalOk()) return `<details class="sl2-fold sl2-noprint"><summary>${L("Typing your journal instead (with Mr. Bennett's permission)", "Escribir tu diario en la computadora (con permiso del Sr. Bennett)")}</summary>
      <p class="sl2-small">${L("Handwritten journals are the class routine. If Mr. Bennett has allowed you to type yours, enter the code he gave you. It works on this browser only.", "Los diarios a mano son la rutina de la clase. Si el Sr. Bennett te permitió escribir el tuyo en la computadora, escribe el código que te dio. Funciona solo en este navegador.")}</p>${journalFacts()}
      <p class="btp-row"><label>${L("Digital journal code", "Código del diario digital")} <input id="sl2JCode" autocomplete="off" class="sl2-code"></label> <button type="button" class="btn" data-sl2-jcode>${L("Unlock", "Activar")}</button> <span role="status" id="sl2JMsg" class="sl2-small"></span></p></details>`;
    const e = jStore().entries[day] || {}, id = `sl2J-${day}`;
    return `<section class="sl2-djournal" aria-labelledby="${id}-h"><h3 id="${id}-h">${L("My typed journal", "Mi diario escrito en la computadora")} · ${L("Journal", "Diario")} #${m.number}</h3>
      <label for="${id}" class="sr">${L("Your journal response", "Tu respuesta del diario")}</label>
      <textarea id="${id}" rows="8" data-sl2-jtext="${day}" spellcheck="true">${h(e.text || "")}</textarea>
      <p class="sl2-small" role="status" id="${id}-st">${e.text ? L(`${(e.text.match(/\S+/g) || []).length} words · saved in this browser`, `${(e.text.match(/\S+/g) || []).length} palabras · guardado en este navegador`) : L("Saves in this browser as you type.", "Se guarda en este navegador mientras escribes.")}</p>
      <p class="btp-row sl2-noprint"><button type="button" class="btn" data-sl2-jprint="${day}">${L("Print", "Imprimir")}</button> <button type="button" class="btn" data-sl2-jcopy="${day}">${L("Copy", "Copiar")}</button> <button type="button" class="btn" data-sl2-jdl="${day}">${L("Download (.txt)", "Descargar (.txt)")}</button></p>
      <p class="sl2-small">${L(`To turn it in when Mr. Bennett asks: copy it into the Canvas assignment for Journal #${m.number}, or upload the downloaded file. Typing here doesn't mark your journal as done or graded, and still stand and share with someone new.`, `Para entregarlo cuando el Sr. Bennett lo pida: cópialo en la tarea de Canvas del Diario #${m.number} o sube el archivo descargado. Escribir aquí no marca tu diario como terminado ni calificado; también ponte de pie y comparte con alguien nuevo.`)} ${L("Don't include private information about yourself or others.", "No incluyas información privada tuya ni de otras personas.")}</p>
      <details class="sl2-fold sl2-noprint"><summary>${L("How typed journals work", "Cómo funcionan los diarios escritos")}</summary>${journalFacts()}</details></section>`;
  }
  function journalText(day) {
    const m = (lessonModel(day, group() || "odd") || {}).meeting, j = m && m.journal, e = jStore().entries[day] || {};
    return [`${L("Daily Learning Journal", "Diario de aprendizaje")}${m ? ` #${m.number}` : ""} · ${fmtLong(day)}`, j ? `${L("Prompt", "Pregunta")}: ${pick(j.prompt)}` : "", "", e.text || ""].join("\n");
  }
  document.addEventListener("input", e => {
    const t = e.target; if (!t.matches || !t.matches("[data-sl2-jtext]") || !journalOk()) return;
    const r = jStore(), day = t.dataset.sl2Jtext; r.entries[day] = { text: t.value.slice(0, 20000), updated: today() }; put(K.journal, JSON.stringify(r));
    const st = document.getElementById(`sl2J-${day}-st`); if (st) st.textContent = L(`${(t.value.match(/\S+/g) || []).length} words · saved in this browser`, `${(t.value.match(/\S+/g) || []).length} palabras · guardado en este navegador`);
  });
  document.addEventListener("click", e => {
    const t = e.target.closest && e.target.closest("[data-sl2-jcode],[data-sl2-jprint],[data-sl2-jcopy],[data-sl2-jdl]"); if (!t) return;
    if (t.hasAttribute("data-sl2-jcode")) { const v = ($id("sl2JCode") || {}).value || ""; if (D.access.journal && hash("journal", v) === D.access.journal.codeHash) { put(K.journalOk, D.access.journal.codeHash); refresh(); const ta = document.querySelector("[data-sl2-jtext]"); if (ta) ta.focus(); } else { const m = $id("sl2JMsg"); if (m) m.textContent = L("That code isn't right.", "Ese código no es correcto."); } return; }
    const day = t.dataset.sl2Jprint || t.dataset.sl2Jcopy || t.dataset.sl2Jdl, text = journalText(day);
    if (t.hasAttribute("data-sl2-jprint")) { const w = document.createElement("div"); w.id = "sl2JPrint"; w.textContent = text; document.body.appendChild(w); document.body.classList.add("sl2-jprinting"); window.print(); setTimeout(() => { document.body.classList.remove("sl2-jprinting"); w.remove(); }, 500); return; }
    if (t.hasAttribute("data-sl2-jcopy")) { (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => { t.textContent = L("Copied", "Copiado"); }, () => { t.textContent = L("Copy didn't work here", "No se pudo copiar"); }); return; }
    try { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" })); a.download = `journal-${day}.txt`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); } catch (err) {}
  });
  const DEFAULT_EXPECT = { en: "10 minutes · Write by hand in your journal.", es: "10 minutos · Escribe a mano en tu diario." };
  function viewDay(u, day, isPast) {
    const g = group(); if (!g) return `<div class="sl2-card">${groupBar()}</div>`;
    const t = today();
    if (day > t || !S.isOpen(S.lessonReleaseAt(day, opts(g)), now())) return `<div class="sl2-card sl2-locked"><p>${ICON.lock} ${L(`This lesson opens ${dot(fmtAt(S.lessonReleaseAt(day, opts(g))))}`, `Esta lección se abre el ${dot(fmtAt(S.lessonReleaseAt(day, opts(g))))}`)}</p></div>`;
    const m = S.meetings(opts(g)).find(x => x.date === day);
    if (!m) return `<div class="sl2-card"><p>${L("Your class does not meet on this day.", "Tu clase no se reúne este día.")}</p><p><a class="btn" href="#/unit/${u.id}/lessons">${L("All lessons", "Todas las lecciones")}</a></p></div>`;
    if (m.unit !== u.id) return `<div class="sl2-card"><p>${L(`This class belongs to Unit ${m.unit}.`, `Esta clase pertenece a la Unidad ${m.unit}.`)} <a href="#/unit/${m.unit}/day/${day}">${L("Open it there", "Ábrela allí")}</a></p></div>`;
    const M = lessonModel(day, g), j = M.journal, sup = supportsOn(), col = level === "col";
    const two = (o, cls) => { const a = pick(o), b = sup ? other(o) : ""; return `<p${cls ? ` class="${cls}"` : ""}>${h(a)}${b && b !== a ? `<span class="sl2-alt" lang="${es() ? "en" : "es"}">${h(b)}</span>` : ""}</p>`; };
    const objs = M.objectives.map((o, n) => `<div class="sl2-obj">
        ${M.objectives.length > 1 ? `<p class="sl2-objn">${L("Part", "Parte")} ${n + 1}</p>` : ""}
        <h3>${L("Learning objective", "Objetivo de aprendizaje")}</h3>${two(o.learn)}
        <h3>${L("Language objective", "Objetivo de lenguaje")}</h3>${two(o.lang)}</div>`).join("");
    const exp = j && j.experience && D.studios.experiences.find(x => x.id === j.experience);
    const journal = j ? `<section class="sl2-card sl2-journal" aria-labelledby="sl2-jh">
        <p class="sl2-kicker">${ICON.pen} ${L("Daily Learning Journal", "Diario de aprendizaje")} #${m.number} · ${L("Set", "Grupo")} ${m.set} ${L("(Journals", "(Diarios")} ${(m.set - 1) * 10 + 1}–${m.set * 10}, 100 ${L("points)", "puntos)")}</p>
        <h2 class="sl2-h2" id="sl2-jh">${h(pick(j.title || j.focus))}</h2>
        ${two(j.prompt, "sl2-prompt")}
        <p class="sl2-how"><b>${h(pick(j.expect || DEFAULT_EXPECT))}</b>${j.alt ? ` <span>${L("Prefer not to share something personal?", "¿Prefieres no compartir algo personal?")} ${h(pick(j.alt))}</span>` : ""}</p>
        <div class="sl2-cols"><div><h3>${L("Vocabulary", "Vocabulario")}</h3><ul class="sl2-chips">${j.vocab.en.map((wd, x) => `<li>${h(es() ? j.vocab.es[x] : wd)}${sup ? ` <span class="sl2-alt" lang="${es() ? "en" : "es"}">${h(es() ? wd : j.vocab.es[x])}</span>` : ""}</li>`).join("")}</ul></div>
        ${(() => { const list = `<ul class="sl2-frames">${j.frames.en.map((f, x) => `<li>${h(es() ? j.frames.es[x] : f)}${sup ? `<span class="sl2-alt" lang="${es() ? "en" : "es"}">${h(es() ? f : j.frames.es[x])}</span>` : ""}</li>`).join("")}</ul>`;
          return supportLevel() === "independent" ? `<details class="sl2-fold"><summary>${L("Sentence starters (optional)", "Inicios de oración (opcional)")}</summary>${list}</details>` : `<div><h3>${L("Sentence starters", "Inicios de oración")}</h3>${list}</div>`; })()}</div>
        ${supportLevel() === "guided" ? `<ol class="sl2-steps-mini" aria-label="${L("How to do your journal", "Cómo hacer tu diario")}"><li>${L("Read the prompt. Ask: what is the question?", "Lee la pregunta. Pregúntate: ¿qué me pide?")}</li><li>${L("Look at the vocabulary words.", "Mira las palabras de vocabulario.")}</li><li>${L("Choose a sentence starter.", "Elige un inicio de oración.")}</li><li>${L("Write for 10 minutes in your journal.", "Escribe 10 minutos en tu diario.")}</li><li>${L("Stand up and share with someone new.", "Ponte de pie y comparte con alguien nuevo.")}</li></ol>` : ""}
        <div class="sl2-share">${ICON.people} <div><h3>${L("Stand and share", "Ponte de pie y comparte")}</h3>${two(j.share)}<p class="sl2-small">${L("When you finish writing, stand up and share with someone new in the room.", "Cuando termines de escribir, ponte de pie y comparte con alguien nuevo del salón.")}</p></div></div>
        ${digitalJournal(day, m, j)}
        ${exp ? `<p class="sl2-small">${L("Connected experience:", "Experiencia relacionada:")} ${exp.status === "available" && exp.route ? `<a href="${h(exp.route)}">${h(pick(exp.title))}</a>` : h(pick(exp.title))}${exp.status === "available" ? "" : ` (${L("coming soon", "próximamente")})`}</p>` : ""}
      </section>` : `<section class="sl2-card sl2-journal"><p>${L("No journal is assigned for this class.", "No hay diario asignado para esta clase.")}${m.note ? ` (${h(m.note)})` : ""}</p></section>`;
    const canvas = M.canvas.map(c => `<li><b>${L("Canvas:", "Canvas:")}</b> <a href="${h(c.url)}" target="_blank" rel="noopener">${h(c.label ? pick(c.label) : L("Open the assignment", "Abrir la tarea"))}<span class="sr"> ${L("(opens in a new tab)", "(se abre en una pestaña nueva)")}</span> ↗</a></li>`);
    const agenda = [`<li>${L("Daily Learning Journal: write for 10 minutes, then stand and share with someone new.", "Diario de aprendizaje: escribe 10 minutos y luego ponte de pie y comparte con alguien nuevo.")}</li>`]
      .concat(M.agenda.map(x => `<li>${x.speech ? `<b>${L("Speeches:", "Discursos:")}</b> ` : ""}${h(x.t)}</li>`))
      .concat(canvas)
      .concat(M.dues.map(e => `<li><b>${L("Turn in:", "Entregar:")}</b> ${h(es() ? e.t[1] : e.t[0])} · <a href="https://myapps.classlink.com/home" target="_blank" rel="noopener">${L("Canvas through ClassLink", "Canvas por ClassLink")}<span class="sr"> ${L("(opens in a new tab)", "(se abre en una pestaña nueva)")}</span> ↗</a></li>`))
      .concat([`<li>${M.exit ? `<b>${L("Exit reflection:", "Reflexión final:")}</b> ${h(pick(M.exit))}` : L("Exit check: test yourself against today's success criteria.", "Revisión final: compárate con los criterios de éxito de hoy.")}</li>`]).join("");
    const labIds = M.activities.length ? M.activities.concat((UNIT_LABS[u.id] || []).filter(x => !M.activities.includes(x))) : (UNIT_LABS[u.id] || []);
    const labs = labIds.filter(id => LAB_NAMES[id]).map((id, n) => `<button type="button" class="btn${n < M.activities.length ? " primary" : ""}" data-sl2-lab="${id}">${h(es() ? LAB_NAMES[id][1] : LAB_NAMES[id][0])}</button>`).join(" ");
    const studios = D.studios.experiences.filter(x => (x.units.includes(u.id) || M.featured.includes(x.id)) && (x.audience === "all" || col) && x.status === "available");
    return `<div class="sl2-day">
      <p class="sl2-kicker">${isPast ? `${L("Past lesson", "Lección anterior")} · ` : ""}${h(fmtLong(day))} · ${M.week === 0 ? L("Getting started", "Primeros días") : `${L("Week", "Semana")} ${M.week}`} · ${h(groupLabel(g, es()))}</p>
      <h2 class="sl2-h2 sl2-lesson">${isPast ? L("Lesson", "Lección") : L("Today's lesson", "Lección de hoy")}: ${h(M.title)}${M.topic && M.topic !== M.title ? ` <span class="sl2-week">${L("This week:", "Esta semana:")} ${h(M.topic)}</span>` : ""}</h2>
      ${M.extendOf ? `<p class="sl2-teachnote">${L(`Extended lesson: we continue the lesson from ${fmtLong(M.extendOf)}.`, `Lección extendida: continuamos la lección del ${fmtLong(M.extendOf)}.`)}</p>` : ""}
      ${M.draft ? `<p class="sl2-small">${L("Lesson objectives are drafts awaiting teacher review.", "Los objetivos de la lección son borradores en revisión del maestro.")}</p>` : ""}
      <section class="sl2-card" aria-label="${L("Objectives", "Objetivos")}">${objs || `<p>${L("No objectives are set for this day.", "No hay objetivos para este día.")}</p>`}</section>
      ${journal}
      <div class="sl2-cols">
        <section class="sl2-card"><h2 class="sl2-h3">${L("Today's agenda", "Agenda de hoy")}</h2><ol class="sl2-agenda">${agenda}</ol></section>
        <section class="sl2-card"><h2 class="sl2-h3">${L("Success criteria", "Criterios de éxito")}</h2><ul class="sl2-success">${M.success.map(s => `<li>${ICON.check} ${h(s)}</li>`).join("")}</ul>
          <p class="sl2-small">${L("Check yourself. This list is not saved or graded.", "Revísate. Esta lista no se guarda ni se califica.")}</p></section>
      </div>
      ${aiCard(M.ai)}
      <section class="sl2-card"><h2 class="sl2-h3">${M.activities.length ? L("Today's activities", "Actividades de hoy") : L("Activities for this unit", "Actividades de esta unidad")}</h2><p class="sl2-btns">${labs}</p>
        ${studios.length ? `<ul class="sl2-studios">${studios.map(x => studioCard(x, u.id)).join("")}</ul>` : ""}</section>
      ${isPast ? `<p><a class="btn" href="#/unit/${u.id}/lessons">← ${L("All lessons", "Todas las lecciones")}</a></p>` : ""}
    </div>`;
  }

  /* ---------- archive ---------- */
  function viewArchive(u) {
    const g = group(); if (!g) return `<div class="sl2-card">${groupBar()}</div>`;
    const t = today(), n = now();
    const list = S.meetings(opts(g)).filter(m => m.unit === u.id && S.isOpen(S.lessonReleaseAt(m.date, opts(g)), n)).reverse();
    if (!list.length) return `<div class="sl2-card"><p>${L("No lessons have opened in this unit yet.", "Todavía no se ha abierto ninguna lección en esta unidad.")}</p></div>`;
    return `<h2 class="sl2-h2">${L("Lessons and journals", "Lecciones y diarios")}</h2>
      <p class="sl2-small">${L("Every lesson that has opened for your class, newest first. Use this if you were absent or want to review.", "Todas las lecciones que se han abierto para tu clase, de la más reciente a la más antigua. Úsalo si faltaste o quieres repasar.")}</p>
      <ol class="sl2-archive" reversed>${list.map(m => { const parts = dayParts(u, m.date, g), topic = trText(topicOf(parts.w === 0 ? 1 : parts.w));
        return `<li><a href="#/unit/${u.id}/day/${m.date}"><b>${h(fmtLong(m.date))}</b>${m.date === t ? ` <span class="sl2-pill">${L("Today", "Hoy")}</span>` : ""}<span>${h(topic)}</span>
          <span class="sl2-small">${m.journal ? `${L("Journal", "Diario")} #${m.number}: ${h(pick(m.journal.title || m.journal.focus))}` : L("No journal", "Sin diario")}</span></a></li>`; }).join("")}</ol>`;
  }

  /* ---------- teacher tools (deterrent, not security) ---------- */
  function teacherDialog() {
    let d = $id("sl2Teacher");
    if (!d) { d = document.createElement("dialog"); d.id = "sl2Teacher"; d.setAttribute("aria-labelledby", "sl2TeacherH"); d.setAttribute("data-notr", ""); document.body.appendChild(d); }
    const on = teacherOn();
    d.innerHTML = `<div class="mw"><h2 id="sl2TeacherH">${L("Teacher tools", "Herramientas del maestro")}</h2>
      <p class="sl2-small">${L("This is a classroom pacing control, not a secure sign-in. The site and its files are public, and anyone who learns the code can use it. Teacher view opens future units on this browser and lets you preview any date.", "Este es un control para el ritmo de la clase, no un inicio de sesión seguro. El sitio y sus archivos son públicos, y cualquiera que conozca el código puede usarlo. La vista del maestro abre unidades futuras en este navegador y permite ver cualquier fecha.")}</p>
      ${on ? `<p class="sl2-btns"><a class="btn primary" href="#/teacher" data-sl2-close>${L("Open the Lesson Manager", "Abrir el administrador de lecciones")}</a> <a class="btn" href="#/present" data-sl2-close>${L("Present today's lesson", "Presentar la lección de hoy")}</a></p>
        <label for="sl2PrevDate"><b>${L("Preview the site on a date", "Ver el sitio en una fecha")}</b></label>
        <input id="sl2PrevDate" type="date" value="${h(today())}">
        <div class="pl-acts"><button type="button" class="btn primary" data-sl2-preview>${L("Preview", "Ver")}</button>${S.isPreview() ? `<button type="button" class="btn" data-sl2-endpreview>${L("End preview", "Terminar vista previa")}</button>` : ""}<button type="button" class="btn" data-sl2-teacheroff>${L("Turn off teacher view", "Desactivar la vista del maestro")}</button></div>`
      : `<label for="sl2TeacherCode"><b>${L("Teacher view code", "Código de vista del maestro")}</b></label><input id="sl2TeacherCode" type="text" autocomplete="off" spellcheck="false">
        <p class="colmsg" id="sl2TeacherMsg" role="alert"></p><div class="pl-acts"><button type="button" class="btn primary" data-sl2-teachercode>${L("Unlock", "Desbloquear")}</button></div>`}
      <div class="pl-acts mw-close"><button type="button" class="btn" data-sl2-close>${L("Close", "Cerrar")}</button></div></div>`;
    if (!d.open) { if (d.showModal) d.showModal(); else d.setAttribute("open", ""); }
    const f = d.querySelector("input"); if (f) f.focus();
    return d;
  }
  function withDate(iso) { const u = new URL(location.href); if (iso) u.searchParams.set("date", iso); else u.searchParams.delete("date"); return u.toString(); }

  /* ---------- achievements (js/achievements.js + data/achievements.json) ---------- */
  // College-only badges (audience col) are shown and earnable only on the authorized college pathway.
  const AC = () => ({ ...D.achievements, badges: D.achievements.badges.filter(b => !b.audience || b.audience === "all" || level === "col") }), A = window.SLAchieve;
  function achState() {
    const labs = {}; [["rlab", "RLab"], ["glab", "GLab"], ["nvlab", "NVLab"], ["nvclab", "NVCLab"]].forEach(([id, g]) => { try { if (window[g] && window[g].summary) labs[id] = window[g].summary(); } catch (e) {} });
    const src = A.collect({ get, labs });
    const t = A.track(AC(), src, (() => { try { return JSON.parse(get(A.KEY) || "null"); } catch (e) { return null; } })(), today());
    if (JSON.stringify(t.store) !== get(A.KEY)) put(A.KEY, JSON.stringify(t.store));
    if (t.newly.length) celebrate(t.newly);
    const res = A.evaluate(AC(), src, t.store);
    return { src, store: t.store, res, pts: A.points(AC(), src, res) };
  }
  function achLink() {
    const st = achState(), earned = st.res.filter(r => r.state === "earned").length, avail = st.res.filter(r => r.status === "active").length;
    return `<p><a class="btn sl2-achbtn" href="#/achievements">${ICON.star} ${L("My achievements", "Mis logros")} <span>· ${L(`${earned} of ${avail} badges`, `${earned} de ${avail} insignias`)}</span></a></p>`;
  }
  /** Brief, polite announcement of a newly earned badge; no animation when reduced motion is preferred. */
  function celebrate(ids) {
    const names = ids.map(id => pick(AC().badges.find(b => b.id === id).title)).join(", ");
    let el = $id("sl2Toast");
    if (!el) { el = document.createElement("p"); el.id = "sl2Toast"; el.setAttribute("role", "status"); el.setAttribute("data-notr", ""); document.body.appendChild(el); }
    el.textContent = L(`New achievement: ${names}`, `Nuevo logro: ${names}`);
    el.classList.add("is-on"); clearTimeout(celebrate.t); celebrate.t = setTimeout(() => el.classList.remove("is-on"), 6000);
  }
  const STATE_TXT = {
    earned: ["Earned", "Obtenida"], progress: ["In progress", "En progreso"], notstarted: ["Not started", "Sin empezar"],
    pending: ["Teacher verification: not available yet", "Verificación del maestro: todavía no disponible"], coming: ["Coming later", "Llegará después"],
  };
  function partLine(p) {
    const val = p.have == null ? "" : p.kind === "score" ? L(` · your best: ${p.have}%`, ` · tu mejor: ${p.have}%`) : p.kind === "of10" ? L(` · your best: ${p.have} of 10`, ` · tu mejor: ${p.have} de 10`) : p.kind === "count" ? ` · ${p.have} / ${p.need}` : "";
    const retry = !p.done && p.have != null && (p.kind === "score" || p.kind === "of10") ? ` <span class="sl2-retry">${L("Try again: your best score counts.", "Inténtalo otra vez: cuenta tu mejor puntuación.")}</span>` : "";
    return `<li class="${p.done ? "is-done" : ""}">${p.done ? ICON.check : ICON.open} <span>${h(pick(p.label))}${h(val)}${p.done ? ` <span class="sr">${L("(done)", "(hecho)")}</span>` : ""}${retry}</span></li>`;
  }
  function badgeCard(r) {
    const b = r.badge, stt = STATE_TXT[r.state];
    const when = r.state === "earned" && r.earnedOn ? ` · ${h(fmtShort(r.earnedOn))}` : "";
    return `<li class="sl2-badge is-${r.state}">${A.medallion(b, r.state)}
      <div><h3>${h(pick(b.title))}</h3>
      <p class="sl2-bstate">${r.state === "earned" ? ICON.star : r.state === "coming" ? ICON.lock : r.state === "progress" ? ICON.half : ICON.open} ${es() ? stt[1] : stt[0]}${when}</p>
      <p>${h(pick(b.about))}</p>
      <ul class="sl2-crit" aria-label="${L("How to earn it", "Cómo obtenerla")}">${r.parts.map(partLine).join("")}</ul></div></li>`;
  }
  function viewAchievements() {
    const st = achState(), units = D.units.units.map(unitInfo);
    const lv = k => st.res.filter(r => r.badge.level === k && r.status !== "coming");
    const done = units.filter(i => i.pr.completed).length;
    const sec = k => { const list = lv(k); if (!list.length) return ""; const L0 = AC().levels[k];
      return `<section class="sl2-achsec" aria-labelledby="sl2-lv-${k}"><h2 class="sl2-h2" id="sl2-lv-${k}">${h(pick(L0))}</h2><p class="sl2-small">${h(pick(L0.about))}</p><ul class="sl2-badges">${list.map(badgeCard).join("")}</ul></section>`; };
    const coming = st.res.filter(r => r.status === "coming");
    const unitRows = units.map(i => { const pr = i.pr, stt = STATE[i.state];
      return `<tr><th scope="row">${L("Unit", "Unidad")} ${i.u.id}: ${h(trText(i.u.short))}</th><td>${pr.quizBest == null ? "—" : `${pr.quizBest}%${pr.mastered ? ` ${ICON.star}<span class="sr"> ${L("mastered", "dominado")}</span>` : ""}`}</td><td>${pr.testBest == null ? "—" : `${pr.testBest}%`}</td><td>${ICON[stt.icon]} ${es() ? stt.es : stt.en}</td></tr>`; }).join("");
    return `<div class="wrap sl2" id="sl2-main" data-notr>
      <p class="sl2-back"><a href="#/">← ${L("My course", "Mi curso")}</a></p>
      <h1 class="sl2-h1">${L("My achievements", "Mis logros")}</h1>
      <p class="sl2-lead">${L("See what you have learned and practiced. Retry any check as often as you like; your best score counts.", "Mira lo que has aprendido y practicado. Repite cualquier revisión cuantas veces quieras; cuenta tu mejor puntuación.")}</p>
      <p class="sl2-print-only">${L(`Learning summary · printed ${fmtLong(today())}`, `Resumen de aprendizaje · impreso el ${fmtLong(today())}`)}</p>
      <dl class="sl2-stats">
        <div><dt>${L("Badges earned", "Insignias obtenidas")}</dt><dd>${st.res.filter(r => r.state === "earned").length} ${L("of", "de")} ${st.res.filter(r => r.status === "active").length}</dd></div>
        <div><dt>${L("Units completed", "Unidades completadas")}</dt><dd>${done} ${L("of", "de")} 6</dd></div>
        <div><dt>${L("Learning points", "Puntos de aprendizaje")}</dt><dd>${st.pts.total}</dd></div>
      </dl>
      <p class="sl2-small">${L("Learning points count each mastered lab activity, Beyond the Podium skill, reading check and practice test once, plus each badge. There are no leaderboards; this page is only for you.", "Los puntos de aprendizaje cuentan una vez cada actividad de laboratorio, habilidad de Beyond the Podium, comprobación de lectura y examen de práctica dominados, más cada insignia. No hay clasificaciones; esta página es solo para ti.")}</p>
      <p class="sl2-btns sl2-noprint"><button type="button" class="btn" data-sl2-print>${L("Print my learning summary", "Imprimir mi resumen de aprendizaje")}</button> <button type="button" class="btn" data-mywork="1">${L("Back up or move my progress", "Copiar o mover mi progreso")}</button></p>
      <h2 class="sl2-h2">${L("Unit completion", "Unidades completadas")}</h2>
      <p class="sl2-small">${L("A unit is completed when its reading check is 80% or higher and its practice test is done.", "Una unidad está completada cuando su comprobación de lectura es de 80% o más y su examen de práctica está hecho.")}</p>
      <div class="sl2-tablewrap"><table class="sl2-table"><thead><tr><th scope="col">${L("Unit", "Unidad")}</th><th scope="col">${L("Reading check (best)", "Comprobación de lectura (mejor)")}</th><th scope="col">${L("Practice test (best)", "Examen de práctica (mejor)")}</th><th scope="col">${L("Status", "Estado")}</th></tr></thead><tbody>${unitRows}</tbody></table></div>
      ${sec("knowledge")}${sec("applied")}${sec("communication")}
      ${coming.length ? `<section class="sl2-achsec sl2-noprint" aria-labelledby="sl2-lv-coming"><h2 class="sl2-h2" id="sl2-lv-coming">${L("Coming later", "Llegarán después")}</h2><p class="sl2-small">${L("These belong to experiences that are not built yet. They cannot be earned now.", "Pertenecen a experiencias que todavía no existen. No se pueden obtener ahora.")}</p><ul class="sl2-badges">${coming.map(badgeCard).join("")}</ul></section>` : ""}
      <p class="sl2-small">${L("Badges are informal learning achievements, not grades, credits or credentials. Progress is saved only in this browser on this computer; clearing the browser or using another computer starts fresh unless you restore a backup. Online activities never verify speaking performances or handwritten journals.", "Las insignias son logros de aprendizaje informales, no calificaciones, créditos ni credenciales. El progreso se guarda solo en este navegador y en esta computadora; si borras el navegador o usas otra computadora, empiezas de nuevo a menos que restaures una copia. Las actividades en línea nunca verifican presentaciones orales ni diarios escritos a mano.")}</p>
    </div>`;
  }

  /* ---------- the classic course guide follows the same release dates ---------- */
  const baseRenderUnit = window.renderUnit;
  window.renderUnit = function () {
    const r = baseRenderUnit.apply(this, arguments);
    if (!unitOpen(unitId)) { const el = $id("unitPanel"); if (el) el.innerHTML = lockedNotice(unitId); }
    else if (!released(unitId) && !(route && route.name === "unit")) { const el = $id("unitPanel"); if (el) el.insertAdjacentHTML("afterbegin", `<div data-notr>${teacherNote(releasedAt(unitId))}</div>`); }
    return r;
  };
  const baseRenderTabs = window.renderTabs;
  window.renderTabs = function () {
    const r = baseRenderTabs.apply(this, arguments);
    document.querySelectorAll("#utabs .utab[data-unit]").forEach(b => { const id = Number(b.dataset.unit); if (!unitOpen(id) && !b.querySelector(".sl2-tablock")) b.insertAdjacentHTML("beforeend", ` <span class="sl2-tablock" data-notr>${ICON.lock}<span class="sr"> ${L("(locked)", "(bloqueada)")}</span></span>`); });
    return r;
  };
  renderTabs(); renderUnit();

  /* ---------- events ---------- */
  document.addEventListener("click", e => {
    const t = e.target;
    const p = t.closest("[data-sl2-path]"); if (p) { choosePath(p.dataset.sl2Path, p); return; }
    const gb = t.closest("[data-sl2-grp]"); if (gb) { const g = gb.dataset.sl2Grp; classGroup = g; put(K.group, g || null); render(); return; }
    const lb = t.closest("[data-sl2-lab]"); if (lb && route && route.name === "unit") { const id = lb.dataset.sl2Lab; if (route.tab !== "labs") { pendingLab = id; location.hash = `#/unit/${route.id}/labs`; } else openLab(id); return; }
    if (t.closest("[data-sl2-teacher]")) { teacherDialog(); return; }
    if (t.closest("[data-sl2-print]")) { window.print(); return; }
    const d = $id("sl2Teacher");
    if (d && d.contains(t)) {
      if (t.closest("[data-sl2-close]")) { if (d.close) d.close(); else d.removeAttribute("open"); return; }
      if (t.closest("[data-sl2-teachercode]")) { const v = $id("sl2TeacherCode").value; if (hash("teacher", v) === D.access.teacher.codeHash) { put(K.teacher, D.access.teacher.codeHash); teacherDialog(); render(); } else $id("sl2TeacherMsg").textContent = L("That code isn't right.", "Ese código no es correcto."); return; }
      if (t.closest("[data-sl2-preview]")) { const v = $id("sl2PrevDate").value; if (v) location.href = withDate(v); return; }
      if (t.closest("[data-sl2-endpreview]")) { location.href = withDate(null); return; }
      if (t.closest("[data-sl2-teacheroff]")) { put(K.teacher, null); location.href = withDate(null); return; }
    }
  });
  document.addEventListener("keydown", e => { if (e.key === "Enter" && e.target && e.target.id === "sl2TeacherCode") { e.preventDefault(); const b = document.querySelector("[data-sl2-teachercode]"); if (b) b.click(); } });
  document.addEventListener("change", e => {
    if (e.target.matches("[data-sl2-support]")) { supFoldOpen = !!e.target.closest(".sl2-supfold"); put(K.support, e.target.checked ? "1" : null); refresh(); const f = document.querySelector("[data-sl2-support]"); if (f) f.focus(); }
    if (e.target.matches("[data-sl2-suplv]")) { supFoldOpen = !!e.target.closest(".sl2-supfold"); put(K.level, e.target.value); refresh(); const f = document.querySelector(`[data-sl2-suplv][value="${e.target.value}"]`); if (f) f.focus(); }
  });
  window.addEventListener("hashchange", go);

  // Re-draw after the page re-renders (language, level, class group, saved progress).
  const baseRender = window.render;
  window.render = function () { const r = baseRender.apply(this, arguments); refresh(); return r; };
  // The college gate's existing success path sets the level; remember the pathway too.
  const baseSetLevel = window.setLevel;
  window.setLevel = function (l) { const r = baseSetLevel.apply(this, arguments); if (l === "col" && colUnlocked()) put(K.path, "col"); else if (get(K.path) === "col") put(K.path, "hs"); return r; };

  // Header: "My course" first, brand goes home.
  const nav = document.querySelector("header nav.links");
  if (nav && !nav.querySelector('[href="#/"]')) { const a = document.createElement("a"); a.href = "#/"; a.setAttribute("data-notr", ""); nav.insertBefore(a, nav.firstChild); }
  navLabel();
  const brand = document.querySelector("header .brand"); if (brand) brand.setAttribute("href", "#/");

  const addRoute = (name, def) => { EXTRA[name] = def; if (/^#\/?/.test(location.hash) && location.hash.replace(/^#\/?/, "").split("/")[0] === name) go(); };
  window.SL2 = { addRoute, refresh, route: () => route, currentUnitId, unitInfo, lessonModel, opts, weeks, fmtLong, fmtShort, fmtAt, lessonKey, unitOpen, released, releasedAt, lockedNotice, achState, supportsOn, supportLevel, teacherOn, aiOf, aiNow, aiLevel, aiCard, ICON, h, L, pick, other, today, now, group, DEFAULT_EXPECT };
  go();
})();
