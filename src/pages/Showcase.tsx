import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { getAssignment, speeches } from '../lib/content';
import { usePathway } from '../lib/pathway';
import { useDocumentTitle } from '../lib/hooks';
import { PageHeader } from '../components/ui';

const STATUS: Record<string, string> = { current: 'Current', upcoming: 'Upcoming', completed: 'Completed', 'not-assigned': 'Optional' };

export default function Showcase() {
  useDocumentTitle('Speech Showcase');
  const { pathway } = usePathway();
  const major = speeches.filter((s) => s.category === 'major');
  const optional = speeches.filter((s) => s.category === 'optional');
  return (
    <>
      <PageHeader tone="ink" title="Our major speeches" lede="Each speech has its own page with learning objectives, a step-by-step preparation path, interactive tools, examples, a checklist, and a self-assessment rubric." trail={[{ label: 'Home', to: '/' }, { label: 'Speeches' }]} />
      <div className="wrap py-12">
        <ol className="grid gap-6 md:grid-cols-2">
          {major.map((s) => {
            const a = getAssignment(s.id);
            return (
              <li key={s.id} className="flex flex-col overflow-hidden rounded-xl bg-white shadow-[0_1px_0_#DDE1EE]">
                <div className="flex items-end justify-between bg-ink px-6 pb-4 pt-8 text-white">
                  <span className="font-display text-7xl font-bold leading-none text-stage" aria-hidden="true">{s.number}</span>
                  {a && <span className="chip border-white/40 text-white">{STATUS[a.status]}</span>}
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h2 className="text-3xl"><span className="sr-only">Speech {s.number}: </span>{s.title}</h2>
                  <p className="mt-1 font-display text-lg font-semibold text-ink/80">{s.tagline}</p>
                  <p className="mt-3 flex-1">{s.summary}</p>
                  {a && <p className="mt-3 text-sm text-ink/75">{a[pathway].time}. {a[pathway].sources}.</p>}
                  <Link to={`/speeches/${s.id}`} className="btn-primary mt-5 self-start">Open the {s.title.toLowerCase()} page <ArrowRight size={18} aria-hidden="true" /></Link>
                </div>
              </li>
            );
          })}
        </ol>

        <h2 className="mt-16 text-3xl">Additional and optional speeches</h2>
        <p className="mt-2 max-w-prose text-ink/80">Editable templates your instructor can assign. Each includes a planner, checklist, and sample rubric.</p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {optional.map((s) => (
            <li key={s.id}>
              <Link to={`/speeches/${s.id}`} className="block h-full rounded-lg border border-mist bg-white p-4 no-underline hover:border-ink">
                <span className="font-display text-xl font-bold">{s.title}</span>
                <span className="block text-ink/80">{s.tagline}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
