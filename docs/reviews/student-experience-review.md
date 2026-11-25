# Final student experience review (Slice 10)

Reviewed Nov 24, 2026 on `dev`.

**How:**
- Every student route was walked in English and Spanish at 1366×768: the entrance, My course, Achievements, each unit's four tabs (Today, Lessons and journals, Unit guide, Labs and studios), all Beyond the Podium stages, all AI Coaching Studio and Research Studio sections, and the portfolio summary.
- Spot checks at phone size (iPhone 13) and in the preview build.
- The script checked for leftover placeholders (`undefined`, `NaN`, `${`), duplicate ids, unnamed controls, images without alt text, heading order, horizontal overflow and script errors.
- Screenshots are in the Slice 10 screenshot ZIP.

No substantial new functionality was added. This is a consistency pass.

## Results by area

| Area | Finding | Action |
| --- | --- | --- |
| **Navigation** | Every unit tab starts with "← All units". Every studio page has one return link. | None needed |
| | Return links found: "← AI Coaching Studio", "← Research Studio", "← Unit 1: labs and studios", "← Episode overview" and "← My course" (hub pages). | |
| | No script errors in either language. No overflow at 1366 px or on phone. | |
| **Terminology** | Course-wide terms are used the same way everywhere: "Labs and studios", "Lessons and journals", "Unit guide", "Language support" (a preference, never a level), "Learning points", "mastered". | None needed |
| | Ad Detective now uses "On your own" (mastery) vs. "practice" (answer shown). Master Ad Detective's criteria use the same words. | |
| **Visual hierarchy** | One `h1` per page everywhere. | Fixed: the Beyond the Podium series page jumped from `h1` to `h3`; it now has a hidden "Episodes" `h2`. |
| | The classic Unit guide jumps from `h1` to `h3`. That markup is in the classic page. | Left as is (minor) |
| **Instructions** | Every activity has a lead sentence before its controls. | Fixed: the technoference feedback (now three paragraphs) ran together; its line breaks now show. |
| **Objectives** | Today shows the day's learning and language objectives in context, with the same goals at every language-support setting. College objectives show only on the authorized college pathway. | None needed |
| **Journals** | Today shows the journal number, prompt, "10 minutes · Write by hand", stand and share, and the typed option behind the code. Numbers match the schedule tests. | Added the five typed-journal facts (below). |
| **Language scaffolding** | Guided opens vocabulary and adds short steps. Independent folds the sentence starters. Spanish labels everywhere. Spanish content is marked draft in the content review. | None needed |
| **Transitions** | Beyond the Podium stages link forward and back. The studios lead from the hub to sections and back. The research portfolio summary has "Back to editing". | None needed |
| **Achievement feedback** | A toast appears when a badge is earned. Each badge shows its criteria with progress (e.g. "3 / 3"). Pending badges say why. | Master Ad Detective added. The three teacher-verified badge descriptions now match the provisional framework and say Canvas is the official record. |
| **Progress and mastery explanations** | The achievements page says badges are practice, not grades. Learning points count each mastered item once. Ad Detective explains "On your own" vs. practice on every Analyze step. | None needed |

## Typed (digital) journal: what students now read
Shown before the code is entered, and again under "How typed journals work" after:
1. The code is a classroom permission from Mr. Bennett, not a password or secure login.
2. What you type is saved only in this browser on this device. It is not sent to anyone.
3. When Mr. Bennett asks for it, turn it in through Canvas.
4. Typed responses are not graded automatically.
5. This site can't check whether a journal was done, handwritten or typed. Mr. Bennett checks that.

Nothing asks why a student types, and nothing collects disability or accommodation information.

## Not changed (for your judgment)
- The Unit guide's classic heading order (h1 → h3).
- The "New achievement" toast can cover the bottom of the screen for a few seconds after a badge is earned.
- Spanish activity text in Ad Detective was already translated there. Its new mastery labels are new drafts (listed in the content review).
