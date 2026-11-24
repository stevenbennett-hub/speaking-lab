/* Speak Up | The Speaking Lab — start-up.
   The page's own scripts are stored as <script type="text/x-speakup"> so they wait. This file loads the
   curriculum data (site/data/*.json, the single source of truth), puts it on window.SL_DATA, then runs
   those scripts in their original order. If the data cannot load, students see a clear message instead of
   a half-working page. Teacher preview: after the teacher code (Teacher tools on the dashboard), ?date=YYYY-MM-DD
   shows the site as it will look on that day (display only). Without the teacher code ?date= is ignored, so a
   student link cannot open future units. This is a classroom deterrent, not security. */
(function () {
  "use strict";
  var FILES = {
    units: "data/units.json",
    pacing: "data/pacing.json",
    calendar: "data/calendar-2026-27.json",
    objectives: "data/objectives.json",
    journals: "data/journals.json",
    overrides: "data/overrides.json",
    lessons: "data/lessons.json",
    access: "data/access.json",
    studios: "data/studios.json",
    achievements: "data/achievements.json"
  };
  // Loaded in order after the page's own scripts (they use the page's functions).
  var AFTER = ["js/progress.js", "js/achievements.js", "js/manage.js", "js/student.js", "js/teacher.js"];

  var params = new URLSearchParams(location.search);
  var preview = null;

  function banner(text, role) {
    var b = document.createElement("p");
    b.setAttribute("role", role || "status");
    b.style.cssText = "position:sticky;top:0;z-index:9999;margin:0;padding:10px 16px;background:#1B1F3B;color:#fff;font:600 15px/1.4 system-ui,sans-serif;text-align:center";
    b.textContent = text;
    document.body.insertBefore(b, document.body.firstChild);
    return b;
  }

  function runPageScripts() {
    var waiting = document.querySelectorAll('script[type="text/x-speakup"]');
    for (var i = 0; i < waiting.length; i++) {
      var s = document.createElement("script");
      s.textContent = waiting[i].textContent;
      waiting[i].parentNode.replaceChild(s, waiting[i]); // inline scripts run as soon as they are inserted
    }
    loadNext(0);
  }
  function loadNext(i) {
    if (i >= AFTER.length) { document.documentElement.setAttribute("data-speakup-ready", ""); document.dispatchEvent(new Event("speakup:ready")); return; }
    var s = document.createElement("script");
    s.src = AFTER[i];
    s.onload = function () { loadNext(i + 1); };
    s.onerror = function () { console.error("Speak Up could not load " + AFTER[i]); loadNext(i + 1); };
    document.body.appendChild(s);
  }

  var keys = Object.keys(FILES);
  // The academic-year calendar file is named in data/config.json (reusable lessons stay year-independent).
  fetch("data/config.json", { cache: "no-cache" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }).then(function (cfg) {
  if (cfg && /^data\/calendar-[0-9-]+\.json$/.test(cfg.calendar || "")) FILES.calendar = cfg.calendar;
  Promise.all(keys.map(function (k) {
    return fetch(FILES[k], { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error(FILES[k] + " " + r.status);
      return r.json();
    });
  })).then(function (vals) {
    var data = {};
    keys.forEach(function (k, i) { data[k] = vals[i]; });
    var teacher = false;
    try { teacher = localStorage.getItem("speakup-teacher-ok") === (data.access && data.access.teacher && data.access.teacher.codeHash); } catch (e) {}
    // Teacher-only: preview unpublished Lesson Manager drafts on THIS browser. Students never see drafts.
    window.SL_PUBLISHED = JSON.parse(JSON.stringify(data));
    if (teacher) try {
      if (localStorage.getItem("speakup-teacher-preview") === "1") {
        var dr = JSON.parse(localStorage.getItem("speakup-teacher-drafts-v1") || "null");
        if (dr && dr.drafts) ["lessons", "journals", "overrides"].forEach(function (k) { if (dr.drafts[k]) data[k] = dr.drafts[k]; });
        window.SL_DRAFT_PREVIEW = true;
      }
    } catch (e) {}
    window.SL_DATA = data;
    if (teacher && window.SLSchedule) preview = SLSchedule.setPreviewDate(params.get("date"));
    if (window.SL_DRAFT_PREVIEW) banner("Teacher preview: showing your unpublished drafts on this browser only. Students do not see them until you export and commit the files.");
    if (preview) banner("Teacher preview: showing the site as it will look on " + preview + ". Remove ?date= from the address to return to today.");
    runPageScripts();
  }).catch(function (err) {
    console.error("Speak Up could not load its course data:", err);
    banner("The course data didn’t load. Check your internet connection and refresh the page. / Los datos del curso no se cargaron. Revisa tu conexión a internet y vuelve a cargar la página.", "alert");
  });
  });
})();
