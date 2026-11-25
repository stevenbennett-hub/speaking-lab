# Writes the teacher content review as a Word document from the bundle made by content-review.mjs.
import json, sys
from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

data = json.load(open(sys.argv[1], encoding="utf-8"))
doc = Document()
sec = doc.sections[0]; sec.left_margin = sec.right_margin = Inches(0.8); sec.top_margin = sec.bottom_margin = Inches(0.7)
st = doc.styles["Normal"]; st.font.name = "Calibri"; st.font.size = Pt(11)
DRAFT = RGBColor(0xA8, 0x36, 0x1A)

def shade(cell, hexcolor):
    tcPr = cell._tc.get_or_add_tcPr(); s = OxmlElement("w:shd"); s.set(qn("w:val"), "clear"); s.set(qn("w:color"), "auto"); s.set(qn("w:fill"), hexcolor); tcPr.append(s)

def table(rows, header=None, widths=None):
    t = doc.add_table(rows=0, cols=len(rows[0] if rows else header)); t.style = "Table Grid"
    if header:
        cells = t.add_row().cells
        for i, h in enumerate(header):
            cells[i].text = ""; r = cells[i].paragraphs[0].add_run(h); r.bold = True; shade(cells[i], "E2E7EF")
    for row in rows:
        cells = t.add_row().cells
        for i, v in enumerate(row):
            cells[i].text = ""
            if isinstance(v, tuple): r = cells[i].paragraphs[0].add_run(v[0]); r.bold = True
            else: cells[i].paragraphs[0].add_run(v or "")
    if widths:
        t.autofit = False
        for i, w in enumerate(widths):
            t.columns[i].width = Inches(w)
            for c in t.columns[i].cells: c.width = Inches(w)
    doc.add_paragraph()
    return t

def status_tag(p, text):
    r = p.add_run(f"  [{text}]"); r.bold = True; r.font.color.rgb = DRAFT if "DRAFT" in text else RGBColor(0x1F, 0x73, 0x64)

h = doc.add_heading("Speaking Lab 2.0 — Instructional Content Review", 0)
doc.add_paragraph(f"Generated {data['generated']} from the site's data files (site/data/*.json). Nothing here is published to students until you approve it and it is released to the main branch.")
p = doc.add_paragraph(); p.add_run("How to use this document. ").bold = True
p.add_run("Each item is marked APPROVED or DRAFT, separately for English and Spanish. You can review here (Track Changes works well) or directly in the Teacher Lesson Manager (Review tab), which exports the approvals into the site's data files. Nothing is approved automatically. The college notice is your required English text with a DRAFT Spanish translation.")

p = doc.add_paragraph(); p.add_run("What's new in this edition (Instructor Playbook, after Slice 10). ").bold = True
p.add_run("The Unit 1 Instructor Playbook (draft) and Unit 1 review notes with suggested English and Spanish edits (not applied) are in their own section. Earlier, Slice 10 added: Beyond the Podium: your technoference feedback (exact wording) with a Spanish draft; descriptions of what the film shows, added to the transcript and as an optional read-aloud track; Spanish captions (draft, cue by cue against the English); Spanish gender corrections for Jordan. Achievements: the new Master Ad Detective badge and updated descriptions of the three teacher-verified badges (still pending). Typed journal: five facts students now read. Ad Detective (separate site, dev branch): new labels for independent mastery and the preview bar. Nothing has been approved on your behalf; statuses below are exactly as recorded in the data files.")

doc.add_heading("Approval status at a glance", 1)
def cnt(items):
    c = {}
    for s_ in items: c[s_] = c.get(s_, 0) + 1
    return ", ".join(f"{v} {k}" for k, v in sorted(c.items()))
les = [((d["lesson"] or {}).get("status") or data["lessonsStatus"]) for u in data["units"] for d in u["days"]]
jou = [j["status"] for u in data["units"] for j in u["journals"]]
rows = [[("Daily objectives and success criteria",), cnt(x["en"].upper() for x in les), cnt(x["es"].upper() for x in les)],
        [("Daily Learning Journals",), cnt(x["en"].upper() for x in jou), cnt(x["es"].upper() for x in jou)]]
for e in data.get("btp", []): rows.append([(e["title"],), e["status"]["en"].upper(), e["status"]["es"].upper()])
for k, n in (("ai", "AI Coaching Studio"), ("research", "Research & Academic Integrity Studio")):
    if data.get(k): rows.append([(n,), data[k]["status"]["en"].upper(), data[k]["status"]["es"].upper()])
rows += [[("Achievements text",), "NO APPROVAL RECORDED", "NO APPROVAL RECORDED (DRAFT)"],
         [("Typed-journal notice",), "NO APPROVAL RECORDED", "DRAFT"],
         [("Pacing-guide lines",), "as on the live site", f"{len(data['missing'])} lines have no Spanish"]]
if data.get("adDetective"): rows.append([("Ad Detective new labels (dev branch)",), "NO APPROVAL RECORDED", "DRAFT"])
table(rows, header=["Content", "English", "Spanish"], widths=[2.6, 2.1, 2.1])

doc.add_heading("1. College Public Speaking notice", 1)
p = doc.add_paragraph(); p.add_run("Shown before college entry. The college pathway is turned off by default.").italic = True
table([[("English (required wording)",), data["notice"]["en"]], [("Spanish",), data["notice"]["es"]]], widths=[1.6, 5.2])

doc.add_heading("2. Pacing-guide lines that still need Spanish", 1)
doc.add_paragraph(f"{len(data['missing'])} lines in the pacing guide have no Spanish translation on the site. In Spanish they currently appear in English (on the live site as well).")
table([[f"Week {m['week']}, day {m['day']}", m["who"], m["text"]] for m in data["missing"]], header=["When", "Pathway", "English text"], widths=[1.2, 1.0, 4.6])

for u in data["units"]:
    doc.add_page_break()
    doc.add_heading(f"Unit {u['id']}: {u['title']}", 1)
    doc.add_paragraph(f"Course weeks {u['weeks'][0]}–{u['weeks'][-1]}.")
    doc.add_heading("Daily learning and language objectives", 2)
    for d in u["days"]:
        stt = (d["lesson"] or {}).get("status") or data["lessonsStatus"]
        p = doc.add_heading(f"Week {d['week']}, day {d['day']}", 3); status_tag(p, f"English {stt['en'].upper()} · Spanish {stt['es'].upper()}")
        pc = d["pacing"]
        if "both" in pc: doc.add_paragraph().add_run("Pacing: ").bold = True; doc.paragraphs[-1].add_run(pc["both"])
        else:
            pp = doc.add_paragraph(); pp.add_run("Pacing (high school): ").bold = True; pp.add_run(pc["hs"])
            pp = doc.add_paragraph(); pp.add_run("Pacing (college): ").bold = True; pp.add_run(pc["col"])
        L = d["lesson"]; rows = ([[("Lesson title",), L["title"]["en"], L["title"].get("es", "")]] if L.get("title") else []) + [[("Learning objective",), L["learn"]["en"], L["learn"]["es"]]]
        if L.get("col"): rows.append([("College learning objective",), L["col"]["en"], L["col"]["es"]])
        rows.append([("Language objective",), L["lang"]["en"], L["lang"]["es"]])
        if L.get("agenda"): rows.append([("Agenda (teacher-edited)",), "\n".join(L["agenda"]["en"]), "\n".join(L["agenda"].get("es", []))])
        if L.get("exit"): rows.append([("Exit reflection",), L["exit"]["en"], L["exit"].get("es", "")])
        rows.append([("Success criteria",), "\n".join("• " + x for x in L["success"]["en"]), "\n".join("• " + x for x in L["success"]["es"])])
        table(rows, header=["", "English", "Spanish"], widths=[1.5, 2.65, 2.65])
    doc.add_heading("Daily Learning Journals", 2)
    doc.add_paragraph("One journal per 90-minute block: about 10 minutes of handwritten writing, then stand and share with someone new. Every 10 journals form a 100-point set. Numbers are planned numbers for a full semester; the site numbers each class by its own meetings.")
    for j in u["journals"]:
        title = (j.get("title") or j["focus"])
        num = f"Journal {j['n']}" if j.get("n") else "Flex journal"
        p = doc.add_heading(f"{num}: {title['en']}", 3)
        status_tag(p, f"English {j['status']['en'].upper()} · Spanish {j['status']['es'].upper()}")
        if j.get("flex"): doc.add_paragraph("Used only when a class has an extra meeting in this unit" + (f"; placed before {j['before']}." if j.get("before") else "; placed at the end of the unit."))
        rows = [[("Prompt",), j["prompt"]["en"], j["prompt"]["es"]],
                [("Stand and share",), j["share"]["en"], j["share"]["es"]]]
        if j.get("alt"): rows.append([("No-disclosure option",), j["alt"]["en"], j["alt"]["es"]])
        rows.append([("Sentence starters",), "\n".join(j["frames"]["en"]), "\n".join(j["frames"]["es"])])
        rows.append([("Vocabulary",), ", ".join(j["vocab"]["en"]), ", ".join(j["vocab"]["es"])])
        table(rows, header=["", "English", "Spanish"], widths=[1.5, 2.65, 2.65])
for e in data.get("btp", []):
    doc.add_page_break()
    p = doc.add_heading(f"Beyond the Podium lab — {e['title']}", 1)
    status_tag(p, f"English {e['status']['en'].upper()} · Spanish {e['status']['es'].upper()}")
    doc.add_paragraph("All lab text, written from the official transcript. The film's own dialogue (Transcript) is shown so you can check the Spanish translation; the English must match the approved film exactly. Practice dialogue in Change the Conversation is new text and is labeled for students as practice, not part of the film.")
    if e["missing"]:
        p = doc.add_paragraph(); p.add_run("Missing media (not in the repository; the lab uses the transcript until they are added): ").bold = True
        p.add_run("; ".join(e["missing"]) + ".")
    for name, rows in e["sections"]:
        doc.add_heading(name, 2)
        table([[(r[0],), r[1], r[2]] for r in rows], header=["", "English", "Spanish"], widths=[1.5, 2.65, 2.65])
if data.get("ai"):
    e = data["ai"]
    doc.add_page_break()
    p = doc.add_heading("AI Coaching Studio — Your Thinking. Your Voice.", 1)
    status_tag(p, f"English {e['status']['en'].upper()} · Spanish {e['status']['es'].upper()}")
    doc.add_paragraph("All studio text and the four AI permission levels. Every prompt asks AI to question, explain or give feedback and tells it not to do the student's work. The Fact Checker's researcher, journal and lookups are fictional and labeled as simulated for students. Set an assignment's permission in the Lesson Manager (lesson editor, \"AI permission for this lesson's work\"); the class default is grammar and spelling feedback only.")
    for name, rows in e["sections"]:
        doc.add_heading(name, 2)
        table([[(r[0],), r[1], r[2]] for r in rows], header=["", "English", "Spanish"], widths=[1.5, 2.65, 2.65])
if data.get("research"):
    e = data["research"]
    doc.add_page_break()
    p = doc.add_heading("Research & Academic Integrity Studio — From Evidence to Credibility", 1)
    status_tag(p, f"English {e['status']['en'].upper()} · Spanish {e['status']['es'].upper()}")
    doc.add_paragraph("All studio text. Case files, people, sites, journals and source passages marked fictional were written for these activities; authentic examples are described, not quoted. The portfolio's required number of sources is set in site/data/research-studio.json (portfolio.assignments).")
    doc.add_heading("APA rules and the official page each was checked against", 2)
    doc.add_paragraph(f"Checked against apastyle.apa.org on {e['checked']}. Italics in the site are marked here with *asterisks*.")
    table([[(r["topic"],), r["rule"], r["src"]] for r in e["apa"]], header=["Rule", "As taught (English)", "Official source"], widths=[1.3, 3.5, 2.0])
    for name, rows in e["sections"]:
        doc.add_heading(name, 2)
        table([[(r[0],), r[1], r[2]] for r in rows], header=["", "English", "Spanish"], widths=[1.5, 2.65, 2.65])
def simple_section(title, intro, rows):
    doc.add_page_break(); p = doc.add_heading(title, 1); status_tag(p, "DRAFT · no approval recorded")
    doc.add_paragraph(intro)
    table([[(r[0],), r[1], r[2]] for r in rows], header=["", "English", "Spanish"], widths=[1.5, 2.65, 2.65])
if data.get("playbook"):
    doc.add_page_break(); p = doc.add_heading("Instructor Playbook (teacher-facing)", 1); status_tag(p, "DRAFT · not approved")
    doc.add_paragraph("New in this edition. The playbook extends the lessons by lesson key; objectives, success criteria and journals are not copied into it, so the review status of those stays in the sections above. Full text: 'Unit 1 Instructor Playbook (draft).docx' and Lesson Manager → Playbook.")
    for pbk in data["playbook"]:
        doc.add_heading(f"Unit {pbk['unit']}: {pbk['title']} (status {pbk['status']}, updated {pbk['updated']})", 2)
        table([[(k,), t, ""] for k, t in pbk["days"]], header=["Planned day", "Playbook lesson", ""], widths=[1.2, 5.0, 0.6])
        table([[(v[0],), v[1], v[2]] for v in pbk["videos"]], header=["Video", "Channel", "Segment"], widths=[3.4, 1.8, 1.6])
        if pbk.get("confirm"):
            doc.add_heading(f"Unit {pbk['unit']}: needs your confirmation (nothing changed)", 3)
            table([[(c[0],), c[1], "☐ yes   ☐ no   ☐ change: ____"] for c in pbk["confirm"]], header=["Question", "Why it is asked", "Your decision"], widths=[2.4, 2.8, 1.6])
    for t in data.get("playbookReview", []):
        doc.add_heading(f"Unit 1 review notes: {t['title']}", 2)
        doc.add_paragraph("Suggestions only; nothing was changed and no status was changed.")
        table([[(r[0],)] + r[1:] for r in t["rows"]], header=["Where", "Observation / current", "Suggestion"], widths=[1.4, 2.7, 2.7])
if data.get("achievements"):
    simple_section("Achievements (badge names, descriptions and criteria)", "Students see these on My achievements. Communication badges stay pending until a verification process exists; Canvas is the official record. Master Ad Detective is new; it can be earned only after the Ad Detective dev branch is published.", data["achievements"])
if data.get("journalFacts"):
    simple_section("Typed (digital) journal: what students read", "Shown to students with the typed-journal option, before and after they enter the code. Handwritten journals remain the class routine.", data["journalFacts"])
if data.get("adDetective"):
    simple_section("Ad Detective: new labels (dev branch, not published)", "From the separate Ad Detective site's dev branch (src/app.js). Existing Ad Detective text is unchanged and not repeated here.", data["adDetective"])
doc.save(sys.argv[2])
print("saved", sys.argv[2])
