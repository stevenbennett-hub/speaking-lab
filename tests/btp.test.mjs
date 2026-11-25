// Beyond the Podium (Slice 6): episode data, the reusable engine, mastery, retries, Bridge Builder,
// progress preservation, honest media status, accessibility rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import vm from "node:vm";

const read = p => readFileSync(new URL(p, import.meta.url), "utf8");
const json = p => JSON.parse(read(p));
const ep = json("../site/data/btp/episode-1.json");
const studios = json("../site/data/studios.json").experiences;
const journals = json("../site/data/journals.json").journals;
const cfg = json("../site/data/achievements.json");
const engine = () => { const c = {}; vm.runInNewContext(read("../site/js/btp.js"), c); return c.SLBtp; };
const B = engine();
const A = (() => { const c = {}; vm.runInNewContext(read("../site/js/achievements.js"), c); return c.SLAchieve; })();
const plain = x => JSON.parse(JSON.stringify(x));
const st = id => ep.stages.find(s => s.id === id);
const fresh = () => B.epRec(B.load(() => null), "ep1");
const store = rec => ({ get: k => (k === "speakup-btp-v1" ? JSON.stringify(rec) : null), labs: {} });
const bridge = src => A.evaluate(cfg, src, null).find(r => r.id === "bridge-builder");

/** Answers a student who has mastered everything would give. */
function master(e) {
  for (const b of st("detective").barriers) e.ev[b.id] = [b.evidence[0]];
  for (const sc of st("change").scenes) { const path = goodPath(sc); B.finishScene(e, sc, B.walk(sc, path).end); e.scenes[sc.id] = path; }
  for (const q of st("apply").questions) e.apply.ans[q.id] = q.options.findIndex(o => o.ok);
  B.submitApply(ep, e);
}
function goodPath(sc) { const p = []; let n = sc.start; for (;;) { const ch = sc.nodes[n].choices, i = ch.findIndex(c => c.good); p.push(i); if (ch[i].end) return p; n = ch[i].next; } }

const bi = (o, where) => { assert.ok(o && typeof o.en === "string" && o.en.trim() && typeof o.es === "string" && o.es.trim(), `${where}: English and Spanish`); };

test("episode data: seven stages in order, bilingual, draft Spanish flagged, linked to Unit 1 and its flex journal", () => {
  assert.deepEqual(ep.stages.map(s => s.id), ["observe", "watch", "detective", "words", "perspectives", "change", "apply"]);
  assert.equal(ep.unit, 1); assert.equal(ep.id, "ep1");
  ["series", "title", "label"].forEach(k => bi(ep[k], k));
  assert.match(ep.label.en, /fictional/i); assert.match(ep.label.en, /AI-generated/);
  assert.notEqual(ep.status.es, "approved", "Spanish stays draft until the teacher reviews it");
  const j = journals.find(j => j.id === ep.journal);
  assert.ok(j && j.unit === 1 && j.experience === "beyond-the-podium-ep1", "connected to the Unit 1 flex journal");
  for (const s of ep.stages) bi(s.title, s.id);
  for (const l of ep.transcript) { bi(l, l.id); assert.ok(l.speaker); }
  for (const v of ep.vocab) { assert.ok(v.en && v.es); bi(v.def, v.en); }
  assert.equal(ep.frames.en.length, ep.frames.es.length);
  for (const k of ["observe", "words", "perspectives"]) for (const it of st(k).items) { bi(it.text, it.id); bi(it.why, it.id); }
  for (const q of st("apply").questions) { bi(q.q, q.id); bi(q.why, q.id); q.options.forEach(o => bi(o.t, q.id)); assert.equal(q.options.filter(o => o.ok).length, 1, `${q.id}: one right answer`); }
  for (const r of st("apply").reflect) bi(r.prompt, r.id);
});

test("the official dialogue is unchanged and every barrier cites lines that exist", () => {
  const lines = B.speakerLines(ep);
  assert.deepEqual(lines.map(l => l.speaker), ["Jordan", "Alex", "Jordan", "Alex"]);
  assert.equal(lines[0].en, "Seriously, Alex? I had to finish almost the entire project by myself. You never take anything seriously.");
  assert.equal(lines[3].en, "Whatever. If that's what you think of me, just do it yourself.");
  assert.match(ep.transcript.find(l => l.speaker === "Narrator").en, /^Communication isn't just about what we say\./);
  const ids = new Set(lines.map(l => l.id));
  for (const b of st("detective").barriers) {
    bi(b.name, b.id); bi(b.def, b.id); bi(b.why, b.id);
    assert.ok(b.evidence.length && b.evidence.every(x => x === "none" || ids.has(x)), `${b.id} evidence`);
    if (b.evidence.includes("none")) assert.equal(b.evidence.length, 1);
  }
  // Only what the words support: technoference is not claimed from the script.
  assert.deepEqual(st("detective").barriers.find(b => b.id === "techno").evidence, ["none"]);
  for (const id of ["accuse", "general", "defend", "interrupt", "assume", "listen", "escalate", "withdraw"]) assert.ok(st("detective").barriers.some(b => b.id === id), id);
});

test("no invented media: missing files are marked missing, and nothing marked available is absent", () => {
  const m = ep.media;
  for (const [what, f] of [["video", m.video], ["video 720p", m.video720], ["poster", m.poster], ["captions en", m.captions.en], ["captions es", m.captions.es], ["descriptions en", m.descriptions.en], ["descriptions es", m.descriptions.es]]) {
    const there = existsSync(new URL("../site/" + f.src, import.meta.url));
    assert.equal(f.available, there, `${what}: available must match whether the file exists`);
  }
  if (m.captions.es.available) assert.equal(typeof m.captions.es.reviewed, "boolean");
  if (m.poster.available) assert.ok(m.poster.alt && m.poster.alt.en, "an added thumbnail needs a description");
  // Slice 9: the approved film arrived with an English subtitle track (extracted unchanged). Still missing:
  // Slice 10: Spanish captions and visual descriptions are drafts waiting for review.
  assert.deepEqual(plain(B.missing(ep)).map(x => x.what), ["thumbnail", "Spanish captions (teacher review)", "English visual descriptions (teacher review)", "Spanish visual descriptions (teacher review)"]);
  // The supplied captions say exactly the official dialogue (speaker lines and narrator), in order.
  const vtt = read("../site/" + m.captions.en.src);
  assert.match(vtt, /^WEBVTT/);
  const cues = vtt.split(/\n\n+/).slice(1).map(b => b.split("\n").slice(1).join(" ").replace(/^[A-Z]+: /, "")).join(" ");
  for (const l of ep.transcript.filter(l => l.speaker !== "End card" && l.speaker !== "Description")) for (const part of l.en.split(/(?<=—)\s*/)) assert.ok(cues.includes(part.trim()), `caption has: ${part}`);
  // No timestamps or visual descriptions of the film anywhere in the episode file.
  const text = JSON.stringify(ep);
  assert.doesNotMatch(text, /\b\d{1,2}:\d{2}\b/, "no invented timestamps");
});

test("the film never autoplays; playback has native controls, captions only when supplied, and a replay button", () => {
  const src = read("../site/js/btp.js");
  assert.doesNotMatch(src.replace(/\/\*[\s\S]*?\*\//g, ""), /autoplay/i);
  assert.match(src, /<video id="btpVideo" controls preload="metadata"/);
  assert.match(src, /cap\.es\.available && cap\.es\.reviewed/, "Spanish captions only after review");
  assert.match(src, /data-btp="replay"/);
  assert.match(src, /<details class="btp-script"/, "transcript always available");
  // play() only from the replay button, or to resume a film that was already playing (quality switch, spoken description).
  for (const m of src.matchAll(/[^\n]*\.play\(\)[^\n]*/g)) assert.match(m[0], /case "replay"|if \(playing\)|if \(wasPlaying\)/, m[0].trim());
});

test("branching scenes: every choice has feedback, every path ends, and each scene can be repaired", () => {
  const ch = st("change");
  bi(ch.intro, "change"); assert.match(ch.intro.en, /practice dialogue, not part of the film/);
  for (const sc of ch.scenes) {
    bi(sc.title, sc.id); bi(sc.setup, sc.id);
    for (const [nid, n] of Object.entries(sc.nodes)) for (const c of n.choices) {
      bi(c.say, nid); bi(c.why, nid); assert.ok(c.skills.length, `${nid} names skills`);
      assert.ok(c.end ? ch.endings[c.end] : sc.nodes[c.next], `${nid}: ends or continues`);
      if (c.reply) bi(c.reply, nid);
    }
    const w = B.walk(sc, goodPath(sc));
    assert.equal(w.end, "repaired");
    assert.ok(Object.values(sc.nodes).some(n => n.choices.some(c => !c.good && c.end)), `${sc.id} shows what not to do`);
  }
  const skills = ch.scenes.flatMap(sc => Object.values(sc.nodes).flatMap(n => n.choices.flatMap(c => c.skills))).join(" ");
  for (const k of ["I-statement", "open-ended question", "paraphrasing", "empathy", "perception check", "collaborative problem-solving", "assert"]) assert.match(skills, new RegExp(k, "i"), k);
});

test("evidence checks need a real line; claiming an unsupported barrier is caught", () => {
  const b = id => st("detective").barriers.find(x => x.id === id);
  assert.equal(B.checkEvidence(b("interrupt"), []).reason, "empty");
  assert.equal(B.checkEvidence(b("interrupt"), ["l2"]).ok, true);
  assert.equal(B.checkEvidence(b("interrupt"), ["l2", "l4"]).ok, false);
  assert.equal(B.checkEvidence(b("interrupt"), ["none"]).reason, "missed");
  assert.equal(B.checkEvidence(b("techno"), ["l1"]).reason, "unsupported");
  assert.equal(B.checkEvidence(b("techno"), ["none", "l1"]).reason, "mixed");
  assert.equal(B.checkEvidence(b("techno"), ["none"]).ok, true);
  assert.equal(B.checkEvidence(b("accuse"), ["l1"]).partial, true, "one supporting line is enough; the feedback says others exist");
  assert.equal(B.checkEvidence(b("accuse"), "l1").reason, "empty", "malformed picks are ignored");
});

test("watching, visiting and sorting do not count as mastery; Bridge Builder needs all three skills", () => {
  const e = fresh();
  e.checked.watch = true; e.checked.observe = true; e.checked.words = true; e.checked.perspectives = true;
  for (const it of st("observe").items) e.obs[it.id] = it.answer;
  assert.deepEqual(plain(B.record(ep, e, "2026-11-24")), []);
  assert.deepEqual(plain(e.mastered), {});
  let src = A.collect(store({ v: 1, eps: { ep1: e } }));
  assert.equal(bridge(src).state, "notstarted");
  // Two of three skills: progress, not earned.
  for (const b of st("detective").barriers) e.ev[b.id] = [b.evidence[0]];
  for (const sc of st("change").scenes) B.finishScene(e, sc, "repaired");
  assert.deepEqual(plain(B.record(ep, e, "2026-11-24")), ["detective", "change"]);
  src = A.collect(store({ v: 1, eps: { ep1: e } }));
  assert.equal(bridge(src).state, "progress"); assert.equal(bridge(src).met, false);
  // Apply below the goal is not enough.
  const qs = st("apply").questions;
  qs.forEach((q, i) => { e.apply.ans[q.id] = i < 3 ? q.options.findIndex(o => o.ok) : q.options.findIndex(o => !o.ok); });
  assert.equal(B.submitApply(ep, e).score, 3);
  assert.deepEqual(plain(B.record(ep, e, "2026-11-24")), []);
  assert.equal(bridge(A.collect(store({ v: 1, eps: { ep1: e } }))).state, "progress");
});

test("unlimited retries: best results are kept and a repaired scene or passing score is never lost", () => {
  const e = fresh(), ap = st("apply"), sc = st("change").scenes[0];
  // Fail, fail, then repair, then fail again.
  B.finishScene(e, sc, "escalated"); B.finishScene(e, sc, "withdrawn");
  assert.equal(e.best[sc.id], "escalated", "first ending kept until a repair");
  B.finishScene(e, sc, "repaired"); B.finishScene(e, sc, "escalated");
  assert.equal(e.best[sc.id], "repaired"); assert.equal(e.tries[sc.id], 4);
  // Apply: 5, then 2 → best stays 5.
  ap.questions.forEach(q => { e.apply.ans[q.id] = q.options.findIndex(o => o.ok); });
  B.submitApply(ep, e);
  ap.questions.forEach(q => { e.apply.ans[q.id] = q.options.findIndex(o => !o.ok); });
  ap.questions.slice(0, 2).forEach(q => { e.apply.ans[q.id] = q.options.findIndex(o => o.ok); });
  assert.equal(B.submitApply(ep, e).score, 2);
  assert.equal(e.apply.best, 5); assert.equal(e.apply.tries, 2);
  // An incomplete attempt does not count as a try.
  e.apply.ans = { q1: 0 };
  assert.equal(B.submitApply(ep, e).complete, false); assert.equal(e.apply.tries, 2);
});

test("complete mastery earns Bridge Builder once; points are not duplicated by repeating the lab", () => {
  const e = fresh(); master(e);
  assert.deepEqual(plain(B.record(ep, e, "2026-11-24")), ["detective", "change", "apply"]);
  assert.deepEqual(plain(B.record(ep, e, "2026-12-01")), [], "recording again adds nothing");
  assert.equal(e.mastered.apply, "2026-11-24", "first mastery date kept");
  master(e); B.record(ep, e, "2026-12-02");
  const src = A.collect(store({ v: 1, eps: { ep1: e } }));
  const a = A.track(cfg, src, null, "2026-11-24");
  assert.ok(a.newly.includes("bridge-builder"));
  const b = A.track(cfg, src, a.store, "2026-11-25");
  assert.deepEqual(plain(b.newly), []); assert.equal(b.store.earned["bridge-builder"], "2026-11-24");
  const pts = A.points(cfg, src, A.evaluate(cfg, src, b.store));
  assert.equal(pts.btp, 3); assert.equal(pts.total, 3 * cfg.points.labActivity + cfg.points.badge);
  assert.equal(bridge(src).badge.level, "applied", "a lab badge, not a communication (speaking) badge");
  assert.match(bridge(src).badge.about.en, /not real-life mastery/);
});

test("progress preservation: malformed or tampered records are ignored safely; other progress is untouched", () => {
  for (const bad of ["not json", "null", "[]", '{"v":2,"eps":{}}', '{"v":1,"eps":[]}', '{"v":1,"eps":{"ep1":null}}',
    '{"v":1,"eps":{"ep1":{"mastered":{"detective":true,"change":"yes","apply":"2026-02-31x"}}}}', '{"v":1,"eps":{"../x":{"mastered":{"apply":"2026-11-24"}}}}']) {
    const src = A.collect({ get: k => (k === "speakup-btp-v1" ? bad : null), labs: {} });
    assert.equal(bridge(src).met, false, bad);
    const r = B.load(k => (k === "speakup-btp-v1" ? bad : null));
    assert.equal(r.v, 1); const e = B.epRec(r, "ep1");
    assert.equal(typeof e.ev, "object"); assert.equal(e.apply.best == null || typeof e.apply.best === "number", true);
  }
  // A record repaired by epRec keeps the student's existing answers.
  const r = { v: 1, eps: { ep1: { ev: { accuse: ["l1"] }, best: { A: "repaired" }, mastered: { change: "2026-11-20" }, apply: "oops" } } };
  const e = B.epRec(r, "ep1");
  assert.deepEqual(plain(e.ev), { accuse: ["l1"] }); assert.equal(e.best.A, "repaired"); assert.equal(e.mastered.change, "2026-11-20");
  // The engine owns one key only; achievements read it and never write it.
  const src = read("../site/js/btp.js");
  assert.deepEqual([...src.matchAll(/put\(\s*([A-Z_]+|"[^"]+")/g)].map(m => m[1]), ["KEY"]);
  assert.match(src, /const KEY = "speakup-btp-v1"/);
  assert.doesNotMatch(read("../site/js/achievements.js"), /setItem|speakup-btp-v1"\s*,/);
  // Included in "Back up or move my progress" (all speakup-* keys except teacher/college switches).
  assert.match(read("../site/index.html"), /startsWith\("speakup-"\)/);
});

test("reusable engine: a second episode file with the same shape works with no code change", () => {
  const ep2 = plain(ep); ep2.id = "ep2"; ep2.episode = 2;
  ep2.stages.find(s => s.id === "detective").barriers = [{ id: "x", name: ep.title, def: ep.title, why: ep.title, evidence: ["l4"] }];
  const r = { v: 1, eps: { ep1: { mastered: { detective: "2026-11-24" } } } };
  const e = B.epRec(r, "ep2"); e.ev.x = ["l4"];
  assert.equal(B.mastery(ep2, e).detective, true);
  assert.equal(r.eps.ep1.mastered.detective, "2026-11-24", "other episodes untouched");
  const x = studios.find(x => x.id === "beyond-the-podium-ep1");
  assert.equal(x.status, "available"); assert.equal(x.route, "#/btp/1"); assert.equal(x.episode, "data/btp/episode-1.json");
  assert.ok(!studios.some(x => /episode-2/.test(x.episode || "")), "Episode 2 is not part of this slice");
});

test("Reflect and Apply never asks for sensitive personal experiences", () => {
  const prompts = [...st("apply").reflect.map(r => r.prompt.en), ...st("perspectives").write.map(w => w.prompt.en)].join(" ");
  assert.match(st("apply").reflect.find(r => r.id === "r3").prompt.en, /real or an imagined/);
  assert.doesNotMatch(prompts, /\b(your family|your feelings about|a time you were hurt|trauma|secret)\b/i);
  assert.match(read("../site/js/btp.js"), /Don't include private details about yourself or other people\./);
});

test("Body language is never taught as lie detection", () => {
  const w = st("words");
  assert.match(w.interpret.lesson.en, /cannot tell you whether someone is lying/);
  assert.ok(w.interpret.meanings.en.length >= 3, "several interpretations");
  assert.match(w.intro.en, /not descriptions of the film/);
  assert.doesNotMatch(JSON.stringify(w), /reveals? (that )?(they|someone) (is|are) lying|sign of lying|liars/i);
});
