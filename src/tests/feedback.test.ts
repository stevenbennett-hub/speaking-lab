import { describe, expect, it } from 'vitest';
import { checkAttention, checkCentralIdea, checkMainPoints, checkSources, checkSpecificPurpose, emptyStudio, outlineToText } from '../lib/feedback';

const levels = (c: { level: string }[]) => c.map((x) => x.level);

describe('specific purpose feedback (Ch. 4)', () => {
  it('accepts a well-formed informative purpose', () => {
    const c = checkSpecificPurpose('To inform my audience how to use spaced practice to study for finals.', 'inform');
    expect(levels(c)).not.toContain('warn');
  });
  it('flags questions, missing infinitive, and two topics', () => {
    expect(checkSpecificPurpose('What is the best way to study?', 'inform').some((c) => c.msg.includes('question'))).toBe(true);
    expect(checkSpecificPurpose('Study methods for my classmates in finals week', 'inform').some((c) => c.msg.includes('infinitive'))).toBe(true);
    expect(checkSpecificPurpose('To explain to my audience how to swing a golf club and choose the best golf shoes.', 'inform').some((c) => c.msg.includes('contains "and'))).toBe(true);
  });
  it('flags verb/content mismatch', () => {
    expect(checkSpecificPurpose('To inform my audience why capital punishment should end.', 'inform').some((c) => c.level === 'warn' && c.msg.includes('persuasive'))).toBe(true);
    expect(checkSpecificPurpose('To inform my classmates about the three types of retirement accounts.', 'persuade').some((c) => c.msg.includes('informative'))).toBe(true);
  });
});

describe('central idea feedback', () => {
  it('accepts a declarative sentence', () => {
    expect(levels(checkCentralIdea('Honeybees share the location of food through the waggle dance, the round dance, and scent signals.'))).toEqual(['ok']);
  });
  it('flags questions, fragments, and announcements', () => {
    expect(levels(checkCentralIdea('Have you ever thought about volunteering?'))).toContain('warn');
    expect(levels(checkCentralIdea('Volunteering.'))).toContain('warn');
    expect(checkCentralIdea('My speech is about the history of the steel drum in Trinidad.').some((c) => c.msg.includes('announces'))).toBe(true);
  });
});

describe('structure, sources, attention', () => {
  it('counts main points', () => {
    expect(levels(checkMainPoints(['One point only']))).toContain('warn');
    expect(levels(checkMainPoints(['A', 'B', 'C']))).toContain('ok');
    expect(levels(checkMainPoints(['1', '2', '3', '4', '5', '6']))).toContain('warn');
  });
  it('tracks source minimums and missing authors', () => {
    const src = { id: 'a', citation: 'Report', author: '', date: '', url: '', kind: '' as const, checks: {}, use: '' };
    const c = checkSources([src], 3);
    expect(c[0].msg).toContain('1 of 3');
    expect(c.some((x) => x.msg.includes('who created it'))).toBe(true);
  });
  it('flags announcement openings', () => {
    expect(levels(checkAttention("Today I'm going to talk about sleep."))).toEqual(['warn']);
    expect(levels(checkAttention('Raise your hand if you slept eight hours last night.'))).toEqual(['ok']);
  });
  it('builds a text outline with intro, body, and conclusion', () => {
    const s = emptyStudio('inform');
    s.centralIdea = 'Bees communicate in three ways.';
    s.mainPoints[0].text = 'The waggle dance';
    const out = outlineToText(s, 'Informative Speech', 'High School Speech');
    expect(out).toContain('INTRODUCTION');
    expect(out).toContain('I. The waggle dance');
    expect(out).toContain('CONCLUSION');
  });
});
