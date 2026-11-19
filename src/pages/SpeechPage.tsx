import { Link, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { assignmentsAreSample, getAssignment, getSpeech } from '../lib/content';
import { usePathway, PATHWAY_LABEL } from '../lib/pathway';
import { useDocumentTitle } from '../lib/hooks';
import { Disclosure, Notice, PageHeader, PathwayTag, Reflection, SENTENCE_FRAMES, TextbookRefs } from '../components/ui';
import { Checklist, RubricSelfAssess, SpeechToolView } from '../components/Tools';
import NotFound from './NotFound';

const SECTIONS = [
  ['overview', 'Overview'], ['requirements', 'Requirements'], ['path', 'Preparation path'], ['tools', 'Tools'],
  ['ideas', 'Topics and structures'], ['checklist', 'Checklist'], ['rubric', 'Self-assessment'], ['reflect', 'Reflect'],
] as const;

export default function SpeechPage() {
  const { id } = useParams();
  const s = getSpeech(id ?? '');
  const { pathway } = usePathway();
  useDocumentTitle(s?.title ?? 'Speech not found');
  if (!s) return <NotFound />;
  const a = getAssignment(s.id);
  const req = a?.[pathway];
  const other = pathway === 'hs' ? 'college' : 'hs';

  return (
    <>
      <PageHeader
        tone="ink"
        title={s.number ? `${s.number}. ${s.title}` : s.title}
        lede={<><span className="font-display text-xl font-semibold text-stage">{s.tagline}</span><span className="mt-2 block">{s.summary}</span></>}
        trail={[{ label: 'Speeches', to: '/speeches' }, { label: s.title }]}
      >
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to={`/studio?speech=${s.id}`} className="btn-stage">Plan this speech in the Studio <ArrowRight size={18} aria-hidden="true" /></Link>
        </div>
      </PageHeader>

      <nav aria-label="On this page" className="sticky top-[4.25rem] z-30 border-b border-mist bg-paper/95 backdrop-blur lg:top-[6.25rem]">
        <ul className="wrap flex gap-1 overflow-x-auto py-2 text-sm">
          {SECTIONS.map(([sid, label]) => (
            <li key={sid}><a href={`#${sid}`} onClick={(e) => { e.preventDefault(); document.getElementById(sid)?.scrollIntoView({ behavior: 'smooth' }); }} className="block whitespace-nowrap rounded px-2 py-1 font-bold no-underline hover:bg-mist">{label}</a></li>
          ))}
        </ul>
      </nav>

      <div className="wrap space-y-16 py-12">
        <section id="overview" aria-labelledby="h-overview" className="grid gap-8 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-6">
            <div>
              <h2 id="h-overview" className="text-3xl">Why this speech matters</h2>
              <p className="mt-3 max-w-prose text-lg">{s.whyItMatters}</p>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3"><h3 className="text-2xl">Learning objectives</h3><PathwayTag /></div>
              <ul className="mt-3 list-disc space-y-1 pl-6">{s.objectives[pathway].map((o) => <li key={o}>{o}</li>)}</ul>
              <div className="mt-3">
                <Disclosure summary={`Compare with ${PATHWAY_LABEL[other]} objectives`}>
                  <ul className="list-disc space-y-1 pl-6">{s.objectives[other].map((o) => <li key={o}>{o}</li>)}</ul>
                </Disclosure>
              </div>
            </div>
            <div>
              <h3 className="text-2xl">What you'll learn</h3>
              <ul className="mt-3 flex flex-wrap gap-2">{s.learn.map((l) => <li key={l} className="chip bg-white">{l}</li>)}</ul>
            </div>
          </div>
          <TextbookRefs refs={s.textbook} />
        </section>

        <section id="requirements" aria-labelledby="h-req">
          <h2 id="h-req" className="text-3xl">Requirements</h2>
          {req ? (
            <dl className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="panel"><dt className="text-sm text-ink/75">Time</dt><dd className="font-display text-2xl font-bold">{req.time}</dd></div>
              <div className="panel"><dt className="text-sm text-ink/75">Sources</dt><dd className="font-bold">{req.sources}</dd></div>
              <div className="panel"><dt className="text-sm text-ink/75">Notes</dt><dd>{req.notes || 'None listed'}</dd></div>
            </dl>
          ) : <p className="mt-3">Your instructor has not set requirements for this speech.</p>}
          {assignmentsAreSample && <div className="mt-4"><Notice>These are sample settings, not official course requirements. Follow the requirements your instructor gives you.</Notice></div>}
        </section>

        <section id="path" aria-labelledby="h-path">
          <h2 id="h-path" className="text-3xl">Step-by-step preparation path</h2>
          <ol className="mt-6 space-y-4">
            {s.steps.map((st, i) => (
              <li key={st.title} className="grid grid-cols-[3rem_1fr] gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-ink font-display font-bold" aria-hidden="true">{i + 1}</span>
                <div><h3 className="text-xl">{st.title}</h3><p className="text-ink/85">{st.detail}</p></div>
              </li>
            ))}
          </ol>
        </section>

        <section id="tools" aria-labelledby="h-tools">
          <h2 id="h-tools" className="text-3xl">Interactive preparation tools</h2>
          <p className="mt-2 max-w-prose text-ink/80">Everything you type saves in this browser. Copy or download your work at any time.</p>
          <div className="mt-6 space-y-3">
            {s.tools.map((t, i) => (
              <Disclosure key={t.id} summary={t.title} defaultOpen={i === 0}>
                <SpeechToolView scope={s.id} tool={t} />
              </Disclosure>
            ))}
          </div>
        </section>

        <section id="ideas" aria-labelledby="h-ideas" className="grid gap-8 lg:grid-cols-2">
          <div>
            <h2 id="h-ideas" className="text-3xl">Sample topic ideas</h2>
            <ul className="mt-4 space-y-2">{s.topicIdeas.map((t) => <li key={t} className="rounded-md bg-white p-3">{t}</li>)}</ul>
            <p className="mt-3 text-sm text-ink/75">Use these to spark your own idea. Your best topic connects to your experience.</p>
          </div>
          <div>
            <h2 className="text-3xl">Example structures</h2>
            <div className="mt-4 space-y-4">
              {s.structures.map((st) => (
                <div key={st.name} className="panel">
                  <h3 className="text-xl">{st.name}</h3>
                  <ul className="mt-2 space-y-1 border-l-2 border-mist pl-4">{st.outline.map((o) => <li key={o}>{o}</li>)}</ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="checklist" aria-labelledby="h-check">
          <h2 id="h-check" className="mb-4 text-3xl">Student checklist</h2>
          <Checklist storageKey={`checklist:${s.id}`} items={s.checklist} title={`${s.title} checklist`} />
        </section>

        <section id="rubric" aria-labelledby="h-rubric">
          <h2 id="h-rubric" className="text-3xl">Rubric self-assessment</h2>
          <p className="mb-4 mt-2 max-w-prose text-ink/80">Rate yourself before and after rehearsal, then after you speak. My Growth compares your ratings over time.</p>
          <RubricSelfAssess speechId={s.id} />
        </section>

        <section id="reflect" aria-labelledby="h-reflect" className="space-y-6">
          <h2 id="h-reflect" className="text-3xl">Reflect after you speak</h2>
          {s.reflection.map((q, i) => (
            <Reflection key={q} storageKey={`reflect:speech:${s.id}:${i}`} prompt={q} frames={pathway === 'hs' ? SENTENCE_FRAMES.reflect : undefined} />
          ))}
          <div className="rounded-lg border-l-4 border-college bg-college-soft p-4">
            <p className="font-bold">College-level extension</p>
            <p className="mt-1">{s.collegeExtension}</p>
          </div>
        </section>
      </div>
    </>
  );
}
