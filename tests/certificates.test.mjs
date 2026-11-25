// Portable achievements: certificates, portfolio, Email to Myself, backup reminders, and the privacy rules around the
// optional name and reflections (memory only; never stored, sent, put in URLs, filenames, metadata or backups).
// Browser behavior (downloads, print, network, storage) is verified by the privacy audit (docs/privacy/).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = p => readFileSync(new URL(p, import.meta.url), "utf8");
const cert = read("../site/js/certificates.js"), cele = read("../site/js/celebrate.js"), student = read("../site/js/student.js"), page = read("../site/index.html");

test("name and reflections live in page memory only", () => {
  assert.match(cert, /let NAME = "", REFL = \["", "", "", "", ""\]/);
  const writes = [...cert.matchAll(/(localStorage|sessionStorage)\.setItem\(([^,]+),/g)].map(m => m[2].trim());
  assert.deepEqual(writes, ["RKEY"], "the only stored item is the backup-reminder record");
  assert.doesNotMatch(cert, /sessionStorage\.|indexedDB\.|document\.cookie|caches\.open/, "no other storage");
  assert.match(cert, /localStorage\.setItem\(RKEY, JSON\.stringify\(\{ v: 1, last: r\.last \|\| null, dismissed: r\.dismissed \|\| null \}\)\)/, "the reminder record holds two dates only");
  assert.doesNotMatch(cert, /fetch\(|XMLHttpRequest|sendBeacon|navigator\.share|new WebSocket|https?:\/\/(?!www\.w3\.org\/2000\/svg)/, "no network calls or external addresses (the SVG namespace is a label, not a request)");
  assert.match(cert, /if \(!viewKey\(\)\) \{ clearPersonal\(\);/, "leaving the views clears them");
  assert.match(cert, /if \(k !== lastView\) \{ clearPersonal\(\);/, "switching to another certificate clears them");
  assert.doesNotMatch(cert, /Remember my name|remember.*name/i);
});

test("the name field is not remembered by the browser or the page address", () => {
  assert.match(cert, /<input id="certName" type="text" maxlength="60" autocomplete="off" autocapitalize="words" spellcheck="false"/);
  assert.match(cert, /spellcheck="false" data-cert-refl/, "reflections: no spell-check service");
  assert.doesNotMatch(cert, /<form/, "nothing can be submitted");
  assert.doesNotMatch(cert, /location\.(hash|href|search)\s*=|history\.(push|replace)State/, "never written into a URL");
  assert.match(cert, /value="\$\{h\(NAME\)\}"/, "re-rendered with escaping (safe text)");
});

test("files: generic names, no metadata, generated locally", () => {
  for (const f of ["`${base}-badge.png`", "`${base}.png`", '`${base}${st === "print" ? "-print" : ""}.pdf`', '`speaking-lab-achievement-portfolio${st === "print" ? "-print" : ""}.pdf`']) assert.ok(cert.includes(f), f);
  assert.match(cert, /base = `speaking-lab-\$\{fileId\(I\.id\)\}`/, "named after the achievement, never the student");
  const pdfFn = cert.slice(cert.indexOf("async function pdf("), cert.indexOf("/** Print:"));
  assert.doesNotMatch(pdfFn, /\/Info|\/Title|\/Author|\/Producer|\/Creator|xmpmeta/, "the PDF has no metadata dictionary");
  assert.match(pdfFn, /\/MediaBox \[0 0 612 792\]/, "US Letter");
  assert.match(cert, /W = 1700, H = 2200/, "certificate: 8.5 × 11 in at 200 dpi");
  assert.match(cert, /while \(draw\(k, true\) > 1720 && k > 0\.6\) k -= 0\.04;/, "long titles, names and translations shrink instead of clipping");
  assert.match(read("../site/css/app.css"), /@page \{ size: letter; margin: 0\.4in; \}/);
});

test("printer friendly is the default; two styles; low ink", () => {
  assert.match(cert, /STYLE = "print"/);
  assert.match(cert, /print: \{ bg: "#FFFFFF"/, "white page");
  assert.match(cert, /if \(style === "print"\) svg = svg\.replace\(\/stroke-width="4"\/, 'stroke-width="1\.8"'\)/, "outlined badge in print");
  assert.match(cert, /data-cert-print>\$\{L\("Print \(printer friendly\)"/);
  assert.match(cert, /printPages\(\[await certificate\(I, \{ style: "print"/, "Print always uses the low-ink style");
  assert.match(cert, /printPages\(await portfolio\(\{ style: "print"/);
  assert.match(cert, /color: \{ bg: "#141B2E"/);
});

test("certificates only for earned achievements; nothing is awarded or changed by exporting", () => {
  assert.match(cert, /st\.res\.filter\(r => r\.state === "earned" && r\.status === "active"\)/);
  assert.match(cert, /else res = earned\(\)\.list\.find\(x => x\.badge\.id === id\) \|\| null;/);
  assert.match(cert, /Certificates are available only for achievements recorded as earned/);
  assert.doesNotMatch(cert, /SLAchieve\.track|speakup-achieve-v1|speakup-btp|speakup-ai-v1/, "never writes progress or badges");
  assert.match(student, /r\.state === "earned" && r\.status === "active" \? `<p class="sl2-btns sl2-noprint"><a class="btn" href="#\/certificate\//, "a certificate link only on earned cards");
  assert.match(cert, /verified: b\.level === "communication"/, "teacher-verified only for communication badges, which stay pending");
  assert.match(cert, /it does not mean he verified this achievement/, "the instructor's name is not a verification");
  assert.doesNotMatch(cert, /signature/i, "no simulated signature");
  assert.match(cert, /not a grade, credit, credential or official transcript, and not tamper-proof/);
  assert.match(cert, /L\("Date not recorded", "Fecha no registrada"\)/, "missing dates are said, never invented");
  assert.match(cert, /points: D\.achievements\.points\.badge/, "real points");
});

test("demonstration and development preview documents are labeled", () => {
  assert.match(cert, /o\.demo \? L\("DEMONSTRATION · SAMPLE"/);
  assert.match(cert, /isPreview\(\) \? L\("DEVELOPMENT PREVIEW"/);
  assert.match(cert, /if \(demo && !NAME\) NAME = "Avery Example"; \/\/ a fictional name/);
  assert.match(cert, /if \(demo\) \{ if \(!X\.teacherOn\(\)\)/, "demonstration certificates need teacher view");
});

test("Email to Myself: generic draft, no recipient, no name, nothing sent", () => {
  assert.match(cert, /mailto: `mailto:\?subject=\$\{encodeURIComponent\(subject\)\}&body=\$\{encodeURIComponent\(body\)\}`/);
  const em = cert.slice(cert.indexOf("function emailText("), cert.indexOf("function emailPanel("));
  assert.doesNotMatch(em, /NAME|REFL/, "no personal data in the draft");
  assert.match(cert, /an email draft cannot attach it for you/);
  assert.match(cert, /Nothing has been sent yet/);
  assert.match(cert, /data-cert-copy="certSubj"/); assert.match(cert, /data-cert-copy="certBody"/);
  assert.match(cert, /If no email app opens \(common on school computers\)/, "webmail fallback, no provider assumed");
  assert.doesNotMatch(cert, /gmail|outlook|office365|google\.com/i);
});

test("celebration: certificate, badge and save actions; dismiss stays immediate", () => {
  assert.match(cele, /href="#\/certificate\/\$\{esc\(b\.id\)\}\$\{opts\.demo \? "\/demo" : ""\}" data-slc-close/);
  assert.match(cele, /data-slc-badge/); assert.match(cele, /data-slc-save data-mywork="1"/);
  assert.match(cele, /Continue learning/);
  assert.match(cele, /if \(e\.key === "Escape"\) \{ e\.preventDefault\(\); close\(\); return; \}/);
  assert.doesNotMatch(cele, /localStorage|setItem/, "still never writes");
});

test("backup: reminders are dismissible and weekly; certificates never restore progress; names never in backups", () => {
  assert.match(cert, /if \(r\.last && days\(r\.last, t\) < 7\) return "";/);
  assert.match(cert, /if \(r\.dismissed && days\(r\.dismissed, t\) < 7\) return "";/);
  assert.match(cert, /Remind me next week/);
  assert.match(page, /if \(!j \|\| j\.app !== "speak-up" \|\| typeof j\.data !== "object"\) throw 0;/, "restore accepts only the progress backup file");
  assert.match(student, /they cannot restore progress/);
  assert.match(student, /Ad Detective keeps its own records in its Notebook/, "no claim that Ad Detective records are included");
});

test("privacy notice text near the name field (EN and draft ES)", () => {
  assert.match(cert, /Adding your name is optional\. Speaking Lab uses it temporarily in your browser to personalize your certificate\. Your name is not saved by the application or sent to our website host\. If you download, print or share your certificate, your name will appear on that copy\./);
  assert.match(cert, /Agregar tu nombre es opcional/);
  assert.match(cert, /Download or print your portfolio before you leave this page if you want to keep them/);
});
