// Research & Academic Integrity Studio (Slice 8): content rules, APA accuracy and sources, mastery and retries,
// Citation Specialist and APA Scholar, college restriction, privacy, progress preservation, AI studio links.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const read = p => readFileSync(new URL(p, import.meta.url), "utf8");
const json = p => JSON.parse(read(p));
const C = json("../site/data/research-studio.json");
const cfg = json("../site/data/achievements.json");
const studios = json("../site/data/studios.json").experiences;
const R = (() => { const c = {}; vm.runInNewContext(read("../site/js/research.js"), c); return c.SLResearch; })();
const A = (() => { const c = {}; vm.runInNewContext(read("../site/js/achievements.js"), c); return c.SLAchieve; })();
const plain = x => JSON.parse(JSON.stringify(x));
const fresh = () => R.load(() => null);
const bi = (o, w) => assert.ok(o && typeof o.en === "string" && o.en.trim() && typeof o.es === "string" && o.es.trim(), `${w}: English and Spanish`);
const biList = (o, w) => assert.ok(o && Array.isArray(o.en) && o.en.length && Array.isArray(o.es) && o.es.length === o.en.length, `${w}: lists match`);
const ok = opts => opts.findIndex(o => o.ok), bad = opts => opts.findIndex(o => !o.ok);
const badge = (src, id) => A.evaluate(cfg, src, null).find(r => r.id === id);
const store = r => ({ get: k => (k === "speakup-research-v1" ? JSON.stringify(r) : null), labs: {} });

function solve(r) {
  for (const c of C.sources.cases) r.src[c.id] = { v: c.verdict, f: c.flag };
  for (const it of C.evidence.items) r.ev[it.id] = it.kind === "mc" ? ok(it.options) : it.answer;
  for (const c of C.integrity.cases) r.int[c.id] = { c: c.answer, r: ok(c.reasons) };
  for (const k of C.paraphrase.sort) r.para.kinds[k.id] = k.answer;
  for (const pp of C.paraphrase.practice) r.para.checks[pp.id] = Object.fromEntries(pp.checks.map(ch => [ch.id, ok(ch.options)]));
  for (const c of C.cite.challenges) r.cite[c.id] = ok(c.options);
  for (const m of C.cite.missing) r.miss[m.id] = [...m.missing];
  for (const c of C.apa.challenges) r.apa[c.id] = ok(c.options);
}

test("studio content: title, principle, bilingual, Spanish marked draft, fictional material labeled", () => {
  assert.equal(C.tagline.en, "From Evidence to Credibility");
  assert.notEqual(C.status.es, "approved");
  for (const k of ["title", "tagline", "principle", "fictional", "noAuto"]) bi(C[k], k);
  assert.match(C.noAuto.en, /clues, not proof/);
  biList(C.frames, "frames"); biList(C.ai.points, "ai points");
  for (const v of C.vocab) assert.ok(v.en && v.es);
});

test("Source Detective: twelve criteria, the domain myth, lateral reading, labeled cases", () => {
  const S = C.sources;
  assert.deepEqual(S.criteria.map(c => c.id), ["author", "pub", "date", "primary", "evidence", "bias", "method", "relevance", "accuracy", "misinfo", "lateral", "original"]);
  for (const c of S.criteria) { bi(c.name, c.id); bi(c.ask, c.id); }
  const dom = S.domains.points.en.join(" ");
  assert.match(dom, /\.org: anyone can register/); assert.match(dom, /\.edu: .*student projects/); assert.match(dom, /\.gov: .*outdated/);
  assert.doesNotMatch(dom, /(\.org|\.edu|\.gov)[^.]*(always|automatically) (reliable|credible|trustworthy)/i);
  biList(S.lateral, "lateral"); biList(S.domains.points, "domains");
  for (const c of S.cases) {
    bi(c.card.title, c.id); bi(c.card.note, c.id); bi(c.lookup, c.id); bi(c.why, c.id); bi(c.card.date, c.id);
    assert.ok(S.verdicts[c.verdict]); assert.ok(S.criteria.some(x => x.id === c.flag)); (c.also || []).forEach(a => assert.ok(S.criteria.some(x => x.id === a), `${c.id} ${a}`));
    assert.equal(typeof c.fictional, "boolean");
    if (!c.fictional) assert.match(c.card.note.en, /Authentic example \(described, not quoted\)/, "authentic examples are not quoted or given invented numbers");
  }
  assert.ok(S.cases.some(c => /\.org/.test(c.card.site) && c.verdict === "no"), "a professional .org that is not credible");
  assert.ok(S.cases.some(c => /\.edu/.test(c.card.site) && c.verdict !== "use"), "an .edu page that is not automatically credible");
  assert.ok(S.cases.some(c => !c.fictional), "at least one authentic example");
});

test("Evidence Explorer: research questions to synthesis, with ProCon.org guidance to original sources", () => {
  const E = C.evidence, groups = new Set(E.items.map(i => i.group || i.kind));
  for (const g of ["question", "search", "type", "support", "stats", "quote", "counter", "synth"]) assert.ok(groups.has(g), g);
  for (const it of E.items) {
    if (it.kind === "mc") { bi(it.q, it.id); bi(it.why, it.id); assert.equal(it.options.filter(o => o.ok).length, 1, it.id); it.options.forEach(o => bi(o.t, it.id)); }
    if (it.kind === "type") { bi(it.text, it.id); assert.ok(E.types[it.answer]); }
    if (it.kind === "support") { bi(it.claim, it.id); bi(it.ev, it.id); bi(it.why, it.id); assert.ok(E.supportChoices[it.answer]); }
  }
  assert.deepEqual(Object.keys(E.types), ["example", "statistic", "testimony", "finding"]);
  for (const t of Object.keys(E.types)) assert.ok(E.items.some(i => i.answer === t), `an item is ${t}`);
  biList(E.procon.steps, "procon"); bi(E.procon.intro, "procon");
  const steps = E.procon.steps.en.join(" ");
  assert.match(steps, /original source/); assert.match(steps, /cite the original source you read, not the summary/);
  assert.match(E.procon.intro.en, /place to start, not the place to stop/);
  bi(E.speeches, "speeches"); assert.match(E.speeches.en, /Informative/); assert.match(E.speeches.en, /Persuasive/);
});

test("Plagiarism Investigator: all eleven categories, source passages beside student work, fixes, no detector-as-proof", () => {
  const I = C.integrity;
  assert.deepEqual(Object.keys(I.categories), ["direct", "patch", "weak", "noattr", "badquote", "fabricated", "misrep", "ai", "goodpara", "goodquote", "common"]);
  for (const [k, c] of Object.entries(I.categories)) { bi(c.name, k); bi(c.def, k); assert.ok(I.cases.some(x => x.answer === k), `a case for ${k}`); }
  for (const c of I.cases) {
    bi(c.work, c.id); bi(c.fix, c.id); assert.equal(c.reasons.filter(r => r.ok).length, 1, c.id); c.reasons.forEach(r => bi(r.t, c.id));
    if (c.passage) { assert.ok(I.passages[c.passage], c.id); bi(I.passages[c.passage], c.passage); assert.match(I.passages[c.passage].by, /fictional/); }
  }
  assert.match(I.categories.weak.def.en, /only swaps synonyms/, "synonym swapping is never an acceptable paraphrase");
  const ai = I.cases.find(c => c.answer === "ai");
  assert.match(ai.work.en, /disclosure says an AI tool wrote this paragraph/, "AI case rests on the student's own disclosure");
  assert.match(ai.fix.en, /detector score is never proof by itself/);
  assert.ok(ai.reasons.filter(r => !r.ok).some(r => /detector score/.test(r.t.en)), "using a detector score as proof is a wrong answer");
  assert.match(I.categories.common.def.en, /When in doubt, cite/);
});

test("Paraphrasing Workshop: seven steps, quote/paraphrase/summary, independent writing never auto-judged", () => {
  const P = C.paraphrase;
  assert.equal(P.steps.en.length, 7); biList(P.steps, "steps");
  assert.match(P.steps.en[2], /Set the source aside/); assert.match(P.steps.en[6], /Cite/);
  assert.deepEqual(Object.keys(P.kinds), ["quote", "para", "sum"]);
  assert.match(P.intro.en, /Changing a few words is not paraphrasing/); bi(P.trap, "trap");
  assert.match(P.judge.en, /never grades your paraphrase/);
  assert.deepEqual(P.practice.map(p => p.scaffold), ["full", "light"], "progressive independence");
  for (const pp of P.practice) { bi(pp.text, pp.id); biList(pp.self, pp.id); for (const ch of pp.checks) { bi(ch.q, ch.id); assert.equal(ch.options.filter(o => o.ok).length, 1); } }
  // The student's own paraphrase text never affects mastery.
  const r = fresh(); solve(r); r.para.text.pp1 = "copied word for word"; assert.equal(R.mastery(C, r).paraphrase, true);
  r.para.text.pp1 = ""; assert.equal(R.mastery(C, r).paraphrase, true);
  const src = read("../site/js/research.js");
  assert.doesNotMatch(src.slice(src.indexOf("function paraphraseResult"), src.indexOf("function citeResult")), /para\.text/);
});

test("Citation Builder: three forms, natural oral citations, never a URL, never invented details", () => {
  const X = C.cite;
  assert.deepEqual(X.forms.map(f => f.id), ["oral", "intext", "ref"]);
  assert.match(X.forms[0].what.en, /Never read a URL or a full reference aloud/);
  assert.match(X.frames.en[0], /^According to \[author or organization\], in a \[year\]/);
  assert.match(X.builder.en, /Never guess an author, date or title/);
  assert.equal(R.oralCitation({ author: "the U.S. Census Bureau", year: "2023", pub: "census.gov https://census.gov" }, false), "According to the U.S. Census Bureau, in a 2023 report published by [source], …");
  assert.equal(R.oralCitation({}, false), "According to [author or organization], in a [year] report published by [source], …");
  assert.match(R.oralCitation({ author: "www.example.org" }, true), /^Según \[autor u organización\]/);
  assert.equal(R.oralCitation({ author: "Dr. Ana Ruiz", qual: "a sleep researcher", year: "2024", kind: "interview", pub: "NPR" }, false), "According to Dr. Ana Ruiz, a sleep researcher, in a 2024 interview published by NPR, …");
  for (const c of X.challenges) { bi(c.q, c.id); bi(c.why, c.id); assert.equal(c.options.filter(o => o.ok).length, 1); }
  assert.ok(X.challenges.some(c => c.options.some(o => !o.ok && /h-t-t-p-s/.test(o.t.en))), "reading a URL aloud is shown as wrong");
  assert.ok(X.challenges.some(c => c.options.some(o => !o.ok && /a name you guessed/.test(o.t.en))), "guessing an author is shown as wrong");
  for (const m of X.missing) assert.ok(m.missing.every(f => X.missingFields[f]));
});

test("APA rules: every rule names an official apastyle.apa.org page; examples match APA's published examples", () => {
  const A2 = C.apa, need = ["authordate", "narr", "two", "etal", "group", "quote", "pages", "nopages", "para", "secondary", "elements", "missing", "doi", "journal", "book", "chapter", "web", "report", "video", "genai", "list", "plag"];
  assert.deepEqual(A2.rules.map(r => r.id), need);
  for (const r of A2.rules) { bi(r.topic, r.id); bi(r.rule, r.id); assert.match(r.src, /^https:\/\/apastyle\.apa\.org\/style-grammar-guidelines\//, r.id); }
  assert.match(A2.checked, /^\d{4}-\d{2}-\d{2}$/);
  const rule = id => A2.rules.find(r => r.id === id).rule.en;
  // Spot checks against the APA pages fetched on the check date.
  assert.match(rule("etal"), /\(Martin et al\., 2020\)/);
  assert.match(rule("two"), /\(Salas & D'Agostino, 2020\)/); assert.match(rule("two"), /Salas and D'Agostino \(2020\)/);
  assert.match(rule("group"), /\(National Institute of Mental Health \[NIMH\], 2020\)/);
  assert.match(rule("quote"), /Fewer than 40 words/); assert.match(rule("quote"), /0\.5 in\./);
  assert.match(rule("pages"), /pp\. 34–36/);
  assert.match(rule("nopages"), /para\. 1/); assert.match(rule("nopages"), /2:12/);
  assert.match(rule("para"), /not required/);
  assert.match(rule("missing"), /n\.d\./); assert.match(rule("missing"), /“Anonymous” unless/);
  assert.match(rule("doi"), /https:\/\/doi\.org\//); assert.match(rule("doi"), /Don't write “Retrieved from”/); assert.match(rule("doi"), /don't put a period after it/);
  assert.match(rule("journal"), /\*Psychology of Popular Media Culture, 8\*\(3\), 207–217\. https:\/\/doi\.org\/10\.1037\/ppm0000185/);
  assert.match(rule("book"), /no publisher location/);
  assert.match(rule("chapter"), /\(Eds\.\)/); assert.match(rule("chapter"), /\(pp\. 345–359\)/);
  assert.match(rule("video"), /\[Video\]\. YouTube\./);
  assert.match(rule("genai"), /OpenAI\. \(2025\)\. \*ChatGPT\* \[Large language model\]\. https:\/\/chatgpt\.com/);
  assert.match(rule("list"), /0\.5-in\. hanging indent/); assert.match(rule("list"), /alphabetize/i);
  // Challenges point at rules and have one right answer; wrong answers include classic APA 6 habits.
  for (const c of A2.challenges) { assert.ok(A2.rules.some(r => r.id === c.rule), c.id); assert.equal(c.options.filter(o => o.ok).length, 1, c.id); bi(c.q, c.id); }
  const wrong = A2.challenges.flatMap(c => c.options.filter(o => !o.ok).map(o => o.t.en)).join(" ");
  assert.match(wrong, /Retrieved from/); assert.match(wrong, /New York, NY:/); assert.match(wrong, /doi:10\./);
  assert.match(A2.notice.en, /does not mean concurrent enrollment or eligibility for college credit/);
  assert.match(A2.oralVsWritten.en, /Don't read APA entries aloud/);
});

test("APA reference-list order challenge is truly alphabetical", () => {
  const c = C.apa.challenges.find(x => x.id === "a10"), right = c.options[ok(c.options)].t.en.split(" → ").map(s => s.replace(/ \(.*$/, ""));
  assert.deepEqual(right, [...right].sort((a, b) => a.localeCompare(b)));
});

test("mastery needs every answer right; retries are unlimited; only Check buttons record, once", () => {
  const r = fresh();
  assert.deepEqual(Object.values(plain(R.mastery(C, r))), [false, false, false, false, false, false]);
  solve(r);
  const c1 = C.integrity.cases[0]; r.int[c1.id].r = bad(c1.reasons);
  r.miss.m1 = ["author"]; r.src.s4.v = "use";
  const m = plain(R.mastery(C, r));
  assert.equal(m.integrity, false); assert.equal(m.cite, false); assert.equal(m.sources, false); assert.equal(m.evidence, true);
  // Accepted alternative "most important question" for a case.
  r.src.s4.v = "caution"; r.src.s4.f = "relevance"; assert.equal(R.sourcesResult(C, r).per.s4.f, true);
  r.int[c1.id].r = ok(c1.reasons); r.miss.m1 = ["link", "date", "author"];
  assert.deepEqual(Object.values(plain(R.mastery(C, r))), [true, true, true, true, true, true]);
  assert.deepEqual(plain(R.record(C, r, "2026-12-01", [], false)), [], "nothing without a Check");
  assert.deepEqual(plain(R.record(C, r, "2026-12-01", ["cite"], false)), ["cite"]);
  assert.deepEqual(plain(R.record(C, r, "2026-12-02", ["cite", "integrity"], false)), ["integrity"]);
  assert.equal(r.mastered.cite, "2026-12-01");
  assert.deepEqual(plain(R.record(C, r, "2026-12-02", ["apa"], false)), [], "APA needs the authorized college pathway");
  assert.deepEqual(plain(R.record(C, r, "2026-12-02", ["apa"], true)), ["apa"]);
  const src = read("../site/js/research.js");
  const clickPart = src.slice(src.indexOf('if (ev.type !== "click") return;'), src.indexOf('if (part) afterCheck(part)'));
  for (const a of ["pfadd", "pfcopy", "pfdl", "look", "pphide"]) assert.doesNotMatch(clickPart.slice(clickPart.indexOf(`case "${a}"`), clickPart.indexOf(`case "${a}"`) + 80).split("case")[1] || "", /part =/, `${a} records nothing`);
  assert.equal((clickPart.match(/part = "/g) || []).length, 7, "seven Check buttons, nothing else");
});

test("Citation Specialist and APA Scholar: earned once from demonstrated skills; APA Scholar is college-only", () => {
  const cs = cfg.badges.find(b => b.id === "citation-specialist"), as = cfg.badges.find(b => b.id === "apa-scholar");
  assert.equal(cs.status, "active"); assert.deepEqual(cs.criteria.map(c => [c.type, c.part]), [["research", "integrity"], ["research", "paraphrase"], ["research", "cite"]]);
  assert.match(cs.about.en, /judged by Mr\. Bennett/);
  assert.equal(as.audience, "col"); assert.deepEqual(as.criteria.map(c => c.part), ["apa"]); assert.match(as.about.en, /not a grade or college credit/);
  // No duplicates of existing badges' competencies.
  assert.equal(cfg.badges.filter(b => b.title.en === "Source Detective").length, 1);
  assert.deepEqual(cfg.badges.find(b => b.id === "source-detective").criteria.map(c => c.type), ["lab"]);
  assert.ok(!cfg.badges.some(b => /^Academic Integrity$/i.test(b.title.en)), "integrity is part of Citation Specialist, not a second badge");
  let src = A.collect(store({ v: 1, mastered: { integrity: "2026-12-01", cite: "2026-12-01" } }));
  assert.equal(badge(src, "citation-specialist").state, "progress");
  src = A.collect(store({ v: 1, mastered: { integrity: "2026-12-01", cite: "2026-12-01", paraphrase: "2026-12-02", sources: "2026-12-01" } }));
  const t1 = A.track(cfg, src, null, "2026-12-02"); assert.ok(t1.newly.includes("citation-specialist"));
  const t2 = A.track(cfg, src, t1.store, "2026-12-03"); assert.deepEqual(plain(t2.newly), []);
  const pts = A.points(cfg, src, A.evaluate(cfg, src, t2.store)); assert.equal(pts.research, 4);
  // The student view hides and never awards college-only badges outside the college pathway.
  assert.match(read("../site/js/student.js"), /badges: D\.achievements\.badges\.filter\(b => !b\.audience \|\| b\.audience === "all" \|\| level === "col"\)/);
});

test("college restrictions: APA Academy requires the authorized college pathway; college stays off by default", () => {
  const src = read("../site/js/research.js");
  assert.match(src, /const isCol = \(\) => typeof level !== "undefined" && level === "col" && typeof colUnlocked === "function" && colUnlocked\(\);/);
  assert.match(src, /function viewApa\(\) \{\s*if \(!isCol\(\)\) return/);
  assert.equal(json("../site/data/access.json").college.enabled, false);
  const apa = studios.find(x => x.id === "apa-academy"); assert.equal(apa.audience, "col"); assert.equal(apa.route, "#/research/apa");
  assert.match(apa.blurb.en, /Not concurrent enrollment or college credit/);
});

test("portfolio: configurable source count, full record fields, warnings that never call a source credible", () => {
  const P = C.portfolio;
  assert.ok(P.assignments.every(a => Number.isInteger(a.required) && a.required >= 0)); assert.equal(P.assignments.find(a => a.id === "informative").required, 3);
  assert.equal(P.assignments.find(a => a.id === "persuasive").required, 3); assert.equal(P.assignments.find(a => a.id === "other").required, 0, "no requirement for speeches without outside sources");
  assert.deepEqual(P.fields.map(f => f.id), ["title", "author", "qual", "pub", "date", "link", "accessed", "kind", "main", "evidence", "quote", "para", "cred", "limits", "claim", "oral", "written"]);
  for (const f of P.fields) bi(f.label, f.id);
  const w = R.recordWarnings(P.fields, { title: "x", quote: "“exact words”", oral: "According to www.census.gov" });
  assert.ok(w.empty.includes("author") && w.empty.includes("cred")); assert.equal(w.quoteNoPage, true); assert.equal(w.urlInOral, true);
  const full = Object.fromEntries(P.fields.map(f => [f.id, f.type === "select" ? "primary" : "something"]));
  full.quote = "“words” (p. 4)"; full.oral = "According to the Census Bureau";
  assert.deepEqual(plain(R.recordWarnings(P.fields, full)), { empty: [], quoteNoPage: false, urlInOral: false });
  assert.match(P.warnCred.en, /Complete fields don't make a source credible/);
  const src = read("../site/js/research.js");
  assert.match(src, /\$\{h\(pick\(PF\(\)\.warnCred\)\)\}/, "the credibility warning is always shown");
  assert.doesNotMatch(src.replace(/\/\*[\s\S]*?\*\//g, ""), /(this|the|your) source is credible|credible source ✓/i, "the page never declares a source credible");
});

test("progress preservation and privacy: one key, malformed data ignored, nothing sent anywhere", () => {
  for (const bad of ["not json", "[]", '{"v":2}', '{"v":1,"port":{"items":{"informative":"x"}}}', '{"v":1,"mastered":{"cite":true}}']) {
    const r = R.load(k => (k === "speakup-research-v1" ? bad : null));
    assert.equal(r.v, 1); assert.ok(Array.isArray(r.port.items.informative || []));
    const src = A.collect({ get: k => (k === "speakup-research-v1" ? bad : null), labs: {} });
    assert.equal(badge(src, "citation-specialist").met, false, bad);
  }
  const kept = R.load(() => JSON.stringify({ v: 1, port: { assignment: "persuasive", items: { persuasive: [{ title: "A" }, null, { title: "B" }] } }, mastered: { cite: "2026-12-01" } }));
  assert.deepEqual(plain(kept.port.items.persuasive), [{ title: "A" }, { title: "B" }]); assert.equal(kept.mastered.cite, "2026-12-01");
  const src = read("../site/js/research.js");
  assert.deepEqual([...src.matchAll(/put\(\s*([A-Z_]+|"[^"]+")/g)].map(m => m[1]), ["KEY"]);
  assert.match(src, /const KEY = "speakup-research-v1"/);
  assert.equal((src.match(/fetch\(/g) || []).length, 1);
  assert.doesNotMatch(src, /XMLHttpRequest|sendBeacon|WebSocket|apiKey|api_key|["']Authorization["']/);
  // The Research & Source Lab and its progress are untouched and still offered.
  assert.equal(studios.find(x => x.id === "research-studio").lab, "rlab");
  assert.match(read("../site/index.html"), /id="lp-rlab"/);
});

test("AI Coaching Studio integration: research reinforces verification and links to the Fact Checker", () => {
  const pts = C.ai.points.en.join(" ");
  for (const k of [/must be verified/, /may be fabricated/, /cannot replace your own source evaluation/, /AI permission still applies/, /Your arguments stay yours/]) assert.match(pts, k);
  const src = read("../site/js/research.js"), ai = read("../site/js/aistudio.js");
  assert.match(src, /href="#\/ai\/factcheck"/); assert.match(src, /SL2\.aiCard\(ai, true\)/);
  assert.match(ai, /href="#\/research\/sources"/);
  const x = studios.find(e => e.id === "research-studio"); assert.equal(x.route, "#/research"); assert.equal(x.introduces, 2); assert.deepEqual(x.units, [2, 3, 4, 5, 6]);
});

test("slice 9 decisions: AI tool vs. specific chat citations, citing AI never authorizes use, alternative quote locators", () => {
  const g = C.apa.rules.find(r => r.id === "genai").rule.en;
  assert.match(g, /\[Large language model\]/); assert.match(g, /\[Generative AI chat\]\. ChatGPT\. https:\/\/chatgpt\.com\/share\//);
  assert.match(g, /Citing AI never makes AI use allowed/);
  const a13 = C.apa.challenges.find(c => c.id === "a13"), a14 = C.apa.challenges.find(c => c.id === "a14");
  assert.match(a13.options[ok(a13.options)].t.en, /Generative AI chat/); assert.match(a14.options[ok(a14.options)].t.en, /does not authorize/);
  const ai = JSON.parse(read("../site/data/ai-studio.json"));
  assert.match(ai.disclosure.citeNote.en, /never makes AI use allowed/);
  const F = C.portfolio.fields, q = quote => R.recordWarnings(F, { quote }).quoteNoPage;
  for (const okq of ["“x” (p. 4)", "“x” (pp. 4–5)", "“x” (Chamberlin, 2014, para. 1)", "“x” (Osteoarthritis section)", "“x” (Cuddy, 2012, 2:12)", "“x” (1:02:15)", "“x” (párr. 3)", "“x” (sección Métodos)"]) assert.equal(q(okq), false, okq);
  assert.equal(q("“just words”"), true);
  assert.match(C.portfolio.warnQuote.en, /paragraph number, section heading or video timestamp/);
});

test("research assignment settings from the Lesson Manager drive the portfolio (slice 9)", () => {
  // Start from the published lessons without any research settings, so the test still holds after Mr. Bennett sets some.
  const units = json("../site/data/units.json").units, base = json("../site/data/lessons.json");
  for (const d of Object.values(base.days)) delete d.research;
  const plainList = (l, open) => plain(R.assignments(C, l, units, open || (() => true)));
  // No lesson settings: the defaults (3, 3, and 0 for speeches without outside sources).
  assert.deepEqual(plainList(base).map(a => [a.id, a.required]), [["informative", 3], ["persuasive", 3], ["other", 0]]);
  const l = JSON.parse(JSON.stringify(base)), wP = units.find(u => u.id === 6).weeks[0], wD = units.find(u => u.id === 4).weeks[0];
  l.days[`w${String(wP).padStart(2, "0")}d1`].research = { id: "persuasive", sources: 5, name: { en: "Community action speech", es: "Discurso de acción comunitaria" }, expect: { en: "Include one local source.", es: "Incluye una fuente local." } };
  l.days[`w${String(wD).padStart(2, "0")}d1`].research = { id: "demonstration", sources: 2 };
  let list = plainList(l);
  const p = list.find(a => a.id === "persuasive");
  assert.equal(p.required, 5); assert.equal(p.name.en, "Community action speech"); assert.equal(p.expect.en, "Include one local source.");
  assert.equal(list.find(a => a.id === "demonstration").required, 2);
  // A research assignment in a unit that isn't open yet doesn't appear (or change the default) yet.
  list = plainList(l, u => u !== 6);
  assert.equal(list.find(a => a.id === "persuasive").required, 3); assert.equal(list.find(a => a.id === "persuasive").from, "default");
  // Validation used by the Lesson Manager.
  const Mg = (() => { const c = {}; vm.runInNewContext(read("../site/js/manage.js"), c); return c.SLManage; })();
  const data = () => ({ units: json("../site/data/units.json"), studios: json("../site/data/studios.json"), lessons: JSON.parse(JSON.stringify(base)), journals: json("../site/data/journals.json"), overrides: json("../site/data/overrides.json"), calendar: json("../site/data/calendar-2026-27.json"), pacing: json("../site/data/pacing.json"), aiperm: json("../site/data/ai-permissions.json") });
  const d = data(), k = Object.keys(d.lessons.days)[3], errs = () => Mg.validate(d, { today: "2026-09-10" }).errors.filter(e => e.where === k).map(e => e.msg).join(" | ");
  d.lessons.days[k].research = { id: "persuasive", sources: 3 }; assert.equal(errs(), "");
  d.lessons.days[k].research = { id: "Persuasive Speech", sources: 3 }; assert.match(errs(), /needs an id/);
  d.lessons.days[k].research = { id: "persuasive", sources: 25 }; assert.match(errs(), /0 to 20/);
  d.lessons.days[k].research = { id: "persuasive", sources: 3, oral: "x" }; assert.match(errs(), /research oral must have English and Spanish/);
  const t = read("../site/js/teacher.js");
  for (const id of ["f-rs-on", "f-rs-id", "f-rs-n", "f-rs-expect", "f-rs-written", "f-rs-oral", "f-rs-portfolio"]) assert.match(t, new RegExp(`id="${id}"|"${id}"`), id);
  assert.match(C.portfolio.defaults.written.en, /APA-style author–date/);
  assert.match(C.portfolio.defaults.oral.en, /Never read a URL/);
});
