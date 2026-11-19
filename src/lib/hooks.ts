import { useCallback, useEffect, useState } from 'react';
import { readJSON, writeJSON } from './storage';

/** State that persists to localStorage and stays in sync across components. */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => readJSON<T>(key, initial));

  useEffect(() => {
    setValue(readJSON<T>(key, initial));
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === key || detail === '*') setValue(readJSON<T>(key, initial));
    };
    window.addEventListener('speakinglab:storage', onChange);
    return () => window.removeEventListener('speakinglab:storage', onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      const prev = readJSON<T>(key, initial);
      const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
      writeJSON(key, resolved);
      setValue(resolved);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  return [value, update] as const;
}

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const fn = () => setReduced(mq.matches);
    mq.addEventListener?.('change', fn);
    return () => mq.removeEventListener?.('change', fn);
  }, []);
  return reduced;
}

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} | The Speaking Lab` : 'The Speaking Lab';
  }, [title]);
}
