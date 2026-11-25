# Proposal: verifying Confident Speaker, Master Storyteller and Master Communicator

Status: **proposal only**. The three communication badges stay "Teacher verification: not available yet."

## The constraint
Speaking Lab is a public static site. Anything a teacher could do in the browser to "verify" a student (a code, a
button, a hidden page) can be copied or repeated by a student, because the code and data are public and progress lives
in each student's own browser. So Speaking Lab must not be the place where teacher verification is decided.

## Recommendation: Canvas is the record; Speaking Lab only explains
1. **Grade the speeches in Canvas with your existing rubrics** (that is already the official assessment).
2. **Use Canvas Outcomes or Mastery Paths** to mark the competencies. The thresholds come from your existing
   rubrics: see `teacher-verified-rubric-mapping.md` (Slice 10), which maps each badge to real rubric rows
   and their own Meets/Exceeds points. Canvas then shows the student their verified result, with your login behind it.
3. Optionally, **Canvas Credentials (Badgr)**, if the district has it, can issue a real, verifiable badge from those
   outcomes. No new service needed if the district already licenses it; otherwise it would need approval.
4. In Speaking Lab, the three badges link to a short page: "These are verified by Mr. Bennett in Canvas. See your Canvas
   grades or outcomes." Speaking Lab never marks them earned.

## Options considered and not recommended
- Teacher codes per badge, or a teacher "verify" button on the student's device: students could reuse or share them.
- Signed verification tokens: would need a server holding a secret key (a backend, not approved).
- A shared spreadsheet or form feeding the site: would put student information in a public site or need accounts.

## Decisions for you
- Which rubric criteria and score thresholds define each badge (proposals in `teacher-verified-rubric-mapping.md`).
- Whether to use Canvas Outcomes only, or Canvas Credentials if available in KCKPS.
