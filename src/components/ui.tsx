import { ReactNode, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Check, ChevronDown, Copy, Download, ExternalLink, Info } from 'lucide-react';
import { formatRef, sectionTitle, textbook, glossaryTerm } from '../lib/content';
import { usePathway } from '../lib/pathway';
import { usePersistentState } from '../lib/hooks';
import { downloadText } from '../lib/storage';
import type { TextbookRef } from '../types';

export function Breadcrumbs({ trail }: { trail: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm">
      <ol className="flex flex-wrap gap-1 text-ink/80">
        {trail.map((t, i) => (
          <li key={t.label} className="flex items-center gap-1">
            {i > 0 && <span aria-hidden="true">/</span>}
            {t.to ? <Link to={t.to} className="hover:text-ink">{t.label}</Link> : <span aria-current="page">{t.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageHeader({ title, lede, trail, children, tone = 'paper' }: { title: string; lede?: ReactNode; trail?: { label: string; to?: string }[]; children?: ReactNode; tone?: 'paper' | 'ink' }) {
  const dark = tone === 'ink';
  return (
    <div className={dark ? 'bg-ink text-white' : 'border-b border-mist bg-white'}>
      <div className="wrap py-10 sm:py-14">
        {trail && <div className={dark ? '[&_*]:text-white/80' : ''}><Breadcrumbs trail={trail} /></div>}
        <h1 className={`text-4xl sm:text-5xl ${dark ? 'text-white' : ''}`}>{title}</h1>
        {lede && <div className={`mt-4 max-w-prose text-lg ${dark ? 'text-white/90' : 'text-ink/85'}`}>{lede}</div>}
        {children}
      </div>
    </div>
  );
}

export function TextbookRefs({ refs, compact = false }: { refs: TextbookRef[]; compact?: boolean }) {
  return (
    <div role="note" aria-label="Textbook connection" className={`self-start rounded-lg border-l-4 border-stage bg-stage-soft ${compact ? 'p-3' : 'p-4'}`}>
      <p className="flex items-start gap-2 font-bold">
        <BookOpen size={18} className="mt-1 shrink-0" aria-hidden="true" />
        <span>From <cite className="italic">Exploring Public Speaking</cite> (4.1)</span>
      </p>
      <ul className="mt-2 space-y-1 text-[0.95rem]">
        {refs.map((r, i) => (
          <li key={i}>
            {formatRef(r)}
            {r.section && sectionTitle(r) && <span className="text-ink/75">: {sectionTitle(r)}</span>}
          </li>
        ))}
      </ul>
      <a href={textbook.readUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-bold">
        Read the textbook <ExternalLink size={14} aria-hidden="true" /><span className="sr-only">(opens in a new tab)</span>
      </a>
    </div>
  );
}

export function Disclosure({ summary, children, defaultOpen = false }: { summary: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="group rounded-lg border border-mist bg-white" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-bold [&::-webkit-details-marker]:hidden">
        <span>{summary}</span>
        <ChevronDown aria-hidden="true" className="shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-mist p-4">{children}</div>
    </details>
  );
}

export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warn' }) {
  return (
    <div role="note" className={`flex gap-3 rounded-lg p-4 ${tone === 'warn' ? 'bg-brick-soft' : 'bg-mist/60'}`}>
      <Info aria-hidden="true" className="mt-0.5 shrink-0" size={20} />
      <div className="text-[0.95rem]">{children}</div>
    </div>
  );
}

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button type="button" className="btn-secondary" onClick={copy}>
      {copied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
      <span aria-live="polite">{copied ? 'Copied' : label}</span>
    </button>
  );
}

export function DownloadButton({ filename, text, label = 'Download' }: { filename: string; text: string; label?: string }) {
  return (
    <button type="button" className="btn-secondary" onClick={() => downloadText(filename, text, filename.endsWith('.json') ? 'application/json' : 'text/plain')}>
      <Download size={18} aria-hidden="true" /> {label}
    </button>
  );
}

/** Shows content for the active pathway only. */
export function ForPathway({ hs, college }: { hs: ReactNode; college: ReactNode }) {
  const { pathway } = usePathway();
  return <>{pathway === 'college' ? college : hs}</>;
}

export function PathwayTag() {
  const { pathway } = usePathway();
  return (
    <span className={`chip border-0 font-bold ${pathway === 'college' ? 'bg-college-soft text-college' : 'bg-hs-soft text-hs'}`}>
      {pathway === 'college' ? 'College Public Speaking' : 'High School Speech'}
    </span>
  );
}

/** One stage of the Explore → Understand → Apply → Practice → Reflect cycle. */
export const CYCLE = ['Explore', 'Understand', 'Apply', 'Practice', 'Reflect'] as const;
export function Stage({ n, title, children, id }: { n: number; title?: string; children: ReactNode; id?: string }) {
  return (
    <section aria-labelledby={id ?? `stage-${n}`} className="grid gap-4 border-t border-mist py-8 md:grid-cols-[11rem_1fr]">
      <div>
        <p className="font-display text-sm font-bold text-ink/70">Step {n + 1} of 5</p>
        <h2 id={id ?? `stage-${n}`} className="text-2xl">{CYCLE[n]}</h2>
        {title && <p className="mt-1 text-ink/75">{title}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export function SavedNote() {
  return <p className="text-sm text-ink/70">Saves automatically in this browser only. <Link to="/about#privacy">Privacy</Link></p>;
}

export function Reflection({ storageKey, prompt, frames }: { storageKey: string; prompt: string; frames?: string[] }) {
  const [text, setText] = usePersistentState<string>(storageKey, '');
  const id = useId();
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block">{prompt}</label>
      {frames && frames.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Sentence starters">
          {frames.map((f) => (
            <button key={f} type="button" className="chip bg-white hover:bg-mist" onClick={() => setText(text ? `${text} ${f}` : f)}>
              {f}
            </button>
          ))}
        </div>
      )}
      <textarea id={id} rows={4} value={text} onChange={(e) => setText(e.target.value)} />
      <SavedNote />
    </div>
  );
}

export function VocabChips({ ids }: { ids: string[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const terms = ids.map(glossaryTerm).filter(Boolean);
  if (!terms.length) return null;
  const active = terms.find((t) => t!.id === open);
  return (
    <div>
      <p className="mb-2 font-bold">Key vocabulary</p>
      <div className="flex flex-wrap gap-2">
        {terms.map((t) => (
          <button key={t!.id} type="button" aria-expanded={open === t!.id} className={`chip ${open === t!.id ? 'bg-ink text-white' : 'bg-white hover:bg-mist'}`} onClick={() => setOpen(open === t!.id ? null : t!.id)}>
            {t!.term}
          </button>
        ))}
      </div>
      {active && (
        <div className="mt-3 rounded-md bg-white p-3" aria-live="polite">
          <p><strong>{active.term}:</strong> {active.definition}</p>
          <p className="mt-1 text-sm text-ink/80" lang="es">Español: {active.es}</p>
        </div>
      )}
    </div>
  );
}

export const SENTENCE_FRAMES = {
  reflect: ['One thing I did well was...', 'Next time I will...', 'I noticed that...', 'This connects to my speech because...'],
  analyze: ['The speaker uses ___ to...', 'This is effective because...', 'Another reading could be...', 'The evidence suggests...'],
};
