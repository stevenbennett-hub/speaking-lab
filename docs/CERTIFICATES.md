# Portable achievements: certificates, portfolio, Email to Myself, backups

**Status:** built on `dev`. Not deployed.
- New Spanish text is a **draft** until Mr. Bennett reviews it.
- The privacy design is described for the district in `docs/privacy/STUDENT_PRIVACY_AND_DATA_HANDLING.md`.

## Where students find it
| Place | What |
| --- | --- |
| **My Achievements** | **My Communication Achievement Portfolio**, **Back up my progress**, and a weekly backup reminder that can be dismissed. Each **earned** badge has a **Certificate** button. Locked or pending badges have none. |
| **Certificate** (`#/certificate/<badge>`) | <ul><li>Optional name with the privacy notice.</li><li>A style switch: **Printer friendly** (default) or **Full color**. The preview is the actual document.</li><li>**Print** (low ink), **Download printer-friendly PDF**, **Download full-color PDF**, **Download full-color image (PNG)**, **Download badge (PNG)**.</li><li>**Email to myself**, and **How to keep it** (Drive, Canvas, printing).</li></ul> |
| **Portfolio** (`#/portfolio`) | <ul><li>Optional name.</li><li>An optional five-question end-of-course reflection.</li><li>Both styles, Print (low ink), both PDFs, Email to myself.</li></ul> |
| **Celebration** | **Continue learning** · **View certificate**, with small links **Download badge** · **Back up my progress**. Dismissible at once, as before. |
| **Teacher demonstration** (`#/demo/celebrate` → *Sample certificate*) | Sample certificates for any badge, with a fictional name, labelled **DEMONSTRATION · SAMPLE**. Nothing is saved or awarded. |

## What a certificate shows (all from existing data)
**Front matter:**
- SPEAKING LAB 2.0;
- the badge's own medallion artwork;
- CERTIFICATE OF ACHIEVEMENT;
- the badge title;
- "Presented to" and the name, only if one is entered.

**Body:**
- the badge description;
- **Demonstrated by:** the badge's actual criteria;
- **Communication competencies:** the skills of the activities those criteria use (`activities.json`, draft tags).
  - Knowledge badges earned by reading checks use `activities.json` `badgeSkills`: Communication Explorer → Communication process; Evidence Investigator → Audience awareness, Research literacy, Speech organization.
  - Persistent Learner (improving any score) has no single competency, so it lists none;
- the category (level, plus Independent mastery where it applies);
- **Earned** with the engine's recorded date, or "Date not recorded";
- the badge's learning points.

**Footer:**
- Wyandotte High School | Speech & Communication;
- **Steven Bennett, Instructor**;
- a statement that it is an independent learning achievement recorded by practice activities, and that the instructor's name identifies the course, not a verification;
- a statement that it is not a grade, credit, credential or transcript, and not tamper-proof.

There is no signature. Teacher-verified certificates can exist only after real verification, and none can be earned yet.

**Labels:**
- **DEMONSTRATION · SAMPLE** on teacher samples;
- **DEVELOPMENT PREVIEW** on anything made on the preview site (it prints in black, so it shows in grayscale).

## Two styles
| | Full color (digital) | Printer friendly (default for Print) |
| --- | --- | --- |
| Page | US Letter, navy page, thin gold double border | US Letter, white page, thin black and gray double border |
| Artwork | Badge medallion in its level color | Outlined black medallion with a thin stroke and no fill |
| Text | Gold title, teal labels, soft white body | Black and dark-gray text only |
| Use | Email, Drive, Canvas, family | School printers |

- **Fitting the page:** long names, titles and Spanish text shrink to fit instead of clipping. Every certificate is one page (tested with a 44-character name).
- **Portfolio:** several achievements per page, grouped by competency.
  - A heading is never left alone at the bottom of a page.
  - It shows the number of achievements, the total learning points (all activities, as on My Achievements) and the competencies shown.
  - Answered reflections are included; page numbers are added.

## How files are made
- **Drawing:** each document is drawn on a `<canvas>` with the site's own fonts and badge art.
  - PNG comes straight from the canvas.
  - The PDF is written by `js/certificates.js` itself: one JPEG page image per US Letter page, with **no metadata dictionary**.
  - There is no library and no external service, and nothing is requested from the network.
- **Print** shows only the document pages and uses the browser's print dialog, which also offers "Save as PDF".
- **Filenames** are generic and never include a name: `speaking-lab-<badge>.pdf`, `speaking-lab-<badge>-print.pdf`, `speaking-lab-<badge>.png`, `speaking-lab-<badge>-badge.png`, `speaking-lab-achievement-portfolio(-print).pdf`.
- **Text in PDFs:** the PDFs are images of the pages, so their text cannot be selected or searched. Screen readers get a text description in the app (see limitations).

## Email to Myself
1. Download the style you want.
2. **Open email draft:** a `mailto:` link with a generic subject and message, no recipient and no name.
3. In your own email, type your own address, **attach the file** (a draft cannot attach it), review and send.

If no mail app opens, which is common on managed laptops, **Copy subject** and **Copy message** work with school webmail. No provider is assumed. Speaking Lab never says an email was sent.

## Privacy rules (enforced by tests and the browser audit)
The optional name and reflections:
- live only in page memory;
- are never stored (local or session storage, cookies, IndexedDB);
- are never sent anywhere;
- are never put in URLs, mailto links, filenames, metadata or backups;
- are cleared when leaving the view, opening another certificate, or refreshing.

- **Visible, not hidden:** a name or reflection a student types does appear visibly on documents the student chooses to export, print or share. It is never in hidden metadata or the filename.
- **Backups:** the progress backup can contain what students typed in practice activities and typed journals. The backup dialog tells them so. Names and reflections are never in it.

`autocomplete` and spell-check are off on those fields. There is no "Remember my name". Audit: `tests/tools/privacy-audit.py` (60 of 60 checks passed).

## Integrity
- Certificates exist only for badges the engine records as **earned**, and only for active badges.
- Viewing, downloading, printing or emailing changes no progress, points or badges. Celebrations do not replay (browser-tested).
- Demonstration mode changes nothing (browser-tested).
- Certificates and portfolios cannot restore progress; only the backup file can, and restoring asks for confirmation first.

## Student-facing privacy notices
- **Second note beside the name field:** "Your name and reflection answers appear only where you can see them on the document. Speaking Lab never sends them anywhere and never adds them to hidden file information (metadata) or to the file name."
- **Backup dialog:** "Your backup also holds anything you typed in practice activities and typed journals, so keep it in your own Drive and don't share it. Certificate names and portfolio reflections are never included."
- **Name field:** "Adding your name is optional. Speaking Lab uses it temporarily in your browser to personalize your certificate. Your name is not saved by the application or sent to our website host. If you download, print or share your certificate, your name will appear on that copy."
- **Portfolio:** "Your reflection answers stay only on this page while it is open. They are not saved, not graded and not sent anywhere. Download or print your portfolio before you leave this page if you want to keep them. Don't include private information you wouldn't want on a shared document."
- **My Achievements:** "Certificates and the portfolio are records you can keep, print or share; they cannot restore progress. The progress backup file restores your progress on another computer. Ad Detective keeps its own records in its Notebook."
