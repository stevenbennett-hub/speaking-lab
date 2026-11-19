/**
 * All student work is stored ONLY in this browser's localStorage under the
 * "speakinglab:" prefix. Nothing is sent to a server. Every call is wrapped in
 * try/catch because storage can be disabled (private windows, district policy).
 */
const PREFIX = 'speakinglab:';

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeJSON<T>(key: string, value: T): boolean {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent('speakinglab:storage', { detail: key }));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key: string) {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new CustomEvent('speakinglab:storage', { detail: key }));
}

export function listKeys(prefix = ''): string[] {
  const out: string[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(PREFIX + prefix)) out.push(k.slice(PREFIX.length));
    }
  } catch {
    /* storage unavailable */
  }
  return out.sort();
}

export function exportAll() {
  const data: Record<string, unknown> = {};
  for (const k of listKeys()) data[k] = readJSON(k, null);
  return { app: 'The Speaking Lab', exportedAt: new Date().toISOString(), data };
}

export function importAll(payload: unknown): number {
  if (!payload || typeof payload !== 'object' || !('data' in payload)) {
    throw new Error('This file is not a Speaking Lab backup. Choose a file exported from My Growth.');
  }
  const data = (payload as { data: Record<string, unknown> }).data;
  let n = 0;
  for (const [k, v] of Object.entries(data)) if (writeJSON(k, v)) n++;
  window.dispatchEvent(new CustomEvent('speakinglab:storage', { detail: '*' }));
  return n;
}

export function clearAll(prefix = '') {
  for (const k of listKeys(prefix)) removeKey(k);
  window.dispatchEvent(new CustomEvent('speakinglab:storage', { detail: '*' }));
}

export function storageAvailable(): boolean {
  try {
    const t = PREFIX + '__test';
    window.localStorage.setItem(t, '1');
    window.localStorage.removeItem(t);
    return true;
  } catch {
    return false;
  }
}

export function downloadText(filename: string, text: string, type = 'text/plain') {
  const blob = new Blob([text], { type: type + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}
