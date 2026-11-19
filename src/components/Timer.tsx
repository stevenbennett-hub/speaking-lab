import { useEffect, useId, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Save } from 'lucide-react';
import { formatTime } from '../lib/content';
import { usePersistentState, usePrefersReducedMotion } from '../lib/hooks';
import { useProgress } from '../lib/progress';

export interface TimerRun {
  date: string;
  seconds: number;
  target: number;
  label: string;
}

type Phase = 'ready' | 'ontrack' | 'warning' | 'time' | 'over';

function phaseFor(elapsed: number, target: number, running: boolean): Phase {
  if (!running && elapsed === 0) return 'ready';
  if (elapsed >= target + 30) return 'over';
  if (elapsed >= target) return 'time';
  if (elapsed >= Math.max(target - 60, target * 0.8)) return 'warning';
  return 'ontrack';
}

const PHASE_STYLE: Record<Phase, { bg: string; text: string; label: string }> = {
  ready: { bg: 'bg-ink', text: 'text-white', label: 'Ready' },
  ontrack: { bg: 'bg-hs', text: 'text-white', label: 'On track' },
  warning: { bg: 'bg-stage', text: 'text-ink', label: 'Wrap up soon' },
  time: { bg: 'bg-brick', text: 'text-white', label: 'Target time reached: conclude' },
  over: { bg: 'bg-brick', text: 'text-white', label: 'Over time' },
};

export function SpeechTimer({ defaultTarget = 300, label = 'Practice run' }: { defaultTarget?: number; label?: string }) {
  const [target, setTarget] = useState(defaultTarget);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const startRef = useRef<number>(0);
  const baseRef = useRef<number>(0);
  const [log, setLog] = usePersistentState<TimerRun[]>('timer:log', []);
  const [announce, setAnnounce] = useState('');
  const { markComplete } = useProgress();
  const minId = useId();
  const secId = useId();

  useEffect(() => setTarget(defaultTarget), [defaultTarget]);

  useEffect(() => {
    if (!running) return;
    startRef.current = Date.now();
    const t = window.setInterval(() => {
      setElapsed(baseRef.current + (Date.now() - startRef.current) / 1000);
    }, 250);
    return () => window.clearInterval(t);
  }, [running]);

  const phase = phaseFor(elapsed, target, running);
  const lastPhase = useRef<Phase>('ready');
  useEffect(() => {
    if (phase !== lastPhase.current) {
      lastPhase.current = phase;
      if (phase !== 'ready') setAnnounce(PHASE_STYLE[phase].label);
    }
  }, [phase]);

  const toggle = () => {
    if (running) {
      baseRef.current = elapsed;
      setRunning(false);
    } else {
      setRunning(true);
    }
  };
  const reset = () => {
    setRunning(false);
    baseRef.current = 0;
    setElapsed(0);
    setAnnounce('Timer reset');
  };
  const saveRun = () => {
    setLog([...log, { date: new Date().toISOString(), seconds: Math.round(elapsed), target, label }].slice(-50));
    markComplete('timer:used');
    setAnnounce('Run saved to your practice log');
  };

  const style = PHASE_STYLE[phase];
  const recent = log.slice(-5).reverse();
  const diff = Math.round(elapsed - target);

  return (
    <div className="space-y-4">
      <div className={`rounded-xl ${style.bg} ${style.text} p-6 text-center transition-colors sm:p-10`}>
        <p className="font-display text-lg font-bold">{style.label}</p>
        <p className="font-display text-7xl font-bold tabular-nums sm:text-8xl" aria-label={`Elapsed ${formatTime(elapsed)}`}>{formatTime(elapsed)}</p>
        <p className="mt-1">Target {formatTime(target)}</p>
      </div>
      <p className="sr-only" aria-live="assertive">{announce}</p>
      <div className="flex flex-wrap items-end gap-3">
        <button type="button" className="btn-primary" onClick={toggle}>
          {running ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />} {running ? 'Pause' : elapsed > 0 ? 'Resume' : 'Start'}
        </button>
        <button type="button" className="btn-secondary" onClick={reset}><RotateCcw size={18} aria-hidden="true" /> Reset</button>
        <button type="button" className="btn-secondary" onClick={saveRun} disabled={elapsed < 1 || running}><Save size={18} aria-hidden="true" /> Save run</button>
        <div className="flex items-end gap-2">
          <div className="w-20">
            <label htmlFor={minId} className="block text-sm">Target min</label>
            <input id={minId} type="number" min={0} max={30} value={Math.floor(target / 60)} disabled={running} onChange={(e) => setTarget(Math.max(0, Number(e.target.value)) * 60 + (target % 60))} />
          </div>
          <div className="w-20">
            <label htmlFor={secId} className="block text-sm">sec</label>
            <input id={secId} type="number" min={0} max={59} step={15} value={target % 60} disabled={running} onChange={(e) => setTarget(Math.floor(target / 60) * 60 + Math.min(59, Math.max(0, Number(e.target.value))))} />
          </div>
        </div>
      </div>
      {!running && elapsed > 1 && (
        <p className="rounded-md bg-mist/60 p-3" aria-live="polite">
          {Math.abs(diff) <= 15
            ? 'Right on target. Note what you did so you can repeat it.'
            : diff < 0
              ? `${formatTime(-diff)} under target. Did you rush, or does the speech need more development?`
              : `${formatTime(diff)} over target. Look for an example or detail you can trim, and keep your pauses.`}
        </p>
      )}
      <p className="text-sm text-ink/75">Signals: green while on track, gold near the end, red at the target time. Your instructor's grace period may differ.</p>
      {recent.length > 0 && (
        <div>
          <p className="font-bold">Recent practice runs</p>
          <ul className="mt-1 space-y-1 text-[0.95rem]">
            {recent.map((r) => (
              <li key={r.date}>{new Date(r.date).toLocaleDateString()}: {formatTime(r.seconds)} of {formatTime(r.target)} target <span className="text-ink/70">({r.label})</span></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const PATTERNS = {
  calm: { name: 'Slow breathing (4 in, 6 out)', steps: [['Breathe in', 4], ['Breathe out', 6]] },
  box: { name: 'Box breathing (4-4-4-4)', steps: [['Breathe in', 4], ['Hold', 4], ['Breathe out', 4], ['Hold', 4]] },
} as const;

export function BreathingPacer() {
  const [kind, setKind] = useState<keyof typeof PATTERNS>('calm');
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [count, setCount] = useState(0);
  const [cycles, setCycles] = useState(0);
  const reduced = usePrefersReducedMotion();
  const steps = PATTERNS[kind].steps;

  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => {
      setCount((c) => {
        const len = steps[step][1];
        if (c + 1 >= len) {
          setStep((s) => {
            const nxt = (s + 1) % steps.length;
            if (nxt === 0) setCycles((n) => n + 1);
            return nxt;
          });
          return 0;
        }
        return c + 1;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [running, step, steps]);

  const label = steps[step][0];
  const scale = label === 'Breathe in' ? 0.55 + 0.45 * ((count + 1) / steps[step][1]) : label === 'Breathe out' ? 1 - 0.45 * ((count + 1) / steps[step][1]) : label === 'Hold' && step === 1 ? 1 : 0.55;

  return (
    <div className="grid items-center gap-6 md:grid-cols-[1fr_16rem]">
      <div className="space-y-3">
        <fieldset>
          <legend className="font-bold">Pattern</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {(Object.keys(PATTERNS) as (keyof typeof PATTERNS)[]).map((k) => (
              <label key={k} className={`chip cursor-pointer font-normal ${kind === k ? 'bg-ink text-white' : 'bg-white'}`}>
                <input type="radio" className="sr-only" name="breath" checked={kind === k} onChange={() => { setKind(k); setStep(0); setCount(0); }} />
                {PATTERNS[k].name}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex gap-2">
          <button type="button" className="btn-primary" onClick={() => setRunning(!running)}>{running ? 'Pause' : 'Start'}</button>
          <button type="button" className="btn-secondary" onClick={() => { setRunning(false); setStep(0); setCount(0); setCycles(0); }}>Reset</button>
        </div>
        <p className="text-sm text-ink/80">Slow breathing can help steady your voice before you speak. Stop if you feel dizzy, and breathe normally. Completed cycles: {cycles}</p>
      </div>
      <div className="flex flex-col items-center justify-center" aria-live="polite">
        <div className="relative flex h-56 w-56 items-center justify-center">
          <div
            className="absolute inset-0 rounded-full bg-stage/80"
            style={{ transform: `scale(${running ? scale : 0.55})`, transition: reduced ? 'none' : 'transform 1s linear' }}
            aria-hidden="true"
          />
          <p className="relative font-display text-2xl font-bold">{running ? `${label} ${steps[step][1] - count}` : 'Press start'}</p>
        </div>
      </div>
    </div>
  );
}
