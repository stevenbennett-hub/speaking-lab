// Daily Learning Journals: one per 90-minute block, numbered by meeting, 10 per 100-point set.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const data = JSON.parse(readFileSync(new URL("../site/data/journals.json", import.meta.url), "utf8"));
const J = data.journals;
const units = JSON.parse(readFileSync(new URL("../site/data/units.json", import.meta.url), "utf8")).units;
const LANGS = ["en", "es"];

test("ids are unique and numbered journals run 1..39 in order", () => {
  assert.equal(new Set(J.map(j => j.id)).size, J.length);
  const nums = J.filter(j => !j.flex).map(j => j.n);
  assert.deepEqual(nums, Array.from({ length: nums.length }, (_, i) => i + 1));
});

test("every journal has complete English and Spanish text", () => {
  for (const j of J) {
    for (const f of ["focus", "prompt", "share"]) for (const l of LANGS) assert.ok(j[f]?.[l]?.trim(), `${j.id} ${f}.${l}`);
    if (j.alt !== null) for (const l of LANGS) assert.ok(j.alt[l]?.trim(), `${j.id} alt.${l}`);
    for (const f of ["frames", "vocab"]) {
      assert.ok(j[f].en.length > 0, `${j.id} ${f}`);
      assert.equal(j[f].en.length, j[f].es.length, `${j.id} ${f} en/es count`);
    }
    for (const fr of [...j.frames.en, ...j.frames.es]) assert.ok(fr.includes("___"), `${j.id} frame has a blank`);
    assert.ok(["approved", "draft"].includes(j.status.en) && ["approved", "draft"].includes(j.status.es));
  }
});

test("meetings run 1..k inside each unit, with at most one flex journal, listed last and placed by `before`", () => {
  for (const u of units) {
    const js = J.filter(j => j.unit === u.id);
    assert.ok(js.length > 0, `unit ${u.id} has journals`);
    assert.deepEqual(js.map(j => j.meeting), js.map((_, i) => i + 1), `unit ${u.id}`);
    const flex = js.filter(j => j.flex);
    assert.ok(flex.length <= 1 && (!flex.length || js.at(-1).flex), `unit ${u.id} flex`);
    if (flex.length && flex[0].before) assert.ok(js.some(j => j.id === flex[0].before && !j.flex), `unit ${u.id} flex.before names a core journal`);
  }
});

test("each unit has about 2.5 journals per course week (one per block)", () => {
  for (const u of units) {
    const core = J.filter(j => j.unit === u.id && !j.flex).length;
    assert.ok(Math.abs(core - u.weeks.length * 2.5) <= 0.5, `unit ${u.id}: ${core} core journals for ${u.weeks.length} weeks`);
  }
});

test("a full semester fills four 100-point sets", () => {
  const meetings = 16 * 2.5;
  assert.equal(meetings, 40);
  const core = J.filter(j => !j.flex).length, flex = J.filter(j => j.flex).length;
  assert.ok(core <= meetings && core + flex >= meetings, `${core} core + ${flex} flex covers ${meetings} meetings`);
  assert.equal(data.minutes, 10);
});

test("Unit 1 flex journal: When Communication Breaks Down, linked to Beyond the Podium", () => {
  const f = J.find(j => j.id === "j-u1-flex");
  assert.equal(f.title.en, "When Communication Breaks Down");
  assert.ok(f.prompt.en.startsWith("Imagine two students are working on a group assignment."));
  assert.equal(f.before, "j05");
  assert.equal(f.experience, "beyond-the-podium-ep1");
  assert.ok(f.vocab.en.length >= 3 && f.frames.en.length >= 2 && f.share.es && f.prompt.es);
});
