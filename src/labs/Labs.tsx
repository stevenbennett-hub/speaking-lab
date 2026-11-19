import { ReactNode, useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, RotateCcw } from 'lucide-react';
import rhetoric from '../content/labs/rhetoric.json';
import audience from '../content/labs/audience.json';
import opening from '../content/labs/opening.json';
import organization from '../content/labs/organization.json';
import evidence from '../content/labs/evidence.json';
import fallacy from '../content/labs/fallacy.json';
import visual from '../content/labs/visual.json';
import anxiety from '../content/labs/anxiety.json';
import { usePersistentState } from '../lib/hooks';
import { useProgress } from '../lib/progress';
import { usePathway } from '../lib/pathway';
import { checkAttention } from '../lib/feedback';
import { ChoiceSet } from '../components/ChoiceSet';
import { CopyButton, Notice, Reflection, SENTENCE_FRAMES, Stage, TextbookRefs } from '../components/ui';
import { Checklist, Organizer } from '../components/Tools';
import { BreathingPacer, SpeechTimer } from '../components/Timer';
import type { ChoiceItem, TextbookRef } from '../types';

interface ShellProps {
  id: string;
  textbook: TextbookRef[];
  explore: ReactNode;
  understand: ReactNode;
  apply: ReactNode;
  practice: ReactNode;
  reflect: string;
}

function LabShell({ id, textbook, explore, understand, apply, practice, reflect }: ShellProps) {
  const { pathway } = usePathway();
  return (
    <div className="wrap py-4">
      <Stage n={0} title="Start here">{explore}</Stage>
      <Stage n={1} title="The key idea">
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div>{understand}</div>
          <TextbookRefs refs={textbook} />
        </div>
      </Stage>
      <Stage n={2} title="Make decisions, get feedback">{apply}</Stage>
      <Stage n={3} title="Apply it to your current speech">{practice}</Stage>
      <Stage n={4} title="Think back">
        <Reflection storageKey={`reflect:lab:${id}`} prompt={reflect} frames={pathway === 'hs' ? SENTENCE_FRAMES.reflect : undefined} />
      </Stage>
    </div>
  );
}

/* ---------------- Rhetoric ---------------- */
export function RhetoricLab() {
  return (
    <LabShell
      id="rhetoric"
      textbook={[{ chapter: 13, section: '13.4' }]}
      explore={<p className="max-w-prose text-lg">Speakers persuade through who they are, what we feel, and what makes sense. Read eight original lines from imaginary speeches and decide which appeal does the most work in each.</p>}
      understand={
        <div className="space-y-4">
          <dl className="grid gap-4 sm:grid-cols-3">
            {[['Ethos', 'Credibility and character: why should we trust this speaker?'], ['Pathos', 'Emotion and values: why should we care?'], ['Logos', 'Logic and evidence: why does it make sense?']].map(([t, d]) => (
              <div key={t} className="panel"><dt className="font-display text-2xl font-bold">{t}</dt><dd className="mt-1">{d}</dd></div>
            ))}
          </dl>
          <p>Many lines use more than one appeal. Choose the one doing the <em>most</em> work, then read the feedback.</p>
        </div>
      }
      apply={<ChoiceSet activityId="lab:rhetoric" items={rhetoric as ChoiceItem[]} />}
      practice={
        <Organizer scope="lab-rhetoric" tool={{ id: 'own', type: 'organizer', title: 'Three appeals for my speech', intro: 'Write one sentence for each appeal that you could actually use in your current speech.', fields: [
          { id: 'ethos', label: 'Ethos sentence', frame: 'As someone who...' },
          { id: 'pathos', label: 'Pathos sentence', frame: 'Imagine...' },
          { id: 'logos', label: 'Logos sentence (with a real source)', frame: 'According to...' },
        ] }} />
      }
      reflect="Which appeal comes most naturally to you? Which one does your current speech need more of?"
    />
  );
}

/* ---------------- Audience ---------------- */
export function AudienceLab() {
  return (
    <LabShell
      id="audience"
      textbook={[{ chapter: 2, section: '2.1–2.4' }, { chapter: 'A' }, { chapter: 'C' }]}
      explore={<p className="max-w-prose text-lg">The same message can land differently with different listeners. In five fictional situations, choose the adaptation that respects the audience and serves your purpose.</p>}
      understand={
        <div className="space-y-3">
          <p>Audience-centered speakers consider <strong>demographic</strong> factors, <strong>psychographic</strong> factors (attitudes, beliefs, values, needs), and <strong>context</strong>.</p>
          <p className="rounded-md bg-stage-soft p-3">Demographics can hint at shared experiences, but they never tell you what an individual thinks. The best audience analysis gathers real information: ask, survey, observe.</p>
        </div>
      }
      apply={<ChoiceSet activityId="lab:audience" items={audience as ChoiceItem[]} />}
      practice={
        <Organizer scope="lab-audience" tool={{ id: 'own', type: 'organizer', title: 'Adapting my speech', fields: [
          { id: 'who', label: 'Who will actually hear my speech?' },
          { id: 'know', label: 'What do I know (not assume) about what they know and care about? How do I know it?' },
          { id: 'adapt', label: 'One main point, adapted: an example, analogy, or definition chosen for this audience', rows: 3 },
          { id: 'other', label: 'How would that same point change for a very different audience?', rows: 3 },
        ] }} />
      }
      reflect="What did you assume about your audience before this lab that you now want to check?"
    />
  );
}

/* ---------------- Opening line ---------------- */
function IntroBuilder() {
  const [data, setData] = usePersistentState<Record<string, string>>('tool:lab-opening:builder', {});
  const { markComplete } = useProgress();
  const filled = opening.elements.filter((e) => data[e.id]?.trim()).length;
  const full = opening.elements.map((e) => data[e.id]?.trim()).filter(Boolean).join(' ');
  const set = (id: string, v: string) => {
    const next = { ...data, [id]: v };
    setData(next);
    if (opening.elements.every((e) => next[e.id]?.trim())) markComplete('lab:opening:builder');
  };
  return (
    <div className="space-y-4">
      <div className="h-3 overflow-hidden rounded-full bg-mist" role="progressbar" aria-valuemin={0} aria-valuemax={5} aria-valuenow={filled} aria-label="Introduction elements completed">
        <div className="h-full bg-stage transition-all" style={{ width: `${filled * 20}%` }} />
      </div>
      {opening.elements.map((e, i) => (
        <IntroField key={e.id} n={i + 1} label={e.label} help={e.help} value={data[e.id] ?? ''} onChange={(v) => set(e.id, v)} feedback={e.id === 'attention' ? checkAttention(data[e.id] ?? '') : []} />
      ))}
      {filled >= 2 && (
        <div className="panel">
          <p className="font-bold">Read it aloud</p>
          <p className="mt-2">{full}</p>
          <p className="mt-2 text-sm text-ink/75">{filled < 5 ? `${5 - filled} element${5 - filled === 1 ? '' : 's'} still missing.` : 'All five elements are present. Time it: most classroom introductions take 10–15% of the speech.'}</p>
          <div className="mt-3"><CopyButton text={full} label="Copy introduction" /></div>
        </div>
      )}
    </div>
  );
}

function IntroField({ n, label, help, value, onChange, feedback }: { n: number; label: string; help: string; value: string; onChange: (v: string) => void; feedback: { level: string; msg: string }[] }) {
  const id = useId();
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block">{n}. {label}</label>
      <p className="text-sm text-ink/75">{help}</p>
      <textarea id={id} rows={2} value={value} onChange={(e) => onChange(e.target.value)} />
      {feedback.length > 0 && <p aria-live="polite" className={`rounded-md p-2 text-sm ${feedback[0].level === 'ok' ? 'bg-hs-soft' : 'bg-stage-soft'}`}>{feedback[0].msg}</p>}
    </div>
  );
}

export function OpeningLab() {
  return (
    <LabShell
      id="opening"
      textbook={[{ chapter: 8, section: '8.2–8.3' }]}
      explore={<p className="max-w-prose text-lg">Your first thirty seconds decide whether people lean in or tune out. Compare four pairs of openings, then build your own introduction element by element.</p>}
      understand={
        <ol className="list-decimal space-y-1 pl-6">
          {opening.elements.map((e) => <li key={e.id}><strong>{e.label}.</strong> {e.help}</li>)}
        </ol>
      }
      apply={<ChoiceSet activityId="lab:opening" items={opening.pairs as ChoiceItem[]} />}
      practice={<IntroBuilder />}
      reflect="Which attention strategy suits your topic and audience best? Why?"
    />
  );
}

/* ---------------- Organization ---------------- */
function shuffle<T>(arr: T[], seed: number) {
  const a = arr.map((v, i) => ({ v, k: Math.sin(seed * (i + 1) * 9301) }));
  a.sort((x, y) => x.k - y.k);
  const out = a.map((x) => x.v);
  return out.every((v, i) => v === arr[i]) ? [...out.slice(1), out[0]] : out;
}

function OrderPuzzle({ puzzle }: { puzzle: (typeof organization)[number] }) {
  const [seed, setSeed] = useState(1);
  const start = useMemo(() => shuffle(puzzle.pieces.map((_, i) => i), seed + puzzle.id.length), [seed, puzzle]);
  const [order, setOrder] = useState<number[]>(start);
  const [checked, setChecked] = useState(false);
  const { markComplete } = useProgress();
  const [announce, setAnnounce] = useState('');
  const move = (pos: number, dir: -1 | 1) => {
    const to = pos + dir;
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    [next[pos], next[to]] = [next[to], next[pos]];
    setOrder(next);
    setChecked(false);
    setAnnounce(`Moved to position ${to + 1} of ${order.length}.`);
  };
  const correct = order.every((v, i) => v === i);
  const check = () => {
    setChecked(true);
    if (correct) markComplete(`lab:organization:${puzzle.id}`);
  };
  const restart = () => {
    const s = seed + 1;
    setSeed(s);
    setOrder(shuffle(puzzle.pieces.map((_, i) => i), s + puzzle.id.length));
    setChecked(false);
  };
  const right = order.filter((v, i) => v === i).length;
  return (
    <div className="panel space-y-3">
      <h3 className="text-2xl">{puzzle.title}</h3>
      <p className="text-ink/80">Use the arrow buttons to put these sections in a logical order. Pattern hint: think about how listeners would need to hear it.</p>
      <ol className="space-y-2">
        {order.map((pieceIdx, pos) => {
          const ok = checked && pieceIdx === pos;
          const bad = checked && pieceIdx !== pos;
          return (
            <li key={pieceIdx} className={`flex items-center gap-2 rounded-md border-2 p-2 ${ok ? 'border-hs bg-hs-soft' : bad ? 'border-brick bg-brick-soft' : 'border-mist bg-white'}`}>
              <span className="w-6 text-center font-bold" aria-hidden="true">{pos + 1}</span>
              <span className="flex-1">{puzzle.pieces[pieceIdx]}</span>
              <span className="flex flex-col">
                <button type="button" className="rounded p-1 hover:bg-mist disabled:opacity-30" aria-label={`Move up: ${puzzle.pieces[pieceIdx].slice(0, 40)}`} disabled={pos === 0} onClick={() => move(pos, -1)}><ArrowUp size={18} /></button>
                <button type="button" className="rounded p-1 hover:bg-mist disabled:opacity-30" aria-label={`Move down: ${puzzle.pieces[pieceIdx].slice(0, 40)}`} disabled={pos === order.length - 1} onClick={() => move(pos, 1)}><ArrowDown size={18} /></button>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="sr-only" aria-live="polite">{announce}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary" onClick={check}>Check order</button>
        <button type="button" className="btn-quiet" onClick={restart}><RotateCcw size={16} aria-hidden="true" /> Shuffle again</button>
      </div>
      <div aria-live="polite">
        {checked && (
          <div className={`rounded-md p-3 ${correct ? 'bg-hs-soft' : 'bg-stage-soft'}`}>
            {correct ? (
              <p><strong>Logical order.</strong> Pattern: {puzzle.pattern}. {puzzle.why}</p>
            ) : (
              <p><strong>{right} of {order.length} are in place.</strong> Highlighted sections are out of position. Ask: what does the listener need to know first? Where do the introduction and conclusion belong?</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function OrganizationLab() {
  return (
    <LabShell
      id="organization"
      textbook={[{ chapter: 6, section: '6.2–6.3' }, { chapter: 13, section: '13.5' }]}
      explore={<p className="max-w-prose text-lg">Listeners can't flip back a page. Three speeches below have been scrambled. Put each back together, then check your reasoning.</p>}
      understand={<p className="max-w-prose">Choose a pattern that matches your specific purpose: chronological for processes and history, spatial for places, topical for categories, cause/effect for explanations, and problem-solution, problem-cause-solution, or Monroe's Motivated Sequence for persuasion.</p>}
      apply={<div className="space-y-6">{organization.map((p) => <OrderPuzzle key={p.id} puzzle={p} />)}</div>}
      practice={
        <div className="space-y-3">
          <p>Open your speech in the Studio's Organize step. Read only your main points aloud. Could a listener predict the pattern?</p>
          <Link to="/studio" className="btn-primary">Go to the Studio</Link>
        </div>
      }
      reflect="Which scrambled speech was hardest to order? What clue finally helped?"
    />
  );
}

/* ---------------- Evidence ---------------- */
const defs = evidence.definitions as Record<string, string>;
const evidenceItems: ChoiceItem[] = evidence.items.map((it) => ({
  id: it.id,
  prompt: it.text,
  options: evidence.categories.map((c) => ({
    text: c,
    correct: c === it.answer,
    feedback: c === it.answer ? it.feedback : `${c}: ${defs[c]}`,
  })),
}));

export function EvidenceLab() {
  return (
    <LabShell
      id="evidence"
      textbook={[{ chapter: 5, section: '5.3' }, { chapter: 7, section: '7.2' }, { chapter: 12, section: '12.1' }]}
      explore={<p className="max-w-prose text-lg">Not everything that sounds convincing is evidence. Sort eight statements into five categories.</p>}
      understand={
        <dl className="grid gap-3 sm:grid-cols-2">
          {evidence.categories.map((c) => <div key={c} className="panel"><dt className="font-bold">{c}</dt><dd>{defs[c]}</dd></div>)}
        </dl>
      }
      apply={<ChoiceSet activityId="lab:evidence" items={evidenceItems} />}
      practice={
        <Organizer scope="lab-evidence" tool={{ id: 'own', type: 'organizer', title: 'Evidence audit', intro: 'Choose the most important claim in your speech.', fields: [
          { id: 'claim', label: 'My claim' },
          { id: 'support', label: 'The evidence I have for it, and its source' },
          { id: 'category', label: 'Which category is that evidence? Be honest.' },
          { id: 'upgrade', label: 'How could I upgrade it? (go upstream, find an expert source, read laterally)' },
        ] }} />
      }
      reflect="Which statement was hardest to classify? What made it tricky?"
    />
  );
}

/* ---------------- Fallacy ---------------- */
export function FallacyLab() {
  return (
    <LabShell
      id="fallacy"
      textbook={[{ chapter: 14, section: '14.4' }]}
      explore={<p className="max-w-prose text-lg">Ten cases. Each contains a reasoning error. Identify the fallacy, then read why the argument fails, and how it could be fixed.</p>}
      understand={<p className="max-w-prose">A fallacy makes an argument <em>feel</em> stronger than it is. Naming it is a start; explaining the missing reasoning is the skill. All ten fallacies here appear in Section 14.4.</p>}
      apply={<ChoiceSet activityId="lab:fallacy" items={fallacy as ChoiceItem[]} />}
      practice={
        <Organizer scope="lab-fallacy" tool={{ id: 'own', type: 'organizer', title: 'Fallacy check on my argument', fields: [
          { id: 'claim', label: 'My main claim' },
          { id: 'risk', label: 'Which fallacy am I most at risk of? (for example, a hasty generalization from one story)' },
          { id: 'fix', label: 'What evidence or wording keeps my argument sound?' },
        ] }} />
      }
      reflect="Which fallacy do you hear most in everyday life? Where?"
    />
  );
}

/* ---------------- Delivery ---------------- */
const DELIVERY_SKILLS = ['Eye contact', 'Volume', 'Rate', 'Vocal variety', 'Pauses', 'Gestures', 'Posture', 'Few vocalized fillers', 'Confidence'];
export interface DeliveryAssessment { date: string; ratings: Record<string, number>; note: string }

function PauseMarker() {
  const [text, setText] = usePersistentState<string>('tool:lab-delivery:passage', '');
  const [marks, setMarks] = usePersistentState<{ pauses: number[]; stress: number[] }>('tool:lab-delivery:marks', { pauses: [], stress: [] });
  const [mode, setMode] = useState<'pause' | 'stress'>('pause');
  const id = useId();
  const words = text.trim() ? text.trim().split(/\s+/) : [];
  const toggle = (i: number) => {
    const list = mode === 'pause' ? marks.pauses : marks.stress;
    const next = list.includes(i) ? list.filter((x) => x !== i) : [...list, i];
    setMarks(mode === 'pause' ? { ...marks, pauses: next } : { ...marks, stress: next });
  };
  const marked = words.map((w, i) => `${marks.stress.includes(i) ? `*${w}*` : w}${marks.pauses.includes(i) ? ' ‖' : ''}`).join(' ');
  return (
    <div className="space-y-3">
      <label htmlFor={id} className="block">Paste a short passage from your speech (about 3–5 sentences)</label>
      <textarea id={id} rows={4} value={text} onChange={(e) => { setText(e.target.value); setMarks({ pauses: [], stress: [] }); }} />
      {words.length > 0 && (
        <>
          <fieldset>
            <legend className="font-bold">Mark</legend>
            <div className="mt-1 flex gap-2">
              {(['pause', 'stress'] as const).map((m) => (
                <label key={m} className={`chip cursor-pointer font-normal ${mode === m ? 'bg-ink text-white' : 'bg-white'}`}>
                  <input type="radio" className="sr-only" name="markmode" checked={mode === m} onChange={() => setMode(m)} />
                  {m === 'pause' ? 'Pauses (‖ after a word)' : 'Emphasis (stress a word)'}
                </label>
              ))}
            </div>
          </fieldset>
          <p className="text-sm text-ink/75">Select words to add or remove marks. Pause before or after key ideas; stress the one word that carries the meaning.</p>
          <div className="flex flex-wrap gap-1 rounded-md bg-white p-3 leading-loose">
            {words.map((w, i) => (
              <button
                key={i}
                type="button"
                aria-pressed={mode === 'pause' ? marks.pauses.includes(i) : marks.stress.includes(i)}
                onClick={() => toggle(i)}
                className={`rounded px-1 ${marks.stress.includes(i) ? 'bg-stage font-bold' : 'hover:bg-mist'}`}
              >
                {w}{marks.pauses.includes(i) && <span className="ml-1 font-bold text-brick" aria-label="pause">‖</span>}
              </button>
            ))}
          </div>
          <p aria-live="polite" className="text-sm">{marks.pauses.length} pauses, {marks.stress.length} stressed words.{marks.stress.length > words.length / 4 ? ' Stressing too many words means none stand out.' : ''}</p>
          <CopyButton text={marked} label="Copy marked passage" />
        </>
      )}
    </div>
  );
}

function DeliverySelfAssessment() {
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [note, setNote] = useState('');
  const [history, setHistory] = usePersistentState<DeliveryAssessment[]>('delivery:assessments', []);
  const { markComplete } = useProgress();
  const noteId = useId();
  const complete = DELIVERY_SKILLS.every((k) => draft[k]);
  const save = () => {
    setHistory([...history, { date: new Date().toISOString(), ratings: draft, note }]);
    markComplete('lab:delivery:self');
    setDraft({});
    setNote('');
  };
  const first = history[0];
  const last = history[history.length - 1];
  return (
    <div className="space-y-4">
      <p>Rate your most recent practice run or speech from 1 (just starting) to 5 (a real strength).</p>
      <div className="space-y-3">
        {DELIVERY_SKILLS.map((k) => (
          <fieldset key={k} className="grid items-center gap-2 sm:grid-cols-[12rem_1fr]">
            <legend className="sr-only">{k}</legend>
            <span aria-hidden="true" className="font-bold">{k}</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-md border-2 font-bold ${draft[k] === n ? 'border-ink bg-ink text-white' : 'border-mist bg-white hover:border-ink/40'}`}>
                  <input type="radio" className="sr-only" name={`del-${k}`} checked={draft[k] === n} onChange={() => setDraft({ ...draft, [k]: n })} aria-label={`${k}: ${n} of 5`} />
                  {n}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <div>
        <label htmlFor={noteId} className="block">What happened in this run?</label>
        <input id={noteId} type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Practice in front of my family" />
      </div>
      <button type="button" className="btn-primary" disabled={!complete} onClick={save}>Save self-assessment</button>
      {history.length > 1 && first && last && (
        <div className="panel" aria-live="polite">
          <p className="font-bold">First ({new Date(first.date).toLocaleDateString()}) compared with latest ({new Date(last.date).toLocaleDateString()})</p>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {DELIVERY_SKILLS.map((k) => {
              const d = (last.ratings[k] ?? 0) - (first.ratings[k] ?? 0);
              return <li key={k}>{k}: {first.ratings[k]} → {last.ratings[k]} <span className={d > 0 ? 'text-hs' : d < 0 ? 'text-brick' : 'text-ink/70'}>{d > 0 ? `(+${d})` : d < 0 ? `(${d})` : '(same)'}</span></li>;
            })}
          </ul>
          <Link to="/my-growth" className="mt-2 inline-block font-bold">See the full history in My Growth</Link>
        </div>
      )}
      {history.length === 1 && <p>Saved. Assess again after your next practice to see your growth.</p>}
    </div>
  );
}

export function DeliveryLab() {
  const [tab, setTab] = useState<'timer' | 'breath' | 'pause' | 'self'>('timer');
  const tabs = [['timer', 'Speech timer'], ['breath', 'Breathing and pacing'], ['pause', 'Purposeful pauses'], ['self', 'Self-assessment']] as const;
  return (
    <LabShell
      id="delivery"
      textbook={[{ chapter: 11, section: '11.3–11.6' }]}
      explore={<p className="max-w-prose text-lg">Delivery is how your audience experiences your ideas. Use these four tools every time you rehearse.</p>}
      understand={
        <ul className="list-disc space-y-1 pl-6">
          <li>Practice out loud, standing, for time, and with an audience (Section 11.4).</li>
          <li>Replace vocalized pauses ("um," "uh") with silent ones.</li>
          <li>Vary pitch and emphasis to signal what matters; pause around key ideas.</li>
          <li>Section 11.6 shares an acting instructor's advice on breath and voice.</li>
        </ul>
      }
      apply={
        <div>
          <div role="tablist" aria-label="Delivery tools" className="mb-6 flex flex-wrap gap-2">
            {tabs.map(([k, l]) => (
              <button key={k} role="tab" id={`tab-${k}`} aria-selected={tab === k} aria-controls={`panel-${k}`} type="button" className={`rounded-full px-4 py-2 font-bold ${tab === k ? 'bg-ink text-white' : 'bg-white hover:bg-mist'}`} onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>
          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
            {tab === 'timer' && <SpeechTimer />}
            {tab === 'breath' && <BreathingPacer />}
            {tab === 'pause' && <PauseMarker />}
            {tab === 'self' && <DeliverySelfAssessment />}
          </div>
        </div>
      }
      practice={
        <div className="space-y-3">
          <p>Time a full run of your current speech, mark pauses in its hardest passage, and complete a self-assessment. Repeat after your next rehearsal.</p>
          <Link to="/studio" className="btn-secondary">Open your speech in the Studio</Link>
        </div>
      }
      reflect="What changed between your first and latest practice run?"
    />
  );
}

/* ---------------- Visual aids ---------------- */
function SlideMock({ variant, label }: { variant: string; label: string }) {
  const base = 'aspect-video w-full overflow-hidden rounded-md border border-ink/20 p-[4%] text-left';
  const bars = [['Shower', 85], ['Laundry', 55], ['Dishwasher', 20]] as const;
  let body: ReactNode = null;
  if (variant === 'textwall')
    body = <div className={`${base} bg-white`}><p className="text-[0.95em] font-bold">Water Use</p><p className="mt-1 text-[0.55em] leading-tight">Household water use varies a great deal depending on the activity, and many people do not realize that showers often account for a large share of indoor use, while laundry machines also use a significant amount, especially older models, and dishwashers, contrary to popular belief, may use less water than washing by hand when run full, although results depend on habits, the age of the appliance, and many other factors that researchers continue to study in different regions...</p></div>;
  if (variant === 'chart' || variant === 'chart3d') {
    const fancy = variant === 'chart3d';
    body = (
      <div className={`${base} ${fancy ? 'bg-gradient-to-br from-purple-300 via-pink-200 to-yellow-200' : 'bg-white'}`}>
        <p className={`font-bold ${fancy ? 'text-[0.7em] italic' : 'text-[0.95em]'}`}>{fancy ? 'Data!!!' : 'Showers use the most water of the three'}</p>
        <div className="mt-[4%] space-y-[3%]">
          {bars.map(([n, v]) => (
            <div key={n} className="flex items-center gap-2 text-[0.6em]">
              <span className="w-[22%]">{n}</span>
              <span className={`h-[1.2em] rounded-sm ${fancy ? 'bg-gradient-to-r from-red-500 via-green-400 to-blue-600 shadow-[3px_3px_0_#000]' : 'bg-ink'}`} style={{ width: `${v * 0.7}%` }} />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (variant === 'busy')
    body = (
      <div className={`${base} relative bg-[repeating-linear-gradient(45deg,#fde68a,#fde68a_10px,#fca5a5_10px,#fca5a5_20px)]`}>
        <p className="text-[0.9em] font-bold text-blue-700" style={{ fontFamily: 'cursive' }}>Recycling Facts</p>
        <div className="absolute right-[6%] top-[10%] h-[22%] w-[18%] rounded-full bg-green-500" />
        <div className="absolute bottom-[10%] left-[8%] h-[25%] w-[22%] rotate-6 bg-blue-500" />
        <div className="absolute bottom-[14%] right-[12%] h-[25%] w-[25%] -rotate-3 bg-purple-500" />
        <p className="mt-2 text-[0.55em]">• Plastic • Paper • Glass • Cans • Tips • Myths • History</p>
      </div>
    );
  if (variant === 'lowcontrast')
    body = <div className={`${base} bg-[#cfd8e6]`}><p className="text-[0.95em] font-bold text-[#b6c2d4]">Three causes of food waste</p><p className="mt-1 text-[0.5em] text-[#b6c2d4]">Required tray items • Short lunch periods • Portion sizes</p></div>;
  return (
    <figure className="w-full">
      <div className="text-[clamp(0.8rem,2.4vw,1.25rem)]" aria-hidden="true">{body}</div>
      <figcaption className="mt-1 text-center font-bold">{label}</figcaption>
    </figure>
  );
}

const SLIDE_DESC: Record<string, string> = {
  textwall: 'A white slide titled "Water Use" with a long paragraph in small text.',
  chart: 'A white slide titled "Showers use the most water of the three" with a simple bar graph of three bars.',
  chart3d: 'A rainbow gradient slide titled "Data!!!" with the same three bars in clashing multicolor gradients with heavy shadows.',
  busy: 'A slide with a striped yellow-and-pink background, a cursive blue title, three overlapping colored shapes, and a list of seven unrelated words.',
  lowcontrast: 'A light gray-blue slide with pale gray-blue text that is very hard to read.',
};

export function VisualLab() {
  const items = visual as (ChoiceItem & { slides?: string[] })[];
  return (
    <LabShell
      id="visual"
      textbook={[{ chapter: 9, section: '9.2, 9.4' }]}
      explore={<p className="max-w-prose text-lg">Good slides help your audience understand, remember, and trust you. Bad slides compete with you. Make five design decisions.</p>}
      understand={
        <div className="space-y-2">
          <p>Section 9.4 applies design principles to slides: <strong>unity</strong>, <strong>emphasis</strong>, <strong>scale and proportion</strong>, <strong>balance</strong>, and <strong>rhythm</strong>.</p>
          <p className="rounded-md bg-stage-soft p-3">One message per slide. Consistent fonts and backgrounds. Readable from the back of the room. You are the presentation.</p>
        </div>
      }
      apply={
        <ChoiceSet
          activityId="lab:visual"
          items={items}
          renderExtra={(it) => {
            const slides = (it as { slides?: string[] }).slides;
            if (!slides) return null;
            return (
              <div className="mb-4">
                <div className={`grid gap-4 ${slides.length > 1 ? 'sm:grid-cols-2' : 'max-w-md'}`}>
                  {slides.map((v, i) => <SlideMock key={i} variant={v} label={slides.length > 1 ? `Slide ${String.fromCharCode(65 + i)}` : 'The slide'} />)}
                </div>
                <p className="sr-only">{slides.map((v, i) => `${slides.length > 1 ? `Slide ${String.fromCharCode(65 + i)}: ` : ''}${SLIDE_DESC[v]}`).join(' ')}</p>
              </div>
            );
          }}
        />
      }
      practice={
        <Organizer scope="lab-visual" tool={{ id: 'own', type: 'organizer', title: 'My presentation aid plan', fields: [
          { id: 'need', label: 'What does my audience need to SEE that words alone can\'t show?' },
          { id: 'type', label: 'What type of aid fits? (graph, photo, object, model, sequence chart...)' },
          { id: 'title', label: 'A title that states the point, not just the topic', frame: 'Showers use the most water...' },
          { id: 'check', label: 'How will I check readability from the back of the room?' },
        ] }} />
      }
      reflect="What will you remove from your slides after this lab?"
    />
  );
}

/* ---------------- Anxiety ---------------- */
export function AnxietyLab() {
  return (
    <LabShell
      id="anxiety"
      textbook={[{ chapter: 1, section: '1.2' }, { chapter: 'B', note: 'Part 5' }]}
      explore={
        <div className="max-w-prose space-y-3 text-lg">
          <p>Almost everyone feels nervous before speaking. Nervous energy can even help you focus. These tools won't make anxiety disappear; they help you prepare, practice, and speak anyway.</p>
        </div>
      }
      understand={
        <div className="space-y-3">
          <p>The textbook names three misperceptions that feed speaking anxiety:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li><strong>All-or-nothing thinking:</strong> anything less than perfect is failure.</li>
            <li><strong>Overgeneralization:</strong> one bad experience becomes "always."</li>
            <li><strong>Fortune telling:</strong> predicting a bad outcome no matter how much you prepare.</li>
          </ul>
          <p>It also cites Carol Dweck's research: skills like speaking can grow with effort.</p>
        </div>
      }
      apply={<ChoiceSet activityId="lab:anxiety" items={anxiety.thoughts as ChoiceItem[]} />}
      practice={
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {anxiety.strategies.map((s) => (
              <div key={s.kind} className="panel">
                <h3 className="text-xl">{s.kind}</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5">{s.items.map((i) => <li key={i}>{i}</li>)}</ul>
              </div>
            ))}
          </div>
          <Organizer scope="lab-anxiety" tool={{ id: 'reframe', type: 'organizer', title: 'Reframe a thought', fields: [
            { id: 'thought', label: 'One worry I have about my next speech' },
            { id: 'pattern', label: 'Which pattern is it? (all-or-nothing, overgeneralization, fortune telling, or a fixed view of skill)' },
            { id: 'balanced', label: 'A more realistic thought', frame: 'Even if..., I can...' },
            { id: 'action', label: 'One preparation step I will take', frame: 'I will practice...' },
          ] }} />
          <Checklist storageKey="checklist:anxiety" items={anxiety.checklist} title="Before-I-speak checklist" />
          <Notice>{anxiety.support}</Notice>
        </div>
      }
      reflect="What helped you most the last time you felt nervous before speaking?"
    />
  );
}

export const LAB_COMPONENTS: Record<string, () => JSX.Element> = {
  rhetoric: RhetoricLab,
  audience: AudienceLab,
  opening: OpeningLab,
  organization: OrganizationLab,
  evidence: EvidenceLab,
  fallacy: FallacyLab,
  delivery: DeliveryLab,
  visual: VisualLab,
  anxiety: AnxietyLab,
};
