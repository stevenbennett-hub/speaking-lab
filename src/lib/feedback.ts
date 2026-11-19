/**
 * Rule-based formative feedback derived from Chapter 4 (§4.2–4.4), Chapter 5
 * (§5.3), Chapter 6, and Chapter 8 of Exploring Public Speaking.
 * These checks look for patterns; they cannot judge quality. The UI says so.
 */
export type Level = 'ok' | 'warn' | 'tip';
export interface Check {
  level: Level;
  msg: string;
}

const INFORM_VERBS = /^to (inform|explain|describe|teach|show|demonstrate|introduce|define|tell)\b/i;
const PERSUADE_VERBS = /^to (persuade|convince|motivate|encourage|urge|inspire .* to|get .* to)\b/i;
const INSPIRE_VERBS = /^to (entertain|inspire|celebrate|honor|commemorate|share|tell|toast|introduce|thank|remember|pay tribute)\b/i;
const SLANG = /\b(lit|the bomb|goated|lowkey|highkey|super cool|awesome sauce|sus|vibes?)\b/i;

export function wordCount(s: string) {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export function checkSpecificPurpose(text: string, generalPurpose: string): Check[] {
  const t = text.trim();
  if (!t) return [];
  const out: Check[] = [];
  if (!/^to\s/i.test(t)) out.push({ level: 'warn', msg: 'Write it as an infinitive phrase that starts with "To..." (for example, "To inform my audience...").' });
  else out.push({ level: 'ok', msg: 'Written as an infinitive phrase.' });
  if (t.includes('?')) out.push({ level: 'warn', msg: 'A specific purpose should not be a question (Section 4.4).' });
  if (/\sand\s/i.test(t)) out.push({ level: 'warn', msg: 'It contains "and." Check whether you are combining two topics. One specific purpose is enough (the KISS rule in Section 4.4).' });
  if (wordCount(t) < 7) out.push({ level: 'warn', msg: 'It may be too vague. Name your audience and the specific aspect of the topic.' });
  if (wordCount(t) > 30) out.push({ level: 'tip', msg: 'It is long. Can you say it in one breath?' });
  if (generalPurpose === 'inform') {
    if (PERSUADE_VERBS.test(t)) out.push({ level: 'warn', msg: 'Your general purpose is to inform, but the verb is persuasive.' });
    else if (/^to/i.test(t) && !INFORM_VERBS.test(t)) out.push({ level: 'tip', msg: 'Informative purposes usually use verbs like inform, explain, describe, or demonstrate.' });
    if (/\b(why|should|better than|best|worst)\b/i.test(t)) out.push({ level: 'warn', msg: 'Words like "why," "should," or "better than" usually signal a position, which makes this persuasive (Section 4.4).' });
  }
  if (generalPurpose === 'persuade') {
    if (INFORM_VERBS.test(t)) out.push({ level: 'warn', msg: 'Your general purpose is to persuade, but the verb is informative. Try "To persuade my audience to..." or "...that..."' });
    else if (PERSUADE_VERBS.test(t)) out.push({ level: 'ok', msg: 'The verb matches a persuasive purpose.' });
  }
  if (generalPurpose === 'entertain/inspire' || generalPurpose === 'commemorate') {
    if (INSPIRE_VERBS.test(t) || INFORM_VERBS.test(t)) out.push({ level: 'ok', msg: 'The verb fits this kind of speech.' });
  }
  if (SLANG.test(t)) out.push({ level: 'warn', msg: 'Use concrete language instead of slang (Section 4.4).' });
  return out;
}

export function checkCentralIdea(text: string): Check[] {
  const t = text.trim();
  if (!t) return [];
  const out: Check[] = [];
  if (t.endsWith('?')) out.push({ level: 'warn', msg: 'The central idea must be a declarative sentence, not a question.' });
  else if (!/[.!]$/.test(t)) out.push({ level: 'tip', msg: 'Write it as a complete sentence ending with a period.' });
  if (wordCount(t) < 7) out.push({ level: 'warn', msg: 'This may be a fragment. A central idea makes a full statement about your topic.' });
  if (/^(my speech is (about|on)|today i('m| am) going to|i('m| am) going to (talk|speak|tell)|this speech (is|will))/i.test(t))
    out.push({ level: 'warn', msg: 'This announces your topic instead of stating your message. Say the idea itself.' });
  if (/^to\s/i.test(t)) out.push({ level: 'warn', msg: 'This looks like a specific purpose. The central idea is a full sentence stating your message.' });
  if (SLANG.test(t)) out.push({ level: 'warn', msg: 'Replace slang with concrete language.' });
  if (out.length === 0) out.push({ level: 'ok', msg: 'A complete declarative sentence. Check that every main point supports it.' });
  return out;
}

export function checkMainPoints(points: string[]): Check[] {
  const filled = points.map((p) => p.trim()).filter(Boolean);
  const out: Check[] = [];
  if (filled.length === 0) return [];
  if (filled.length < 2) out.push({ level: 'warn', msg: 'Most speeches need at least two main points.' });
  else if (filled.length > 5) out.push({ level: 'warn', msg: 'More than five main points is hard for listeners to follow. Combine or cut.' });
  else out.push({ level: 'ok', msg: `${filled.length} main points: a manageable number.` });
  const lower = filled.map((p) => p.toLowerCase());
  if (new Set(lower).size !== lower.length) out.push({ level: 'warn', msg: 'Two main points are identical.' });
  const lengths = filled.map(wordCount);
  if (filled.length >= 2 && Math.max(...lengths) > 3 * Math.min(...lengths)) out.push({ level: 'tip', msg: 'Your main points vary a lot in length. Parallel wording helps listeners follow the structure.' });
  return out;
}

export interface Source {
  id: string;
  citation: string;
  author: string;
  date: string;
  url: string;
  kind: 'primary' | 'secondary' | '';
  checks: { current?: boolean; relevant?: boolean; who?: boolean; upstream?: boolean; lateral?: boolean };
  use: string;
}

export function checkSources(sources: Source[], min: number): Check[] {
  const out: Check[] = [];
  const real = sources.filter((s) => s.citation.trim() || s.author.trim());
  if (min > 0) {
    if (real.length < min) out.push({ level: 'warn', msg: `${real.length} of ${min} sources listed for this assignment's sample requirement.` });
    else out.push({ level: 'ok', msg: `${real.length} sources listed (sample requirement: ${min}).` });
  }
  real.forEach((s, i) => {
    const n = i + 1;
    if (!s.author.trim()) out.push({ level: 'warn', msg: `Source ${n}: who created it? You'll need this for your oral citation.` });
    if (!s.date.trim()) out.push({ level: 'warn', msg: `Source ${n}: add a date so you can judge whether it is current.` });
    const checks = Object.values(s.checks).filter(Boolean).length;
    if (checks < 3) out.push({ level: 'tip', msg: `Source ${n}: you've completed ${checks} of 5 credibility checks.` });
    if (!s.use.trim()) out.push({ level: 'tip', msg: `Source ${n}: note which main point it supports.` });
  });
  return out;
}

export function checkAttention(text: string): Check[] {
  const t = text.trim();
  if (!t) return [];
  if (/^(hi|hello|good (morning|afternoon)),? (my name is|i('m| am))|^today i('m| am) going to (talk|tell)|^my speech is/i.test(t))
    return [{ level: 'warn', msg: 'This announces rather than attracts. Try a story, startling fact, rhetorical question, or reference to the audience (Section 8.2).' }];
  return [{ level: 'ok', msg: 'Not a plain announcement. Read it aloud: would it make you want to hear more?' }];
}

export interface StudioState {
  topic: string;
  generalPurpose: string;
  audienceKnow: string;
  audienceAttitude: string;
  context: string;
  specificPurpose: string;
  centralIdea: string;
  sources: Source[];
  pattern: string;
  mainPoints: { id: string; text: string; sub: string; support: string }[];
  intro: { attention: string; credibility: string; rapport: string; preview: string };
  transitions: string[];
  conclusion: { signal: string; restate: string; clincher: string };
  rehearse: boolean[];
  reflect: { strengths: string; improve: string; goal: string };
}

export const emptyStudio = (generalPurpose = ''): StudioState => ({
  topic: '', generalPurpose, audienceKnow: '', audienceAttitude: '', context: '',
  specificPurpose: '', centralIdea: '', sources: [], pattern: '',
  mainPoints: [
    { id: 'mp1', text: '', sub: '', support: '' },
    { id: 'mp2', text: '', sub: '', support: '' },
  ],
  intro: { attention: '', credibility: '', rapport: '', preview: '' },
  transitions: [],
  conclusion: { signal: '', restate: '', clincher: '' },
  rehearse: [],
  reflect: { strengths: '', improve: '', goal: '' },
});

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

/** Plain-text preparation outline for copy/download. */
export function outlineToText(s: StudioState, title: string, pathwayLabel: string) {
  const line = (label: string, v: string) => (v.trim() ? `${label}: ${v.trim()}` : `${label}: ____`);
  const parts: string[] = [];
  parts.push(`${title} — Preparation Outline`, `Pathway: ${pathwayLabel}`, `Topic: ${s.topic || '____'}`, '');
  parts.push(line('General purpose', s.generalPurpose), line('Specific purpose', s.specificPurpose), line('Central idea', s.centralIdea), '');
  parts.push('INTRODUCTION', `  ${line('Attention', s.intro.attention)}`, `  ${line('Credibility', s.intro.credibility)}`, `  ${line('Rapport', s.intro.rapport)}`, `  ${line('Central idea', s.centralIdea)}`, `  ${line('Preview', s.intro.preview)}`, '');
  parts.push(`BODY${s.pattern ? ` (pattern: ${s.pattern})` : ''}`);
  s.mainPoints.forEach((mp, i) => {
    parts.push(`  ${ROMAN[i] ?? i + 1}. ${mp.text.trim() || '____'}`);
    mp.sub.split('\n').map((x) => x.trim()).filter(Boolean).forEach((sub, j) => parts.push(`     ${String.fromCharCode(65 + j)}. ${sub}`));
    if (mp.support.trim()) parts.push(`     Support: ${mp.support.trim()}`);
    if (i < s.mainPoints.length - 1) parts.push(`  Transition: ${s.transitions[i]?.trim() || '____'}`);
  });
  parts.push('', 'CONCLUSION', `  ${line('Signal the end', s.conclusion.signal)}`, `  ${line('Restate main points', s.conclusion.restate)}`, `  ${line('Clincher', s.conclusion.clincher)}`, '');
  const srcs = s.sources.filter((x) => x.citation.trim() || x.author.trim());
  if (srcs.length) {
    parts.push('SOURCES');
    srcs.forEach((x) => parts.push(`  - ${x.citation.trim() || `${x.author} (${x.date})`}${x.url ? ` ${x.url}` : ''}`));
  }
  parts.push('', 'Planned with The Speaking Lab. All ideas, research, and wording are the student\'s own.');
  return parts.join('\n');
}
