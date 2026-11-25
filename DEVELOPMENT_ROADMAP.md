# Speaking Lab 2.0 — Development Roadmap

Status as of Nov 24, 2026.
- All work is on branch `dev`. Nothing is deployed until the owner approves.
- Baseline before 2.0: tag `v1-live-2026-11-23`.
- **Feature development is paused after Slice 10 until the classroom pilot has been held.** The priorities now are instructional effectiveness, accessibility, reliability and classroom usability.

| Slice | Scope | Status |
| --- | --- | --- |
| 1 | Data files, journals, fail-closed college gate, tests | Approved |
| 2 | Page reads JSON, Central Time, schedule + journal engine | Approved |
| 3 | Entrance, six tiles, unit environments, Daily Learning Dashboard, archive | Approved |
| 4 | Release dates on the classic guide, teacher view, achievements, learning summary, content review | Approved |
| 5 | Teacher Lesson Manager, presentation mode, substitute and weekly plans, validated export/import | Approved |
| 6 | Beyond the Podium Episode 1 lab, Bridge Builder | Approved |
| 7 | AI Coaching Studio, assignment AI permissions, Independent Thinker, development preview build | Approved |
| 8 | Research & Academic Integrity Studio, APA Academy (college), ELD AI option | Approved |
| 9 | Classroom readiness: Episode 1 film, language support preferences, research settings, typed journal, college Unit 5, accessibility review | Approved |
| 10 | Integration and pilot readiness: 720p film copy, visual descriptions, Spanish captions (draft), Ad Detective mastery (separate `dev` branch) and Master Ad Detective, rubric mapping for teacher-verified badges, typed-journal notice, student experience review, teacher workflow test, pilot guide, questionnaire, readiness checklist | Approved (release candidate; production pending) |
| 11 | Navigation for a daily platform (Today's Lesson, My Course, Learning Labs, Resources, My Achievements; teacher tools apart) and the Instructor Playbook prototype for Unit 1: resource audit, ten planned-day plans, meeting plans for the real blocks, video guides, substitute and printable plans, formative resources, reusable schema | Built, awaiting review |

## Next: review the refined Unit 1 prototype (Quick Teach, substitute plans, editing), then the classroom pilot
The Slice 11 navigation is approved for preview testing. Answer the Playbook's "Needs your confirmation" list.

## (earlier) Review the Unit 1 Instructor Playbook
Review the Unit 1 playbook (Lesson Manager → Playbook). Preview the videos and fill in the segments. Units 2–6 playbooks are written only after Unit 1 is approved, using `docs/playbook/LESSON_SCHEMA.md`.

## Classroom pilot (no new student features)
Follow `docs/pilot/PILOT_GUIDE.md` with one class, then fix what the pilot shows. After that, work through `docs/RELEASE_CHECKLIST.md` (the full list) before any production release.

## Decisions and dependencies still open
- **Content review:** "Speaking Lab Content Review (Slice 10)".
  - English objectives and all Spanish are draft.
  - 15 pacing lines need Spanish.
- **Beyond the Podium:**
  - The episode thumbnail and its description have not been supplied.
  - Review the Spanish captions and the visual descriptions.
  - A recorded audio-described version is optional (`docs/reviews/btp-audio-description.md`).
- **Ad Detective:**
  - Approve publishing its `dev` branch.
  - Optionally create `ad-detective-preview` (`docs/preview/ad-detective-preview.md`).
- **Teacher-verified badges:** the threshold and verification-route decisions are in `docs/proposals/teacher-verified-rubric-mapping.md`.
- **District checks:** laptop, network and screen reader (checklist sections 9–11).
- **Repo setting (recommended):** Settings → Environments → github-pages → Deployment branches = `main` only.

## Later (each needs separate approval, after the pilot)
- Beyond the Podium episodes after Episode 1, each approved separately. Each is a new `site/data/btp/episode-N.json` plus a studios entry. Do not produce Episode 2 without approval.
- A verification route for the communication badges (Canvas Outcomes, or Canvas Credentials if the district authorizes it).

## Integration points already in place
- `site/data/studios.json` lists each experience, its units and status. "Coming" items never link. `route` + `episode` open an in-site experience.
- `site/data/achievements.json` holds every badge.
  - Criteria types are documented in its `$comment`.
  - External sites are read only through a validated, versioned summary (Ad Detective: `addetective-mastery-v1`).
- `js/progress.js` and `js/achievements.js` read existing keys only. New sources add a `collect` field and a criterion type.

## After Slice 12 (needs approval)
- Listen to the sound library in place and mark it reviewed (`docs/SOUND_DESIGN.md`).
- Decide on the lab mastery proposals (`docs/proposals/lab-mastery-proposals.md`).
- Continue harmonizing legacy lab styling with the design system, one lab at a time.
- Approve the refined Unit 1 workflow and the unified application, then write the Unit 2–6 playbooks.
- Real teacher verification for communication badges (Canvas Outcomes exploration), so that gold celebrations can happen.


## Portable achievements (built on `dev`, needs review)
- Review the certificate and portfolio wording, the competency grouping and the Spanish (draft).
- Ask district technology / student-privacy leadership to review `docs/privacy/STUDENT_PRIVACY_AND_DATA_HANDLING.md`.
- Test printing on a school printer and Email to Myself on a district MacBook during the pilot.
- Approved (Nov 24) for development preview testing. Next milestone: hands-on preview testing and instructor approval of the unified application.

## Future accessibility work (needs approval)
- **Accessible certificate and portfolio exports.** Today's PDFs are page images, which screen readers cannot read. Options:
  - a text-based PDF with embedded fonts, real text and a reading order (tagged where feasible);
  - an accessible HTML export of the same content.
  - Either must keep the privacy rules: no metadata with names, generic filenames, generated locally.
