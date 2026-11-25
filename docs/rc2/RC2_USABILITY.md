# RC2 usability refinements

**Status:** built on `dev`. Not deployed. New Spanish text is a draft.

## 1. Course welcome on My Course
- **Where:** a collapsible **Welcome to Speech & Communication** section near the top of My Course, after the "Go to today's lesson" button, so the daily action stays first.
- **What it contains (the original elements, shown in place with `SL2.host`, never copied or recreated):**
  - Mr. Bennett's welcome video (`#welcomeFig`: the same `<video>`, poster, EN/ES captions and transcript). It never autoplays; `preload="none"`.
  - The course purpose (`#courseLede`, `#courseWhy`).
  - Mr. Bennett's introduction (`#aboutBio`) and educational philosophy (`#aboutPhilo`, in a fold).
- **New text:** a five-step "How to use Speaking Lab" list (navigation help only) and **Continue to Today's Lesson**.
- **Collapsing:** the section stays collapsed once a student collapses it (`speakup-welcome-v1` = open/closed; a display preference with no personal data). Collapsing or leaving the page pauses the video.
- **Course essentials** links sit under the welcome, and remain visible when it is collapsed.

## 2. Course Essentials (`#/course`, `#/course/<section>`)
| Section | Source |
| --- | --- |
| Course Overview | The course purpose and the course map, plus Mr. Bennett's About section, all shown in place. Units, weeks and speeches come from `units.json`. |
| Grading and Assignments | Canvas is the official gradebook. Each unit's graded assignment and its points come from `units.json`. Journal sets follow the approved rule (10 = 100 points). Checklist assessments appear only once approved. It explains My Learning Checklist, the Weekly Grading Checkpoint and student-reported checkmarks, and lists what is not a grade. It says plainly that grading weights and other policies are not in Speaking Lab. |
| Classroom Expectations | The daily journal routine, and the six audience expectations as the Respectful Audience Lab lists them (`window.SL_EXPECT`, read from the lab, not copied). It also uses the existing speech-day line and the accommodations note from The Art of Listening (`window.SL_NORMS`), and links to both labs. Rules not yet approved for students (`playbook/classroom.json` is a teacher draft) are not shown. |
| Course Schedule | The odd/even blocks and Wednesday rotation, the lesson release time and the semester dates, all from the calendar file, plus the student's own periods. It shows the classic due-dates section in place and links to the weekly checklist and pacing guide. |
| Responsible AI Use | The four permission levels and the class default (`ai-permissions.json`), with links to the AI Coaching Studio and the integrity policy. |
| Achievements and Progress | Badges and points (not grades), pending teacher verification, certificates and portfolio, and backup and restore. |

## 3. The History & Voices of Wyandotte (`#/wyandotte`)
- **Feature card:** at the bottom of My Course, beneath the units, titled "The History & Voices of Wyandotte" and subtitled "Our School. Our Stories. Our Voices." It shows the school's existing photograph.
- **Secondary links:** in Resources (an area card and the footer link).
- **The page:** it shows in place the school photograph with its existing caption and history note (the two towers, 1937, source Clio), the existing Voices from Wyandotte feature (Ed Asner, more graduates, the clip link and sources), and the Wikipedia source link. Nothing was added.
- **Teacher note:** in teacher view only, a note says what is shown and that further history, photographs or student voices need approved materials and sources.
- **Mockups:** the supplied mockups were used for layout and tone only. Their people and photographs are not used: they are not school materials.

## 4. Legacy navigation audit
- **Student views that linked to `#top` (the classic page):** three, now replaced.
  - The entrance link ("Watch Mr. Bennett's welcome video…") now goes to `#/course`.
  - The My Course footer and the Resources footer now link to the welcome and course essentials.
  - A browser check confirms that no student application view links to `#top`.
- **In-app clicks on classic section links** go to their application page (`SL2.IN_APP`):
  - `#top`/`#main` go to `#/course`; `#map`/`#about` go to `#/course/overview`; `#units` goes to `#/`.
  - `#dates`, `#pacing`, `#rubrics`, `#videos` and `#speeches` go to their Resources pages; `#resources` to `#/resources/textbook`; `#references` to `#/resources/research`.
  - `#labs` goes to `#/labs`; `#unit-N` goes to `#/unit/N`.
- **Kept:**
  - Bookmarks and typed-in addresses (a fresh page load) still open the classic page.
  - Lab links still open the lab in Learning Labs.
  - Every classic section, resource and external link is kept.

## 5. Checklist access from individual lessons
- **Archived lessons and the unit's Today tab:** these show a compact **"Tasks from this lesson · date"** card. It covers only that lesson's own class meeting (never today's tasks on a past lesson), says "These belong to this lesson's class day, not to today", and gives a progress count, a fold with the same checkboxes, and links to **My Learning Checklist: Today** and **This Week**.
- **Today's Lesson:** keeps the full checklist only, with no duplicate card.

## 6. Unified student calendar (`#/calendar`, `js/calendar.js`)
**Navigation:** Today's Lesson · My Course · **Calendar** · Learning Labs · Resources · My Achievements. Preferences stays a utility control.

**Features:**
- **Month view:** a Monday–Friday grid with the student's class days marked (teal edge, "Class · Journal #n", linked to the lesson). Today is outlined in gold.
- **Week agenda:** five days with notes, and the course week number.
- **Navigation:** previous/next month or week, and a **Today** button. Focus stays on the control used.
- **Event filtering:** nine categories, as pressed/unpressed buttons.
- **Event details:** click any event. The panel shows the type, date or performance window, graded status and approved points, notes, how to turn it in, a requirements/rubric or lesson link, and the student's own checklist report, labelled as theirs and not a submission or grade.
- **Upcoming Deadlines:** the next six approved graded items, speech windows, tests and research checkpoints. Each shows its name, date or window, approved points, type, rubric link and Canvas expectations.
- **Icons:** every event and filter has a distinct shape icon and a text label, so meaning never depends on color.

**Event types and where they come from (no calendar database; nothing is stored):**
| Type | Source |
| --- | --- |
| Class days, extended lessons, class-only closures | `SLSchedule.meetings` for the student's group (odd/even, Wednesday rotation, overrides) |
| Major speech presentations | The pacing guide's SPEECH days for the class (`SL2.dayParts`), shown as **one performance window per unit**, never an individual speaking date. Points come from `units.json`. |
| Weekly graded assignments | Approved assessments in `data/checklist.json` (proposed ones only in teacher view, labelled Proposed) |
| Journal sets | The journal schedule. The class that writes the 10th, 20th… journal; 100 points (approved rule). Collection is "announced by Mr. Bennett"; no deadline is invented. |
| Quizzes and assessments, finals | The page's existing due-date events (`window.dueEvents`), the same ones Today's Lesson lists under "Turn in" |
| Research checkpoints | Pacing-guide due items about sources and research (from the same due-date events) |
| Speech preparation, rehearsals | The class's planned-day text (work days, outlines, note cards, sign-ups, rehearsals). Practice, not graded. |
| Unit transitions | The first class meeting of each unit |
| Holidays, breaks, closures, PD days | The district no-school list plus whole-school closure overrides (`SLSchedule.noSchoolList`). PD days are labelled. |
| Shortened weeks | Course weeks with fewer than five school days |

**Consistency checks (browser):**
- Class days equal Today's Lesson meetings.
- The speech window equals the weekly checklist checkpoint.
- Unit tests equal Today's Lesson due events.

**Instructor:**
- In the weekly assessment overview, **Preview on the student calendar (with my drafts)** turns on the existing draft preview, which now also carries checklist approvals and exceptions. It then opens the calendar. Nothing reaches students until the files are published.
- In teacher view, the calendar can include proposed grading.
- The weekly warnings stay as they are. Dates are entered once: in the calendar file, overrides or lessons through the Lesson Manager, and grading in the weekly assessment overview.

## Limitations and decisions (RC2)
1. **History & Voices of Wyandotte** contains only what the site already had: the school photograph and its history note, Voices from Wyandotte and its sources. Decide whether to supply more approved history, photographs or student voices (with sources and permissions).
2. **Classroom Expectations** shows the audience expectations from the labs and the journal routine. Your full classroom rules (`playbook/classroom.json`, a draft) are not shown to students until you approve them.
3. **Grading and Assignments** names no weights or late-work rules, because none exist in the site data. Decide whether to add your syllabus grading text.
4. **Unit test dates** in the calendar and Today's Lesson come from the existing course calendar rule (the class before speeches). In Unit 1 this differs from the checklist's proposed reading check (w01d5). Decide which date is authoritative.
5. **Journal sets** show when the set's last journal is written; collection dates are yours to announce.
6. **Weekends** are not shown in the month grid; the course meets Monday to Friday.
7. **Bookmarks** to classic sections still open the classic page, on purpose. Decide whether bookmarks should also go to the new pages.
8. **New Spanish** (welcome, essentials, Wyandotte, calendar) is a draft.
