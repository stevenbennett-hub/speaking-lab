# Speaking Lab sound library (Slice 12)

**Status (refinement, Nov 24):** all 11 files chosen by Mr. Bennett are in `site/media/sfx/`. They were trimmed, leveled and encoded by `tests/tools/sfx-prepare.py`: 160 KB in all, mono 96 kbps. Every `present` flag is true. `"reviewed"` stays **false** until you have listened to the library in place and approved it.
- **Backup success:** two different takes were supplied. The one without "_1" in its name is used; the other can replace it by running the script again.
- **Duplicates:** the two badge-knowledge files were identical, and so were the two unit-unlock files.

## Where the takes are
Every sound was generated once in Mr. Bennett's ElevenLabs workspace, on Nov 24, 2026:
- flow **"Speaking Lab sound library (Slice 12)"**: https://elevenlabs.io/app/flows/lNLCxKhdiClAgRaEMn8L
- model: ElevenLabs Sound Effects v3 (`eleven_text_to_sound_v3`), prompt influence 0.5;
- 4 variations per sound, 44 takes in all (about 180 credits).

This workspace's network cannot download from ElevenLabs, so the files have to be added by hand.

## How to add them (about 20 minutes)
1. Open the flow, listen to the 4 takes of each sound and download the one you like.
2. Rename each download to its id, for example `ui-click.mp3` or `badge-applied.mp3`, and put them in one folder.
3. From the repository, run `python3 tests/tools/sfx-prepare.py ~/Downloads/sfx`. For each file, the script:
   - trims the silence;
   - caps the length at the manifest maximum, with a 40 ms fade-out;
   - normalizes loudness so every sound plays at the same level (EBU R128, −20 LUFS, −3 dBTP);
   - writes a small mono 96 kbps MP3, about 10–35 KB;
   - sets `"present": true` in the manifest.
4. Listen in Preferences → Sound and motion → Try a sound. When you approve the whole library, set `"reviewed": true` in the manifest.
5. Run `node --test tests/*.test.mjs`, then upload `site/media/sfx/`.

Any take can be regenerated in the flow. Students and the site never contact ElevenLabs.

## Manifest
| File | Target length | Switch | Plays when | ElevenLabs prompt |
| --- | --- | --- | --- | --- |
| ui-click.mp3 | 0.1–0.2 s | Interface | a header link is used (only with interface sounds on) | Extremely short, soft tactile digital interface click. Refined, warm, minimal, no harsh frequencies. |
| studio-open.mp3 | 0.3–0.5 s | Interface | a lab or studio is opened from Learning Labs | Brief cinematic interface transition, gentle atmospheric shimmer, sophisticated educational application. |
| correct-answer.mp3 | 0.4–0.6 s | Feedback | a lab shows one more correct result after the student's own action (all labs that use the shared `.pl-fb` result) | Two warm ascending bell-like notes, subtle and reassuring, clean musical confirmation. |
| try-again.mp3 | 0.2–0.4 s | Feedback | a lab shows one more "not yet" result after the student's own action | Soft neutral wooden tone, encouraging and nonpunitive, extremely brief. |
| activity-complete.mp3 | 0.8–1.2 s | Feedback | a Beyond the Podium, AI Coaching Studio or Research Studio skill is mastered for the first time | Short satisfying three-note musical resolution, warm and sophisticated. |
| badge-knowledge.mp3 | 1–1.5 s | Achievement | a knowledge badge is earned | Delicate crystalline chime with a gentle ascending resolution, suggesting intellectual discovery. |
| badge-applied.mp3 | 1.5–2 s | Achievement | an applied badge is earned | Warm cinematic achievement sound, layered bells and subtle atmospheric texture. |
| badge-verified.mp3 | 2–3 s | Achievement | a teacher-verified badge (none can be earned until verification exists; demo only) | Prestigious orchestral achievement flourish, elegant and inspirational, restrained brass and strings. |
| badge-capstone.mp3 | 2.5–3 s | Achievement | a milestone badge (`activities.json` → `portfolio.milestone`) | Brief cinematic orchestral culmination, inspiring strings and warm resonant bells. Meaningful accomplishment. |
| unit-unlock.mp3 | 1–1.5 s | Achievement | once, the first time a student deliberately opens a unit that became available after they started (`speakup-unlock-v1`); never on page load or at the release time | Gentle atmospheric rise with a luminous musical resolution, suggesting a new opportunity. |
| backup-success.mp3 | 0.3–0.5 s | Interface | "Download my backup file" | Soft, minimal confirmation chime with a clean ending. |

Sound effects of 0.1–0.2 s can't be generated directly; the shortest ElevenLabs clip is 0.5 s. The preparation script trims and caps each file to the target length.

## Audio manager rules (`site/js/sound.js`, the only code that plays these sounds)
- **Off by default.** The master switch, interface sounds and feedback/achievement sounds are separate, plus a volume setting. Preferences are saved in `speakup-prefs-v1`, in this browser, and included in the student's own backup.
- **Intentional interaction.** Turning sound on is the intentional action. After a page load, nothing plays until the student clicks or types again. Nothing ever plays on page load, scrolling, hovering or typing.
- **No overlap.** One sound at a time. An achievement may replace feedback, and feedback may replace an interface sound; never the other way round.
- **Never over media.** No sound while any video or recording is playing, or in presentation mode (`#/present`).
- **Missing or broken files fail silently.** The manifest is fetched only when a sound is about to play, and a file only when it is marked present.
- **Quiet Classroom.** One button turns every sound off. While sound is on, a **Mute sounds** button in the header silences everything at once.
- **Sound is never the only signal.** Everything that sounds also appears on screen.
- **No credentials.** No ElevenLabs credentials, API calls or student accounts.
- **Teacher control is local only.** A teacher can't switch sound off for every student's browser from here. There is no shared mechanism for that, and none is claimed.

## Provenance and usage
- **Origin:** original sound effects generated from the text prompts above. No recordings, game sounds or commercial sound libraries were used as input.
- **Rights:** confirm ElevenLabs' current terms for sound-effect output on your plan before production. The account in use is on the Pro tier, and ElevenLabs' terms govern commercial and attribution requirements.
- **Records:** keep the flow, which records each take, model and prompt.
