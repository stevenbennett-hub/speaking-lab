import { Link } from 'react-router-dom';
import { CheckCircle2, Fingerprint, FlaskConical, HeartPulse, ListOrdered, LucideIcon, Mic, Presentation, Scale, Search, Sparkles, Users } from 'lucide-react';

const ICONS: Record<string, LucideIcon> = { Scale, Users, Sparkles, ListOrdered, Search, Fingerprint, Mic, Presentation, HeartPulse };
import { labs } from '../lib/content';
import { useProgress } from '../lib/progress';
import { useDocumentTitle } from '../lib/hooks';
import { PageHeader } from '../components/ui';

export default function Labs() {
  useDocumentTitle('Interactive Labs');
  const { progress } = useProgress();
  const touched = (id: string) => Object.keys(progress).some((k) => k.startsWith(`lab:${id}`));
  return (
    <>
      <PageHeader tone="ink" title="Interactive labs" lede="Learn by doing. Each lab gives you decisions to make, feedback on every choice, and a way to apply the skill to your own speech." trail={[{ label: 'Home', to: '/' }, { label: 'Labs' }]} />
      <div className="wrap py-12">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {labs.map((l) => {
            const Icon = ICONS[l.icon] ?? FlaskConical;
            return (
              <li key={l.id}>
                <Link to={`/labs/${l.id}`} className="flex h-full flex-col rounded-lg border border-mist bg-white p-5 no-underline hover:border-ink">
                  <span className="flex items-center justify-between">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink text-stage"><Icon aria-hidden="true" /></span>
                    {touched(l.id) && <CheckCircle2 className="text-hs" aria-label="Started or completed" />}
                  </span>
                  <span className="mt-4 font-display text-2xl font-bold">{l.title}</span>
                  <span className="mt-1 text-ink/80">{l.short}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
