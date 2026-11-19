import { useId, useState } from 'react';
import { aiCoach } from '../lib/content';
import { useDocumentTitle, usePersistentState } from '../lib/hooks';
import { usePathway } from '../lib/pathway';
import { ChoiceSet } from '../components/ChoiceSet';
import { CopyButton, Notice, PageHeader, SavedNote } from '../components/ui';
import type { ChoiceItem } from '../types';

const sortItems: ChoiceItem[] = aiCoach.sortItems.map((s) => ({
  id: s.id,
  prompt: s.text,
  options: [
    { text: 'Appropriate: AI as a coach', correct: s.appropriate, feedback: s.appropriate ? s.feedback : 'Look again: ' + s.feedback },
    { text: 'Not appropriate: AI as the author', correct: !s.appropriate, feedback: !s.appropriate ? s.feedback : 'Look again: ' + s.feedback },
  ],
}));

function GuidedCoach() {
  const [stageId, setStageId] = useState(aiCoach.stages[0].id);
  const stage = aiCoach.stages.find((s) => s.id === stageId)!;
  const [answers, setAnswers] = usePersistentState<Record<string, string>>(`coach:${stageId}`, {});
  const [i, setI] = useState(0);
  const ansId = useId();
  const q = stage.questions[i];
  const summary = stage.questions.map((qq, k) => `Q: ${qq}\nMy thinking: ${answers[k] || '(not answered yet)'}`).join('\n\n');
  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="mb-2 font-bold">Where are you in your speech?</legend>
        <div className="flex flex-wrap gap-2">
          {aiCoach.stages.map((s) => (
            <label key={s.id} className={`chip cursor-pointer font-normal ${stageId === s.id ? 'bg-ink text-white' : 'bg-white'}`}>
              <input type="radio" className="sr-only" name="coachstage" checked={stageId === s.id} onChange={() => { setStageId(s.id); setI(0); }} />{s.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="panel space-y-3">
        <p className="text-sm text-ink/70">Question {i + 1} of {stage.questions.length}</p>
        <label htmlFor={ansId} className="block font-display text-2xl">{q}</label>
        <textarea id={ansId} rows={4} value={answers[i] ?? ''} onChange={(e) => setAnswers({ ...answers, [i]: e.target.value })} />
        <div className="flex flex-wrap gap-2">
          {i > 0 && <button type="button" className="btn-quiet" onClick={() => setI(i - 1)}>Previous question</button>}
          {i < stage.questions.length - 1 && <button type="button" className="btn-primary" onClick={() => setI(i + 1)}>Next question</button>}
        </div>
        <SavedNote />
      </div>
      <div className="flex flex-wrap gap-2"><CopyButton text={summary} label="Copy my answers" /></div>
      <p className="text-sm text-ink/75">The Coach asks; you answer. It never writes for you, and your answers are not sent anywhere.</p>
    </div>
  );
}

export default function Coach() {
  useDocumentTitle('AI Coach');
  const { pathway } = usePathway();
  const level = pathway === 'college' ? 'college' : 'high school';
  return (
    <>
      <PageHeader tone="ink" title="Coach, not author" lede="AI should help you become a better thinker and speaker, not replace your thinking or your speaking." trail={[{ label: 'Home', to: '/' }, { label: 'AI Coach' }]} />
      <div className="wrap space-y-16 py-12">
        <section aria-labelledby="lit" className="grid gap-8 lg:grid-cols-2">
          <div>
            <h2 id="lit" className="text-3xl">Using AI well</h2>
            <p className="mt-3 max-w-prose">A speech is a promise that the person in front of the audience did the thinking. Your stories must be yours. Your sources must be real and read by you. Your conclusions must be your own.</p>
            <h3 className="mt-6 text-xl">Often appropriate (check your instructor's policy)</h3>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Brainstorming possible topics</li><li>Asking questions about an idea</li><li>Explaining a communication concept</li><li>Practicing answers to audience questions</li><li>Checking grammar and clarity</li><li>Reviewing an outline's organization</li><li>Finding where you need more evidence</li><li>Getting practice feedback</li>
            </ul>
            <h3 className="mt-6 text-xl">Not appropriate</h3>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Generating a speech and submitting it as your own</li><li>Fabricating research or sources</li><li>Replacing your analysis with AI conclusions</li><li>Inventing personal experiences</li><li>Claiming AI-generated work as independent work</li>
            </ul>
          </div>
          <div>
            <h2 className="mb-4 text-3xl">Coach or author? You decide.</h2>
            <ChoiceSet activityId="coach:sort" items={sortItems} />
          </div>
        </section>

        <section aria-labelledby="guided">
          <h2 id="guided" className="text-3xl">The Speech Coach</h2>
          <p className="mb-6 mt-2 max-w-prose">A guided set of questions for each stage of your speech. It works entirely on this page, with no AI service connected.</p>
          <GuidedCoach />
        </section>

        <section aria-labelledby="prompts">
          <h2 id="prompts" className="text-3xl">Coaching prompts to copy</h2>
          <p className="mt-2 max-w-prose">If your instructor allows an AI tool, these prompts ask it to coach instead of write. Replace the [brackets] with your own information. Never paste personal information you wouldn't want stored by a company.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {aiCoach.prompts.map((p) => {
              const text = p.text.replace('[high school / college]', level);
              return (
                <div key={p.id} className="panel flex flex-col">
                  <h3 className="text-xl">{p.title}</h3>
                  <p className="mt-2 flex-1 rounded-md bg-paper p-3 text-[0.95rem]">{text}</p>
                  <div className="mt-3"><CopyButton text={text} label="Copy prompt" /></div>
                </div>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="infra">
          <h2 id="infra" className="text-2xl">Why there's no live AI chat here</h2>
          <div className="mt-4">
            <Notice>
              A live AI coach would need a paid AI service, a secure server to hold the service key (keys must never live in a public website's code), a privacy review for students under 18, and district approval. This site is a static GitHub Pages site with none of those, so it does not pretend to connect to AI. The README explains what a future integration would require.
            </Notice>
          </div>
        </section>
      </div>
    </>
  );
}
