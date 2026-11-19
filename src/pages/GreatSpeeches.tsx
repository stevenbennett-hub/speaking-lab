import { Link } from 'react-router-dom';
import { greatSpeeches } from '../lib/content';
import { useDocumentTitle } from '../lib/hooks';
import { PageHeader } from '../components/ui';

export default function GreatSpeeches() {
  useDocumentTitle('Great Speeches');
  const sorted = [...greatSpeeches].sort((a, b) => Number(a.date.match(/\d{4}/)?.[0]) - Number(b.date.match(/\d{4}/)?.[0]));
  return (
    <>
      <PageHeader
        tone="ink"
        title="Great speeches"
        lede="A small exhibit of speeches that changed how people thought and acted. Each room gives you the context, the rhetorical moves, questions to argue about, and links to the original archives."
        trail={[{ label: 'Home', to: '/' }, { label: 'Great Speeches' }]}
      />
      <div className="wrap py-12">
        <p className="max-w-prose text-ink/85">These speeches are arranged as a timeline. Analyses here are one reading among many. Bring your own interpretation, and support it with evidence from the speech.</p>
        <ol className="relative mt-10 space-y-8 border-l-4 border-ink pl-6 sm:pl-10">
          {sorted.map((g) => (
            <li key={g.id} className="relative">
              <span className="absolute -left-[2.05rem] top-2 h-4 w-4 rounded-full border-4 border-ink bg-stage sm:-left-[3.05rem]" aria-hidden="true" />
              <p className="font-display text-lg font-bold text-ink/70">{g.date.match(/\d{4}/)?.[0]}</p>
              <Link to={`/great-speeches/${g.id}`} className="mt-1 block rounded-lg bg-white p-5 no-underline hover:bg-stage-soft">
                <span className="block text-ink/75">{g.speaker}</span>
                <span className="block font-display text-2xl font-bold">{g.title}</span>
                <span className="mt-1 block text-sm text-ink/75">{g.place}. Theme: {g.theme}.</span>
              </Link>
            </li>
          ))}
        </ol>
        <p className="mt-10 max-w-prose text-sm text-ink/75">Copyrighted speeches are not reproduced here. Each exhibit lists its rights status and links to the archive that holds the text, audio, or video.</p>
      </div>
    </>
  );
}
