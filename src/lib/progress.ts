import { usePersistentState } from './hooks';

export interface ProgressRecord {
  [activityId: string]: { completedAt: string; score?: string };
}

/** Formative completion tracking only. Not grades, not sent anywhere. */
export function useProgress() {
  const [progress, setProgress] = usePersistentState<ProgressRecord>('progress', {});
  const markComplete = (id: string, score?: string) =>
    setProgress((p) => ({ ...p, [id]: { completedAt: new Date().toISOString(), score } }));
  const isComplete = (id: string) => Boolean(progress[id]);
  return { progress, markComplete, isComplete };
}
