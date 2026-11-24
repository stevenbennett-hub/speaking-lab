// Builds the data bundle for the teacher content review (objectives, journals, Spanish, college notice,
// pacing lines without Spanish). Usage: node tests/tools/content-review.mjs > /tmp/review.json
// then: python3 tests/tools/content-review.py /tmp/review.json "Speaking Lab Content Review.docx"
import { readFileSync } from "node:fs";
import { pageSource, constValue } from "../lib/page-constants.mjs";
const J = f => JSON.parse(readFileSync(new URL(`../../site/data/${f}`, import.meta.url), "utf8"));
const src = pageSource(), ES = constValue(src, "ES"), norm = x => x.replace(/\s+/g, " ").trim();
const hasEs = t => !!(ES[norm(t)] || (t.startsWith("SPEECH ") && ES[norm(t.slice(7))]));
const notice = src.match(/<p>(College Public Speaking is reserved[^<]+)<\/p>/)[1];
const units = J("units.json").units, pace = J("pacing.json").weeks, lessons = J("lessons.json"), journals = J("journals.json");
const missing = [];
for (const [w, days] of Object.entries(pace)) days.forEach((d, k) => {
  const v = Array.isArray(d) ? [["High school", d[0]], ["College", d[1]]] : [["Both", d]];
  v.forEach(([who, t]) => { if (!hasEs(t)) missing.push({ week: Number(w), day: k + 1, who, text: t }); });
});
const out = {
  generated: new Date().toISOString().slice(0, 10),
  notice: { en: notice, es: ES[norm(notice)] || "" },
  lessonsStatus: lessons.status,
  missing,
  units: units.map(u => ({
    id: u.id, title: u.title, weeks: u.weeks,
    days: u.weeks.flatMap(w => pace[w].map((d, k) => ({ week: w, day: k + 1, pacing: Array.isArray(d) ? { hs: d[0], col: d[1] } : { both: d }, lesson: lessons.days[`w${String(w).padStart(2, "0")}d${k + 1}`] }))),
    journals: journals.journals.filter(j => j.unit === u.id),
  })),
};
process.stdout.write(JSON.stringify(out));
