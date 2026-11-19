import { Link, useParams } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { greatSpeeches } from '../lib/content';
import { usePathway } from '../lib/pathway';
import { useDocumentTitle } from '../lib/hooks';
import { ChoiceSet } from '../components/ChoiceSet';
import { PageHeader, Reflection, SENTENCE_FRAMES, TextbookRefs } from '../components/ui';
import NotFound from './NotFound';

const KIND: Record<string, string> = { archive: 'Archive', text: 'Text', video: 'Video', audio: 'Audio', context: 'Background' };

export default function Exhibit() {
  const { id } = useParams();
  const g = greatSpeeches.find((x) => x.id === id);
  const { pathway } = usePathway();
  useDocumentTitle(g ? `${g.speaker}: ${g.title}` : 'Speech not found');
  if (!g) return <NotFound />;
  return (
    <>
      <PageHeader tone="ink" title={g.title} trail={[{ label: 'Great Speeches', to: '/great-speeches' }, { label: g.speaker }]} lede={<><span className="block font-display text-2xl font-semibold text-stage">{g.speaker}</span><span className="block">{g.date}. {g.place}.</span></>} />
      <div className="wrap space-y-14 py-12">
        <section aria-labelledby="ctx" className="grid gap-8 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-5">
            <h2 id="ctx" className="text-3xl">The moment</h2>
            <p className="max-w-prose text-lg">{g.context}</p>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="panel"><dt className="text-sm text-ink/75">Purpose</dt><dd className="mt-1">{g.purpose}</dd></div>
              <div className="panel"><dt className="text-sm text-ink/75">Intended audience</dt><dd className="mt-1">{g.audience}</dd></div>
            </dl>
          </div>
          <div className="space-y-4">
            <div className="rounded-lg bg-white p-4">
              <h3 className="text-lg">Read, watch, or listen</h3>
              <ul className="mt-2 space-y-2">
                {g.sources.map((s) => (
                  <li key={s.url}>
                    <span className="text-sm font-bold text-ink/70">{KIND[s.kind] ?? s.kind}: </span>
                    <a href={s.url} target="_blank" rel="noreferrer">{s.label}<ExternalLink size={14} className="ml-1 inline" aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-ink/75"><strong>Rights:</strong> {g.rights}</p>
              <p className="mt-1 text-sm text-ink/75">Captions and transcripts depend on the hosting archive.</p>
            </div>
            <TextbookRefs refs={g.textbook} compact />
          </div>
        </section>

        <section aria-labelledby="moves">
          <h2 id="moves" className="text-3xl">Rhetorical strategies</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {g.strategies.map((s) => (
              <div key={s.name} className="border-l-4 border-stage bg-white p-4">
                <h3 className="text-xl">{s.name}</h3>
                <p className="mt-1">{s.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 panel">
            <h3 className="text-xl">Delivery observations</h3>
            <p className="mt-1">{g.delivery}</p>
          </div>
        </section>

        <section aria-labelledby="identify">
          <h2 id="identify" className="mb-4 text-3xl">Identify the technique</h2>
          <ChoiceSet activityId={`speech:${g.id}`} items={g.identify} />
        </section>

        <section aria-labelledby="critical" className="rounded-xl bg-ink p-6 text-white sm:p-8">
          <h2 id="critical" className="text-3xl text-white">Look closer</h2>
          <p className="mt-3 max-w-prose text-lg text-white/90">{g.critical}</p>
        </section>

        <section aria-labelledby="questions" className="space-y-6">
          <h2 id="questions" className="text-3xl">Guided analysis</h2>
          {g.questions.map((q, i) => (
            <Reflection key={q} storageKey={`reflect:great:${g.id}:${i}`} prompt={q} frames={pathway === 'hs' ? SENTENCE_FRAMES.analyze : undefined} />
          ))}
          {pathway === 'college' && <p className="rounded-lg border-l-4 border-college bg-college-soft p-4">College extension: write a 500-word rhetorical analysis arguing which strategy matters most for this audience. Cite the speech text from the archive and at least one scholarly source about the speech.</p>}
        </section>

        <section aria-labelledby="connect" className="rounded-xl bg-stage-soft p-6">
          <h2 id="connect" className="text-2xl">Connect to your speech</h2>
          <p className="mt-2">{g.connection}</p>
          <Link to="/studio" className="btn-primary mt-4">Open the Studio</Link>
        </section>
      </div>
    </>
  );
}
