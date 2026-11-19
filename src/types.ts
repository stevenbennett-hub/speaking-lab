export type Pathway = 'hs' | 'college';

export interface TextbookRef {
  chapter: number | string; // number for chapters, "A".."J" for appendices
  section?: string; // e.g. "6.2"
  note?: string;
}

export interface ChoiceOption {
  text: string;
  correct?: boolean;
  feedback: string;
}

export interface ChoiceItem {
  id: string;
  prompt: string;
  context?: string;
  options: ChoiceOption[];
  explanation?: string;
}

export interface Module {
  id: string;
  category: 'foundations' | 'construction' | 'rhetoric' | 'delivery';
  title: string;
  summary: string;
  keyIdeas: string[];
  example: { setting: string; text: string };
  textbook: TextbookRef[];
  activity: ChoiceItem;
  reflection: string;
  college: string;
  vocab?: string[];
  practice?: { label: string; to: string };
}

export interface ToolField {
  id: string;
  label: string;
  help?: string;
  frame?: string;
  rows?: number;
}

export type SpeechTool =
  | { id: string; type: 'organizer'; title: string; intro?: string; fields: ToolField[] }
  | { id: string; type: 'arc'; title: string; intro?: string }
  | { id: string; type: 'patterns'; title: string; intro?: string; patterns: string[] }
  | { id: string; type: 'monroe'; title: string; intro?: string }
  | { id: string; type: 'tone'; title: string; intro?: string }
  | { id: string; type: 'link'; title: string; intro?: string; to: string; label: string };

export interface SpeechType {
  id: string;
  number: number | null;
  category: 'major' | 'optional';
  title: string;
  tagline: string;
  generalPurpose: 'inform' | 'persuade' | 'entertain/inspire' | 'commemorate' | 'varies';
  summary: string;
  whyItMatters: string;
  objectives: { hs: string[]; college: string[] };
  learn: string[];
  textbook: TextbookRef[];
  steps: { title: string; detail: string }[];
  tools: SpeechTool[];
  topicIdeas: string[];
  structures: { name: string; outline: string[] }[];
  checklist: string[];
  reflection: string[];
  collegeExtension: string;
}

export interface AssignmentSettings {
  speechId: string;
  status: 'current' | 'upcoming' | 'completed' | 'not-assigned';
  dueDate?: string;
  hs: { time: string; sources: string; notes: string };
  college: { time: string; sources: string; notes: string };
  targetSeconds: { hs: number; college: number };
  minSources: { hs: number; college: number };
}

export interface RubricCriterion {
  name: string;
  weight: number;
  description: string;
}

export interface Rubric {
  speechId: string;
  levels: string[];
  criteria: RubricCriterion[];
}
