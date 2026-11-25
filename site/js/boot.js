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
    achievements: "data/achievements.json",
    aiperm: "data/ai-permissions.json"
  };
  // Loaded in order after the page's own scripts (they use the page's functions).
  var AFTER = ["js/progress.js", "js/achievements.js", "js/manage.js", "js/student.js", "js/teacher.js", "js/btp.js", "js/aistudio.js", "js/research.js", "js/playbook.js"];

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
  var B = window.SLBuild;
  // Development preview (js/build.js): only the preview address ever asks for data/preview.json.
  var previewFile = B && B.previewPlace(location)
    ? fetch("data/preview.json", { cache: "no-cache" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
    : Promise.resolve(null);
  previewFile.then(function (pf) {
  if (B && B.decide(location, pf)) B.activate(); // before anything reads saved progress
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
    var dev = !!(B && B.preview);
    // ?date= shows another day: teacher view only on the student site; anyone on the development preview.
    if ((teacher || dev) && window.SLSchedule) preview = SLSchedule.setPreviewDate(params.get("date"));
    if (dev) previewBar(preview);
    if (window.SL_DRAFT_PREVIEW) banner("Teacher preview: showing your unpublished drafts on this browser only. Students do not see them until you export and commit the files.");
    if (preview && !dev) banner("Teacher preview: showing the site as it will look on " + preview + ". Remove ?date= from the address to return to today.");
    runPageScripts();
  }).catch(function (err) {
    console.error("Speak Up could not load its course data:", err);
    banner("The course data didn’t load. Check your internet connection and refresh the page. / Los datos del curso no se cargaron. Revisa tu conexión a internet y vuelve a cargar la página.", "alert");
  });
  });
  });

  /** The Development Preview bar: always visible on the preview build, never on the student site. */
  function previewBar(day) {
    var bar = document.createElement("div");
    bar.id = "slPreviewBar"; bar.setAttribute("role", "region"); bar.setAttribute("aria-label", "Development Preview"); bar.setAttribute("data-notr", "");
    bar.style.cssText = "position:relative;z-index:9999;display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;justify-content:center;margin:0;padding:8px 16px;background:#7A2E0E;color:#fff;font:600 15px/1.4 system-ui,sans-serif";
    var label = document.createElement("strong"); label.textContent = "DEVELOPMENT PREVIEW";
    var note = document.createElement("span"); note.style.fontWeight = "400";
    note.textContent = "Not the student site. All six high school units are open; progress here is saved separately. " + (day ? "Viewing " + day + "." : "Viewing today.");
    var form = document.createElement("label"); form.style.cssText = "display:inline-flex;gap:6px;align-items:center";
    form.textContent = "View date ";
    var inp = document.createElement("input"); inp.type = "date"; inp.value = day || ""; inp.style.cssText = "font:inherit;padding:2px 6px;border-radius:6px;border:0";
    inp.addEventListener("change", function () { var u = new URL(location.href); if (inp.value) u.searchParams.set("date", inp.value); else u.searchParams.delete("date"); location.href = u.toString(); });
    form.appendChild(inp);
    var reset = document.createElement("button"); reset.type = "button"; reset.textContent = "Clear preview progress";
    reset.style.cssText = "font:inherit;padding:4px 10px;border-radius:6px;border:1px solid #fff;background:transparent;color:#fff;cursor:pointer";
    reset.addEventListener("click", function () { try { localStorage.clear(); } catch (e) {} location.reload(); }); // preview keys only (js/build.js)
    bar.appendChild(label); bar.appendChild(note); bar.appendChild(form); bar.appendChild(reset);
    document.body.insertBefore(bar, document.body.firstChild);
    // A small label that stays on screen while scrolling (the bar itself scrolls away with the page header).
    var tag = document.createElement("div"); tag.setAttribute("aria-hidden", "true"); tag.textContent = "DEV PREVIEW";
    tag.style.cssText = "position:fixed;left:8px;bottom:8px;z-index:9998;padding:4px 8px;border-radius:6px;background:#7A2E0E;color:#fff;font:700 12px/1.2 system-ui,sans-serif;pointer-events:none;letter-spacing:.04em";
    document.body.appendChild(tag);
    document.title = "[Preview] " + document.title;
  }
})();
