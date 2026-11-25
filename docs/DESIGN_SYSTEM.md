# Speaking Lab 2.0 design system (Slice 12)

Implemented in `site/css/app.css`, which loads after `student.css`. The Visual Design Package prototype was the reference for hierarchy and atmosphere. None of its sample content, progress states or placeholder behavior was copied.

## Tokens
| Group | Tokens |
| --- | --- |
| Palette | `--sl-navy #141B2E`, `--sl-slate #1F2A44`, `--sl-gold #E9BB70`, `--sl-teal #8DD7BC`, `--sl-white #EEF1F6`, `--sl-blue #34405E`. The unit colors `--u1…--u6` and the Speak Up mark are unchanged. |
| Semantic (light / dark) | `--app-bg`, `--app-surface`, `--app-surface-2`, `--app-line`, `--app-ink`, `--app-text`, `--app-muted`, `--app-gold` (text-safe: #8A5A00 light, #E9BB70 dark), `--app-gold-bg`, `--app-teal` (#1C6B5C light, #8DD7BC dark), `--app-teal-bg`, `--app-header`, chip colors |
| Type | Bricolage Grotesque for display, Atkinson Hyperlegible Next for body (both already self-hosted); `--fs-xs` 12 to `--fs-2xl` clamp(28–42 px) |
| Space | `--sp-1` 4 px to `--sp-7` 48 px |
| Shape and depth | `--r-sm` 8, `--r-md` 14, `--r-lg` 18, `--r-pill`; `--sh-1` (resting), `--sh-2` (hover and overlay) |
| Motion | `--t-fast` 140 ms, `--t-med` 200 ms, `--t-slow` 250 ms, `--ease` |
| Focus | `--focus`: a 3 px teal outline in both themes |
| Status | current (gold), today (gold border), available, in progress, completed, locked (muted surface + lock icon + words), pending (dashed) |

Light mode was designed in its own right, not as an inverted dark mode. Text gold and teal are darkened to keep AA contrast on white, and the surfaces are soft white rather than flat grey. Dark mode uses the palette directly. **Dark is the default for first-time visitors** (Slice 12 refinement). Students who used the site before keep the light look they had, and every saved choice is kept. Students choose in Preferences → Appearance.

## Application shell
- **Header (every page).** Speak Up / Speaking Lab · Today's Lesson · My Course · Learning Labs · Resources · My Achievements · language · Preferences.
  - **Mute sounds** appears only while sound is on. **Teacher tools** appears only in teacher view, beside Preferences.
  - The header is one row at 1100 px and wider (including 1366 × 768 and 1280 × 720). On narrower screens and at high zoom the navigation moves to a second row.
  - The current destination is a gold pill.
- **Views.** Each view has an eyebrow (small gold caps), a display heading, one lead sentence, then cards. Card grids are 3 columns, 2 at 1000 px and 1 at 600 px. There is no horizontal scrolling at 1280 or 1366 px, or at 200 % zoom in Spanish (browser-tested).
- **Cards.** Surface color, 1 px line, 14 px radius, resting shadow. Hover deepens the shadow and warms the border (200 ms). Whole-card links keep a visible focus ring.
- **Featured cinematic experience.** Beyond the Podium uses the artwork supplied in the Visual Design Package (`media/labs/btp-feature.jpg`, 1280 × 720, 97 KB) under a navy gradient, so its text keeps contrast. This is not the episode's missing thumbnail, and it was not generated.

## Views
| View | Route | Built from |
| --- | --- | --- |
| Today's Lesson | `#/today` | `viewToday`/`lessonModel` (calendar, odd/even, releases, overrides, `?date=`, journal numbering), with chapters (`CH`), `VIDEOS`, `SPEECHES`, the unit assignment and `SLProgress` |
| My Course | `#/` | `units.json`, `SLProgress`, release dates, `unitLabs`, badge units |
| Learning Labs | `#/labs`, `#/labs/<lab>` | `activities.json` (skills and types only) + `labNames`/`unitLabs` + `studios.json` + each lab's own record; the lab itself is the page's own lab, moved in |
| Resources | `#/resources`, `#/resources/<area>` | the page's own sections (videos, speeches, rubrics, pacing, dates, references, course map, about), moved in; chapters from `CH`; AI levels from `ai-permissions.json` |
| My Achievements | `#/achievements` | `achievements.json` + engine; portfolio groups from `activities.json` |
| Preferences | `#/preferences` | the existing pathway gate, class group, language, support level and theme keys, plus `speakup-prefs-v1` |

## Motion
- Interface transitions use only color, shadow and opacity, at 140–200 ms. Nothing animates continuously.
- **Celebrations** use only transform and opacity, about 1.2 s. The badge reveal, expanding rings and glow, and (knowledge and milestone only) six restrained particles all play at once.
  - The text is readable from the first frame, and the celebration can be dismissed at once with the button, Escape or the backdrop.
  - Tiers: knowledge (blue), applied (teal), teacher-verified (gold; demonstration only until verification exists) and milestone (gold medal, longer reveal).
  - There are no confetti bursts, flashing or screen shake.
- With reduced motion (the device setting, or the student's **Reduce motion**) or with **Achievement animations** off, every animation and particle is removed. The same information appears statically.
