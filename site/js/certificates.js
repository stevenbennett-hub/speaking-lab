/* Speak Up | The Speaking Lab — portable achievements: certificates, the Communication Achievement Portfolio, Email to
   Myself and progress-backup reminders.
   PRIVACY (non-negotiable): Speaking Lab delivers content; it does not collect student information.
   - The optional name and the portfolio reflections live only in the variables NAME and REFL below (page memory). They are
     never written to localStorage, sessionStorage, cookies or IndexedDB, never put in a URL, a mailto link, a filename or
     document metadata, never sent anywhere, and never included in the progress backup. They are cleared when the student
     leaves the certificate or portfolio view, and a refresh discards them.
   - Documents are drawn locally on a <canvas> with the site's own fonts and badge artwork, then saved as PNG or as a PDF
     written here (no library, no service). The name appears only in the visible picture of the page.
   - Certificates exist only for badges the achievement engine records as earned. Nothing here writes progress, points or
     badges. Demonstration and development-preview documents carry a visible label. */
(function () {
  "use strict";
  const X = window.SL2, D = window.SL_DATA, A = window.SLAchieve; if (!X || !A) return;
  const { h, L, pick } = X;
  const es = () => lang === "es";
  const $id = id => document.getElementById(id);

  /* ---------- memory-only personalization ---------- */
  let NAME = "", REFL = ["", "", "", "", ""], STYLE = "print", lastView = "";
  const clearPersonal = () => { NAME = ""; REFL = ["", "", "", "", ""]; };
  const viewKey = () => { const r = X.route(); return r && ["certificate", "portfolio"].includes(r.name) ? `${r.name}/${(r.args || []).join("/")}` : ""; };
  // Leaving the certificate or portfolio view (or switching to another one) clears the name and reflections.
  window.addEventListener("hashchange", () => { if (!viewKey()) { clearPersonal(); STYLE = "print"; lastView = ""; } });
  const enter = () => { const k = viewKey(); if (k !== lastView) { clearPersonal(); STYLE = "print"; lastView = k; } };
  const QUESTIONS = [
    ["Which communication skill have you improved the most?", "¿Qué habilidad de comunicación has mejorado más?"],
    ["Which achievement are you most proud of, and why?", "¿De qué logro estás más orgulloso u orgullosa, y por qué?"],
    ["How have you grown as a public speaker?", "¿Cómo has crecido como orador u oradora?"],
    ["How will you use these communication skills outside the classroom?", "¿Cómo usarás estas habilidades de comunicación fuera del salón?"],
    ["What communication skill would you like to continue developing?", "¿Qué habilidad de comunicación te gustaría seguir desarrollando?"],
  ];

  /* ---------- facts from the existing data ---------- */
  const CAT = () => (window.SLApp ? SLApp.catalog() : D.activities) || {};
  const LEVEL_NAME = lv => pick(D.achievements.levels[lv] || { en: lv, es: lv });
  const isPreview = () => !!(window.SLBuild && window.SLBuild.preview);
  /** Communication competencies a badge demonstrates: the skills of the activities its criteria use (activities.json). */
  function skillsOf(b) {
    const acts = (b.criteria || []).map(c => window.SLApp && SLApp.critActivity(c)).filter(Boolean);
    const cat = CAT(), out = [];
    for (const id of acts) { const a = (cat.activities || []).find(x => x.id === id); for (const s of (a ? a.skills : [])) if (!out.includes(s)) out.push(s); }
    // Badges earned by reading checks or practice tests have no activity: their competencies come from activities.json badgeSkills.
    for (const s of ((cat.badgeSkills || {})[b.id] || [])) if ((cat.skills || {})[s] && !out.includes(s)) out.push(s);
    return out;
  }
  const skillName = s => { const v = (CAT().skills || {})[s]; return v ? (es() ? v[1] : v[0]) : s; };
  /** Everything a certificate shows, for one badge result from the engine. */
  function info(r) {
    const b = r.badge, indep = ((CAT().portfolio || {}).independent || []).includes(b.id);
    return {
      id: b.id, badge: b, title: pick(b.title), about: pick(b.about), level: b.level, levelName: LEVEL_NAME(b.level), independent: indep,
      verified: b.level === "communication", // only possible after real teacher verification (none exists yet)
      skills: skillsOf(b).map(skillName), evidence: (r.parts || []).map(p => pick(p.label)),
      date: r.earnedOn || null, points: D.achievements.points.badge,
    };
  }
  /** Earned badges only, straight from the achievement engine. */
  function earned() { const st = X.achState(); return { st, list: st.res.filter(r => r.state === "earned" && r.status === "active") }; }
  const fmtDate = iso => { try { return new Date(iso + "T12:00:00Z").toLocaleDateString(es() ? "es-US" : "en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }); } catch (e) { return iso; } };

  /* ---------- drawing (canvas, local fonts and artwork) ---------- */
  const PAL = {
    color: { bg: "#141B2E", panel: "#1F2A44", frame: "#E9BB70", frame2: "#34405E", kicker: "#E9BB70", label: "#8DD7BC", title: "#E9BB70", text: "#EEF1F6", muted: "#A9B3C7", rule: "#34405E", accent: "#8DD7BC", warn: "#E9BB70" },
    print: { bg: "#FFFFFF", panel: "#FFFFFF", frame: "#222222", frame2: "#9A9A9A", kicker: "#333333", label: "#444444", title: "#111111", text: "#1A1A1A", muted: "#555555", rule: "#9A9A9A", accent: "#333333", warn: "#000000" },
  };
  const LEVEL_COLOR = { knowledge: "#9DB0E0", applied: "#8DD7BC", communication: "#E9BB70" };
  const FONT_D = '"Bricolage Grotesque", "Atkinson Hyperlegible Next", sans-serif', FONT_B = '"Atkinson Hyperlegible Next", Arial, sans-serif';
  const fontsReady = () => (document.fonts && document.fonts.load ? Promise.all([`700 40px ${FONT_D}`, `400 20px ${FONT_B}`, `700 20px ${FONT_B}`, `800 20px ${FONT_B}`].map(f => document.fonts.load(f).catch(() => null))) : Promise.resolve());
  /** The badge's own medallion (achievements.js), with fixed colors so it can be drawn on a canvas. */
  function medallionImage(b, style, size) {
    let svg = A.medallion(b, "earned");
    const c = style === "print" ? "#222222" : (((CAT().portfolio || {}).milestone || []).includes(b.id) ? "#E9BB70" : LEVEL_COLOR[b.level] || "#E9BB70");
    svg = svg.replace(/var\(--u\d\)/g, c).replace(/var\(--muted\)/g, c).replace(/var\(--bg\)/g, style === "print" ? "#FFFFFF" : "#141B2E")
      .replace(/fill-opacity="0\.14"/, `fill-opacity="${style === "print" ? 0 : 0.14}"`).replace(/width="64" height="64"/, `width="${size}" height="${size}"`)
      .replace(/<svg /, '<svg xmlns="http://www.w3.org/2000/svg" ');
    if (style === "print") svg = svg.replace(/stroke-width="4"/, 'stroke-width="1.8"'); // outlined, low ink
    return new Promise(res => { const img = new Image(); img.onload = () => res(img); img.onerror = () => res(null); img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg); });
  }
  function wrap(ctx, text, maxW) {
    const words = String(text || "").split(/\s+/).filter(Boolean), lines = []; let line = "";
    for (const w of words) { const t = line ? line + " " + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
    if (line) lines.push(line);
    return lines;
  }
  const spaced = s => s.toUpperCase().split("").join(String.fromCharCode(8202)); // hair spaces: letterspaced caps
  function fitFont(ctx, text, weight, size, family, maxW, min) { let s = size; ctx.font = `${weight} ${s}px ${family}`; while (ctx.measureText(text).width > maxW && s > min) { s -= 2; ctx.font = `${weight} ${s}px ${family}`; } return s; }
  function labelBand(ctx, W, y, text, P) { ctx.save(); ctx.font = `800 30px ${FONT_B}`; const w = ctx.measureText(text).width + 60; ctx.strokeStyle = P.warn; ctx.lineWidth = 4; ctx.strokeRect((W - w) / 2, y - 38, w, 56); ctx.fillStyle = P.warn; ctx.textAlign = "center"; ctx.fillText(text, W / 2, y); ctx.restore(); }
  const marks = o => [o.demo ? L("DEMONSTRATION · SAMPLE", "DEMOSTRACIÓN · MUESTRA") : "", isPreview() ? L("DEVELOPMENT PREVIEW", "VISTA PREVIA DE DESARROLLO") : ""].filter(Boolean).join(" · ");

  /** One certificate on a US Letter page at 200 dpi (1700 × 2200). Returns the canvas. */
  async function certificate(I, o) {
    await fontsReady();
    const P = PAL[o.style], W = 1700, H = 2200, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d"), img = await medallionImage(I.badge, o.style, 600), name = (o.name || "").trim();
    const draw = (k, dry) => {
      let y = 0; const C = W / 2, maxW = 1240;
      if (!dry) {
        ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = P.frame; ctx.lineWidth = o.style === "print" ? 3 : 4; ctx.strokeRect(80, 80, W - 160, H - 160);
        ctx.strokeStyle = P.frame2; ctx.lineWidth = 1.5; ctx.strokeRect(104, 104, W - 208, H - 208);
      }
      ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
      y = 250; if (!dry) { ctx.fillStyle = P.kicker; ctx.font = `800 ${34 * k}px ${FONT_B}`; ctx.fillText(spaced("Speaking Lab 2.0"), C, y); }
      const mk = marks(o); if (mk) { y += 80; if (!dry) labelBand(ctx, W, y, mk, P); }
      const ms = 300 * k; y += 40; if (!dry && img) ctx.drawImage(img, C - ms / 2, y, ms, ms); y += ms + 90;
      if (!dry) { ctx.fillStyle = P.label; ctx.font = `800 ${30 * k}px ${FONT_B}`; ctx.fillText(spaced(I.verified ? L("Certificate of verified accomplishment", "Certificado de logro verificado") : L("Certificate of achievement", "Certificado de logro")), C, y); }
      y += 110 * k; const ts = fitFont(ctx, I.title, 800, 104 * k, FONT_D, maxW, 54); if (!dry) { ctx.fillStyle = P.title; ctx.fillText(I.title, C, y); } y += ts * 0.35;
      if (name) {
        y += 70 * k; if (!dry) { ctx.fillStyle = P.muted; ctx.font = `400 ${34 * k}px ${FONT_B}`; ctx.fillText(L("Presented to", "Otorgado a"), C, y); }
        y += 92 * k; fitFont(ctx, name, 700, 72 * k, FONT_B, maxW, 34); if (!dry) { ctx.fillStyle = P.text; ctx.fillText(name, C, y); }
      }
      y += 50 * k; if (!dry) { ctx.strokeStyle = P.rule; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(C - 420, y); ctx.lineTo(C + 420, y); ctx.stroke(); }
      ctx.font = `400 ${38 * k}px ${FONT_B}`; y += 70 * k;
      for (const ln of wrap(ctx, I.about, maxW)) { if (!dry) { ctx.fillStyle = P.text; ctx.fillText(ln, C, y); } y += 52 * k; }
      if (I.evidence.length) {
        y += 26 * k; if (!dry) { ctx.fillStyle = P.label; ctx.font = `800 ${26 * k}px ${FONT_B}`; ctx.fillText(spaced(L("Demonstrated by", "Demostrado con")), C, y); }
        ctx.font = `400 ${30 * k}px ${FONT_B}`; y += 48 * k;
        for (const e of I.evidence) for (const ln of wrap(ctx, e, maxW)) { if (!dry) { ctx.fillStyle = P.muted; ctx.fillText(ln, C, y); } y += 42 * k; }
      }
      if (I.skills.length) {
        y += 26 * k; if (!dry) { ctx.fillStyle = P.label; ctx.font = `800 ${26 * k}px ${FONT_B}`; ctx.fillText(spaced(L("Communication competencies", "Competencias de comunicación")), C, y); }
        ctx.font = `700 ${32 * k}px ${FONT_B}`; y += 50 * k;
        for (const ln of wrap(ctx, I.skills.join("  ·  "), maxW)) { if (!dry) { ctx.fillStyle = P.accent; ctx.fillText(ln, C, y); } y += 44 * k; }
      }
      y += 34 * k; ctx.font = `400 ${30 * k}px ${FONT_B}`;
      const meta = [I.levelName + (I.independent ? ` · ${L("Independent mastery", "Dominio independiente")}` : ""), I.date ? L(`Earned ${fmtDate(I.date)}`, `Obtenido el ${fmtDate(I.date)}`) : L("Date not recorded", "Fecha no registrada"), L(`${I.points} learning points`, `${I.points} puntos de aprendizaje`)].join("  ·  ");
      for (const ln of wrap(ctx, meta, maxW)) { if (!dry) { ctx.fillStyle = P.muted; ctx.fillText(ln, C, y); } y += 42 * k; }
      return y;
    };
    // Shrink the body until it clears the footer (no clipping, one page).
    let k = 1; while (draw(k, true) > 1720 && k > 0.6) k -= 0.04;
    draw(k, false);
    // footer
    const F = 1790; ctx.textAlign = "center";
    ctx.fillStyle = P.muted; ctx.font = `400 30px ${FONT_B}`; ctx.fillText(L("Wyandotte High School  |  Speech & Communication", "Wyandotte High School  |  Oratoria y Comunicación"), W / 2, F);
    ctx.fillStyle = o.style === "print" ? P.text : P.title; ctx.font = `700 36px ${FONT_B}`; ctx.fillText(L("Steven Bennett, Instructor", "Steven Bennett, maestro"), W / 2, F + 56);
    ctx.fillStyle = P.muted; ctx.font = `400 24px ${FONT_B}`;
    const kind = I.verified ? L("Teacher-verified accomplishment", "Logro verificado por el maestro") : L("Independent learning achievement, recorded by Speaking Lab practice activities. The instructor's name identifies the course; it does not mean he verified this achievement.", "Logro de aprendizaje independiente, registrado por las actividades de práctica de Speaking Lab. El nombre del maestro identifica el curso; no significa que él haya verificado este logro.");
    let fy = F + 110; for (const ln of wrap(ctx, kind, 1300)) { ctx.fillText(ln, W / 2, fy); fy += 32; }
    for (const ln of wrap(ctx, L("A practice record kept in a browser, not a grade, credit, credential or official transcript, and not tamper-proof. Canvas is the official record.", "Un registro de práctica guardado en un navegador; no es una calificación, crédito, credencial ni expediente oficial, ni está protegido contra cambios. Canvas es el registro oficial."), 1300)) { ctx.fillText(ln, W / 2, fy); fy += 32; }
    return cv;
  }

  /** The portfolio: pages at 150 dpi (1275 × 1650), several achievements per page, grouped by competency. */
  async function portfolio(o) {
    await fontsReady();
    const P = PAL[o.style], W = 1275, H = 1650, M = 90, pages = [], { st, list } = earned(), name = (o.name || "").trim();
    const infos = list.map(info), imgs = await Promise.all(infos.map(I => medallionImage(I.badge, o.style, 200)));
    // Groups: the first competency of each badge (activities.json skills); badges without an activity by their level.
    const groups = [];
    infos.forEach((I, n) => { const key = I.verified ? "verified" : I.skills[0] || `level:${I.level}`; let g = groups.find(x => x.key === key);
      if (!g) { g = { key, title: I.verified ? L("Teacher-verified speaking accomplishments", "Logros orales verificados por el maestro") : I.skills[0] || L(`${I.levelName}`, `${I.levelName}`), items: [] }; groups.push(g); } g.items.push([I, imgs[n]]); });
    let cv, ctx, y;
    const page = () => {
      cv = document.createElement("canvas"); cv.width = W; cv.height = H; ctx = cv.getContext("2d"); pages.push(cv);
      ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
      if (o.style === "color") { ctx.strokeStyle = P.frame; ctx.lineWidth = 2; ctx.strokeRect(40, 40, W - 80, H - 80); }
      ctx.textAlign = "left"; y = M;
      ctx.fillStyle = P.kicker; ctx.font = `800 20px ${FONT_B}`; ctx.fillText(spaced(L("Speaking Lab 2.0 · My Communication Achievement Portfolio", "Speaking Lab 2.0 · Mi portafolio de logros de comunicación")), M, y);
      const mk = marks(o); if (mk) { ctx.fillStyle = P.warn; ctx.font = `800 20px ${FONT_B}`; ctx.textAlign = "right"; ctx.fillText(mk, W - M, y); ctx.textAlign = "left"; }
      y += 30;
    };
    const need = n => { if (y + n > H - 110) { page(); y += 10; } };
    const text = (s, font, color, x, maxW, lh) => { ctx.font = font; ctx.fillStyle = color; for (const ln of wrap(ctx, s, maxW)) { ctx.fillText(ln, x, y); y += lh; } };
    page();
    // title block
    y += 50; ctx.fillStyle = P.title; fitFont(ctx, L("My Communication Achievement Portfolio", "Mi portafolio de logros de comunicación"), 800, 52, FONT_D, W - 2 * M, 34); ctx.fillText(L("My Communication Achievement Portfolio", "Mi portafolio de logros de comunicación"), M, y);
    if (name) { y += 52; fitFont(ctx, name, 700, 34, FONT_B, W - 2 * M, 20); ctx.fillStyle = P.text; ctx.fillText(name, M, y); }
    y += 42; text(L("Wyandotte High School · Speech & Communication · Steven Bennett, Instructor", "Wyandotte High School · Oratoria y Comunicación · Steven Bennett, maestro"), `400 22px ${FONT_B}`, P.muted, M, W - 2 * M, 30);
    // summary
    y += 14; const boxY = y; const lines = [
      [L("Achievements earned", "Logros obtenidos"), String(infos.length)],
      [L("Learning points (all activities)", "Puntos de aprendizaje (todas las actividades)"), String(st.pts.total)],
      [L("Competencies shown", "Competencias demostradas"), String(new Set(infos.flatMap(I => I.skills)).size)],
    ];
    ctx.strokeStyle = P.rule; ctx.lineWidth = 1.5; ctx.strokeRect(M, boxY, W - 2 * M, 110);
    lines.forEach(([k, v], n) => { const x = M + 30 + n * ((W - 2 * M) / 3); ctx.fillStyle = P.title; ctx.font = `800 40px ${FONT_D}`; ctx.fillText(v, x, boxY + 55); ctx.fillStyle = P.muted; ctx.font = `400 18px ${FONT_B}`; ctx.fillText(k, x, boxY + 88); });
    y = boxY + 140;
    text(L("These achievements were recorded by Speaking Lab practice activities in a web browser. They are learning records, not grades, college credit, credentials or official transcripts, and they are not tamper-proof. The instructor's name identifies the course; it does not mean he verified each achievement. Canvas is the official record.", "Estos logros fueron registrados por actividades de práctica de Speaking Lab en un navegador. Son registros de aprendizaje, no calificaciones, créditos universitarios, credenciales ni expedientes oficiales, y no están protegidos contra cambios. El nombre del maestro identifica el curso; no significa que haya verificado cada logro. Canvas es el registro oficial."), `400 16px ${FONT_B}`, P.muted, M, W - 2 * M, 22);
    y += 16;
    if (infos.length) {
      text(L("What I have demonstrated", "Lo que he demostrado"), `800 24px ${FONT_B}`, P.label, M, W - 2 * M, 34);
      const sk = [...new Set(infos.flatMap(I => I.skills))];
      if (sk.length) text(sk.join("  ·  "), `700 22px ${FONT_B}`, P.accent, M, W - 2 * M, 30);
      y += 10;
    } else text(L("No achievements are recorded in this browser yet. Achievements appear here as you earn them in Speaking Lab activities.", "Todavía no hay logros registrados en este navegador. Aparecerán aquí cuando los obtengas en las actividades de Speaking Lab."), `400 24px ${FONT_B}`, P.text, M, W - 2 * M, 34);
    // achievements, several per page
    const itemH = I => { ctx.font = `400 20px ${FONT_B}`; return 64 + wrap(ctx, I.about, W - 2 * M - 130).length * 28 + I.evidence.length * 26 + 20; };
    for (const g of groups) {
      need(80 + itemH(g.items[0][0])); // keep each heading with its first achievement y += 16; ctx.strokeStyle = P.rule; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(M, y - 26); ctx.lineTo(W - M, y - 26); ctx.stroke();
      text(g.title, `800 28px ${FONT_D}`, P.title, M, W - 2 * M, 40);
      for (const [I, img] of g.items) {
        ctx.font = `400 20px ${FONT_B}`; const aboutL = wrap(ctx, I.about, W - 2 * M - 130).length, evL = I.evidence.length;
        const hgt = 64 + aboutL * 28 + evL * 26 + 20; need(hgt);
        const top = y; if (img) ctx.drawImage(img, M, top - 18, 96, 96);
        const x = M + 120, mw = W - 2 * M - 130; y = top + 10;
        ctx.font = `800 26px ${FONT_B}`; ctx.fillStyle = P.text; ctx.fillText(I.title, x, y); y += 30;
        text([I.levelName + (I.independent ? ` · ${L("Independent mastery", "Dominio independiente")}` : ""), I.date ? fmtDate(I.date) : L("Date not recorded", "Fecha no registrada"), L(`${I.points} learning points`, `${I.points} puntos`)].join("  ·  "), `400 18px ${FONT_B}`, P.muted, x, mw, 26);
        text(I.about, `400 20px ${FONT_B}`, P.text, x, mw, 28);
        for (const e of I.evidence) text("✓ " + e, `400 18px ${FONT_B}`, P.muted, x, mw, 26);
        y = Math.max(y, top + 96) + 22;
      }
    }
    // reflection (only answered questions)
    const answered = QUESTIONS.map((q, n) => [q, (o.refl || [])[n] || ""]).filter(([, a]) => a.trim());
    if (answered.length) {
      need(120); y += 20; text(L("My reflection", "Mi reflexión"), `800 28px ${FONT_D}`, P.title, M, W - 2 * M, 40);
      for (const [q, a] of answered) { ctx.font = `400 21px ${FONT_B}`; need(40 + wrap(ctx, a, W - 2 * M).length * 30); text(es() ? q[1] : q[0], `700 21px ${FONT_B}`, P.label, M, W - 2 * M, 30); text(a, `400 21px ${FONT_B}`, P.text, M, W - 2 * M, 30); y += 12; }
    }
    // page numbers
    pages.forEach((c, n) => { const x = c.getContext("2d"); x.fillStyle = P.muted; x.font = `400 16px ${FONT_B}`; x.textAlign = "right"; x.fillText(L(`Page ${n + 1} of ${pages.length}`, `Página ${n + 1} de ${pages.length}`), W - M, H - 60); });
    return pages;
  }

  /* ---------- export: PNG, PDF (written here), print ---------- */
  const save = (blob, filename) => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); };
  const toBlob = (cv, type, q) => new Promise(res => cv.toBlob(res, type, q));
  /** A minimal PDF: one US Letter page per canvas, each a JPEG image. No /Info dictionary, so no metadata at all. */
  async function pdf(canvases) {
    const enc = new TextEncoder(), parts = [], offs = []; let len = 0;
    const put = x => { const b = typeof x === "string" ? enc.encode(x) : x; parts.push(b); len += b.length; };
    const obj = (n, body) => { offs[n] = len; put(`${n} 0 obj\n`); body(); put("\nendobj\n"); };
    put("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
    const imgs = [];
    for (const cv of canvases) imgs.push({ w: cv.width, h: cv.height, data: new Uint8Array(await (await toBlob(cv, "image/jpeg", 0.92)).arrayBuffer()) });
    const n = imgs.length, kids = imgs.map((_, i) => `${3 + i * 3} 0 R`).join(" ");
    obj(1, () => put("<< /Type /Catalog /Pages 2 0 R >>"));
    obj(2, () => put(`<< /Type /Pages /Kids [${kids}] /Count ${n} >>`));
    imgs.forEach((im, i) => {
      const p = 3 + i * 3, c = p + 1, x = p + 2, content = `q 612 0 0 792 0 0 cm /Im0 Do Q`;
      obj(p, () => put(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /XObject << /Im0 ${x} 0 R >> >> /Contents ${c} 0 R >>`));
      obj(c, () => put(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`));
      obj(x, () => { put(`<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.data.length} >>\nstream\n`); put(im.data); put("\nendstream"); });
    });
    const total = 3 + n * 3, xref = len;
    put(`xref\n0 ${total}\n0000000000 65535 f \n`);
    for (let i = 1; i < total; i++) put(`${String(offs[i]).padStart(10, "0")} 00000 n \n`);
    put(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
    return new Blob(parts, { type: "application/pdf" });
  }
  /** Print: the rendered pages only (no site chrome), US Letter; removed again right after printing. */
  function printPages(canvases) {
    const box = document.createElement("div"); box.id = "slPrintDoc"; box.setAttribute("aria-hidden", "true");
    canvases.forEach(cv => { const im = document.createElement("img"); im.alt = ""; im.src = cv.toDataURL("image/png"); box.appendChild(im); });
    document.body.appendChild(box); document.body.classList.add("sl-printdoc");
    const done = () => { document.body.classList.remove("sl-printdoc"); box.remove(); window.removeEventListener("afterprint", done); };
    window.addEventListener("afterprint", done);
    setTimeout(() => { window.print(); setTimeout(done, 1000); }, 150);
  }
  const fileId = id => String(id).replace(/[^a-z0-9-]/gi, "");

  /* ---------- Email to Myself (no address collected, nothing sent by Speaking Lab) ---------- */
  function emailText(kind, title) {
    const subject = kind === "portfolio" ? L("My Speaking Lab Communication Achievement Portfolio", "Mi portafolio de logros de comunicación de Speaking Lab") : L(`My Speaking Lab Achievement — ${title}`, `Mi logro de Speaking Lab — ${title}`);
    const body = kind === "portfolio"
      ? L("This is my Communication Achievement Portfolio from Speaking Lab 2.0, from my Speech and Communication course at Wyandotte High School.\n\nIt lists the communication competencies I demonstrated in Speaking Lab activities.\n\nI am saving it as part of my communication achievement portfolio.", "Este es mi portafolio de logros de comunicación de Speaking Lab 2.0, de mi curso de Oratoria y Comunicación en Wyandotte High School.\n\nIncluye las competencias de comunicación que demostré en las actividades de Speaking Lab.\n\nLo guardo como parte de mi portafolio de logros de comunicación.")
      : L(`I earned the ${title} achievement in Speaking Lab 2.0 during my Speech and Communication course at Wyandotte High School.\n\nThis achievement recognizes the communication competencies described in my attached certificate.\n\nI am saving this certificate as part of my communication achievement portfolio.`, `Obtuve el logro ${title} en Speaking Lab 2.0 durante mi curso de Oratoria y Comunicación en Wyandotte High School.\n\nEste logro reconoce las competencias de comunicación descritas en el certificado adjunto.\n\nGuardo este certificado como parte de mi portafolio de logros de comunicación.`);
    return { subject, body, mailto: `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` };
  }
  function emailPanel(kind, title) {
    const m = emailText(kind, title);
    return `<details class="sl2-card cert-email" id="certEmail"><summary><b>${L("Email to myself", "Enviarme por correo")}</b></summary>
      <ol class="cert-steps">
        <li>${L("Download the certificate style you want to keep (above).", "Descarga el estilo de certificado que quieres guardar (arriba).")}</li>
        <li>${L("Open an email draft. Speaking Lab fills in only a subject and message; it does not add your name or anyone's address, and it does not send anything.", "Abre un borrador de correo. Speaking Lab solo pone el asunto y el mensaje; no agrega tu nombre ni ninguna dirección, y no envía nada.")}
          <p class="sl2-btns"><a class="btn" href="${h(m.mailto)}" data-cert-mail>${L("Open email draft", "Abrir borrador de correo")}</a></p></li>
        <li>${L("In your email, type your own school email address, attach the file you downloaded (an email draft cannot attach it for you), review it and send it.", "En tu correo, escribe tu propia dirección escolar, adjunta el archivo que descargaste (un borrador no puede adjuntarlo por ti), revísalo y envíalo.")}</li></ol>
      <p class="sl2-small">${L("If no email app opens (common on school computers), copy the subject and message, open your school email the way you normally do, paste them, attach the file and send it to yourself.", "Si no se abre ninguna aplicación de correo (común en computadoras escolares), copia el asunto y el mensaje, abre tu correo escolar como siempre, pégalos, adjunta el archivo y envíatelo.")}</p>
      <label class="cert-copy"><span>${L("Subject", "Asunto")}</span><input readonly value="${h(m.subject)}" id="certSubj"></label> <button type="button" class="btn" data-cert-copy="certSubj">${L("Copy subject", "Copiar asunto")}</button>
      <label class="cert-copy"><span>${L("Message", "Mensaje")}</span><textarea readonly rows="5" id="certBody">${h(m.body)}</textarea></label> <button type="button" class="btn" data-cert-copy="certBody">${L("Copy message", "Copiar mensaje")}</button>
      <p class="sl2-small" role="status" id="certMailMsg"></p></details>`;
  }

  /* ---------- views ---------- */
  const NOTE2 = () => `<p class="cert-privacy cert-visible" role="note">${L("Your name and reflection answers appear only where you can see them on the document. Speaking Lab never sends them anywhere and never adds them to hidden file information (metadata) or to the file name.", "Tu nombre y tus respuestas de reflexión aparecen solo donde puedes verlos en el documento. Speaking Lab nunca los envía a ningún lugar ni los agrega a información oculta del archivo (metadatos) ni al nombre del archivo.")}</p>`;
  const NOTE = () => `<p class="cert-privacy" role="note">${L("Adding your name is optional. Speaking Lab uses it temporarily in your browser to personalize your certificate. Your name is not saved by the application or sent to our website host. If you download, print or share your certificate, your name will appear on that copy.", "Agregar tu nombre es opcional. Speaking Lab lo usa temporalmente en tu navegador para personalizar tu certificado. La aplicación no guarda tu nombre ni lo envía a nuestro servidor. Si descargas, imprimes o compartes tu certificado, tu nombre aparecerá en esa copia.")}</p>`;
  const nameField = () => `<label class="cert-name" for="certName"><b>${L("Your name on the document (optional)", "Tu nombre en el documento (opcional)")}</b></label>
      <input id="certName" type="text" maxlength="60" autocomplete="off" autocapitalize="words" spellcheck="false" data-lpignore="true" data-1p-ignore value="${h(NAME)}">`;
  const styleSwitch = () => `<fieldset class="cert-style"><legend>${L("Style", "Estilo")}</legend>
      <label class="app-radio"><input type="radio" name="certStyle" value="print"${STYLE === "print" ? " checked" : ""} data-cert-style> ${L("Printer friendly (low ink)", "Para imprimir (poca tinta)")}</label>
      <label class="app-radio"><input type="radio" name="certStyle" value="color"${STYLE === "color" ? " checked" : ""} data-cert-style> ${L("Full color (digital)", "A todo color (digital)")}</label></fieldset>`;
  function viewCert(r) {
    enter();
    const id = r.args[0], demo = r.args[1] === "demo";
    if (demo && !NAME) NAME = "Avery Example"; // a fictional name for demonstrations
    const back = `<nav class="sl2-back app-crumbs" aria-label="${L("Breadcrumb", "Ruta")}"><a href="#/achievements">← ${L("My Achievements", "Mis logros")}</a> <span aria-hidden="true">·</span> <a href="#/portfolio">${L("My portfolio", "Mi portafolio")}</a></nav>`;
    let res = null;
    if (demo) { if (!X.teacherOn()) return `<div class="wrap sl2 app-view" id="sl2-main" data-notr>${back}<h1 class="sl2-h1">${L("Teacher view needed", "Se necesita la vista del maestro")}</h1></div>`; const b = D.achievements.badges.find(x => x.id === id); if (b) res = { badge: b, status: b.status, state: "earned", earnedOn: null, parts: (b.criteria || []).map(c => ({ label: c.label })) }; }
    else res = earned().list.find(x => x.badge.id === id) || null;
    if (!res) return `<div class="wrap sl2 app-view" id="sl2-main" data-notr>${back}<h1 class="sl2-h1">${L("Certificate not available", "Certificado no disponible")}</h1>
      <p>${L("Certificates are available only for achievements recorded as earned in this browser. Keep working toward this one on My Achievements.", "Los certificados solo están disponibles para logros registrados como obtenidos en este navegador. Sigue trabajando en este en Mis logros.")}</p></div>`;
    const I = info(res);
    return `<div class="wrap sl2 app-view cert-view" id="sl2-main" data-notr>${back}
      <p class="app-eyebrow">${L("Certificate", "Certificado")}${demo ? ` · ${L("Demonstration", "Demostración")}` : ""}</p><h1 class="sl2-h1">${h(I.title)}</h1>
      <div class="cert-grid">
        <div class="cert-controls">
          ${nameField()}${NOTE()}${NOTE2()}${styleSwitch()}
          <div class="cert-actions">
            <button type="button" class="btn primary" data-cert-print>${L("Print (printer friendly)", "Imprimir (para imprimir)")}</button>
            <button type="button" class="btn" data-cert-pdf="print">${L("Download printer-friendly PDF", "Descargar PDF para imprimir")}</button>
            <button type="button" class="btn" data-cert-pdf="color">${L("Download full-color PDF", "Descargar PDF a color")}</button>
            <button type="button" class="btn" data-cert-png>${L("Download full-color image (PNG)", "Descargar imagen a color (PNG)")}</button>
            <button type="button" class="btn" data-cert-badge>${L("Download badge (PNG)", "Descargar insignia (PNG)")}</button>
          </div>
          <p class="sl2-small" role="status" id="certMsg" aria-live="polite"></p>
          <p class="sl2-small">${L("Save as PDF: use a Download PDF button, or choose Print and pick “Save as PDF” as the printer.", "Guardar como PDF: usa un botón de Descargar PDF, o elige Imprimir y selecciona “Guardar como PDF” como impresora.")}</p>
          ${emailPanel("cert", I.title)}
          ${keepHelp()}
        </div>
        <figure class="cert-preview"><canvas id="certCanvas" width="1700" height="2200" role="img" aria-label="${h(L(`Certificate preview: ${I.title}. ${I.about}`, `Vista previa del certificado: ${I.title}. ${I.about}`))}"></canvas>
          <figcaption class="sl2-small">${L("Preview of the selected style. This is exactly what downloads and prints.", "Vista previa del estilo elegido. Es exactamente lo que se descarga e imprime.")}</figcaption></figure>
      </div></div>`;
  }
  const keepHelp = () => `<details class="sl2-card cert-keep"><summary><b>${L("How to keep it: Google Drive, Canvas, printing", "Cómo guardarlo: Google Drive, Canvas, imprimir")}</b></summary><ul>
      <li>${L("Google Drive: download the PDF, then upload it to a folder in your school Google Drive.", "Google Drive: descarga el PDF y súbelo a una carpeta de tu Google Drive escolar.")}</li>
      <li>${L("Canvas: when Mr. Bennett asks for it, upload the downloaded PDF to that Canvas assignment. Nothing is sent to Canvas automatically.", "Canvas: cuando el Sr. Bennett lo pida, sube el PDF descargado a esa tarea de Canvas. Nada se envía a Canvas automáticamente.")}</li>
      <li>${L("Printing at school: use Print. It uses the low-ink printer-friendly style.", "Imprimir en la escuela: usa Imprimir. Usa el estilo para imprimir con poca tinta.")}</li>
      <li>${L("A certificate is a record to keep. It cannot restore your progress; for that, use “Back up my progress” on My Achievements.", "Un certificado es un registro para guardar. No restaura tu progreso; para eso usa “Copiar mi progreso” en Mis logros.")}</li></ul></details>`;
  function viewPortfolio() {
    enter();
    const { list, st } = earned();
    return `<div class="wrap sl2 app-view cert-view" id="sl2-main" data-notr>
      <nav class="sl2-back app-crumbs" aria-label="${L("Breadcrumb", "Ruta")}"><a href="#/achievements">← ${L("My Achievements", "Mis logros")}</a></nav>
      <p class="app-eyebrow">${L("Portfolio", "Portafolio")}</p><h1 class="sl2-h1">${L("My Communication Achievement Portfolio", "Mi portafolio de logros de comunicación")}</h1>
      <p class="sl2-lead">${L(`${list.length} achievements · ${st.pts.total} learning points. Every achievement you have earned in this browser, grouped by the communication skills it shows.`, `${list.length} logros · ${st.pts.total} puntos de aprendizaje. Cada logro que has obtenido en este navegador, agrupado por las habilidades de comunicación que demuestra.`)}</p>
      <div class="cert-grid">
        <div class="cert-controls">
          ${nameField()}${NOTE()}${NOTE2()}
          <p class="cert-privacy" role="note">${L("Your reflection answers stay only on this page while it is open. They are not saved, not graded and not sent anywhere. Download or print your portfolio before you leave this page if you want to keep them. Don't include private information you wouldn't want on a shared document.", "Tus respuestas de reflexión solo se quedan en esta página mientras está abierta. No se guardan, no se califican y no se envían a ningún lado. Descarga o imprime tu portafolio antes de salir si quieres conservarlas. No incluyas información privada que no quieras en un documento compartido.")}</p>
          <details class="sl2-card cert-refl"${REFL.some(x => x) ? " open" : ""}><summary><b>${L("End-of-course reflection (optional)", "Reflexión de fin de curso (opcional)")}</b></summary>
            ${QUESTIONS.map((q, n) => `<label for="certR${n}">${h(es() ? q[1] : q[0])}</label><textarea id="certR${n}" rows="3" maxlength="1200" autocomplete="off" spellcheck="false" data-cert-refl="${n}">${h(REFL[n])}</textarea>`).join("")}
          </details>
          ${styleSwitch()}
          <div class="cert-actions">
            <button type="button" class="btn primary" data-port-print>${L("Print (printer friendly)", "Imprimir (para imprimir)")}</button>
            <button type="button" class="btn" data-port-pdf="print">${L("Download printer-friendly PDF", "Descargar PDF para imprimir")}</button>
            <button type="button" class="btn" data-port-pdf="color">${L("Download full-color PDF", "Descargar PDF a color")}</button>
          </div>
          <p class="sl2-small" role="status" id="certMsg" aria-live="polite"></p>
          ${emailPanel("portfolio", "")}
          ${keepHelp()}
        </div>
        <figure class="cert-preview" id="portPreview" aria-label="${L("Portfolio preview", "Vista previa del portafolio")}"><p class="sl2-small">${L("Preparing preview…", "Preparando la vista previa…")}</p></figure>
      </div></div>`;
  }
  let drawT = null, drawSeq = 0;
  const current = () => { const r = X.route(); if (!r) return null; if (r.name === "certificate") { const demo = r.args[1] === "demo"; let res = null;
      if (demo && X.teacherOn()) { const b = D.achievements.badges.find(x => x.id === r.args[0]); if (b) res = { badge: b, status: b.status, state: "earned", earnedOn: null, parts: (b.criteria || []).map(c => ({ label: c.label })) }; }
      else if (!demo) res = earned().list.find(x => x.badge.id === r.args[0]);
      return res ? { kind: "cert", I: info(res), demo } : null; }
    if (r.name === "portfolio") return { kind: "portfolio" }; return null; };
  async function redraw() {
    const seq = ++drawSeq, c = current(); if (!c) return;
    if (c.kind === "cert") { const cv = await certificate(c.I, { style: STYLE, name: NAME, demo: c.demo }); if (seq !== drawSeq) return; const el = $id("certCanvas"); if (el) { el.width = cv.width; el.height = cv.height; el.getContext("2d").drawImage(cv, 0, 0); } return; }
    const pages = await portfolio({ style: STYLE, name: NAME, refl: REFL }); if (seq !== drawSeq) return;
    const box = $id("portPreview"); if (!box) return;
    box.innerHTML = `<p class="sl2-small">${L(`${pages.length} page${pages.length === 1 ? "" : "s"} · US Letter`, `${pages.length} página${pages.length === 1 ? "" : "s"} · carta`)}</p>`;
    pages.forEach((p, n) => { p.setAttribute("role", "img"); p.setAttribute("aria-label", L(`Portfolio page ${n + 1}`, `Página ${n + 1} del portafolio`)); p.className = "cert-page"; box.appendChild(p); });
  }
  const soon = () => { clearTimeout(drawT); drawT = setTimeout(redraw, 250); };
  X.addRoute("certificate", { view: viewCert, after: soon });
  X.addRoute("portfolio", { view: viewPortfolio, after: soon });

  const msg = t => { const m = $id("certMsg"); if (m) m.textContent = t; };
  document.addEventListener("input", e => {
    const t = e.target;
    if (t.id === "certName") { NAME = t.value.slice(0, 60); soon(); return; }
    if (t.matches && t.matches("[data-cert-refl]")) { REFL[Number(t.dataset.certRefl)] = t.value.slice(0, 1200); soon(); }
  });
  document.addEventListener("change", e => { if (e.target.matches && e.target.matches("[data-cert-style]")) { STYLE = e.target.value === "color" ? "color" : "print"; soon(); } });
  document.addEventListener("click", async e => {
    const t = e.target.closest && e.target.closest("[data-cert-print],[data-cert-pdf],[data-cert-png],[data-cert-badge],[data-port-print],[data-port-pdf],[data-cert-copy],[data-cert-mail]"); if (!t) return;
    const c = current();
    if (t.hasAttribute("data-cert-copy")) { const el = $id(t.dataset.certCopy); try { await navigator.clipboard.writeText(el.value); msg(L("Copied.", "Copiado.")); } catch (er) { el.select(); msg(L("Select the text and copy it (Ctrl or Cmd + C).", "Selecciona el texto y cópialo (Ctrl o Cmd + C).")); } const mm = $id("certMailMsg"); if (mm) mm.textContent = L("Copied. Paste it into your own email.", "Copiado. Pégalo en tu propio correo."); return; }
    if (t.hasAttribute("data-cert-mail")) { const mm = $id("certMailMsg"); if (mm) mm.textContent = L("If an email draft opened, add your own address, attach the file you downloaded, then review and send it. Nothing has been sent yet.", "Si se abrió un borrador, agrega tu dirección, adjunta el archivo que descargaste, revísalo y envíalo. Todavía no se ha enviado nada."); return; } // the link itself opens the draft
    if (!c) return;
    e.preventDefault();
    if (c.kind === "cert") {
      const I = c.I, base = `speaking-lab-${fileId(I.id)}`;
      if (t.hasAttribute("data-cert-badge")) { const img = await medallionImage(I.badge, "color", 600); const cv = document.createElement("canvas"); cv.width = cv.height = 600; if (img) cv.getContext("2d").drawImage(img, 0, 0, 600, 600); save(await toBlob(cv, "image/png"), `${base}-badge.png`); msg(L("Badge image downloaded.", "Imagen de la insignia descargada.")); return; }
      if (t.hasAttribute("data-cert-png")) { save(await toBlob(await certificate(I, { style: "color", name: NAME, demo: c.demo }), "image/png"), `${base}.png`); msg(L("Full-color certificate image downloaded.", "Imagen del certificado a color descargada.")); return; }
      if (t.hasAttribute("data-cert-pdf")) { const st = t.dataset.certPdf; save(await pdf([await certificate(I, { style: st, name: NAME, demo: c.demo })]), `${base}${st === "print" ? "-print" : ""}.pdf`); msg(L("Certificate PDF downloaded.", "PDF del certificado descargado.")); return; }
      if (t.hasAttribute("data-cert-print")) { printPages([await certificate(I, { style: "print", name: NAME, demo: c.demo })]); return; }
    } else {
      if (t.hasAttribute("data-port-pdf")) { const st = t.dataset.portPdf; save(await pdf(await portfolio({ style: st, name: NAME, refl: REFL })), `speaking-lab-achievement-portfolio${st === "print" ? "-print" : ""}.pdf`); msg(L("Portfolio PDF downloaded.", "PDF del portafolio descargado.")); return; }
      if (t.hasAttribute("data-port-print")) { printPages(await portfolio({ style: "print", name: NAME, refl: REFL })); return; }
    }
  });

  /* ---------- progress-backup reminder (no personal data; dismissible; at most weekly) ---------- */
  const RKEY = "speakup-backup-v1";
  const rget = () => { try { const r = JSON.parse(localStorage.getItem(RKEY) || "null"); return r && r.v === 1 ? r : { v: 1 }; } catch (e) { return { v: 1 }; } };
  const rput = r => { try { localStorage.setItem(RKEY, JSON.stringify({ v: 1, last: r.last || null, dismissed: r.dismissed || null })); } catch (e) {} };
  const days = (a, b) => Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 864e5);
  function reminder() {
    const r = rget(), t = X.today(), { list } = earned();
    if (!list.length) return "";
    if (r.last && days(r.last, t) < 7) return "";
    if (r.dismissed && days(r.dismissed, t) < 7) return "";
    return `<div class="sl2-card cert-remind" role="note"><p><b>${L("Keep your achievements safe.", "Protege tus logros.")}</b> ${r.last ? L(`Your last progress backup was ${fmtDate(r.last)}.`, `Tu última copia fue el ${fmtDate(r.last)}.`) : L("You haven't downloaded a progress backup on this computer yet.", "Todavía no has descargado una copia de tu progreso en esta computadora.")} ${L("Save the backup file in your school Google Drive.", "Guarda el archivo en tu Google Drive escolar.")}</p>
      <p class="sl2-btns"><button type="button" class="btn primary" data-mywork="1">${L("Back up my progress", "Copiar mi progreso")}</button> <button type="button" class="btn" data-cert-remind-off>${L("Remind me next week", "Recordármelo la próxima semana")}</button></p></div>`;
  }
  document.addEventListener("click", e => {
    if (e.target.closest && e.target.closest("#mwBackup")) { const r = rget(); r.last = X.today(); rput(r); }
    if (e.target.closest && e.target.closest("[data-cert-remind-off]")) { const r = rget(); r.dismissed = X.today(); rput(r); X.refresh(); }
  });

  /** Badge image download used by the celebration (no name involved). */
  async function downloadBadge(b) { const img = await medallionImage(b, "color", 600); const cv = document.createElement("canvas"); cv.width = cv.height = 600; if (img) cv.getContext("2d").drawImage(img, 0, 0, 600, 600); save(await toBlob(cv, "image/png"), `speaking-lab-${fileId(b.id)}-badge.png`); }
  window.SLCert = { certificate, portfolio, pdf, info, emailText, reminder, downloadBadge, _personal: () => ({ name: NAME, refl: REFL.slice() }), RKEY };
  X.refresh();
})();
