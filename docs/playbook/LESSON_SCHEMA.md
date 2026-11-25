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
    vocab[], readings[], materials[], prep[], scheduling[], speechDays, btp, spare[], college, access, ml,
    speech: { minutes, colMinutes, feedback, transition, note },   default per-speaker planning minutes
    confirm: [{ id, q, why }]                                       open questions for the teacher (never auto-applied)
  }
  videos: [{
    id, title, speaker, channel, url (https), upload (official / college / personal), onSite, lessons[],
    purpose, segment: { start: "m:ss"|null, end: "m:ss"|null, verified: bool, note },
    before, during, pauses[], after, practice, check, language, college, captions, alternative
  }]
  lessons: {
    "wWWdD": {
      title, status ("draft" | "approved"), essential, vocab[], materials[], prep[],
      phases: [{
        phase, title, min, short?, core (bool), fill? (bool: speech time absorbs the rest of the block),
        before? (bool: on the first class day, taught before the journal), teacher[] (steps and talking points),
        students, check?, video? (a video id), lab? (a lab id: mlab, audlab, …), read? (textbook chapter 1–14),
        route? (a site link starting with #, e.g. "#/ai/ownership")
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

## Class-wide file: `site/data/playbook/classroom.json`
`{ status, expectations[], accommodations, contact }`: the classroom expectations and the accommodations rule printed on every substitute plan.

## How a meeting plan is built (`SLPlaybook.compose`)
1. Budget = 90 − 15 (journal and stand and share) − 3 (transitions) = **72 minutes**.
2. Each planned day in the meeting contributes its **core** phases. A day already taught at an earlier meeting of the unit becomes 10 minutes of review. In fall the first "getting started" day repeats w01d1.
3. If core time is over budget, the phases with a `short` time shrink, biggest savings first. If it is still over, the plan says "over by N minutes".
4. `fill` phases (speeches) get whatever time is left. The plan shows the minutes and about how many speakers fit (3 minutes each for high school).
5. **Stretch** phases are added in order while they fit. The rest are listed as "don't fit today".
6. Ten or more spare minutes show the unit's `spare` options.
7. On the course's first class day, phases marked `before` move ahead of the journal. Every other class stays journal-first.
8. **Speech capacity:**
   - Minutes per speaker = speech length + feedback + transition. The defaults are in `overview.speech`; the teacher can change them in Planning settings.
   - Speaker slots are counted across the unit's speech blocks and compared with the class size the teacher enters.
   - If the class doesn't fit, a warning appears. The schedule is never changed.

## Where teachers see it
| Where | What |
| --- | --- |
| Lesson Manager → **Playbook** | Unit overview, planning settings (class size, minutes per speaker), meeting map with the capacity check, questions that need your confirmation, formative resources, lesson list |
| `#/teacher/playbook/N/YYYY-MM-DD` | **Quick Teach** (the default daily plan): objectives, success criteria, AI permission, Canvas reminders, materials and prep, a timed sequence with direct links (viewing guide, video, lab, reading, studio), formative check, exit. Each date in the Calendar links to it. |
| `…/YYYY-MM-DD/full` | The full instructional plan, built from the same data |
| `#/teacher/print/quick/DATE` | Quick Teach on one printed page |
| `#/teacher/print/sub/DATE` | Concise substitute plan (1–2 pages): the site address, classroom expectations, accommodations, a timed plan and notes |
| `#/sub/...` (existing) | The comprehensive substitute plan, now with the expectations and the playbook's steps |
| `#/teacher/print/plan/DATE`, `#/teacher/print/playbook/N` | The full plan; the unit overview and video guides |
| `#/teacher/playbook/N/edit/wWWdD` | **Edit a planned day:** timing, talking points, materials, discussion, differentiation, formative check, exit ticket, substitute steps, review status |
| `#/teacher/playbook/N/edit/video/ID` | **Edit a viewing guide.** Segment times are saved only after "I previewed the video and checked these times" is ticked. |

Printed plans use the configured public address (`config.json` → `site`) and never `localhost`. The export tool fails if a PDF contains a localhost address.

## Slice 12 refinement fields (`overview`)
- `speechAssigned: "wWWdD"`: the planned day the unit's speech is assigned. Substitute plans offer speech rehearsal only from that day.
- `subStarter: { labs[], note }`: introductory labs a substitute may use on any day of the unit. Otherwise only labs and readings already linked in this or earlier planned days are offered.
- `exitFromJournal: [{ lesson, journal, when, status }]`: when a group's schedule skips that journal, its prompt becomes the exit reflection of the block containing `lesson`. Journal numbering and `lessons.json` never change.

## Slice 12 rules
- **AI permission.** The permission is the lesson's `ai` setting in `lessons.json`, or the class default when there is none. The playbook's `ai` field is a teaching note only. `aiConflicts()` flags notes that say "no AI" while the permission allows AI; they are listed under Needs your confirmation and never changed automatically. See `AI_PERMISSION_REPORT.md`.
- **Concise substitute plans** use `subTimeline()` and always cover exactly 90 minutes:
  - journal and stand and share (15);
  - each substitute-suitable planned day's steps, or the written alternative on speech days;
  - independent practice in the unit's existing labs;
  - reading, vocabulary or speech rehearsal (never scored);
  - exit reflection and self-check (5);
  - final procedures (3).
- **Quick Teach** has two columns on screen and prints on one page. Every Unit 1 meeting fits.
  - Left column: objectives, timed sequence.
  - Right column: success criteria, prep and materials, journal and stand and share, direct links, formative check and exit, AI and Canvas.

## Editing, drafts, review and export
- **Edits are Lesson Manager drafts** (`speakup-teacher-drafts-v1` → `playbook`, this browser only).
  - They appear immediately in Quick Teach and the full plan on that browser.
  - They are listed in **Publish** as `site/data/playbook/unit-N.json`. Export is blocked while that file has validation errors.
  - They are included in the drafts backup, and can be imported back.
- **No second lesson editor.** Objectives, success criteria, journals and assignment requirements are still edited in the existing lesson and journal editors.
- **Review status per planned day:** draft or approved. Changing approved guidance sets it back to draft unless you choose "approved" in the same save. Nothing is ever approved automatically.
- **"My notes"** (`speakup-teacher-notes-v1`) and **planning settings** (`speakup-teacher-planning-v1`) are local teacher data. Like every `speakup-teacher-*` key, they are not in student backups.

## Units 2–6
Create `site/data/playbook/unit-N.json` with the same shape. Then run `node --test tests/*.test.mjs`: the validator checks every planned day of the unit, the video guides, the phases and the resources. Nothing else needs to change.
