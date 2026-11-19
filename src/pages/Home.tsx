import { Link, useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { assignments, getSpeech, greatSpeeches, labs, site, speeches } from '../lib/content';
import { usePathway } from '../lib/pathway';
import { useDocumentTitle } from '../lib/hooks';
import type { Pathway } from '../types';

function VoiceHeadline() {
  const text = 'FIND YOUR VOICE.';
  return (
    <h1 aria-label="Find your voice." className="font-display text-[clamp(3.25rem,14vw,9.5rem)] leading-[0.88] tracking-tight text-white">
      {text.split(' ').map((word, wi) => (
        <span key={wi} className="mr-[0.22em] inline-block whitespace-nowrap" aria-hidden="true">
          {word.split('').map((ch, i) => (
            <span key={i} className="voice-letter" style={{ animationDelay: `${(wi * 5 + i) * 55}ms` }}>{ch}</span>
          ))}
        </span>
      ))}
    </h1>
  );
}

function Spotlight() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F2B33D" stopOpacity="0.38" />
          <stop offset="1" stopColor="#F2B33D" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points="930,-20 1010,-20 1240,700 640,700" fill="url(#beam)" />
      <ellipse cx="940" cy="690" rx="320" ry="26" fill="#F2B33D" opacity="0.18" />
      <path d="M0 640 H120 l20 -30 22 60 26 -95 28 130 24 -80 22 40 20 -20 H1200" fill="none" stroke="#F2B33D" strokeOpacity="0.55" strokeWidth="2.5" />
    </svg>
  );
}

const CYCLE = [
  { name: 'Explore', text: 'Learn the concepts with examples from school, work, and community life.', to: '/learn', cta: 'Open Learn' },
  { name: 'Create', text: 'Build your speech step by step in the Studio, from topic to outline.', to: '/studio', cta: 'Open the Studio' },
  { name: 'Practice', text: 'Test your skills in hands-on labs and rehearse with the timer.', to: '/labs', cta: 'Open the Labs' },
  { name: 'Reflect', text: 'Assess yourself, set goals, and compare your growth over time.', to: '/my-growth', cta: 'Open My Growth' },
];

const WHY = [
  { where: 'In school', text: 'Presentations, discussions, and defending your ideas in front of classmates and teachers.' },
  { where: 'At work', text: 'Interviews, pitches, trainings, and team meetings reward people who explain clearly.' },
  { where: 'In your community', text: 'Public comment, advocacy, and leadership depend on people willing to speak up well.' },
  { where: 'Every day', text: 'Toasts, introductions, and hard conversations are public speaking on a small stage.' },
];

export default function Home() {
  useDocumentTitle('');
  const { pathway, chosen, setPathway } = usePathway();
  const navigate = useNavigate();
  const major = speeches.filter((s) => s.category === 'major');
  const active = assignments.filter((a) => a.status === 'current' || a.status === 'upcoming');
  const choose = (p: Pathway) => {
    setPathway(p);
    navigate('/speeches/narrative');
  };

  return (
    <>
      <section className="relative overflow-hidden bg-ink">
        <Spotlight />
        <div className="wrap relative py-20 sm:py-28">
          <VoiceHeadline />
          <p className="mt-6 font-display text-2xl font-semibold text-stage sm:text-3xl" style={{ fontVariationSettings: "'wdth' 90" }}>
            Shape your message. Make an impact.
          </p>
          <p className="mt-6 max-w-[36rem] text-lg text-white/90">
            Public speaking isn't a talent you either have or don't. It's a skill you build through preparation, practice, critical thinking, and real
            conversation with an audience. You already have something worth saying. This is where you learn to say it well.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#begin" className="btn-stage text-lg" onClick={(e) => { e.preventDefault(); document.getElementById('begin')?.scrollIntoView({ behavior: 'smooth' }); document.getElementById('begin-heading')?.focus(); }}>
              Start your speaking journey <ArrowDown size={20} aria-hidden="true" />
            </a>
            <Link to="/speeches" className="btn border-2 border-white text-white hover:bg-white hover:text-ink">See the major speeches</Link>
          </div>
        </div>
      </section>

      <section id="begin" aria-labelledby="begin-heading" className="wrap py-16">
        <h2 id="begin-heading" tabIndex={-1} className="text-3xl sm:text-4xl">Choose your pathway</h2>
        <p className="mt-3 max-w-prose text-ink/85">
          Both pathways teach the same core principles with the same rigor. The college pathway adds deeper expectations for research, citation, and rhetorical analysis. You can switch at any time from the top of the page.
        </p>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {([
            { id: 'hs' as Pathway, title: 'High School Speech', color: 'border-hs', btn: 'bg-hs hover:bg-[#12544B]', text: 'Clear explanations, guided practice, vocabulary support, sentence starters, and scaffolded assignments.' },
            { id: 'college' as Pathway, title: 'College Public Speaking', color: 'border-college', btn: 'bg-college hover:bg-[#583486]', text: 'Academic research and citation, formal outlines, rhetorical analysis, and written rationales for concurrent-enrollment and college students.' },
          ]).map((p) => (
            <div key={p.id} className={`rounded-xl border-t-8 ${p.color} bg-white p-6 sm:p-8`}>
              <h3 className="text-2xl">{p.title}</h3>
              <p className="mt-3">{p.text}</p>
              {chosen && pathway === p.id && <p className="mt-3 text-sm font-bold">This is your current pathway.</p>}
              <button type="button" className={`btn mt-6 text-white ${p.btn}`} onClick={() => choose(p.id)}>
                Begin with {p.id === 'hs' ? 'High School' : 'College'} <ArrowRight size={18} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="cycle-heading" className="border-y border-mist bg-white">
        <div className="wrap py-16">
          <h2 id="cycle-heading" className="text-3xl sm:text-4xl">How you'll learn</h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-4">
            {CYCLE.map((c, i) => (
              <li key={c.name} className="relative">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink font-display text-lg font-bold text-stage" aria-hidden="true">{i + 1}</span>
                  {i < CYCLE.length - 1 && <span className="hidden h-0.5 flex-1 bg-mist md:block" aria-hidden="true" />}
                </div>
                <h3 className="mt-4 text-2xl">{c.name}</h3>
                <p className="mt-2 text-ink/85">{c.text}</p>
                <Link to={c.to} className="mt-3 inline-block font-bold">{c.cta}</Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="now-heading" className="wrap grid gap-10 py-16 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h2 id="now-heading" className="text-3xl">Current assignments</h2>
          <ul className="mt-6 divide-y divide-mist border-y border-mist">
            {active.map((a) => {
              const s = getSpeech(a.speechId);
              if (!s) return null;
              const req = a[pathway];
              return (
                <li key={a.speechId} className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div>
                    <p className="text-sm font-bold text-ink/70">{a.status === 'current' ? 'Now' : 'Coming up'}{a.dueDate ? `, due ${a.dueDate}` : ''}</p>
                    <Link to={`/speeches/${s.id}`} className="font-display text-xl font-bold no-underline hover:underline">{s.title}</Link>
                    <p className="text-sm text-ink/80">{req.time}. {req.sources}.</p>
                  </div>
                  <Link to={`/studio?speech=${s.id}`} className="btn-secondary">Plan it in the Studio</Link>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-sm text-ink/70">Requirements shown are sample settings until your instructor edits them.</p>
        </div>
        <div>
          <h2 className="text-3xl">Announcements</h2>
          <div className="mt-6 space-y-4">
            {site.announcements.map((n) => (
              <article key={n.id} className="rounded-lg border-l-4 border-stage bg-white p-4">
                <p className="text-sm text-ink/70"><time dateTime={n.date}>{new Date(n.date + 'T12:00:00').toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</time></p>
                <h3 className="text-lg">{n.title}</h3>
                <p className="mt-1">{n.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="program-heading" className="bg-ink text-white">
        <div className="wrap py-16">
          <h2 id="program-heading" className="text-3xl text-white sm:text-4xl">The major speeches</h2>
          <p className="mt-3 max-w-prose text-white/85">Four speeches across the course, each with its own preparation tools, examples, checklist, and self-assessment.</p>
          <ol className="mt-10 border-t border-white/20">
            {major.map((s) => (
              <li key={s.id} className="border-b border-white/20">
                <Link to={`/speeches/${s.id}`} className="group grid items-center gap-2 py-6 text-white no-underline sm:grid-cols-[6rem_1fr_auto] sm:gap-6">
                  <span className="font-display text-7xl font-bold leading-none text-stage" aria-hidden="true">{s.number}</span>
                  <span>
                    <span className="block font-display text-2xl font-bold group-hover:underline sm:text-3xl">{s.title}</span>
                    <span className="block text-white/80">{s.tagline}</span>
                  </span>
                  <ArrowRight className="hidden text-stage transition-transform group-hover:translate-x-1 sm:block" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ol>
          <Link to="/speeches" className="mt-6 inline-block font-bold text-stage">See optional speeches and templates</Link>
        </div>
      </section>

      <section aria-labelledby="why-heading" className="wrap py-16">
        <h2 id="why-heading" className="text-3xl sm:text-4xl">Why speaking matters</h2>
        <div className="mt-8 grid gap-x-10 gap-y-6 sm:grid-cols-2">
          {WHY.map((w) => (
            <div key={w.where} className="border-l-4 border-ink pl-4">
              <h3 className="text-xl">{w.where}</h3>
              <p className="mt-1 text-ink/85">{w.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-10 max-w-prose font-display text-2xl font-semibold leading-snug" style={{ fontVariationSettings: "'wdth' 92" }}>
          In a world full of machine-generated text, a real person who has done the thinking, checked the facts, and stands in front of others to speak is worth listening to.
        </p>
      </section>

      <section aria-labelledby="featured-heading" className="border-t border-mist bg-white">
        <div className="wrap grid gap-10 py-16 lg:grid-cols-2">
          <div>
            <h2 id="featured-heading" className="text-3xl">Featured labs</h2>
            <ul className="mt-6 space-y-3">
              {labs.filter((l) => site.featuredLabs.includes(l.id)).map((l) => (
                <li key={l.id}>
                  <Link to={`/labs/${l.id}`} className="block rounded-lg border border-mist p-4 no-underline hover:border-ink">
                    <span className="font-display text-xl font-bold">{l.title}</span>
                    <span className="block text-ink/80">{l.short}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-3xl">From the Great Speeches gallery</h2>
            <ul className="mt-6 space-y-3">
              {greatSpeeches.filter((g) => site.featuredGreatSpeeches.includes(g.id)).map((g) => (
                <li key={g.id}>
                  <Link to={`/great-speeches/${g.id}`} className="block rounded-lg bg-paper p-4 no-underline hover:bg-mist">
                    <span className="text-sm text-ink/75">{g.speaker}, {g.date}</span>
                    <span className="block font-display text-xl font-bold">{g.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section aria-labelledby="ai-heading" className="wrap py-16">
        <div className="grid items-center gap-6 rounded-xl bg-stage-soft p-8 md:grid-cols-[1fr_auto]">
          <div>
            <h2 id="ai-heading" className="text-3xl">AI is a coach, not an author</h2>
            <p className="mt-2 max-w-prose">AI tools can help you brainstorm, understand concepts, and practice answering questions. Your ideas, your research, your stories, and your voice stay yours.</p>
          </div>
          <Link to="/ai-coach" className="btn-primary">Meet the Speech Coach</Link>
        </div>
      </section>
    </>
  );
}
