// One-time tool: records what the ORIGINAL page code (tag v1-live-2026-11-23) computes for course weeks and
// class dates, so tests can prove the new schedule module gives identical results.
// Run with Chicago local time:  git show v1-live-2026-11-23:site/index.html > /tmp/v1.html
//                               TZ=America/Chicago node tests/tools/make-golden.mjs /tmp/v1.html
import { readFileSync, writeFileSync } from "node:fs";
import vm from "node:vm";
import { constSource } from "../lib/page-constants.mjs";

const src = readFileSync(process.argv[2], "utf8");
const cut = (a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); if (i < 0 || j < 0) throw new Error(a); return src.slice(i, j); };
const block = cut("const isoD = d =>", "const groupLabel =");
const parse = cut("const parseD = s =>", "const fmtD =");
const ctx = vm.createContext({ localStorage: { getItem: () => null }, Math, Date, JSON, String, Number });
vm.runInContext([
  `const NO_SCHOOL = ${constSource(src, "NO_SCHOOL")};`,
  `const PRESETS = ${constSource(src, "PRESETS")};`,
  `const SEM_END = ${constSource(src, "SEM_END")};`,
  `let classGroup = "";`, parse, block,
].join("\n"), ctx);

const iso = d => vm.runInContext("isoD", ctx)(d);
const range = (a, b) => { const out = []; for (let d = new Date(a + "T12:00:00"); ; d.setDate(d.getDate() + 1)) { const s = iso(d); if (s > b) break; out.push(s); } return out; };
const starts = [...range("2026-08-03", "2026-09-04"), ...range("2026-12-28", "2027-02-05")];
const cases = {};
for (const s of starts) {
  const r = vm.runInContext(`startDate = ${JSON.stringify(s)}; _cw = { k: null, v: null }; (() => {
    const v = courseWeeks(), I = a => a.map(isoD);
    return { pre: v.pre && I(v.pre), weeks: v.weeks.map(I), breaks: v.breaks.map(b => ({ after: b.after, start: isoD(b.start), end: isoD(b.end), r: b.r })),
      flex: v.flex.map(I), finals: v.finals && I(v.finals), mons: I(v.mons),
      odd: I(lessonDates("odd")), even: I(lessonDates("even")) };
  })()`, ctx);
  cases[s] = r;
}
// Wednesday group for every Wednesday of the school year.
const weds = range("2026-08-05", "2027-06-02").filter(s => new Date(s + "T12:00:00").getDay() === 3);
const wed = Object.fromEntries(weds.map(s => [s, vm.runInContext(`groupOfDay(parseD(${JSON.stringify(s)}))`, ctx)]));
writeFileSync(new URL("../fixtures/calendar-golden.json", import.meta.url), JSON.stringify({ source: "tag v1-live-2026-11-23, TZ=America/Chicago", wed, cases }) + "\n");
console.log(`starts: ${starts.length}, wednesdays: ${weds.length}`);
