import { ChangeEvent, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Trash2, Upload } from 'lucide-react';
import { formatTime, getRubric, modules, rubrics, speeches, labs } from '../lib/content';
import { useDocumentTitle, usePersistentState } from '../lib/hooks';
import { useProgress } from '../lib/progress';
import { clearAll, downloadText, exportAll, importAll, listKeys, storageAvailable, todayStamp } from '../lib/storage';
import { Notice, PageHeader } from '../components/ui';
import type { RubricSnapshot } from '../components/Tools';
import type { DeliveryAssessment } from '../labs/Labs';
import type { TimerRun } from '../components/Timer';

interface Goal { date: string; text: string; speech: string; done: boolean }

function Meter({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div>
      <div className="flex justify-between"><span className="font-bold">{label}</span><span>{value} of {max}</span></div>
      <div className="mt-1 h-3 overflow-hidden rounded-full bg-mist" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
        <div className="h-full bg-hs" style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
      </div>
    </div>
  );
}

export default function Growth() {
  useDocumentTitle('My Growth');
  const { progress } = useProgress();
  const [goals, setGoals] = usePersistentState<Goal[]>('goals', []);
  const [delivery] = usePersistentState<DeliveryAssessment[]>('delivery:assessments', []);
  const [runs] = usePersistentState<TimerRun[]>('timer:log', []);
  const [newGoal, setNewGoal] = useState('');
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const goalId = useId();
  const keys = Object.keys(progress);
  const modDone = modules.filter((m) => progress[m.activity.id]).length;
  const labsTouched = labs.filter((l) => keys.some((k) => k.startsWith(`lab:${l.id}`))).length;
  const studioSteps = keys.filter((k) => k.startsWith('studio:')).length;
  const reflections = listKeys('reflect:').length;
  const rubricHist = speeches.map((s) => ({ s, hist: (() => { try { return JSON.parse(localStorage.getItem(`speakinglab:rubric:${s.id}`) || '[]') as RubricSnapshot[]; } catch { return []; } })() })).filter((x) => x.hist.length);

  const exportData = () => downloadText(`speaking-lab-backup-${todayStamp()}.json`, JSON.stringify(exportAll(), null, 2), 'application/json');
  const importData = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const n = importAll(JSON.parse(await f.text()));
      setMsg(`Restored ${n} saved items.`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'That file could not be read.');
    }
    e.target.value = '';
  };
  const wipe = () => {
    if (window.confirm('Delete ALL of your Speaking Lab work in this browser? Download a backup first if you want to keep it.')) {
      clearAll();
      setMsg('All saved work was removed from this browser.');
    }
  };

  const first = delivery[0];
  const last = delivery[delivery.length - 1];
  const skills = first ? Object.keys(first.ratings) : [];

  return (
    <>
      <PageHeader title="My growth" lede="Your progress, self-assessments, and goals. This is practice and reflection, separate from any grade your teacher gives." trail={[{ label: 'Home', to: '/' }, { label: 'My Growth' }]} />
      <div className="wrap space-y-14 py-10">
        {!storageAvailable() && <Notice tone="warn">This browser is blocking storage, so your work can't be saved. Try a regular (not private) window, or download your work as you go.</Notice>}

        <section aria-labelledby="prog" className="grid gap-6 md:grid-cols-2">
          <div className="panel space-y-4">
            <h2 id="prog" className="text-2xl">Completion</h2>
            <Meter label="Learn module activities" value={modDone} max={modules.length} />
            <Meter label="Labs started or completed" value={labsTouched} max={labs.length} />
            <p>Studio steps drafted: <strong>{studioSteps}</strong>. Reflections written: <strong>{reflections}</strong>. Practice runs timed: <strong>{runs.length}</strong>.</p>
          </div>
          <div className="panel space-y-3">
            <h2 className="text-2xl">My speaking goals</h2>
            {goals.length === 0 && <p>No goals yet. Set one here or in the Studio's Reflect step.</p>}
            <ul className="space-y-2">
              {goals.map((g, i) => (
                <li key={i} className="flex items-start gap-3">
                  <input type="checkbox" className="mt-1 h-5 w-5 accent-ink" aria-label={`Mark goal done: ${g.text}`} checked={g.done} onChange={() => setGoals(goals.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))} />
                  <span className={`flex-1 ${g.done ? 'text-ink/70 line-through' : ''}`}>{g.text} <span className="block text-sm text-ink/70">{g.speech}, {g.date}</span></span>
                  <button type="button" className="rounded p-1 hover:bg-mist" aria-label={`Delete goal: ${g.text}`} onClick={() => setGoals(goals.filter((_, j) => j !== i))}><Trash2 size={18} /></button>
                </li>
              ))}
            </ul>
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (newGoal.trim()) { setGoals([...goals, { date: todayStamp(), text: newGoal.trim(), speech: 'General', done: false }]); setNewGoal(''); } }}>
              <label htmlFor={goalId} className="sr-only">New goal</label>
              <input id={goalId} type="text" value={newGoal} onChange={(e) => setNewGoal(e.target.value)} placeholder="Pause after each main point" />
              <button type="submit" className="btn-primary shrink-0">Add goal</button>
            </form>
          </div>
        </section>

        <section aria-labelledby="deliv">
          <h2 id="deliv" className="text-3xl">Delivery: early and recent</h2>
          {delivery.length < 2 ? (
            <p className="mt-2">{delivery.length === 0 ? 'No delivery self-assessments yet.' : 'One self-assessment saved. Add another after your next practice to compare.'} <Link to="/labs/delivery">Open the Delivery Lab</Link></p>
          ) : (
            <div className="mt-4 panel">
              <p className="mb-4">First on {new Date(first.date).toLocaleDateString()} (light bar) compared with latest on {new Date(last.date).toLocaleDateString()} (dark bar). Scale 1–5.</p>
              <ul className="space-y-3">
                {skills.map((k) => (
                  <li key={k} className="grid items-center gap-2 sm:grid-cols-[12rem_1fr]">
                    <span className="font-bold">{k}</span>
                    <span className="space-y-1">
                      <span className="block h-3 rounded-full bg-stage/60" style={{ width: `${(first.ratings[k] / 5) * 100}%` }} aria-hidden="true" />
                      <span className="block h-3 rounded-full bg-ink" style={{ width: `${(last.ratings[k] / 5) * 100}%` }} aria-hidden="true" />
                      <span className="sr-only">{first.ratings[k]} then {last.ratings[k]}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section aria-labelledby="rub">
          <h2 id="rub" className="text-3xl">Rubric self-assessments</h2>
          {rubricHist.length === 0 && <p className="mt-2">None yet. Each speech page has a self-assessment.</p>}
          <div className="mt-4 space-y-6">
            {rubricHist.map(({ s, hist }) => {
              const r = getRubric(s.id)!;
              return (
                <div key={s.id} className="panel overflow-x-auto">
                  <h3 className="text-xl">{s.title}</h3>
                  <table className="mt-3 w-full min-w-[32rem] text-left text-sm">
                    <thead><tr className="border-b-2 border-ink"><th scope="col" className="py-1 pr-2">Criterion</th>{hist.map((h) => <th key={h.date} scope="col" className="px-2 py-1">{h.label}<span className="block font-normal text-ink/70">{new Date(h.date).toLocaleDateString()}</span></th>)}</tr></thead>
                    <tbody>{r.criteria.map((c) => <tr key={c.name} className="border-b border-mist"><th scope="row" className="py-1 pr-2 font-normal">{c.name}</th>{hist.map((h) => <td key={h.date} className="px-2 py-1">{rubrics.levels[h.levels[c.name]]}</td>)}</tr>)}</tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="runs">
          <h2 id="runs" className="text-3xl">Practice log</h2>
          {runs.length === 0 ? <p className="mt-2">No timed runs yet.</p> : (
            <ul className="mt-3 space-y-1">{[...runs].reverse().slice(0, 15).map((r) => <li key={r.date}>{new Date(r.date).toLocaleString()}: {formatTime(r.seconds)} (target {formatTime(r.target)}), {r.label}</li>)}</ul>
          )}
        </section>

        <section aria-labelledby="data" className="rounded-xl bg-white p-6">
          <h2 id="data" className="text-3xl">Your data</h2>
          <p className="mt-2 max-w-prose">Everything on this page lives only in this browser on this device. It is not sent to your teacher or to anyone else. Clearing browser data, using a private window, or switching devices will lose it unless you download a backup.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={exportData}><Download size={18} aria-hidden="true" /> Download all my work (.json)</button>
            <button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()}><Upload size={18} aria-hidden="true" /> Restore from backup</button>
            <input ref={fileRef} type="file" accept=".json,application/json" className="sr-only" aria-label="Restore a Speaking Lab backup" onChange={importData} />
            <button type="button" className="btn-quiet text-brick" onClick={wipe}><Trash2 size={18} aria-hidden="true" /> Delete all my work</button>
          </div>
          <p className="mt-3 font-bold" aria-live="polite">{msg}</p>
        </section>
      </div>
    </>
  );
}
