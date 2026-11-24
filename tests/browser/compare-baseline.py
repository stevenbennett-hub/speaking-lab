# Optional local check (needs Python Playwright and Chrome; not run in CI).
# Renders the baseline page (tag v1-live-2026-11-23) and the current page with the same fake clock,
# block group and semester, and prints any text that differs. Expected difference: the college tile label.
#   git show v1-live-2026-11-23:site/index.html > /tmp/base/index.html  (copy site/ to /tmp/base first)
#   (cd /tmp/base && python3 -m http.server 8766) & (cd site && python3 -m http.server 8767) &
#   python3 tests/browser/compare-baseline.py
import sys, difflib
from playwright.sync_api import sync_playwright
dates = ["2026-08-13T09:00:00", "2026-09-02T09:00:00", "2026-10-21T15:00:00", "2026-11-24T09:00:00", "2026-12-15T09:00:00",
         "2027-01-06T09:00:00", "2027-02-12T09:00:00", "2027-03-17T09:00:00", "2027-05-18T09:00:00"]
groups = ["", "odd", "even", "both"]
def grab(b, port, when, group, tz):
    ctx = b.new_context(timezone_id=tz, viewport={"width": 1366, "height": 900})
    pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.clock.install(time=when)
    sem = "spring" if when.startswith("2027") else "fall"
    start = {"fall": "2026-08-13", "spring": "2027-01-05"}[sem]
    pg.add_init_script(f"localStorage.setItem('speakup-group','{group}'); localStorage.setItem('speakup-semester','{sem}'); localStorage.setItem('speakup-start','{start}');")
    pg.goto(f"http://localhost:{port}/index.html")
    pg.wait_for_function("document.getElementById('todayCard') && document.getElementById('todayCard').innerText.length > 0", timeout=15000)
    pg.wait_for_timeout(300)
    pg.evaluate("document.getElementById('expandAll') && document.getElementById('expandAll').click()")
    pg.wait_for_timeout(200)
    txt = pg.evaluate("document.querySelector('main').innerText")
    ctx.close(); return txt, errs
total = 0
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome")
    for when in dates:
        for g in groups:
            a, ea = grab(b, 8766, when, g, "America/Chicago")
            n, en = grab(b, 8767, when, g, "America/Chicago")
            d = [l for l in difflib.unified_diff(a.splitlines(), n.splitlines(), lineterm="", n=0) if l[:1] in "+-" and l[:3] not in ("+++", "---")]
            total += len(d)
            if d or en: print(when[:10], g or "every-day", "diff lines:", len(d), "errors:", en[:2]); [print("   ", x[:150]) for x in d[:6]]
    # a laptop set to Pacific time late at night: still the Chicago date
    n1, _ = grab(b, 8767, "2026-09-02T23:30:00-05:00", "odd", "America/Los_Angeles")
    n2, _ = grab(b, 8767, "2026-09-02T23:30:00-05:00", "odd", "America/Chicago")
    print("Pacific-zone laptop matches Chicago view:", n1 == n2)
    b.close()
print("total diff lines:", total)
