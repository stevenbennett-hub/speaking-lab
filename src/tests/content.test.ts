import { describe, expect, it } from 'vitest';
import { assignments, findChapter, glossary, greatSpeeches, labs, modules, resources, rubrics, speeches, textbook } from '../lib/content';
import rhetoric from '../content/labs/rhetoric.json';
import audience from '../content/labs/audience.json';
import opening from '../content/labs/opening.json';
import fallacy from '../content/labs/fallacy.json';
import visual from '../content/labs/visual.json';
import anxiety from '../content/labs/anxiety.json';
import evidence from '../content/labs/evidence.json';
import organization from '../content/labs/organization.json';
import type { ChoiceItem, TextbookRef } from '../types';

function checkRef(ref: TextbookRef, where: string) {
  const ch = findChapter(ref.chapter);
  expect(ch, `${where}: chapter ${ref.chapter} not in textbook.json`).toBeTruthy();
  if (ref.section && ch) {
    const nums = ref.section.match(/\d+\.\d+/g) ?? [];
    for (const n of nums) {
      expect(ch.sections.some((s) => s[0] === n), `${where}: section ${n} not in chapter ${ref.chapter}`).toBe(true);
    }
  }
}

function checkChoices(items: ChoiceItem[], where: string) {
  const ids = new Set<string>();
  for (const it of items) {
    expect(ids.has(it.id), `${where}: duplicate id ${it.id}`).toBe(false);
    ids.add(it.id);
    expect(it.options.length, `${where}/${it.id}: needs 2+ options`).toBeGreaterThanOrEqual(2);
    expect(it.options.filter((o) => o.correct).length, `${where}/${it.id}: exactly one best answer`).toBe(1);
    it.options.forEach((o) => expect(o.feedback.trim().length, `${where}/${it.id}: every option needs feedback`).toBeGreaterThan(0));
  }
}

describe('textbook map', () => {
  it('has all 15 chapters', () => {
    for (let i = 1; i <= 15; i++) expect(findChapter(i)?.title).toBeTruthy();
    expect(textbook.license).toBe('CC BY-NC-SA 4.0');
  });
});

describe('learn modules', () => {
  it('every module has all seven required parts and valid references', () => {
    expect(modules.length).toBe(24);
    const ids = new Set(modules.map((m) => m.id));
    expect(ids.size).toBe(modules.length);
    for (const m of modules) {
      expect(m.summary && m.example.text && m.reflection && m.college, m.id).toBeTruthy();
      expect(m.textbook.length, m.id).toBeGreaterThan(0);
      m.textbook.forEach((r) => checkRef(r, m.id));
      checkChoices([m.activity], m.id);
      (m.vocab ?? []).forEach((v) => expect(glossary.terms.some((t) => t.id === v), `${m.id}: unknown glossary term ${v}`).toBe(true));
    }
  });
});

describe('speeches, assignments, rubrics', () => {
  it('speech pages reference real chapters and have core sections', () => {
    for (const s of speeches) {
      s.textbook.forEach((r) => checkRef(r, s.id));
      expect(s.steps.length && s.tools.length && s.checklist.length && s.topicIdeas.length, s.id).toBeTruthy();
      expect(s.objectives.hs.length && s.objectives.college.length, s.id).toBeTruthy();
    }
    expect(speeches.filter((s) => s.category === 'major').length).toBe(4);
  });
  it('every speech has assignment settings and a rubric whose weights total 100', () => {
    for (const s of speeches) {
      expect(assignments.find((a) => a.speechId === s.id), `assignment for ${s.id}`).toBeTruthy();
      const r = rubrics.rubrics.find((x) => x.speechId === s.id);
      expect(r, `rubric for ${s.id}`).toBeTruthy();
      expect(r!.criteria.reduce((a, c) => a + c.weight, 0), `rubric weights for ${s.id}`).toBe(100);
    }
    for (const a of assignments) expect(speeches.some((s) => s.id === a.speechId), `assignment ${a.speechId} has no speech`).toBe(true);
  });
});

describe('labs', () => {
  it('choice-based labs have one best answer and feedback for every option', () => {
    checkChoices(rhetoric as ChoiceItem[], 'rhetoric');
    checkChoices(audience as ChoiceItem[], 'audience');
    checkChoices(opening.pairs as ChoiceItem[], 'opening');
    checkChoices(fallacy as ChoiceItem[], 'fallacy');
    checkChoices(visual as ChoiceItem[], 'visual');
    checkChoices(anxiety.thoughts as ChoiceItem[], 'anxiety');
    expect(labs.length).toBe(9);
    labs.forEach((l) => l.textbook.forEach((r) => checkRef(r, l.id)));
  });
  it('evidence answers are valid categories', () => {
    evidence.items.forEach((i) => expect(evidence.categories).toContain(i.answer));
  });
  it('organization puzzles have at least four pieces', () => {
    organization.forEach((p) => expect(p.pieces.length).toBeGreaterThanOrEqual(4));
  });
});

describe('great speeches and resources', () => {
  it('exhibits have sources, rights notes, and valid identification items', () => {
    for (const g of greatSpeeches) {
      expect(g.sources.length, g.id).toBeGreaterThan(0);
      expect(g.rights.length, g.id).toBeGreaterThan(0);
      g.sources.forEach((s) => expect(s.url, g.id).toMatch(/^https:\/\//));
      checkChoices(g.identify, g.id);
      g.textbook.forEach((r) => checkRef(r, g.id));
    }
  });
  it('resources have descriptions, relevance, a known license type, and https or internal links', () => {
    for (const r of resources.items) {
      expect(r.description && r.relevance, r.title).toBeTruthy();
      expect(['open', 'free', 'public', 'site']).toContain(r.license);
      expect(r.url, r.title).toMatch(/^(https:\/\/|#\/)/);
      expect(resources.categories).toContain(r.category);
    }
  });
});
