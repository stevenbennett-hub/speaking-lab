"""Speaking Lab privacy and network audit (browser-based), for certificates, portfolios, email drafts and backups.
Usage: python3 tests/tools/privacy-audit.py [BASE_URL] [OUT_DIR]   (serve site/ first, e.g. on http://localhost:8768/)
Uses fictional data with unique test strings and fails if they appear in any request, storage, URL, console line,
downloaded file, file metadata or filename. Needs Playwright with Chromium."""
import json, re, os, zlib
from urllib.parse import urlparse, unquote
from playwright.sync_api import sync_playwright
import sys, tempfile
OUT = (sys.argv[2] if len(sys.argv) > 2 else tempfile.mkdtemp()) .rstrip("/") + "/"; os.makedirs(OUT, exist_ok=True)
B = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8768/").rstrip("/") + "/index.html"
NAME = "Zqx Fictional-Student 7731"; REFL = "ZQXREFL-4488 fictional reflection about listening"
NEEDLES = [NAME, "Zqx", "7731", "ZQXREFL", "4488"]
# Fictional progress: four earned badges.
SEED = """if(!sessionStorage.getItem('s')){sessionStorage.setItem('s','1');
localStorage.setItem('speakup-path','hs');localStorage.setItem('speakup-group','odd');localStorage.setItem('speakup-theme','dark');
localStorage.setItem('speakup-listen-v1',JSON.stringify({fin:{best:92}}));
localStorage.setItem('speakup-aud-v1',JSON.stringify({mc:{best:9}}));
localStorage.setItem('speakup-btp-v1',JSON.stringify({v:1,eps:{ep1:{mastered:{detective:'2026-08-19',change:'2026-08-20',apply:'2026-08-20'}}}}));
localStorage.setItem('speakup-ai-v1',JSON.stringify({v:1,mastered:{ethics:'2026-08-21',ownership:'2026-08-21',factcheck:'2026-08-21'}}));
localStorage.setItem('speakup-achieve-v1',JSON.stringify({v:1,earned:{'active-listener':'2026-08-18','audience-awareness':'2026-08-18','bridge-builder':'2026-08-20','independent-thinker':'2026-08-21'}}));}"""
log, results, reqs, consoles = [], [], [], []
def ok(n, c, x=""): results.append(("PASS" if c else "FAIL") + "  " + n + (f"  ({x})" if x else ""))
def has(s): s = s or ""; return [n for n in NEEDLES if n.lower() in s.lower() or n.lower() in unquote(s).lower()]
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(timezone_id="America/Chicago", viewport={"width": 1366, "height": 768}, accept_downloads=True)
    ctx.add_init_script(SEED)
    ctx.add_init_script("window.__printCalls=0; window.print=function(){ window.__printCalls++; };")
    pg = ctx.new_page(); pg.clock.install(time="2026-08-24T09:30:00-05:00")
    pg.on("request", lambda r: reqs.append({"url": r.url, "method": r.method, "type": r.resource_type, "body": r.post_data or ""}))
    statuses = []; pg.on("response", lambda r: statuses.append((r.status, r.url)))
    pg.on("console", lambda m: consoles.append(m.type + ": " + m.text))
    pg.on("pageerror", lambda e: consoles.append("pageerror: " + str(e)))
    def storage(step):
        st = pg.evaluate("""async () => { const dump = s => { const o = {}; for (let i = 0; i < s.length; i++) { const k = s.key(i); o[k] = s.getItem(k); } return o; };
          let idb = []; try { idb = (await indexedDB.databases()).map(d => d.name); } catch (e) { idb = ['unavailable']; }
          return { local: dump(localStorage), session: dump(sessionStorage), cookie: document.cookie, idb, url: location.href, title: document.title }; }""")
        st["cookies"] = ctx.cookies()
        blob = json.dumps(st)
        hits = has(blob)
        log.append({"step": step, "storage_keys": sorted(st["local"].keys()), "session_keys": sorted(st["session"].keys()), "cookies": len(st["cookies"]), "idb": st["idb"], "url": st["url"], "hits": hits})
        return hits
    def step(name, fn):
        n0 = len(reqs); fn(); pg.wait_for_timeout(500)
        hits = storage(name); new = reqs[n0:]
        leaked = [r["url"] for r in new if has(r["url"]) or has(r["body"])]
        ok(f"{name}: no personal test string in storage, cookies, IndexedDB or the URL", not hits, ",".join(hits))
        ok(f"{name}: no personal test string in any request ({len(new)} requests)", not leaked, ";".join(leaked))
    downloads = {}
    def dl(selector, label):
        with pg.expect_download() as d: pg.click(selector)
        f = d.value; path = OUT + f.suggested_filename; f.save_as(path); downloads[label] = path
        return f.suggested_filename, path
    pg.goto(B + "#/achievements"); pg.wait_for_selector("html[data-speakup-ready]"); pg.wait_for_timeout(800)
    step("1 Open the certificate interface", lambda: (pg.click('a[href="#/certificate/bridge-builder"]'), pg.wait_for_timeout(1200)))
    ok("name field: autocomplete off, spellcheck off, no form submission", pg.evaluate("(() => { const i = document.getElementById('certName'); return i.getAttribute('autocomplete') === 'off' && i.getAttribute('spellcheck') === 'false' && !i.closest('form') && !i.name; })()"))
    step("2 Enter a fictional name", lambda: pg.type("#certName", NAME, delay=5))
    step("3 Edit the name", lambda: (pg.fill("#certName", NAME + " Jr"), pg.fill("#certName", NAME)))
    step("4 Switch certificate styles", lambda: (pg.check('input[value="color"]'), pg.wait_for_timeout(600), pg.check('input[value="print"]')))
    step("5 Generate a personalized certificate (preview)", lambda: pg.wait_for_timeout(800))
    names = {}
    def d6():
        names["pdf"] = dl("[data-cert-pdf=print]", "cert_print_pdf")[0]; names["pdfc"] = dl("[data-cert-pdf=color]", "cert_color_pdf")[0]
        names["png"] = dl("[data-cert-png]", "cert_png")[0]; names["badge"] = dl("[data-cert-badge]", "badge_png")[0]
    step("6 Download the certificate (PDF, PDF color, PNG, badge PNG)", d6)
    def d7():
        pg.click("[data-cert-print]"); pg.wait_for_timeout(400)
        pg.emulate_media(media="print"); pdfb = pg.pdf(format="Letter", print_background=True); pg.emulate_media(media="screen")
        open(OUT + "print-preview-certificate.pdf", "wb").write(pdfb); downloads["print_preview_cert"] = OUT + "print-preview-certificate.pdf"
    step("7 Print the certificate (printer friendly)", d7)
    ok("Print uses the browser's print dialog (window.print called)", pg.evaluate("window.__printCalls") >= 1)
    step("8 Save as PDF (downloaded PDF and print preview)", lambda: None)
    def d9(): pg.goto(B + "#/portfolio"); pg.wait_for_timeout(1500); pg.fill("#certName", NAME)
    step("9 Generate the complete portfolio", d9)
    def d10(): pg.click(".cert-refl summary"); pg.fill("#certR0", REFL); pg.fill("#certR2", REFL + " second"); pg.wait_for_timeout(800)
    step("10 Enter a fictional reflection", d10)
    def d11():
        names["port"] = dl("[data-port-pdf=print]", "port_print_pdf")[0]; names["portc"] = dl("[data-port-pdf=color]", "port_color_pdf")[0]
        pg.click("[data-port-print]"); pg.wait_for_timeout(500); pg.emulate_media(media="print"); open(OUT + "print-preview-portfolio.pdf", "wb").write(pg.pdf(format="Letter", print_background=True)); pg.emulate_media(media="screen")
    step("11 Download and print the portfolio", d11)
    def d12():
        pg.click("#certEmail summary"); href = pg.get_attribute("[data-cert-mail]", "href"); names["mailto"] = href
    step("12 Prepare a generic email draft", d12)
    ok("mailto has no recipient, no name and no reflection", names["mailto"].startswith("mailto:?") and not has(names["mailto"]), names["mailto"][:90])
    def d13():
        pg.goto(B + "#/achievements"); pg.wait_for_timeout(800); pg.click('#sl2 [data-mywork="1"] >> nth=0'); pg.wait_for_timeout(300)
        names["backup"] = dl("#mwBackup", "backup")[0]
        pg.click("#mwClose"); pg.wait_for_timeout(200)
    step("13 Download a progress backup", d13)
    bk = open(downloads["backup"]).read()
    ok("progress backup contains no name or reflection", not has(bk), ",".join(has(bk)))
    ok("progress backup contains no teacher or college codes", '"speakup-teacher-ok"' not in bk and '"speakup-col-ok"' not in bk)
    def d14(): pg.goto(B + "#/certificate/bridge-builder"); pg.wait_for_timeout(1000); pg.fill("#certName", NAME); pg.click('.app-crumbs a[href="#/achievements"]'); pg.wait_for_timeout(500)
    step("14 Close the certificate interface", d14)
    ok("after closing, the name is gone from memory", pg.evaluate("SLCert._personal().name") == "" and not any(pg.evaluate("SLCert._personal().refl")))
    def d15(): pg.goto(B + "#/portfolio"); pg.wait_for_timeout(800); pg.fill("#certName", NAME); pg.click(".cert-refl summary"); pg.fill("#certR1", REFL); pg.click('header a[href="#/labs"]'); pg.wait_for_timeout(500)
    step("15 Navigate to another application view", d15)
    ok("after navigating away, name and reflections are cleared", pg.evaluate("JSON.stringify(SLCert._personal())") == json.dumps({"name": "", "refl": ["", "", "", "", ""]}).replace(" ", ""))
    pg.goto(B + "#/certificate/bridge-builder"); pg.wait_for_timeout(1000)
    ok("returning to the certificate shows an empty name field", pg.input_value("#certName") == "")
    def d16(): pg.fill("#certName", NAME); pg.reload(); pg.wait_for_selector("html[data-speakup-ready]"); pg.wait_for_timeout(1000)
    step("16 Refresh the website", d16)
    ok("after refresh, the name field is empty", pg.input_value("#certName") == "")
    # files
    for k, path in downloads.items():
        raw = open(path, "rb").read()
        txt = raw.decode("latin-1")
        long = [n for n in (NAME, "Fictional-Student", "ZQXREFL", "fictional reflection") if n.lower() in txt.lower()]  # short strings can occur by chance in compressed image bytes
        ok(f"file {os.path.basename(path)}: name and reflection absent from the file bytes and metadata", not long, ",".join(long))
        if path.endswith(".pdf") and "print-preview" not in path:
            ok(f"file {os.path.basename(path)}: no PDF metadata dictionary (/Info, /Title, /Author, XMP)", not re.search(r"/Info|/Title|/Author|/Creator|/Producer|<x:xmpmeta", txt))
        if path.endswith(".png"):
            chunks = re.findall(rb"(tEXt|iTXt|zTXt|eXIf)", raw)
            ok(f"file {os.path.basename(path)}: no PNG text or EXIF metadata", not chunks)
    fn = [names[k] for k in ["pdf", "pdfc", "png", "badge", "port", "portc", "backup"]]
    ok("generated filenames are generic (no names)", not any(has(f) for f in fn), ", ".join(fn))
    # requests overall
    hosts = sorted({urlparse(r["url"]).netloc for r in reqs if r["url"].startswith("http")})
    third = [h for h in hosts if not h.startswith("localhost")]
    ok("no third-party requests during the whole audit", not third, ", ".join(third))
    ok("no POST, beacon or XHR body anywhere", not [r for r in reqs if r["method"] != "GET" or r["type"] in ("ping", "beacon") or r["body"]])
    ok("browser console: no personal test strings", not any(has(c) for c in consoles))
    ok("certificate generation made no network requests for documents (only site files)", all(urlparse(r["url"]).path.startswith(("/index.html", "/js/", "/css/", "/data/", "/fonts/", "/media/", "/audio/", "/favicon")) or r["url"].startswith(("data:", "blob:")) for r in reqs if r["url"].startswith(("http", "data", "blob"))))
    paths = sorted({urlparse(r["url"]).path for r in reqs if r["url"].startswith("http")})
    json.dump({"not_found": sorted({u for st_, u in statuses if st_ >= 400}), "steps": log, "hosts": hosts, "paths": paths, "console": consoles[:50], "filenames": fn, "mailto": names["mailto"]}, open(OUT + "audit.json", "w"), indent=1)
    b.close()
print("\n".join(results)); print(f"\n{sum(r.startswith('PASS') for r in results)} passed, {sum(r.startswith('FAIL') for r in results)} failed")
