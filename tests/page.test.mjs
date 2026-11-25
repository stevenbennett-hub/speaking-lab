// Safety checks on the live single-file page.
import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { pageSource, constSource } from "./lib/page-constants.mjs";

const src = pageSource();
const NOTICE = "College Public Speaking is reserved for instructor-authorized college-level instruction. Access to these learning materials does not constitute college enrollment, concurrent enrollment approval, or eligibility to receive college credit. Students must satisfy all applicable school district and partnering college enrollment requirements.";

test("every inline script still parses", () => {
  const scripts = [...src.matchAll(/<script(?: type="text\/x-speakup")?>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  assert.ok(scripts.length >= 25);
  scripts.forEach((code, i) => assert.doesNotThrow(() => new vm.Script(code), `script ${i}`));
});

test("the college gate shows the exact required notice, in English and Spanish", () => {
  assert.ok(src.includes(`<p>${NOTICE}</p>`));
  assert.ok(src.includes(`"${NOTICE}": "`), "Spanish translation entry");
});

test("the college pathway is off by default (fail-closed), set only in access.json", () => {
  const access = JSON.parse(readFileSync(new URL("../site/data/access.json", import.meta.url), "utf8"));
  assert.equal(access.college.enabled, false);
  assert.match(src, /const COL_ENABLED = !!\(SL_DATA\.access && SL_DATA\.access\.college && SL_DATA\.access\.college\.enabled === true\);/);
  assert.match(src, /const COL_HASH = SL_DATA\.access\.college\.codeHash;/);
});

test("with college off, even a stored unlock cannot open the college view", () => {
  const store = new Map();
  const ctx = SL_DATA => ({ SL_DATA, localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) }, TextEncoder });
  const line = n => src.match(new RegExp(`^const ${n}[^\\n]*$`, "m"))[0];
  const fn = src.match(/^function colHash[^\n]*$/m)[0];
  for (const enabled of [false, true, "true", undefined]) {
    const code = [line("COL_ENABLED"), line("COL_HASH"), fn, line("colUnlocked"), `({ COL_HASH, colUnlocked })`].join("\n");
    const g = vm.runInNewContext(code, ctx({ access: { college: { enabled, codeHash: "08fade53" } } }));
    store.set("speakup-col-ok", g.COL_HASH);
    assert.equal(g.colUnlocked(), enabled === true, `enabled=${enabled}`);
  }
  assert.ok(/function setLevel\(l\) \{\n  if \(l === "col" && !colUnlocked\(\)\) l = "hs";/.test(src), "setLevel guards every route");
});

test("load order: schedule engine first, page scripts wait, boot loader last", () => {
  const sched = src.indexOf('<script src="js/schedule.js"></script>');
  const firstWait = src.indexOf('<script type="text/x-speakup">');
  const boot = src.indexOf('<script src="js/boot.js"></script>');
  assert.ok(sched > 0 && sched < firstWait, "schedule.js before page scripts");
  assert.ok(boot > src.lastIndexOf('<script type="text/x-speakup">'), "boot.js after page scripts");
  assert.equal([...src.matchAll(/<script>/g)].length, 1, "only the tiny theme script runs before the data loads");
});

test("today means the America/Chicago date everywhere the schedule is checked", () => {
  assert.ok(!/new Date\(\); \w+\.setHours\(0, 0, 0, 0\)/.test(src), "no laptop-clock 'today'");
  assert.match(src, /function todayDate\(\) \{ const \[y, m, d\] = SLSchedule\.chicagoToday\(\)/);
});
