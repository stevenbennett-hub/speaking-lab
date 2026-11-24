// AI Coaching Studio (Slice 7): content rules, coaching-only prompts, permissions, mastery, Independent Thinker,
// privacy, progress preservation, and that the original AI Coach material is kept.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const read = p => readFileSync(new URL(p, import.meta.url), "utf8");
const json = p => JSON.parse(read(p));
const C = json("../site/data/ai-studio.json");
const P = json("../site/data/ai-permissions.json");
const cfg = json("../site/data/achievements.json");
const old = json("../src/content/aiCoach.json");
const AI = (() => { const c = {}; vm.runInNewContext(read("../site/js/aistudio.js"), c); return c.SLAI; })();
const A = (() => { const c = {}; vm.runInNewContext(read("../site/js/achievements.js"), c); return c.SLAchieve; })();
const plain = x => JSON.parse(JSON.stringify(x));
const fresh = () => AI.load(() => null);
const bi = (o, w) => assert.ok(o && typeof o.en === "string" && o.en.trim() && typeof o.es === "string" && o.es.trim(), `${w}: English and Spanish`);
const biList = (o, w) => assert.ok(o && Array.isArray(o.en) && o.en.length && Array.isArray(o.es) && o.es.length === o.en.length, `${w}: lists match`);
const okIdx = opts => opts.findIndex(o => o.ok);
const bad = opts => opts.findIndex(o => !o.ok);
const store = r => ({ get: k => (k === "speakup-ai-v1" ? JSON.stringify(r) : null), labs: {} });
const thinker = src => A.evaluate(cfg, src, null).find(r => r.id === "independent-thinker");

function solveAll(r) {
  for (const s of C.ownership.scenarios) r.own[s.id] = s.answer;
  for (const s of C.ethics.scenarios) r.eth[s.id] = { c: s.answer, r: okIdx(s.reasons) };
  for (const c of C.factcheck.claims) r.fc.claims[c.id] = c.answer;
  for (const s of C.factcheck.sources) { r.fc.src[s.id] = [...s.missing]; r.fc.real[s.id] = s.fake ? "notfound" : "real"; }
  r.fc.final = okIdx(C.factcheck.final.options);
}

test("studio content: title, principle, five ownership stages, bilingual and marked draft for review", () => {
  assert.equal(C.tagline.en, "Your Thinking. Your Voice.");
  assert.equal(C.principle.en, "AI is a coach, not an author.");
  assert.notEqual(C.status.es, "approved");
  assert.deepEqual(C.ownership.stages.map(s => s.name.en), ["Think", "Consult", "Evaluate", "Revise", "Own"]);
  for (const k of ["title", "tagline", "principle", "promise", "noLiveAi"]) bi(C[k], k);
  for (const s of C.ownership.stages) { bi(s.name, s.id); bi(s.what, s.id); bi(s.ask, s.id); }
  for (const s of C.ownership.scenarios) { bi(s.text, s.id); bi(s.why, s.id); assert.ok(["kept", "gave"].includes(s.answer)); assert.ok(C.ownership.stages.some(x => x.id === s.stage)); }
  assert.ok(C.ownership.scenarios.some(s => s.answer === "kept") && C.ownership.scenarios.some(s => s.answer === "gave"));
  for (const st of C.ownership.stages) assert.ok(C.ownership.scenarios.some(s => s.stage === st.id), `${st.id} has a scenario`);
  biList(C.frames, "frames");
});

test("AI Literacy Academy covers every required topic with a scenario-style check", () => {
  assert.deepEqual(C.academy.topics.map(t => t.id), ["what", "can", "offload", "independent", "agency", "halluc", "citations", "bias", "verify", "privacy", "integrity", "responsible", "disclose"]);
  for (const t of C.academy.topics) {
    bi(t.title, t.id); bi(t.explain, t.id); biList(t.points, t.id); bi(t.check.q, t.id); bi(t.check.why, t.id);
    assert.equal(t.check.options.filter(o => o.ok).length, 1, `${t.id}: one right answer`);
    t.check.options.forEach(o => bi(o.t, t.id));
  }
  for (const [k, v] of Object.entries(C.academy.college)) { bi(v, k); assert.ok(C.academy.topics.some(t => t.id === k), `college note ${k} attaches to a topic`); }
  assert.match(C.academy.topics.find(t => t.id === "integrity").explain.en, /no score and must be redone/, "matches the course integrity gate");
});

test("prompt library: all 19 categories, coaching only, clear when-to-use, safe placeholders", () => {
  const need = ["Topic exploration", "Socratic brainstorming", "Audience analysis", "Thesis evaluation", "Speech organization", "Outline feedback", "Research strategies", "Source evaluation", "Evidence analysis", "Persuasive reasoning", "Counterarguments", "Logical fallacies", "Grammar and spelling", "Vocabulary development", "Presentation anxiety", "Speech rehearsal", "Audience questions", "Self-reflection", "English language development"];
  assert.deepEqual(C.prompts.categories.map(c => c.name.en), need);
  const ids = new Set();
  for (const c of C.prompts.categories) { bi(c.name, c.id); assert.ok(C.prompts.items.some(p => p.cat === c.id), `${c.id} has a prompt`); }
  for (const p of C.prompts.items) {
    assert.ok(!ids.has(p.id)); ids.add(p.id);
    bi(p.title, p.id); bi(p.when, p.id); bi(p.text, p.id);
    assert.ok(["grammar", "coach"].includes(p.level), `${p.id}: no prompt needs expanded assistance`);
    if (p.level === "grammar") assert.ok(["grammar", "eld"].includes(p.cat), `${p.id}: only grammar/spelling help is allowed by default`);
    // Every prompt tells the AI what NOT to do with the student's work.
    assert.match(p.text.en, /\b(Do not|do not|Don.t)\b/, `${p.id}: EN guardrail`);
    assert.match(p.text.es, /\b[Nn]o (las |los )?(escribas|sugieras|me des|me digas|reescribas|elijas|respondas|agregues|me diagnostiques|cambies)\b/, `${p.id}: ES guardrail`);
    // It never asks AI to produce the student's work.
    assert.doesNotMatch(p.text.en, /\b(write|draft|create|generate) (my|a|the) (speech|outline|thesis|essay|introduction|conclusion)\b/i, p.id);
    for (const l of ["en", "es"]) for (const [, k] of p.text[l].matchAll(/\{(\w+)\}/g)) assert.ok(k === "level" || C.prompts.prep[k], `${p.id}: unknown placeholder {${k}}`);
    for (const k of p.prep) assert.ok(C.prompts.prep[k], `${p.id} prep ${k}`);
  }
  assert.ok(C.prompts.items.some(p => /one question at a time/i.test(p.text.en) && /do not rewrite my outline/i.test(p.text.en)), "Mr. Bennett's outline example is included");
  for (const [k, v] of Object.entries(C.prompts.prep)) bi(v, k);
  bi(C.prompts.prepNote, "prepNote"); assert.match(C.prompts.prepNote.en, /Nothing here is saved or sent anywhere/);
});

test("Think Before You Prompt fills the prompt without saving; empty answers stay as brackets", () => {
  const t = "I'm a {level} student. Topic: {topic}. Thesis: {thesis}. {unknown}";
  assert.equal(AI.fillPrompt(t, {}, false, false), "I'm a high school student. Topic: [my topic]. Thesis: [my thesis]. {unknown}");
  assert.equal(AI.fillPrompt(t, { topic: "  school lunch  " }, true, false), "I'm a college student. Topic: school lunch. Thesis: [my thesis]. {unknown}");
  assert.equal(AI.fillPrompt("{topic}", {}, false, true), "[mi tema]");
  assert.equal(AI.fillPrompt("{topic}", { topic: "x".repeat(900) }, false, false).length, 600, "long answers are trimmed");
  const src = read("../site/js/aistudio.js");
  assert.match(src, /prep\[id\] = t\.value;[^\n]*\/\/ not saved/);
  assert.doesNotMatch(src, /rec\.prep|put\([^)]*prep/, "preparation answers never go into storage");
});

test("permissions: the assignment decides which prompts may be copied", () => {
  const L = P.levels, can = (have) => ["grammar", "coach", "expanded"].filter(need => AI.allowed(L, need, have));
  assert.deepEqual(can("none"), []);
  assert.deepEqual(can("grammar"), ["grammar"]);
  assert.deepEqual(can("coach"), ["grammar", "coach"]);
  assert.deepEqual(can("expanded"), ["grammar", "coach", "expanded"]);
  assert.equal(AI.allowed(L, "none", "expanded"), false, "nothing ever needs level 'none'");
  assert.equal(AI.allowed(L, "coach", "made-up"), false);
  const src = read("../site/js/aistudio.js");
  assert.match(src, /if \(!it \|\| !\(p\.teacher \|\| allowed\(D\.aiperm\.levels, it\.level, p\.level\)\)\) return; \/\/ never copies/);
  assert.match(src, /A prompt being in this studio does not mean you may use it\./);
  // Lesson model, dashboard, presentation and the substitute plan all show the setting.
  const student = read("../site/js/student.js"), teacher = read("../site/js/teacher.js");
  assert.match(student, /ai: aiOf\(ls\),/); assert.match(student, /\$\{aiCard\(M\.ai\)\}/);
  assert.match(student, /aiLevel\(b\.ai\.level\)\.rank < aiLevel\(a\.ai\.level\)\.rank/, "two lessons in one block: the more restrictive setting wins");
  assert.match(teacher, /id="f-ai"/); assert.match(teacher, /pr-ai/); assert.match(teacher, /AI permission for today's work:/);
});

test("AI Ethics Lab: the seven required situations plus the original AI Coach sort items, each with a reason", () => {
  const E = C.ethics, ids = E.scenarios.map(s => s.id);
  for (const id of ["e1", "e2", "e3", "e4", "e5", "e6", "e7"]) assert.ok(ids.includes(id));
  assert.match(E.scenarios[0].text.en, /entire speech/); assert.match(E.scenarios[6].text.en, /anyway/);
  for (const s of E.scenarios.concat(E.college)) {
    bi(s.text, s.id); bi(s.why, s.id); assert.ok(E.choices[s.answer], s.id);
    assert.equal(s.reasons.filter(r => r.ok).length, 1, `${s.id}: one right reason`); s.reasons.forEach(r => bi(r.t, s.id));
  }
  assert.deepEqual(Object.keys(E.choices), ["ok", "ask", "not"]);
  // Policy: only grammar/spelling is appropriate by default; broader coaching needs permission.
  for (const s of E.scenarios.filter(s => s.answer === "ok")) assert.match(s.text.en, /grammar|spelling/i, s.id);
  assert.ok(E.scenarios.some(s => s.answer === "ask") && E.scenarios.some(s => s.answer === "not"));
});

test("AI Fact Checker: simulated and labeled, fabricated sources flagged, links to research", () => {
  const F = C.factcheck;
  assert.match(F.label.en, /^SIMULATED: .*fictional/); assert.match(F.label.en, /Do not use them as research/); bi(F.label, "label");
  for (const c of F.claims) { bi(c.text, c.id); bi(c.why, c.id); assert.ok(F.verdicts[c.answer], c.id); }
  for (const v of Object.keys(F.verdicts)) assert.ok(F.claims.some(c => c.answer === v), `some claim is ${v}`);
  for (const s of F.sources) { bi(s.lookup, s.id); assert.ok(s.missing.length && s.missing.every(f => F.fields[f]), s.id); }
  assert.deepEqual(F.sources.filter(s => s.fake).map(s => s.id), ["s1", "s2"]);
  assert.match(F.sources.find(s => !s.fake).lookup.en, /real open textbook/);
  for (const s of F.sources.filter(s => s.fake)) assert.match(s.lookup.en, /^Simulated/);
  assert.equal(F.final.options.filter(o => o.ok).length, 1);
  assert.match(F.research.en, /Research & Source Lab/);
  const studios = json("../site/data/studios.json").experiences;
  assert.ok(studios.some(x => x.id === "research-studio"), "integration point for the future Research & Academic Integrity Studio");
});

test("mastery needs every answer right; retries are unlimited; partial work counts for nothing", () => {
  const r = fresh();
  assert.deepEqual(plain(AI.mastery(C, r)), { ethics: false, ownership: false, factcheck: false });
  solveAll(r);
  // One wrong reason, one wrong ownership answer, one wrong source field.
  const e1 = C.ethics.scenarios[0]; r.eth[e1.id] = { c: e1.answer, r: bad(e1.reasons) };
  r.own.o6 = "kept"; r.fc.src.s3 = ["year"];
  assert.deepEqual(plain(AI.mastery(C, r)), { ethics: false, ownership: false, factcheck: false });
  assert.equal(AI.ethicsResult(C, r).per[e1.id].cOk, true, "right classification, wrong reason: not yet");
  assert.deepEqual(plain(AI.record(C, r, "2026-12-01", ["ethics", "ownership", "factcheck"])), []);
  // Retry and fix everything.
  r.eth[e1.id].r = okIdx(e1.reasons); r.own.o6 = "gave"; r.fc.src.s3 = ["journal", "year"];
  assert.deepEqual(plain(AI.mastery(C, r)), { ethics: true, ownership: true, factcheck: true });
  // College scenarios are extra practice, not required.
  assert.equal(AI.ethicsResult(C, r).total, C.ethics.scenarios.length);
});

test("only checking records mastery; copying, visiting or a second check never adds anything", () => {
  const r = fresh(); solveAll(r);
  assert.deepEqual(plain(AI.record(C, r, "2026-12-01", [])), [], "no check pressed: nothing recorded");
  assert.deepEqual(plain(AI.record(C, r, "2026-12-01", ["ownership"])), ["ownership"]);
  assert.deepEqual(plain(AI.record(C, r, "2026-12-02", ["ethics", "ownership", "factcheck"])), ["ethics", "factcheck"]);
  assert.deepEqual(plain(AI.record(C, r, "2026-12-03", ["ethics", "ownership", "factcheck"])), []);
  assert.equal(r.mastered.ownership, "2026-12-01", "first date kept");
  const src = read("../site/js/aistudio.js"), copyCase = src.slice(src.indexOf('case "copy":'), src.indexOf('case "copythink":'));
  assert.doesNotMatch(copyCase, /afterCheck|record\(|mastered/, "copying a prompt records nothing");
  assert.equal((src.match(/afterCheck\(\["/g) || []).length, 3, "only the three check buttons record mastery");
});

test("Independent Thinker: active, earned once from the three skills, points not duplicated", () => {
  const b = cfg.badges.find(x => x.id === "independent-thinker");
  assert.equal(b.status, "active"); assert.equal(b.level, "applied");
  assert.deepEqual(b.criteria.map(c => [c.type, c.part]), [["ai", "ethics"], ["ai", "ownership"], ["ai", "factcheck"]]);
  assert.match(b.about.en, /not a teacher-verified academic performance/);
  let src = A.collect(store({ v: 1, mastered: { ethics: "2026-12-01", ownership: "2026-12-01" } }));
  assert.equal(thinker(src).state, "progress");
  src = A.collect(store({ v: 1, mastered: { ethics: "2026-12-01", ownership: "2026-12-01", factcheck: "2026-12-02" } }));
  const a = A.track(cfg, src, null, "2026-12-02"); assert.ok(a.newly.includes("independent-thinker"));
  const b2 = A.track(cfg, src, a.store, "2026-12-03"); assert.deepEqual(plain(b2.newly), []);
  const pts = A.points(cfg, src, A.evaluate(cfg, src, b2.store));
  assert.equal(pts.ai, 3); assert.equal(pts.total, 3 * cfg.points.labActivity + cfg.points.badge);
  // Ethical AI User (Research Lab) is unchanged.
  assert.deepEqual(cfg.badges.find(x => x.id === "ethical-ai-user").criteria.map(c => c.type), ["lab"]);
});

test("malformed or tampered records are ignored safely; the studio owns one key", () => {
  for (const bad of ["not json", "[]", '{"v":2}', '{"v":1,"mastered":[]}', '{"v":1,"mastered":{"ethics":true,"ownership":"yes","factcheck":"2026-02-31x"}}']) {
    const src = A.collect({ get: k => (k === "speakup-ai-v1" ? bad : null), labs: {} });
    assert.equal(thinker(src).met, false, bad);
    const r = AI.load(k => (k === "speakup-ai-v1" ? bad : null));
    assert.equal(r.v, 1); assert.equal(typeof r.fc.claims, "object"); assert.equal(typeof r.mastered, "object");
  }
  const kept = AI.load(() => JSON.stringify({ v: 1, own: { o1: "kept" }, mastered: { ethics: "2026-12-01" }, fc: "oops" }));
  assert.equal(kept.own.o1, "kept"); assert.equal(kept.mastered.ethics, "2026-12-01"); assert.deepEqual(plain(kept.fc.claims), {});
  const src = read("../site/js/aistudio.js");
  assert.deepEqual([...src.matchAll(/put\(\s*([A-Z_]+|"[^"]+")/g)].map(m => m[1]), ["KEY"]);
  assert.match(src, /const KEY = "speakup-ai-v1"/);
});

test("privacy and no external AI: nothing a student types is sent anywhere; no keys or AI services", () => {
  const src = read("../site/js/aistudio.js");
  assert.equal((src.match(/fetch\(/g) || []).length, 1, "the only request loads the studio's own content file");
  assert.match(src, /fetch\(\(entry\(\) \|\| \{\}\)\.content \|\| "data\/ai-studio\.json"/);
  assert.doesNotMatch(src, /XMLHttpRequest|sendBeacon|WebSocket|api\.openai|anthropic\.com|generativelanguage|apiKey|api_key|Authorization/i);
  assert.doesNotMatch(JSON.stringify(C), /sk-[A-Za-z0-9]{10,}|api[_-]?key/i);
  assert.match(C.noLiveAi.en, /Nothing you type here is sent anywhere/);
  assert.match(C.disclosure.teacher.en, /AI detection software is not definitive evidence/);
  for (const f of C.disclosure.fields) bi(f.label, f.id);
  assert.deepEqual(C.disclosure.fields.map(f => f.id), ["assignment", "permission", "tool", "purpose", "before", "feedback", "evaluated", "revisions", "verified", "ownership"]);
  assert.match(C.academy.topics.find(t => t.id === "privacy").explain.en, /Don't share personal information/);
});

test("the original AI Coach material is kept and expanded, not duplicated", () => {
  // Six coaching stages with the same questions (now with Spanish).
  assert.deepEqual(C.coach.stages.map(s => s.id), old.stages.map(s => s.id));
  for (const s of old.stages) { const n = C.coach.stages.find(x => x.id === s.id); assert.deepEqual(n.questions.en, s.questions); biList(n.questions, s.id); }
  // All five original prompts live on in the library (marked with their origin).
  for (const p of old.prompts) assert.ok(C.prompts.items.some(x => x.origin === `aiCoach ${p.id}`), p.id);
  // The eight original "coach or author" items are covered by the Ethics Lab or Ownership scenarios.
  const ethics = JSON.stringify(C.ethics) + JSON.stringify(C.ownership);
  for (const k of ["marine biology", "write your persuasive speech|write an entire speech", "inductive|unfamiliar vocabulary", "statistics", "skeptical|audience questions", "personal story", "outline", "analysis of a famous speech"]) assert.match(ethics, new RegExp(k), k);
  // The React source is left as it was (content source only).
  assert.equal(old.sortItems.length, 8); assert.equal(old.prompts.length, 5);
});

test("the studio is available in all six units and reachable from the dashboard", () => {
  const x = json("../site/data/studios.json").experiences.find(e => e.id === "ai-coach");
  assert.equal(x.status, "available"); assert.deepEqual(x.units, [1, 2, 3, 4, 5, 6]); assert.equal(x.route, "#/ai");
  assert.equal(x.title.en, "AI Coaching Studio: Your Thinking. Your Voice.");
  assert.match(read("../site/js/student.js"), /href="#\/ai"/);
});
