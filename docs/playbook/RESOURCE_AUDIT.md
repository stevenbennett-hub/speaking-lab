# Instructor Playbook — resource audit

**Audited:** Nov 24, 2026, on `dev`.
- Everything listed already exists on the site. Nothing was added to the student platform for this audit.
- Counts come from the data files (`site/data/*.json`) and the course page (`site/index.html`).

## 1. What the course already has

| Resource | Where it lives | Count / scope |
| --- | --- | --- |
| Units | `units.json` | 6 units, 16 weeks |
| Planned instructional days | `pacing.json` (16 weeks × 5) and `lessons.json` (`wWWdD`) | 80 planned days. Each has a learning objective, a language objective and success criteria (EN + ES draft). College objectives on some days. |
| Actual class meetings | `calendar-2026-27.json` + `js/schedule.js` | 90-minute blocks, odd group (periods 1·3·5·7, Mon/Thu) and even group (2·4·6·8, Tue/Fri), Wednesdays alternate. 2–3 planned days fold into each block. |
| Daily Learning Journals | `journals.json` | 42 (U1 6 · U2 8 · U3 8 · U4 5 · U5 5 · U6 10), flex journals included. English approved; Spanish draft. |
| Textbook | *Exploring Public Speaking* 4.2 (Tucker, Barton et al., CC BY-NC-SA) | Chapters assigned per unit (`units.json` `reads`). U1: Ch. 1 and Ch. 3. |
| Unit videos (YouTube) | `VIDEOS` in `index.html` | U1 7 · U2 2 · U3 5 · U4 3 · U5 1 · U6 3 |
| Voices of Change ("Speeches That Changed the World") | `SPEECHES` in `index.html` | 17 speeches tied to units and weeks. Full public-domain text where checked, otherwise a summary or excerpt plus a link. U1: the Gettysburg Address (week 2). |
| Interactive Practice Labs | `index.html`, `UNIT_LABS` | 11 labs. U1: Communication Model Lab, The Respectful Audience Lab, The Art of Listening. |
| Studios | `studios.json` | Beyond the Podium (U1), AI Coaching Studio (all units), Research & Academic Integrity (U2–6), Ad Detective (U6, separate site) |
| Slide decks | `DECK_LIST` in `index.html` | U1: Communication Process lesson slides; Self-Introduction (HS); Personal Artifact (college) |
| Speech assignments and rubrics | `units.json` `assign`, `RUBRICS` in `index.html` | One rubric per speech, HS and college, five levels (Exceeds · Meets · Approaching · Beginning · Missing) plus the Academic Integrity gate |
| Reading checks and practice tests | `index.html` | One per unit |
| AI permission | `ai-permissions.json` + lesson `ai` | Default: grammar and spelling feedback only |

**"Great Speeches."** I found no separate "Great Speeches" resource on the site. The closest are:
- **Voices of Change**: the "Speeches That Changed the World" section.
- An unlinked "Speech Samples" entry in the unit resource lists.

If you meant a different collection (e.g. a Canvas page or a book), send it and it will be added to the audit.

## 2. Unit 1 inventory (the prototype)

| Planned day | Pacing (existing) | Already on the site |
| --- | --- | --- |
| w01d1 | Welcome, syllabus, site tour, course level, name-game icebreaker | Journal 1; welcome video; entrance and pathway choice |
| w01d2 | Ch. 1 §1.3, communication-model video, label the diagram | 3 model videos; the unit page's key concepts and diagram; Communication Model Lab |
| w01d3 | Back-to-back drawing; feedback and noise | Journal 2 (the "ok" text); Communication Model Lab (noise types) |
| w01d4 | §1.2 nerves; anxiety video; assign the speech; choose the object | 2 TEDx anxiety talks; Self-Introduction slides; intro rubric; Journal 3 |
| w01d5 | Vocabulary check; delivery basics; partner practice | Unit 1 reading check; rubric delivery rows |
| w02d1 | Ch. 3 ethics, plagiarism, oral citation, AI policy, Academic Integrity slide | Rubric integrity gate; AI permission levels; AI Coaching Studio (Cognitive Ownership, disclosure); Journal 4 |
| w02d2 | Work day: note card, rehearsal (college: key-word outline due) | Rubric self-assessment tool; 2 model self-introductions |
| w02d3–d4 | Speeches | The Respectful Audience Lab (six expectations); The Art of Listening |
| w02d5 | Finish speeches; reflection (one strength, one goal) | Journal 5; rubric self-assessment |
| flex | "When Communication Breaks Down" | Beyond the Podium Episode 1 (55 s film, seven-stage lab) |

### Actual Unit 1 meetings in 2026–27 (computed from the calendar; no overrides)

| Semester · group | Meetings | Planned days per meeting | Journals |
| --- | --- | --- | --- |
| Fall · odd | Aug 13 (getting started), 17, 19 (Wed), 20, 24, 27 | d1 · d1–2 · d3–4 · d5 · w2 d1–3 · w2 d4–5 | 1, 2, 3, 4, flex, 5 |
| Fall · even | Aug 14 (getting started), 18, 21, 25, 26 (Wed), 28 | d1 · d1–3 · d4–5 · w2 d1–2 · w2 d3–4 · w2 d5 | 1, 2, 3, 4, flex, 5 |
| Spring · odd | Jan 6 (Wed), 7, 11, 14 | d1–3 · d4–5 · w2 d1–3 · w2 d4–5 | 1, 2, 4, 5 (short unit keeps first and last) |
| Spring · even | Jan 5, 8, 12, 13 (Wed), 15 | d1–3 · d4–5 · w2 d1–2 · w2 d3–4 · w2 d5 | 1, 2, 3, 4, 5 |

Notes:
- **Fall "getting started" day.** In fall, the first meeting (week 0) teaches w01d1, and the next meeting repeats w01d1 together with w01d2. The playbook treats the repeat as review time.
- **Spring odd** has only four meetings, so speeches fall in two blocks.
- **Overrides** (closures, extended lessons, journal moves) change this table automatically. The playbook's meeting plans are always computed from the live schedule.

## 3. Connection opportunities (no duplication)

1. **Model the self-introduction before students write it.**
   - The two model self-introductions are listed on the unit page but not tied to a day. Use them on w01d4–w02d2 for rubric calibration (score one model together).
   - Lincoln's Gettysburg Address (Voices of Change, Unit 1, week 2) is about two minutes long, like the speech students give. It shows a hook, three parts and a memorable ending. The site already has the full public-domain text.
2. **Make the model concrete with the lab.** The Communication Model Lab's first scenario (Maya's recipe speech) is a class speech. It mirrors the self-introduction, so use it right after the diagram (w01d2).
3. **Back-to-back drawing → noise types → Beyond the Podium.** The lab names three kinds of noise (contextual, physical, psychological). The 55-second film shows a conversation breaking down. Pair them on the flex meeting (fall only), or as an optional observation after the drawing activity. Don't displace the drawing activity.
4. **Speech anxiety → the audience's job.** The anxiety talks (w01d4) and The Respectful Audience Lab (before speech days) explain the same thing from both sides: the speaker's nerves, and how an audience can lower them.
5. **Ethics day → AI Coaching Studio.** Cognitive Ownership and the AI-use disclosure already teach "AI is a coach, not an author." Use one section instead of new slides. The Research Studio opens in Unit 2, so it is previewed there, not here.
6. **Journals already carry the day's thinking.**
   - Journal 2 ("ok" text) previews noise and feedback.
   - Journal 4 (AI writes the speech) is the ethics hook.
   - Journal 5 is the reflection.

   Teacher talking points refer to them instead of adding new warm-ups.
7. **Cross-unit:** Sotomayor's confirmation-hearing opening statement (Voices of Change, Unit 2) is a model of a formal self-introduction. Mention it in Unit 2 as a callback; don't move it.
8. **Reading checks** (w01d5 vocabulary check) already exist. The playbook uses them as formative evidence instead of a new quiz.

## 4. Video audit for Unit 1 (checked Nov 24, 2026 through YouTube's public oEmbed service)
All seven Unit 1 videos and the Voices of Change reading are online, with these titles and channels:

| Video | Channel | Upload type |
| --- | --- | --- |
| The Communication Process Model Captioned | IISD CommApps | Educational channel; title says captioned |
| The Communication Process | GreggU | Educational channel |
| How Communication Works, The Communication Model, explained with examples | Begrepen be | Educational channel |
| Example: Self-Introduction Speech | browardCollege1 | College's own channel |
| My Self Introduction Speech: Public Speaking (College Course) | The D.I.Y Reader | Personal upload by the speaker's channel |
| The Secret to Overcoming the Fear of Public Speaking, Sha Nacino, TEDxYouth@SJCS | TEDx Talks | Official TEDx channel |
| How I Overcame My Fear of Public Speaking, Danish Dhamani, TEDxKids@SMU | TEDx Talks | Official TEDx channel |
| The Gettysburg Address (as read by Max McLean) | Scott Bacher | **Personal upload of a recording.** Use the site's full text as the primary source; consider an official upload if you have one. |

**What this audit could not verify:** this session cannot play videos. So durations, content, captions quality and timestamps are **not verified**.
- Every viewing guide leaves the segment start and end blank for you to fill in after previewing.
- No guide quotes a video.
- The guides are built so the tasks work with any segment you choose.
