// Slice 11 navigation: Today's Lesson replaces Start, Units leaves the header, reference sections live under one
// Resources menu, teacher tools sit with the utility controls, and every old link keeps working.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pageSource, constValue } from "./lib/page-constants.mjs";

const read = p => readFileSync(new URL(p, import.meta.url), "utf8");
const page = read("../site/index.html"), student = read("../site/js/student.js");
const nav = page.slice(page.indexOf('<nav class="links"'), page.indexOf("</nav>", page.indexOf('<nav class="links"')));
const top = [...nav.replace(/<span class="navmore-list"[\s\S]*?<\/span><\/span>/, "").matchAll(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g)].map(m => [m[1], m[2]]);
const menu = [...nav.slice(nav.indexOf('id="navMoreList"'), nav.indexOf("</span></span>", nav.indexOf('id="navMoreList"'))).matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)].map(m => [m[1], m[2]]);

test("primary student navigation: Today's Lesson, My Course, Learning Labs, Resources, My Achievements", () => {
  assert.deepEqual(top, [["#/today", "Today’s Lesson"], ["#/", "My Course"], ["#labs", "Learning Labs"], ["#/achievements", "My Achievements"]]);
  assert.ok(nav.indexOf('href="#labs"') < nav.indexOf("navmore-btn") && nav.indexOf("navmore-btn") < nav.indexOf('href="#/achievements"'), "Resources sits between Learning Labs and My Achievements");
  assert.doesNotMatch(nav, />Start</, "Start is gone"); assert.doesNotMatch(nav, /href="#units"/, "Units is gone from the header");
  assert.match(page, /<h2 id="labsH">Learning Labs<\/h2>/, "the section heading matches the header");
});

test("Resources consolidates the textbook, videos, model speeches and reference sections", () => {
  assert.deepEqual(menu.map(m => m[0]), ["#resources", "#videos", "#speeches", "#rubrics", "#dates", "#pacing", "#top", "#references", "#about"]);
  for (const [h] of menu) assert.ok(page.includes(`id="${h.slice(1)}"`), `${h} still exists on the page`);
  assert.match(nav, /<button type="button" class="navmore-btn" aria-expanded="false" aria-controls="navMoreList">/);
  assert.match(nav, /<span class="sr">Resources menu<\/span>/, "the button has a clear accessible name");
  assert.match(student, /e\.key === "Escape" && !moreList\.hidden\) \{ setMore\(false\); moreBtn\.focus\(\); \}/, "Escape closes and returns focus");
  assert.match(read("../site/css/student.css"), /@media \(max-width: 720px\) \{ \.navmore-btn \{ display: none; \} \.navmore, \.navmore-list, \.navmore-list\[hidden\] \{ display: contents; \} \}/, "narrow screens show the items inline");
});

test("bilingual labels for every navigation item", () => {
  const ES = constValue(pageSource(), "ES");
  for (const t of ["Today’s Lesson", "My Course", "Learning Labs", "My Achievements", "Resources", "Resources menu", "Textbook and tools", "Example videos", "Voices of Change", "Rubrics", "Due dates", "Pacing guide", "Course map", "References", "About"]) assert.ok(ES[t], `Spanish for "${t}"`);
  assert.match(student, /"#\/today": \["Today’s Lesson", "Lección de hoy"\]/);
  assert.match(student, /L\("Teacher tools", "Herramientas del maestro"\)/);
});

test("Today's Lesson: onboarding for first-time students, the scheduled lesson for returning students", () => {
  assert.match(student, /if \(p\[0\] === "today"\) return \{ name: "today" \};/);
  assert.match(student, /if \(!path\(\)\) \{ afterStart = "#\/today"; route = \{ name: "start" \}; return null; \}/, "no pathway yet → the existing pathway choice, then back");
  assert.match(student, /return cur && unitOpen\(cur\) \? `#\/unit\/\$\{cur\}` : "#\/";/, "the current unit's Today page (it asks for class periods if needed); My Course when no unit is open");
  assert.match(student, /if \(route\.name === "today"\) \{ const to = todayTarget\(\); if \(to\) \{ location\.replace\(to\); return; \} \}/, "replace: Back doesn't bounce");
  // Scheduling is not reimplemented: currentUnitId/unitOpen use the calendar, groups, releases, overrides and ?date=.
  assert.doesNotMatch(student.slice(student.indexOf("function todayTarget"), student.indexOf("function classic")), /calendar|chicagoToday|semester/);
});

test("teacher tools stay separate from student navigation; old links keep working", () => {
  assert.match(student, /tm\.className = "themesw navteacher"/, "styled like the utility buttons");
  assert.match(student, /util\.parentNode\.insertBefore\(tm, util\)/, "placed with My work, not in the nav");
  assert.match(student, /if \(teacherOn\(\) && !tm && util\)/, "only in teacher view");
  // Classic section ids and the scroll-spy still exist for every old link.
  for (const id of ["top", "map", "units", "labs", "speeches", "rubrics", "dates", "pacing", "videos", "resources", "references", "about"]) assert.ok(page.includes(`id="${id}"`), id);
  assert.match(page, /videos: "#videos", resources: "#resources", alignment: "#resources", references: "#references"/);
  assert.match(page, /<a class="brand" href="#top"/, "the brand still returns to the course map");
});
