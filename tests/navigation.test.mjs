// Navigation. Slice 11: Today's Lesson replaced Start, Units left the header, teacher tools sit with the utility
// controls, every old link keeps working. Slice 12 (assertions updated, protections kept): the five destinations are
// dedicated application views (#/today, #/, #/labs, #/resources, #/achievements); the Resources dropdown became the
// Resources library; the High School/College switch, My work and Dark mode moved into Preferences.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pageSource, constValue } from "./lib/page-constants.mjs";

const read = p => readFileSync(new URL(p, import.meta.url), "utf8");
const page = read("../site/index.html"), student = read("../site/js/student.js"), app = read("../site/js/app.js");
const header = page.slice(page.indexOf("<header>"), page.indexOf("</header>"));
const nav = page.slice(page.indexOf('<nav class="links"'), page.indexOf("</nav>", page.indexOf('<nav class="links"')));
const top = [...nav.matchAll(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g)].map(m => [m[1], m[2]]);

test("primary student navigation: six dedicated application destinations", () => {
  // Updated assertion (RC2, approved): Calendar added between My Course and Learning Labs.
  assert.deepEqual(top, [["#/today", "Today’s Lesson"], ["#/", "My Course"], ["#/calendar", "Calendar"], ["#/labs", "Learning Labs"], ["#/resources", "Resources"], ["#/achievements", "My Achievements"]]);
  assert.doesNotMatch(nav, />Start</, "Start is gone"); assert.doesNotMatch(nav, /href="#units"/, "Units is gone from the header");
  assert.doesNotMatch(nav, /href="#labs"|href="#resources"/, "no header link returns students to the classic landing page");
  assert.match(page, /<h2 id="labsH">Learning Labs<\/h2>/, "the classic section heading still matches");
  for (const r of ["labs", "resources", "preferences"]) assert.match(app, new RegExp(`X\\.addRoute\\("${r}"`), `#/${r} is an application view`);
});

test("the header holds the identity, five destinations, language and Preferences; no pathway switch", () => {
  const visible = header.slice(0, header.indexOf('id="hdrHold"'));
  assert.doesNotMatch(visible, /data-level="col"|data-level="hs"|class="level"/, "the High School / College switch left the header");
  assert.match(header, /<div class="hdrhold" id="hdrHold" hidden>[\s\S]*id="lvl-col" data-level="col"/, "the original controls stay (hidden) so the college gate's handlers still work");
  assert.match(visible, /class="langsw"/, "language stays one click away");
  assert.match(visible, /<a class="themesw prefbtn" href="#\/preferences"/);
  assert.match(visible, /id="soundBtn" hidden/, "the mute button shows only while sound is on");
  assert.match(page, /<a class="brand" href="#\/"/, "the brand opens My Course, not the classic landing page");
});

test("bilingual labels for every navigation item", () => {
  const ES = constValue(pageSource(), "ES");
  for (const t of ["Today’s Lesson", "My Course", "Calendar", "Learning Labs", "My Achievements", "Resources"]) assert.ok(ES[t], `Spanish for "${t}"`);
  assert.match(student, /"#\/today": \["Today’s Lesson", "Lección de hoy"\]/);
  assert.match(student, /"#\/labs": \["Learning Labs", "Laboratorios"\]/);
  assert.match(student, /"#\/resources": \["Resources", "Recursos"\]/);
  assert.match(student, /L\("Preferences", "Preferencias"\)/);
  assert.match(student, /L\("Teacher tools", "Herramientas del maestro"\)/);
});

test("Today's Lesson: onboarding for first-time students, the scheduled lesson for returning students", () => {
  assert.match(student, /if \(p\[0\] === "today"\) return \{ name: "today" \};/);
  assert.match(student, /if \(!path\(\)\) \{ afterStart = "#\/today"; route = \{ name: "start" \}; return null; \}/, "no pathway yet → the existing pathway choice, then back");
  assert.match(student, /if \(cur && unitOpen\(cur\)\) \{ route = \{ name: "today", id: cur \}; return null; \}/, "the current unit's lesson, shown in its own view");
  assert.match(student, /return "#\/";\n  \}/, "My Course when no unit is open");
  assert.match(student, /route\.name === "today" \? viewTodayPage\(\)/);
  assert.match(student.slice(student.indexOf("function viewTodayPage"), student.indexOf("function dayParts")), /viewToday\(u\)/, "same schedule logic as the unit's Today tab");
  assert.doesNotMatch(student.slice(student.indexOf("function todayTarget"), student.indexOf("function classic")), /calendar|chicagoToday|semester/, "scheduling is not reimplemented");
});

test("Learning Labs: dedicated route, lab opened inside the application, return navigation", () => {
  assert.match(app, /X\.host\("labs", slot\)/, "the page's own lab moves in (no copy)");
  assert.match(app, /href="#\/labs">← \$\{L\("Learning Labs"/, "return to Learning Labs");
  assert.match(app, /<a href="#\/today">\$\{L\("Today’s Lesson"/, "and to Today's Lesson");
  assert.match(student, /if \(lb && route && !root\.hidden\) \{ location\.hash = `#\/labs\/\$\{lb\.dataset\.sl2Lab\}`; return; \}/, "lab buttons in Today's Lesson open the lab in Learning Labs");
  assert.match(student, /if \(route && !root\.hidden && tgt && root\.contains\(tgt\) && !homes\[tgt\.id\]\) return;/, "in-page links inside a hosted lab stay in the view");
  assert.match(student, /const putHome = /, "hosted sections go back to the classic page");
});

test("Resources: a library of existing sections, not copies", () => {
  for (const id of ["resources", "videos", "speeches", "rubrics", "references", "pacing", "dates", "map", "about"]) assert.match(app, new RegExp(`host: \\[[^\\]]*"${id}"`), id);
  assert.match(app, /a\.host\.forEach\(id => X\.host\(id, slot\)\)/);
  assert.match(app, /id="appResQ" type="search"/, "search");
});

test("teacher tools stay separate from student navigation; old links keep working", () => {
  assert.match(student, /tm\.className = "themesw navteacher"/, "styled like the utility buttons");
  assert.match(student, /util = document\.querySelector\("header \.prefbtn"\)/, "placed with Preferences, not in the nav");
  assert.match(student, /util\.parentNode\.insertBefore\(tm, util\)/);
  assert.match(student, /if \(teacherOn\(\) && !tm && util\)/, "only in teacher view");
  for (const id of ["top", "map", "units", "labs", "speeches", "rubrics", "dates", "pacing", "videos", "resources", "references", "about"]) assert.ok(page.includes(`id="${id}"`), id);
  assert.match(page, /videos: "#videos", resources: "#resources", alignment: "#resources", references: "#references"/);
  assert.match(student, /const isV2Hash = hs => hs === "" \|\| hs === "#" \|\| hs\.startsWith\("#\/"\);/, "classic hashes (#labs, #videos, #unit-3, Canvas links) still open the classic page");
});
