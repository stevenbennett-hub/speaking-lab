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
// Beyond the Podium: every English/Spanish pair in each episode file, grouped by stage, plus missing media.
const pairs = (o, where, rows) => {
  if (Array.isArray(o)) { o.forEach((x, i) => pairs(x, `${where} ${i + 1}`, rows)); return rows; }
  if (!o || typeof o !== "object") return rows;
  if ("en" in o && "es" in o && (typeof o.en === "string" || Array.isArray(o.en))) { const f = x => (Array.isArray(x) ? x.join("\n") : x || ""); rows.push([where.trim(), f(o.en), f(o.es)]); return rows; }
  for (const [k, v] of Object.entries(o)) if (!["media", "status", "evidence", "nodes"].includes(k) || k === "nodes") pairs(v, `${where} ${k === "nodes" ? "" : k}`, rows);
  return rows;
};
out.btp = J("studios.json").experiences.filter(x => x.episode).map(x => {
  const ep = J(x.episode.replace(/^data\//, ""));
  const m = ep.media, miss = [[m.video, "film"], [m.poster, "thumbnail"], [m.captions.en, "English captions"], [m.captions.es, "Spanish captions"]].filter(([f]) => !f.available).map(([f, w]) => `${w}: site/${f.src}`);
  return { title: `${ep.series.en}, Episode ${ep.episode}: ${ep.title.en}`, status: ep.status, missing: miss,
    sections: [["Episode", pairs({ series: ep.series, title: ep.title, label: ep.label, frames: ep.frames, vocabulary: ep.vocab }, "", [])],
      ["Transcript", ep.transcript.map(l => [l.speaker, l.en, l.es])],
      ...ep.stages.map((st, i) => [`Stage ${i + 1}: ${st.title.en}`, pairs(st, "", [])])] };
});
// AI Coaching Studio and the AI permission levels (slice 7).
const AIS = J("ai-studio.json"), PERM = J("ai-permissions.json");
out.ai = { status: AIS.status, sections: [
  ["AI permission levels (students see these)", PERM.levels.flatMap(l => [[`${l.id}: name`, l.name.en, l.name.es], [`${l.id}: short`, l.short.en, l.short.es], [`${l.id}: explanation`, l.explain.en, l.explain.es]])],
  ["Studio front page", pairs({ title: AIS.title, tagline: AIS.tagline, principle: AIS.principle, promise: AIS.promise, noLiveAi: AIS.noLiveAi, vocabulary: AIS.vocab, frames: AIS.frames }, "", [])],
  ["Cognitive Ownership", pairs(AIS.ownership, "", [])],
  ["AI Literacy Academy", pairs(AIS.academy, "", [])],
  ["Think first: Speech Coach questions", pairs(AIS.coach, "", [])],
  ["Prompt Library (students copy these into an approved AI tool)", pairs(AIS.prompts, "", [])],
  ["AI Ethics Lab", pairs(AIS.ethics, "", [])],
  ["AI Fact Checker (simulated)", pairs(AIS.factcheck, "", [])],
  ["AI-use disclosure", pairs(AIS.disclosure, "", [])],
] };
process.stdout.write(JSON.stringify(out));
