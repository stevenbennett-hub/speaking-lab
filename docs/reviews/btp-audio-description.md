# Beyond the Podium, Episode 1 — is an audio-described version needed?

Reviewed Nov 24, 2026 against the supplied film (`beyond_the_podium_final.mp4`, 55 s), its transcript and the lab's seven stages. This is a planning review, **not** a formal WCAG conformance claim.

## What a student who cannot see the film would miss
Almost all of the story is in the dialogue, which is captioned and in the transcript. Five pieces of visual information are not spoken:

| Time | What the film shows | Needed for |
| --- | --- | --- |
| 0:00.5–0:04.5 | Jordan types on a laptop; Alex, head on one hand, looks down at a phone | **Technoference question** (the new feedback asks students to observe this opening) |
| 0:12.2–0:14 | Alex looks up from the phone and folds his arms | Nonverbal-signals discussion |
| 0:30–0:34 | Alex picks up a backpack and walks out; Jordan stays, chin on hand | The breakdown and "what happened next" |
| 0:34–0:40 | Jordan sits alone, looking down | Perspective-taking |
| 0:51.5–0:55 | Title card: "Beyond the Podium. Where did communication break down?" | Framing question |

Without these, the technoference item ("Now observe the opening of the film…") could not be answered meaningfully.

## What Slice 10 provides (no new media)
1. **Descriptions in the transcript.**
   - Rows labeled **"What the film shows"** (styled `btp-desc`) sit before the lines they belong to.
   - English, plus a Spanish draft.
   - They describe actions only. They never describe emotions or motives, because the lab asks students to infer those.
2. **Timed text descriptions** (`descriptions.en.vtt`, `descriptions.es.vtt`, drafts for review).
   - A **"Read descriptions aloud"** checkbox in the player uses the browser's own voice (speechSynthesis).
   - At each description the film pauses, the description is read, then the film resumes. This is extended description, so no dialogue is covered.
   - Off by default, and remembered per student.
   - Screen-reader users can rely on the transcript instead.
3. **Captions.** English captions (from the film) are unchanged. Spanish captions are a draft and are shown only after review.
4. **Lower-bandwidth copy.** A 720p copy (5.0 MB) gives the same film, dialogue, captions and timing at a smaller size. The 1080p original is unchanged.

## Recommendation
- **A separately recorded audio-described film is not needed for Episode 1 to be usable.** The transcript descriptions and the optional read-aloud descriptions give equivalent access to the five visual moments.
  - The film is short (55 s).
  - Its meaning is carried by dialogue.
  - The lab's tasks can be completed from the descriptive transcript.
- **Consider a recorded version later** if a student who is blind or has low vision will use it regularly. A described version narrated in the episode's own production would sound more natural than a browser voice. That needs:
  - your approval;
  - recording in the original production, because the film, voices and characters must not be regenerated here;
  - a new file, `beyond_the_podium_described.mp4`, which the player could offer as a third version.

## Still to check (teacher review)
- Read the English descriptions against the film. Approve or edit them; they are marked `reviewed: false`.
- Review the Spanish descriptions and captions (drafts).
- Try "Read descriptions aloud" on a district laptop. ChromeOS voices vary; if no voice is installed, the transcript still works.
