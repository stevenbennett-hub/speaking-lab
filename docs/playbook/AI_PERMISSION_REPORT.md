# AI permission discrepancy report (Slice 12)

Reviewed Nov 24, 2026.

## What you found
On w01d1, the lesson header said grammar and spelling feedback is permitted. The detailed guidance said "No AI use today."

## Cause
There were two sources:
1. **The permission:** the lesson's `ai` setting in `lessons.json`, set in the Lesson Manager. When a lesson has no setting, the class default in `ai-permissions.json` applies. That default is **Grammar and spelling feedback only**, and it is approved policy.
2. **The playbook note:** `unit-1.json` → `lessons.wWWdD.ai`. This is draft teacher text I wrote in Slice 11. The full plan printed it under the heading "AI permission", so it read like a second, conflicting permission.

## Fix: one authoritative permission
- **The permission** is the lesson's setting, or the class default when there is none. If two planned days share one block, the more restrictive setting applies. Every place reads it the same way:

| Where | How it reads the permission |
| --- | --- |
| Today's Lesson and the unit Today tab (students) | `lessonModel().ai` → AI card |
| Quick Teach (screen and print) | `lessonModel().ai`, labelled "lesson setting" or "class default" |
| Full instructional plan (screen and print) | the same for the block, and per planned day via `aiFor()` |
| Concise substitute plan | "AI permission today:" from `lessonModel().ai` (new) |
| Comprehensive substitute plan, projector view (`#/present`) | `lessonModel().ai` (unchanged) |
| AI Coaching Studio and Research Studio | `SL2.aiNow()`, the current assignment's setting (unchanged) |
| Printed exports (PDF and docx) | generated from the views above |

- **The playbook note** is now labelled "Teaching note (draft)". It is never shown as the permission.
- **A conflicting note is flagged, not changed.** When a note says no AI but the permission allows AI, these places show a flag:
  - Quick Teach;
  - the full plan;
  - Playbook → Needs your confirmation.
- **Nothing was changed.** No lesson AI setting and no approved policy was modified. Tests check this.

## Days flagged in Unit 1
| Planned day | Teaching note (draft) | Permission students see |
| --- | --- | --- |
| w01d1 | "No AI use today. Keep the class default…" | Grammar and spelling feedback only (class default) |
| w01d2 | "No AI use. Class default stays in place." | Grammar and spelling feedback only (class default) |
| w01d3 | "No AI use." | Grammar and spelling feedback only (class default) |
| w01d4 | "No AI use for planning. Class default…" | Grammar and spelling feedback only (class default) |
| w01d5 | "No AI use." | Grammar and spelling feedback only (class default) |
| w02d3 | "Not applicable (speech day)." | Grammar and spelling feedback only (class default) |
| w02d4 | "Not applicable (speech day)." | Grammar and spelling feedback only (class default) |
| w02d5 | "Not applicable." | Grammar and spelling feedback only (class default) |

w02d1 and w02d2 are consistent. Their notes recommend the class default.

## Your decision
- **To make a day "Not permitted":** open the lesson in the Lesson Manager (Edit reusable lesson) and set its AI permission. Every view updates, and the flag clears.
- **Otherwise:** edit the playbook note (Playbook → Edit → AI teaching note) so it agrees with the class default. For example: "No AI activity is planned today; the class default (grammar and spelling feedback) applies to written work."

## Refinement (Nov 24): notes revised as recommended
- **The eight notes now separate two things:**
  - that no AI activity is planned;
  - the permission that applies, which is the class default.
- **Example:** "No AI activity is planned today. The class default of grammar and spelling feedback only applies to written work."
- **No lesson permission changed.** All eight days keep the class default (grammar and spelling feedback only), the recommended policy.
- **The check is narrower.** It now flags only notes that claim AI is not allowed ("No AI use", "Not applicable", "AI is not permitted"). A "no AI activity is planned" note is consistent with any permission, and the tests confirm it is not flagged.
- **Flags:** none remain for Unit 1.
