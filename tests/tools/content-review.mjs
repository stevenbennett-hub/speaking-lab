// Builds the data bundle for the teacher content review (Slice 10: + caption/description tracks, achievements, typed-journal notice, Ad Detective labels) (objectives, journals, Spanish, college notice,
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
  generated: new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" }), // Central Time, like the site
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
  // Slice 10: timed tracks for review, cue by cue (English | Spanish), with their review flags.
  const vtt = f => { try { return readFileSync(new URL(`../../site/${f}`, import.meta.url), "utf8").split(/\r?\n\r?\n/).map(b => b.split(/\r?\n/)).filter(b => b.some(l => l.includes("-->"))).map(b => { const i = b.findIndex(l => l.includes("-->")); return { t: b[i].split(" --> ")[0], text: b.slice(i + 1).join(" ") }; }); } catch (e) { return []; } };
  const both = (a, b) => a.map((c, i) => [c.t, c.text, (b[i] || {}).text || ""]);
  const tracks = [];
  if (m.captions.es && m.captions.es.available) tracks.push([`Spanish captions (draft; reviewed: ${!!m.captions.es.reviewed})`, both(vtt(m.captions.en.src), vtt(m.captions.es.src))]);
  if (m.descriptions && m.descriptions.en && m.descriptions.en.available) tracks.push([`Visual descriptions (read aloud on request; English reviewed: ${!!m.descriptions.en.reviewed}, Spanish reviewed: ${!!(m.descriptions.es && m.descriptions.es.reviewed)})`, both(vtt(m.descriptions.en.src), m.descriptions.es && m.descriptions.es.available ? vtt(m.descriptions.es.src) : [])]);
  return { title: `${ep.series.en}, Episode ${ep.episode}: ${ep.title.en}`, status: ep.status, missing: miss,
    sections: [["Episode", pairs({ series: ep.series, title: ep.title, label: ep.label, frames: ep.frames, vocabulary: ep.vocab }, "", [])],
      ["Transcript", ep.transcript.map(l => [l.speaker, l.en, l.es])],
      ...ep.stages.map((st, i) => [`Stage ${i + 1}: ${st.title.en}`, pairs(st, "", [])]), ...tracks] };
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
// Research & Academic Integrity Studio and APA Academy (slice 8).
const RS = J("research-studio.json");
out.research = { status: RS.status, apa: RS.apa.rules.map(r => ({ topic: r.topic.en, rule: r.rule.en, src: r.src })), checked: RS.apa.checked, sections: [
  ["Studio front page and AI links", pairs({ title: RS.title, tagline: RS.tagline, principle: RS.principle, fictional: RS.fictional, noAuto: RS.noAuto, ai: RS.ai, vocabulary: RS.vocab, frames: RS.frames }, "", [])],
  ["Source Detective", pairs(RS.sources, "", [])],
  ["Evidence Explorer (with the ProCon.org guide)", pairs(RS.evidence, "", [])],
  ["Plagiarism Investigator", pairs(RS.integrity, "", [])],
  ["Paraphrasing Workshop", pairs(RS.paraphrase, "", [])],
  ["Citation Builder", pairs(RS.cite, "", [])],
  ["Speech Research Portfolio", pairs(RS.portfolio, "", [])],
  ["APA Academy (college pathway): text and challenges", pairs({ intro: RS.apa.intro, notice: RS.apa.notice, oralVsWritten: RS.apa.oralVsWritten, challenges: RS.apa.challenges }, "", [])],
] };
// Slice 10: achievements (no approval field exists for these; all are unreviewed), typed-journal notice, Ad Detective labels.
const ACH = J("achievements.json");
out.achievements = [
  ...Object.entries(ACH.levels).map(([k, v]) => [`Level: ${k}`, `${v.en}: ${v.about.en}`, `${v.es}: ${v.about.es}`]),
  ...ACH.badges.flatMap(b => [[`${b.title.en} (${b.status})`, `${b.title.en}: ${b.about.en}`, `${b.title.es}: ${b.about.es}`], ...b.criteria.map(c => [`  criterion (${c.type})`, c.label.en, c.label.es])]),
];
const stu = readFileSync(new URL("../../site/js/student.js", import.meta.url), "utf8");
const facts = stu.slice(stu.indexOf("const JOURNAL_FACTS = ["), stu.indexOf("];", stu.indexOf("const JOURNAL_FACTS = [")));
out.journalFacts = [...facts.matchAll(/\["([^"]+)", "([^"]+)"\]/g)].map((x, i) => [`Fact ${i + 1}`, x[1], x[2]]);
// Instructor Playbook (teacher-facing): status of each unit's playbook, plus the Unit 1 review notes (suggestions, not applied).
out.playbook = [1, 2, 3, 4, 5, 6].map(u => { try { const pb = J(`playbook/unit-${u}.json`); return { unit: u, status: pb.status, updated: pb.updated, title: pb.overview.title, days: Object.entries(pb.lessons).map(([k, l]) => [k, l.title]), videos: pb.videos.map(v => [v.title, v.channel, v.segment.verified ? "verified" : "segment not verified"]) }; } catch (e) { return null; } }).filter(Boolean);
try {
  const md = readFileSync(new URL("../../docs/playbook/UNIT1_CONTENT_REVIEW.md", import.meta.url), "utf8");
  const tables = md.split(/\n## /).slice(1).map(sec => ({ title: sec.split("\n")[0], rows: sec.split("\n").filter(l => /^\| /.test(l) && !/^\| (Where|---)/.test(l)).map(l => l.split("|").slice(1, -1).map(c => c.trim().replace(/\*\*/g, ""))) })).filter(t => t.rows.length);
  out.playbookReview = tables;
} catch (e) {}
// Ad Detective (separate repository): pass its dev src/app.js path as the first argument to include the new labels.
if (process.argv[2]) {
  const app = readFileSync(process.argv[2], "utf8"), keys = ["mastery", "masteryP", "ofCh", "ownOk", "shownNote", "retryLater", "retry", "caseMastered", "previewBar"];
  out.adDetective = keys.map(k => { const m2 = app.match(new RegExp(`\\b${k}: \\["((?:[^"\\\\]|\\\\.)*)", "((?:[^"\\\\]|\\\\.)*)"\\]`)); return m2 ? [k, m2[1], m2[2]] : [k, "(not found)", ""]; });
}
process.stdout.write(JSON.stringify(out));
