# Speaking Lab 2.0 — Development Roadmap

Status as of Nov 24, 2026. All work is on branch `dev`; nothing is deployed until the owner approves.
Baseline before 2.0: tag `v1-live-2026-11-23`.

| Slice | Scope | Status |
| --- | --- | --- |
| 1 | Data files, journals, fail-closed college gate, tests | Approved |
| 2 | Page reads JSON, Central Time, schedule + journal engine | Approved |
| 3 | Entrance, six tiles, unit environments, Daily Learning Dashboard, archive | Approved with refinements (done in 4) |
| 4 | Release dates on the classic guide, teacher view, achievements, learning summary, content review, listening-key fix | Approved |
| 5 | Teacher Lesson Manager, presentation mode, substitute and weekly plans, validated export/import | Approved with refinements (done in 6) |
| 6 | Beyond the Podium Episode 1 lab, Bridge Builder, Lesson Manager validation fixes | Approved (film, thumbnail, captions to be supplied) |
| 7 | AI Coaching Studio, assignment AI permissions, Independent Thinker, development preview build | Built, awaiting review |
| 8 | Research & Academic Integrity Studio, APA Academy (college) | Proposed |
| 9 | MLL scaffold levels, college depth, classroom pilot, production release | Proposed |

## Before the first production release
- Connect the preview repository: add the preview-file step from `docs/preview/deploy-preview.yml` to its workflow and confirm the preview bar appears at /speaking-lab-preview/.
- Review the AI Coaching Studio's English and Spanish (content review document) and set AI permissions on the lessons that need something other than the grammar-and-spelling default.
- Add the Episode 1 film, thumbnail (with a short description) and caption files at `site/media/btp/ep1/`, set their `available` flags, and check the Watch stage on a district laptop. Review the lab's Spanish (content review document) and the Spanish captions before marking them reviewed.
- Decide whether the film file is small enough for GitHub Pages and the school network (GitHub warns above 50 MB and refuses files above 100 MB).
- Try the Lesson Manager on a district laptop: edit one lesson, export, upload to the dev branch, confirm the tests pass.
- Owner review of the content review document: 80 daily objectives (EN/ES), journal Spanish, college notice Spanish.
- Spanish for the 15 pacing-guide lines listed in that document.
- Owner decision on the teacher view code (`site/data/access.json`) and confirming college stays off.
- Classroom check on a district laptop and school network (load time with audio/video).
- Recommended repo setting: Settings → Environments → github-pages → Deployment branches = `main` only.

## Proposed next slices (each needs approval)
8. **Research Studio and APA Academy.** Case files on plagiarism and attribution, oral/written/reference citations; APA 7 checked against apastyle.apa.org; college-only Academy. Awards Citation Specialist.
9. **Achievement integrations.** Ad Detective completion (same origin, read-only, validated record), teacher verification for communication badges (needs a real process, e.g. Canvas), typed-journal accommodation with export.
10. **Beyond the Podium, later episodes** (each one approved separately): a new `site/data/btp/episode-N.json` and studios entry; possible topics active listening, repair (Episode 2 could revisit the same conflict), technoference, nonverbal, group communication, empathy, conflict resolution, assertiveness. Video branching only if approved; text branching works now.

## Integration points already in place
- `site/data/studios.json` lists each experience, its units and status; coming items never link; `route` + `episode` open an in-site experience (Beyond the Podium).
- `site/data/achievements.json` names future badges with `integrations` and `external` criteria; they are shown as "Coming later" and cannot be earned.
- `js/progress.js` and `js/achievements.js` read existing keys only; new sources add a `collect` field and a criterion type.
