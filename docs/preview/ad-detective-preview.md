# Optional: an Ad Detective preview site

The Speaking Lab preview (`/speaking-lab-preview/`) keeps its own progress under `slpreview:`. Ad Detective is a separate site on the same github.io address. Without a preview copy of it, testing Ad Detective from the Speaking Lab preview would change a student's real Ad Detective progress.

So, in the preview build only, Speaking Lab sends every Ad Detective link to `https://stevenbennett-hub.github.io/ad-detective-preview/` (`js/build.js`, `adHref`). Production links are unchanged.

## If you want to test Ad Detective online before approving it

1. Create a new public repository: **`ad-detective-preview`**.
2. Upload the files from the Ad Detective `dev` ZIP: `index.html`, `src/`, `assets/`, `build.py`, `tests/`, `tools_*.js`, `README.md`.
   - `assets/videos` is about 78 MB. Upload the videos in batches of 25 MB files or fewer through the website.
3. **Settings → Pages → Deploy from a branch → `main`, `/ (root)`**, then Save.
4. Open `https://stevenbennett-hub.github.io/ad-detective-preview/` and check that the yellow **DEVELOPMENT PREVIEW** bar shows.
5. Test it from the Speaking Lab preview: Unit 6 → Ad Detective. Master one case, then open Achievements in the Speaking Lab preview: the progress shows there, and production is unchanged.

Notes:
- No workflow or token is needed, because the site is plain files.
- This does not touch `speaking-lab-preview` or its `preview.yml`.
- If you skip this, the preview's Ad Detective links show GitHub's 404 page. That is safe; it just can't be tested online.
- To publish later: upload the same `dev` files to `main` of `ad-detective` (needs your approval). Then production Speaking Lab can award Master Ad Detective.
