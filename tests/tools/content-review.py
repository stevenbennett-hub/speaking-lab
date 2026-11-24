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
doc.save(sys.argv[2])
print("saved", sys.argv[2])
