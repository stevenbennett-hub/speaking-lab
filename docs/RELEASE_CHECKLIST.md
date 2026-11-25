# Speaking Lab 2.0 — Production readiness checklist

**Updated:** Nov 24, 2026, Slice 10. Owner: Mr. Bennett.

Use this before moving `dev` to `main`. `main` is the only branch that deploys to https://stevenbennett-hub.github.io/speaking-lab/.
- **Do not merge `dev` into `main`** until every row you need says *Approved for production*.
- Feature development is paused until after the classroom pilot.

## Status at a glance
Four separate questions for each area:
1. Is it **technically complete** (built, tested)?
2. Have **you** reviewed the instruction (English and Spanish)?
3. Is it **ready for the classroom pilot**?
4. Is it **approved for production**? Only you can mark this, after the pilot.

✅ done · ⬜ not yet · ◐ partly (see the notes).

| Area | Technically complete | Instructionally reviewed | Ready for classroom pilot | Approved for production |
| --- | --- | --- | --- | --- |
| Student dashboard, units, Today, lessons and journals | ✅ | ◐ journals EN approved; objectives and all Spanish draft | ✅ | ⬜ |
| Scheduling (calendar, odd/even groups, releases, journal numbers) | ✅ | ⬜ confirm against the KCKPS calendar | ✅ | ⬜ |
| Language support preferences and Spanish | ✅ | ⬜ all Spanish draft; 15 pacing lines untranslated | ✅ (Spanish labeled draft) | ⬜ |
| Typed (digital) journal option | ✅ | ⬜ | ✅ | ⬜ |
| Beyond the Podium, Episode 1 (film, 720p copy, captions, descriptions) | ◐ thumbnail not supplied | ⬜ lab text, descriptions, Spanish captions | ✅ | ⬜ |
| AI Coaching Studio and AI permissions | ✅ | ⬜ | ✅ | ⬜ |
| Research & Academic Integrity Studio, APA Academy | ✅ | ⬜ (APA rules cite apastyle.apa.org) | ✅ | ⬜ |
| Achievements (online badges, learning points) | ✅ | ⬜ | ✅ | ⬜ |
| Master Ad Detective + Ad Detective mastery | ◐ Ad Detective `dev` not published | ⬜ | ◐ approved for preview testing; create `ad-detective-preview` | ⬜ (not approved for production) |
| Teacher-verified badges (Confident Speaker, Master Storyteller, Master Communicator) | ✅ stay pending by design | ✅ framework decisions approved (Nov 24); Canvas rubric match to confirm | ✅ (shown as "not available yet") | ⬜ pending Canvas Outcomes setup |
| Teacher Lesson Manager publishing workflow | ✅ (workflow test passed) | n/a | ✅ | ⬜ repeat on a district laptop |
| Instructor Playbook, Unit 1 (teacher-facing) | ✅ (Lesson Manager → Playbook; tests) | ⬜ draft; video segments not yet previewed | ✅ | ⬜ |
| College Public Speaking pathway | ✅ off by default | ⬜ Unit 5 college objectives, Spanish notice | n/a (not piloted) | ⬜ stays off unless authorized |
| Development preview (separate storage) | ✅ | n/a | ✅ | n/a (never deployed to production) |
| Accessibility (target WCAG 2.2 AA; not a formal claim) | ◐ automated and keyboard checks done | ⬜ screen-reader pass | ✅ | ⬜ |
| District laptops and school network | ⬜ not testable from here | n/a | ⬜ check on the first pilot day | ⬜ |

## 1. Instructional approval
- [ ] Content review document read: **"Speaking Lab Content Review (Slice 10).docx"**. It covers:
  - 80 daily objectives and success criteria, the college objectives (including Unit 5), and the journals;
  - Beyond the Podium, the AI and Research studios;
  - achievements text, the typed-journal notice and the Ad Detective labels.
- [x] Journal prompts (42), English: approved (recorded in `journals.json`). Spanish: draft.
- [ ] Flex journals and "When Communication Breaks Down" reviewed.
- [ ] Beyond the Podium Episode 1 lab text approved, including:
  - the technoference feedback (your wording, now in place);
  - the "What the film shows" descriptions.
- [ ] AI Coaching Studio text, prompts, ethics cases and the AI permission levels approved.
- [ ] Research Studio text and case files approved. APA Academy rules spot-checked against apastyle.apa.org.
- [ ] Approvals recorded in the Lesson Manager (Review tab) for lessons and journals. Studio `status` fields set to approved in their data files.
- [ ] College enrollment notice wording confirmed (English required wording; Spanish is a draft).
- [x] Teacher-verified badges: framework decisions approved (`docs/proposals/teacher-verified-rubric-mapping.md`).
- [ ] Confirm the Canvas rubrics match the site rubrics, then set up Canvas Outcomes. Badges stay pending until then.
- [ ] Unit 1 Instructor Playbook (draft) reviewed. Video segments previewed and filled in. Review notes in `docs/playbook/UNIT1_CONTENT_REVIEW.md` accepted or declined.

## 2. Spanish language review
- [ ] Spanish reviewed for lessons, journals, studios, Beyond the Podium, notices and achievements. All are currently **draft**.
- [ ] The 15 pacing-guide lines without Spanish translated (listed in the content review), or accepted as English.
- [ ] Spanish film captions (`captions.es.vtt`, draft, same timing as the English) reviewed, then `captions.es.reviewed: true`. Until then students don't see them.
- [ ] Spanish visual descriptions reviewed (`descriptions.es.vtt`).

## 3. Media integration
- [x] Episode 1 film in `site/media/btp/ep1/` (15.9 MB, 1080p, unchanged) with its English captions (extracted unchanged).
- [x] Optional 720p lower-bandwidth copy (5.0 MB, same audio, captions and timing). Students choose it under "Video quality".
- [x] English and Spanish visual-description tracks (draft) and descriptive transcript rows. Audio description evaluated in `docs/reviews/btp-audio-description.md`.
- [ ] Episode thumbnail supplied, with a one-sentence description for screen readers (`poster.alt`). **None generated.**
- [ ] Optional: a recorded audio-described version, only if you decide it's needed. It would need recording in the original production.
- [x] Ad Detective videos and captions unchanged on its own site.

## 4. College authorization safeguards
- [x] `site/data/access.json` → `college.enabled` is **false** (tests check this).
- [ ] The college code is known only to you; the enrollment notice shows before entry.
- [ ] APA Academy and APA Scholar are hidden without the authorized college pathway (check in a student browser).
- [x] No page implies concurrent enrollment or college credit. The enrollment notice is preserved verbatim.

## 5. Preview and production storage separation
- [ ] Preview site shows the DEVELOPMENT PREVIEW bar; production does not.
- [x] Production `site/data/preview.json` is absent (tests and the production workflow both refuse it).
- [ ] On one laptop: make progress on the preview, open production, and confirm production progress is unchanged.
- [x] Preview links to Ad Detective go to `/ad-detective-preview/`, never to the real Ad Detective.
- [ ] Optional: create `ad-detective-preview` (steps in `docs/preview/ad-detective-preview.md`).
- [ ] Ad Detective `dev` published to `ad-detective-preview` (approved for preview testing). Production publication is **not approved**. Until it is, Master Ad Detective shows 0 progress on the production site.

## 6. Scheduling accuracy
- [ ] Calendar file matches the KCKPS 2026–27 calendar (no-school days, semesters).
- [ ] Odd/even group days and the Wednesday alternation are correct for both semesters (Lesson Manager → Calendar).
- [ ] Unit release dates and times (Central Time) set as intended; released units stay open.
- [ ] Journal numbers and the 10-journal sets correct for both groups; past numbers unchanged.

## 7. Teacher Lesson Manager publishing workflow
- [x] Workflow test run in a browser: edit, preview, export, then the tests pass with the exported files. Drafts don't reach student devices. See `docs/TEACHER_WORKFLOW_TEST.md`.
- [ ] Repeat it on a district laptop: upload to `dev`, tests pass, preview updates.
- [ ] Research assignment settings set for the informative and persuasive speeches.
- [ ] AI permissions set per assignment where different from grammar-and-spelling; ELD option where intended.
- [ ] Teacher code (`access.json` teacher hash) changed if it has been shared.

## 8. Achievement functionality
- [ ] A test student earns one knowledge badge, Bridge Builder, Independent Thinker and Citation Specialist on a laptop.
- [x] Confident Speaker, Master Storyteller and Master Communicator stay "not available yet". Canvas is the official record (tests check this).
- [x] Learning points don't increase when activities are repeated, including Ad Detective cases (tests check this).
- [ ] Master Ad Detective: after Ad Detective is published, a test student masters one case and sees 1 of 6 on My achievements.
- [ ] Badges are described as practice, not grades, on the achievements page.

## 9. Accessibility review (target WCAG 2.2 AA; see `docs/reviews/accessibility-performance-review.md`)
- [x] Automated pass on every student route, English and Spanish (`docs/reviews/student-experience-review.md`).
- [ ] Screen-reader pass (NVDA or ChromeVox) on the dashboard, one lesson, one studio and the Lesson Manager.
- [ ] Keyboard-only pass through a full lesson and the Beyond the Podium lab, including "Read what the film shows aloud".
- [ ] 200% zoom on a district laptop.
- [ ] Dark-mode spot-check on the studios.

## 10. District laptop testing
- [ ] Load, play the film with captions (try both video qualities), print a summary, and copy to Canvas on a district laptop (1366×768 typical).
- [ ] Clipboard and downloads allowed by district settings; `localStorage` not cleared between classes (or students know to back up).
- [ ] "Read what the film shows aloud" speaks on ChromeOS. If no voice is installed, the transcript still works.

## 11. School network testing
- [ ] Site loads in class on the school network at the start of a period, with several students at once.
- [ ] The film plays without long buffering. If not, students use the 720p copy.
- [ ] No resource blocked by the district filter (fonts, media, GitHub Pages, Ad Detective).

## 12. Student classroom pilot (next step)
- [ ] One class follows `docs/pilot/PILOT_GUIDE.md`: dashboard → today's lesson → handwritten journal → stand and share → one activity → achievements → backup.
- [ ] Anonymous feedback collected (`docs/pilot/STUDENT_FEEDBACK.md`). Top problems fixed before a full release.
- [ ] Typed-journal code given only to students with that permission; Canvas submission steps tried.

## 13. GitHub deployment safeguards
- [ ] Settings → Environments → github-pages → Deployment branches = `main` only.
- [x] `deploy.yml` deploys only from `main` after `node --test tests/*.test.mjs` passes. It refuses `preview.json`.
- [x] The `speaking-lab-preview` repository's `preview.yml` is yours, untouched. No second preview workflow exists in this repository.
- [ ] All tests pass on `dev` in GitHub Actions before merging.

## 14. Backup and rollback
- [x] The live site before 2.0 is tagged `v1-live-2026-11-23`.
- [ ] Tag the release (`v2-YYYY-MM-DD`).
- [ ] Rollback steps known: on `main`, `git revert` the release commit (or restore the last good tag's files) and push.
- [ ] Students reminded that progress is per browser; "My work → Download my backup file" shown in class once. Ad Detective has its own backup in its Notebook.
