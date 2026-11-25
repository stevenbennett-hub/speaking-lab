// RC2 usability refinements: the course welcome on My Course, Course Essentials, The History & Voices of Wyandotte,
// the legacy navigation audit (no student view links to #top) and checklist access from individual lessons.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = p => readFileSync(new URL(p, import.meta.url), "utf8");
const course = read("../site/js/course.js"), student = read("../site/js/student.js"), app = read("../site/js/app.js"), ck = read("../site/js/checklist.js"), page = read("../site/index.html");

test("welcome video access: the existing video, captions and transcript, shown in place and never autoplayed", () => {
  assert.match(page, /<figure class="welcome-vid" id="welcomeFig">\s*<video id="welcomeVid" controls preload="none" playsinline poster="media\/welcome-poster\.jpg"/, "the original element, unchanged except for its id");
  assert.match(page, /<track kind="captions" srclang="en" label="English" src="media\/welcome\.en\.vtt" default>/);
  assert.match(page, /<track kind="captions" srclang="es" label="Español" src="media\/welcome\.es\.vtt">/);
  assert.match(course, /X\.host\("welcomeFig", v\);/, "moved in with SL2.host, not recreated");
  assert.doesNotMatch(course, /<video|\.play\(\)|autoplay="/, "no new video element and no autoplay");
  assert.match(course, /vid\.removeAttribute\("autoplay"\); vid\.autoplay = false; vid\.preload = "none";/);
  assert.match(course, /if \(!d\.open\) pauseWelcome\(\);/); assert.match(course, /window\.addEventListener\("hashchange", pauseWelcome\);/);
  assert.match(course, /X\.host\("aboutBio", \$id\("cw-slot-bio"\)\); X\.host\("aboutPhilo", \$id\("cw-slot-philo"\)\);/, "instructor introduction and philosophy from the About section");
  assert.match(course, /Continue to Today’s Lesson/);
  assert.match(course, /const open = opts\.always \|\| get\(WKEY\) !== "closed";/, "collapsible; remembered in this browser");
  assert.match(student, /\$\{window\.SLCourse \? SLCourse\.welcome\(\) : ""\}\n      \$\{achLink\(\)\}/, "near the top of My Course, after the Today button");
});

test("course information navigation: six Course Essentials sections, from existing content only", () => {
  for (const id of ["overview", "grading", "expectations", "schedule", "ai", "progress"]) assert.match(course, new RegExp(`\\{ id: "${id}", icon:`));
  assert.match(course, /X\.addRoute\("course", \{ view: viewCourse, after: afterCourse \}\);/);
  assert.match(course, /const HOSTS = \{ overview: \{ why: \["courseLede", "courseWhy"\], host: \["map", "about"\] \}, schedule: \{ host: \["dates"\] \} \};/);
  assert.match(course, /window\.SL_EXPECT \|\| \[\], norms = window\.SL_NORMS/, "expectations come from the labs' own lists");
  assert.match(page, /window\.SL_EXPECT = EXP\.map\(e => \(\{ id: e\.id, n: e\.n, note: e\.note \|\| null \}\)\);/);
  assert.match(course, /Grading weights and other grading policies are not listed in Speaking Lab\. Check Canvas and ask Mr\. Bennett\./, "no invented grading policy");
  assert.match(course, /const pts = a\.meta\.find\(x => \/points\$\/i\.test\(x\)\);/, "points only from units.json");
  assert.match(course, /filter\(a => a\.status === "approved"\)/, "only approved checklist assessments are listed as graded");
  assert.match(course, /Weekly Grading Checkpoint/); assert.match(course, /My Learning Checklist/);
  assert.match(course, /Canvas is the official gradebook/);
  assert.doesNotMatch(course, /late work|tardy|participation grade|percent of your grade|\d+ ?%/i, "no grading weights or new policies");
});

test("legacy navigation: no student view links to #top; in-app section links stay in the application; bookmarks still work", () => {
  for (const [name, src] of [["student.js", student], ["app.js", app], ["course.js", course], ["checklist.js", ck]]) assert.doesNotMatch(src, /href="#top"/, name);
  assert.match(student, /<a href="#\/course">\$\{L\("Watch Mr\. Bennett's welcome video and read the course essentials"/);
  assert.match(student, /const IN_APP = \{ top: "#\/course", main: "#\/course", map: "#\/course\/overview", about: "#\/course\/overview", units: "#\/", dates: "#\/resources\/dates", pacing: "#\/resources\/pacing", rubrics: "#\/resources\/rubrics", videos: "#\/resources\/videos", speeches: "#\/resources\/speeches", resources: "#\/resources\/textbook", references: "#\/resources\/research", labs: "#\/labs" \};/);
  assert.match(student, /if \(route && !root\.hidden && inApp\) \{ location\.replace\(inApp\); return; \}\n      classic\(\); return;/, "only clicks inside the application are redirected; a first load (bookmark) still opens the classic page");
  for (const id of ["top", "map", "units", "labs", "speeches", "rubrics", "dates", "pacing", "videos", "resources", "references", "about"]) assert.match(page, new RegExp(`id="${id}"`), `classic section #${id} kept`);
  assert.match(app, /\{ id: "wyandotte", go: \(\) => "#\/wyandotte"/, "secondary link in Resources");
});

test("The History & Voices of Wyandotte: existing materials only, beneath the units, no new navigation tab", () => {
  assert.match(course, /The History & Voices of Wyandotte/); assert.match(course, /Our School\. Our Stories\. Our Voices\./);
  assert.match(course, /X\.host\("wyPhoto", \$id\("wy-slot-photo"\)\);/); assert.match(course, /X\.host\("wyVoices", \$id\("wy-slot-voices"\)\);/);
  assert.match(page, /<figure class="start-fig" id="wyPhoto">/); assert.match(page, /<div class="wvoices" id="wyVoices" data-notr><\/div>/);
  const home = student.slice(student.indexOf("function viewHome()"), student.indexOf("function tile("));
  assert.ok(home.indexOf("SLCourse.feature()") > home.indexOf('class="sl2-tiles'), "feature card is beneath the curriculum units");
  assert.doesNotMatch(course, /\b(18|19)\d\d\b/, "no historical dates or facts written here (they come from the page's own captions and Voices)");
  assert.match(read("../site/js/student.js"), /const NAV = \{ "#\/today": \["Today’s Lesson", "Lección de hoy"\], "#\/": \["My Course", "Mi curso"\], "#\/calendar": \["Calendar", "Calendario"\], "#\/labs": \["Learning Labs", "Laboratorios"\], "#\/resources": \["Resources", "Recursos"\], "#\/achievements": \["My Achievements", "Mis logros"\] \};/, "no Wyandotte tab; the six destinations (Calendar added by the calendar brief)");
});

test("checklist access from individual lessons: that lesson's own tasks and links to Today / This Week", () => {
  assert.match(ck, /const m = S\.meetings\(X\.opts\(g\)\)\.find\(x => x\.date === day\); if \(!m\) return "";/, "the lesson's own class meeting");
  assert.match(ck, /These belong to this lesson’s class day, not to today\./);
  assert.match(ck, /data-ck-goto="today"/); assert.match(ck, /data-ck-goto="week"/);
  assert.match(ck, /VIEW = gt\.dataset\.ckGoto === "week" \? "week" : "today";/);
  assert.match(student, /SLChecklist\.lessonSummary && !\(route && route\.name === "today"\) \? SLChecklist\.lessonSummary\(day\) : ""/, "no duplicate on Today's Lesson, which has the full checklist");
});

test("student and teacher views stay separate; privacy kept", () => {
  const welcome = course.slice(course.indexOf("function welcome("), course.indexOf("function mountWelcome("));
  assert.doesNotMatch(welcome, /teacher|#\/present|Lesson Manager/i, "no teacher tools in the student welcome");
  assert.match(course, /\$\{X\.teacherOn\(\) \? `<p class="sl2-teachnote" role="note">/, "the Wyandotte materials note is teacher-only");
  assert.doesNotMatch(course, /fetch\(|XMLHttpRequest|sendBeacon|sessionStorage|document\.cookie/);
  const writes = [...course.matchAll(/put\((\w+),/g)].map(m => m[1]);
  assert.deepEqual([...new Set(writes)], ["WKEY"], "stores only whether the welcome is collapsed");
  assert.match(course, /const WKEY = "speakup-welcome-v1";/);
});
