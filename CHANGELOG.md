# Changelog

## Unreleased (branch `dev`) — Speaking Lab 2.0, slice 7: AI Coaching Studio and the development preview

### Added: development preview build
- `site/js/build.js` decides production or preview. Preview turns on only when the page is served from
  `/speaking-lab-preview/` (or localhost) AND the preview workflow added `site/data/preview.json`
  (`{"channel": "preview"}`). The production address never requests that file.
- Preview behavior: "DEVELOPMENT PREVIEW" bar with a date picker and "Clear preview progress", a corner label,
  "[Preview]" tab title; all six high school units open; any date viewable without the teacher code; progress
  stored under `slpreview:` so it never touches students' real progress on the shared github.io address.
  College gate and teacher-view code unchanged.
- Safeguards: a test fails if `site/data/preview.json` is committed; the production workflow refuses to deploy
  it; tests prove the production path cannot activate preview.
- `docs/preview/deploy-preview.yml` and `docs/preview/README.md` for the separate preview repository (checks out
  `dev`, runs tests, adds the preview file, deploys). Its current workflow could not be read from this session.

### Added: AI Coaching Studio — "Your Thinking. Your Voice." (`#/ai`, all six units)
- Guiding principle "AI is a coach, not an author" and the five-step Cognitive Ownership framework (Think,
  Consult, Evaluate, Revise, Own) on the studio front page.
- **AI Literacy Academy**: 13 short lessons (what generative AI is, what it can and can't do, cognitive
  offloading, independent thinking, human agency, hallucinations, fabricated citations, bias, verification,
  privacy, academic integrity, responsible use, ethical disclosure), each with a realistic check and feedback;
  college-depth notes on integrity, citations, bias and verification for the authorized college pathway.
- **Cognitive Ownership**: ten scenarios across the five steps; students decide whether ownership was kept
  or given away, with explanations and unlimited retries.
- **Think first: Speech Coach**: the six stages and 24 questions from the original AI Coach (src/), now with
  Spanish, answered without AI and saved only in this browser.
- **Prompt Library**: 20 prompts in all 19 requested categories, searchable and filterable, copy to clipboard,
  "when to use it" for each. Every prompt tells the AI what not to do (tests check). Includes the five original
  AI Coach prompts and Mr. Bennett's outline example. Optional **Think before you prompt** fields fill the
  prompt's brackets; they are not saved or sent.
- **Assignment-specific AI permissions**: four levels in `data/ai-permissions.json` (not permitted; grammar and
  spelling only = class default; guided coaching; expanded with a required note). Set per lesson in the Lesson
  Manager; shown on the Daily Learning Dashboard, in presentation mode, in the substitute plan and in the studio.
  The library only copies prompts the current assignment allows; others stay readable with "Not allowed on your
  current assignment."
- **AI Ethics Lab**: 12 situations (the seven requested plus the original AI Coach sort items) classified as
  appropriate / needs instructor permission / not appropriate under the class policy, each with a reason to
  choose; two extra college situations.
- **AI Fact Checker**: a clearly labeled SIMULATED AI answer with six claims (plausible, unsupported statistic,
  fabricated reference, misleading) and three references (two fictional, one the real course textbook) to
  check for missing publication information and look up (simulated); a final decision. Links to the Research &
  Source Lab; integration point for the future Research & Academic Integrity Studio.
- **AI-use disclosure**: printable/copyable template with the eight requested parts plus assignment and
  permission; student and teacher notes that AI detectors are not definitive evidence and that process,
  conferences and oral explanation show ownership.
- Spanish for all studio text (draft, flagged for review), sentence frames, vocabulary, side-by-side supports.
- **Independent Thinker is now active**: all Ethics Lab situations with correct reasons, all ownership
  scenarios, and a complete fact-check. Copying prompts or visiting pages never counts. Each skill adds learning
  points once. The badge says it is a digital practice, not teacher-verified performance.
- Content review document: AI permission levels and every studio text pair (English/Spanish).
- Tests: `tests/aistudio.test.mjs` (14), `tests/preview.test.mjs` (5), one Lesson Manager test (20 new; 111 total).

### Changed
- Lessons may carry `ai: { level, note }`; `SLManage.validate` checks it (expanded needs a note).
- `studios.json`: AI Coaching Studio available with `route` `#/ai` and `content`.
- `achievements.js`: criterion type `ai`, reads only dated `mastered` parts of `speakup-ai-v1`.
- `boot.js` loads `data/ai-permissions.json`, `js/aistudio.js`; `index.html` loads `js/build.js` before boot.

### Not done
- Research & Academic Integrity Studio and APA Academy (next slice). No external AI, keys or accounts. Nothing deployed.

## Slice 6: Beyond the Podium, Episode 1

### Added
- **Beyond the Podium: Communication in Real Life — Episode 1: The Misunderstanding** (`#/btp/1`), featured
  in Unit 1 (Labs and studios). Seven stages, English and Spanish, every activity built from the official
  transcript only (no invented visuals, emotions or timestamps):
  1. Read the Room — observation vs. inference (sort six statements about the words; feedback, retries).
     The thumbnail slot asks for one thing seen and one guessed, and never asks students to read emotions
     from faces.
  2. Watch the Film — questions before and after viewing, native player with keyboard controls, `preload=
     metadata`, no autoplay, English captions, Spanish captions only once marked reviewed, replay button,
     transcript always available.
  3. Communication Detective — nine barriers; students tick the transcript line(s) that show each one and
     may explain; wrong lines are named; technoference is correctly "no evidence in the words".
  4. Beyond Words — verbal / nonverbal / paralanguage sort, one cue with many meanings, word–voice
     mismatch; says plainly that body language cannot tell whether someone is lying.
  5. Two Perspectives — what each student said vs. what we don't know; no villain; perception check.
  6. Change the Conversation — two text-based branching scenes (as Jordan, as Alex), labeled practice
     dialogue, feedback on every choice naming the skill (I-statements, open questions, paraphrasing,
     empathy, perception checking, assertiveness, de-escalation, collaborative problem-solving), "change my
     last choice", "start over", unlimited retries.
  7. Reflect and Apply — five new situations (goal 4 of 5, best score kept, unlimited retries), three
     reflection prompts that allow imagined situations, printable learning summary (`#/btp/1/summary`).
  Vocabulary, sentence starters and an optional bilingual support line on every stage. Spanish marked as a
  draft for teacher review (students in Spanish see "Traducción en borrador").
- `site/js/btp.js` — one engine for every episode: an episode is `site/data/btp/episode-N.json` plus a
  `studios.json` entry (`route`, `episode`). Progress key `speakup-btp-v1` (this browser only, included in
  "Back up or move my progress").
- **Bridge Builder is now active**: earned only after all three demonstrations — every barrier matched to
  evidence, both practice scenes repaired, and 4 of 5 on the new situations. Watching, visiting or sorting
  alone earns nothing. It says it recognizes practice in a digital lab, not real-life mastery. Each of the
  three skills adds learning points once (recalculated, no duplicates).
- The Unit 1 flex journal "When Communication Breaks Down" links to the lab from the Daily Learning
  Dashboard, and the lab shows the journal prompt (handwritten, 10 minutes, stand and share).
- Teacher view in the lab lists missing media and the lab text's review status.
- The content review document now includes every English/Spanish pair in the lab.
- `tests/btp.test.mjs` (13 tests): data, verbatim dialogue, evidence, honest media flags, no autoplay,
  branching, mastery rules, retries, no duplicate awards or points, malformed records, reusable engine,
  no sensitive disclosure, no lie-detection claims.

### Missing dependencies (not in the repository, nothing was generated in their place)
- `site/media/btp/ep1/beyond_the_podium_final.mp4` (the approved 55-second film)
- `site/media/btp/ep1/beyond_the_podium_thumbnail.jpg` (plus a short description for its alt text)
- `site/media/btp/ep1/captions.en.vtt` and `captions.es.vtt` (Spanish after review)
To add one: upload the file to that path and set `available: true` in `site/data/btp/episode-1.json`
(Spanish captions also `reviewed: true`). A test fails if a flag and the file disagree. Until then students
see "The film will be added here by Mr. Bennett" and every activity works from the transcript.

### Lesson Manager refinements (slice 5 review)
- Invalid months/days (e.g. 2026-13-01, Feb 31) are rejected with a message instead of an exception; unit
  release times must be a real date and time.
- An empty journal library, a unit with no journals, null entries, a null lesson record, non-list fields and
  non-object files are reported as clear errors; any unexpected problem returns "The file could not be
  checked … Make sure it is a complete, unedited export." instead of crashing. Imports say "Not imported.
  Fix first: …".
- Approved text that is substantively edited goes back to draft for that language only (status changes
  alone do not), with a message saying so.
- The editor is titled "Reusable lesson"; it says edits change the lesson wherever it is used, while dates,
  journal numbers and which journal each class wrote never change.
- Known limitation (documented in the editor and CLAUDE.md): the archive shows the current wording of a
  reusable lesson; earlier wording is not stored.

### Changed
- `studios.json`: Beyond the Podium is `available` with `route` and `episode`; available items may now open
  an in-site route. Boot loads `js/btp.js` last.
- `achievements.js`: criterion type `btp`; reads only the dated `mastered` parts of `speakup-btp-v1`,
  ignores anything malformed.

### Not done (needs separate approval)
- Episode 2, AI Coaching Studio, Research & Academic Integrity Studio. Nothing deployed.

## Slice 5: Teacher Lesson Manager

### Added
- **Teacher Lesson Manager** (`#/teacher`, teacher view only; described as a classroom pacing control,
  not secure sign-in). Semester (fall/spring) and class-group (odd/even) selection, and seven sections:
  - Calendar: every class day for the group with unit, journal number, notes and released/today/upcoming;
    each day opens a preview with Present, Substitute plan, Preview as a student and Edit lesson.
  - Week planner: the pacing guide's five planned days per course week, lesson, objective, review status,
    the date each group has it; copy a lesson to another day (copied as a draft); printable weekly plan.
  - Daily lesson editor: title, learning, college and language objectives, success criteria, agenda
    (empty = pacing guide), exit reflection, activities and featured labs, Canvas link, English/Spanish
    side by side with "Spanish missing" markers, review status set by the teacher only. Warns when the
    lesson was already taught (archive shows edits; journal numbers never change).
  - Journal library: edit prompt, response expectations, no-disclosure option, stand and share, sentence
    starters, vocabulary, status. The handwritten 10-minute routine is unchanged.
  - Schedule and releases: snow day/closure, one-group closure, assembly, no-journal day, extended lesson,
    assign a specific journal; unit release dates and times (Central Time); conflicts preview. Changes for
    past days are locked; new changes are stamped with today's date.
  - Review: approve lessons and journals separately for English and Spanish; counts of approved items.
  - Publish: validation (required fields, dates/times, duplicate ids, links), conflicts, changed files only,
    download each file, step-by-step GitHub upload to the dev branch, backup/restore/import of drafts,
    "preview my drafts on this browser", clear drafts. No credentials or tokens anywhere.
  - New semester or year: how reuse works; calendar template download.
- `site/js/manage.js` — validation, conflicts, override rules, export/import shared by the site and tests.
- **Presentation mode** (`#/present/odd|even`): date, objectives, journal number and prompt, vocabulary,
  sentence starters, agenda; text size, full screen, a 10-minute journal timer that starts only when pressed
  and has nothing to do with achievements. Site header hidden.
- **Substitute plan** (`#/sub/odd|even|both/DATE`, teacher view, printable): class group and days,
  objectives, journal instructions, activities, website links, success criteria, note space; no student data.
- Extended lessons: override type `extend` repeats the previous class's lesson (students see a note);
  journals and numbers still follow the calendar.
- `site/data/config.json` names the academic-year calendar file; lessons and journals carry no dates.
- Lesson fields `title`, `agenda`, `exit`, `activities`, `featured`, `canvas`, `status`; journal field
  `expect`. The student dashboard, presentation and print views share one lesson model.

### Changed
- Student backups skip every `speakup-teacher-*` key (teacher view, drafts, preview).
- Teacher dialog links to the Lesson Manager and presentation mode.
- The review document shows each lesson's own English/Spanish status and any teacher-edited fields.

### Verified
- 71 tests pass (all 57 earlier tests plus 14 for validation, overrides and history, extended lessons,
  conflicts, export/import, duplication, draft isolation, presentation timer, no credentials, year config).
- Headless Chrome: manager calendar, week planner, lesson edit and save, snow day added (past date refused),
  publish with download of the changed lessons.json, draft preview in the student view, presentation with
  timer, substitute plan for both groups, weekly plan, review, and a student browser with stray drafts
  (drafts not shown, manager closed). Earlier walkthroughs repeated. No script errors.

### Known
- An exported file is written in standard two-space JSON, so the first export of lessons.json reformats it
  (same content). Extended lessons repeat content for that day; they do not push the pacing guide.

## Unreleased (branch `dev`) — Speaking Lab 2.0, slice 4: availability everywhere, achievements, learning summary

### Slice 3 refinements
- The classic course guide follows the same release dates as the student view: an unreleased unit's
  panel (readings, assignment, reading check, practice test) shows a locked notice with its Central Time
  opening; unit tabs show a lock. Released units stay open for review. Old deep links (#unit-5) still
  work and show the notice. Labs, vocabulary, research resources, rubrics and speeches stay available.
- Teacher view (teacher code, `access.json`) opens future units in both views with a "Teacher view"
  note, and enables the `?date=` preview. It is described everywhere as a classroom pacing control, not
  a secure sign-in.
- College pathway unchanged: off by default, instructor code, verbatim enrollment notice.

### Added
- **My achievements** (`#/achievements`, linked from the dashboard): badges earned and available,
  criteria with progress and "try again" prompts, unit completion table, learning points, three levels
  (Knowledge mastery · Applied learning · Communication mastery), "Coming later" section, print-ready
  learning summary, link to back up or move progress. No leaderboards, no streaks.
- `site/data/achievements.json` — one configuration for 16 badges: 10 earnable now from real activities
  (reading checks, practice tests, Research & Source, Group Communication and Persuasion & Rhetoric labs,
  Art of Listening, Respectful Audience); 3 communication badges pending teacher verification (never
  awarded online); 3 coming with Beyond the Podium, the AI Coaching Studio and the Research Studio/APA.
- `site/js/achievements.js` — reads existing progress only; records first-earned dates and first-seen
  scores in one new key, `speakup-achieve-v1` (included in My work backups); learning points are
  recalculated from mastered items, so nothing is counted twice. Brief, polite "New achievement" note;
  no animation with reduced motion.
- Teacher content review document (generated, not hand-copied): `tests/tools/content-review.mjs` +
  `content-review.py` → Word document with the college notice, 15 pacing lines needing Spanish, all 80
  daily objectives and success criteria, and all 42 journals, English and Spanish, marked DRAFT/APPROVED.
- `DEVELOPMENT_ROADMAP.md`.

### Fixed
- The Voices of Change listening checks and The Art of Listening both saved to `speakup-listen-v1`, so
  one could overwrite the other's newest answers during a visit. The checks now use `speakup-vcheck-v1`;
  on first use, answers saved under the old key are copied over and the old key is left unchanged.

### Verified
- 57 tests pass (achievement criteria, duplicate awards, progress preservation, pending/coming never
  earned, artwork accessibility, classic availability, the key migration, plus all earlier tests).
- Headless Chrome: achievements with seeded progress (2 badges earned, toast once, not again on reload),
  print view, classic #unit-5 locked and #unit-1 open, teacher view in both views, migration of a saved
  listening check, the full Slice 3 walkthrough again; classic page text matches the baseline except
  the lock marks and college label. No script errors.

## Unreleased (branch `dev`) — Speaking Lab 2.0, slice 3: student experience

### Added
- **Three-pathway entrance** (`#/start`, first visit): I am a college student (locked: instructor
  authorization; "Not offered at this time" while off) · I am a speech student · I am learning English
  (same course and goals, language supports on). Pathway saved as `speakup-path`; change it anytime.
- **Six-tile dashboard** (`#/`): the six real units, three by two, each with number, title, description,
  unit color, state (Locked / Available / In progress / Completed: words + icon), "Current unit" label,
  progress on this computer, "Reading check mastered" mark, and Start / Continue / Review.
- **Unit environments** (`#/unit/N`): Today · Lessons and journals · Unit guide · Labs and studios.
  The existing unit guide (readings, assignment, rubric, reading check, practice test) and the labs are
  moved into the unit while it is open, so every tool, saved answer and Spanish string works unchanged.
- **Daily Learning Dashboard** (first screen of the current unit): date, week, lesson, lesson-specific
  learning and language objectives, the day's journal (#, set, 10 minutes, handwritten, no-disclosure
  option, vocabulary, sentence starters, stand and share), agenda from the pacing guide with items due
  today and a Canvas link, success criteria, unit labs and featured experiences. Honest status on days
  without class. **Archive** of every opened lesson and journal (`#/unit/N/lessons`, `#/unit/N/day/DATE`).
- `site/data/lessons.json` — learning objective, college objective where the plan differs, language
  objective and success criteria for all 80 planned days, English and Spanish (drafts for review).
- `site/data/studios.json` — featured experiences and studios: Beyond the Podium Ep. 1 (Unit 1, coming),
  Ad Detective (Unit 6, featured), Research & Academic Integrity (introduced Unit 2, then Units 3–6; opens
  the Research & Source Lab for now), AI Coaching Studio (all units, coming, with the default AI rule),
  APA Academy (college only, coming). Coming-soon items have no link.
- `site/data/access.json` — college switch and code hash, teacher code hash. `site/js/progress.js` —
  read-only progress API for unit states and future achievements.
- Unit 1 flex journal "When Communication Breaks Down" (EN/ES), linked to Beyond the Podium Ep. 1.
- Language supports toggle: English and Spanish side by side (always on for the learning-English path).
- Teacher tools: teacher code unlocks the `?date=` preview; without it `?date=` is ignored.

### Changed
- Flex journals go before the unit reflection when possible (`before` in journals.json).
- Overrides record `added`; an override never changes classes before that date, and journals are
  assigned class by class with what was known that day, so past journal numbers never shift.
- Units open at 7:00 a.m. Central on their first class day (`releaseTime` in the calendar, or a
  teacher-approved time in `overrides.json` → `releases`); daily lessons open at 7:00 a.m. that day.
- College switch moved from `index.html` to `access.json` (still off). Header: "My course" link; the
  brand goes to the dashboard. The classic page's scroll highlight pauses in the student view.

### Verified
- 47 tests pass. Headless Chrome walkthrough: entrance, closed college gate, dashboard, Unit 2 today,
  archive and a past lesson, unit guide and labs inside the unit, locked Unit 5, Spanish + learning
  English, student `?date=` ignored, teacher preview, old links (#unit-3, #lab-research) on the classic
  page. Classic page text identical to the baseline at 9 dates × 4 block settings except the college
  label. Keyboard order, names on every control, dark mode, 390 px phone width: checked. No script errors.

### Known
- Some pacing-guide lines have no Spanish in the existing dictionary (also true on the live page), so
  they show in English in the agenda.
- The classic course guide still shows every unit, as before; availability applies in the student view.

## Unreleased (branch `dev`) — Speaking Lab 2.0, slice 2: data connected, Chicago time, journal engine

### Added
- `site/js/schedule.js` — one schedule engine for the page and tests: today in America/Chicago (any laptop
  time zone, DST-safe), course weeks, odd/even 90-minute blocks with alternating Wednesdays, classroom
  overrides, and Daily Learning Journal assignment (`SLSchedule.meetings`, `SLSchedule.journalFor`).
- `site/js/boot.js` — loads `site/data/*.json`, then runs the page's scripts in their original order.
  Shows a clear English/Spanish message if the data cannot load. `?date=YYYY-MM-DD` gives a labeled
  teacher preview of any day (display only).
- `site/data/overrides.json` — classroom overrides kept apart from the district calendar:
  `closure` (no class; for all groups it also shifts pacing), `noJournal`, `journal` (assign a journal id).
- Journal rules: one per block; numbered by each group's own journals written (10 = one 100-point set);
  a unit shortened by holidays drops middle journals and always keeps its first and last (reflection);
  a long unit uses its flex journal once, then shows no journal rather than inventing one.
- Tests (35, Node built-in): golden comparison with the original page's calendar code for 73 start dates
  and every Wednesday (`tests/fixtures/calendar-golden.json`, made by `tests/tools/make-golden.mjs`);
  Chicago date across midnight and both DST changes; journals for both semesters × both groups; every
  override type; load order; no inline data copies left. Optional browser check:
  `tests/browser/compare-baseline.py`.

### Changed
- `site/index.html` no longer carries its own copies of units, pacing, calendar, block schedule or
  objectives; it reads `SL_DATA` (from the JSON files). Its course-week and block-day functions call
  `schedule.js`. Every "today" check uses the Chicago date. (~330 duplicated lines removed.)
- Deploy workflow: tests run on every branch and pull request; only `main` can build and deploy.

### Verified
- Headless Chrome, 9 dates (both semesters, Fall Break, Presidents' Day week, Spring Break, finals) ×
  4 block settings: page text identical to the baseline except the intended college label; no script
  errors. Spanish, all 11 labs, saved progress and the data-failure message checked.

### Known
- Fall 2026 Unit 1 has six classes per group (Thursday start), so the sixth shows no journal unless a
  Unit 1 flex journal is added.
- The page needs a web server (GitHub Pages is fine); opening `index.html` straight from disk cannot load
  the data files.

## Slice 1

Baseline: tag `v1-live-2026-11-23` = commit `ca8f2de`, the live site on Nov 23, 2026.

### Added
- `site/data/` — curriculum data lifted out of `site/index.html`, values unchanged:
  `units.json` (six units, unit labs, lab names), `pacing.json` (16 weeks × 5 planned days),
  `calendar-2026-27.json` (KCKPS no-school days, semester dates, 90-minute block schedule),
  `objectives.json` (learning targets, language objectives, sentence frames).
  The page does not read these files yet; tests keep them identical to the page.
- `site/data/journals.json` — 39 Daily Learning Journals plus 2 flex journals (Units 2 and 3).
  One journal per 90-minute block, about 10 minutes, then stand and share with someone new;
  10 journals = one 100-point set. English approved Nov 24, 2026; Spanish is a draft for review.
- `tests/` — Node built-in tests (no packages): data matches the page, calendar dates are valid,
  journal structure, every inline script parses, college gate rules.
- Deploy workflow runs the tests first; a failing test stops the deploy.

### Changed
- College gate is fail-closed: `COL_ENABLED = false` in `site/index.html`. While off, the college
  tile reads "Not offered right now", the gate shows only the notice and "not offered at this time",
  a previously stored unlock is ignored, and `setLevel` refuses the college view from any route.
- The gate shows the required notice word for word (Spanish translation drafted).

### To turn college on later
Set `COL_ENABLED = true` in `site/index.html`. To change the code, run `colHash("new-code")` in the
browser console and paste the result into `COL_HASH`. The code is a classroom deterrent only:
anyone can read the page source.

### Rollback
See "Releasing and rolling back" in CLAUDE.md (only `main` can deploy).
