# Accessibility and performance review (Slice 9, Nov 24, 2026)

Design target: **WCAG 2.2 AA**. This is a development review with automated checks plus manual keyboard and visual
checks in Chromium. It is **not** a formal conformance claim; passing automated checks does not prove accessibility.
Before production: a screen-reader pass (NVDA on a district Windows laptop or ChromeVox on a Chromebook) and a
classroom check with students who use assistive technology.

## What was checked
| Area | How | Result |
| --- | --- | --- |
| Text contrast (1.4.3) | Script computed foreground/background ratios for every visible text element on 23 student and teacher pages, light and dark | Fixed: table headers in the achievement and Lesson Manager tables (2.3:1 → passes). No other failures found. |
| Names, labels (4.1.2, 3.3.2) | Every link, button and form field checked for an accessible name/label | None missing |
| Headings (1.3.1, 2.4.6) | One visible h1 per view; no skipped levels | Pass |
| Duplicate ids (4.1.1 legacy, ARIA) | DOM scan | Fixed a pre-existing duplicate: the Outline Builder heading and its speech-title field both used `ob-title` (heading is now `ob-heading`) |
| Keyboard + visible focus (2.1.1, 2.4.7) | Tabbed through 35 stops on 7 key pages; checked a 2px+ outline on each | Pass; every control reachable |
| Focus not obscured (2.4.11, new in 2.2) | Sticky header vs. focused element | Pass: `scroll-padding-top` keeps focus below the header |
| Target size (2.5.8, new in 2.2) | Buttons and links ≥ 24×24 px, or inline in text | Pass |
| Reflow (1.4.10) and zoom | 320 px wide and 1280/1366 laptop widths | Fixed: the portfolio assignment menu overflowed at 320 px. No other horizontal scrolling. |
| Reduced motion (2.3.3) | Smooth scrolling and toasts only under `prefers-reduced-motion: no-preference` | Pass |
| Captions and transcripts (1.2.2, 1.2.1) | Beyond the Podium film | English captions now supplied (from the film's own track); full transcript on every stage. **Spanish captions not supplied.** |
| Audio description (1.2.5) | Film | The film's essential information is in the dialogue; the opening (Alex holding a phone while Jordan works) is visual only. Recommend a short text description in the transcript after your review. |
| Accessible alternatives | Activities | Every activity is keyboard-operable with text; drag-and-drop is not used; branching scenes use buttons. |
| Status messages (4.1.3) | Feedback after Check buttons | `role="status"` on results |
| Language of parts (3.1.2) | Side-by-side translations | `lang` set on alternate-language text |

## Performance (district laptops, school network)
- First load (classic page + data + scripts): about **2.9 MB raw, about 1.1 MB compressed** (GitHub Pages compresses
  text). Measured: ready in ~8 s at 10 Mbps and ~34 s at 1.5 Mbps on an uncompressed local server; expect less on GitHub Pages.
- Studio content loads only when opened (AI 28 KB, Research 29 KB, Beyond the Podium 11 KB compressed).
- The film is 15.9 MB (1080p, ~2.3 Mbps). It is never preloaded (`preload="metadata"`, ~40 KB until Play). On a slow
  or crowded network it may buffer. **Recommendation (needs approval):** add a 720p copy (~5–6 MB) and let the player
  choose it; this is a re-encode of the approved film, not a new film.
- Largest other files: welcome video 4.5 MB, Voices of Change audio 1.0–1.5 MB each (all load only when played).

## Remaining recommendations
1. Screen-reader pass (NVDA/ChromeVox) on the dashboard, one lesson, one studio and the Lesson Manager.
2. Spanish captions for the film (reviewed) and a short visual description of the opening.
3. Optional 720p film copy for slow networks.
4. `index.html` is about 2 MB; splitting it is a larger change, not recommended before the pilot.
