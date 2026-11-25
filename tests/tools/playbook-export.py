"""Export a unit's Instructor Playbook as teacher documents, generated from the site itself (single source of truth).

Usage (from the repository root, with the site served locally, e.g. `python3 -m http.server 8768 -d site`):
    python3 tests/tools/playbook-export.py http://localhost:8768/index.html 1 OUT_DIR

Writes, for Unit N:
  Unit N Instructor Playbook (draft).docx      overview, meeting maps, every planned-day plan, video guides,
                                               formative resources, substitute steps, materials and prep
  Unit N Daily Teacher Plans (all groups).pdf  the printable plan for every real class meeting (#/teacher/print/plan)
  Unit N Substitute Plans (all groups).pdf     the site's substitute plan for every meeting (#/sub)
  Unit N Video Viewing Guides.docx, Unit N Formative Assessment Resources.docx, Unit N Materials and Prep Checklist.docx
Needs Python packages: playwright (with Chromium), python-docx, pypdf. Uses the teacher view code from tests only to open
the Lesson Manager in a throwaway browser profile; nothing is saved."""
import json, sys, pathlib, io
from playwright.sync_api import sync_playwright
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from pypdf import PdfWriter, PdfReader

BASE, UNIT, OUT = sys.argv[1], int(sys.argv[2]), pathlib.Path(sys.argv[3])
OUT.mkdir(parents=True, exist_ok=True)
TEACHER = "4f676b5a"  # hash of the teacher view code (a classroom convenience, not a credential)
COMBOS = [("fall", "odd", "2026-08-01T09:30:00-05:00"), ("fall", "even", "2026-08-01T09:30:00-05:00"),
          ("spring", "odd", "2027-01-02T09:30:00-06:00"), ("spring", "even", "2027-01-02T09:30:00-06:00")]
SEM = {"fall": "Fall 2026", "spring": "Spring 2027"}; GRP = {"odd": "Periods 1, 3, 5, 7 (Mon/Thu)", "even": "Periods 2, 4, 6, 8 (Tue/Fri)"}

def ready(pg): pg.wait_for_selector("html[data-speakup-ready]", timeout=20000); pg.wait_for_timeout(700)

bundle = {"runs": []}
plans, subs = PdfWriter(), PdfWriter()
with sync_playwright() as p:
    b = p.chromium.launch()
    for sem, grp, clock in COMBOS:
        ctx = b.new_context(timezone_id="America/Chicago", viewport={"width": 1100, "height": 1400})
        ctx.add_init_script(f"localStorage.setItem('speakup-path','hs'); localStorage.setItem('speakup-group','{grp}'); localStorage.setItem('speakup-teacher-ok','{TEACHER}');")
        pg = ctx.new_page(); pg.clock.install(time=clock)
        pg.goto(BASE + f"#/teacher/playbook/{UNIT}"); ready(pg)
        pg.select_option("[data-tm-sem]", sem); pg.wait_for_timeout(300); pg.select_option("[data-tm-grp]", grp); pg.wait_for_timeout(600)
        if "pb" not in bundle: bundle["pb"] = pg.evaluate(f"SLPlaybook.cache[{UNIT}]")
        rows = pg.evaluate("""(u) => { const C = SLPlaybook.ctx, pb = SLPlaybook.cache[u], taught = [];
          return C.meetings().filter(m => m.unit === u).map(m => { const M = C.model(m.date) || {}; const keys = M.keys || [];
            const c = SLPlaybook.compose(pb, keys, taught.slice()); keys.forEach(k => { if (!taught.includes(k)) taught.push(k); });
            return { date: m.date, week: m.week, number: m.number, journal: M.journal ? { id: M.journal.id, flex: !!M.journal.flex, prompt: M.journal.prompt.en, share: M.journal.share.en } : null,
              keys, objectives: (M.objectives || []).map(o => ({ learn: o.learn.en, lang: o.lang.en })), success: M.success || [], ai: M.ai,
              plan: c.plan.map(x => ({ key: x.key, phase: x.phase, title: x.title, min: x.min, plan: x.plan, core: x.core, fill: x.fill, review: !!x.review })),
              over: c.over, free: c.free, speechMinutes: c.speechMinutes, speakers: c.speakers, deferred: c.deferred.map(x => x.title), repeat: c.segs.filter(s => s.repeat).map(s => s.key) }; }); }""", UNIT)
        bundle["runs"].append({"sem": sem, "grp": grp, "meetings": rows})
        for r in rows:
            pg.goto(BASE + f"#/teacher/print/plan/{r['date']}"); ready(pg)
            plans.append(PdfReader(io.BytesIO(pg.pdf(format="Letter", margin={"top": "0.5in", "bottom": "0.5in", "left": "0.5in", "right": "0.5in"}, print_background=False))))
            pg.goto(BASE + f"#/sub/{grp}/{r['date']}"); ready(pg)
            subs.append(PdfReader(io.BytesIO(pg.pdf(format="Letter", margin={"top": "0.5in", "bottom": "0.5in", "left": "0.5in", "right": "0.5in"}))))
            pg.goto(BASE + f"#/teacher/playbook/{UNIT}"); ready(pg)
        ctx.close()
    b.close()
plans.write(OUT / f"Unit {UNIT} Daily Teacher Plans (all groups).pdf"); subs.write(OUT / f"Unit {UNIT} Substitute Plans (all groups).pdf")
(OUT / f"unit-{UNIT}-bundle.json").write_text(json.dumps(bundle, indent=1), encoding="utf-8")

# ---------- Word documents ----------
pb = bundle["pb"]; L = pb["lessons"]; PH = {f["id"]: f["name"] for f in pb["framework"]}
def new_doc():
    d = Document(); s = d.sections[0]; s.left_margin = s.right_margin = Inches(0.8); s.top_margin = s.bottom_margin = Inches(0.7)
    st = d.styles["Normal"]; st.font.name = "Calibri"; st.font.size = Pt(11); return d
def shade(c, hx):
    t = c._tc.get_or_add_tcPr(); s = OxmlElement("w:shd"); s.set(qn("w:val"), "clear"); s.set(qn("w:color"), "auto"); s.set(qn("w:fill"), hx); t.append(s)
def table(d, header, rows, widths=None):
    t = d.add_table(rows=0, cols=len(header)); t.style = "Table Grid"
    cs = t.add_row().cells
    for i, x in enumerate(header): cs[i].text = ""; r = cs[i].paragraphs[0].add_run(x); r.bold = True; shade(cs[i], "E2E7EF")
    for row in rows:
        cs = t.add_row().cells
        for i, v in enumerate(row): cs[i].text = str(v)
    if widths:
        t.autofit = False
        for i, w in enumerate(widths):
            t.columns[i].width = Inches(w)
            for c in t.columns[i].cells: c.width = Inches(w)
    d.add_paragraph(); return t
def bullets(d, items):
    for x in items or []: d.add_paragraph(str(x), style="List Bullet")
def label(d, k, v):
    p = d.add_paragraph(); p.add_run(k + " ").bold = True; p.add_run(v)
def draft_note(d):
    p = d.add_paragraph(); r = p.add_run(f"DRAFT — Instructor Playbook, Unit {UNIT} (status: {pb['status']}, updated {pb['updated']}). Generated from site/data/playbook/unit-{UNIT}.json and the lesson data; not approved."); r.bold = True; r.font.color.rgb = RGBColor(0xA8, 0x36, 0x1A)

def overview(d):
    o = pb["overview"]
    d.add_heading("Unit overview", 1); label(d, "Essential question:", o["essential"])
    d.add_heading("Guiding questions", 2); bullets(d, o["questions"])
    d.add_heading("Enduring understandings", 2); bullets(d, o["understandings"])
    d.add_heading("Summative assessment", 2); d.add_paragraph(o["summative"])
    d.add_heading(" → ".join(f["name"] for f in pb["framework"]), 2)
    table(d, ["Phase", "What it means"], [[f["name"], f["what"]] for f in pb["framework"]], [1.4, 5.4])
    table(d, ["Phase", "Where", "What"], [[PH[a["phase"]], a["where"], a["what"]] for a in o["arc"]], [1.2, 1.6, 4.0])
    d.add_heading("Academic vocabulary", 2); d.add_paragraph(", ".join(o["vocab"]))
    d.add_heading("Readings", 2); bullets(d, o["readings"])
    d.add_heading("Scheduling notes", 2); bullets(d, o["scheduling"])
    d.add_heading("Speech days", 2); d.add_paragraph(o["speechDays"])
    d.add_heading("Beyond the Podium", 2); d.add_paragraph(o["btp"]); d.add_paragraph(pb["flex"]["when"])
    d.add_heading("When a block has spare time", 2); bullets(d, o["spare"])
    d.add_heading("Multilingual learners", 2); d.add_paragraph(o["ml"])
    d.add_heading("Accessibility (Universal Design for Learning)", 2); d.add_paragraph(o["access"])
    d.add_heading("College Public Speaking", 2); d.add_paragraph(o["college"])
def materials(d):
    o = pb["overview"]
    d.add_heading("Teacher materials and preparation checklist", 1)
    d.add_heading("Unit materials", 2)
    for x in o["materials"]: d.add_paragraph("☐ " + x)
    d.add_heading("Before the unit", 2)
    for x in o["prep"]: d.add_paragraph("☐ " + x)
    d.add_heading("Day by day", 2)
    for k, l in L.items():
        d.add_heading(f"{k} · {l['title']}", 3)
        for x in l["materials"]: d.add_paragraph("☐ " + x)
        for x in l["prep"]: d.add_paragraph("☐ Prep: " + x)
def meeting_maps(d):
    d.add_heading("Meeting maps: the real 90-minute blocks", 1)
    d.add_paragraph("Computed from the 2026–27 calendar, the odd/even groups, the Wednesday rotation and the published overrides. Every block starts with the Daily Learning Journal (10 minutes handwritten) and stand and share (about 5 minutes). Timing: the remaining 72 minutes after 3 minutes of transitions.")
    for run in bundle["runs"]:
        d.add_heading(f"{SEM[run['sem']]} · {GRP[run['grp']]}", 2)
        rows = []
        for n, m in enumerate(run["meetings"], 1):
            fit = f"over {m['over']} min" if m["over"] else (f"{m['speechMinutes']} min speeches (≈{m['speakers']} speakers)" if m["speechMinutes"] else f"{m['free']} min spare")
            rows.append([m["date"], n, (f"#{m['number']}" + (" flex" if m["journal"] and m["journal"]["flex"] else "")) if m["journal"] else "—", ", ".join(k + (" (review)" if k in m["repeat"] else "") for k in m["keys"]), fit])
        table(d, ["Date", "Meeting", "Journal", "Planned days", "Fit"], rows, [1.0, 0.7, 0.8, 2.4, 1.9])
        for n, m in enumerate(run["meetings"], 1):
            d.add_heading(f"Meeting {n} · {m['date']}", 3)
            if m["journal"]: label(d, f"Journal #{m['number']}:", m["journal"]["prompt"])
            trows = [["0–10", "Reflect", "Daily Learning Journal (handwritten)", "core"], ["10–15", "Reflect", "Stand and share with someone new", "core"]]
            t = 15
            for x in m["plan"]:
                note = " (shortened from %d)" % x["min"] if x["plan"] < x["min"] and not x["fill"] else (" (speech time)" if x["fill"] else "")
                trows.append([f"{t}–{t + x['plan']}", PH[x["phase"]], f"{x['title']}{note} [{x['key']}]", "core" if x["core"] else "stretch"]); t += x["plan"]
            trows.append([f"{t}–90", "—", "Transitions and buffer" + (f" ({m['free']} unplanned minutes)" if m["free"] else ""), ""])
            table(d, ["Minutes", "Phase", "Activity (planned day)", "Type"], trows, [0.9, 1.0, 4.0, 0.8])
            if m["deferred"]: label(d, "Stretch activities that don't fit:", "; ".join(m["deferred"]))
def lessons(d):
    d.add_heading("Daily teacher lesson plans (planned days)", 1)
    d.add_paragraph("Each planned day is a segment of a block (see the meeting maps). Objectives and success criteria are shown from lessons.json; journals from journals.json.")
    src = {}
    for run in bundle["runs"]:
        for m in run["meetings"]:
            for i, k in enumerate(m["keys"]):
                if k not in src and i < len(m["objectives"]): src[k] = m["objectives"][i]
    for k, l in L.items():
        d.add_page_break(); d.add_heading(f"{k} · {l['title']}", 2)
        if k in src: label(d, "Learning objective:", src[k]["learn"]); label(d, "Language objective:", src[k]["lang"])
        label(d, "Essential question:", l["essential"]); label(d, "Academic vocabulary:", ", ".join(l["vocab"]))
        d.add_heading("Materials", 3); bullets(d, l["materials"]); d.add_heading("Preparation", 3); bullets(d, l["prep"])
        d.add_heading("Activities (gradual release)", 3)
        table(d, ["Phase", "Activity", "Minutes", "Type"], [[PH[x["phase"]], x["title"], f"{x['min']}" + (f" (short: {x['short']})" if x.get("short") else "") + (" (speech time, flexible)" if x.get("fill") else ""), "core" if x["core"] else "stretch"] for x in l["phases"]], [1.1, 3.6, 1.3, 0.8])
        for x in l["phases"]:
            d.add_heading(f"{PH[x['phase']]}: {x['title']}", 4); bullets(d, x["teacher"])
            if x.get("students"): label(d, "Students:", x["students"])
            if x.get("check"): label(d, "Check:", x["check"])
            if x.get("video"): label(d, "Video guide:", next(v["title"] for v in pb["videos"] if v["id"] == x["video"]))
        d.add_heading("Discussion questions", 3); bullets(d, l["discuss"])
        d.add_heading("Anticipated misconceptions", 3); table(d, ["Misconception", "Response"], [[m["m"], m["fix"]] for m in l["misconceptions"]], [3.0, 3.8])
        d.add_heading("Multilingual learner scaffolding", 3); bullets(d, l["ml"])
        d.add_heading("Flexible accessibility and special education supports", 3); bullets(d, l["access"])
        d.add_heading("Advanced and college extensions", 3); bullets(d, l["extend"])
        d.add_heading("Formative assessment", 3); label(d, "Evidence:", l["formative"]["evidence"]); bullets(d, l["formative"]["lookFor"]); label(d, "If… then:", l["formative"]["respond"])
        d.add_heading("AI permission", 3); d.add_paragraph(l["ai"])
        d.add_heading("Canvas connections", 3); bullets(d, l["canvas"] or ["None needed."])
        d.add_heading("Exit reflection", 3); d.add_paragraph(l["exit"])
        d.add_heading("Teacher reflection", 3); bullets(d, l["reflect"])
        d.add_heading("Substitute plan", 3); d.add_paragraph("Suitable for a substitute." if l["sub"]["ok"] else "Not recommended for a substitute."); bullets(d, l["sub"]["plan"])
    d.add_page_break(); d.add_heading("Flex meeting: " + pb["flex"]["title"], 2); d.add_paragraph(pb["flex"]["when"])
    for x in pb["flex"]["phases"]: d.add_heading(f"{PH[x['phase']]}: {x['title']} ({x['min']} min, if time)", 4); bullets(d, x["teacher"])
    d.add_paragraph(pb["flex"]["note"])
def videos(d):
    d.add_heading("Video integration and viewing guides", 1)
    d.add_paragraph("All videos are already on the Speaking Lab. Titles and channels were checked on Nov 24, 2026 through YouTube's public oEmbed service. Durations, contents, caption quality and timestamps were NOT verified: preview each video and write the segment times below. No guide quotes a video. Open videos in a new tab; nothing autoplays.")
    for v in pb["videos"]:
        d.add_heading(v["title"], 2)
        table(d, ["Field", ""], [["Speaker", v["speaker"]], ["Original source", f"{v['channel']} ({v['upload']})"], ["Link", v["url"]], ["On the Speaking Lab", v["onSite"]], ["Used in", ", ".join(v["lessons"])], ["Instructional purpose", v["purpose"]],
              ["Suggested segment", "start ______  end ______  (not verified; preview first). " + v["segment"]["note"]], ["Before viewing", v["before"]], ["During viewing", v["during"]], ["Pause and discuss", "\n".join(v["pauses"])], ["After viewing", v["after"]],
              ["Student practice", v["practice"]], ["Formative assessment", v["check"]], ["Language scaffolding", v["language"]], ["College extension", v["college"]], ["Captions / transcript", v["captions"]], ["If the video is blocked", v["alternative"]]], [1.7, 5.1])
def resources(d):
    d.add_heading("Formative assessment resources", 1)
    for r in pb["resources"]:
        d.add_heading(r["title"], 2); p = d.add_paragraph(); p.add_run(r["use"]).italic = True
        for x in r["lines"]: d.add_paragraph(x)
def subs(d):
    d.add_heading("Substitute plans", 1)
    d.add_paragraph("Printable substitute plans for every real meeting (with the journal and objectives) are in 'Substitute Plans (all groups).pdf', generated from the site's substitute plan. The steps below are added to that plan by the playbook.")
    bullets(d, pb["sub"]["general"])
    table(d, ["Planned day", "Suitable?", "Substitute steps"], [[f"{k} · {l['title']}", "yes" if l["sub"]["ok"] else "no", "\n".join(l["sub"]["plan"])] for k, l in L.items()], [2.0, 0.8, 4.0])

d = new_doc(); d.add_heading(f"Unit {UNIT} Instructor Playbook: {pb['overview']['title']}", 0); draft_note(d)
d.add_paragraph("For Mr. Bennett, Speech, Wyandotte High School. Teacher-facing; contains no student information. The Lesson Manager shows the same playbook (Lesson Manager → Playbook) with live meeting plans for any date.")
overview(d); d.add_page_break(); meeting_maps(d); d.add_page_break(); lessons(d); d.add_page_break(); videos(d); d.add_page_break(); resources(d); d.add_page_break(); subs(d); d.add_page_break(); materials(d)
d.save(OUT / f"Unit {UNIT} Instructor Playbook (draft).docx")
for name, fn in (("Video Viewing Guides", videos), ("Formative Assessment Resources", resources), ("Materials and Prep Checklist", materials)):
    d = new_doc(); d.add_heading(f"Unit {UNIT} {name}", 0); draft_note(d); fn(d); d.save(OUT / f"Unit {UNIT} {name}.docx")
print("wrote", sorted(x.name for x in OUT.iterdir()))
