# The Speaking Lab

**Find your voice. Shape your message. Make an impact.**

An interactive learning site for High School Speech and College Public Speaking, built on the open textbook *Exploring Public Speaking* (Version 4.1, 2020), edited by Dr. Barbara G. Tucker.

The site runs entirely in the browser. It has no accounts, no database, no tracking, and no paid services. Student work saves only in each student's own browser.

---

## Contents

1. [Quick start](#quick-start)
2. [Deploy to GitHub Pages](#deploy-to-github-pages)
3. [Editing content](#editing-content)
4. [Testing](#testing)
5. [What works in this version](#what-works-in-this-version)
6. [What is not built yet](#what-is-not-built-yet)
7. [Privacy](#privacy)
8. [Accessibility](#accessibility)
9. [Adding live AI later](#adding-live-ai-later)
10. [Project structure](#project-structure)
11. [Design system](#design-system)
12. [Licenses and attribution](#licenses-and-attribution)

---

## Quick start

You need [Node.js](https://nodejs.org/) version 20 or newer.

```bash
npm install        # install dependencies (once)
npm run dev        # start a local preview at http://localhost:5173
```

Other commands:

| Command | What it does |
|---|---|
| `npm test` | Runs all automated tests (content checks, feedback rules, every page, accessibility scan) |
| `npm run build` | Type-checks and builds the production site into `dist/` |
| `npm run preview` | Serves the built `dist/` folder locally so you can check it before deploying |
| `npm run check:content` | Runs only the content tests (fast; use after editing JSON) |

> Opening `dist/index.html` directly from your file system will not work. Browsers block the site's scripts on `file://` pages. Use `npm run preview` or deploy it.

---

## Deploy to GitHub Pages

The repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that tests, builds, and publishes the site every time you push to `main`.

1. Create a new repository on GitHub (for example, `speaking-lab`) and push this project to its `main` branch.
2. In the repository, go to **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **GitHub Actions**.
4. Push any change (or open the **Actions** tab and run **Deploy to GitHub Pages** manually).
5. When the workflow finishes, the site is live at `https://<your-username>.github.io/<repository-name>/`.

You do not need to edit any paths. The build uses relative asset paths (`base: './'` in `vite.config.ts`), and the site uses hash-based routes (`/#/learn`, `/#/studio`). That means it works at any repository name and every link and refresh works on GitHub Pages with no server setup.

If the workflow fails, open the **Actions** tab and select the failed run. The log names the test or file that failed. A content error usually means a missing comma or quotation mark in a JSON file.

---

## Editing content

All content lives in plain JSON files in `src/content/`. You can edit them directly on GitHub (open the file, select the pencil icon, edit, and commit). Each commit redeploys the site automatically.

**See `INSTRUCTOR_GUIDE.md` for step-by-step instructions and examples for every file.**

| To change | Edit |
|---|---|
| Announcements and featured items on the home page | `src/content/instructor/site.json` |
| Assignment status, due dates, time limits, source minimums | `src/content/instructor/assignments.json` |
| Rubrics | `src/content/instructor/rubrics.json` |
| Speech pages (objectives, steps, tools, topic ideas, checklists) | `src/content/speeches.json` |
| Learn modules | `src/content/modules.json` |
| Lab questions and feedback | `src/content/labs/*.json` |
| Great Speeches exhibits | `src/content/greatSpeeches.json` |
| Resource library | `src/content/resources.json` |
| Glossary and translations | `src/content/glossary.json` |
| AI Coach questions and prompts | `src/content/aiCoach.json` |
| Textbook chapter map | `src/content/textbook.json` |

Your own course materials (`instructor/`) are kept separate from content derived from the textbook. **The assignment settings and rubrics ship as samples** (`"isSample": true`), and students see a notice saying so. Set `"isSample": false` once you have entered your official requirements.

`CONTENT_MAP.md` shows how every textbook chapter connects to modules, labs, speech pages, and exhibits.

---

## Testing

`npm test` runs 62 automated tests:

- **Content integrity** (`src/tests/content.test.ts`): every textbook reference points to a real chapter and section; every activity has exactly one best answer and feedback for every option; every speech has assignment settings and a rubric whose weights total 100; every link uses `https://` or is an internal page; every glossary term a module uses exists.
- **Feedback rules** (`src/tests/feedback.test.ts`): the Studio's checks for specific purposes, central ideas, main points, sources, and attention-getters, based on Chapters 4–8.
- **Every page** (`src/tests/routes.test.tsx`): all 40 routes render with exactly one main heading and pass an automated [axe-core](https://github.com/dequelabs/axe-core) accessibility scan.
- **Key interactions**: answering an activity records completion; switching pathways changes content; the Studio gives live feedback and saves; the Organization Lab checks answers.

The GitHub workflow runs these tests before every deployment, so a broken content edit will not reach students.

### Manual testing checklist

Automated tests can't replace a person. Before the first class, try:

- [ ] Open the site on a school-issued device (Chromebook, iPad) and on a phone.
- [ ] Switch between High School and College on a speech page and confirm the objectives change.
- [ ] In the Studio, type a specific purpose that is a question. You should see feedback immediately.
- [ ] Refresh the page. Your Studio work should still be there.
- [ ] Download a backup from My Growth, delete all work, then restore from the backup.
- [ ] Navigate a lab using only the keyboard (Tab, Space, Enter, arrow keys).
- [ ] Try a lab with a screen reader (VoiceOver on iPad/Mac, ChromeVox on Chromebook, NVDA on Windows).
- [ ] Start the speech timer and confirm the color signals change near the target time.
- [ ] Click a few links in Resources and Great Speeches to confirm they still work (outside sites change over time).

---

## What works in this version

Everything listed here is fully functional, not placeholder.

- **Home page:** the animated headline (respects reduced motion), pathway selection, the learning cycle, current assignments, announcements, the major speeches, featured labs and speeches, and the AI principle.
- **Pathways:** a High School / College switch on every page that persists between visits. It changes objectives, extensions, sentence starters, timer targets, and source minimums.
- **Learn:** 24 modules in four categories. Each has an explanation, a real-world example, a textbook reference, a decision activity with explanatory feedback, a reflection, and a college extension. Several also include vocabulary with Spanish terms.
- **Speech Showcase:** four major speeches and five optional templates. Each page has objectives (both pathways), requirements, a preparation path, interactive tools, topic ideas, example structures, a checklist, a rubric self-assessment with history, reflections, and a college extension.
  - Tools: story arc builder, sensory detail workshop, informative topic explorer, pattern selector, evidence organizer, introduction and conclusion builder, claim and evidence builder, appeals plan, rebuttal workshop, Monroe's Motivated Sequence organizer (with checks), call-to-action builder, occasion and tone workshop, and tribute organizer.
- **Speech Studio:** seven steps (Discover, Focus, Research, Organize, Develop, Rehearse, Reflect) with live, rule-based feedback, source credibility checks, a live outline, an embedded timer, and goal saving. Students can copy the outline, download it as text, back up and restore as JSON, and clear their work.
- **Labs (all nine):** Rhetoric, Audience, Opening Line (with an introduction builder), Organization (keyboard-operable reordering), Evidence, Fallacy Detective, Delivery (timer, breathing pacer, pause and emphasis marker, self-assessment), Visual Aid (rendered before-and-after slides), and the Speech Anxiety Toolkit.
- **Great Speeches:** seven exhibits (Lincoln, Sojourner Truth, FDR, Kennedy, King, Barbara Jordan, Malala Yousafzai). Each has context, strategies, delivery notes, a "look closer" critical question, identification activities, guided analysis, a connection to the student's speech, verified archive links, and a rights statement.
- **AI Coach:** an AI-literacy sorting activity, a guided question coach for six stages, and copyable "coach, not author" prompts.
- **Resources:** a searchable, filterable library labeled by access type (openly licensed, free to read, public archive, in this site), plus a glossary with Spanish equivalents.
- **My Growth:** completion meters, goals, delivery self-assessment comparison (first and latest), rubric history, practice log, and full export, restore, and delete.
- **Instructor Toolkit:** a guide to which file to edit, the current assignment table, printable rubrics with a weight check, an announcements preview, and a content inventory.
- **About:** full attribution, license, privacy, and accessibility statements.

## What is not built yet

These are honest gaps, suitable for future versions. None require changing the architecture.

- **Full Spanish (or other language) interface.** Version 1 provides Spanish term equivalents in the glossary, plain-language definitions, sentence starters, and real text that browser translation handles well. A full interface toggle would require translating all JSON content (the files are structured so a parallel `es` version could be added).
- **Photography.** Visuals are original SVG illustrations. The textbook's photographs are copyrighted and excluded. To add photos, use public-domain or Creative Commons images (for example, from the Library of Congress or Wikimedia Commons) and credit them.
- **Embedded video.** Great Speeches link to archive pages rather than embedding players, which avoids rights and tracking problems. Caption availability depends on each archive.
- **Live AI.** See [Adding live AI later](#adding-live-ai-later).
- **Teacher dashboard or submissions.** Deliberately excluded: there is no student data collection. Students download their work and submit it through your usual system.
- **Real-device testing.** Verified in Chromium (desktop and phone widths) and an automated test browser. Safari, iPadOS, and screen-reader testing should be done on your devices (see the checklist above).

---

## Privacy

Designed for students under 18.

- No accounts, sign-in, analytics, cookies, advertising, or third-party scripts.
- Fonts are bundled with the site, so no font service sees visits.
- Student work is stored in the browser's `localStorage` under keys that begin with `speakinglab:`. It never leaves the device unless the student downloads it.
- Work can be lost if browser data is cleared, a private window is used, or the student switches devices. The site tells students this in the Studio, My Growth, and About, and offers backups.
- Students can delete everything from My Growth.

---

## Accessibility

Target: WCAG 2.2 Level AA.

- Semantic landmarks and headings, a skip link, visible focus outlines, and focus moved to the main content on page change.
- All form controls are labeled; feedback is announced through live regions.
- Every interaction works by keyboard, including the Organization Lab (move buttons instead of drag-and-drop).
- Color contrast was checked numerically for every text and background pair (all at least 4.5:1).
- Respects the reduced-motion setting.
- Body text uses Atkinson Hyperlegible, a typeface designed for readers with low vision.
- An automated axe-core scan runs on every page in the test suite. Automated checks catch only some issues, so test with real assistive technology too.

---

## Adding live AI later

The site does not connect to any AI service, and it should never call one directly from the browser. Any API key in client-side code is public to everyone who visits.

A future live Speech Coach would need:

1. **A server-side proxy** (for example, a Cloudflare Worker, Netlify Function, or school-hosted endpoint) that holds the API key and forwards requests. GitHub Pages cannot do this on its own.
2. **A system prompt that enforces "coach, not author"**: ask questions, give feedback, never write speeches. The prompts in `src/content/aiCoach.json` are a starting point.
3. **Privacy review.** Student text would leave the device. Review COPPA, FERPA, your state's student-privacy laws, the AI provider's data terms, and your district's approval process.
4. **Cost controls and abuse limits** (rate limiting, maximum message length).
5. **Clear disclosure to students and families** before launch.

Until then, the guided Speech Coach and copyable prompts give students a coaching experience without any data leaving their device.

---

## Project structure

```
.github/workflows/deploy.yml   Test, build, and deploy to GitHub Pages
public/                        Favicon and .nojekyll
src/
  App.tsx                      Routes (lazy-loaded per page)
  index.css                    Global styles and design tokens
  types.ts                     Content types
  content/                     ALL editable content (JSON)
    instructor/                Your course settings, kept separate
    labs/                      Lab questions and feedback
  components/                  Layout, UI pieces, activities, tools, timer
  labs/Labs.tsx                The nine labs
  lib/                         Storage, pathway, progress, feedback rules, content loader
  pages/                       One file per page
  tests/                       Automated tests
CONTENT_MAP.md                 Textbook chapter → site map
INSTRUCTOR_GUIDE.md            How to edit every content file
```

Built with React 18, TypeScript, Vite 5, Tailwind CSS 3, React Router (hash routing), and lucide-react icons. Tested with Vitest, Testing Library, and axe-core.

---

## Design system

The site is meant to feel like a stage and a studio, not a worksheet.

| Token | Hex | Role |
|---|---|---|
| Ink | `#1B1F3B` | Text, dark sections (the auditorium) |
| Paper | `#F5F6FA` | Page background |
| Stage light | `#F2B33D` | Accent: spotlight, focus outline, highlights |
| High School teal | `#186A5F` | High School pathway |
| College plum | `#6B3FA0` | College pathway |
| Brick | `#B4383C` | Corrections and timer warnings |

- **Display type:** Bricolage Grotesque (variable weight and width). The hero headline animates across both axes like a voice waveform.
- **Body type:** Atkinson Hyperlegible, chosen for legibility and multilingual learners.
- **Color as meaning:** teal and plum always mean the pathways; gold always means stage light or the textbook.

To change the palette, edit `tailwind.config.js`. Recheck contrast afterward.

---

## Licenses and attribution

**Educational content** (text, activities, feedback, and the content in `src/content/`) is adapted from *Exploring Public Speaking: The Open Educational Resource College Public Speaking Textbook*, Version 4.1 (2020), primary author and editor Dr. Barbara G. Tucker, with contributors Amy Burger, Chad Daniel, Jerry Drye, Cathy Hunsicker, Matthew LeHew, and Amy Mendes, originated by Dr. Kristin Barton. Published by Dalton State College through Affordable Learning Georgia. Licensed [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). Textbook: <https://www.exploringpublicspeaking.com/>.

Because it adapts a ShareAlike work, this project's educational content is also licensed **CC BY-NC-SA 4.0** (see `LICENSE-CONTENT.md`). It may not be used commercially.

**Source code** (everything outside `src/content/`) is licensed under the **MIT License** (see `LICENSE`).

**Not covered by either license:** the textbook's photographs (copyrighted by Dalton State College), linked websites, speeches, recordings, and archives. Copyrighted speeches (for example, Dr. King's and Malala Yousafzai's) are linked, not reproduced.

This project is not affiliated with or endorsed by Dalton State College, the textbook's authors, or any linked organization.

Developed with assistance from Claude (Anthropic).
