# Teacher workflow test: Lesson Manager → dev → preview

**Run:** Nov 24, 2026 on `dev` (Slice 10).
- Steps 1–9 and the draft-visibility checks were run in a real browser (Chromium) with the clock set to Apr 27, 2027, as the even-day group.
- Steps 10–11 were simulated: the exported files were placed on a copy of `dev` and the full test suite was run.
- Step 12 happens on GitHub and is described, not run, because this session cannot push.

Repeat it yourself with the checklist at the end. It takes about 20 minutes.

## Results

| # | Step | Result |
| --- | --- | --- |
| 1 | Open the Teacher Lesson Manager | **Pass.** Without the teacher view code it shows "Open teacher view first". With the code, the calendar lists 37 class days for the group. |
| 2 | Select an instructional date | **Pass.** Fri Apr 30, 2027 → lesson `w16d4`, journal `j39`. |
| 3 | Edit a learning objective | **Pass.** Saved as a draft in this browser. |
| 4 | Edit a language objective | **Pass.** |
| 5 | Update a journal | **Pass.** Prompt changed and saved as a draft. The Spanish side is marked as needing review. |
| 6 | Select research requirements | **Pass.** Assignment `persuasive`, 4 sources. |
| 7 | Configure AI permissions | **Pass.** Coach, with an English note. A missing Spanish note is a warning, not an error. |
| 8 | Preview the lesson | **Pass.** With "Show my drafts in the student view on this browser only" on, Today for Apr 30 shows the new objective and prompt. |
| 9 | Export changed configuration files | **Pass.** Only `lessons.json` and `journals.json` download. They contain the edits, with `status` reset to draft and the AI and research settings. |
| 10 | Upload to `dev` | **Simulated.** The two files replaced `site/data/lessons.json` and `site/data/journals.json` on a copy of `dev`. |
| 11 | Run automated tests | **Pass after a fix.** The first run failed 2 tests (see below). After the fix, all tests pass with your edited files (146 / 146 including Slice 10). |
| 12 | Update the preview website | **Not run here.** In `speaking-lab-preview`: Actions → the preview workflow → **Run workflow**, or wait for its scheduled run (every 3 hours in the reference copy). Its tests run on `dev` before it publishes. |

**Drafts are not visible on student devices before publishing:**
- A separate student browser on Apr 30 shows the published objective. Neither the draft objective nor the draft prompt appears.
- Your own browser with "show my drafts" turned off also hides them.

## What the test found and fixed
Two existing tests assumed that **no lesson would ever have AI or research settings**:
- `manager.test.mjs`: "no lesson changes the default until Mr. Bennett sets one".
- `research.test.mjs`: the defaults check used the published lessons directly.

The first time you saved real AI or research settings through the Lesson Manager, the tests would have failed. That would block every deploy. Both tests now:
- check that published settings are **valid**, using the same validation the Lesson Manager runs;
- compute the defaults from lessons with the settings removed.

## Limitations
- **Drafts live in one browser.** They are in `speakup-teacher-drafts-v1` on the computer where you typed them. Clearing site data or switching laptops loses unexported drafts. Use **Publish → Download a backup of my drafts** before switching computers.
- **"Preview" in step 8 is your browser only.** To see the change on the online preview site, you must upload to `dev` and run the preview workflow (steps 10–12).
- **Uploading is manual.** You upload through GitHub's website (Add file → Upload files, into `site/data/`, on branch `dev`). No tokens are stored anywhere.
- **The Lesson Manager does not edit the calendar or pacing.** It never changes past dates or journal numbers.
- **Editing approved text sets it back to draft** for that language. Re-approve it in Review after checking.
- **The teacher view code is a classroom convenience, not security.** Anyone with the code can open the Lesson Manager on their own browser, but they cannot change the site without your GitHub account.
- **The preview workflow** (`speaking-lab-preview` → `preview.yml`) is yours and was not changed.

## Checklist to repeat on a district laptop
1. My course → Teacher → enter the teacher view code → Lesson Manager.
2. Calendar → open an upcoming date → **Edit reusable lesson**.
3. Change the learning and language objectives. Set research requirements and AI permission. Save draft.
4. Open the day's journal (Journals tab), change the prompt, and save the draft.
5. Publish → tick "Show my drafts…" → open the date in the student view and check the changes → untick.
6. Publish → download each changed file.
7. On another device (or a private window), open the same date: the drafts must **not** appear.
8. GitHub → `speaking-lab`, branch **dev** → `site/data` → Add file → Upload files → commit.
9. Actions → wait for the green check (tests).
10. `speaking-lab-preview` → Actions → preview workflow → Run workflow. Open the preview site and check the date (`?date=YYYY-MM-DD` works there).
