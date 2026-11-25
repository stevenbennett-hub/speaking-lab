# Ad Detective integration: mastery, practice and Master Ad Detective

Status: **built on development branches; not deployed** (Slice 10). **Approved for preview testing, not for production** (Mr. Bennett, Nov 24, 2026): publish it to `ad-detective-preview` only, using the steps in `docs/preview/ad-detective-preview.md`.
- Ad Detective: `dev` branch, commit `828d064`, delivered as a separate ZIP. The public site `https://stevenbennett-hub.github.io/ad-detective/` is unchanged until you approve.
- Speaking Lab: `dev`.

Until the Ad Detective `dev` branch is published, nothing writes the summary, so **Master Ad Detective cannot be earned yet**. No other badge changes.

## What was wrong before (reviewed at Ad Detective commit `c197f02`)
1. **Revealed answers counted as solved.**
   - After two tries, "Show the answer" stored `ok: true`.
   - The sorting and judging grids show the answers from the second check.
   - Lists, inspections and rewrites counted once their model was revealed.
2. **No preview separation.** Testing Ad Detective on a student's laptop wrote to that student's real `addetective-v1`.
3. **No versioned summary** to validate against.

## What the Ad Detective `dev` branch does (`src/mastery.js`, tested in `tests/mastery.test.mjs`)
- **Completion vs. mastery.** The five-step completion ring is unchanged, so nobody loses progress. Each case also shows **"On your own: X / Y challenges"**.
- **Objective challenges only.** Mastery counts these when answered correctly without showing the answer:
  - multiple choice;
  - the sorting and judging grids;
  - the Case 6 strategy tags.

  Lists, inspections, rewrites, evaluations and the final report are never scored. Teachers read them in the Notebook.
- **Shown answers are practice.** Using "Show the answer", or reaching the second grid check with mistakes, stores `shown` with the date.
- **No permanent penalty.** On a later day, a **Try it again on your own** button clears that one challenge. Answered independently, it counts.
- **Earlier work is preserved and read conservatively.**
  - A multiple-choice answer counts as independent if it was correct within two tries, because "Show the answer" didn't exist before that.
  - A grid counts as independent if it was all correct before a second check.
  - Anything else counts as practice and can be retried right away.
- **Versioned summary.**
  - Key and shape: `addetective-mastery-v1` = `{ "v": 1, "app": "ad-detective", "cases": { "1": "YYYY-MM-DD", … } }`.
  - It is rebuilt on every save and keeps the first day each case was mastered.
  - "Delete all my work" empties it.
- **Preview storage.** At `/ad-detective-preview/` or `localhost`:
  - every key is stored under `slpreview:`, the same prefix the Speaking Lab preview uses;
  - a DEVELOPMENT PREVIEW bar shows;
  - the public address keeps the original keys.

## What Speaking Lab does (`dev`)
- `js/achievements.js` reads only `addetective-mastery-v1`.
  - Shape: `v: 1`, `app: "ad-detective"`, case ids 1–6, real dates. Anything else is ignored.
  - Ad Detective's own saved work is never read (a test checks this).
- **Learning points:** each mastered case counts once (10 points), recalculated every time, so there are no duplicates.
- **New applied badge: Master Ad Detective.** All six cases, grouped as:
  - persuasive appeals (Cases 1–3);
  - logical fallacies (Case 4);
  - misleading claims (Case 5);
  - ethical advertising (Case 6).
- **Persuasion Detective is unchanged** (Persuasion & Rhetoric Lab criteria).
- **Preview build:** links to Ad Detective go to `https://stevenbennett-hub.github.io/ad-detective-preview/` (`js/build.js`). Until that site exists they show GitHub's 404 page, so the preview can never write real Ad Detective progress. See `docs/preview/ad-detective-preview.md`.

## Decisions for you
1. Approve publishing the Ad Detective `dev` branch to its public site (upload the `dev` files to `main` in `ad-detective`). Until then, Master Ad Detective shows progress 0.
2. Optional: create the `ad-detective-preview` repository to test it online first.
