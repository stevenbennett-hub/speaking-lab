import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { usePersistentState } from '../lib/hooks';
import { useProgress } from '../lib/progress';
import { occasions, patterns, getRubric, rubrics } from '../lib/content';
import { CopyButton, DownloadButton, SavedNote } from './ui';
import type { SpeechTool, ToolField } from '../types';

type Record_ = Record<string, string>;

export function TextField({ field, value, onChange }: { field: ToolField; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block">{field.label}</label>
      {field.help && <p id={`${id}-help`} className="text-sm text-ink/75">{field.help}</p>}
      <textarea
        id={id}
        rows={field.rows ?? 2}
        value={value}
        placeholder={field.frame}
        aria-describedby={field.help ? `${id}-help` : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {field.frame && !value && (
        <button type="button" className="text-sm font-bold underline" onClick={() => onChange(field.frame!)}>
          Use sentence starter
        </button>
      )}
    </div>
  );
}

export function toolToText(title: string, fields: ToolField[], data: Record_) {
  return [title, '='.repeat(title.length), ...fields.map((f) => `${f.label}\n${data[f.id]?.trim() || '(blank)'}\n`)].join('\n');
}

export function Organizer({ scope, tool }: { scope: string; tool: Extract<SpeechTool, { type: 'organizer' }> }) {
  const key = `tool:${scope}:${tool.id}`;
  const [data, setData] = usePersistentState<Record_>(key, {});
  const { markComplete, isComplete } = useProgress();
  const filled = tool.fields.filter((f) => data[f.id]?.trim()).length;
  const update = (id: string, v: string) => {
    const next = { ...data, [id]: v };
    setData(next);
    if (!isComplete(key) && tool.fields.every((f) => next[f.id]?.trim())) markComplete(key);
  };
  return (
    <div className="space-y-4">
      {tool.intro && <p>{tool.intro}</p>}
      <p className="text-sm font-bold" aria-live="polite">{filled} of {tool.fields.length} filled</p>
      {tool.fields.map((f) => (
        <TextField key={f.id} field={f} value={data[f.id] ?? ''} onChange={(v) => update(f.id, v)} />
      ))}
      <div className="flex flex-wrap gap-2">
        <CopyButton text={toolToText(tool.title, tool.fields, data)} label="Copy my work" />
        <DownloadButton filename={`${scope}-${tool.id}.txt`} text={toolToText(tool.title, tool.fields, data)} label="Download .txt" />
      </div>
      <SavedNote />
    </div>
  );
}

const ARC_FIELDS: ToolField[] = [
  { id: 'beginning', label: 'Beginning: who, where, what was normal', frame: 'It was my first week at...' },
  { id: 'conflict', label: 'Conflict: what went wrong or what was at stake', frame: 'Then...' },
  { id: 'turning', label: 'Turning point: the moment things changed', frame: 'That was when I realized...' },
  { id: 'resolution', label: 'Resolution: what happened next', frame: 'In the end...' },
  { id: 'significance', label: 'Significance: what it means now', frame: 'Now I understand that...' },
];

export function StoryArc({ scope }: { scope: string }) {
  const key = `tool:${scope}:arc`;
  const [data, setData] = usePersistentState<Record_>(key, {});
  const { markComplete } = useProgress();
  const points = [
    [40, 190], [170, 140], [300, 40], [430, 120], [560, 170],
  ];
  const filled = ARC_FIELDS.map((f) => Boolean(data[f.id]?.trim()));
  const count = filled.filter(Boolean).length;
  const update = (id: string, v: string) => {
    const next = { ...data, [id]: v };
    setData(next);
    if (ARC_FIELDS.every((f) => next[f.id]?.trim())) markComplete(key);
  };
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-ink p-4">
        <svg viewBox="0 0 600 220" className="h-auto w-full" aria-hidden="true">
          <path d="M40 190 C 120 175, 220 40, 300 40 S 480 140, 560 170" fill="none" stroke="#3C4270" strokeWidth="6" strokeLinecap="round" />
          {points.map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r={filled[i] ? 13 : 9} fill={filled[i] ? '#F2B33D' : '#1B1F3B'} stroke="#F2B33D" strokeWidth="3" />
              <text x={x} y={y + (i === 2 ? -22 : 34)} textAnchor="middle" fill="#fff" fontSize="15" fontFamily="Atkinson Hyperlegible, sans-serif">
                {['Beginning', 'Conflict', 'Turning point', 'Resolution', 'Significance'][i]}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <p className="font-bold" aria-live="polite">{count} of 5 stages drafted{count === 5 ? ': your arc is complete.' : '.'}</p>
      {count >= 3 && !filled[2] && <p className="rounded-md bg-stage-soft p-3">Your story needs a turning point: the moment something changed. Without it, listeners hear events but not a story.</p>}
      {ARC_FIELDS.map((f) => (
        <TextField key={f.id} field={{ ...f, rows: 3 }} value={data[f.id] ?? ''} onChange={(v) => update(f.id, v)} />
      ))}
      <div className="flex flex-wrap gap-2">
        <CopyButton text={toolToText('Story arc', ARC_FIELDS, data)} label="Copy my arc" />
        <DownloadButton filename={`${scope}-story-arc.txt`} text={toolToText('Story arc', ARC_FIELDS, data)} />
      </div>
      <SavedNote />
    </div>
  );
}

export function PatternSelector({ scope, allowed }: { scope: string; allowed?: string[] }) {
  const list = patterns.filter((p) => !allowed || allowed.includes(p.id));
  const [state, setState] = usePersistentState<{ yes: string[]; chosen: string }>(`tool:${scope}:patterns`, { yes: [], chosen: '' });
  const toggle = (id: string) => setState({ ...state, yes: state.yes.includes(id) ? state.yes.filter((x) => x !== id) : [...state.yes, id] });
  const matches = list.filter((p) => state.yes.includes(p.id));
  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="mb-2 font-bold">Check every statement that is true of your speech.</legend>
        {list.map((p) => (
          <label key={p.id} className="flex items-start gap-3 font-normal">
            <input type="checkbox" className="mt-1 h-4 w-4 accent-ink" checked={state.yes.includes(p.id)} onChange={() => toggle(p.id)} />
            <span>{p.question}</span>
          </label>
        ))}
      </fieldset>
      <div aria-live="polite">
        {matches.length === 0 ? (
          <p className="text-ink/75">Check at least one statement to see matching patterns.</p>
        ) : (
          <div className="space-y-3">
            <p className="font-bold">{matches.length === 1 ? 'This pattern fits:' : `${matches.length} patterns could fit. Pick the one that best serves your specific purpose:`}</p>
            {matches.map((p) => (
              <div key={p.id} className={`rounded-md border-2 p-4 ${state.chosen === p.id ? 'border-ink bg-white' : 'border-mist bg-white'}`}>
                <h4 className="text-lg">{p.name}</h4>
                <p>{p.definition}</p>
                <p className="mt-1 text-sm"><strong>Best for:</strong> {p.bestFor}</p>
                <p className="text-sm"><strong>Example:</strong> {p.example}</p>
                <button type="button" className={`mt-2 ${state.chosen === p.id ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={state.chosen === p.id} onClick={() => setState({ ...state, chosen: p.id })}>
                  {state.chosen === p.id ? 'Chosen' : 'Choose this pattern'}
                </button>
              </div>
            ))}
            {matches.length > 1 && <p className="text-sm text-ink/80">Main points and subpoints can use different patterns (Section 6.2).</p>}
          </div>
        )}
      </div>
      <SavedNote />
    </div>
  );
}

const MONROE: (ToolField & { tip: string })[] = [
  { id: 'attention', label: 'Attention', help: 'Bring the audience in, show your credibility and connection, state your thesis, preview.', tip: 'Does it say why you care and what you will propose?', rows: 3 },
  { id: 'need', label: 'Need', help: 'Define the problem, show its severity and how it affects this audience. Support it with evidence.', tip: 'Have you named a source for the problem?', rows: 4 },
  { id: 'satisfaction', label: 'Satisfaction', help: 'Present the solution and show it addresses the causes, not just the symptoms.', tip: 'Does your solution connect to a cause you named in Need?', rows: 4 },
  { id: 'visualization', label: 'Visualization', help: 'Show the future with the solution (positive) or without it (negative).', tip: 'Can your audience picture a specific scene?', rows: 3 },
  { id: 'action', label: 'Action', help: 'Give specific steps the audience can take soon.', tip: 'Is it concrete: what, where, and by when?', rows: 3 },
];

export function MonroeOrganizer({ scope }: { scope: string }) {
  const key = `tool:${scope}:monroe`;
  const [data, setData] = usePersistentState<Record_>(key, {});
  const { markComplete } = useProgress();
  const update = (id: string, v: string) => {
    const next = { ...data, [id]: v };
    setData(next);
    if (MONROE.every((f) => next[f.id]?.trim())) markComplete(key);
  };
  const action = data.action ?? '';
  const actionConcrete = /\b(today|tonight|tomorrow|this week|by |before|sign|visit|text|call|email|join|register|bring|attend|download)\b/i.test(action);
  const needHasSource = /(according to|reported|study|survey|data|percent|%|\d)/i.test(data.need ?? '');
  return (
    <div className="space-y-5">
      <ol className="space-y-5">
        {MONROE.map((f, i) => (
          <li key={f.id} className="grid gap-3 sm:grid-cols-[3rem_1fr]">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink font-display text-lg font-bold text-stage" aria-hidden="true">{i + 1}</span>
            <div>
              <TextField field={f} value={data[f.id] ?? ''} onChange={(v) => update(f.id, v)} />
              <p className="mt-1 text-sm text-ink/75">Check: {f.tip}</p>
            </div>
          </li>
        ))}
      </ol>
      <div aria-live="polite" className="space-y-2">
        {data.need?.trim() && !needHasSource && <p className="rounded-md bg-stage-soft p-3">Your Need step does not mention evidence yet. The textbook says the need must be supported by evidence.</p>}
        {action.trim() && !actionConcrete && <p className="rounded-md bg-stage-soft p-3">Your Action step may be too general. Name exactly what to do and when (for example, "sign up at the library table by Friday").</p>}
        {action.trim() && actionConcrete && <p className="rounded-md bg-hs-soft p-3">Your Action step includes a concrete action. Make sure it is realistic for this audience.</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        <CopyButton text={toolToText("Monroe's Motivated Sequence", MONROE, data)} label="Copy sequence" />
        <DownloadButton filename={`${scope}-monroe.txt`} text={toolToText("Monroe's Motivated Sequence", MONROE, data)} />
      </div>
      <SavedNote />
    </div>
  );
}

export function ToneWorkshop({ scope }: { scope: string }) {
  const [state, setState] = usePersistentState<{ occasion: string; audience: string; tone: string }>(`tool:${scope}:tone`, { occasion: '', audience: '', tone: '' });
  const occ = occasions.find((o) => o.id === state.occasion);
  const audId = useId();
  const toneId = useId();
  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="mb-2 font-bold">Choose the occasion</legend>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {occasions.map((o) => (
            <label key={o.id} className={`cursor-pointer rounded-md border-2 p-3 font-normal ${state.occasion === o.id ? 'border-ink bg-white' : 'border-mist bg-white hover:border-ink/40'}`}>
              <input type="radio" name={`${scope}-occasion`} className="sr-only" checked={state.occasion === o.id} onChange={() => setState({ ...state, occasion: o.id })} />
              <span className="font-bold">{o.name}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div aria-live="polite">
        {occ && (
          <div className="panel space-y-2">
            <h4 className="text-xl">{occ.name}</h4>
            <p><strong>Purpose:</strong> {occ.purpose}</p>
            <p><strong>Typical tone:</strong> {occ.tone}</p>
            <p><strong>Typical length:</strong> {occ.length}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><p className="font-bold">Moves to include</p><ul className="list-disc pl-5">{occ.moves.map((m) => <li key={m}>{m}</li>)}</ul></div>
              <div><p className="font-bold">Avoid</p><ul className="list-disc pl-5">{occ.avoid.map((m) => <li key={m}>{m}</li>)}</ul></div>
            </div>
            <p className="text-sm text-ink/75">Expectations vary by community and culture. Ask the host what is customary.</p>
          </div>
        )}
      </div>
      <div className="space-y-1">
        <label htmlFor={audId} className="block">Who will be in the audience, and what do they expect?</label>
        <textarea id={audId} rows={2} value={state.audience} onChange={(e) => setState({ ...state, audience: e.target.value })} />
      </div>
      <div className="space-y-1">
        <label htmlFor={toneId} className="block">Three words that describe the tone you want</label>
        <input id={toneId} type="text" value={state.tone} onChange={(e) => setState({ ...state, tone: e.target.value })} placeholder="warm, grateful, light" />
      </div>
      <SavedNote />
    </div>
  );
}

export function Checklist({ storageKey, items, title = 'Checklist' }: { storageKey: string; items: string[]; title?: string }) {
  const [done, setDone] = usePersistentState<boolean[]>(storageKey, []);
  const { markComplete } = useProgress();
  const count = items.filter((_, i) => done[i]).length;
  const toggle = (i: number) => {
    const next = items.map((_, j) => (j === i ? !done[j] : Boolean(done[j])));
    setDone(next);
    if (next.every(Boolean)) markComplete(storageKey);
  };
  return (
    <fieldset className="panel">
      <legend className="sr-only">{title}</legend>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-bold">{title}</p>
        <p className="text-sm" aria-live="polite">{count} of {items.length}</p>
      </div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-mist" aria-hidden="true">
        <div className="h-full bg-hs transition-all" style={{ width: `${(count / items.length) * 100}%` }} />
      </div>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={it}>
            <label className="flex items-start gap-3 font-normal">
              <input type="checkbox" className="mt-1 h-5 w-5 accent-ink" checked={Boolean(done[i])} onChange={() => toggle(i)} />
              <span className={done[i] ? 'text-ink/70 line-through' : ''}>{it}</span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

export interface RubricSnapshot {
  date: string;
  label: string;
  levels: Record<string, number>;
  note: string;
}

export function RubricSelfAssess({ speechId }: { speechId: string }) {
  const rubric = getRubric(speechId);
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [label, setLabel] = useState('After rehearsal');
  const [note, setNote] = useState('');
  const [history, setHistory] = usePersistentState<RubricSnapshot[]>(`rubric:${speechId}`, []);
  const { markComplete } = useProgress();
  const noteId = useId();
  const labelId = useId();
  if (!rubric) return <p>No rubric is set for this speech yet. Your instructor can add one in rubrics.json.</p>;
  const levels = rubrics.levels;
  const complete = rubric.criteria.every((c) => draft[c.name] !== undefined);
  const save = () => {
    setHistory([...history, { date: new Date().toISOString(), label, levels: draft, note }]);
    markComplete(`rubric:${speechId}`);
    setDraft({});
    setNote('');
  };
  const first = history[0];
  const latest = history[history.length - 1];
  return (
    <div className="space-y-4">
      {rubrics.isSample && <p className="text-sm text-ink/80">Sample criteria. Your instructor's official rubric may differ. This is self-assessment only; nothing is submitted or graded.</p>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] border-collapse text-left text-[0.95rem]">
          <caption className="sr-only">Self-assessment rubric</caption>
          <thead>
            <tr className="border-b-2 border-ink">
              <th scope="col" className="py-2 pr-3">Criterion</th>
              {levels.map((l) => <th key={l} scope="col" className="px-2 py-2 text-center">{l}</th>)}
            </tr>
          </thead>
          <tbody>
            {rubric.criteria.map((c) => (
              <tr key={c.name} className="border-b border-mist align-top">
                <th scope="row" className="py-3 pr-3 font-normal">
                  <span className="font-bold">{c.name}</span> <span className="text-sm text-ink/70">({c.weight}%)</span>
                  <span className="block text-sm text-ink/80">{c.description}</span>
                </th>
                {levels.map((l, li) => (
                  <td key={l} className="px-2 py-3 text-center">
                    <input type="radio" className="h-5 w-5 accent-ink" name={`${speechId}-${c.name}`} aria-label={`${c.name}: ${l}`} checked={draft[c.name] === li} onChange={() => setDraft({ ...draft, [c.name]: li })} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={labelId} className="block">When is this?</label>
          <select id={labelId} value={label} onChange={(e) => setLabel(e.target.value)}>
            {['Before rehearsal', 'After rehearsal', 'After delivering the speech'].map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={noteId} className="block">One note to your future self</label>
          <input id={noteId} type="text" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>
      <button type="button" className="btn-primary" disabled={!complete} onClick={save}>Save self-assessment</button>
      {!complete && <p className="text-sm text-ink/75">Rate every criterion to save.</p>}
      {history.length > 0 && (
        <div className="panel" aria-live="polite">
          <h4 className="text-lg">Your self-assessments ({history.length})</h4>
          {history.length > 1 && first && latest ? (
            <ul className="mt-2 space-y-1">
              {rubric.criteria.map((c) => {
                const a = first.levels[c.name];
                const b = latest.levels[c.name];
                const diff = (b ?? 0) - (a ?? 0);
                return (
                  <li key={c.name}>
                    <strong>{c.name}:</strong> {levels[a]} → {levels[b]} {diff > 0 ? '(grew)' : diff < 0 ? '(dropped: worth a look)' : '(same)'}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-2">Save another self-assessment later to compare.</p>
          )}
          <Link to="/my-growth" className="mt-3 inline-flex items-center gap-1 font-bold">See all your growth <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      )}
    </div>
  );
}

export function SpeechToolView({ scope, tool }: { scope: string; tool: SpeechTool }) {
  switch (tool.type) {
    case 'organizer':
      return <Organizer scope={scope} tool={tool} />;
    case 'arc':
      return <StoryArc scope={scope} />;
    case 'patterns':
      return <PatternSelector scope={scope} allowed={tool.patterns} />;
    case 'monroe':
      return <MonroeOrganizer scope={scope} />;
    case 'tone':
      return <ToneWorkshop scope={scope} />;
    case 'link':
      return (
        <div className="space-y-3">
          {tool.intro && <p>{tool.intro}</p>}
          <Link to={tool.to} className="btn-primary">{tool.label} <ArrowRight size={18} aria-hidden="true" /></Link>
        </div>
      );
  }
}
