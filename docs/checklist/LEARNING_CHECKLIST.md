# My Learning Checklist, Weekly Grading Checkpoint and weekly assessment overview

**Status:** built on `dev` for Release Candidate 1 review. Not deployed.
- Tasks, grading proposals and new Spanish text are **drafts** until Mr. Bennett reviews them.
- Files: `site/js/checklist.js`, `site/data/checklist.json`, styles in `site/css/app.css`.
- Tests: `tests/checklist.test.mjs`. Alignment table: `docs/checklist/UNIT1_ASSESSMENT_ALIGNMENT.md` (`node tests/tools/alignment.mjs`).

## Students: Today's Lesson → My Learning Checklist
The checklist sits at the top of **Today's Lesson**. There is no new navigation tab.

| Question | Where students find the answer |
| --- | --- |
| What am I doing today? | **Today**: the tasks for the student's actual class day (their odd/even periods, pathway, holidays, closures and extended lessons), journal first. |
| What do I need to finish this week? | **This Week**: every class meeting in the current instructional week, grouped by day, with a progress bar. |
| What will be graded? | **Weekly Grading Checkpoint**, at the top of This Week and summarized on Today. It shows only assignments Mr. Bennett has designated as graded: points (only where already set), dates, how to submit, and the rubric link. |
| Where do I submit my work? | Each graded task says how to turn it in. Canvas is named as the official place, with a link through ClassLink. |
| What have I already completed? | Checkmarks and automatic records, and "x of y required tasks done". |

**What each task shows:** title, short instructions, estimated time, kind labels, Required or Optional, completion status, the day (as its due date in the weekly view), the Graded label when approved, a link to the activity, and Canvas instructions.

**Labels:**
- The four kinds are **Learn**, **Practice**, **Graded** and **Achievement**. Each has its own icon shape and a text label, and a task can have several.
- Graded is a gold, uppercase, high-contrast chip with a double left border, so it does not rely on color alone.
- An Achievement only links to the badge, marked "not a grade".

**Completion (kept distinct):**
1. **Recorded by Speaking Lab** (automatic): only where a reliable record already exists. These are reading checks (best score), The Art of Listening final check, The Respectful Audience Lab check and the AI Coaching Studio.
2. **I did this**: the student's own checkbox, for class work or work done outside Speaking Lab.
3. **I submitted it in Canvas**: the student's own report. It says "Speaking Lab can't see Canvas, so check Canvas to confirm your submission."
4. **Teacher-verified**: only in Canvas. Speaking Lab never shows work as verified or graded.

**Storage:** checkmarks are saved as `speakup-checklist-v1` (task ids and dates only).
- They are included in the existing progress backup and restore.
- Checking tasks adds no learning points and never touches badges.

**Release rules:** a unit's tasks appear when the unit opens. Today's tasks appear when the lesson opens (7:00 a.m. Central).

## Graded: approved versus proposed
- **Approved** (shown to students as Graded):
  - the unit speech (from `units.json`: name and points; speech days from the pacing guide);
  - journal sets (the approved rule: 10 journals = 100 points; listed in the week a group writes the set's last journal; collection dates announced by Mr. Bennett);
  - any assessment Mr. Bennett approves in `checklist.json`.
- **Proposed** (teacher view only):
  - the six Unit 1 grading opportunities in `checklist.json`: model diagram, reading check, timed rehearsal, college key-word outline, listening reflection, rubric self-assessment;
  - no points or weights.
- Nothing invents points, weights, due dates or assessments.

## Teacher: Lesson Manager → Week planner → Weekly assessment overview
- **Grading plan for the semester:** each course week shows, for odd and even periods, either "graded work planned", "no graded assignment planned" or "exception".
- **Week detail:**
  - the warning **"No graded assignment has been planned for this instructional week."** for each group (and for the college pathway when it differs);
  - a table with one row per planned day (never duplicated across groups): odd date, even date, learning objective, required learning, practice, proposed graded, approved graded, Canvas expectations;
  - a journal-set line.
- **Approve as graded (draft) / Return to proposed** on proposed items.
- **Mark this week as an exception** (no instruction, testing interruption, shortened week, other), with an optional note.
- **Saving and publishing:** approvals and exceptions are saved as a teacher draft (`speakup-teacher-checklist-v1`, never in student backups). They reach students only when `site/data/checklist.json` is downloaded from **Publish** and committed, like every other Lesson Manager edit.
- **Quick Teach** shows a small on-screen card with the block's checklist size and graded or proposed items. It is hidden in print, so Quick Teach still prints on one page (12 of 12 checked).
- **Canvas:** a planned grading opportunity is not a grade entered in Canvas. Speaking Lab cannot see the Canvas gradebook and makes no Canvas API calls.

## Scheduling
Everything comes from the existing engine; there is no second scheduler:
- odd/even 90-minute blocks and the Wednesday rotation;
- district holidays and professional-development days;
- shortened weeks (planned days fold exactly as Today's Lesson does);
- teacher overrides: closure (including group-only testing days), no journal, journal, extend;
- speech days and due items from the pacing guide;
- the high school and college pathways (pathway-specific tasks; college stays off by default).

## Limitations
- **Unit 1 only has written tasks.** Units 2–6 show the journal, speeches, readings and pacing-guide due items from existing data. Their task lists wait for Unit 1 approval, as instructed.
- **Most weeks after Unit 1 show the warning.** Only speeches and journal sets are approved grading today. This is accurate, not a defect; it is for Mr. Bennett to resolve or mark as exceptions.
- **Some completion is self-reported only.** The Communication Model Lab, Outline Builder and Story Builder don't record completion in a form the checklist can trust (see `docs/proposals/lab-mastery-proposals.md`), so they use the student checkbox.
- **Checkmarks are per browser,** like all progress: another computer needs the backup.
- **Teacher approvals are drafts** in that teacher's browser until published.
- **Exceptions are dated.** They are keyed by the week's Monday, so they apply to one semester.
