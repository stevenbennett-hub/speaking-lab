# Development preview (https://stevenbennett-hub.github.io/speaking-lab-preview/)

The preview site is built by the separate repository `stevenbennett-hub/speaking-lab-preview` from the `dev`
branch of this repository. It is for Mr. Bennett and reviewers, not students.

## What the preview build does
- Shows a **DEVELOPMENT PREVIEW** bar at the top (with a date picker and "Clear preview progress") and a small
  "DEV PREVIEW" label in the corner; the browser tab title starts with "[Preview]".
- Opens all six high school units, whatever the district release schedule says.
- Lets anyone view any date with the bar's date picker (or `?date=YYYY-MM-DD`), so lessons, journal numbers and
  release behavior can be checked across the semester.
- Saves its own progress: every saved key is stored as `slpreview:<key>`, so testing on the preview never reads,
  changes or clears students' real progress, even though both sites share the stevenbennett-hub.github.io address.
- Keeps the college gate (off by default; code required) and the teacher-view code exactly as on the student site.

## How it is switched on (two conditions, both required)
1. The page is served from `/speaking-lab-preview/…` (or from this computer, `localhost`).
2. `site/data/preview.json` exists with `{ "channel": "preview" }`. The preview workflow writes that file during its
   build. It is never committed to this repository: a test fails if it is, and the production workflow refuses to
   deploy if the file is present. The production address (`/speaking-lab/`) never even asks for the file.

## Setting up the preview repository
I could not open the preview repository from this session, so its current workflow was not changed. To connect it:
1. In `speaking-lab-preview`, replace (or compare with) its workflow file with `deploy-preview.yml` from this folder:
   `.github/workflows/deploy-preview.yml`.
2. It checks out `stevenbennett-hub/speaking-lab` at `dev`, runs the same tests, adds `site/data/preview.json`, and
   publishes `site/` to the preview Pages site. It runs when started from the Actions tab and every 3 hours.
3. If your existing workflow already copies the dev build, the only required addition is this step before the upload:
   `echo '{ "channel": "preview" }' > site/data/preview.json`
4. No tokens are needed while `speaking-lab` is public. If it becomes private, the checkout step needs a read-only
   token stored as a secret in the preview repository (never in website code).
