import { ReactNode, useId, useState } from 'react';
import { CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import { usePersistentState } from '../lib/hooks';
import { useProgress } from '../lib/progress';
import type { ChoiceItem } from '../types';

interface Answers {
  [itemId: string]: number;
}

/**
 * Presents choice items one at a time. Students pick an answer, check it, and
 * get an explanation for the option they chose (right or wrong) plus the best
 * answer. Results persist locally and mark the activity complete when finished.
 */
export function ChoiceSet({ activityId, items, renderExtra, intro }: { activityId: string; items: ChoiceItem[]; renderExtra?: (item: ChoiceItem) => ReactNode; intro?: ReactNode }) {
  const [answers, setAnswers] = usePersistentState<Answers>(`choice:${activityId}`, {});
  const [index, setIndex] = useState(() => {
    const firstOpen = items.findIndex((it) => answers[it.id] === undefined);
    return firstOpen === -1 ? 0 : firstOpen;
  });
  const [selected, setSelected] = useState<number | null>(null);
  const { markComplete } = useProgress();
  const groupId = useId();

  const answeredCount = items.filter((it) => answers[it.id] !== undefined).length;
  const allDone = answeredCount === items.length;
  const correctCount = items.filter((it) => answers[it.id] !== undefined && it.options[answers[it.id]]?.correct).length;

  const item = items[index];
  const checked = answers[item.id];
  const isChecked = checked !== undefined;
  const choice = isChecked ? checked : selected;

  const check = () => {
    if (selected === null) return;
    const next = { ...answers, [item.id]: selected };
    setAnswers(next);
    const done = items.every((it) => next[it.id] !== undefined);
    if (done) {
      const score = items.filter((it) => it.options[next[it.id]]?.correct).length;
      markComplete(activityId, `${score}/${items.length}`);
    }
  };

  const go = (i: number) => {
    setIndex(i);
    setSelected(null);
  };

  const reset = () => {
    setAnswers({});
    go(0);
  };

  const best = item.options.findIndex((o) => o.correct);

  return (
    <div className="space-y-4">
      {intro}
      {items.length > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-bold" aria-live="polite">
            Item {index + 1} of {items.length}
            <span className="ml-2 font-normal text-ink/70">({answeredCount} answered)</span>
          </p>
          <ol className="flex flex-wrap gap-1" aria-label="Jump to item">
            {items.map((it, i) => {
              const a = answers[it.id];
              const state = a === undefined ? 'open' : it.options[a]?.correct ? 'right' : 'wrong';
              return (
                <li key={it.id}>
                  <button
                    type="button"
                    onClick={() => go(i)}
                    aria-current={i === index ? 'step' : undefined}
                    aria-label={`Item ${i + 1}${state === 'open' ? '' : state === 'right' ? ', answered correctly' : ', answered incorrectly'}`}
                    className={`h-8 w-8 rounded-full text-sm font-bold ${i === index ? 'ring-2 ring-ink ring-offset-2' : ''} ${state === 'right' ? 'bg-hs text-white' : state === 'wrong' ? 'bg-brick text-white' : 'bg-mist'}`}
                  >
                    {i + 1}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <fieldset className="panel">
        <legend className="sr-only">Question {index + 1}</legend>
        {item.context && <p className="mb-3 rounded-md bg-paper p-3">{item.context}</p>}
        <p className="mb-4 text-lg font-bold" id={`${groupId}-q`}>{item.prompt}</p>
        {renderExtra?.(item)}
        <div role="radiogroup" aria-labelledby={`${groupId}-q`} className="space-y-2">
          {item.options.map((opt, i) => {
            const isChoice = choice === i;
            const showRight = isChecked && opt.correct;
            const showWrong = isChecked && isChoice && !opt.correct;
            return (
              <label
                key={i}
                className={`flex cursor-pointer items-start gap-3 rounded-md border-2 p-3 font-normal ${showRight ? 'border-hs bg-hs-soft' : showWrong ? 'border-brick bg-brick-soft' : isChoice ? 'border-ink bg-mist/50' : 'border-mist hover:border-ink/40'} ${isChecked ? 'cursor-default' : ''}`}
              >
                <input
                  type="radio"
                  name={`${groupId}-${item.id}`}
                  className="mt-1 h-4 w-4 accent-ink"
                  checked={isChoice}
                  disabled={isChecked}
                  onChange={() => setSelected(i)}
                />
                <span className="flex-1">{opt.text}</span>
                {showRight && <CheckCircle2 className="text-hs" aria-label="Best answer" />}
                {showWrong && <XCircle className="text-brick" aria-label="Not the best answer" />}
              </label>
            );
          })}
        </div>

        <div aria-live="polite">
          {isChecked && (
            <div className={`mt-4 rounded-md p-4 ${item.options[checked].correct ? 'bg-hs-soft' : 'bg-brick-soft'}`}>
              <p className="font-bold">{item.options[checked].correct ? 'Yes.' : 'Not quite.'}</p>
              <p>{item.options[checked].feedback}</p>
              {!item.options[checked].correct && best >= 0 && (
                <p className="mt-2"><strong>Best answer: {item.options[best].text}.</strong> {item.options[best].feedback}</p>
              )}
              {item.explanation && <p className="mt-2">{item.explanation}</p>}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {!isChecked && (
            <button type="button" className="btn-primary" disabled={selected === null} onClick={check}>
              Check answer
            </button>
          )}
          {items.length > 1 && index > 0 && (
            <button type="button" className="btn-quiet" onClick={() => go(index - 1)}>Previous</button>
          )}
          {items.length > 1 && index < items.length - 1 && (
            <button type="button" className={isChecked ? 'btn-primary' : 'btn-quiet'} onClick={() => go(index + 1)}>Next item</button>
          )}
        </div>
      </fieldset>

      {allDone && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-ink p-4 text-white" role="status">
          <p>
            <strong>Activity complete.</strong> {correctCount} of {items.length} matched the best answer. Practice results are for your learning only.
          </p>
          <button type="button" className="btn border-2 border-white text-white hover:bg-white hover:text-ink" onClick={reset}>
            <RotateCcw size={18} aria-hidden="true" /> Try again
          </button>
        </div>
      )}
    </div>
  );
}
