/* Speak Up | The Speaking Lab — AI Coaching Studio: "Your Thinking. Your Voice." (Speaking Lab 2.0, slice 7).
   Guiding principle: AI is a coach, not an author. No AI service is connected, no key exists, nothing a student
   types is sent anywhere. Content: data/ai-studio.json (loaded when the studio opens). Permissions:
   data/ai-permissions.json + the lesson's "ai" setting (Lesson Manager), read through SL2.aiNow().
   Routes: #/ai · #/ai/academy · #/ai/ownership · #/ai/think · #/ai/prompts · #/ai/ethics · #/ai/factcheck · #/ai/disclosure
   Progress: speakup-ai-v1 (this browser only, included in "Back up or move my progress"). js/achievements.js reads only
   the dated `mastered` parts (ethics, ownership, factcheck), which this file records after checking answers.
   Copying a prompt, opening a page or filling in a form never counts toward anything. */
(function (root) {
  "use strict";
  const KEY = "speakup-ai-v1";
  const PARTS = ["ethics", "ownership", "factcheck"];
  const isObj = x => !!x && typeof x === "object" && !Array.isArray(x);

  /* ---------- core (tested in tests/aistudio.test.mjs) ---------- */
  function load(get) {
    let r = null;
    try { r = JSON.parse(get(KEY) || "null"); } catch (e) {}
    if (!isObj(r) || r.v !== 1) r = { v: 1 };
    for (const k of ["academy", "own", "eth", "think", "disc", "mastered", "checked"]) if (!isObj(r[k])) r[k] = {};
    if (!isObj(r.fc)) r.fc = {};
    for (const k of ["claims", "src", "real", "looked"]) if (!isObj(r.fc[k])) r.fc[k] = {};
    return r;
  }
  function ownershipResult(C, r) {
    const items = C.ownership.scenarios, right = items.filter(s => r.own[s.id] === s.answer).length;
    return { right, total: items.length, done: right === items.length };
  }
  function ethicsResult(C, r) {
    const per = {}; let right = 0;
    for (const s of C.ethics.scenarios) {
      const a = isObj(r.eth[s.id]) ? r.eth[s.id] : {};
      const cOk = a.c === s.answer, rOk = Number.isInteger(a.r) && !!(s.reasons[a.r] && s.reasons[a.r].ok);
      per[s.id] = { cOk, rOk, ok: cOk && rOk, answered: a.c != null && a.r != null };
      if (cOk && rOk) right++;
    }
    return { per, right, total: C.ethics.scenarios.length, done: right === C.ethics.scenarios.length };
  }
  const sameSet = (a, b) => Array.isArray(a) && a.length === b.length && b.every(x => a.includes(x));
  function factResult(C, r) {
    const F = C.factcheck, claims = {}, sources = {};
    for (const c of F.claims) claims[c.id] = r.fc.claims[c.id] === c.answer;
    for (const s of F.sources) sources[s.id] = { fields: sameSet(r.fc.src[s.id], s.missing), real: r.fc.real[s.id] === (s.fake ? "notfound" : "real") };
    const fin = Number.isInteger(r.fc.final) && !!(F.final.options[r.fc.final] && F.final.options[r.fc.final].ok);
    const okClaims = Object.values(claims).filter(Boolean).length, okSources = Object.values(sources).filter(x => x.fields && x.real).length;
    return { claims, sources, final: fin, okClaims, okSources, done: okClaims === F.claims.length && okSources === F.sources.length && fin };
  }
  function academyResult(C, r) {
    const right = C.academy.topics.filter(t => Number.isInteger(r.academy[t.id]) && t.check.options[r.academy[t.id]] && t.check.options[r.academy[t.id]].ok).length;
    return { right, total: C.academy.topics.length };
  }
  function mastery(C, r) { return { ethics: ethicsResult(C, r).done, ownership: ownershipResult(C, r).done, factcheck: factResult(C, r).done }; }
  /** Record a part the first time it is shown, but only for a part the student has just checked. */
  function record(C, r, today, checkedParts) {
    const m = mastery(C, r), newly = [];
    for (const k of PARTS) if (m[k] && !r.mastered[k] && (!checkedParts || checkedParts.includes(k))) { r.mastered[k] = today; newly.push(k); }
    return newly;
  }
  const rankOf = (levels, id) => { const l = (levels || []).find(x => x.id === id); return l ? l.rank : -1; };
  /** May a prompt that needs `need` be used under the current assignment permission `have`? */
  const allowed = (levels, need, have) => rankOf(levels, have) >= rankOf(levels, need) && rankOf(levels, need) > 0;
  /** A prompt under the current permission p = { level, eld }. ELD-marked prompts are also open when the instructor
      explicitly allowed English language development support (never when AI is not permitted). */
  const allowedPrompt = (levels, it, p) => allowed(levels, it.level, p.level) || (!!it.eld && p.eld === true && rankOf(levels, p.level) >= 1);
  /** Fill a prompt: {level} and the Think Before You Prompt answers; empty answers stay as [brackets]. */
  function fillPrompt(text, vals, isCol, es) {
    const blank = { topic: es ? "[mi tema]" : "[my topic]", ideas: es ? "[mis ideas]" : "[my ideas]", thesis: es ? "[mi tesis]" : "[my thesis]", tried: es ? "[lo que ya intenté]" : "[what I've tried]", need: es ? "[lo que necesito]" : "[what I need]", audience: es ? "[mi público]" : "[my audience]" };
    return String(text).replace(/\{(\w+)\}/g, (m, k) => {
      if (k === "level") return isCol ? (es ? "universidad" : "college") : (es ? "preparatoria" : "high school");
      const v = vals && typeof vals[k] === "string" ? vals[k].trim().slice(0, 600) : "";
      return v || blank[k] || m;
    });
  }
  const core = { KEY, PARTS, load, ownershipResult, ethicsResult, factResult, academyResult, mastery, record, allowed, allowedPrompt, rankOf, fillPrompt };
  root.SLAI = core;

  /* ---------- page ---------- */
  if (!root.SL2 || typeof document === "undefined") return;
  const SL2 = root.SL2, D = root.SL_DATA, { h, L, pick, ICON } = SL2;
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const put = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const es = () => typeof lang !== "undefined" && lang === "es";
  const isCol = () => typeof level !== "undefined" && level === "col";
  const arr = o => (o ? (es() && o.es ? o.es : o.en) : []);
  const alt = o => { if (!SL2.supportsOn() || !o) return ""; const b = SL2.other(o); return b && b !== pick(o) ? `<span class="sl2-alt" lang="${es() ? "en" : "es"}">${h(b)}</span>` : ""; };
  const T = o => `${h(pick(o))}${alt(o)}`;
  const entry = () => D.studios.experiences.find(x => x.id === "ai-coach");

  let C = null, failed = false, busy = false;
  function content() {
    if (C || failed) return C;
    if (!busy) {
      busy = true;
      fetch((entry() || {}).content || "data/ai-studio.json", { cache: "no-cache" }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(j => { C = j; }).catch(() => { failed = true; }).then(() => { busy = false; SL2.refresh(); });
    }
    return null;
  }
  let rec = load(get), prep = {}, query = "", cat = "", copied = "";
  const openT = new Set(); // Academy topics the student has opened (kept open across redraws; not saved)
  document.addEventListener("toggle", e => { const d = e.target; if (d && d.dataset && d.dataset.topic) { if (d.open) openT.add(d.dataset.topic); else openT.delete(d.dataset.topic); } }, true);
  const save = () => put(KEY, JSON.stringify(rec));
  function afterCheck(parts) {
    const newly = record(C, rec, SL2.today(), parts);
    save();
    if (newly.length && window.SLSound) SLSound.cue("complete"); // optional sound (off unless the student turns it on)
    if (newly.length && SL2.achState) { try { SL2.achState(); } catch (e) {} }
  }

  /* ----- permission ----- */
  function perm() {
    if (SL2.teacherOn()) return { level: "expanded", teacher: true };
    const now = SL2.aiNow();
    if (!now) return { level: D.aiperm.default, nogroup: true };
    return now;
  }
  function permBox(p) {
    const lv = SL2.aiLevel(p.level);
    if (p.teacher) return `<div class="sl2-teachnote" role="note">${L("Teacher view: every prompt can be copied so you can preview it. Students see only what their current assignment allows.", "Vista del maestro: puedes copiar todos los prompts para revisarlos. Los estudiantes solo ven lo que permite su tarea actual.")}</div>`;
    return `<section class="sl2-card sl2-ai is-${h(lv.id)}" aria-labelledby="ai-perm-h"><p class="sl2-kicker" id="ai-perm-h">${L("Your current assignment's AI permission", "Permiso de IA de tu tarea actual")}${p.day ? ` · ${h(SL2.fmtShort(p.day))}` : ""}</p>
      <p class="sl2-ai-level"><b>${h(pick(lv.name))}</b></p><p>${h(pick(lv.explain))}</p>
      ${p.eld && D.aiperm.eld ? `<p class="sl2-ai-note"><b>${h(pick(D.aiperm.eld.name))}.</b> ${h(pick(D.aiperm.eld.explain))}</p>` : ""}
      ${p.note ? `<p class="sl2-ai-note"><b>${L("Mr. Bennett's note:", "Nota del Sr. Bennett:")}</b> ${h(pick(p.note))}</p>` : ""}
      ${p.nogroup ? `<p class="sl2-small">${L("Choose your class group on the dashboard to see your class's setting. Until then the class default applies.", "Elige tu grupo de clase en el panel para ver la regla de tu clase. Mientras tanto se aplica la regla general.")}</p>` : ""}
      <p class="sl2-small">${L("A prompt being in this studio does not mean you may use it. When in doubt, ask Mr. Bennett first.", "Que un prompt esté en este estudio no significa que puedas usarlo. Si tienes dudas, pregunta primero al Sr. Bennett.")}</p></section>`;
  }

  /* ----- layout ----- */
  const PAGES = [
    ["", { en: "Studio home", es: "Inicio" }],
    ["academy", { en: "AI Literacy Academy", es: "Academia de alfabetización en IA" }],
    ["ownership", { en: "Cognitive Ownership", es: "Control del pensamiento" }],
    ["think", { en: "Think first: Speech Coach", es: "Piensa primero: entrenador" }],
    ["prompts", { en: "Prompt Library", es: "Biblioteca de prompts" }],
    ["ethics", { en: "AI Ethics Lab", es: "Laboratorio de ética de IA" }],
    ["factcheck", { en: "AI Fact Checker", es: "Verificador de IA" }],
    ["disclosure", { en: "AI-use disclosure", es: "Declaración de uso de IA" }],
  ];
  const wrap = (cur, inner) => `<div class="wrap sl2 ai" id="sl2-main" data-notr>
    <p class="sl2-back sl2-noprint">${cur ? `<a href="#/ai">← ${L("AI Coaching Studio", "Estudio de coaching con IA")}</a>` : backToUnit()}</p>
    <p class="sl2-kicker">${h(pick(C.title))} · ${h(pick(C.principle))}</p>
    ${cur ? `<nav class="ai-nav sl2-noprint" aria-label="${L("Studio sections", "Secciones del estudio")}"><ul>${PAGES.slice(1).map(([id, n]) => `<li><a href="#/ai/${id}"${id === cur ? ' aria-current="page"' : ""}>${h(pick(n))}</a></li>`).join("")}</ul></nav>` : ""}
    ${es() && C.status.es !== "approved" ? `<p class="btp-draft">Traducción en borrador: el Sr. Bennett todavía la está revisando.</p>` : ""}
    ${inner}</div>`;
  const backToUnit = () => { const u = SL2.currentUnitId && SL2.currentUnitId(); return u && SL2.unitOpen(u) ? `<a href="#/unit/${u}/labs">← ${L(`Unit ${u}: labs and studios`, `Unidad ${u}: laboratorios y estudios`)}</a> · <a href="#/">${L("My course", "Mi curso")}</a>` : `<a href="#/">← ${L("My course", "Mi curso")}</a>`; };
  const statusLine = (txt, ok) => `<p class="btp-status" role="status">${ok ? `${ICON.check} ` : ""}${txt}</p>`;
  const privacy = () => `<p class="sl2-small">${L("Saved only in this browser on this computer; never sent anywhere. Don't include personal details about yourself or others.", "Se guarda solo en este navegador y en esta computadora; nunca se envía. No incluyas datos personales tuyos ni de otras personas.")}</p>`;

  function viewHome() {
    const m = mastery(C, rec), b = D.achievements.badges.find(x => x.id === "independent-thinker"), ac = academyResult(C, rec);
    const tiles = [
      ["academy", { en: "How AI works and fails: hallucinations, fake citations, bias, privacy, integrity, disclosure.", es: "Cómo funciona y falla la IA: alucinaciones, citas falsas, sesgo, privacidad, integridad, declaración." }, `${ac.right} / ${ac.total}`],
      ["ownership", { en: "Think, Consult, Evaluate, Revise, Own. Did they keep their thinking or give it away?", es: "Piensa, Consulta, Evalúa, Revisa, Hazlo tuyo. ¿Conservaron su pensamiento o lo entregaron?" }, m.ownership ? "✓" : ""],
      ["think", { en: "Questions to answer yourself before any AI: topic, thesis, research, organization, rehearsal.", es: "Preguntas para responder tú mismo antes de usar IA: tema, tesis, investigación, organización, ensayo." }, ""],
      ["prompts", { en: "Searchable coaching prompts that question and explain, never write. Copy only when allowed.", es: "Prompts de coaching que preguntan y explican, nunca escriben. Cópialos solo cuando esté permitido." }, ""],
      ["ethics", { en: "Appropriate, not appropriate, or needs permission? Decide and explain.", es: "¿Apropiado, no apropiado o necesita permiso? Decide y explica." }, m.ethics ? "✓" : ""],
      ["factcheck", { en: "Investigate a simulated AI answer full of shaky claims and fake sources.", es: "Investiga una respuesta de IA simulada llena de afirmaciones dudosas y fuentes falsas." }, m.factcheck ? "✓" : ""],
      ["disclosure", { en: "Printable AI-use disclosure for your assignments.", es: "Declaración de uso de IA para imprimir y entregar con tus tareas." }, ""],
    ];
    return wrap("", `<h1 class="sl2-h1">${h(pick(C.tagline))}</h1>
      <p class="sl2-lead">${h(pick(C.promise))}</p>
      ${permBox(perm())}
      <ol class="ai-steps" aria-label="${L("Cognitive ownership: five steps", "Control del pensamiento: cinco pasos")}">${C.ownership.stages.map((s, i) => `<li><span class="btp-num">${i + 1}</span> <b>${h(pick(s.name))}</b> <span>${h(pick(s.what))}</span></li>`).join("")}</ol>
      <ul class="sl2-tiles ai-tiles">${tiles.map(([id, d, tag]) => `<li><a class="sl2-tile" href="#/ai/${id}"><b>${h(pick(PAGES.find(p => p[0] === id)[1]))}</b><span>${h(pick(d))}</span>${tag ? `<span class="sl2-pill">${h(tag)}</span>` : ""}</a></li>`).join("")}</ul>
      ${b ? `<section class="sl2-card"><h2 class="sl2-h2">${h(pick(b.title))}</h2><p>${h(pick(b.about))}</p><ul class="sl2-crit">${b.criteria.map(c => `<li class="${m[c.part] ? "is-done" : ""}">${m[c.part] ? ICON.check : ICON.open} <span>${h(pick(c.label))}${m[c.part] ? ` <span class="sr">${L("(done)", "(hecho)")}</span>` : ""}</span></li>`).join("")}</ul><p class="sl2-small">${L("Copying prompts or opening pages never earns it.", "Copiar prompts o abrir páginas nunca la otorga.")}</p></section>` : ""}
      <p class="btp-missing">${h(pick(C.noLiveAi))}</p>`);
  }

  function viewAcademy() {
    const r = academyResult(C, rec);
    return wrap("academy", `<h1 class="sl2-h1">${L("AI Literacy Academy", "Academia de alfabetización en IA")}</h1><p class="sl2-lead">${h(pick(C.academy.intro))}</p>
      <p class="btp-meter" role="status">${L(`${r.right} of ${r.total} checks correct`, `${r.right} de ${r.total} preguntas correctas`)}</p>
      <div id="aiBody">${C.academy.topics.map((t, n) => {
        const a = rec.academy[t.id], shown = rec.checked["ac-" + t.id], ok = Number.isInteger(a) && t.check.options[a] && t.check.options[a].ok, col = isCol() && C.academy.college[t.id];
        return `<details class="sl2-card ai-topic"${openT.has(t.id) || (!openT.size && n === 0) ? " open" : ""} id="ai-t-${t.id}" data-topic="${t.id}"><summary><h2 class="sl2-h3">${n + 1}. ${h(pick(t.title))}${ok ? ` ${ICON.check}<span class="sr"> ${L("(correct)", "(correcto)")}</span>` : ""}</h2></summary>
          <p>${T(t.explain)}</p><ul>${arr(t.points).map(p => `<li>${h(p)}</li>`).join("")}</ul>
          ${col ? `<p class="ai-college"><b>${L("College", "Universidad")}</b> ${h(pick(col))}</p>` : ""}
          <fieldset class="btp-item${shown ? (ok ? " is-ok" : " is-bad") : ""}"><legend>${T(t.check.q)}</legend><div class="btp-opts btp-col">${t.check.options.map((o, i) => `<label><input type="radio" name="ac-${t.id}" data-ai="ac" data-id="${t.id}" value="${i}" data-k="ac-${t.id}-${i}"${a === i ? " checked" : ""}> ${h(pick(o.t))}</label>`).join("")}</div>
            <p><button type="button" class="btn" data-ai="accheck" data-id="${t.id}" data-k="accheck-${t.id}">${L("Check", "Revisar")}</button></p>
            <p class="btp-fb" role="status">${shown && a != null ? `${ok ? `${ICON.check} <b>${L("Right.", "Correcto.")}</b>` : `<b>${L("Not quite. Try again.", "Todavía no. Inténtalo otra vez.")}</b>`} ${ok ? T(t.check.why) : ""}` : ""}</p></fieldset></details>`; }).join("")}</div>`);
  }

  function viewOwnership() {
    const O = C.ownership, r = ownershipResult(C, rec), checked = !!rec.checked.own;
    return wrap("ownership", `<h1 class="sl2-h1">${L("Cognitive Ownership", "Control del pensamiento")}</h1><p class="sl2-lead">${h(pick(O.intro))}</p>
      <ol class="ai-stages">${O.stages.map((s, i) => `<li class="sl2-card"><p class="sl2-kicker">${L("Step", "Paso")} ${i + 1}</p><h2 class="sl2-h3">${h(pick(s.name))}</h2><p>${T(s.what)}</p><p class="ai-ask"><b>${L("Ask yourself:", "Pregúntate:")}</b> ${h(pick(s.ask))}</p></li>`).join("")}</ol>
      <h2 class="sl2-h2">${L("Kept it or gave it away?", "¿Lo conservó o lo entregó?")}</h2><p>${T(O.check)}</p>
      <div id="aiBody"><form onsubmit="return false">${O.scenarios.map(s => {
        const a = rec.own[s.id], ok = checked && a === s.answer, bad = checked && a != null && a !== s.answer, st = O.stages.find(x => x.id === s.stage);
        return `<fieldset class="btp-item${ok ? " is-ok" : bad ? " is-bad" : ""}"><legend><span class="sl2-pill">${h(pick(st.name))}</span> ${T(s.text)}</legend><div class="btp-opts">
          <label><input type="radio" name="own-${s.id}" data-ai="own" data-id="${s.id}" value="kept" data-k="own-${s.id}-kept"${a === "kept" ? " checked" : ""}> ${L("Kept ownership", "Conservó el control")}</label>
          <label><input type="radio" name="own-${s.id}" data-ai="own" data-id="${s.id}" value="gave" data-k="own-${s.id}-gave"${a === "gave" ? " checked" : ""}> ${L("Gave it away", "Lo entregó")}</label></div>
          ${checked && a != null ? `<p class="btp-fb">${ok ? `${ICON.check} <b>${L("Right.", "Correcto.")}</b>` : `<b>${L("Look again.", "Mira otra vez.")}</b>`} ${T(s.why)}</p>` : ""}</fieldset>`; }).join("")}
        <p><button type="button" class="btn primary" data-ai="owncheck" data-k="owncheck">${L("Check my answers", "Revisar mis respuestas")}</button></p>
        ${checked ? statusLine(r.done ? L("All correct.", "Todo correcto.") : L(`${r.right} of ${r.total} correct. Change any answer and check again.`, `${r.right} de ${r.total} correctas. Cambia cualquier respuesta y revisa otra vez.`), r.done) : ""}</form></div>`);
  }

  function viewThink(args) {
    const stages = C.coach.stages, sid = stages.some(s => s.id === args[1]) ? args[1] : stages[0].id, st = stages.find(s => s.id === sid);
    const ans = isObj(rec.think[sid]) ? rec.think[sid] : {};
    return wrap("think", `<h1 class="sl2-h1">${L("Think first: Speech Coach", "Piensa primero: entrenador de discursos")}</h1><p class="sl2-lead">${h(pick(C.coach.intro))}</p>
      <nav class="ai-pills" aria-label="${L("Where are you in your speech?", "¿En qué parte de tu discurso estás?")}"><ul>${stages.map(s => `<li><a href="#/ai/think/${s.id}"${s.id === sid ? ' aria-current="step"' : ""}>${h(pick(s.label))}</a></li>`).join("")}</ul></nav>
      <section class="sl2-card"><h2 class="sl2-h2">${h(pick(st.label))}</h2>
        ${arr(st.questions).map((q, i) => `<label class="btp-note"><span>${i + 1}. ${h(q)}</span><textarea rows="3" data-ai="think" data-id="${sid}" data-i="${i}" data-k="think-${sid}-${i}">${h(ans[i] || "")}</textarea></label>`).join("")}
        <p class="btp-row"><button type="button" class="btn" data-ai="copythink" data-id="${sid}">${L("Copy my answers", "Copiar mis respuestas")}</button> <span role="status" class="sl2-small" id="aiCopied">${h(copied)}</span></p>
        ${privacy()}</section>
      <p>${L("Next step, if your assignment allows it:", "Siguiente paso, si tu tarea lo permite:")} <a href="#/ai/prompts">${L("Prompt Library", "Biblioteca de prompts")}</a></p>`);
  }

  function promptList() {
    const P = C.prompts, p = perm(), lv = D.aiperm.levels, q = query.trim().toLowerCase();
    const items = P.items.filter(it => (!cat || it.cat === cat) && (!q || [pick(it.title), pick(it.when), pick(it.text), pick(P.categories.find(c => c.id === it.cat).name)].join(" ").toLowerCase().includes(q)));
    if (!items.length) return `<p role="status">${L("No prompts match. Try another word or category.", "Ningún prompt coincide. Prueba otra palabra o categoría.")}</p>`;
    return `<p class="sl2-small" role="status">${L(`${items.length} prompts`, `${items.length} prompts`)}</p><ul class="ai-prompts">${items.map(it => {
      const ok = p.teacher || allowedPrompt(lv, it, p), need = SL2.aiLevel(it.level), text = fillPrompt(pick(it.text), prep, isCol(), es());
      return `<li class="sl2-card ai-prompt" id="ai-p-${it.id}"><p class="sl2-kicker">${h(pick(P.categories.find(c => c.id === it.cat).name))} · <span class="sl2-pill">${L("Needs:", "Requiere:")} ${h(pick(need.short))}${it.eld ? ` ${L("or ELD support", "o apoyo de inglés")}` : ""}</span></p>
        <h2 class="sl2-h3">${h(pick(it.title))}</h2><p><b>${L("When to use it:", "Cuándo usarlo:")}</b> ${T(it.when)}</p>
        <pre class="ai-text" id="ai-tx-${it.id}">${h(text)}</pre>
        ${ok ? `<p class="btp-row"><button type="button" class="btn primary" data-ai="copy" data-id="${it.id}" data-k="copy-${it.id}">${L("Copy prompt", "Copiar prompt")}<span class="sr"> ${h(pick(it.title))}</span></button>${p.teacher ? "" : ` <span class="sl2-small">${L("Allowed on your current assignment.", "Permitido en tu tarea actual.")}</span>`}</p>`
          : `<p class="ai-blocked">${ICON.lock} ${L(`Not allowed on your current assignment (${pick(SL2.aiLevel(p.level).short)}). Read it to learn how coaching prompts work, and ask Mr. Bennett if you think you need it.`, `No está permitido en tu tarea actual (${pick(SL2.aiLevel(p.level).short)}). Léelo para aprender cómo funcionan los prompts de coaching y pregunta al Sr. Bennett si crees que lo necesitas.`)}</p>`}</li>`; }).join("")}</ul>`;
  }
  function viewPrompts() {
    const P = C.prompts;
    return wrap("prompts", `<h1 class="sl2-h1">${L("Speech Coaching Prompt Library", "Biblioteca de prompts de coaching")}</h1><p class="sl2-lead">${h(pick(P.intro))}</p>
      ${permBox(perm())}
      <details class="sl2-card ai-prep"${Object.values(prep).some(Boolean) ? " open" : ""}><summary><h2 class="sl2-h3">${L("Think before you prompt (optional)", "Piensa antes de escribir el prompt (opcional)")}</h2></summary>
        <p class="sl2-small">${h(pick(P.prepNote))}</p>
        ${Object.entries(P.prep).map(([k, lab]) => `<label class="btp-note"><span>${h(pick(lab))}</span><textarea rows="2" data-ai="prep" data-id="${k}" data-k="prep-${k}" autocomplete="off">${h(prep[k] || "")}</textarea></label>`).join("")}</details>
      <div class="ai-filter sl2-noprint"><label>${L("Search", "Buscar")} <input type="search" data-ai="q" data-k="q" value="${h(query)}" placeholder="${L("e.g. outline, thesis, nervous", "p. ej., esquema, tesis, nervios")}"></label>
        <label>${L("Category", "Categoría")} <select data-ai="cat" data-k="cat"><option value="">${L("All categories", "Todas las categorías")}</option>${P.categories.map(c => `<option value="${c.id}"${cat === c.id ? " selected" : ""}>${h(pick(c.name))}</option>`).join("")}</select></label></div>
      <p role="status" class="sl2-small" id="aiCopied">${h(copied)}</p>
      <div id="aiList">${promptList()}</div>
      <p class="btp-missing">${h(pick(C.noLiveAi))}</p>`);
  }

  function viewEthics() {
    const E = C.ethics, r = ethicsResult(C, rec), list = E.scenarios.concat(isCol() ? E.college : []);
    return wrap("ethics", `<h1 class="sl2-h1">${L("AI Ethics Lab", "Laboratorio de ética de IA")}</h1><p class="sl2-lead">${h(pick(E.intro))}</p>
      <p class="btp-meter" role="status">${L(`${r.right} of ${r.total} situations correct`, `${r.right} de ${r.total} situaciones correctas`)}</p>
      <div id="aiBody" class="btp-cases">${list.map(s => {
        const a = isObj(rec.eth[s.id]) ? rec.eth[s.id] : {}, shown = rec.checked["eth-" + s.id];
        const cOk = a.c === s.answer, rOk = Number.isInteger(a.r) && s.reasons[a.r] && s.reasons[a.r].ok, ok = cOk && rOk;
        const fb = !shown ? "" : a.c == null || a.r == null ? L("Choose a classification and a reason.", "Elige una clasificación y una razón.")
          : ok ? `${ICON.check} <b>${L("Right.", "Correcto.")}</b> ${T(s.why)}`
          : !cOk ? `<b>${L("Look again at the classification.", "Revisa otra vez la clasificación.")}</b> ${L("Think about who does the thinking, and what the assignment allows.", "Piensa en quién hace el pensamiento y en lo que permite la tarea.")}`
          : `<b>${L("The classification is right; choose a better reason.", "La clasificación es correcta; elige una mejor razón.")}</b>`;
        return `<fieldset class="btp-case${shown ? (ok ? " is-ok" : " is-bad") : ""}"><legend>${s.id.startsWith("c") ? `<span class="sl2-pill">${L("College", "Universidad")}</span> ` : ""}${T(s.text)}</legend>
          <div class="btp-opts">${Object.entries(E.choices).map(([v, lab]) => `<label><input type="radio" name="eth-${s.id}" data-ai="ethc" data-id="${s.id}" value="${v}" data-k="ethc-${s.id}-${v}"${a.c === v ? " checked" : ""}> ${h(pick(lab))}</label>`).join("")}</div>
          <p class="sl2-small"><b>${L("Why?", "¿Por qué?")}</b></p><div class="btp-opts btp-col">${s.reasons.map((o, i) => `<label><input type="radio" name="ethr-${s.id}" data-ai="ethr" data-id="${s.id}" value="${i}" data-k="ethr-${s.id}-${i}"${a.r === i ? " checked" : ""}> ${h(pick(o.t))}</label>`).join("")}</div>
          <p><button type="button" class="btn" data-ai="ethcheck" data-id="${s.id}" data-k="ethcheck-${s.id}">${L("Check", "Revisar")}</button></p>
          <p class="btp-fb" role="status">${fb}</p></fieldset>`; }).join("")}</div>
      <p class="sl2-small">${L("Sentence starter:", "Inicio de oración:")} ${h(arr(C.frames)[3])}</p>`);
  }

  function viewFact() {
    const F = C.factcheck, r = factResult(C, rec), checked = !!rec.checked.fc;
    return wrap("factcheck", `<h1 class="sl2-h1">${L("AI Fact Checker", "Verificador de IA")}</h1>
      <p class="ai-sim" role="note"><b>${h(pick(F.label))}</b></p>
      <p class="sl2-lead">${h(pick(F.question))}</p>
      <div id="aiBody"><form onsubmit="return false">
      <h2 class="sl2-h2">${L("1. The AI's answer: judge each claim", "1. La respuesta de la IA: juzga cada afirmación")}</h2>
      <div class="ai-answer"><p class="sl2-kicker">${L("Simulated AI answer", "Respuesta de IA simulada")}</p>${F.claims.map((c, i) => {
        const a = rec.fc.claims[c.id], ok = checked && a === c.answer, bad = checked && a != null && !ok;
        return `<fieldset class="btp-item${ok ? " is-ok" : bad ? " is-bad" : ""}"><legend>“${T(c.text)}”</legend><div class="btp-opts btp-col">${Object.entries(F.verdicts).map(([v, lab]) => `<label><input type="radio" name="fc-${c.id}" data-ai="fcc" data-id="${c.id}" value="${v}" data-k="fcc-${c.id}-${v}"${a === v ? " checked" : ""}> ${h(pick(lab))}</label>`).join("")}</div>
          ${checked && a != null ? `<p class="btp-fb">${ok ? `${ICON.check} <b>${L("Right.", "Correcto.")}</b> ${T(c.why)}` : `<b>${L("Look again.", "Mira otra vez.")}</b> ${i < 2 ? "" : L("Check the source lookups below.", "Revisa las búsquedas de fuentes abajo.")}`}</p>` : ""}</fieldset>`; }).join("")}</div>
      <h2 class="sl2-h2">${L("2. The AI's sources: look them up", "2. Las fuentes de la IA: búscalas")}</h2>
      <p>${L("For each reference, mark what publication information is missing, look it up, and decide whether it can be found.", "Para cada referencia, marca qué información de publicación falta, búscala y decide si se puede encontrar.")}</p>
      ${F.sources.map(s => {
        const sel = Array.isArray(rec.fc.src[s.id]) ? rec.fc.src[s.id] : [], res = r.sources[s.id], ok = checked && res.fields && res.real, looked = rec.fc.looked[s.id];
        return `<fieldset class="btp-case${checked ? (ok ? " is-ok" : " is-bad") : ""}"><legend><code>${h(s.text)}</code></legend>
          <p class="sl2-small"><b>${L("Missing information:", "Información que falta:")}</b></p><div class="btp-opts">${Object.entries(F.fields).map(([f, lab]) => `<label><input type="checkbox" data-ai="fcs" data-id="${s.id}" value="${f}" data-k="fcs-${s.id}-${f}"${sel.includes(f) ? " checked" : ""}> ${h(pick(lab))}</label>`).join("")}</div>
          <p><button type="button" class="btn" data-ai="lookup" data-id="${s.id}" data-k="lookup-${s.id}" aria-expanded="${!!looked}">${L("Look it up (simulated)", "Buscarla (simulado)")}</button></p>
          ${looked ? `<p class="ai-lookup">${T(s.lookup)}</p>` : ""}
          <div class="btp-opts"><label><input type="radio" name="fcr-${s.id}" data-ai="fcr" data-id="${s.id}" value="real" data-k="fcr-${s.id}-real"${rec.fc.real[s.id] === "real" ? " checked" : ""}> ${L("A real source I can find", "Una fuente real que puedo encontrar")}</label>
            <label><input type="radio" name="fcr-${s.id}" data-ai="fcr" data-id="${s.id}" value="notfound" data-k="fcr-${s.id}-notfound"${rec.fc.real[s.id] === "notfound" ? " checked" : ""}> ${L("Can't be found: don't use it", "No se encuentra: no la uses")}</label></div>
          ${checked ? `<p class="btp-fb">${ok ? `${ICON.check} <b>${L("Right.", "Correcto.")}</b>` : `<b>${L("Look again.", "Mira otra vez.")}</b> ${!res.fields ? L("Compare the reference with the five parts of a complete citation.", "Compara la referencia con las cinco partes de una cita completa.") : ""} ${!res.real ? L("Use the lookup.", "Usa la búsqueda.") : ""}`}</p>` : ""}</fieldset>`; }).join("")}
      <h2 class="sl2-h2">${L("3. Your decision", "3. Tu decisión")}</h2>
      <fieldset class="btp-item${checked ? (r.final ? " is-ok" : " is-bad") : ""}"><legend>${T(F.final.q)}</legend><div class="btp-opts btp-col">${F.final.options.map((o, i) => `<label><input type="radio" name="fc-final" data-ai="fcf" value="${i}" data-k="fcf-${i}"${rec.fc.final === i ? " checked" : ""}> ${h(pick(o.t))}</label>`).join("")}</div>
        ${checked && rec.fc.final != null ? `<p class="btp-fb">${r.final ? `${ICON.check} <b>${L("Right.", "Correcto.")}</b> ${T(F.final.why)}` : `<b>${L("Look again.", "Mira otra vez.")}</b>`}</p>` : ""}</fieldset>
      <p><button type="button" class="btn primary" data-ai="fccheck" data-k="fccheck">${L("Check my investigation", "Revisar mi investigación")}</button></p>
      ${checked ? statusLine(r.done ? L("Investigation complete. Every claim, source and the decision are right.", "Investigación completa. Cada afirmación, fuente y la decisión son correctas.") : L(`Claims: ${r.okClaims} of ${F.claims.length} · Sources: ${r.okSources} of ${F.sources.length} · Decision: ${r.final ? "right" : "not yet"}. Change anything and check again.`, `Afirmaciones: ${r.okClaims} de ${F.claims.length} · Fuentes: ${r.okSources} de ${F.sources.length} · Decisión: ${r.final ? "correcta" : "todavía no"}. Cambia lo que quieras y revisa otra vez.`), r.done) : ""}
      </form></div>
      <p class="sl2-small">${h(pick(F.research))} <a href="#/research/sources">${L("Open the Research & Academic Integrity Studio", "Abrir el Estudio de investigación e integridad académica")}</a> · <a href="#/unit/2/labs">${L("Research & Source Lab", "Laboratorio de investigación y fuentes")}</a></p>`);
  }

  function viewDisclosure() {
    const X = C.disclosure, p = perm(), lv = SL2.aiLevel(p.level);
    return wrap("disclosure", `<h1 class="sl2-h1">${L("AI-use disclosure", "Declaración de uso de IA")}</h1><p class="sl2-lead sl2-noprint">${h(pick(X.intro))}</p>
      <p class="btp-fill">${L("Name", "Nombre")}: ______________________ &nbsp; ${L("Class period", "Hora de clase")}: ______ &nbsp; ${h(SL2.fmtLong(SL2.today()))}</p>
      <div id="aiBody" class="ai-disc">${X.fields.map(f => `<label class="btp-note"><span>${T(f.label)}</span><textarea rows="${f.id === "assignment" || f.id === "tool" || f.id === "permission" ? 1 : 3}" data-ai="disc" data-id="${f.id}" data-k="disc-${f.id}"${f.id === "permission" && !rec.disc.permission && !p.teacher ? ` placeholder="${h(pick(lv.name))}"` : ""}>${h(rec.disc[f.id] || "")}</textarea></label>`).join("")}
        <p class="ai-sign">☐ ${T(X.sign)} &nbsp; ${L("Signature", "Firma")}: ______________________</p></div>
      <p class="btp-row sl2-noprint"><button type="button" class="btn primary" data-sl2-print>${L("Print", "Imprimir")}</button> <button type="button" class="btn" data-ai="copydisc">${L("Copy as text (for Canvas)", "Copiar como texto (para Canvas)")}</button> <button type="button" class="btn" data-ai="cleardisc">${L("Clear the form", "Borrar el formulario")}</button> <span role="status" class="sl2-small" id="aiCopied">${h(copied)}</span></p>
      <p class="sl2-ai-note"><b>${h(pick(X.citeNote))}</b></p>
      <p class="sl2-small">${h(pick(X.student))}</p>${privacy()}
      ${SL2.teacherOn() ? `<p class="sl2-teachnote" role="note">${h(pick(X.teacher))}</p>` : ""}`);
  }

  function view(route) {
    if (!content()) return `<div class="wrap sl2" id="sl2-main" data-notr><h1 class="sl2-h1">${L("AI Coaching Studio", "Estudio de coaching con IA")}</h1><p role="${failed ? "alert" : "status"}">${failed ? L("The studio could not load. Check the internet connection and reload the page.", "El estudio no pudo cargar. Revisa la conexión a internet y vuelve a cargar la página.") : L("Loading…", "Cargando…")}</p></div>`;
    rec = load(get);
    const a = route.args || [];
    switch (a[0]) {
      case "academy": return viewAcademy();
      case "ownership": return viewOwnership();
      case "think": return viewThink(a);
      case "prompts": return viewPrompts();
      case "ethics": return viewEthics();
      case "factcheck": return viewFact();
      case "disclosure": return viewDisclosure();
      default: return viewHome();
    }
  }

  /* ----- interaction ----- */
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      try { const t = document.createElement("textarea"); t.value = text; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0"; document.body.appendChild(t); t.select(); const ok = document.execCommand("copy"); t.remove(); return ok; } catch (e2) { return false; }
    }
  }
  function say(msg) { copied = msg; const el = document.getElementById("aiCopied"); if (el) el.textContent = msg; }
  function redraw(focusKey) {
    const y = window.scrollY;
    SL2.refresh();
    window.scrollTo(0, y);
    const f = focusKey && document.querySelector(`#sl2-main [data-k="${focusKey}"]`);
    if (f) f.focus({ preventScroll: true });
  }
  function onEvent(ev) {
    const t = ev.target.closest && ev.target.closest("[data-ai]"); if (!t || !C) return;
    const r = SL2.route(); if (!r || r.name !== "ai") return;
    const act = t.dataset.ai, id = t.dataset.id;
    if (ev.type === "input") {
      if (act === "think") { if (!isObj(rec.think[id])) rec.think[id] = {}; rec.think[id][t.dataset.i] = t.value.slice(0, 4000); save(); }
      else if (act === "disc") { rec.disc[id] = t.value.slice(0, 4000); save(); }
      else if (act === "prep") { prep[id] = t.value; const list = document.getElementById("aiList"); if (list) list.innerHTML = promptList(); } // not saved
      else if (act === "q") { query = t.value; const list = document.getElementById("aiList"); if (list) list.innerHTML = promptList(); }
      return;
    }
    if (ev.type === "change") {
      if (act === "cat") { cat = t.value; const list = document.getElementById("aiList"); if (list) list.innerHTML = promptList(); return; }
      if (act === "ac") { rec.academy[id] = Number(t.value); rec.checked["ac-" + id] = false; }
      else if (act === "own") { rec.own[id] = t.value; rec.checked.own = false; }
      else if (act === "ethc" || act === "ethr") { const a = isObj(rec.eth[id]) ? rec.eth[id] : (rec.eth[id] = {}); if (act === "ethc") a.c = t.value; else a.r = Number(t.value); rec.checked["eth-" + id] = false; }
      else if (act === "fcc") { rec.fc.claims[id] = t.value; rec.checked.fc = false; }
      else if (act === "fcs") { const set = new Set(Array.isArray(rec.fc.src[id]) ? rec.fc.src[id] : []); if (t.checked) set.add(t.value); else set.delete(t.value); rec.fc.src[id] = [...set]; rec.checked.fc = false; }
      else if (act === "fcr") { rec.fc.real[id] = t.value; rec.checked.fc = false; }
      else if (act === "fcf") { rec.fc.final = Number(t.value); rec.checked.fc = false; }
      else return;
      save(); redraw(t.dataset.k); return;
    }
    if (ev.type !== "click") return;
    switch (act) {
      case "accheck": rec.checked["ac-" + id] = true; save(); redraw(t.dataset.k); return;
      case "owncheck": rec.checked.own = true; afterCheck(["ownership"]); redraw(t.dataset.k); return;
      case "ethcheck": rec.checked["eth-" + id] = true; afterCheck(["ethics"]); redraw(t.dataset.k); return;
      case "fccheck": rec.checked.fc = true; afterCheck(["factcheck"]); redraw(t.dataset.k); return;
      case "lookup": rec.fc.looked[id] = true; save(); redraw(t.dataset.k); return;
      case "copy": {
        const it = C.prompts.items.find(x => x.id === id), p = perm();
        if (!it || !(p.teacher || allowedPrompt(D.aiperm.levels, it, p))) return; // never copies a prompt the assignment doesn't allow
        copyText(fillPrompt(pick(it.text), prep, isCol(), es())).then(ok => say(ok ? L(`Copied: ${pick(it.title)}. Paste it into a district-approved AI tool, then evaluate what it says.`, `Copiado: ${pick(it.title)}. Pégalo en una herramienta de IA aprobada por el distrito y luego evalúa lo que dice.`) : L("Copy didn't work here. Select the prompt text and copy it.", "No se pudo copiar aquí. Selecciona el texto del prompt y cópialo.")));
        return;
      }
      case "copythink": {
        const st = C.coach.stages.find(s => s.id === id), ans = isObj(rec.think[id]) ? rec.think[id] : {};
        copyText(arr(st.questions).map((q, i) => `${q}\n${ans[i] || ""}`).join("\n\n")).then(ok => say(ok ? L("Copied your answers.", "Respuestas copiadas.") : L("Copy didn't work here.", "No se pudo copiar aquí.")));
        return;
      }
      case "copydisc": copyText(C.disclosure.fields.map(f => `${pick(f.label)}: ${rec.disc[f.id] || ""}`).join("\n")).then(ok => say(ok ? L("Copied.", "Copiado.") : L("Copy didn't work here.", "No se pudo copiar aquí."))); return;
      case "cleardisc": rec.disc = {}; save(); redraw(); say(L("Form cleared.", "Formulario borrado.")); return;
      default: return;
    }
  }
  ["click", "change", "input"].forEach(type => document.addEventListener(type, onEvent));
  SL2.addRoute("ai", { view, after: () => { copied = ""; } });
})(typeof window !== "undefined" ? window : globalThis);
