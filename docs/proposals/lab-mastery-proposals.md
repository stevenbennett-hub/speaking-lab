# Proposals: mastery records for four labs (not implemented)

**Status:** proposals for Mr. Bennett. Nothing here is built.
- No achievement criteria, points or badges were added or changed.
- The four labs below show no progress line in Learning Labs today, because none of them gives the achievement engine a mastery record. I won't invent one.

**Guiding rule (unchanged):** mastery comes from checked work in the lab, never from opening a page, watching or clicking. The site never judges spoken performance or the quality of a student's writing.

| Lab | What it saves now (`localStorage`) | Proposed record | Learning points | Badge |
| --- | --- | --- | --- | --- |
| **Communication Model Lab** (`mlab`) | `speakup-mlab-v1`: the level reached per situation; the lab already shows "N of 3 situations mastered" | **Situation mastered** = that situation finished at Level 3, with every part placed correctly. The lab's own `max` record would be exposed as `MLab.summary()`, like the Research Lab's. | 1 learning-point item per situation (3 in all), like other lab activities | Optional: include "all three situations" as a second requirement of **Communication Explorer**. That would change an existing badge, so it needs your approval; otherwise no badge. |
| **Speech Outline Builder** (`obuild`) | `speakup-outline-v1`: the outline, plus `OBuild.summary()` → checklist items passed of total, and the speech type | **Outline checklist complete** = every checklist item passes for a speech type (informative, persuasive…), counted once per type | 1 item per speech type | None recommended. The checklist checks structure, not quality; your grade of the real outline is the record. |
| **Impromptu Speaking Challenge** (`implab`) | `speakup-imp-v1`: topics, prep and speaking timers, reflections | **No mastery.** Show a practice record only, for example "3 practice rounds completed", where a round = topic locked + timed speech finished + reflection written. | None (practice, not mastery) | None. Spoken delivery can only be judged by you. |
| **Story Builder** (`storylab`) | `speakup-story-v1`: the story chosen, arc map, details, practice runs | **Story plan complete** = a story is chosen, every arc step is mapped, the "bring it to life" items are done, and at least one timed practice run is recorded | 1 item, once | None recommended. The narrative speech itself stays with Master Storyteller (teacher-verified, pending). |

## If approved
1. Add a read-only `summary()` to each lab (the same pattern as the Research Lab), changing no stored data.
2. Add the records to `js/achievements.js` collect and points, with the tests used for the other labs: no duplicates, and best results kept.
3. Learning Labs shows the new progress lines automatically.
4. Achievement criteria change only for the badges you name.
