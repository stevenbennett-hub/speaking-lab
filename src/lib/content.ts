import textbookData from '../content/textbook.json';
import modulesData from '../content/modules.json';
import speechesData from '../content/speeches.json';
import greatData from '../content/greatSpeeches.json';
import resourcesData from '../content/resources.json';
import glossaryData from '../content/glossary.json';
import occasionsData from '../content/occasions.json';
import patternsData from '../content/patterns.json';
import aiCoachData from '../content/aiCoach.json';
import siteData from '../content/instructor/site.json';
import assignmentsData from '../content/instructor/assignments.json';
import rubricsData from '../content/instructor/rubrics.json';
import labsMeta from '../content/labs/labs.json';
import type { AssignmentSettings, ChoiceItem, Module, Pathway, SpeechType, TextbookRef } from '../types';

export const textbook = textbookData;
export const modules = modulesData as Module[];
export const speeches = speechesData as SpeechType[];
export const site = siteData;
export const assignments = assignmentsData.assignments as AssignmentSettings[];
export const assignmentsAreSample = assignmentsData.isSample;
export const rubrics = rubricsData;
export const labs = labsMeta as { id: string; title: string; short: string; textbook: TextbookRef[]; icon: string }[];
export const occasions = occasionsData;
export const patterns = patternsData;
export const aiCoach = aiCoachData;
export const glossary = glossaryData;
export const resources = resourcesData;

export interface GreatSpeech {
  id: string;
  speaker: string;
  title: string;
  date: string;
  place: string;
  theme: string;
  rights: string;
  context: string;
  purpose: string;
  audience: string;
  strategies: { name: string; description: string }[];
  delivery: string;
  critical: string;
  questions: string[];
  identify: ChoiceItem[];
  connection: string;
  sources: { label: string; url: string; kind: string }[];
  textbook: TextbookRef[];
}
export const greatSpeeches = greatData as GreatSpeech[];

export const MODULE_CATEGORIES: { id: Module['category']; title: string; blurb: string }[] = [
  { id: 'foundations', title: 'Foundations', blurb: 'How communication works, and the listeners, ethics, and confidence underneath every speech.' },
  { id: 'construction', title: 'Speech construction', blurb: 'From a blank page to an organized, researched speech.' },
  { id: 'rhetoric', title: 'Rhetoric and persuasion', blurb: 'Appeals, arguments, reasoning, and the ethics of changing minds.' },
  { id: 'delivery', title: 'Presentation and delivery', blurb: 'Voice, body, notes, and aids: what the audience actually experiences.' },
];

type Chapter = (typeof textbook.chapters)[number];

export function findChapter(n: number | string): Chapter | undefined {
  return textbook.chapters.find((c) => String(c.number) === String(n));
}

/** "Ch. 6, §6.2 (p. 98)" or "Appendix E" style label. */
export function formatRef(ref: TextbookRef): string {
  const ch = findChapter(ref.chapter);
  const isAppendix = typeof ref.chapter === 'string';
  let label = isAppendix ? `Appendix ${ref.chapter}` : `Ch. ${ref.chapter}`;
  if (ch && !ref.section) label += `: ${isAppendix ? ch.title.replace(/^Appendix [A-Z]: /, '') : ch.title}`;
  if (ref.section) {
    label += `, §${ref.section}`;
    const first = ref.section.split(/[–,\s]/)[0];
    const sec = ch?.sections.find((s) => s[0] === first);
    if (sec && sec[2]) label += ` (p. ${sec[2]})`;
  } else if (ch?.page) {
    label += ` (p. ${ch.page})`;
  }
  if (ref.note) label += ` — ${ref.note}`;
  return label;
}

export function sectionTitle(ref: TextbookRef): string | undefined {
  if (!ref.section) return findChapter(ref.chapter)?.title;
  const first = ref.section.split(/[–,\s]/)[0];
  return findChapter(ref.chapter)?.sections.find((s) => s[0] === first)?.[1] as string | undefined;
}

export function getAssignment(speechId: string) {
  return assignments.find((a) => a.speechId === speechId);
}

export function getRubric(speechId: string) {
  return rubrics.rubrics.find((r) => r.speechId === speechId);
}

export function getSpeech(id: string) {
  return speeches.find((s) => s.id === id);
}

export function targetSeconds(speechId: string, pathway: Pathway) {
  return getAssignment(speechId)?.targetSeconds[pathway] ?? 300;
}

export function formatTime(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function glossaryTerm(id: string) {
  return glossary.terms.find((t) => t.id === id);
}
