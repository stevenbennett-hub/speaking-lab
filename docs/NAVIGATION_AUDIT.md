# Navigation audit (Slice 12: the unified application)

Done Nov 24, 2026, on `dev`. The Slice 11 audit follows below, unchanged, as history.

## What was still competing
| Finding | Effect on students | Slice 12 change |
| --- | --- | --- |
| **Learning Labs** linked to `#labs`, the classic one-page guide | Clicking it left the application and dropped students halfway down the long landing page. | `#/labs` is its own view. A lab opens at `#/labs/<lab>`: the page's own lab, moved into the application, with breadcrumbs back to Learning Labs, Today's Lesson and My Achievements. |
| **Resources** was a drop-down of classic section links | The same problem, nine times over. | `#/resources` is a library of ten areas with search. Each area shows the existing section inside the application (`#/resources/videos`, …). |
| **Brand** linked to `#top` | It returned students to the classic landing page. | The brand goes to My Course (`#/`). The classic guide is still linked as "Full course guide" at the bottom of My Course and Resources. |
| **Today's Lesson** redirected to `#/unit/N` | The header marked the wrong place, and Back went somewhere unexpected. | `#/today` is its own view, using the same schedule logic as the unit's Today tab. |
| **Level switch (High School / College)** in the permanent header | Students had already chosen a pathway, so the switch was redundant. | Removed from the header and moved to **Preferences → Course pathway**. College still goes through the existing instructor gate and stays off by default. |
| **My work, Dark mode** in the header | Utility clutter beside the student navigation. | Moved to Preferences (Progress backup; Appearance). Language stays in the header. |
| Lab buttons on Today's Lesson | They needed the unit view. | They open the lab in Learning Labs. |

The original controls are still in the page, hidden (`#hdrHold`). The college gate, theme and backup handlers therefore work unchanged.

## Header now
Speak Up / Speaking Lab · **Today's Lesson** · **My Course** · **Learning Labs** · **Resources** · **My Achievements** · English/Español · (Mute sounds, only while sound is on) · (Teacher tools, teacher view only) · **Preferences**

Every header link opens an application view. None returns to the classic landing page (tested).

## Compatibility (browser-tested, `slice12-test-results.txt`)
- **Old links still open the classic page:** `#labs`, `#videos`, `#rubrics`, `#unit-3`, `#lab-model` and the rest, including Canvas links and bookmarks.
- **Every `#/…` route still works:** `#/unit/N/labs`, `#/btp/1`, `#/ai`, `#/research`, the teacher routes.
- **Browser Back and Forward** move between the views.
- **In-page links inside a hosted lab or section** stay in the view. A link to a whole section (`#labs`, `#videos`) still opens the classic page.
- **Unchanged:** storage keys and saved progress. New keys: `speakup-prefs-v1` for sound and motion preferences.
- **Spanish:** every label is translated (Lección de hoy · Mi curso · Laboratorios · Recursos · Mis logros · Preferencias).

---

# Navigation audit and refinement (Slice 11)

Done Nov 24, 2026, on `dev`, before changing anything. Mr. Bennett's goal: Speaking Lab is now a daily instructional platform, so the header should lead with today's lesson.

## Before
The header had a link to **My course** (added by the student view), then nine classic section links:
- Start · Units · Practice Labs · Voices of Change · Rubrics · Due dates · Pacing · Resources · About

On the right were the utility controls:
- Español/English
- My work
- Dark mode
- Level (High School / College)

### Duplication found
| Item | Duplicates | Finding |
| --- | --- | --- |
| **Start** (`#top`) | Brand logo (`#top`); My course | Leads to the top of the long one-page guide (welcome and course map). It no longer matches how class starts each day. |
| **Units** (`#units`) | My course (six unit tiles with state and release dates); each unit's tabs | Two ways to reach units, and the classic list has no release or progress information. |
| **Practice Labs** (`#labs`) | Each unit's "Labs and studios" tab | Keep one header entry for the full lab collection; unit tabs keep the unit-specific view. |
| **Voices of Change, Rubrics, Due dates, Pacing** | Rubrics are also in each Unit guide. Due dates and pacing are also in "Lessons and journals". | Reference material. It belongs together under Resources, not as four top-level buttons. |
| **Resources** (`#resources`), **Example videos** (`#videos`), **References** (`#references`) | Videos and references had no header link at all | Textbook, videos, model speeches and references were split up. Now one Resources menu holds them. |
| **About** | — | Reference; moves into Resources. |
| **Achievements** | Only reachable from My course | Students asked where badges are, so it gets a top-level link. |
| **Teacher view** | Only reachable from My course | Teacher tools should be easy to reach for the teacher but separate from student navigation. |

## After
**Primary student navigation** (one row on a 1366×768 or 1280×720 district laptop):

| Label (EN / ES) | Goes to | Notes |
| --- | --- | --- |
| **Today's Lesson** / Lección de hoy | `#/today` | Returning students go straight to their current unit's Today page, with objectives, language objectives, success criteria, the journal and activities.<br>First-time students choose a pathway, then their class periods, then land on the lesson.<br>Follows the calendar, odd/even blocks, Wednesdays, release dates, overrides and `?date=` (teacher or preview). If no unit is open (before or after the course), it opens My Course. |
| **My Course** / Mi curso | `#/` | All six units (tiles with state and release dates), progress, language support. |
| **Learning Labs** / Laboratorios de aprendizaje | `#labs` | The full lab collection; the section heading was renamed to match. |
| **Resources ▾** / Recursos | menu | Textbook and tools · Example videos · Voices of Change (model speeches) · Rubrics · Due dates · Pacing guide · Course map · References · About |
| **My Achievements** / Mis logros | `#/achievements` | |

**Utility controls**, kept visually separate on the right:
- Language
- **Teacher tools**: only shown in teacher view; opens the Lesson Manager, which includes the Instructor Playbook
- My work (backup)
- Dark mode
- Level

**Removed from the header:** Start and Units.
- Their content is unchanged.
- `#top` is still the brand link and the "Course map" item.
- `#units` still works as a link.
- My Course shows all six units.

## Compatibility
- **Every old link still works:** `#top`, `#units`, `#labs`, `#speeches`, `#rubrics`, `#dates`, `#pacing`, `#videos`, `#resources`, `#references`, `#about`, the lab links (`#lab-model`, …), and every `#/…` route. Tested in a browser.
- **No instructional content was removed or moved.** The classic sections are where they were.
- **Saved progress is unchanged.** Only labels and header links changed; no storage keys.
- **Accessibility:**
  - The Resources menu is a disclosure button (`aria-expanded`, `aria-controls`) with an accessible name. It is a button, not a link.
  - Enter or Space opens it. Tab moves through the items. Escape closes it and returns focus. Clicking or tabbing outside closes it.
  - The current page is marked with `aria-current` on the matching header link: Today's Lesson on a unit's Today page, My Achievements, Teacher tools, otherwise My Course.
- **Phones and narrow windows** (under 720 px): the header row already scrolls sideways, so the Resources items show inline instead of in a drop-down (no clipped menu).
- **Spanish:** all new labels are in the page's translation table, or set by the student view in both languages.

## Not changed (for your judgment)
- **Each unit's tab "Labs and studios"** keeps its name. It holds that unit's labs plus studios (Beyond the Podium, AI Coaching, Research), which is more than the Learning Labs section.
- **The Level switch (High School / College)** stays with the utility controls. It is the existing college gate.
- **"Course map"** is the old Start/top of the one-page guide, including the welcome video.
