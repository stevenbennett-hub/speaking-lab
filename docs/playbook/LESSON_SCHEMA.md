# Proposed reusable teacher lesson schema (Instructor Playbook, schema 1)

**Status:** proposal, used by the Unit 1 prototype (`site/data/playbook/unit-1.json`). Units 2–6 will use the same shape after Unit 1 is approved.

## Design rules
1. **One source of truth.**
   - Objectives, college objectives, success criteria, journals and AI permissions stay in `lessons.json` and `journals.json`.
   - Speech assignments and rubrics stay where they are.
   - The playbook adds only teacher guidance, keyed by the same lesson keys (`wWWdD`).
   - The validator refuses playbook entries that contain `learn`, `lang`, `success` or `prompt`.
2. **Planned days ≠ class meetings.**
   - The playbook is written per planned day (a "segment").
   - Each class meeting is computed from the live schedule (odd/even group, Wednesday rotation, holidays, overrides). `compose()` fits that meeting's segments into the 90-minute block.
3. **Teacher-facing only.** The file is loaded by the Lesson Manager, never by the student pages. A test checks this.
4. **Draft until approved.** `status` is `draft` until Mr. Bennett changes it.
5. **No invented media facts.**
   - Video segments stay blank (`verified: false`) until the teacher previews the video.
   - The validator refuses timestamps not marked verified.
6. **No student information.** The file never contains student information, and printable resources never collect names, IDs or disability information.

## File: `site/data/playbook/unit-N.json`
```text
{
  schema: 1, unit: N, status: "draft" | "approved", updated: "YYYY-MM-DD",
  framework: [{ id, name, what }]            Learn → Observe → Investigate → Practice → Perform → Reflect
  block: { minutes: 90, journal: 15, transitions: 3, note }
  overview: {
    title, essential, questions[], understandings[], summative,
    arc: [{ phase, where, what }],            where each phase happens in the unit
    vocab[], readings[], materials[], prep[], scheduling[], speechDays, btp, spare[], college, access, ml
  }
  videos: [{
    id, title, speaker, channel, url (https), upload (official / college / personal), onSite, lessons[],
    purpose, segment: { start: "m:ss"|null, end: "m:ss"|null, verified: bool, note },
    before, during, pauses[], after, practice, check, language, college, captions, alternative
  }]
  lessons: {
    "wWWdD": {
      title, essential, vocab[], materials[], prep[],
      phases: [{
        phase, title, min, short?, core (bool), fill? (bool: speech time absorbs the rest of the block),
        teacher[] (steps and talking points), students, check?, video? (a video id)
      }],
      discuss[], misconceptions: [{ m, fix }], ml[], access[], extend[],
      formative: { evidence, lookFor[], respond }, ai (advice; the real setting is the lesson's `ai`),
      canvas[], exit, reflect[] (teacher reflection prompts), sub: { ok (bool), plan[] }
    }
  }
  flex: { journal (a flex journal id), title, when, phases[], note }
  resources: [{ id, title, use, lines[] }]   printable formative-assessment tools
  sub: { general[] }                         substitute rules for every day
}
```

## How a meeting plan is built (`SLPlaybook.compose`)
1. Budget = 90 − 15 (journal and stand and share) − 3 (transitions) = **72 minutes**.
2. Each planned day in the meeting contributes its **core** phases. A day already taught at an earlier meeting of the unit becomes 10 minutes of review. In fall the first "getting started" day repeats w01d1.
3. If core time is over budget, the phases with a `short` time shrink, biggest savings first. If it is still over, the plan says "over by N minutes".
4. `fill` phases (speeches) get whatever time is left. The plan shows the minutes and about how many speakers fit (3 minutes each for high school).
5. **Stretch** phases are added in order while they fit. The rest are listed as "don't fit today".
6. Ten or more spare minutes show the unit's `spare` options.

## Where teachers see it
| Where | What |
| --- | --- |
| Lesson Manager → **Playbook** | Unit overview, meeting map for the chosen semester and group, formative resources, lesson list |
| `#/teacher/playbook/N/YYYY-MM-DD` | The full plan for that class meeting (also linked from each date in the Calendar) |
| `#/teacher/playbook/N/wWWdD` | One planned day |
| `#/teacher/playbook/N/videos` | Video viewing guides |
| `#/teacher/print/plan/YYYY-MM-DD` | The printable teacher plan |
| `#/teacher/print/playbook/N` | The printable unit overview, resources and video guides |
| `#/sub/...` (existing) | Now adds the playbook's substitute steps |

## Editing and teacher notes
- **"My notes" per planned day** are saved only on this browser (`speakup-teacher-notes-v1`).
  - Notes print with the plan, and "Download my notes" saves them as text.
  - They never contain student names.
  - Like the other `speakup-teacher-*` keys, they are not in the student backup file.
- **The guidance itself is edited in the JSON file** and uploaded to `dev`, like any data file. The tests validate it.
  - The Lesson Manager does not get a second, competing lesson editor.
  - Adding playbook editing to the Lesson Manager (drafts, review status, export) is a possible later step. It needs approval.

## Units 2–6
Create `site/data/playbook/unit-N.json` with the same shape. Then run `node --test tests/*.test.mjs`: the validator checks every planned day of the unit, the video guides, the phases and the resources. Nothing else needs to change.
