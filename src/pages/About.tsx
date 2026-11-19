import { textbook, site } from '../lib/content';
import { useDocumentTitle } from '../lib/hooks';
import { PageHeader } from '../components/ui';

export default function About() {
  useDocumentTitle('About, attribution, and privacy');
  return (
    <>
      <PageHeader title="About, attribution, and privacy" trail={[{ label: 'Home', to: '/' }, { label: 'About' }]} />
      <div className="wrap prose-body max-w-prose space-y-10 py-10">
        <section aria-labelledby="about">
          <h2 id="about" className="mb-3 text-3xl">About The Speaking Lab</h2>
          <p>The Speaking Lab is an interactive learning environment for High School Speech and College Public Speaking{site.schoolName ? ` at ${site.schoolName}` : ''}. It was developed with assistance from Claude (Anthropic){site.instructorName ? ` and reviewed by ${site.instructorName}` : ' and is reviewed by the course instructor'}.</p>
        </section>

        <section aria-labelledby="attr">
          <h2 id="attr" className="mb-3 text-3xl">Attribution and license</h2>
          <p>
            Educational content on this site is adapted from <a href={textbook.homeUrl} target="_blank" rel="noreferrer"><cite>{textbook.title}</cite></a>, {textbook.version}, primary author and editor Dr. Barbara G. Tucker, with contributors {textbook.contributors}. Published by Dalton State College through Affordable Learning Georgia. Licensed under <a href={textbook.licenseUrl} target="_blank" rel="noreferrer">Creative Commons Attribution-NonCommercial-ShareAlike 4.0 (CC BY-NC-SA 4.0)</a>.
          </p>
          <p>
            <strong>Changes made:</strong> Concepts were summarized and paraphrased, reorganized into modules and labs, and paired with original examples, activities, and feedback. Textbook passages are not reproduced at length. Section numbers refer to Version 4.1.
          </p>
          <p>
            <strong>This site's license:</strong> Because it adapts a ShareAlike work, this site's educational content (text, activities, and feedback) is shared under the same CC BY-NC-SA 4.0 license. The source code is licensed separately under the MIT License (see the repository).
          </p>
          <p><strong>Not covered:</strong> {textbook.rightsNote}</p>
          <p>{textbook.versionNote}</p>
          <p>
            <strong>Other materials:</strong> Linked resources, speeches, recordings, and archives belong to their owners and are not covered by this site's license. Speeches under copyright (for example, Dr. King's "I Have a Dream" and Malala Yousafzai's Nobel Lecture) are linked, not reproduced. Rights for each exhibit and resource are listed with it. Purdue OWL materials are linked only, as their terms require.
          </p>
          <p>This site is not affiliated with or endorsed by Dalton State College, the textbook's authors, or any linked archive.</p>
        </section>

        <section aria-labelledby="privacy">
          <h2 id="privacy" className="mb-3 scroll-mt-28 text-3xl">Privacy</h2>
          <p>The Speaking Lab is designed for students, including students under 18.</p>
          <ul className="mb-4 list-disc space-y-1 pl-6">
            <li>No accounts, no sign-in, no tracking, no analytics, and no advertising.</li>
            <li>Your work is saved only in your own browser's local storage on the device you are using. It is never sent to a server, your teacher, or anyone else.</li>
            <li>Saved work can disappear if browser data is cleared, if you use a private window, or if you switch devices. Download backups from My Growth or the Studio.</li>
            <li>You can delete everything at any time from My Growth.</li>
            <li>Fonts are bundled with the site, so no font service sees your visits. Links to outside sites follow those sites' privacy policies.</li>
            <li>No AI service is connected. Copyable AI prompts go only where you choose to paste them; follow your school's policy.</li>
          </ul>
        </section>

        <section aria-labelledby="a11y">
          <h2 id="a11y" className="mb-3 text-3xl">Accessibility</h2>
          <p>The site targets WCAG 2.2 Level AA. It uses semantic headings and landmarks, a skip link, visible keyboard focus, labeled form controls, keyboard alternatives to drag-and-drop, live-region feedback for screen readers, reduced-motion support, and the Atkinson Hyperlegible typeface, designed for readers with low vision. If something doesn't work for you, tell your instructor so it can be fixed.</p>
        </section>
      </div>
    </>
  );
}
