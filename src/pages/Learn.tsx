import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { MODULE_CATEGORIES, modules, formatRef } from '../lib/content';
import { useProgress } from '../lib/progress';
import { useDocumentTitle } from '../lib/hooks';
import { PageHeader } from '../components/ui';

export default function Learn() {
  useDocumentTitle('Learn');
  const { isComplete } = useProgress();
  const done = modules.filter((m) => isComplete(m.activity.id)).length;
  return (
    <>
      <PageHeader
        title="The foundations of public speaking"
        lede={<>Twenty-four short modules, each built on a chapter of the textbook. Every module follows the same cycle: explore an example, understand the idea, apply it, practice, and reflect.</>}
        trail={[{ label: 'Home', to: '/' }, { label: 'Learn' }]}
      >
        <p className="mt-6 font-bold" aria-live="polite">{done} of {modules.length} module activities completed</p>
      </PageHeader>
      <div className="wrap space-y-14 py-12">
        {MODULE_CATEGORIES.map((cat) => (
          <section key={cat.id} aria-labelledby={`cat-${cat.id}`}>
            <h2 id={`cat-${cat.id}`} className="text-3xl">{cat.title}</h2>
            <p className="mt-2 max-w-prose text-ink/80">{cat.blurb}</p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {modules.filter((m) => m.category === cat.id).map((m) => (
                <li key={m.id}>
                  <Link to={`/learn/${m.id}`} className="flex h-full flex-col rounded-lg border border-mist bg-white p-4 no-underline hover:border-ink">
                    <span className="flex items-start justify-between gap-2">
                      <span className="font-display text-xl font-bold">{m.title}</span>
                      {isComplete(m.activity.id) && <CheckCircle2 className="shrink-0 text-hs" aria-label="Completed" />}
                    </span>
                    <span className="mt-2 text-sm text-ink/75">{formatRef(m.textbook[0])}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
