import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { MODULE_CATEGORIES, modules } from '../lib/content';
import { usePathway } from '../lib/pathway';
import { useDocumentTitle } from '../lib/hooks';
import { ChoiceSet } from '../components/ChoiceSet';
import { Disclosure, PageHeader, PathwayTag, Reflection, SENTENCE_FRAMES, Stage, TextbookRefs, VocabChips } from '../components/ui';
import NotFound from './NotFound';

export default function ModulePage() {
  const { id } = useParams();
  const idx = modules.findIndex((m) => m.id === id);
  const m = modules[idx];
  const { pathway } = usePathway();
  useDocumentTitle(m?.title ?? 'Module not found');
  if (!m) return <NotFound />;
  const cat = MODULE_CATEGORIES.find((c) => c.id === m.category)!;
  const prev = modules[idx - 1];
  const next = modules[idx + 1];
  const collegeBlock = (
    <div className="rounded-lg border-l-4 border-college bg-college-soft p-4">
      <p className="font-bold">College extension</p>
      <p className="mt-1">{m.college}</p>
    </div>
  );

  return (
    <>
      <PageHeader title={m.title} lede={m.summary} trail={[{ label: 'Learn', to: '/learn' }, { label: cat.title, to: '/learn' }, { label: m.title }]}>
        <div className="mt-4"><PathwayTag /></div>
      </PageHeader>
      <div className="wrap py-4">
        <Stage n={0} title="A real-world example">
          <figure className="rounded-lg bg-ink p-6 text-white">
            <figcaption className="text-sm font-bold text-stage">{m.example.setting}</figcaption>
            <p className="mt-2 text-lg">{m.example.text}</p>
          </figure>
        </Stage>

        <Stage n={1} title="The key ideas">
          <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
            <div className="space-y-3">
              <ul className="space-y-3">
                {m.keyIdeas.map((k) => (
                  <li key={k} className="flex gap-3"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-stage" aria-hidden="true" /><span>{k}</span></li>
                ))}
              </ul>
              {m.vocab && <VocabChips ids={m.vocab} />}
            </div>
            <TextbookRefs refs={m.textbook} />
          </div>
        </Stage>

        <Stage n={2} title="Make a decision and get feedback">
          <ChoiceSet activityId={m.activity.id} items={[m.activity]} />
        </Stage>

        <Stage n={3} title="Take it further">
          <div className="space-y-4">
            {m.practice && (
              <Link to={m.practice.to} className="btn-primary">{m.practice.label} <ArrowRight size={18} aria-hidden="true" /></Link>
            )}
            {pathway === 'college' ? collegeBlock : <Disclosure summary="Optional college-level extension">{collegeBlock}</Disclosure>}
          </div>
        </Stage>

        <Stage n={4} title="Connect it to yourself">
          <Reflection storageKey={`reflect:module:${m.id}`} prompt={m.reflection} frames={pathway === 'hs' ? SENTENCE_FRAMES.reflect : undefined} />
        </Stage>

        <nav aria-label="Module navigation" className="flex flex-wrap justify-between gap-3 border-t border-mist pt-6">
          {prev ? <Link to={`/learn/${prev.id}`} className="btn-quiet"><ArrowLeft size={18} aria-hidden="true" /> {prev.title}</Link> : <span />}
          {next && <Link to={`/learn/${next.id}`} className="btn-secondary">{next.title} <ArrowRight size={18} aria-hidden="true" /></Link>}
        </nav>
      </div>
    </>
  );
}
