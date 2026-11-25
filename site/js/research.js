/* Speak Up | The Speaking Lab — Research & Academic Integrity Studio: "From Evidence to Credibility" (slice 8).
   Content: data/research-studio.json (loaded when the studio opens). Builds on the Research & Source Lab (index.html,
   lab rlab) and the AI Coaching Studio's Fact Checker; it links to them instead of repeating them.
   Routes: #/research · /sources · /evidence · /integrity · /paraphrase · /cite · /portfolio · /portfolio/summary · /apa
   The APA Academy (#/research/apa) is for the authorized College Public Speaking pathway only (college is off by default).
   Progress: speakup-research-v1 (this browser only; included in "Back up or move my progress"). js/achievements.js reads
   only the dated `mastered` parts, recorded by the Check buttons after the answers are checked. Opening pages, building
   citations and adding portfolio records never count. Nothing a student types is sent anywhere, and no tool here judges
   whether a student's own paraphrase or research is acceptable: that takes a person. */
(function (root) {
  "use strict";
  const KEY = "speakup-research-v1";
  const PARTS = ["sources", "evidence", "integrity", "paraphrase", "cite", "apa"];
  const isObj = x => !!x && typeof x === "object" && !Array.isArray(x);

  /* ---------- core (tested in tests/research.test.mjs) ---------- */
  function load(get) {
    let r = null;
    try { r = JSON.parse(get(KEY) || "null"); } catch (e) {}
    if (!isObj(r) || r.v !== 1) r = { v: 1 };
    for (const k of ["src", "looked", "ev", "int", "cite", "apa", "checked", "mastered", "builder", "notes"]) if (!isObj(r[k])) r[k] = {};
    if (!isObj(r.para)) r.para = {};
    for (const k of ["kinds", "checks", "text", "self", "hidden"]) if (!isObj(r.para[k])) r.para[k] = {};
    if (!isObj(r.miss)) r.miss = {};
    if (!isObj(r.port)) r.port = {};
    if (!isObj(r.port.items)) r.port.items = {};
    for (const [k, v] of Object.entries(r.port.items)) if (!Array.isArray(v)) r.port.items[k] = []; else r.port.items[k] = v.filter(isObj);
    return r;
  }
  const okIdx = (opts, i) => Number.isInteger(i) && !!(opts[i] && opts[i].ok);
  const sameSet = (a, b) => Array.isArray(a) && a.length === b.length && b.every(x => a.includes(x));
  function sourcesResult(C, r) {
    const per = {};
    for (const c of C.sources.cases) { const a = isObj(r.src[c.id]) ? r.src[c.id] : {}; per[c.id] = { v: a.v === c.verdict, f: [c.flag].concat(c.also || []).includes(a.f) }; }
    const right = Object.values(per).filter(x => x.v && x.f).length;
    return { per, right, total: C.sources.cases.length, done: right === C.sources.cases.length };
  }
  function evidenceItemOk(it, a) {
    if (it.kind === "mc") return okIdx(it.options, a);
    return a === it.answer; // type, support
  }
  function evidenceResult(C, r) {
    const per = {}; for (const it of C.evidence.items) per[it.id] = evidenceItemOk(it, r.ev[it.id]);
    const right = Object.values(per).filter(Boolean).length;
    return { per, right, total: C.evidence.items.length, done: right === C.evidence.items.length };
  }
  function integrityResult(C, r) {
    const per = {};
    for (const c of C.integrity.cases) { const a = isObj(r.int[c.id]) ? r.int[c.id] : {}; const cOk = a.c === c.answer, rOk = okIdx(c.reasons, a.r); per[c.id] = { cOk, rOk, ok: cOk && rOk }; }
    const right = Object.values(per).filter(x => x.ok).length;
    return { per, right, total: C.integrity.cases.length, done: right === C.integrity.cases.length };
  }
  function paraphraseResult(C, r) {
    const P = C.paraphrase, kinds = P.sort.every(k => r.para.kinds[k.id] === k.answer);
    let right = 0, total = 0;
    for (const pp of P.practice) for (const ch of pp.checks) { total++; const a = isObj(r.para.checks[pp.id]) ? r.para.checks[pp.id][ch.id] : undefined; if (okIdx(ch.options, a)) right++; }
    return { kinds, right, total, done: kinds && right === total };
  }
  function citeResult(C, r) {
    const ch = C.cite.challenges.filter(c => okIdx(c.options, r.cite[c.id])).length;
    const miss = C.cite.missing.filter(m => sameSet(r.miss[m.id], m.missing)).length;
    return { ch, miss, done: ch === C.cite.challenges.length && miss === C.cite.missing.length };
  }
  function apaResult(C, r) {
    const right = C.apa.challenges.filter(c => okIdx(c.options, r.apa[c.id])).length;
    return { right, total: C.apa.challenges.length, done: right === C.apa.challenges.length };
  }
  function mastery(C, r) {
    return { sources: sourcesResult(C, r).done, evidence: evidenceResult(C, r).done, integrity: integrityResult(C, r).done,
      paraphrase: paraphraseResult(C, r).done, cite: citeResult(C, r).done, apa: apaResult(C, r).done };
  }
  /** Record a part the first time it is shown, only for the part whose Check button was pressed. APA needs the
      authorized college pathway at the moment of checking. */
  function record(C, r, today, checked, isCol) {
    const m = mastery(C, r), newly = [];
    for (const k of PARTS) if (m[k] && !r.mastered[k] && (checked || []).includes(k) && (k !== "apa" || isCol === true)) { r.mastered[k] = today; newly.push(k); }
    return newly;
  }
  /** The natural oral citation from the student's own details; blanks stay as [brackets]; never a URL. */
  function oralCitation(f, es) {
    const v = k => (f && typeof f[k] === "string" ? f[k].trim().replace(/https?:\/\/\S+|www\.\S+|\b[\w-]+(\.[\w-]+)*\.(com|org|gov|edu|net|io|us)\b\S*/gi, "").replace(/\s{2,}/g, " ").trim().slice(0, 200) : "");
    const b = (k, en, sp) => v(k) || (es ? `[${sp}]` : `[${en}]`);
    const kind = v("kind") || (es ? "informe" : "report");
    return es
      ? `Según ${b("author", "", "autor u organización")}${v("qual") ? `, ${v("qual")}` : ""}, en un ${kind} de ${b("year", "", "año")} publicado por ${b("pub", "", "fuente")}, …`
      : `According to ${b("author", "author or organization")}${v("qual") ? `, ${v("qual")}` : ""}, in a ${b("year", "year")} ${kind} published by ${b("pub", "source")}, …`;
  }
  /** Missing-information warnings for one portfolio record. Never says a source is credible. */
  function recordWarnings(fields, rec) {
    const empty = fields.filter(f => f.need && !String(rec[f.id] || "").trim()).map(f => f.id);
    const quoteNoPage = !!String(rec.quote || "").trim() && !/(\bp\.|\bpp\.|\bpages?\b|\bpara\.|\bparagraph|\bsection\b|\bheading|¶|\bpág|\bpárr|\bsecci[oó]n|\bencabezado|\b\d{1,2}:\d{2}(:\d{2})?\b)/i.test(rec.quote);
    const urlInOral = /https?:|www\.|\.(com|org|gov|edu|net)\b/i.test(String(rec.oral || ""));
    return { empty, quoteNoPage, urlInOral };
  }
  /** The assignments a student's portfolio offers: the defaults in research-studio.json, overridden or extended by
      research settings on lessons (Lesson Manager). openUnit(u) says whether a unit is open to this student; a lesson
      in a closed unit adds nothing yet. A later lesson with the same id replaces an earlier one. */
  function assignments(C, lessons, units, openUnit) {
    const out = C.portfolio.assignments.map(a => ({ id: a.id, name: a.name, required: a.required, from: "default" }));
    const days = Object.keys((lessons && lessons.days) || {}).sort();
    for (const k of days) {
      const r = lessons.days[k] && lessons.days[k].research, w = Number(k.slice(1, 3));
      if (!r || typeof r !== "object" || typeof r.id !== "string" || !Number.isInteger(r.sources)) continue;
      const u = (units || []).find(x => (x.weeks || []).includes(w));
      if (u && openUnit && !openUnit(u.id)) continue;
      const a = { id: r.id, name: r.name || null, required: r.sources, expect: r.expect || null, written: r.written || null, oral: r.oral || null, portfolio: r.portfolio || null, from: k, unit: u ? u.id : null };
      const i = out.findIndex(x => x.id === r.id);
      if (i >= 0) out[i] = { ...out[i], ...a, name: a.name || out[i].name }; else out.push(a);
    }
    return out;
  }
  const core = { KEY, PARTS, load, assignments, sourcesResult, evidenceResult, integrityResult, paraphraseResult, citeResult, apaResult, mastery, record, oralCitation, recordWarnings };
  root.SLResearch = core;

  /* ---------- page ---------- */
  if (!root.SL2 || typeof document === "undefined") return;
  const SL2 = root.SL2, D = root.SL_DATA, { h, L, pick, ICON } = SL2;
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const put = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const es = () => typeof lang !== "undefined" && lang === "es";
  const isCol = () => typeof level !== "undefined" && level === "col" && typeof colUnlocked === "function" && colUnlocked();
  const arr = o => (o ? (es() && o.es ? o.es : o.en) : []);
  const alt = o => { if (!SL2.supportsOn() || !o) return ""; const b = SL2.other(o); return b && b !== pick(o) ? `<span class="sl2-alt" lang="${es() ? "en" : "es"}">${rich(b)}</span>` : ""; };
  const rich = s => h(s).replace(/\*([^*]+)\*/g, "<i>$1</i>");
  const T = o => `${rich(pick(o))}${alt(o)}`;
  const entry = () => D.studios.experiences.find(x => x.id === "research-studio");

  let C = null, failed = false, busy = false;
  function content() {
    if (C || failed) return C;
    if (!busy) {
      busy = true;
      fetch((entry() || {}).content || "data/research-studio.json", { cache: "no-cache" }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(j => { C = j; }).catch(() => { failed = true; }).then(() => { busy = false; SL2.refresh(); });
    }
    return null;
  }
  let rec = load(get), said = "", confirmDel = null;
  const save = () => put(KEY, JSON.stringify(rec));
  function afterCheck(part) {
    const newly = record(C, rec, SL2.today(), [part], isCol());
    save();
    if (newly.length && window.SLSound) SLSound.cue("complete"); // optional sound (off unless the student turns it on)
    if (newly.length && SL2.achState) { try { SL2.achState(); } catch (e) {} }
  }

  const PAGES = [
    ["sources", { en: "Source Detective", es: "Detective de fuentes" }, { en: "Investigate who made a source, why, and how they know. Lateral reading, bias, dates, misinformation.", es: "Investiga quién hizo una fuente, por qué y cómo lo sabe. Lectura lateral, sesgo, fechas, desinformación." }],
    ["evidence", { en: "Evidence Explorer", es: "Explorador de evidencia" }, { en: "Research questions, search terms, evidence types, misleading statistics, selective quotes, synthesis. ProCon.org guide.", es: "Preguntas de investigación, búsqueda, tipos de evidencia, estadísticas engañosas, citas selectivas, síntesis. Guía de ProCon.org." }],
    ["integrity", { en: "Plagiarism Investigator", es: "Investigador de plagio" }, { en: "Eleven case files: decide what happened, explain why, learn the fix.", es: "Once expedientes: decide qué pasó, explica por qué y aprende el arreglo." }],
    ["paraphrase", { en: "Paraphrasing Workshop", es: "Taller de paráfrasis" }, { en: "Quote, paraphrase or summarize? Seven steps to a real paraphrase in your own words.", es: "¿Cita, paráfrasis o resumen? Siete pasos para una paráfrasis real con tus palabras." }],
    ["cite", { en: "Citation Builder", es: "Constructor de citas" }, { en: "Oral citations for your speech, in-text citations, and reference entries.", es: "Citas orales para tu discurso, citas en el texto y entradas de referencia." }],
    ["portfolio", { en: "Speech Research Portfolio", es: "Portafolio de investigación" }, { en: "Record every source for your speech. Print, download or copy into Canvas.", es: "Registra cada fuente de tu discurso. Imprime, descarga o copia en Canvas." }],
    ["apa", { en: "APA Academy (college)", es: "Academia APA (universidad)" }, { en: "APA 7 for the authorized College Public Speaking pathway.", es: "APA 7 para el nivel universitario autorizado de Oratoria." }],
  ];
  const wrap = (cur, inner) => `<div class="wrap sl2 ai rs" id="sl2-main" data-notr>
    <p class="sl2-back sl2-noprint">${cur ? `<a href="#/research">← ${L("Research Studio", "Estudio de investigación")}</a>` : backToUnit()}</p>
    <p class="sl2-kicker">${h(pick(C.title))} · ${h(pick(C.tagline))}</p>
    ${cur ? `<nav class="ai-nav sl2-noprint" aria-label="${L("Studio sections", "Secciones del estudio")}"><ul>${PAGES.filter(p => p[0] !== "apa" || isCol()).map(([id, n]) => `<li><a href="#/research/${id}"${id === cur ? ' aria-current="page"' : ""}>${h(pick(n))}</a></li>`).join("")}</ul></nav>` : ""}
    ${es() && C.status.es !== "approved" ? `<p class="btp-draft">Traducción en borrador: el Sr. Bennett todavía la está revisando.</p>` : ""}
    ${inner}
    <details class="btp-vocab sl2-noprint"${SL2.supportLevel && SL2.supportLevel() === "guided" ? " open" : ""}><summary>${L("Vocabulary and sentence starters", "Vocabulario e inicios de oración")}</summary><ul class="sl2-chips">${C.vocab.map(v => `<li>${h(es() ? v.es : v.en)} <span class="sl2-alt" lang="${es() ? "en" : "es"}">${h(es() ? v.en : v.es)}</span></li>`).join("")}</ul><ul class="sl2-frames">${arr(C.frames).map(f => `<li>${h(f)}</li>`).join("")}</ul></details></div>`;
  const backToUnit = () => { const u = SL2.currentUnitId && SL2.currentUnitId(); return u && SL2.unitOpen(u) ? `<a href="#/unit/${u}/labs">← ${L(`Unit ${u}: labs and studios`, `Unidad ${u}: laboratorios y estudios`)}</a> · <a href="#/">${L("My course", "Mi curso")}</a>` : `<a href="#/">← ${L("My course", "Mi curso")}</a>`; };
  const status = (txt, ok) => `<p class="btp-status" role="status">${ok ? `${ICON.check} ` : ""}${txt}</p>`;
  const fb = (ok, why) => `<p class="btp-fb">${ok ? `${ICON.check} <b>${L("Right.", "Correcto.")}</b> ${why ? T(why) : ""}` : `<b>${L("Look again.", "Mira otra vez.")}</b>`}</p>`;
  const radios = (name, opts, cur, act, id, col) => `<div class="btp-opts${col ? " btp-col" : ""}">${opts.map(([v, lab]) => `<label><input type="radio" name="${name}" data-rs="${act}" data-id="${id}" value="${v}" data-k="${name}-${v}"${String(cur) === String(v) ? " checked" : ""}> ${lab}</label>`).join("")}</div>`;
  const mcOpts = o => o.map((x, i) => [i, rich(pick(x.t))]);
  const fict = () => `<span class="sl2-pill rs-fict">${h(pick(C.fictional))}</span>`;

  function viewHome() {
    const m = mastery(C, rec), b = D.achievements.badges.find(x => x.id === "citation-specialist"), ai = SL2.aiNow();
    const tag = { sources: m.sources, evidence: m.evidence, integrity: m.integrity, paraphrase: m.paraphrase, cite: m.cite, apa: m.apa };
    return wrap("", `<h1 class="sl2-h1">${h(pick(C.tagline))}</h1><p class="sl2-lead">${h(pick(C.principle))}</p>
      <ul class="sl2-tiles ai-tiles">${PAGES.filter(p => p[0] !== "apa" || isCol()).map(([id, n, d]) => `<li><a class="sl2-tile" href="#/research/${id}"><b>${h(pick(n))}</b><span>${h(pick(d))}</span>${tag[id] ? `<span class="sl2-pill">✓ ${L("done", "hecho")}</span>` : ""}</a></li>`).join("")}</ul>
      <section class="sl2-card"><h2 class="sl2-h2">${L("Also practice", "Practica también")}</h2><ul>
        <li><a href="#/unit/2/labs">${L("Research & Source Lab", "Laboratorio de investigación y fuentes")}</a>: ${L("primary and scholarly sources, credibility, oral citations and APA basics.", "fuentes primarias y académicas, credibilidad, citas orales y bases de APA.")}</li>
        <li><a href="#/ai/factcheck">${L("AI Fact Checker", "Verificador de IA")}</a>: ${L("investigate fabricated citations and unsupported statistics in a simulated AI answer.", "investiga citas inventadas y estadísticas sin apoyo en una respuesta de IA simulada.")}</li></ul></section>
      <section class="sl2-card"><h2 class="sl2-h2">${h(pick(C.ai.title))}</h2><ul>${arr(C.ai.points).map(p => `<li>${h(p)}</li>`).join("")}</ul>${ai ? SL2.aiCard(ai, true) : ""}</section>
      ${b ? `<section class="sl2-card"><h2 class="sl2-h2">${h(pick(b.title))}</h2><p>${h(pick(b.about))}</p><ul class="sl2-crit">${b.criteria.map(c => `<li class="${m[c.part] ? "is-done" : ""}">${m[c.part] ? ICON.check : ICON.open} <span>${h(pick(c.label))}</span></li>`).join("")}</ul><p class="sl2-small">${L("Opening pages, building citations or adding sources to your portfolio never earns it.", "Abrir páginas, construir citas o agregar fuentes a tu portafolio nunca la otorga.")}</p></section>` : ""}
      <p class="btp-missing">${h(pick(C.noAuto))}</p>`);
  }

  function viewSources() {
    const S = C.sources, r = sourcesResult(C, rec);
    const crit = S.criteria.map(c => [c.id, h(pick(c.name))]);
    return wrap("sources", `<h1 class="sl2-h1">${L("Source Detective", "Detective de fuentes")}</h1><p class="sl2-lead">${h(pick(S.intro))}</p>
      <ol class="rs-flow" aria-label="${L("Lateral reading", "Lectura lateral")}">${arr(S.lateral).map((s, i) => `<li><span class="btp-num">${i + 1}</span> ${h(s)}</li>`).join("")}</ol>
      <details class="sl2-card"><summary><h2 class="sl2-h3 rs-sum">${L("Twelve questions detectives ask", "Doce preguntas que hacen los detectives")}</h2></summary><dl class="rs-crit">${S.criteria.map(c => `<dt>${h(pick(c.name))}</dt><dd>${T(c.ask)}</dd>`).join("")}</dl></details>
      <section class="sl2-card"><h2 class="sl2-h3 rs-sum">${h(pick(S.domains.title))}</h2><ul>${arr(S.domains.points).map(p => `<li>${h(p)}</li>`).join("")}</ul></section>
      <h2 class="sl2-h2">${L("Case files", "Expedientes")}</h2>
      <p class="btp-meter" role="status">${L(`${r.right} of ${r.total} cases solved`, `${r.right} de ${r.total} casos resueltos`)}</p>
      <div class="btp-cases">${S.cases.map(c => {
        const a = isObj(rec.src[c.id]) ? rec.src[c.id] : {}, shown = rec.checked["src-" + c.id], p = r.per[c.id], ok = p.v && p.f;
        return `<fieldset class="btp-case${shown ? (ok ? " is-ok" : " is-bad") : ""}"><legend>${T(c.card.title)}</legend>
          ${c.fictional ? fict() : `<span class="sl2-pill">${L("Authentic example", "Ejemplo auténtico")}</span>`}
          <dl class="rs-card"><dt>${L("By", "Autor")}</dt><dd>${h(c.card.by)}</dd><dt>${L("Where", "Dónde")}</dt><dd>${h(c.card.site)}</dd><dt>${L("Date", "Fecha")}</dt><dd>${h(pick(c.card.date))}</dd></dl>
          <p class="sl2-small">${T(c.card.note)}</p>
          <p><button type="button" class="btn" data-rs="look" data-id="${c.id}" data-k="look-${c.id}" aria-expanded="${!!rec.looked[c.id]}">${L("Read laterally (simulated search)", "Leer lateralmente (búsqueda simulada)")}</button></p>
          ${rec.looked[c.id] ? `<p class="ai-lookup">${T(c.lookup)}</p>` : ""}
          <p class="sl2-small"><b>${L("Your verdict", "Tu veredicto")}</b></p>${radios("srcv-" + c.id, Object.entries(S.verdicts).map(([v, l]) => [v, h(pick(l))]), a.v, "srcv", c.id, true)}
          <label class="rs-sel"><span>${L("The most important question for this source", "La pregunta más importante para esta fuente")}</span><select data-rs="srcf" data-id="${c.id}" data-k="srcf-${c.id}"><option value="">${L("Choose…", "Elige…")}</option>${crit.map(([v, l]) => `<option value="${v}"${a.f === v ? " selected" : ""}>${l}</option>`).join("")}</select></label>
          <p><button type="button" class="btn" data-rs="srccheck" data-id="${c.id}" data-k="srccheck-${c.id}">${L("Check", "Revisar")}</button></p>
          ${shown ? `<div role="status">${ok ? fb(true, c.why) : `<p class="btp-fb"><b>${!p.v ? L("Rethink the verdict.", "Repiensa el veredicto.") : L("The verdict is right; which question matters most here?", "El veredicto es correcto; ¿qué pregunta importa más aquí?")}</b> ${rec.looked[c.id] ? "" : L("Try reading laterally.", "Prueba leer lateralmente.")}</p>`}</div>` : ""}</fieldset>`; }).join("")}</div>`);
  }

  function viewEvidence() {
    const E = C.evidence, r = evidenceResult(C, rec), checked = !!rec.checked.ev;
    const item = it => {
      const a = rec.ev[it.id], ok = r.per[it.id], st = checked && a != null ? (ok ? " is-ok" : " is-bad") : "";
      if (it.kind === "mc") return `<fieldset class="btp-item${st}"><legend>${T(it.q)}</legend>${radios("ev-" + it.id, mcOpts(it.options), a, "ev", it.id, true)}${checked && a != null ? fb(ok, ok ? it.why : null) : ""}</fieldset>`;
      if (it.kind === "type") return `<fieldset class="btp-item${st}"><legend>${T(it.text)}</legend>${radios("ev-" + it.id, Object.entries(E.types).map(([v, l]) => [v, h(pick(l))]), a, "evs", it.id)}${checked && a != null ? fb(ok) : ""}</fieldset>`;
      return `<fieldset class="btp-item${st}"><legend>${T(it.claim)}</legend><p>${T(it.ev)}</p>${radios("ev-" + it.id, Object.entries(E.supportChoices).map(([v, l]) => [v, h(pick(l))]), a, "evs", it.id, true)}${checked && a != null ? fb(ok, ok ? it.why : null) : ""}</fieldset>`;
    };
    const grp = (title, ids) => `<h2 class="sl2-h2">${title}</h2>${E.items.filter(ids).map(item).join("")}`;
    return wrap("evidence", `<h1 class="sl2-h1">${L("Evidence Explorer", "Explorador de evidencia")}</h1><p class="sl2-lead">${h(pick(E.intro))}</p>
      <p class="ai-college">${T(E.speeches)}</p>
      <form onsubmit="return false">
      ${grp(L("1. Questions and search terms", "1. Preguntas y palabras de búsqueda"), x => x.group === "question" || x.group === "search")}
      ${grp(L("2. Kinds of evidence", "2. Tipos de evidencia"), x => x.kind === "type")}
      ${grp(L("3. Does the evidence support the claim?", "3. ¿La evidencia apoya la afirmación?"), x => x.kind === "support")}
      ${grp(L("4. Misleading numbers and quotes", "4. Números y citas engañosos"), x => x.group === "stats" || x.group === "quote")}
      ${grp(L("5. Counterevidence and synthesis", "5. Contraevidencia y síntesis"), x => x.group === "counter" || x.group === "synth")}
      <p><button type="button" class="btn primary" data-rs="evcheck" data-k="evcheck">${L("Check my answers", "Revisar mis respuestas")}</button></p>
      ${checked ? status(r.done ? L("All correct.", "Todo correcto.") : L(`${r.right} of ${r.total} correct. Change any answer and check again.`, `${r.right} de ${r.total} correctas. Cambia cualquier respuesta y revisa otra vez.`), r.done) : ""}</form>
      <section class="sl2-card rs-procon"><h2 class="sl2-h2">${h(pick(E.procon.title))}</h2><p>${T(E.procon.intro)}</p><ol>${arr(E.procon.steps).map(s => `<li>${h(s)}</li>`).join("")}</ol></section>`);
  }

  function viewIntegrity() {
    const I = C.integrity, r = integrityResult(C, rec), cats = Object.entries(I.categories);
    return wrap("integrity", `<h1 class="sl2-h1">${L("Plagiarism Investigator", "Investigador de plagio")}</h1><p class="sl2-lead">${h(pick(I.intro))}</p>
      <p class="btp-missing">${h(pick(C.noAuto))}</p>
      <details class="sl2-card"><summary><h2 class="sl2-h3 rs-sum">${L("The eleven categories", "Las once categorías")}</h2></summary><dl class="rs-crit">${cats.map(([, c]) => `<dt>${h(pick(c.name))}</dt><dd>${T(c.def)}</dd>`).join("")}</dl></details>
      <p class="btp-meter" role="status">${L(`${r.right} of ${r.total} case files solved`, `${r.right} de ${r.total} expedientes resueltos`)}</p>
      ${I.cases.map((c, n) => {
        const a = isObj(rec.int[c.id]) ? rec.int[c.id] : {}, shown = rec.checked["int-" + c.id], p = r.per[c.id], src = c.passage && I.passages[c.passage];
        return `<fieldset class="btp-case rs-file${shown ? (p.ok ? " is-ok" : " is-bad") : ""}"><legend>${L("Case file", "Expediente")} ${n + 1}</legend>
          <div class="rs-pair"><div><p class="sl2-kicker">${L("Source passage", "Pasaje de la fuente")} ${src ? fict() : ""}</p>${src ? `<blockquote>${T(src)}</blockquote><p class="sl2-small">${rich(src.by)}</p>` : `<p class="sl2-small">${L("No single source: think about where this fact appears.", "No hay una sola fuente: piensa dónde aparece este dato.")}</p>`}</div>
          <div><p class="sl2-kicker">${L("Student's work", "Trabajo del estudiante")}</p><blockquote class="rs-student">${T(c.work)}</blockquote></div></div>
          <label class="rs-sel"><span>${L("What is this?", "¿Qué es esto?")}</span><select data-rs="intc" data-id="${c.id}" data-k="intc-${c.id}"><option value="">${L("Choose…", "Elige…")}</option>${cats.map(([v, cc]) => `<option value="${v}"${a.c === v ? " selected" : ""}>${h(pick(cc.name))}</option>`).join("")}</select></label>
          <p class="sl2-small"><b>${L("Why?", "¿Por qué?")}</b></p>${radios("intr-" + c.id, mcOpts(c.reasons), a.r, "intr", c.id, true)}
          <p><button type="button" class="btn" data-rs="intcheck" data-id="${c.id}" data-k="intcheck-${c.id}">${L("Check", "Revisar")}</button></p>
          ${shown ? `<div role="status">${p.ok ? `<p class="btp-fb">${ICON.check} <b>${L("Right.", "Correcto.")}</b> ${T(c.fix)}</p>` : `<p class="btp-fb"><b>${a.c == null || a.r == null ? L("Choose a category and a reason.", "Elige una categoría y una razón.") : !p.cOk ? L("Look again at the category. Compare the two passages word by word, and check for credit.", "Revisa otra vez la categoría. Compara los dos pasajes palabra por palabra y busca el crédito.") : L("The category is right; choose a better reason.", "La categoría es correcta; elige una mejor razón.")}</b></p>`}</div>` : ""}</fieldset>`; }).join("")}`);
  }

  function viewParaphrase() {
    const P = C.paraphrase, r = paraphraseResult(C, rec), kChecked = !!rec.checked.kinds;
    const practice = pp => {
      const hidden = !!rec.para.hidden[pp.id], ans = isObj(rec.para.checks[pp.id]) ? rec.para.checks[pp.id] : {}, shown = rec.checked["pp-" + pp.id], self = isObj(rec.para.self[pp.id]) ? rec.para.self[pp.id] : {};
      return `<section class="sl2-card rs-pp"><h2 class="sl2-h2">${pp.scaffold === "full" ? L("Guided practice", "Práctica guiada") : L("On your own", "Por tu cuenta")}</h2>
        <p class="sl2-kicker">${L("Source", "Fuente")}: ${rich(pp.by)} ${fict()}</p>
        ${hidden ? `<p class="rs-hidden">${L("Source set aside. Write from what you understood.", "Fuente guardada. Escribe a partir de lo que entendiste.")}</p>` : `<blockquote>${T(pp.text)}</blockquote>`}
        ${pp.checks.map(ch => `<fieldset class="btp-item${shown ? (okIdx(ch.options, ans[ch.id]) ? " is-ok" : " is-bad") : ""}"><legend>${T(ch.q)}</legend>${radios(`pp-${pp.id}-${ch.id}`, mcOpts(ch.options), ans[ch.id], "ppc", `${pp.id}|${ch.id}`, true)}</fieldset>`).join("")}
        <p class="btp-row"><button type="button" class="btn" data-rs="pphide" data-id="${pp.id}" data-k="pphide-${pp.id}" aria-pressed="${hidden}">${hidden ? L("Show the source again (step 5: compare)", "Mostrar la fuente otra vez (paso 5: comparar)") : L("Step 3: set the source aside", "Paso 3: deja la fuente a un lado")}</button></p>
        <label class="btp-note"><span>${pp.scaffold === "full" ? L("Step 4: explain the idea in your own words and structure.", "Paso 4: explica la idea con tus palabras y tu estructura.") : L("Write your paraphrase.", "Escribe tu paráfrasis.")}</span><textarea rows="3" data-rs="pptext" data-id="${pp.id}" data-k="pptext-${pp.id}">${h(rec.para.text[pp.id] || "")}</textarea></label>
        <fieldset class="rs-self"><legend>${L("Steps 5–6: compare and check yourself", "Pasos 5–6: compara y revísate")}</legend>${arr(pp.self).map((s, i) => `<label><input type="checkbox" data-rs="ppself" data-id="${pp.id}" data-i="${i}" data-k="ppself-${pp.id}-${i}"${self[i] ? " checked" : ""}> ${h(s)}</label>`).join("")}</fieldset>
        <p class="sl2-small">${h(pick(P.judge))}</p>
        <p><button type="button" class="btn" data-rs="ppcheck" data-id="${pp.id}" data-k="ppcheck-${pp.id}">${L("Check the questions", "Revisar las preguntas")}</button></p>
        ${shown ? status(pp.checks.every(ch => okIdx(ch.options, ans[ch.id])) ? L("Questions correct. Your paraphrase itself is for you and a reader to judge.", "Preguntas correctas. Tu paráfrasis la juzgan tú y un lector.") : L("Some answers need another look.", "Algunas respuestas necesitan otra revisión."), pp.checks.every(ch => okIdx(ch.options, ans[ch.id]))) : ""}</section>`;
    };
    return wrap("paraphrase", `<h1 class="sl2-h1">${L("Paraphrasing Workshop", "Taller de paráfrasis")}</h1><p class="sl2-lead">${h(pick(P.intro))}</p>
      <ul class="rs-three">${Object.entries(P.kinds).map(([, k]) => `<li class="sl2-card"><h2 class="sl2-h3 rs-sum">${h(pick(k.name))}</h2><p>${T(k.what)}</p></li>`).join("")}</ul>
      <form onsubmit="return false"><h2 class="sl2-h2">${L("Quote, paraphrase or summary?", "¿Cita, paráfrasis o resumen?")}</h2>
      ${P.sort.map(k => { const a = rec.para.kinds[k.id]; return `<fieldset class="btp-item${kChecked && a ? (a === k.answer ? " is-ok" : " is-bad") : ""}"><legend>${T(k.text)}</legend>${radios("kind-" + k.id, Object.entries(P.kinds).map(([v, x]) => [v, h(pick(x.name))]), a, "kind", k.id)}</fieldset>`; }).join("")}
      <p><button type="button" class="btn" data-rs="kindcheck" data-k="kindcheck">${L("Check", "Revisar")}</button></p>${kChecked ? status(r.kinds ? L("All correct.", "Todo correcto.") : L("Look again at the length and the wording.", "Revisa otra vez el largo y las palabras."), r.kinds) : ""}</form>
      <ol class="rs-flow" aria-label="${L("Seven steps", "Siete pasos")}">${arr(P.steps).map((s, i) => `<li><span class="btp-num">${i + 1}</span> ${h(s)}</li>`).join("")}</ol>
      <p class="ai-blocked">${T(P.trap)}</p>
      ${P.practice.map(practice).join("")}
      <p class="sl2-small">${h(arr(C.frames)[4])}</p>`);
  }

  function viewCite() {
    const X = C.cite, r = citeResult(C, rec), checked = !!rec.checked.cite, bf = rec.builder;
    return wrap("cite", `<h1 class="sl2-h1">${L("Citation Builder", "Constructor de citas")}</h1><p class="sl2-lead">${h(pick(X.intro))}</p>
      <ul class="rs-three">${X.forms.map(f => `<li class="sl2-card"><h2 class="sl2-h3 rs-sum">${h(pick(f.name))}</h2><p>${T(f.what)}</p><p class="ai-text">${rich(pick(f.ex))}</p></li>`).join("")}</ul>
      <details class="sl2-card"><summary><h2 class="sl2-h3 rs-sum">${L("Which details, and why they matter", "Qué datos y por qué importan")}</h2></summary><dl class="rs-crit">${X.details.map(d => `<dt>${h(pick(d.name))}</dt><dd>${T(d.why)}</dd>`).join("")}</dl></details>
      <section class="sl2-card"><h2 class="sl2-h2">${L("Oral citation builder", "Constructor de citas orales")}</h2><p class="sl2-small">${h(pick(X.builder))}</p>
        <div class="rs-grid">${[["author", L("Author or organization", "Autor u organización")], ["qual", L("Qualification (optional)", "Credencial (opcional)")], ["year", L("Year", "Año")], ["kind", L("Kind (report, study, article, interview…)", "Tipo (informe, estudio, artículo, entrevista…)")], ["pub", L("Published by", "Publicado por")]].map(([k, lab]) => `<label class="btp-note"><span>${lab}</span><input data-rs="build" data-id="${k}" data-k="build-${k}" value="${h(bf[k] || "")}" autocomplete="off"></label>`).join("")}</div>
        <p class="ai-text" id="rsOral" aria-live="polite">${h(oralCitation(bf, es()))}</p>
        <p class="sl2-small">${L("Sentence starters:", "Inicios de oración:")}</p><ul class="sl2-frames">${arr(X.frames).map(f => `<li>${h(f)}</li>`).join("")}</ul></section>
      <form onsubmit="return false"><h2 class="sl2-h2">${L("Challenges", "Retos")}</h2>
      ${X.challenges.map(c => { const a = rec.cite[c.id], ok = okIdx(c.options, a); return `<fieldset class="btp-item${checked && a != null ? (ok ? " is-ok" : " is-bad") : ""}"><legend>${T(c.q)}</legend>${radios("cite-" + c.id, mcOpts(c.options), a, "cite", c.id, true)}${checked && a != null ? fb(ok, ok ? c.why : null) : ""}</fieldset>`; }).join("")}
      <h2 class="sl2-h2">${L("What's missing?", "¿Qué falta?")}</h2>
      ${X.missing.map(m => { const sel = Array.isArray(rec.miss[m.id]) ? rec.miss[m.id] : [], ok = sameSet(sel, m.missing); return `<fieldset class="btp-item${checked ? (ok ? " is-ok" : " is-bad") : ""}"><legend><span class="ai-text rs-inline">${rich(m.text)}</span> ${fict()}</legend><div class="btp-opts">${Object.entries(X.missingFields).map(([f, lab]) => `<label><input type="checkbox" data-rs="miss" data-id="${m.id}" value="${f}" data-k="miss-${m.id}-${f}"${sel.includes(f) ? " checked" : ""}> ${h(pick(lab))}</label>`).join("")}</div>${checked ? fb(ok) : ""}<p class="sl2-small">${L("Never fill a gap by guessing. Find it in the source, or use what your style guide says for missing information.", "Nunca llenes un hueco adivinando. Búscalo en la fuente o usa lo que indica tu guía de estilo para información que falta.")}</p></fieldset>`; }).join("")}
      <p><button type="button" class="btn primary" data-rs="citecheck" data-k="citecheck">${L("Check my answers", "Revisar mis respuestas")}</button></p>
      ${checked ? status(r.done ? L("All correct.", "Todo correcto.") : L(`Challenges ${r.ch} of ${X.challenges.length}, missing-information ${r.miss} of ${X.missing.length}. Try again.`, `Retos ${r.ch} de ${X.challenges.length}, información que falta ${r.miss} de ${X.missing.length}. Inténtalo otra vez.`), r.done) : ""}</form>`);
  }

  /* ----- portfolio ----- */
  const PF = () => C.portfolio;
  const asgList = () => assignments(C, D.lessons, D.units.units, u => SL2.unitOpen(u));
  // Default: the assignment the student chose; otherwise the most recent research assignment Mr. Bennett set.
  const curAsg = () => { const all = asgList(); return all.find(a => a.id === rec.port.assignment) || [...all].reverse().find(a => a.from !== "default") || all[0]; };
  const asgName = a => (a.name ? pick(a.name) : a.id);
  const items = () => { const id = curAsg().id; if (!Array.isArray(rec.port.items[id])) rec.port.items[id] = []; return rec.port.items[id]; };
  function warnHtml(it) {
    const w = recordWarnings(PF().fields, it), lab = id => pick(PF().fields.find(f => f.id === id).label);
    return `${w.empty.length ? `<p>${L("Still missing:", "Falta todavía:")} ${w.empty.map(id => h(lab(id))).join(" · ")}</p>` : `<p>${ICON.check} ${L("Every field has something in it.", "Todos los campos tienen algo.")}</p>`}
      ${w.quoteNoPage ? `<p>${h(pick(PF().warnQuote))}</p>` : ""}${w.urlInOral ? `<p>${h(pick(PF().warnUrl))}</p>` : ""}<p class="sl2-small">${h(pick(PF().warnCred))}</p>`;
  }
  function viewPortfolio() {
    const A = curAsg(), list = items(), F = PF().fields;
    return wrap("portfolio", `<h1 class="sl2-h1">${L("Speech Research Portfolio", "Portafolio de investigación")}</h1><p class="sl2-lead">${h(pick(PF().intro))}</p>
      <div class="ai-filter"><label>${L("Assignment", "Tarea")} <select data-rs="asg" data-k="asg">${asgList().map(a => `<option value="${h(a.id)}"${a.id === A.id ? " selected" : ""}>${h(asgName(a))}</option>`).join("")}</select></label></div>
      ${A.required > 0 ? `<p class="btp-meter" role="status">${L(`${list.length} of ${A.required} required sources recorded`, `${list.length} de ${A.required} fuentes requeridas registradas`)}${list.length >= A.required ? ` ${ICON.check}` : ""}</p>` : `<p class="btp-meter" role="status">${h(pick(PF().noneNote))}</p>`}
      <section class="sl2-card rs-req" aria-label="${L("Requirements for this assignment", "Requisitos de esta tarea")}"><h2 class="sl2-h3 rs-sum">${L("Requirements", "Requisitos")}: ${h(asgName(A))}</h2>
        <dl class="rs-crit">${A.required > 0 ? `<dt>${L("Sources", "Fuentes")}</dt><dd>${L(`At least ${A.required} credible sources`, `Al menos ${A.required} fuentes confiables`)}</dd>` : ""}
        ${A.expect ? `<dt>${L("Research", "Investigación")}</dt><dd>${T(A.expect)}</dd>` : ""}
        <dt>${L("Written citations", "Citas escritas")}</dt><dd>${T(A.written || PF().defaults.written)}</dd>
        <dt>${L("Oral citations", "Citas orales")}</dt><dd>${T(A.oral || PF().defaults.oral)}</dd>
        ${A.portfolio ? `<dt>${L("Portfolio", "Portafolio")}</dt><dd>${T(A.portfolio)}</dd>` : ""}</dl></section>
      <p class="sl2-small">${h(pick(PF().requiredNote))}</p>${SL2.teacherOn() ? `<p class="sl2-teachnote" role="note">${h(pick(PF().teacherNote))}</p>` : ""}
      ${list.map((it, n) => `<section class="sl2-card rs-rec" aria-labelledby="rs-rec-${n}"><h2 class="sl2-h2" id="rs-rec-${n}">${L("Source", "Fuente")} ${n + 1}${it.title ? `: ${h(it.title)}` : ""}</h2>
        <div class="rs-grid">${F.map(f => f.type === "select"
          ? `<label class="btp-note"><span>${h(pick(f.label))}${f.need ? "" : ` (${L("if it applies", "si aplica")})`}</span><select data-rs="pf" data-n="${n}" data-id="${f.id}" data-k="pf-${n}-${f.id}"><option value="">${L("Choose…", "Elige…")}</option>${Object.entries(f.options).map(([v, l]) => `<option value="${v}"${it[f.id] === v ? " selected" : ""}>${h(pick(l))}</option>`).join("")}</select></label>`
          : `<label class="btp-note${f.long ? " rs-wide" : ""}"><span>${h(pick(f.label))}${f.need ? "" : ` (${L("if it applies", "si aplica")})`}</span>${f.long ? `<textarea rows="2" data-rs="pf" data-n="${n}" data-id="${f.id}" data-k="pf-${n}-${f.id}">${h(it[f.id] || "")}</textarea>` : `<input data-rs="pf" data-n="${n}" data-id="${f.id}" data-k="pf-${n}-${f.id}" value="${h(it[f.id] || "")}" autocomplete="off">`}</label>`).join("")}</div>
        <div class="rs-warn" id="rs-warn-${n}" role="status">${warnHtml(it)}</div>
        <p class="btp-row">${confirmDel === n ? `<button type="button" class="btn" data-rs="pfdelyes" data-n="${n}" data-k="pfdelyes-${n}">${L("Yes, remove this source", "Sí, quitar esta fuente")}</button> <button type="button" class="btn" data-rs="pfdelno" data-k="pfdelno-${n}">${L("Keep it", "Conservarla")}</button>` : `<button type="button" class="btn" data-rs="pfdel" data-n="${n}" data-k="pfdel-${n}">${L("Remove this source", "Quitar esta fuente")}</button>`}</p></section>`).join("")}
      <p class="btp-row"><button type="button" class="btn primary" data-rs="pfadd" data-k="pfadd">${L("Add a source", "Agregar una fuente")}</button> <a class="btn" href="#/research/portfolio/summary">${L("Summary: print, download or copy", "Resumen: imprimir, descargar o copiar")}</a></p>
      <p class="sl2-small">${L("Saved only in this browser on this computer; never sent anywhere. To move it to another computer, use “Back up or move my progress” on My achievements, or download the summary.", "Se guarda solo en este navegador y en esta computadora; nunca se envía. Para pasarlo a otra computadora, usa “Copiar o mover mi progreso” en Mis logros, o descarga el resumen.")}</p>`);
  }
  function summaryText() {
    const A = curAsg(), F = PF().fields;
    return [`${asgName(A)} · ${L("Research portfolio", "Portafolio de investigación")} · ${SL2.fmtLong(SL2.today())}`, A.required > 0 ? `${L("Sources", "Fuentes")}: ${items().length} / ${A.required}` : `${L("Sources", "Fuentes")}: ${items().length}`, ""]
      .concat(items().map((it, n) => [`${L("Source", "Fuente")} ${n + 1}`].concat(F.map(f => `${pick(f.label)}: ${f.type === "select" ? (f.options[it[f.id]] ? pick(f.options[it[f.id]]) : "") : (it[f.id] || "")}`)).join("\n")))
      .join("\n\n");
  }
  function viewSummary() {
    const A = curAsg(), F = PF().fields;
    return wrap("portfolio", `<h1 class="sl2-h1">${L("Research summary", "Resumen de investigación")}: ${h(asgName(A))}</h1>
      <p class="btp-fill">${L("Name", "Nombre")}: ______________________ &nbsp; ${L("Class period", "Hora de clase")}: ______ &nbsp; ${h(SL2.fmtLong(SL2.today()))}</p>
      <p class="btp-row sl2-noprint"><button type="button" class="btn primary" data-sl2-print>${L("Print", "Imprimir")}</button> <button type="button" class="btn" data-rs="pfdl" data-k="pfdl">${L("Download (.txt)", "Descargar (.txt)")}</button> <button type="button" class="btn" data-rs="pfcopy" data-k="pfcopy">${L("Copy for Canvas", "Copiar para Canvas")}</button> <a class="btn" href="#/research/portfolio">${L("Back to editing", "Volver a editar")}</a> <span role="status" class="sl2-small" id="rsSaid">${h(said)}</span></p>
      <p>${A.required > 0 ? L(`${items().length} of ${A.required} required sources.`, `${items().length} de ${A.required} fuentes requeridas.`) : L(`${items().length} sources recorded.`, `${items().length} fuentes registradas.`)}</p>
      ${items().map((it, n) => `<section class="sl2-card rs-sumrec"><h2 class="sl2-h3 rs-sum">${L("Source", "Fuente")} ${n + 1}</h2><dl class="rs-crit">${F.map(f => `<dt>${h(pick(f.label))}</dt><dd>${h(f.type === "select" ? (f.options[it[f.id]] ? pick(f.options[it[f.id]]) : "—") : (it[f.id] || "—"))}</dd>`).join("")}</dl></section>`).join("") || `<p>${L("No sources yet.", "Todavía no hay fuentes.")}</p>`}
      <p class="sl2-small">${h(pick(PF().warnCred))}</p>`);
  }

  function viewApa() {
    if (!isCol()) return wrap("apa", `<h1 class="sl2-h1">${L("APA Academy", "Academia APA")}</h1>
      <div class="sl2-card sl2-locked"><p>${ICON.lock} <b>${L("The APA Academy is part of the College Public Speaking pathway, which requires instructor authorization.", "La Academia APA es parte del nivel universitario de Oratoria, que requiere autorización del instructor.")}</b></p><p>${h(pick(C.apa.notice))}</p>
      <p>${L("High school students: the Citation Builder and the Research & Source Lab cover the citations you need.", "Estudiantes de preparatoria: el Constructor de citas y el Laboratorio de investigación y fuentes cubren las citas que necesitan.")} <a href="#/research/cite">${L("Citation Builder", "Constructor de citas")}</a></p></div>`);
    const A = C.apa, r = apaResult(C, rec), checked = !!rec.checked.apa, rule = id => A.rules.find(x => x.id === id);
    return wrap("apa", `<h1 class="sl2-h1">${L("APA Academy", "Academia APA")}</h1><p class="sl2-lead">${h(pick(A.intro))}</p>
      <p class="sl2-teachnote">${h(pick(A.notice))}</p>
      <p class="ai-college">${T(A.oralVsWritten)}</p>
      <h2 class="sl2-h2">${L("Rules and their official sources", "Reglas y sus fuentes oficiales")}</h2>
      <p class="sl2-small">${L(`Checked against apastyle.apa.org on ${A.checked}.`, `Verificado con apastyle.apa.org el ${A.checked}.`)}</p>
      <div class="rs-rules">${A.rules.map(x => `<details class="sl2-card" id="apa-${x.id}"><summary><h3 class="sl2-h3 rs-sum">${h(pick(x.topic))}</h3></summary><p class="rs-ref">${T(x.rule)}</p><p class="sl2-small">${L("Source:", "Fuente:")} <a href="${h(x.src)}" target="_blank" rel="noopener">${h(x.src.replace("https://", ""))}<span class="sr"> ${L("(opens in a new tab)", "(se abre en una pestaña nueva)")}</span></a></p></details>`).join("")}</div>
      <form onsubmit="return false"><h2 class="sl2-h2">${L("Challenges: correct, match, construct", "Retos: corregir, relacionar, construir")}</h2>
      ${A.challenges.map(c => { const a = rec.apa[c.id], ok = okIdx(c.options, a); return `<fieldset class="btp-item${checked && a != null ? (ok ? " is-ok" : " is-bad") : ""}"><legend>${T(c.q)}</legend>${radios("apa-" + c.id, mcOpts(c.options), a, "apa", c.id, true)}${checked && a != null ? (ok ? `<p class="btp-fb">${ICON.check} <b>${L("Right.", "Correcto.")}</b> ${L("Rule:", "Regla:")} ${h(pick(rule(c.rule).topic))}</p>` : `<p class="btp-fb"><b>${L("Look again.", "Mira otra vez.")}</b> ${L("Rule:", "Regla:")} ${h(pick(rule(c.rule).topic))}</p>`) : ""}</fieldset>`; }).join("")}
      <p><button type="button" class="btn primary" data-rs="apacheck" data-k="apacheck">${L("Check my answers", "Revisar mis respuestas")}</button></p>
      ${checked ? status(r.done ? L("All correct.", "Todo correcto.") : L(`${r.right} of ${r.total} correct. Try again.`, `${r.right} de ${r.total} correctas. Inténtalo otra vez.`), r.done) : ""}</form>`);
  }

  function view(route) {
    if (!content()) return `<div class="wrap sl2" id="sl2-main" data-notr><h1 class="sl2-h1">${L("Research Studio", "Estudio de investigación")}</h1><p role="${failed ? "alert" : "status"}">${failed ? L("The studio could not load. Check the internet connection and reload the page.", "El estudio no pudo cargar. Revisa la conexión a internet y vuelve a cargar la página.") : L("Loading…", "Cargando…")}</p></div>`;
    const u = (entry() || {}).introduces || 2;
    if (!SL2.unitOpen(u)) return `<div class="wrap sl2" id="sl2-main" data-notr>${SL2.lockedNotice(u)}</div>`;
    rec = load(get);
    const a = route.args || [];
    switch (a[0]) {
      case "sources": return viewSources();
      case "evidence": return viewEvidence();
      case "integrity": return viewIntegrity();
      case "paraphrase": return viewParaphrase();
      case "cite": return viewCite();
      case "portfolio": return a[1] === "summary" ? viewSummary() : viewPortfolio();
      case "apa": return viewApa();
      default: return viewHome();
    }
  }

  /* ----- interaction ----- */
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      try { const t = document.createElement("textarea"); t.value = text; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0"; document.body.appendChild(t); t.select(); const ok = document.execCommand("copy"); t.remove(); return ok; } catch (e2) { return false; }
    }
  }
  function say(msg) { said = msg; const el = document.getElementById("rsSaid"); if (el) el.textContent = msg; }
  function redraw(focusKey) {
    const y = window.scrollY; SL2.refresh(); window.scrollTo(0, y);
    const f = focusKey && document.querySelector(`#sl2-main [data-k="${focusKey}"]`);
    if (f) f.focus({ preventScroll: true });
  }
  const sub = (o, k) => (isObj(o[k]) ? o[k] : (o[k] = {}));
  function onEvent(ev) {
    const t = ev.target.closest && ev.target.closest("[data-rs]"); if (!t || !C) return;
    const r = SL2.route(); if (!r || r.name !== "research") return;
    const act = t.dataset.rs, id = t.dataset.id;
    if (ev.type === "input") {
      if (act === "pptext") { rec.para.text[id] = t.value.slice(0, 4000); save(); }
      else if (act === "build") { rec.builder[id] = t.value.slice(0, 200); save(); const o = document.getElementById("rsOral"); if (o) o.textContent = oralCitation(rec.builder, es()); }
      else if (act === "pf" && t.tagName !== "SELECT") { const it = items()[Number(t.dataset.n)]; if (it) { it[id] = t.value.slice(0, 4000); save(); const w = document.getElementById("rs-warn-" + t.dataset.n); if (w) w.innerHTML = warnHtml(it); } }
      return;
    }
    if (ev.type === "change") {
      switch (act) {
        case "srcv": sub(rec.src, id).v = t.value; rec.checked["src-" + id] = false; break;
        case "srcf": sub(rec.src, id).f = t.value; rec.checked["src-" + id] = false; break;
        case "ev": rec.ev[id] = Number(t.value); rec.checked.ev = false; break;
        case "evs": rec.ev[id] = t.value; rec.checked.ev = false; break;
        case "intc": sub(rec.int, id).c = t.value; rec.checked["int-" + id] = false; break;
        case "intr": sub(rec.int, id).r = Number(t.value); rec.checked["int-" + id] = false; break;
        case "kind": rec.para.kinds[id] = t.value; rec.checked.kinds = false; break;
        case "ppc": { const [pp, ch] = id.split("|"); sub(rec.para.checks, pp)[ch] = Number(t.value); rec.checked["pp-" + pp] = false; break; }
        case "ppself": sub(rec.para.self, id)[t.dataset.i] = t.checked; save(); return;
        case "cite": rec.cite[id] = Number(t.value); rec.checked.cite = false; break;
        case "miss": { const s = new Set(Array.isArray(rec.miss[id]) ? rec.miss[id] : []); if (t.checked) s.add(t.value); else s.delete(t.value); rec.miss[id] = [...s]; rec.checked.cite = false; break; }
        case "apa": rec.apa[id] = Number(t.value); rec.checked.apa = false; break;
        case "asg": rec.port.assignment = t.value; confirmDel = null; break;
        case "pf": { const it = items()[Number(t.dataset.n)]; if (it) { it[id] = t.value; save(); const w = document.getElementById("rs-warn-" + t.dataset.n); if (w) w.innerHTML = warnHtml(it); } return; }
        default: return;
      }
      save(); redraw(t.dataset.k); return;
    }
    if (ev.type !== "click") return;
    let part = null;
    switch (act) {
      case "look": rec.looked[id] = true; break;
      case "srccheck": rec.checked["src-" + id] = true; part = "sources"; break;
      case "evcheck": rec.checked.ev = true; part = "evidence"; break;
      case "intcheck": rec.checked["int-" + id] = true; part = "integrity"; break;
      case "kindcheck": rec.checked.kinds = true; part = "paraphrase"; break;
      case "ppcheck": rec.checked["pp-" + id] = true; part = "paraphrase"; break;
      case "pphide": rec.para.hidden[id] = !rec.para.hidden[id]; break;
      case "citecheck": rec.checked.cite = true; part = "cite"; break;
      case "apacheck": rec.checked.apa = true; part = "apa"; break;
      case "pfadd": items().push({}); confirmDel = null; save(); redraw(); { const n = items().length - 1, f = document.querySelector(`[data-k="pf-${n}-title"]`); if (f) f.focus(); } return;
      case "pfdel": confirmDel = Number(t.dataset.n); redraw(`pfdelno-${t.dataset.n}`); return;
      case "pfdelno": confirmDel = null; redraw(); return;
      case "pfdelyes": items().splice(Number(t.dataset.n), 1); confirmDel = null; save(); redraw("pfadd"); return;
      case "pfcopy": copyText(summaryText()).then(ok => say(ok ? L("Copied. Paste it into your Canvas assignment.", "Copiado. Pégalo en tu tarea de Canvas.") : L("Copy didn't work here.", "No se pudo copiar aquí."))); return;
      case "pfdl": {
        try { const blob = new Blob([summaryText()], { type: "text/plain;charset=utf-8" }), a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `research-${curAsg().id}.txt`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); say(L("Downloaded.", "Descargado.")); } catch (e) { say(L("Download didn't work here. Use Copy instead.", "No se pudo descargar aquí. Usa Copiar.")); }
        return;
      }
      default: return;
    }
    if (part) afterCheck(part); else save();
    redraw(t.dataset.k);
  }
  ["click", "change", "input"].forEach(type => document.addEventListener(type, onEvent));
  SL2.addRoute("research", { view, after: () => { said = ""; } });
})(typeof window !== "undefined" ? window : globalThis);
