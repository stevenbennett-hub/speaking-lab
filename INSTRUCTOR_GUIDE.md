# Instructor Guide: Editing The Speaking Lab

You can change almost everything students see without touching code. All content is in plain JSON files in `src/content/`.

## How to edit a file on GitHub

1. Open your repository on GitHub.
2. Navigate to the file (for example, `src/content/instructor/assignments.json`).
3. Select the **pencil icon** (Edit this file).
4. Make your change.
5. Select **Commit changes**. Add a short note such as "Set informative speech due date."
6. Open the **Actions** tab. In about two minutes the site tests itself and redeploys. A green check means it's live; a red X means something needs fixing (see Troubleshooting).

## JSON rules that matter

JSON is strict. Most errors come from these:

- Text goes in **straight double quotes**: `"like this"`. Curly quotes from a word processor break the file.
- Items in a list are separated by **commas**, but there is **no comma after the last item**.
- To use a double quote inside text, write `\"`: `"She said \"hello.\""`.
- Brackets must match: `[ ]` for lists, `{ }` for groups of fields.

Tip: paste a file into a free JSON validator (search "JSON validator") before committing.

---

## 1. Announcements: `src/content/instructor/site.json`

```json
"announcements": [
  {
    "id": "informative-due",
    "date": "2026-10-01",
    "title": "Informative outlines due Friday",
    "body": "Download your outline from the Studio and upload it to the LMS by 11:59 p.m."
  }
]
```

- `id`: any unique word, no spaces.
- `date`: `YYYY-MM-DD`.
- Newest first is easiest for students.

Also in this file:

- `instructorName` and `schoolName` (shown on the About page; leave blank to hide).
- `featuredLabs`: lab ids shown on the home page (`rhetoric`, `audience`, `opening`, `organization`, `evidence`, `fallacy`, `delivery`, `visual`, `anxiety`).
- `featuredGreatSpeeches`: exhibit ids (`gettysburg`, `truth-akron`, `fdr-1933`, `jfk-rice`, `king-1963`, `jordan-1976`, `malala-2014`).

## 2. Assignments: `src/content/instructor/assignments.json`

Each speech has one entry:

```json
{ "speechId": "informative", "status": "current", "dueDate": "2026-10-03",
  "hs": { "time": "4–5 minutes", "sources": "At least 3 credible sources, cited out loud", "notes": "One presentation aid required." },
  "college": { "time": "5–7 minutes", "sources": "At least 5 sources, including 2 scholarly; APA references", "notes": "Full preparation outline required." },
  "targetSeconds": { "hs": 300, "college": 420 },
  "minSources": { "hs": 3, "college": 5 } }
```

- `status`: `current`, `upcoming`, `completed`, or `not-assigned`. Current and upcoming speeches appear on the home page.
- `time`, `sources`, `notes`: plain text students read.
- `targetSeconds`: the speech timer's target (300 = 5 minutes).
- `minSources`: the number the Studio's source counter checks against.

**Important:** when your settings are official, change `"isSample": true` to `"isSample": false` at the top of the file. This removes the "sample settings" notices students see.

## 3. Rubrics: `src/content/instructor/rubrics.json`

```json
{ "speechId": "persuasive", "criteria": [
  { "name": "Evidence and reasoning", "weight": 25, "description": "Credible evidence with explained reasoning; free of fallacies." }
] }
```

- `weight` values for each speech **must total 100** (the automated tests check this).
- `levels` at the top sets the rating labels for every rubric (default: Beginning, Developing, Proficient, Exemplary).
- Students use rubrics for self-assessment only. Nothing is submitted or graded.
- Set `"isSample": false` when the rubrics are yours.
- Print any rubric from the Instructor page.

## 4. Speech pages: `src/content/speeches.json`

Each speech includes: `title`, `tagline`, `summary`, `whyItMatters`, `objectives` (`hs` and `college` lists), `learn`, `textbook` references, `steps`, `tools`, `topicIdeas`, `structures`, `checklist`, `reflection`, and `collegeExtension`.

**Tools** come in six types:

| `type` | What it shows | Extra fields |
|---|---|---|
| `organizer` | Labeled text boxes that save, copy, and download | `fields`: list of `{ "id", "label", "help", "frame", "rows" }` (`frame` is an optional sentence starter) |
| `arc` | Story arc builder | none |
| `patterns` | Organizational pattern selector | `patterns`: ids from `patterns.json` |
| `monroe` | Monroe's Motivated Sequence organizer | none |
| `tone` | Occasion and tone workshop (uses `occasions.json`) | none |
| `link` | A button to another page | `to` (for example `"/labs/delivery"`), `label` |

Example of adding an organizer:

```json
{ "id": "hook", "type": "organizer", "title": "Hook workshop",
  "fields": [ { "id": "draft", "label": "Draft your hook", "frame": "Imagine..." } ] }
```

**Caution:** changing a tool's `id` or a field's `id` disconnects students' saved work for that box. Change labels freely; change ids only before students start.

To add a new speech type, copy an existing entry, give it a new unique `id`, then add matching entries in `assignments.json` and `rubrics.json`. The tests will tell you if one is missing.

## 5. Learn modules: `src/content/modules.json`

Each module has `summary`, `keyIdeas`, `example`, `textbook`, `activity`, `reflection`, `college`, optional `vocab` (glossary ids), and optional `practice` (a link).

Activities (and all lab questions) use this shape:

```json
{ "id": "m-purposes", "prompt": "Which statement follows the guidelines?",
  "options": [
    { "text": "Option A", "feedback": "Why A isn't best." },
    { "text": "Option B", "correct": true, "feedback": "Why B is best." }
  ] }
```

- Exactly **one** option has `"correct": true`.
- **Every** option needs `feedback`. Students see the feedback for the option they chose, then the best answer.

## 6. Textbook references (anywhere)

```json
{ "chapter": 6, "section": "6.2" }
{ "chapter": 13, "section": "13.5", "note": "plus the sample Monroe outline" }
{ "chapter": "E", "note": "APA Citation" }
```

Chapters are numbers; appendices are letters in quotes. Sections must exist in `textbook.json` (the tests check this). Section numbers follow Version 4.1. If your students use Version 4.2, check the numbers.

## 7. Labs: `src/content/labs/`

| File | Lab |
|---|---|
| `rhetoric.json`, `audience.json`, `fallacy.json`, `visual.json` | Lists of activities (shape above). Visual Aid items can add `"slides": ["textwall", "chart"]` using `textwall`, `chart`, `chart3d`, `busy`, or `lowcontrast`. |
| `opening.json` | `pairs` (activities) and the five introduction `elements` |
| `organization.json` | Puzzles: `pieces` listed in the **correct** order (the site shuffles them), plus `pattern` and `why` |
| `evidence.json` | `items`, each with an `answer` that matches one of the `categories` |
| `anxiety.json` | `thoughts` (activities), `strategies`, `checklist`, and the `support` message |
| `labs.json` | Lab titles and short descriptions |

## 8. Great Speeches: `src/content/greatSpeeches.json`

When you add an exhibit:

- Use reliable archives (Library of Congress, National Archives, presidential libraries, university collections, the National Park Service).
- State the `rights` status honestly. **Do not paste copyrighted speech text.** Link to it.
- Use `https://` links only.
- Keep `critical` focused on a genuine question, not a single "correct" interpretation.

## 9. Resources: `src/content/resources.json`

- `license`: `open` (Creative Commons or similar), `free` (free to read, rights reserved; link only), `public` (government or public-domain archive), or `site` (a page in this site, with `url` like `"#/labs/delivery"`).
- `category` must match one of the `categories` at the top.
- Check links each term. Outside sites move.

## 10. Glossary and languages: `src/content/glossary.json`

Each term has `id`, `term`, `definition`, `es` (Spanish), and `chapter`. To add a language, add a key to each term (for example `"vi": "..."`) and list it in `languages`. The current pages display Spanish; showing additional languages is a small code change in `src/components/ui.tsx` (VocabChips) and `src/pages/Resources.tsx`.

## 11. AI Coach: `src/content/aiCoach.json`

- `sortItems`: the coach-or-author sorting activity.
- `stages`: guiding questions for each stage of preparation.
- `prompts`: copyable prompts. Keep the "do not write it for me" instruction in every prompt. `[high school / college]` is filled in automatically from the student's pathway.

---

## Troubleshooting

**The Action failed.** Open **Actions → the failed run → the "build" job**. Look for:

- `Unexpected token` or `JSON`: a punctuation error in the named file.
- A test name like `rubric weights for persuasive`: the test says exactly what's wrong (here, weights don't total 100).
- `section 6.7 not in chapter 6`: a textbook reference to a section that doesn't exist.

Fix the file and commit again. The live site stays on the last working version until a build passes.

**A student lost their work.** Work lives only in the browser and device they used. If they downloaded a backup, they can restore it in My Growth (all work) or the Studio (one speech). Remind students to download backups, especially on shared devices.

**I want to check changes before students see them.** Run `npm install` once, then `npm run dev` on your computer and open the address it shows.
