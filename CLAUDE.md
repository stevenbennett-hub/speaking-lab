# Speaking Lab — notes for Claude

Owner: Steven Bennett, Speech & Debate, Wyandotte High School (KCKPS). Full brief: `Speaking_Lab_2.0_Claude_Master_Prompt.md` (kept by the owner). Read `CHANGELOG.md` for what each slice did and `DEVELOPMENT_ROADMAP.md` for what is next. Slices 1–10 approved (slice 10 = release candidate; production approval pending); Slice 11 approved for preview testing; Slice 12 (unified application) awaiting review; none deployed yet. **Feature development is paused until the classroom pilot** (`docs/pilot/`); only fixes, review and readiness work until then. Release checklist: `docs/RELEASE_CHECKLIST.md`.

## How the site runs
- GitHub Pages deploys **`site/` from `main` only**, after `node --test tests/*.test.mjs` passes. Other branches and pull requests run tests only.
- `site/index.html` is the classic one-page course (~2 MB, plain JS, EN/ES). Its scripts are `type="text/x-speakup"`; `site/js/boot.js` loads `site/data/*.json` into `window.SL_DATA`, runs those scripts in order, then loads `js/progress.js`, `js/achievements.js`, `js/sound.js`, `js/celebrate.js`, `js/manage.js`, `js/student.js`, `js/teacher.js`, `js/btp.js`, `js/aistudio.js`, `js/research.js`, `js/playbook.js`, `js/app.js`. `js/schedule.js` and `js/build.js` load first.
- `js/student.js` is the student experience. Routes: `#/` dashboard (or `#/start` entrance on first visit), `#/unit/N` (Today), `/lessons`, `/day/YYYY-MM-DD`, `/guide`, `/labs`. Any other hash shows the classic page, so all old links work. Inside a unit it moves the page's `#units` and `#labs` sections in and back out (marker comments) instead of copying them.
- `src/` (React) is NOT deployed; content source only (24 Learn modules, 9 labs, AI Coach JSON).

## Single source of truth (`site/data/`)
| File | Holds |
| --- | --- |
| `units.json` | six units, unit labs, lab names (`UNITS`, `UNIT_LABS`, `LAB_NAMES`) |
| `pacing.json` | 16 weeks × 5 planned days (`PACE`) |
| `calendar-2026-27.json` | KCKPS no-school days, semesters, block schedule, `releaseTime` (07:00 CT) |
| `overrides.json` | classroom overrides (each needs `added`; types closure, noJournal, journal, extend) and teacher-approved unit `releases` |
| `objectives.json` | unit-level targets and frames (classic page) |
| `lessons.json` | per planned day `wWWdD`: objectives, success criteria; optional title, agenda, exit, activities, featured, canvas; `status` {en, es} |
| `config.json` | which academic-year calendar file to load; `site` = public production/preview addresses for printed plans |
| `journals.json` | Daily Learning Journals; flex journals with `before`; `experience` links |
| `studios.json` | featured experiences/studios by unit; `coming` items never link |
| `access.json` | college switch (off) + code hash; teacher view code hash |
| `btp/episode-N.json` | Beyond the Podium episodes: transcript, seven stages, media flags, review status |
| `ai-permissions.json` | four AI permission levels + class default (grammar); lessons set `ai: {level, note}` |
| `ai-studio.json` | AI Coaching Studio content (loaded when the studio opens) |
| `research-studio.json` | Research Studio + APA Academy content; APA rules each cite their apastyle.apa.org page; portfolio required counts |
| `achievements.json` | every badge: level, status (active / pending-verification / coming), criteria, points |
| `playbook/unit-N.json` | Instructor Playbook (teacher-facing, loaded only by the Lesson Manager); extends lessons by key, never copies objectives/journals |
Never paste data back into `index.html`; tests fail if inline copies return.

## Rules that must hold (approved Nov 24, 2026)
- Six real units and their pacing. Beyond the Podium → Unit 1 (journal `j-u1-flex` links it). Ad Detective → featured in Unit 6 (separate site, same origin; its own work in `addetective-v1` is never read here, only its versioned summary `addetective-mastery-v1`). Research & Academic Integrity → introduced Unit 2, available Units 3–6. AI Coaching Studio → all units, gated by assignment-specific AI permission. APA Academy → college only.
- Journals: one per 90-minute block, 10 min handwritten, then stand and share with someone new; 10 = one 100-point set; numbered per block group; short units keep first and last; flex once, before the reflection; past numbers never change (override `added` rule).
- Units/lessons open at a Central Time date and time (`SLSchedule.chicagoNow()`), in the student view AND the classic guide (`student.js` wraps `renderUnit`/`renderTabs`); released units stay open; labs, vocabulary, research, rubrics stay available. Teacher view (code) opens future units and the `?date=` preview. All of it is a classroom pacing control, never security; never call the code a secure credential.
- Achievements: only from activities that exist; communication badges stay pending until a real teacher verification process exists; coming badges are never awarded; points are recalculated (no duplicates); `js/achievements.js` reads progress keys and writes only `speakup-achieve-v1`. No leaderboards or streaks.
- College off by default (`access.json`), verbatim enrollment notice, instructor code; client gates are deterrents only.
- Preserve every `speakup-*` localStorage key (Voices of Change checks moved to `speakup-vcheck-v1` with a one-time copy from `speakup-listen-v1`, which now belongs to The Art of Listening only); read progress through `js/progress.js`; never rename keys without a tested migration. `speakup-col-ok` and `speakup-teacher-ok` stay out of backups.
- Spanish (journals, lessons, notices) must be reviewed by the owner before production.

## Working rules
- Branch `dev`; production = `main`; never deploy without the owner's approval. This session has read-only git; the owner uploads the package.
- Edit `index.html` with targeted replacements only. Run `node --test tests/*.test.mjs` after every change; for calendar changes also run `tests/browser/compare-baseline.py` locally.
- Dates: ISO strings + `schedule.js` (UTC noon); today = `SLSchedule.chicagoToday()`, now = `SLSchedule.chicagoNow()`; page code uses `todayDate()`.
- Do not change Ad Detective (except on its own `dev` branch, as approved in Slice 10) or regenerate media without approval. No trackers, accounts or student data.

## Releasing and rolling back (main-only deploy)
- Release: merge or upload `dev` into `main`; the push runs tests and deploys if they pass. Tag each release (`vX-YYYY-MM-DD`).
- Roll back: on `main`, `git revert` the release commit(s) and push (or `git checkout <last-good-tag> -- site .github tests` and commit). The push redeploys. By hand: download the last good tag's ZIP from GitHub and upload its files to `main`. Running the workflow on a tag or another branch will not deploy.
- Baseline before 2.0: tag `v1-live-2026-11-23` (`ca8f2de`).

## Teacher Lesson Manager (`js/teacher.js`, `js/manage.js`)
- Edits only lessons.json, journals.json, overrides.json (drafts in `speakup-teacher-drafts-v1`, this browser only; preview with `speakup-teacher-preview`). Never edits calendar or pacing. Export = changed files only, committed by the teacher; no tokens.
- Past overrides are locked (`SLManage.removeOverride`, `addOverride` refuses past dates). Editing approved text resets that language to draft (`SLManage.reviewAfterEdit`). Lessons are reusable: the archive shows their current wording (earlier wording is not stored); dates and journal numbers never change. Validation lives in `SLManage.validate` and is also run on the published data by `tests/manager.test.mjs`.
- Presentation `#/present`, substitute plan `#/sub/...`, weekly print `#/teacher/print/week/N`; all use `SL2.lessonModel` (same as the student dashboard).

## Beyond the Podium (`js/btp.js`, `data/btp/`)
- Routes `#/btp`, `#/btp/N`, `#/btp/N/<stage>`, `#/btp/N/summary`; registered with `SL2.addRoute`. Unit lock follows the unit's release.
- Everything comes from the official transcript. Never invent visual details, emotions, timestamps or new film lines; practice dialogue is labeled as practice. Never regenerate the film, voices, characters or thumbnail.
- Media flags must match the files (tests check). Film (1080p original + approved 720p copy), EN captions (extracted unchanged from the film's subtitle track), ES captions (draft) and description tracks are in `site/media/btp/ep1/`; missing: thumbnail (+alt). Never re-encode or regenerate without approval. No autoplay; Spanish captions only when `reviewed`.
- `speakup-btp-v1` stores answers and dated `mastered` parts; achievements read only `mastered`. Bridge Builder = detective + change + apply; watching/visiting never counts. Browser records are motivational, not grades.
- New episode = new data file + studios entry; do not build Episode 2 without approval.

## Development preview (`js/build.js`, `docs/preview/`)
- Preview = served from `/speaking-lab-preview/` (or localhost) AND `site/data/preview.json` `{"channel":"preview"}` written by the preview repo's existing `preview.yml` (don't add another workflow). Never commit that file (test + production workflow refuse it). Production never requests it.
- Preview: banner, all six HS units open (`released()` in student.js is the only place), `?date=` without teacher code, storage namespaced `slpreview:`. College gate and teacher code unchanged. Ad Detective links go to `/ad-detective-preview/` (build.js). Don't add preview behavior anywhere else.

## AI Coaching Studio (`js/aistudio.js`, `data/ai-studio.json`)
- AI is a coach, not an author. No AI API, keys, accounts or data sent anywhere; the only fetch loads the content file. Prep answers are never saved.
- Every prompt must tell AI not to do the student's work (tests). Prompt `level` is grammar or coach; copying is blocked when the current assignment's permission (`SL2.aiNow()`) is lower. Showing a prompt never authorizes it.
- `speakup-ai-v1`; Independent Thinker = ethics + ownership + factcheck mastered via the check buttons only. Fact Checker material is fictional and labeled SIMULATED.
- Original AI Coach (`src/content/aiCoach.json`) stays as content source; its stages/prompts/sort items live on in the studio (tests).

## Research & Academic Integrity Studio (`js/research.js`, `data/research-studio.json`)
- Routes `#/research` + `/sources /evidence /integrity /paraphrase /cite /portfolio[/summary] /apa`; opens with Unit 2. Builds on the Research & Source Lab (rlab) and AI Fact Checker; link, don't duplicate.
- APA: never add or change a rule without checking apastyle.apa.org and updating its `src` and `checked`. APA Academy and APA Scholar are college-only (`isCol()` = level col AND colUnlocked; badges with `audience: "col"` are filtered in student.js).
- Never auto-judge a student's paraphrase or research; never call a source credible because fields are complete; detector scores are not proof. Oral citations never include URLs or invented details.
- `speakup-research-v1`; Citation Specialist = integrity + paraphrase + cite; mastery only via the seven Check buttons.
- AI policy: grammar/spelling default; `ai.eld` opens only ELD-marked prompts (`allowedPrompt`).
- Packages: include `src/content/aiCoach.json` (tests read it).

## Slice 9 rules
- Language support = preference (`speakup-support-level`: guided/supported/independent), never a proficiency level; objectives never change by level. New languages need reviewed data, not machine translation.
- Digital journal: only with the journal code (`access.json` journal.codeHash); local only; never graded or marked complete.
- Research requirements live on lessons (`research: {id, sources, name, expect, written, oral, portfolio}`), set in the Lesson Manager; `SLResearch.assignments` merges them with the data defaults.
- Communication badges stay pending (Canvas is the record; rubric mapping in `docs/proposals/teacher-verified-rubric-mapping.md`, built only from the real rubric rows and their Exceeds/Meets/Approaching/Beginning/Missing levels).
- Preview repo's `preview.yml` (unique artifact names, separate build/deploy jobs) is the owner's; don't replace it.

## Slice 10 rules
- Film: the 1080p original is byte-for-byte unchanged (test checks its SHA-256); `beyond_the_podium_720p.mp4` is the only derived copy (approved). Descriptions (`descriptions.{en,es}.vtt`, transcript rows with speaker "Description") describe actions only, never emotions; Spanish captions and all descriptions stay `reviewed: false` until the owner reviews them. Thumbnail is still missing: never generate one.
- Ad Detective lives in its own repo (`stevenbennett-hub/ad-detective`); changes go on its `dev` branch only and are never published without approval. Rules in its `src/mastery.js`: only objective challenges answered without a shown answer count; shown answers can be retried on a later day; summary `addetective-mastery-v1` = `{v:1, app:"ad-detective", cases:{"1":"YYYY-MM-DD"}}`; preview at `/ad-detective-preview/` or localhost uses the `slpreview:` prefix.
- Speaking Lab reads only that summary (`SLAchieve.adCases`, criterion type `adcase`); Master Ad Detective = all six cases; each case = one learning-point item. Persuasion Detective unchanged.
- Preview build rewrites Ad Detective links to `/ad-detective-preview/` (`SLBuild.adHref`, attached in `activate` only).
- Typed journal shows five facts (`JOURNAL_FACTS` in student.js); never ask why a student types, never collect accommodation information.
- Tests may not assume published lessons have no `ai`/`research` settings; validate them instead (teacher workflow test, `docs/TEACHER_WORKFLOW_TEST.md`).
- Readiness: `docs/RELEASE_CHECKLIST.md` (four statuses). Pilot: `docs/pilot/`.

## Navigation (Slice 11, `docs/NAVIGATION_AUDIT.md`)
- Header: Today's Lesson (`#/today`) · My Course (`#/`) · Learning Labs (`#labs`) · Resources menu (`.navmore`: #resources #videos #speeches #rubrics #dates #pacing #top #references #about) · My Achievements. Teacher tools (teacher view only) sit with the utility buttons, not in the nav.
- `#/today` never computes schedules itself: no pathway → entrance then back; else `currentUnitId()` + `unitOpen()` → `#/unit/N` (Today tab asks for periods). Keep every old hash working; labels need EN/ES (ES dict or `NAV` in student.js).

## Instructor Playbook (`js/playbook.js`, `data/playbook/`, `docs/playbook/`)
- Framework Learn → Observe → Investigate → Practice → Perform → Reflect. Unit 1 is the prototype; **do not write Units 2–6 until Unit 1 is approved**.
- Keyed by lesson key; `validate()` refuses copied objectives/success/prompts and any planned day without an entry. Planned days ≠ meetings: meeting plans come from the live schedule via `compose()` (journal 15 min, 72-minute budget, `short` times, `fill` = speeches, stretch, repeated days → review).
- Videos: only ones already on the site; never invent contents, quotations or timestamps; segments stay blank and `verified: false` until the owner previews them (validator enforces). No autoplay; alternatives for blocked videos; district laptops, no personal phones.
- Teacher views only (Lesson Manager → Playbook, print routes, sub plan section); students never load the data. Notes: `speakup-teacher-notes-v1` (local, not in student backups). No student information anywhere.
- Quick Teach (`#/teacher/playbook/N/DATE`) is the default daily plan; `/full`, `print/quick|plan|sub|playbook` and the editor (`/edit/wWWdD`, `/edit/video/ID`) all use the same data. Phase links: `video`, `lab`, `read`, `route`; `before` = first class day only, ahead of the journal.
- Editing = Lesson Manager drafts (`W.playbook`, exported from Publish as `site/data/playbook/unit-N.json`, blocked while invalid); `SLManage.EDITABLE` stays lessons/journals/overrides. Objectives/journals/assignments are never edited in the playbook editor. Video times only with the "I previewed" confirmation (`applyVideoEdit`). Tests must accept teacher-verified times and edited timings.
- Printed plans use `SL2.siteBase()` (config.json `site`), never localhost; `playbook-export.py` refuses PDFs with localhost. Classroom expectations: `data/playbook/classroom.json`.
- Planning settings (`speakup-teacher-planning-v1`): class size per semester-group, minutes per speaker; capacity only warns, never changes pacing. Open questions live in `overview.confirm`; never apply them silently.
- Documents: `python3 tests/tools/playbook-export.py URL N OUT` (server running). Everything stays draft until approved.
- Approved decisions (Nov 24): proficient = Meets/Exceeds; Self-Introduction excluded from teacher-verified badges; Time and Clarity in English not separate requirements; Master Communicator Option A; integrity required; explore Canvas Outcomes; badges pending. Ad Detective approved for preview testing only.

## Slice 12: unified application (`css/app.css`, `js/app.js`, `js/sound.js`, `js/celebrate.js`)
- Header = brand + six destinations (`#/today`, `#/`, `#/calendar`, `#/labs`, `#/resources`, `#/achievements`) + language + Preferences. No pathway switch in the visible header. The old controls live hidden in `#hdrHold` so classic handlers keep working. Never link a header item to a classic `#section`.
- Classic sections appear in application views only through `SL2.host(id, slot)`: they move in, then back. Never copy them. Whole-section legacy hashes (`#labs`, `#videos`) still open the classic page.
- Learning Labs catalog: `data/activities.json` (skills and types; draft). Never list an activity that doesn't exist. Studios link only when available and their unit is open.
- Audio: only `js/sound.js` plays sound. Off by default. Prefs in `speakup-prefs-v1`. Files only when the manifest marks them `present` (tests check against the folder). Never autoplay, overlap, play over media or presentations, or call ElevenLabs from the site.
- Celebrations: only `student.js` `celebrate(newly)` after `achPrimed`. The first evaluation per page load is silent. `celebrate.js` never writes. Demo at `#/demo/celebrate` (teacher view).
- AI permission: lessons.json `ai` or the class default is authoritative everywhere. The playbook `ai` field is a teaching note; flag conflicts (`aiConflicts`), never change them.
- Substitute plans: `subTimeline()` always covers 90 minutes; never grading speeches. Extension work only from what was taught (`subExtensions`: taught labs + `overview.subStarter`, readings so far, rehearsal from `overview.speechAssigned`).
- Theme: dark for first-time visitors; a saved `speakup-theme` is always kept; earlier users (saved pathway, no theme) are pinned to light.
- Lab feedback sounds: only via `SLSound.labFeedback` (counts `.pl-fb.ok/.no` before and after a student action); never edit labs to play sounds. Unit unlock: `SLSound.unitOpened` (once per unit, `speakup-unlock-v1`, never on load).
- Sound files: `site/media/sfx/` via `tests/tools/sfx-prepare.py`; `reviewed` stays false until the owner approves.

## Portable achievements (`js/certificates.js`, `docs/CERTIFICATES.md`, `docs/privacy/`)
- The name and reflections live only in `NAME`/`REFL` (page memory). Never storage, URLs, mailto, filenames, metadata, backups or network; cleared on leaving or refresh. The only stored item is `speakup-backup-v1` (dates). Run `tests/tools/privacy-audit.py` after any change here; any leak is release-blocking.
- Certificates only for engine-earned active badges. Exports never change progress or points. No signature. The instructor's name is not a verification. Demo = teacher view + fictional name + DEMONSTRATION label; preview builds stamp DEVELOPMENT PREVIEW.
- Competencies: activity skills, plus `activities.json` `badgeSkills` for reading-check badges (only where the unit supports it). The celebration button is "Back up my progress" (not "Save achievement").
- Documents are drawn on canvas with local fonts and art; the PDF writer is in the file (no libraries or services). Print defaults to the low-ink style.

## Learning checklist (`js/checklist.js`, `data/checklist.json`, `docs/checklist/`)
- Tasks come only from existing data and the schedule engine (no second scheduler); the page's `weekPlan` folds short weeks.
- **Graded** means approved by Mr. Bennett: the unit speech (units.json), journal sets (10 = 100 points) or `status: "approved"` in checklist.json. Proposed items are teacher-view only. Never invent points, weights, dates or assessments, and never approve on his behalf.
- Completion: auto only from existing reliable records; otherwise student checkbox or student-reported Canvas submission. Never claim submitted, graded or verified. No points for checkmarks. Storage `speakup-checklist-v1` (in backups); teacher draft `speakup-teacher-checklist-v1` (never in backups).
- Unit 1 tasks only until Unit 1 is approved.

## RC2 welcome and essentials (`js/course.js`, `docs/rc2/`)
- Welcome, Course Essentials and the Wyandotte page show the classic page's own elements with `SL2.host` (ids: welcomeFig, courseLede, courseWhy, aboutBio, aboutPhilo, wyPhoto, wyMic, wyVoices; plus map, about, dates). Never copy, recreate or autoplay the video. Never invent grading policies, expectations or historical facts. Show only approved student-facing content (`playbook/classroom.json` is a teacher draft).
- Student views never link to `#top`. `SL2.IN_APP` maps in-app clicks on classic section links; a fresh load (bookmark) still opens the classic page.

## Calendar (`js/calendar.js`)
- No calendar data of its own: events come from `SLSchedule` (meetings, noSchoolList, overrides), `SL2.dayParts`/weekPlan, `window.dueEvents`, units.json, the checklist core (approved assessments, journal sets). Never add a date list or store events.
- Speeches = one performance window per unit (never individual dates). Graded = approved only; proposed only in teacher view. Never invent points, deadlines or collection dates.
- Teacher draft preview (`speakup-teacher-preview`) also applies `speakup-teacher-checklist-v1` (js/boot.js).

## Content review
Regenerate the teacher review document after content changes: `node tests/tools/content-review.mjs [path/to/ad-detective/src/app.js] > /tmp/r.json && python3 tests/tools/content-review.py /tmp/r.json review.docx`. Never change a status on the owner's behalf.

## Next (needs approval)
See `DEVELOPMENT_ROADMAP.md`.
