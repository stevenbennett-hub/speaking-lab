import { useState } from 'react';
import { Printer } from 'lucide-react';
import { assignments, assignmentsAreSample, getSpeech, labs, modules, rubrics, site, speeches, greatSpeeches, resources } from '../lib/content';
import { useDocumentTitle } from '../lib/hooks';
import { Notice, PageHeader } from '../components/ui';

const FILES = [
  ['Announcements, featured labs and speeches', 'src/content/instructor/site.json'],
  ['Speech assignments: status, due dates, times, source minimums', 'src/content/instructor/assignments.json'],
  ['Rubrics (your criteria, kept separate from textbook content)', 'src/content/instructor/rubrics.json'],
  ['Speech pages: objectives, steps, tools, topic ideas, checklists', 'src/content/speeches.json'],
  ['Learn modules and textbook references', 'src/content/modules.json'],
  ['Textbook chapter map', 'src/content/textbook.json'],
  ['Resource links', 'src/content/resources.json'],
  ['Great Speeches exhibits', 'src/content/greatSpeeches.json'],
  ['Lab questions and feedback', 'src/content/labs/*.json'],
  ['Glossary and translations', 'src/content/glossary.json'],
  ['AI Coach questions and prompts', 'src/content/aiCoach.json'],
];

export default function Instructor() {
  useDocumentTitle('Instructor Toolkit');
  const [rubricId, setRubricId] = useState(rubrics.rubrics[0].speechId);
  const rubric = rubrics.rubrics.find((r) => r.speechId === rubricId)!;
  const total = rubric.criteria.reduce((a, c) => a + c.weight, 0);
  return (
    <>
      <PageHeader title="Instructor toolkit" lede="Everything on this site is driven by plain JSON files you can edit on GitHub. No database, accounts, or paid services." trail={[{ label: 'Home', to: '/' }, { label: 'Instructor' }]} />
      <div className="wrap space-y-14 py-10">
        <Notice>This site does not collect, submit, or grade student work. Students keep their work in their own browsers and submit it however you direct (for example, by downloading their outline and turning it in through your LMS).</Notice>

        <section aria-labelledby="edit">
          <h2 id="edit" className="text-3xl">How to edit content</h2>
          <ol className="mt-4 max-w-prose list-decimal space-y-2 pl-6">
            <li>Open your repository on GitHub and go to the file listed below.</li>
            <li>Select the pencil icon, make your change, and keep the JSON punctuation (quotes, commas, brackets) intact.</li>
            <li>Commit the change. The GitHub Action tests the content and redeploys the site in a few minutes.</li>
            <li>If the Action fails, its log names the file and problem. The full guide is in <code>INSTRUCTOR_GUIDE.md</code>.</li>
          </ol>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left">
              <thead><tr className="border-b-2 border-ink"><th scope="col" className="py-2 pr-4">To change</th><th scope="col" className="py-2">Edit this file</th></tr></thead>
              <tbody>{FILES.map(([a, b]) => <tr key={b} className="border-b border-mist"><td className="py-2 pr-4">{a}</td><td className="py-2"><code className="rounded bg-mist px-1">{b}</code></td></tr>)}</tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="asg">
          <h2 id="asg" className="text-3xl">Current assignment settings</h2>
          {assignmentsAreSample && <p className="mt-2 rounded-md bg-stage-soft p-3">These are sample settings. Students see a notice that they are not official until you set <code>"isSample": false</code> in assignments.json.</p>}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead><tr className="border-b-2 border-ink"><th scope="col" className="py-2 pr-3">Speech</th><th scope="col" className="pr-3">Status</th><th scope="col" className="pr-3">Due</th><th scope="col" className="pr-3">High school</th><th scope="col">College</th></tr></thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.speechId} className="border-b border-mist align-top">
                    <th scope="row" className="py-2 pr-3">{getSpeech(a.speechId)?.title ?? a.speechId}</th>
                    <td className="pr-3">{a.status}</td>
                    <td className="pr-3">{a.dueDate || '—'}</td>
                    <td className="pr-3">{a.hs.time}; {a.hs.sources}</td>
                    <td>{a.college.time}; {a.college.sources}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="rub">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="rub" className="text-3xl">Rubrics</h2>
              <label htmlFor="rubric-pick" className="mt-2 block">Speech</label>
              <select id="rubric-pick" className="w-auto" value={rubricId} onChange={(e) => setRubricId(e.target.value)}>
                {rubrics.rubrics.map((r) => <option key={r.speechId} value={r.speechId}>{getSpeech(r.speechId)?.title}</option>)}
              </select>
            </div>
            <button type="button" className="btn-secondary no-print" onClick={() => window.print()}><Printer size={18} aria-hidden="true" /> Print this rubric</button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-left">
              <caption className="mb-2 text-left font-bold">{getSpeech(rubricId)?.title} rubric {rubrics.isSample ? '(sample)' : ''}</caption>
              <thead><tr className="border-b-2 border-ink"><th scope="col" className="py-2 pr-3">Criterion</th><th scope="col" className="pr-3">Weight</th>{rubrics.levels.map((l) => <th key={l} scope="col" className="px-2">{l}</th>)}</tr></thead>
              <tbody>{rubric.criteria.map((c) => <tr key={c.name} className="border-b border-mist align-top"><th scope="row" className="py-2 pr-3 font-normal"><strong>{c.name}</strong><span className="block text-sm">{c.description}</span></th><td className="pr-3">{c.weight}%</td>{rubrics.levels.map((l) => <td key={l} className="px-2 py-2"><span className="block h-8 border border-mist" aria-hidden="true" /></td>)}</tr>)}</tbody>
            </table>
          </div>
          <p className={`mt-2 text-sm ${total === 100 ? 'text-ink/75' : 'font-bold text-brick'}`}>Weights total {total}%{total === 100 ? '.' : '. They should total 100%.'}</p>
        </section>

        <section aria-labelledby="ann">
          <h2 id="ann" className="text-3xl">Announcements preview</h2>
          <ul className="mt-4 space-y-3">{site.announcements.map((n) => <li key={n.id} className="panel"><p className="text-sm text-ink/70">{n.date}</p><p className="font-bold">{n.title}</p><p>{n.body}</p></li>)}</ul>
        </section>

        <section aria-labelledby="inv">
          <h2 id="inv" className="text-3xl">Content inventory</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-3">
            <li className="panel">{modules.length} Learn modules</li>
            <li className="panel">{speeches.length} speech types</li>
            <li className="panel">{labs.length} labs</li>
            <li className="panel">{greatSpeeches.length} Great Speeches exhibits</li>
            <li className="panel">{resources.items.length} resources</li>
            <li className="panel">{rubrics.rubrics.length} rubrics</li>
          </ul>
        </section>
      </div>
    </>
  );
}
