import { ChangeEvent, ReactNode, useId, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Plus, Trash2, Upload } from 'lucide-react';
import { aiCoach, getAssignment, patterns, speeches, targetSeconds } from '../lib/content';
import { usePathway, PATHWAY_LABEL } from '../lib/pathway';
import { useDocumentTitle, usePersistentState } from '../lib/hooks';
import { useProgress } from '../lib/progress';
import { readJSON, removeKey, writeJSON, todayStamp } from '../lib/storage';
import {
  Check, StudioState, checkAttention, checkCentralIdea, checkMainPoints, checkSources, checkSpecificPurpose, emptyStudio, outlineToText, Source,
} from '../lib/feedback';
import { CopyButton, Disclosure, DownloadButton, Notice, PageHeader, PathwayTag } from '../components/ui';
import { SpeechTimer } from '../components/Timer';

const STEPS = [
  { id: 'discover', name: 'Discover', blurb: 'Topic, purpose, and audience' },
  { id: 'focus', name: 'Focus', blurb: 'Specific purpose and central idea' },
  { id: 'research', name: 'Research', blurb: 'Evidence and source credibility' },
  { id: 'organize', name: 'Organize', blurb: 'Pattern and main points' },
  { id: 'develop', name: 'Develop', blurb: 'Introduction, transitions, conclusion' },
  { id: 'rehearse', name: 'Rehearse', blurb: 'Practice and timing' },
  { id: 'reflect', name: 'Reflect', blurb: 'Strengths, improvements, goal' },
] as const;

const REHEARSE = [
  'Practiced out loud (not silently in my head)',
  'Practiced standing up',
  'Practiced with a lectern or table, if I will use one',
  'Practiced in front of at least one person',
  'Practiced for time',
  'Recorded myself and watched it back',
];

const GENERAL = [
  { id: 'inform', label: 'To inform' },
  { id: 'persuade', label: 'To persuade' },
  { id: 'entertain/inspire', label: 'To entertain or inspire' },
  { id: 'commemorate', label: 'To commemorate or celebrate' },
];

function Feedback({ checks, title = 'Feedback' }: { checks: Check[]; title?: string }) {
  if (!checks.length) return null;
  return (
    <div aria-live="polite" className="rounded-md border border-mist bg-paper p-3">
      <p className="text-sm font-bold">{title}</p>
      <ul className="mt-1 space-y-1 text-[0.95rem]">
        {checks.map((c, i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden="true" className={c.level === 'ok' ? 'text-hs' : c.level === 'warn' ? 'text-brick' : 'text-stage-deep'}>{c.level === 'ok' ? '✓' : c.level === 'warn' ? '!' : '•'}</span>
            <span><span className="sr-only">{c.level === 'ok' ? 'Looks good: ' : c.level === 'warn' ? 'Revise: ' : 'Tip: '}</span>{c.msg}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Field({ label, value, onChange, help, rows = 2, placeholder, children }: { label: string; value: string; onChange: (v: string) => void; help?: string; rows?: number; placeholder?: string; children?: ReactNode }) {
  const id = useId();
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block">{label}</label>
      {help && <p id={`${id}-h`} className="text-sm text-ink/75">{help}</p>}
      <textarea id={id} rows={rows} value={value} placeholder={placeholder} aria-describedby={help ? `${id}-h` : undefined} onChange={(e) => onChange(e.target.value)} />
      {children}
    </div>
  );
}

function CoachQuestions({ stage }: { stage: string }) {
  const s = aiCoach.stages.find((x) => x.id === stage);
  if (!s) return null;
  return (
    <Disclosure summary="Stuck? Coach questions for this step">
      <ul className="list-disc space-y-1 pl-5">{s.questions.map((q) => <li key={q}>{q}</li>)}</ul>
      <p className="mt-2 text-sm"><Link to="/ai-coach">More in the Speech Coach</Link></p>
    </Disclosure>
  );
}

const stepDone = (s: StudioState, i: number) => {
  switch (i) {
    case 0: return Boolean(s.topic.trim() && s.generalPurpose && s.audienceKnow.trim());
    case 1: return Boolean(s.specificPurpose.trim() && s.centralIdea.trim());
    case 2: return s.sources.some((x) => x.citation.trim() || x.author.trim());
    case 3: return Boolean(s.pattern && s.mainPoints.filter((m) => m.text.trim()).length >= 2);
    case 4: return Boolean(s.intro.attention.trim() && s.conclusion.clincher.trim());
    case 5: return s.rehearse.filter(Boolean).length >= 3;
    case 6: return Boolean(s.reflect.goal.trim());
    default: return false;
  }
};

export default function Studio() {
  useDocumentTitle('Speech Studio');
  const [params, setParams] = useSearchParams();
  const { pathway } = usePathway();
  const speechId = speeches.some((s) => s.id === params.get('speech')) ? params.get('speech')! : 'informative';
  const speech = speeches.find((s) => s.id === speechId)!;
  const defaultGP = speech.generalPurpose === 'varies' ? '' : speech.generalPurpose;
  const key = `studio:${speechId}`;
  const [state, setState] = usePersistentState<StudioState>(key, emptyStudio(defaultGP));
  const s: StudioState = { ...emptyStudio(defaultGP), ...state };
  const [step, setStep] = useState(0);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const { markComplete } = useProgress();
  const assignment = getAssignment(speechId);
  const minSources = assignment?.minSources[pathway] ?? 0;
  const set = <K extends keyof StudioState>(k: K, v: StudioState[K]) => setState({ ...s, [k]: v });
  const outline = outlineToText(s, speech.title, PATHWAY_LABEL[pathway]);
  const doneCount = STEPS.filter((_, i) => stepDone(s, i)).length;

  const goTo = (i: number) => {
    if (stepDone(s, step)) markComplete(`studio:${speechId}:${STEPS[step].id}`);
    setStep(i);
    document.getElementById('studio-step')?.focus();
  };

  const addSource = () =>
    set('sources', [...s.sources, { id: `s${Date.now()}`, citation: '', author: '', date: '', url: '', kind: '', checks: {}, use: '' }]);
  const updSource = (id: string, patch: Partial<Source>) => set('sources', s.sources.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const updPoint = (i: number, patch: Partial<StudioState['mainPoints'][number]>) => set('mainPoints', s.mainPoints.map((m, j) => (j === i ? { ...m, ...patch } : m)));

  const saveGoal = () => {
    if (!s.reflect.goal.trim()) return;
    const goals = readJSON<{ date: string; text: string; speech: string; done: boolean }[]>('goals', []);
    writeJSON('goals', [...goals, { date: todayStamp(), text: s.reflect.goal.trim(), speech: speech.title, done: false }]);
    markComplete(`studio:${speechId}:reflect`);
    setMsg('Goal saved to My Growth.');
  };

  const importFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (data.app !== 'The Speaking Lab studio' || !data.state) throw new Error();
      setState({ ...emptyStudio(defaultGP), ...data.state });
      setMsg(`Imported your ${data.speechTitle ?? ''} plan.`);
    } catch {
      setMsg('That file is not a Speech Studio backup. Choose a .json file downloaded from the Studio.');
    }
    e.target.value = '';
  };

  const clear = () => {
    if (window.confirm(`Clear all Studio work for the ${speech.title}? This cannot be undone unless you downloaded a backup.`)) {
      removeKey(key);
      setState(emptyStudio(defaultGP));
      setStep(0);
      setMsg('Studio work for this speech was cleared.');
    }
  };

  const steps: ReactNode[] = [
    // 1 Discover
    <div key="d" className="space-y-5">
      <Notice>Start with you, your audience, and the context (Section 4.2). The best topics sit where all three meet.</Notice>
      <Field label="Your topic" value={s.topic} onChange={(v) => set('topic', v)} help="A subject you know or care about, narrowed to fit the time limit." />
      <fieldset>
        <legend className="mb-2 font-bold">General purpose</legend>
        <div className="flex flex-wrap gap-2">
          {GENERAL.map((g) => (
            <label key={g.id} className={`chip cursor-pointer px-4 py-2 font-normal ${s.generalPurpose === g.id ? 'bg-ink text-white' : 'bg-white'}`}>
              <input type="radio" className="sr-only" name="gp" checked={s.generalPurpose === g.id} onChange={() => set('generalPurpose', g.id)} />
              {g.label}
            </label>
          ))}
        </div>
        {speech.generalPurpose !== 'varies' && s.generalPurpose && s.generalPurpose !== speech.generalPurpose && (
          <p className="mt-2 rounded-md bg-stage-soft p-2 text-sm">The {speech.title} usually has the purpose "{GENERAL.find((g) => g.id === speech.generalPurpose)?.label.toLowerCase()}." Check with your instructor.</p>
        )}
      </fieldset>
      <Field label="What does your audience already know about this topic?" value={s.audienceKnow} onChange={(v) => set('audienceKnow', v)} help="Base this on real information when you can: ask a few classmates or run a quick poll." />
      <Field label="What attitudes or concerns might they have?" value={s.audienceAttitude} onChange={(v) => set('audienceAttitude', v)} help="Avoid assumptions based on group membership. What have you actually observed or learned?" />
      <Field label="Context: where, when, how long, and how many people?" value={s.context} onChange={(v) => set('context', v)} />
      <CoachQuestions stage="discover" />
    </div>,

    // 2 Focus
    <div key="f" className="space-y-5">
      <Field label="Specific purpose" value={s.specificPurpose} onChange={(v) => set('specificPurpose', v)} placeholder={s.generalPurpose === 'persuade' ? 'To persuade my classmates to...' : 'To inform my audience about...'} help="An infinitive phrase stating exactly what you want this audience to understand, believe, or do.">
        <Feedback checks={checkSpecificPurpose(s.specificPurpose, s.generalPurpose)} />
      </Field>
      <Field label="Central idea (thesis)" value={s.centralIdea} onChange={(v) => set('centralIdea', v)} help="One complete declarative sentence that states your message. It often previews your main points.">
        <Feedback checks={checkCentralIdea(s.centralIdea)} />
      </Field>
      <Disclosure summary="See a model (from the Learn modules)">
        <p><strong>Specific purpose:</strong> To inform my audience how honeybees communicate.</p>
        <p><strong>Central idea:</strong> Honeybees share the location of food through the waggle dance, the round dance, and scent signals.</p>
      </Disclosure>
      <p className="text-sm text-ink/75">These automatic checks look for common patterns from Section 4.4. They can't judge whether your idea is strong; that's your job and your instructor's.</p>
      <CoachQuestions stage="focus" />
    </div>,

    // 3 Research
    <div key="r" className="space-y-5">
      <Notice>
        Credibility checks come from Section 5.3: Is it current? Does it address your topic? Who is the source and why did they create it? Then go upstream to the original and read laterally. Never list a source you have not actually read.
      </Notice>
      {s.sources.length === 0 && <p>No sources yet. Add the first one you plan to use.</p>}
      <ol className="space-y-4">
        {s.sources.map((src, i) => (
          <li key={src.id} className="panel space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xl">Source {i + 1}</h3>
              <button type="button" className="btn-quiet" onClick={() => set('sources', s.sources.filter((x) => x.id !== src.id))}><Trash2 size={16} aria-hidden="true" /> Remove source {i + 1}</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <SourceInput label="Author or organization" value={src.author} onChange={(v) => updSource(src.id, { author: v })} />
              <SourceInput label="Date published or updated" value={src.date} onChange={(v) => updSource(src.id, { date: v })} />
            </div>
            <Field label={pathway === 'college' ? 'Full citation (APA or your assigned style)' : 'Title and where you found it'} value={src.citation} onChange={(v) => updSource(src.id, { citation: v })} />
            <SourceInput label="Link (if online)" value={src.url} onChange={(v) => updSource(src.id, { url: v })} type="url" />
            <fieldset>
              <legend className="font-bold">Type</legend>
              <div className="mt-1 flex gap-4">
                {(['primary', 'secondary'] as const).map((k) => (
                  <label key={k} className="flex items-center gap-2 font-normal"><input type="radio" className="accent-ink" name={`kind-${src.id}`} checked={src.kind === k} onChange={() => updSource(src.id, { kind: k })} />{k === 'primary' ? 'Primary (original)' : 'Secondary (summarizes others)'}</label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="font-bold">Credibility checks</legend>
              <div className="mt-1 grid gap-1 sm:grid-cols-2">
                {([
                  ['current', 'It is current enough for my topic'],
                  ['relevant', 'It directly addresses my point'],
                  ['who', 'I know who created it and why'],
                  ['upstream', 'I traced the claim to its original source'],
                  ['lateral', 'I read what others say about this source'],
                ] as const).map(([k, l]) => (
                  <label key={k} className="flex items-start gap-2 font-normal"><input type="checkbox" className="mt-1 h-4 w-4 accent-ink" checked={Boolean(src.checks[k])} onChange={(e) => updSource(src.id, { checks: { ...src.checks, [k]: e.target.checked } })} />{l}</label>
                ))}
              </div>
            </fieldset>
            <Field label="Which main point will it support? How will you cite it out loud?" value={src.use} onChange={(v) => updSource(src.id, { use: v })} placeholder="According to..., in..., published..." />
          </li>
        ))}
      </ol>
      <button type="button" className="btn-secondary" onClick={addSource}><Plus size={18} aria-hidden="true" /> Add a source</button>
      <Feedback checks={checkSources(s.sources, minSources)} title="Source check" />
      <p className="text-sm"><Link to="/labs/evidence">Practice evaluating evidence in the Evidence Lab</Link></p>
      <CoachQuestions stage="research" />
    </div>,

    // 4 Organize
    <div key="o" className="space-y-5">
      <fieldset>
        <legend className="mb-2 font-bold">Organizational pattern</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {patterns.map((p) => (
            <label key={p.id} className={`cursor-pointer rounded-md border-2 p-3 font-normal ${s.pattern === p.name ? 'border-ink bg-white' : 'border-mist bg-white hover:border-ink/40'}`}>
              <input type="radio" className="sr-only" name="pattern" checked={s.pattern === p.name} onChange={() => set('pattern', p.name)} />
              <span className="font-bold">{p.name}</span>
              <span className="block text-sm text-ink/80">{p.definition}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="space-y-4">
        <h3 className="text-xl">Main points</h3>
        {s.mainPoints.map((mp, i) => (
          <div key={mp.id} className="panel space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-display text-xl font-bold">{['I', 'II', 'III', 'IV', 'V', 'VI'][i]}.</p>
              {s.mainPoints.length > 1 && <button type="button" className="btn-quiet" onClick={() => set('mainPoints', s.mainPoints.filter((_, j) => j !== i))}><Trash2 size={16} aria-hidden="true" /> Remove point {i + 1}</button>}
            </div>
            <Field label={`Main point ${i + 1}`} value={mp.text} onChange={(v) => updPoint(i, { text: v })} help="Write it as a complete sentence." />
            <Field label="Subpoints (one per line)" value={mp.sub} onChange={(v) => updPoint(i, { sub: v })} rows={3} />
            <Field label="Supporting material (example, statistic, testimony, story) and its source" value={mp.support} onChange={(v) => updPoint(i, { support: v })} />
          </div>
        ))}
        {s.mainPoints.length < 6 && (
          <button type="button" className="btn-secondary" onClick={() => set('mainPoints', [...s.mainPoints, { id: `mp${Date.now()}`, text: '', sub: '', support: '' }])}><Plus size={18} aria-hidden="true" /> Add a main point</button>
        )}
        <Feedback checks={checkMainPoints(s.mainPoints.map((m) => m.text))} title="Structure check" />
      </div>
      <p className="text-sm"><Link to="/labs/organization">Practice in the Organization Lab</Link></p>
      <CoachQuestions stage="organize" />
    </div>,

    // 5 Develop
    <div key="dv" className="space-y-6">
      <Notice>The textbook recommends writing the introduction after the body is solid. You can't introduce what you haven't built.</Notice>
      <section className="space-y-4" aria-labelledby="intro-h">
        <h3 id="intro-h" className="text-xl">Introduction (Section 8.2)</h3>
        <Field label="1. Attention-getter" value={s.intro.attention} onChange={(v) => set('intro', { ...s.intro, attention: v })} help="A story, startling fact, rhetorical question, quotation, reference to the audience, or current event.">
          <Feedback checks={checkAttention(s.intro.attention)} />
        </Field>
        <Field label="2. Credibility" value={s.intro.credibility} onChange={(v) => set('intro', { ...s.intro, credibility: v })} placeholder="I first became interested in this when..." />
        <Field label="3. Rapport: why this matters to this audience" value={s.intro.rapport} onChange={(v) => set('intro', { ...s.intro, rapport: v })} />
        <div className="rounded-md bg-mist/50 p-3"><p className="font-bold">4. Central idea</p><p>{s.centralIdea || <em>Add your central idea in the Focus step.</em>}</p></div>
        <Field label="5. Preview of main points" value={s.intro.preview} onChange={(v) => set('intro', { ...s.intro, preview: v })} placeholder="First... next... finally..." />
      </section>
      <section className="space-y-4" aria-labelledby="trans-h">
        <h3 id="trans-h" className="text-xl">Transitions between main points (Section 6.3)</h3>
        {s.mainPoints.length < 2 && <p>Add at least two main points to write transitions.</p>}
        {s.mainPoints.slice(0, -1).map((mp, i) => (
          <Field
            key={mp.id}
            label={`From point ${i + 1} to point ${i + 2}`}
            value={s.transitions[i] ?? ''}
            onChange={(v) => { const t = [...s.transitions]; t[i] = v; set('transitions', t); }}
            help={`${mp.text ? `"${mp.text.slice(0, 60)}${mp.text.length > 60 ? '…' : ''}"` : 'Point ' + (i + 1)} → ${s.mainPoints[i + 1].text ? `"${s.mainPoints[i + 1].text.slice(0, 60)}${s.mainPoints[i + 1].text.length > 60 ? '…' : ''}"` : 'point ' + (i + 2)}`}
            placeholder="Now that we've seen..., let's look at..."
          />
        ))}
      </section>
      <section className="space-y-4" aria-labelledby="conc-h">
        <h3 id="conc-h" className="text-xl">Conclusion (Section 8.4)</h3>
        <Field label="1. Signal the end" value={s.conclusion.signal} onChange={(v) => set('conclusion', { ...s.conclusion, signal: v })} placeholder="As we come to a close..." />
        <Field label="2. Restate main points" value={s.conclusion.restate} onChange={(v) => set('conclusion', { ...s.conclusion, restate: v })} />
        <Field label="3. Clincher" value={s.conclusion.clincher} onChange={(v) => set('conclusion', { ...s.conclusion, clincher: v })} help={s.generalPurpose === 'persuade' ? 'End with a specific call to action or a challenge.' : 'Refer back to your opening, end with a quotation, a question, or a look toward the future.'} />
        {s.intro.attention.trim() && s.conclusion.clincher.trim() && <p className="rounded-md bg-hs-soft p-3 text-sm">Read your attention-getter and clincher together. Do they feel like bookends?</p>}
      </section>
    </div>,

    // 6 Rehearse
    <div key="rh" className="space-y-6">
      <fieldset className="panel">
        <legend className="sr-only">Rehearsal checklist</legend>
        <p className="mb-2 font-bold">Rehearsal checklist (Section 11.4)</p>
        <ul className="space-y-2">
          {REHEARSE.map((r, i) => (
            <li key={r}><label className="flex items-start gap-3 font-normal"><input type="checkbox" className="mt-1 h-5 w-5 accent-ink" checked={Boolean(s.rehearse[i])} onChange={(e) => { const next = REHEARSE.map((_, j) => (j === i ? e.target.checked : Boolean(s.rehearse[j]))); set('rehearse', next); }} />{r}</label></li>
          ))}
        </ul>
      </fieldset>
      <div>
        <h3 className="mb-3 text-xl">Time your speech</h3>
        <SpeechTimer defaultTarget={targetSeconds(speechId, pathway)} label={speech.title} />
        <p className="mt-2 text-sm text-ink/75">Target comes from the {assignment ? 'sample assignment settings' : 'default'}: {assignment?.[pathway].time ?? '5 minutes'}.</p>
      </div>
      <Link to="/labs/delivery" className="btn-secondary">More practice in the Delivery Lab</Link>
      <CoachQuestions stage="rehearse" />
    </div>,

    // 7 Reflect
    <div key="rf" className="space-y-5">
      <Field label="What are your strengths in this speech?" value={s.reflect.strengths} onChange={(v) => set('reflect', { ...s.reflect, strengths: v })} rows={3} placeholder="One thing I did well was..." />
      <Field label="What will you improve before (or after) you deliver it?" value={s.reflect.improve} onChange={(v) => set('reflect', { ...s.reflect, improve: v })} rows={3} placeholder="Next time I will..." />
      <Field label="Your personal speaking goal" value={s.reflect.goal} onChange={(v) => set('reflect', { ...s.reflect, goal: v })} help="Make it specific and observable: 'Pause after each main point' beats 'Be less nervous.'" />
      <button type="button" className="btn-primary" disabled={!s.reflect.goal.trim()} onClick={saveGoal}>Save goal to My Growth</button>
      <p className="text-sm"><Link to={`/speeches/${speechId}#rubric`}>Complete the rubric self-assessment for this speech</Link></p>
      <CoachQuestions stage="reflect" />
    </div>,
  ];

  return (
    <>
      <PageHeader title="Speech Studio" lede="Build your speech one step at a time. Each step gives you guidance and feedback, and everything you write stays yours." trail={[{ label: 'Home', to: '/' }, { label: 'Studio' }]}>
        <div className="mt-6 flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="speech-select" className="block text-sm">Speech type</label>
            <select id="speech-select" className="w-auto" value={speechId} onChange={(e) => { setParams({ speech: e.target.value }); setStep(0); }}>
              {speeches.map((sp) => <option key={sp.id} value={sp.id}>{sp.title}</option>)}
            </select>
          </div>
          <PathwayTag />
          <p className="font-bold" aria-live="polite">{doneCount} of 7 steps drafted</p>
        </div>
      </PageHeader>

      <div className="wrap grid gap-8 py-10 lg:grid-cols-[15rem_1fr]">
        <nav aria-label="Studio steps" className="min-w-0">
          <ol className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
            {STEPS.map((st, i) => (
              <li key={st.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  aria-current={step === i ? 'step' : undefined}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left ${step === i ? 'bg-ink text-white' : 'hover:bg-mist'}`}
                >
                  {stepDone(s, i) ? <CheckCircle2 size={20} className={step === i ? 'text-stage' : 'text-hs'} aria-label="drafted" /> : <Circle size={20} aria-label="not started" />}
                  <span>
                    <span className="block font-bold">{i + 1}. {st.name}</span>
                    <span className={`hidden text-sm lg:block ${step === i ? 'text-white/80' : 'text-ink/70'}`}>{st.blurb}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div className="min-w-0">
          <h2 id="studio-step" tabIndex={-1} className="text-3xl outline-none">Step {step + 1}: {STEPS[step].name}</h2>
          <p className="mb-6 text-ink/80">{STEPS[step].blurb}</p>
          {steps[step]}
          <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-mist pt-6">
            {step > 0 ? <button type="button" className="btn-quiet" onClick={() => goTo(step - 1)}><ArrowLeft size={18} aria-hidden="true" /> {STEPS[step - 1].name}</button> : <span />}
            {step < STEPS.length - 1 && <button type="button" className="btn-primary" onClick={() => goTo(step + 1)}>Next: {STEPS[step + 1].name} <ArrowRight size={18} aria-hidden="true" /></button>}
          </div>
        </div>
      </div>

      <section aria-labelledby="export-h" className="border-t border-mist bg-white">
        <div className="wrap grid gap-8 py-10 lg:grid-cols-[1fr_1fr]">
          <div>
            <h2 id="export-h" className="text-2xl">Your outline</h2>
            <p className="mt-1 text-ink/80">Updates as you work. Copy it into a document or download it.</p>
            <pre className="mt-4 max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-md bg-paper p-4 font-body text-sm">{outline}</pre>
          </div>
          <div className="space-y-4">
            <h2 className="text-2xl">Save, share, and privacy</h2>
            <div className="flex flex-wrap gap-2">
              <CopyButton text={outline} label="Copy outline" />
              <DownloadButton filename={`${speechId}-outline.txt`} text={outline} label="Download outline (.txt)" />
              <DownloadButton filename={`${speechId}-studio-backup.json`} text={JSON.stringify({ app: 'The Speaking Lab studio', speechId, speechTitle: speech.title, savedAt: new Date().toISOString(), state: s }, null, 2)} label="Download backup (.json)" />
              <button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()}><Upload size={18} aria-hidden="true" /> Import backup</button>
              <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" aria-label="Import a Studio backup file" onChange={importFile} />
            </div>
            <p aria-live="polite" className="font-bold">{msg}</p>
            <Notice>
              Your Studio work saves automatically in this browser only. It is not sent to your teacher or anyone else, and it may disappear if browser data is cleared or you use a different device. Download a backup to keep it. Submit work the way your instructor tells you to.
            </Notice>
            <button type="button" className="btn-quiet text-brick" onClick={clear}><Trash2 size={18} aria-hidden="true" /> Clear this speech's Studio work</button>
          </div>
        </div>
      </section>
    </>
  );
}

function SourceInput({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block">{label}</label>
      <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
