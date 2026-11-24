# Speaking Lab 2.0 — Development Roadmap

Status as of Nov 24, 2026. All work is on branch `dev`; nothing is deployed until the owner approves.
Baseline before 2.0: tag `v1-live-2026-11-23`.

| Slice | Scope | Status |
| --- | --- | --- |
| 1 | Data files, journals, fail-closed college gate, tests | Approved |
| 2 | Page reads JSON, Central Time, schedule + journal engine | Approved |
| 3 | Entrance, six tiles, unit environments, Daily Learning Dashboard, archive | Approved with refinements (done in 4) |
| 4 | Release dates on the classic guide, teacher view, achievements, learning summary, content review, listening-key fix | Approved |
| 5 | Teacher Lesson Manager, presentation mode, substitute and weekly plans, validated export/import | Built, awaiting review |
| 6 | Beyond the Podium lab (Episode 1, existing film) | Proposed |
| 7 | AI Coaching Studio | Proposed |
| 8 | Research & Academic Integrity Studio, APA Academy (college) | Proposed |
| 9 | MLL scaffold levels, college depth, classroom pilot, production release | Proposed |

## Before the first production release
- Try the Lesson Manager on a district laptop: edit one lesson, export, upload to the dev branch, confirm the tests pass.
- Owner review of the content review document: 80 daily objectives (EN/ES), journal Spanish, college notice Spanish.
- Spanish for the 15 pacing-guide lines listed in that document.
- Owner decision on the teacher view code (`site/data/access.json`) and confirming college stays off.
- Classroom check on a district laptop and school network (load time with audio/video).
- Recommended repo setting: Settings → Environments → github-pages → Deployment branches = `main` only.

## Proposed next slices (each needs approval)
6. **Beyond the Podium.** Seven-stage lab around the approved 55-second film (no new media): observe, watch with captions/transcript, investigate barriers, verbal/nonverbal/vocal cues, both perspectives, alternative responses with I-statements, reflect and print. Awards Bridge Builder; links the Unit 1 flex journal.
7. **AI Coaching Studio.** Prompt library, ethics scenarios, assignment-level AI permission indicator, disclosure template. Awards Independent Thinker; extends Ethical AI User.
8. **Research Studio and APA Academy.** Case files on plagiarism and attribution, oral/written/reference citations; APA 7 checked against apastyle.apa.org; college-only Academy. Awards Citation Specialist.
9. **Achievement integrations.** Ad Detective completion (same origin, read-only, validated record), teacher verification for communication badges (needs a real process, e.g. Canvas), typed-journal accommodation with export.

## Integration points already in place
- `site/data/studios.json` lists each experience, its units and status; coming items never link.
- `site/data/achievements.json` names future badges with `integrations` and `external` criteria; they are shown as "Coming later" and cannot be earned.
- `js/progress.js` and `js/achievements.js` read existing keys only; new sources add a `collect` field and a criterion type.
