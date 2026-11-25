/* Speak Up | The Speaking Lab — Beyond the Podium: Communication in Real Life (Speaking Lab 2.0, slice 6).
   One engine for every episode. An episode is a data file (site/data/btp/episode-N.json, listed in
   data/studios.json with "episode" and "route") plus its media in site/media/btp/epN/. Adding an episode =
   a new data file and a studios entry; nothing here changes.
   Routes: #/btp (series) · #/btp/N (episode overview) · #/btp/N/<stage id> · #/btp/N/summary (printable).
   Progress: speakup-btp-v1 = { v: 1, eps: { ep1: { …answers, mastered: { detective, change, apply } } } }, this
   browser only (included in "Back up or move my progress"). js/achievements.js reads only `mastered`, which this
   file sets after checking the student's answers against the episode data. It is a motivational learning record,
   not a secure or official grade.
   Media that has not been supplied is never faked: the lab shows the transcript, and teacher view lists what is
   missing. The film never autoplays. */
(function (root) {
  "use strict";
  const KEY = "speakup-btp-v1";
  const PARTS = ["detective", "change", "apply"];
  const isObj = x => !!x && typeof x === "object" && !Array.isArray(x);

  /* ---------- core (no page needed; tested in tests/btp.test.mjs) ---------- */
  function load(get) {
    try { const r = JSON.parse(get(KEY) || "null"); if (r && r.v === 1 && isObj(r.eps)) return r; } catch (e) {}
    return { v: 1, eps: {} };
  }
  /** The episode's part of the record, repaired to the expected shape (bad data is reset, never fatal). */
  function epRec(rec, id) {
    if (!isObj(rec.eps[id])) rec.eps[id] = {};
    const e = rec.eps[id];
    for (const k of ["obs", "ev", "expl", "words", "persp", "notes", "scenes", "best", "tries", "mastered", "checked"]) if (!isObj(e[k])) e[k] = {};
    if (!isObj(e.apply)) e.apply = {};
    if (!isObj(e.apply.ans)) e.apply.ans = {};
    if (typeof e.apply.best !== "number") e.apply.best = null;
    if (typeof e.apply.tries !== "number") e.apply.tries = 0;
    return e;
  }
  const stageOf = (ep, id) => ep.stages.find(s => s.id === id);
  const speakerLines = ep => ep.transcript.filter(l => /^l\d+$/.test(l.id));

  /** Evidence for one barrier. Correct = at least one line chosen and every chosen line shows the barrier;
      for a barrier the words do not show, the only correct choice is "none". */
  function checkEvidence(b, picks) {
    picks = Array.isArray(picks) ? picks.filter(p => typeof p === "string") : [];
    if (!picks.length) return { ok: false, reason: "empty", wrong: [] };
    const none = b.evidence.includes("none");
    if (picks.includes("none") && picks.length > 1) return { ok: false, reason: "mixed", wrong: [] };
    if (none) return picks[0] === "none" ? { ok: true } : { ok: false, reason: "unsupported", wrong: picks };
    if (picks.includes("none")) return { ok: false, reason: "missed", wrong: [] };
    const wrong = picks.filter(p => !b.evidence.includes(p));
    return wrong.length ? { ok: false, reason: "wrong", wrong } : { ok: true, partial: picks.length < b.evidence.length };
  }
  /** Sorting activities (observe, words, perspectives). */
  function sortResult(items, ans) {
    const right = [], wrong = [], blank = [];
    for (const it of items) { const a = ans && ans[it.id]; (a == null ? blank : a === it.answer ? right : wrong).push(it.id); }
    return { right, wrong, blank, done: right.length === items.length };
  }
  /** Follow a branching scene along the student's choices. */
  function walk(sc, path) {
    const steps = []; let node = sc.start, end = null;
    for (const i of Array.isArray(path) ? path : []) {
      const n = sc.nodes[node], c = n && Number.isInteger(i) ? n.choices[i] : null;
      if (!c) break;
      steps.push({ node, i, c });
      if (c.end) { end = c.end; break; }
      node = c.next;
    }
    return { steps, node: end ? null : node, end };
  }
  function applyScore(st, ans) {
    const results = {}; let score = 0, answered = 0;
    for (const q of st.questions) {
      const a = ans && ans[q.id];
      if (Number.isInteger(a) && q.options[a]) { answered++; results[q.id] = !!q.options[a].ok; if (q.options[a].ok) score++; }
    }
    return { score, total: st.questions.length, results, complete: answered === st.questions.length };
  }
  /** What the student has shown, recomputed from their answers. */
  function mastery(ep, e) {
    const det = stageOf(ep, "detective"), ch = stageOf(ep, "change"), ap = stageOf(ep, "apply");
    return {
      detective: det.barriers.every(b => checkEvidence(b, e.ev[b.id]).ok),
      change: ch.scenes.every(sc => e.best[sc.id] === "repaired"),
      apply: typeof e.apply.best === "number" && e.apply.best >= ap.pass,
    };
  }
  /** Record mastery the first time it is shown (dates never change afterwards; no duplicates). */
  function record(ep, e, today) {
    const m = mastery(ep, e), newly = [];
    for (const k of PARTS) if (m[k] && !e.mastered[k]) { e.mastered[k] = today; newly.push(k); }
    return newly;
  }
  /** A finished run of a scene: count the try, keep the best ending ("repaired" is never lost). */
  function finishScene(e, sc, end) {
    e.tries[sc.id] = (Number(e.tries[sc.id]) || 0) + 1;
    if (end === "repaired" || !e.best[sc.id]) e.best[sc.id] = end;
  }
  /** Check the Reflect and Apply questions: best score kept, unlimited tries. */
  function submitApply(ep, e) {
    const st = stageOf(ep, "apply"), r = applyScore(st, e.apply.ans);
    if (!r.complete) return r;
    e.apply.tries += 1;
    e.apply.best = Math.max(e.apply.best == null ? 0 : e.apply.best, r.score);
    e.apply.checked = true;
    return r;
  }
  /** Missing media (dependencies the teacher still has to add). */
  function missing(ep) {
    const m = ep.media, out = [];
    if (!m.video.available) out.push({ what: "film", src: m.video.src });
    if (!m.poster.available) out.push({ what: "thumbnail", src: m.poster.src });
    else if (!m.poster.alt) out.push({ what: "thumbnail description (alt text)", src: m.poster.src });
    if (!m.captions.en.available) out.push({ what: "English captions", src: m.captions.en.src });
    if (!m.captions.es.available) out.push({ what: "Spanish captions", src: m.captions.es.src });
    else if (!m.captions.es.reviewed) out.push({ what: "Spanish captions (teacher review)", src: m.captions.es.src });
    if (m.descriptions) for (const l of ["en", "es"]) { const d = m.descriptions[l]; if (d && d.available && !d.reviewed) out.push({ what: `${l === "en" ? "English" : "Spanish"} visual descriptions (teacher review)`, src: d.src }); }
    return out;
  }
  /** Minimal WebVTT reader for the description track: [{ start, end, text }] in seconds. */
  function parseVtt(txt) {
    const sec = t => { const p = t.trim().split(":").map(Number); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]; };
    return String(txt || "").split(/\r?\n\r?\n/).map(b => b.split(/\r?\n/)).map(lines => {
      const i = lines.findIndex(x => x.includes("-->")); if (i < 0) return null;
      const [a, z] = lines[i].split("-->"); return { start: sec(a), end: sec(z.trim().split(/\s/)[0]), text: lines.slice(i + 1).join(" ").trim() };
    }).filter(c => c && c.text && !isNaN(c.start));
  }
  /** Which video file to use: the player choice, else the lower-bandwidth copy when the browser reports a slow or data-saving connection. */
  function pickQuality(pref, conn) {
    if (pref === "hd" || pref === "low") return pref;
    return conn && (conn.saveData || /(^|-)(2g|3g)$/.test(conn.effectiveType || "")) ? "low" : "hd";
  }
  const core = { KEY, PARTS, load, epRec, parseVtt, pickQuality, checkEvidence, sortResult, walk, applyScore, mastery, record, finishScene, submitApply, missing, stageOf, speakerLines };
  root.SLBtp = core;

  /* ---------- page ---------- */
  if (!root.SL2 || typeof document === "undefined") return;
  const SL2 = root.SL2, D = root.SL_DATA, { h, L, pick, ICON } = SL2;
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const put = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const es = () => typeof lang !== "undefined" && lang === "es"; // the page's language (index.html)
  const arr = o => (o ? (es() && o.es ? o.es : o.en) : []);
  const alt = o => { if (!SL2.supportsOn() || !o) return ""; const b = SL2.other(o); return b && b !== pick(o) ? `<span class="sl2-alt" lang="${es() ? "en" : "es"}">${h(b)}</span>` : ""; };
  const T = o => `${h(pick(o))}${alt(o)}`;

  const entries = () => D.studios.experiences.filter(x => x.episode && x.route && x.status === "available");
  const cache = {}, failed = {};
  function episodeFor(n) {
    const x = entries().find(x => x.route === `#/btp/${n}`);
    if (!x) return { none: true };
    if (cache[x.episode]) return { ep: cache[x.episode], x };
    if (failed[x.episode]) return { error: true, x };
    if (!episodeFor.busy) {
      episodeFor.busy = true;
      fetch(x.episode, { cache: "no-cache" }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(j => { cache[x.episode] = j; }).catch(() => { failed[x.episode] = true; })
        .then(() => { episodeFor.busy = false; SL2.refresh(); });
    }
    return { loading: true, x };
  }

  let rec = load(get);
  const save = () => put(KEY, JSON.stringify(rec));
  function progress(ep, e) {
    const m = mastery(ep, e), done = {};
    done.observe = sortResult(stageOf(ep, "observe").items, e.obs).done && !!e.checked.observe;
    done.watch = !!e.checked.watch;
    done.detective = m.detective;
    done.words = sortResult(stageOf(ep, "words").items, e.words).done && !!e.checked.words;
    done.perspectives = sortResult(stageOf(ep, "perspectives").items, e.persp).done && !!e.checked.perspectives;
    done.change = m.change;
    done.apply = m.apply;
    return { m, done };
  }
  function afterChange(ep, e) {
    const newly = record(ep, e, SL2.today());
    save();
    if (newly.length && window.SLSound) SLSound.cue("complete"); // optional sound (off unless the student turns it on)
    if (newly.length && SL2.achState) { try { SL2.achState(); } catch (err) {} }
  }

  /* ----- film playback preferences (this browser): quality and spoken descriptions ----- */
  const prefs = () => (isObj(rec.prefs) ? rec.prefs : (rec.prefs = {}));
  const quality = m => (m.video720 && m.video720.available ? pickQuality(prefs().quality, root.navigator && navigator.connection) : "hd");
  const videoSrc = m => (quality(m) === "low" ? m.video720.src : m.video.src);
  let descCues = null, descSpoken = new Set(), lastT = 0;
  function loadDescriptions(m) {
    if (descCues || !m.descriptions) return;
    descCues = [];
    const d = es() && m.descriptions.es && m.descriptions.es.available && m.descriptions.es.reviewed ? m.descriptions.es : m.descriptions.en;
    fetch(d.src).then(r => (r.ok ? r.text() : "")).then(t => { descCues = parseVtt(t); }).catch(() => {});
  }
  function onTime(v, m) {
    if (!prefs().describe || !("speechSynthesis" in root)) return;
    if (!descCues) { loadDescriptions(m); return; }
    const t = v.currentTime;
    if (t < lastT - 0.5) descSpoken = new Set([...descSpoken].filter(i => descCues[i].start < t));
    lastT = t;
    const i = descCues.findIndex((c, n) => !descSpoken.has(n) && t >= c.start && t < c.end + 0.5);
    if (i < 0) return;
    descSpoken.add(i);
    const wasPlaying = !v.paused; v.pause();
    const u = new SpeechSynthesisUtterance(descCues[i].text); u.lang = "en-US";
    let resumed = false;
    const resume = () => { if (resumed) return; resumed = true; if (wasPlaying) { const p = v.play(); if (p && p.catch) p.catch(() => {}); } };
    u.onend = u.onerror = resume;
    setTimeout(resume, 2000 + descCues[i].text.split(/\s+/).length * 450); // never leave the film stuck if the computer has no voice
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  }
  document.addEventListener("timeupdate", ev => { if (ev.target && ev.target.id === "btpVideo") { const c = current(); if (c) onTime(ev.target, c.ep.media); } }, true);

  /* ----- views ----- */
  const wrap = inner => `<div class="wrap sl2 btp" id="sl2-main" data-notr>${inner}</div>`;
  function viewSeries() {
    const list = entries().filter(x => SL2.unitOpen(x.units[0]));
    return wrap(`<p class="sl2-back"><a href="#/">← ${L("My course", "Mi curso")}</a></p>
      <p class="sl2-kicker">${L("Beyond the Podium", "Beyond the Podium")}</p>
      <h1 class="sl2-h1">${L("Communication in Real Life", "La comunicación en la vida real")}</h1>
      <p class="sl2-lead">${L("Short films about everyday conversations. Investigate what happens, see more than one side, and practice what to say.", "Cortometrajes sobre conversaciones de todos los días. Investiga qué pasa, mira más de un lado y practica qué decir.")}</p>
      <h2 class="sr">${L("Episodes", "Episodios")}</h2>
      <ul class="sl2-studios">${list.map(x => `<li class="sl2-card sl2-studio"><h3>${h(pick(x.title))}</h3><p>${h(pick(x.blurb))}</p><a class="btn" href="${h(x.route)}">${L("Open", "Abrir")}<span class="sr"> ${h(pick(x.title))}</span></a></li>`).join("") || `<li class="sl2-card">${L("No episodes are open yet.", "Todavía no hay episodios abiertos.")}</li>`}</ul>`);
  }
  function stepper(ep, n, cur, done) {
    return `<nav class="btp-steps sl2-noprint" aria-label="${L("Lab stages", "Etapas del laboratorio")}"><ol>${ep.stages.map((s, i) => `<li><a href="#/btp/${n}/${s.id}"${s.id === cur ? ' aria-current="step"' : ""} class="${done[s.id] ? "is-done" : ""}"><span class="btp-num">${done[s.id] ? ICON.check : i + 1}</span> ${h(pick(s.title))}${done[s.id] ? `<span class="sr"> ${L("(done)", "(hecho)")}</span>` : ""}</a></li>`).join("")}</ol></nav>`;
  }
  function head(ep, x, n) {
    const draftEs = es() && ep.status.es !== "approved";
    return `<p class="sl2-back sl2-noprint"><a href="#/unit/${ep.unit}/labs">← ${L(`Unit ${ep.unit}: labs and studios`, `Unidad ${ep.unit}: laboratorios y estudios`)}</a></p>
      <p class="sl2-kicker">${h(pick(ep.series))} · ${L("Episode", "Episodio")} ${ep.episode}</p>
      <h1 class="sl2-h1">${h(pick(ep.title))}</h1>
      <p class="btp-label">${h(pick(ep.label))}</p>
      ${draftEs ? `<p class="btp-draft">${L("", "Traducción en borrador: el Sr. Bennett todavía la está revisando.")}</p>` : ""}
      ${SL2.teacherOn() ? teacherBox(ep) : ""}`;
  }
  function teacherBox(ep) {
    const miss = missing(ep);
    return `<div class="sl2-teachnote btp-teacher" role="note"><p>${L("Teacher view.", "Vista del maestro.")} ${L(`Lab text status: English ${ep.status.en}, Spanish ${ep.status.es} (review before production).`, `Estado del texto: inglés ${ep.status.en}, español ${ep.status.es} (revisar antes de publicar).`)}</p>
      ${miss.length ? `<p>${L("Missing media (add the approved file, then set available to true in the episode file):", "Faltan medios (agrega el archivo aprobado y cambia available a true en el archivo del episodio):")}</p><ul>${miss.map(m => `<li>${h(m.what)}: <code>site/${h(m.src)}</code></li>`).join("")}</ul>` : `<p>${L("All media files are marked available.", "Todos los medios están marcados como disponibles.")}</p>`}</div>`;
  }
  function viewOverview(ep, x, n, e) {
    const { m, done } = progress(ep, e), j = D.journals.journals.find(j => j.id === ep.journal);
    const b = D.achievements.badges.find(b => b.criteria.some(c => c.type === "btp" && c.episode === ep.id));
    return wrap(`${head(ep, x, n)}
      <p class="sl2-lead">${L("Two group partners, Jordan and Alex, have a conversation that breaks down. Investigate what went wrong, look at both sides, and practice changing the conversation.", "Dos compañeros de grupo, Jordan y Alex, tienen una conversación que se rompe. Investiga qué salió mal, mira ambos lados y practica cómo cambiar la conversación.")}</p>
      ${stepper(ep, n, null, done)}
      <p><a class="btn primary" href="#/btp/${n}/${(ep.stages.find(s => !done[s.id]) || ep.stages[0]).id}">${Object.values(done).some(Boolean) ? L("Continue", "Continuar") : L("Start", "Empezar")}</a> <a class="btn" href="#/btp/${n}/summary">${L("My learning summary", "Mi resumen de aprendizaje")}</a></p>
      ${b ? `<section class="sl2-card"><h2 class="sl2-h2">${h(pick(b.title))}</h2><p>${h(pick(b.about))}</p><ul class="sl2-crit">${b.criteria.map(c => `<li class="${m[c.part] ? "is-done" : ""}">${m[c.part] ? ICON.check : ICON.open} <span>${h(pick(c.label))}${m[c.part] ? ` <span class="sr">${L("(done)", "(hecho)")}</span>` : ""}</span></li>`).join("")}</ul><p class="sl2-small">${L("Watching the film or opening every stage does not earn the badge. Retry anything as often as you like.", "Ver el cortometraje o abrir todas las etapas no otorga la insignia. Repite lo que quieras cuantas veces quieras.")}</p></section>` : ""}
      ${j ? journalLink(j) : ""}`);
  }
  function journalLink(j) {
    return `<section class="sl2-card btp-journal"><p class="sl2-kicker">${ICON.pen || ""} ${L("Connected journal", "Diario relacionado")}</p><h2 class="sl2-h2">${h(pick(j.title || j.focus))}</h2><p>${T(j.prompt)}</p><p class="sl2-small">${L("Your Unit 1 flex journal. Write it by hand in class (about 10 minutes), then stand and share with someone new. Use what you practiced here.", "Tu diario flexible de la Unidad 1. Escríbelo a mano en clase (unos 10 minutos) y luego ponte de pie y comparte con alguien nuevo. Usa lo que practicaste aquí.")}</p></section>`;
  }
  const mediaNote = () => `<p class="btp-missing">${L("The film will be added here by Mr. Bennett. Until then, use the transcript below: every activity in this lab works from the script.", "El Sr. Bennett agregará aquí el cortometraje. Mientras tanto, usa la transcripción de abajo: todas las actividades de este laboratorio funcionan con el guion.")}</p>`;
  function transcript(ep, open) {
    let k = 0;
    return `<details class="btp-script"${open ? " open" : ""}><summary>${L("Transcript", "Transcripción")}</summary><ul>${ep.transcript.map(l => {
      const lab = /^l\d+$/.test(l.id) ? `${L("Line", "Línea")} ${++k} · ${h(l.speaker)}` : h(l.speaker === "Narrator" ? L("Narrator", "Narrador") : l.speaker === "End card" ? L("End card", "Pantalla final") : l.speaker === "Description" ? L("What the film shows", "Lo que muestra el cortometraje") : l.speaker);
      return `<li${l.speaker === "Description" ? ' class="btp-desc"' : ""}><b>${lab}:</b> ${T(l)}</li>`; }).join("")}</ul></details>`;
  }
  function sortStage(ep, st, e, store, labels, ckey) {
    const r = sortResult(st.items, e[store]), checked = !!e.checked[ckey];
    return `<form class="btp-sort" onsubmit="return false">${st.items.map(it => {
      const a = e[store][it.id], ok = checked && a === it.answer, bad = checked && a != null && a !== it.answer;
      return `<fieldset class="btp-item${ok ? " is-ok" : bad ? " is-bad" : ""}"><legend>${T(it.text)}</legend><div class="btp-opts">${labels.map(([v, lab]) => `<label><input type="radio" name="${store}-${it.id}" value="${v}" data-btp="sort" data-store="${store}" data-ck="${ckey}" data-id="${it.id}" data-k="${store}-${it.id}-${v}"${a === v ? " checked" : ""}> ${h(lab)}</label>`).join("")}</div>
        ${checked && a != null ? `<p class="btp-fb">${ok ? `${ICON.check} <b>${L("Right.", "Correcto.")}</b>` : `<b>${L("Look again.", "Mira otra vez.")}</b>`} ${T(it.why)}</p>` : ""}</fieldset>`; }).join("")}
      <p><button type="button" class="btn primary" data-btp="check" data-ck="${ckey}" data-k="check-${ckey}">${L("Check my answers", "Revisar mis respuestas")}</button></p>
      <p role="status" class="btp-status">${checked ? (r.done ? L("All correct. Nice work.", "Todo correcto. Buen trabajo.") : L(`${r.right.length} of ${st.items.length} correct. Change any answer and check again.`, `${r.right.length} de ${st.items.length} correctas. Cambia cualquier respuesta y revisa otra vez.`)) : ""}</p></form>`;
  }
  const note = (e, id, prompt, rows) => `<label class="btp-note"><span>${T(prompt)}</span><textarea rows="${rows || 3}" data-btp="note" data-id="${id}" data-k="note-${id}">${h(e.notes[id] || "")}</textarea></label>`;
  const privacy = () => `<p class="sl2-small">${L("Your writing stays in this browser on this computer and is not sent to anyone. Don't include private details about yourself or other people.", "Lo que escribes se queda en este navegador y en esta computadora, y no se envía a nadie. No incluyas detalles privados sobre ti ni sobre otras personas.")}</p>`;

  const STAGE = {
    observe(ep, st, e) {
      const p = ep.media.poster;
      return `<p>${T(st.intro)}</p>
        ${p.available ? `<figure class="btp-poster"><img src="${h(p.src)}" alt="${h(pick(p.alt) || "")}" width="1280" height="720" loading="lazy"><figcaption>${h(pick(ep.label))}</figcaption></figure>${note(e, "poster", st.posterPrompt)}` : `<p class="btp-missing">${L("The episode image will be added here. For now, sort the statements about the episode's words.", "Aquí se agregará la imagen del episodio. Por ahora, clasifica las afirmaciones sobre las palabras del episodio.")}</p>`}
        ${transcript(ep, false)}
        ${sortStage(ep, st, e, "obs", [["obs", L("Observation", "Observación")], ["inf", L("Inference", "Inferencia")]], "observe")}`;
    },
    watch(ep, st, e) {
      const m = ep.media, v = m.video, cap = m.captions;
      const tracks = [cap.en.available ? `<track kind="captions" srclang="en" label="English" src="${h(cap.en.src)}"${!es() || !(cap.es.available && cap.es.reviewed) ? " default" : ""}>` : "",
        cap.es.available && cap.es.reviewed ? `<track kind="captions" srclang="es" label="Español" src="${h(cap.es.src)}"${es() ? " default" : ""}>` : ""].join("");
      return `<h2 class="sl2-h2">${L("Before you watch", "Antes de ver")}</h2><ul>${arr(st.before).map(q => `<li>${h(q)}</li>`).join("")}</ul>
        ${v.available ? `<figure class="btp-film"><video id="btpVideo" controls preload="metadata" playsinline${m.poster.available ? ` poster="${h(m.poster.src)}"` : ""} aria-describedby="btpFilmCap"><source src="${h(videoSrc(m))}" type="video/mp4">${tracks}</video>
          <figcaption id="btpFilmCap">${h(pick(ep.title))} · ${h(pick(ep.label))}${cap.en.available ? "" : ` ${L("Captions are not available yet; use the transcript.", "Los subtítulos todavía no están disponibles; usa la transcripción.")}`}</figcaption></figure>
          <div class="btp-row btp-player sl2-noprint"><button type="button" class="btn" data-btp="replay" data-k="replay">${L("Replay from the start", "Ver otra vez desde el inicio")}</button>
            ${m.video720 && m.video720.available ? `<label>${L("Video quality", "Calidad del video")} <select data-btp="quality" data-k="quality"><option value="hd"${quality(m) === "hd" ? " selected" : ""}>${L("Standard (1080p, 16 MB)", "Estándar (1080p, 16 MB)")}</option><option value="low"${quality(m) === "low" ? " selected" : ""}>${L("Lower bandwidth (720p, 5 MB)", "Menos datos (720p, 5 MB)")}</option></select></label>` : ""}
            ${m.descriptions && m.descriptions.en.available ? `<label class="btp-desc-toggle"><input type="checkbox" data-btp="describe" data-k="describe"${prefs().describe ? " checked" : ""}${"speechSynthesis" in root ? "" : " disabled"}> ${L("Read what the film shows aloud (pauses the film; uses this computer's voice)", "Leer en voz alta lo que muestra el cortometraje (pausa el video; usa la voz de esta computadora)")}</label>` : ""}</div>
          ${m.descriptions && m.descriptions.en.available && !("speechSynthesis" in root) ? `<p class="sl2-small">${L("This browser can't read descriptions aloud. They are in the transcript below.", "Este navegador no puede leer las descripciones en voz alta. Están en la transcripción de abajo.")}</p>` : ""}` : mediaNote()}
        ${transcript(ep, !v.available)}
        <h2 class="sl2-h2">${L("After you watch", "Después de ver")}</h2>
        ${arr(st.after).map((q, i) => `<label class="btp-note"><span>${h(q)}</span><textarea rows="2" data-btp="note" data-id="after${i}" data-k="note-after${i}">${h(e.notes["after" + i] || "")}</textarea></label>`).join("")}
        <p><button type="button" class="btn${e.checked.watch ? "" : " primary"}" data-btp="watched" data-k="watched" aria-pressed="${!!e.checked.watch}">${e.checked.watch ? `${ICON.check} ` : ""}${v.available ? L("I watched the film", "Vi el cortometraje") : L("I read the transcript", "Leí la transcripción")}</button></p>
        <p class="sl2-small">${L("Optional answers. They stay in this browser.", "Respuestas opcionales. Se quedan en este navegador.")}</p>`;
    },
    detective(ep, st, e) {
      const lines = speakerLines(ep), num = id => lines.findIndex(l => l.id === id) + 1;
      const solved = st.barriers.filter(b => checkEvidence(b, e.ev[b.id]).ok).length;
      return `<p>${T(st.intro)}</p>${transcript(ep, true)}
        <p class="btp-meter" role="status">${L(`${solved} of ${st.barriers.length} barriers matched to evidence`, `${solved} de ${st.barriers.length} barreras relacionadas con evidencia`)}</p>
        <div class="btp-cases">${st.barriers.map(b => {
          const picks = Array.isArray(e.ev[b.id]) ? e.ev[b.id] : [], shown = !!e.checked["ev-" + b.id], r = checkEvidence(b, picks);
          let fb = "";
          if (shown) fb = r.ok ? `${ICON.check} <b>${b.evidence.includes("none") ? L("Right.", "Correcto.") : L("Supported.", "Con evidencia.")}</b> <span class="btp-pl">${T(b.why)}</span>${r.partial ? ` <span>${L("(Other lines show it too.)", "(Otras líneas también lo muestran.)")}</span>` : ""}`
            : r.reason === "empty" ? L("Choose at least one line, or choose that the words show no evidence.", "Elige al menos una línea, o elige que las palabras no muestran evidencia.")
            : r.reason === "mixed" ? L("You chose lines and also \"no evidence.\" Choose one or the other.", "Elegiste líneas y también \"sin evidencia\". Elige una cosa o la otra.")
            : r.reason === "missed" ? L("Look again: at least one line does show this barrier.", "Mira otra vez: al menos una línea sí muestra esta barrera.")
            : r.reason === "unsupported" ? L(`Line ${r.wrong.map(num).join(", ")} does not show this. Is there any evidence in the words at all?`, `La línea ${r.wrong.map(num).join(", ")} no muestra esto. ¿Hay alguna evidencia en las palabras?`)
            : L(`Line ${r.wrong.map(num).join(", ")} does not show this barrier. Reread the definition and try again.`, `La línea ${r.wrong.map(num).join(", ")} no muestra esta barrera. Vuelve a leer la definición e inténtalo otra vez.`);
          return `<fieldset class="btp-case${shown ? (r.ok ? " is-ok" : " is-bad") : ""}"><legend>${T(b.name)}</legend><p class="sl2-small">${T(b.def)}</p>
            <div class="btp-opts">${lines.map((l, i) => `<label><input type="checkbox" data-btp="ev" data-id="${b.id}" value="${l.id}" data-k="ev-${b.id}-${l.id}"${picks.includes(l.id) ? " checked" : ""}> ${L("Line", "Línea")} ${i + 1} · ${h(l.speaker)}</label>`).join("")}
            <label><input type="checkbox" data-btp="ev" data-id="${b.id}" value="none" data-k="ev-${b.id}-none"${picks.includes("none") ? " checked" : ""}> ${L("No evidence in the words", "No hay evidencia en las palabras")}</label></div>
            <label class="btp-note"><span>${L("Explain your evidence (optional)", "Explica tu evidencia (opcional)")}</span><textarea rows="2" data-btp="expl" data-id="${b.id}" data-k="expl-${b.id}">${h(e.expl[b.id] || "")}</textarea></label>
            <p><button type="button" class="btn" data-btp="evcheck" data-id="${b.id}" data-k="evcheck-${b.id}">${L("Check", "Revisar")}<span class="sr"> ${h(pick(b.name))}</span></button></p>
            <p class="btp-fb" role="status">${fb}</p></fieldset>`; }).join("")}</div>
        <p class="sl2-small">${L("Sentence starter:", "Inicio de oración:")} ${h(arr(ep.frames)[4] || "")}</p>`;
    },
    words(ep, st, e) {
      const ip = st.interpret;
      return `<p>${T(st.intro)}</p>
        ${sortStage(ep, st, e, "words", [["verbal", L("Verbal (words)", "Verbal (palabras)")], ["nonverbal", L("Nonverbal (body)", "No verbal (cuerpo)")], ["para", L("Paralanguage (voice)", "Paralenguaje (voz)")]], "words")}
        <section class="sl2-card"><h2 class="sl2-h2">${L("One cue, many meanings", "Una señal, muchos significados")}</h2><p><b>${T(ip.cue)}</b></p><p>${L("It might mean:", "Podría significar:")}</p><ul>${arr(ip.meanings).map(x => `<li>${h(x)}</li>`).join("")}</ul><p class="btp-key">${T(ip.lesson)}</p></section>
        <section class="sl2-card"><h2 class="sl2-h2">${L("When words and voice don't match", "Cuando las palabras y la voz no coinciden")}</h2><p>${T(st.mismatch)}</p>
        <p>${ep.media.video.available ? L("Watch the film again and notice:", "Mira el cortometraje otra vez y fíjate en:") : L("When the film is added, watch for:", "Cuando se agregue el cortometraje, fíjate en:")}</p><ul>${arr(st.watchFor).map(x => `<li>${h(x)}</li>`).join("")}</ul>
        ${ep.media.video.available ? note(e, "cues", { en: "Describe one cue you noticed and two different things it could mean.", es: "Describe una señal que notaste y dos cosas diferentes que podría significar." }) : ""}</section>`;
    },
    perspectives(ep, st, e) {
      return `<p>${T(st.intro)}</p>${transcript(ep, false)}
        ${sortStage(ep, st, e, "persp", [["said", L("They said it", "Lo dijeron")], ["unknown", L("We don't know", "No lo sabemos")]], "perspectives")}
        <h2 class="sl2-h2">${L("Step into each side", "Ponte en cada lado")}</h2>
        ${st.write.map(w => note(e, "p-" + w.id, w.prompt)).join("")}
        <p class="sl2-small">${L("Perception check:", "Verificación de percepción:")} ${h(arr(ep.frames)[3] || "")} · ${L("Paraphrase:", "Paráfrasis:")} ${h(arr(ep.frames)[2] || "")}</p>${privacy()}`;
    },
    change(ep, st, e) {
      return `<p>${T(st.intro)}</p>${st.scenes.map(sc => {
        const path = Array.isArray(e.scenes[sc.id]) ? e.scenes[sc.id] : [], w = walk(sc, path), other = sc.role === "Jordan" ? "Alex" : "Jordan";
        const best = e.best[sc.id], tries = Number(e.tries[sc.id]) || 0;
        const log = w.steps.map(s => `<li class="btp-you"><b>${L("You", "Tú")} (${h(sc.role)}):</b> ${T(s.c.say)}
            <div class="btp-why ${s.c.good ? "is-ok" : "is-bad"}">${s.c.good ? ICON.check : ""} <b>${s.c.good ? L("Effective.", "Eficaz.") : L("Not effective.", "No es eficaz.")}</b> ${T(s.c.why)} <span class="btp-skills">${s.c.skills.map(k => `<span class="sl2-pill">${h(k)}</span>`).join(" ")}</span></div></li>
            ${s.c.reply ? `<li class="btp-them"><b>${h(other)}:</b> ${T(s.c.reply)}</li>` : ""}`).join("");
        const n = w.node && sc.nodes[w.node];
        return `<section class="sl2-card btp-scene" aria-labelledby="btp-sc-${sc.id}"><h2 class="sl2-h2" id="btp-sc-${sc.id}">${h(pick(sc.title))}</h2><p>${T(sc.setup)}</p>
          ${log ? `<ol class="btp-log">${log}</ol>` : ""}
          ${n ? `<fieldset class="btp-choices"><legend>${L("What do you say?", "¿Qué dices?")}</legend>${n.choices.map((c, i) => `<button type="button" class="btn btp-choice" data-btp="say" data-scene="${sc.id}" data-i="${i}" data-k="say-${sc.id}-${w.node}-${i}">${T(c.say)}</button>`).join("")}</fieldset>` : ""}
          ${w.end ? `<p class="btp-end is-${w.end}" role="status"><b>${h(pick(st.endings[w.end]))}</b></p>` : ""}
          <p class="btp-row">${path.length ? `<button type="button" class="btn" data-btp="back" data-scene="${sc.id}" data-k="back-${sc.id}">${L("Change my last choice", "Cambiar mi última elección")}</button> <button type="button" class="btn" data-btp="restart" data-scene="${sc.id}" data-k="restart-${sc.id}">${L("Start the scene over", "Empezar la escena otra vez")}</button>` : ""}
          <span class="sl2-small">${best === "repaired" ? `${ICON.check} ${L("Scene repaired.", "Escena reparada.")}` : ""} ${tries ? L(`Runs: ${tries}`, `Intentos: ${tries}`) : ""}</span></p></section>`; }).join("")}
        <p class="sl2-small">${L("I-statement:", "Mensaje en primera persona:")} ${h(arr(ep.frames)[1] || "")}</p>`;
    },
    apply(ep, st, e) {
      const r = applyScore(st, e.apply.ans), checked = !!e.apply.checked, j = D.journals.journals.find(j => j.id === ep.journal);
      return `<p>${T(st.intro)}</p><form class="btp-quiz" onsubmit="return false">${st.questions.map((q, n) => {
          const a = e.apply.ans[q.id], res = checked && r.results[q.id];
          return `<fieldset class="btp-item${checked ? (res ? " is-ok" : " is-bad") : ""}"><legend>${n + 1}. ${T(q.q)}</legend><div class="btp-opts btp-col">${q.options.map((o, i) => `<label><input type="radio" name="ap-${q.id}" data-btp="ap" data-id="${q.id}" value="${i}" data-k="ap-${q.id}-${i}"${a === i ? " checked" : ""}> ${h(pick(o.t))}</label>`).join("")}</div>
            ${checked && a != null ? `<p class="btp-fb">${res ? `${ICON.check} <b>${L("Right.", "Correcto.")}</b>` : `<b>${L("Not quite.", "Todavía no.")}</b>`} ${T(q.why)}</p>` : ""}</fieldset>`; }).join("")}
        <p class="btp-row"><button type="button" class="btn primary" data-btp="apcheck" data-k="apcheck">${L("Check my answers", "Revisar mis respuestas")}</button> ${checked ? `<button type="button" class="btn" data-btp="apretry" data-k="apretry">${L("Try again", "Intentar otra vez")}</button>` : ""}</p>
        <p role="status" class="btp-status">${checked ? L(`This try: ${r.score} of ${r.total}. Your best: ${e.apply.best} of ${r.total}.`, `Este intento: ${r.score} de ${r.total}. Tu mejor: ${e.apply.best} de ${r.total}.`) + " " + (e.apply.best >= st.pass ? L("You met the goal.", "Lograste la meta.") : L(`The goal is ${st.pass} of ${r.total}. Try again as often as you like.`, `La meta es ${st.pass} de ${r.total}. Inténtalo cuantas veces quieras.`)) : !r.complete ? L(`Answer all ${r.total}, then check.`, `Responde las ${r.total} y luego revisa.`) : ""}</p></form>
        <h2 class="sl2-h2">${L("Reflect", "Reflexiona")}</h2>${st.reflect.map(x => note(e, "r-" + x.id, x.prompt)).join("")}${privacy()}
        <p><a class="btn" href="#/btp/${ep.episode}/summary">${L("See and print my learning summary", "Ver e imprimir mi resumen de aprendizaje")}</a></p>
        ${j ? journalLink(j) : ""}`;
    },
  };

  function viewStage(ep, x, n, e, sid) {
    const st = stageOf(ep, sid), i = ep.stages.indexOf(st), { done } = progress(ep, e);
    const prev = ep.stages[i - 1], next = ep.stages[i + 1];
    return wrap(`${head(ep, x, n)}${stepper(ep, n, sid, done)}
      <section id="btpStage" class="btp-stage" aria-labelledby="btp-st"><h2 class="sl2-h2 btp-sth" id="btp-st">${L("Stage", "Etapa")} ${i + 1}: ${h(pick(st.title))}</h2>
      <div id="btpBody">${STAGE[sid](ep, st, e)}</div></section>
      <details class="btp-vocab sl2-noprint"${SL2.supportLevel && SL2.supportLevel() === "guided" ? " open" : ""}><summary>${L("Vocabulary and sentence starters", "Vocabulario e inicios de oración")}</summary><dl>${ep.vocab.map(v => `<dt>${h(es() ? v.es : v.en)}${SL2.supportsOn() ? ` <span class="sl2-alt" lang="${es() ? "en" : "es"}">${h(es() ? v.en : v.es)}</span>` : ""}</dt><dd>${T(v.def)}</dd>`).join("")}</dl><ul class="sl2-frames">${arr(ep.frames).map(f => `<li>${h(f)}</li>`).join("")}</ul></details>
      <p class="btp-nav sl2-noprint">${prev ? `<a class="btn" href="#/btp/${n}/${prev.id}">← ${h(pick(prev.title))}</a>` : `<a class="btn" href="#/btp/${n}">← ${L("Episode overview", "Resumen del episodio")}</a>`} ${next ? `<a class="btn primary" href="#/btp/${n}/${next.id}">${h(pick(next.title))} →</a>` : `<a class="btn primary" href="#/btp/${n}/summary">${L("My learning summary", "Mi resumen de aprendizaje")} →</a>`}</p>`);
  }
  function viewSummary(ep, x, n, e) {
    const { m } = progress(ep, e), det = stageOf(ep, "detective"), ch = stageOf(ep, "change"), ap = stageOf(ep, "apply");
    const found = det.barriers.filter(b => checkEvidence(b, e.ev[b.id]).ok && !b.evidence.includes("none"));
    const yes = v => v ? `${ICON.check} ${L("Shown", "Demostrado")}` : L("Not yet", "Todavía no");
    const reflections = ap.reflect.map(r => [r.prompt, e.notes["r-" + r.id]]).filter(([, t]) => t && t.trim());
    return wrap(`<p class="sl2-back sl2-noprint"><a href="#/btp/${n}">← ${L("Episode overview", "Resumen del episodio")}</a></p>
      <p class="sl2-kicker">${h(pick(ep.series))} · ${L("Episode", "Episodio")} ${ep.episode}</p>
      <h1 class="sl2-h1">${L("My learning summary", "Mi resumen de aprendizaje")}: ${h(pick(ep.title))}</h1>
      <p class="btp-fill">${L("Name", "Nombre")}: ______________________ &nbsp; ${L("Class period", "Hora de clase")}: ______ &nbsp; ${h(SL2.fmtLong(SL2.today()))}</p>
      <p class="sl2-noprint"><button type="button" class="btn primary" data-sl2-print>${L("Print", "Imprimir")}</button></p>
      <div class="sl2-tablewrap"><table class="sl2-table"><thead><tr><th scope="col">${L("Skill", "Habilidad")}</th><th scope="col">${L("Status", "Estado")}</th><th scope="col">${L("Details", "Detalles")}</th></tr></thead><tbody>
        <tr><th scope="row">${h(pick(det.title))}</th><td>${yes(m.detective)}</td><td>${L(`${det.barriers.filter(b => checkEvidence(b, e.ev[b.id]).ok).length} of ${det.barriers.length} matched`, `${det.barriers.filter(b => checkEvidence(b, e.ev[b.id]).ok).length} de ${det.barriers.length} relacionadas`)}</td></tr>
        <tr><th scope="row">${h(pick(ch.title))}</th><td>${yes(m.change)}</td><td>${ch.scenes.map(sc => `${h(pick(sc.title))}: ${e.best[sc.id] ? h(pick(ch.endings[e.best[sc.id]]).split(":")[0]) : L("not tried", "sin intentar")}`).join("<br>")}</td></tr>
        <tr><th scope="row">${h(pick(ap.title))}</th><td>${yes(m.apply)}</td><td>${e.apply.best == null ? L("not tried", "sin intentar") : L(`Best: ${e.apply.best} of ${ap.questions.length} (goal ${ap.pass})`, `Mejor: ${e.apply.best} de ${ap.questions.length} (meta ${ap.pass})`)}</td></tr>
      </tbody></table></div>
      ${found.length ? `<h2 class="sl2-h2">${L("Barriers I identified with evidence", "Barreras que identifiqué con evidencia")}</h2><ul>${found.map(b => `<li><b>${h(pick(b.name))}</b>: ${h(pick(b.why))}</li>`).join("")}</ul>` : ""}
      ${reflections.length ? `<h2 class="sl2-h2">${L("My reflections", "Mis reflexiones")}</h2>${reflections.map(([p, t]) => `<p><b>${h(pick(p))}</b><br>${h(t)}</p>`).join("")}` : ""}
      <p class="sl2-small">${L("This summary shows practice in a digital lab. It is not a grade and does not measure how you communicate in real life; that grows with practice in class and beyond. It is saved only in this browser.", "Este resumen muestra práctica en un laboratorio digital. No es una calificación y no mide cómo te comunicas en la vida real; eso crece con la práctica en clase y fuera de ella. Se guarda solo en este navegador.")}</p>`);
  }

  function view(route) {
    const a = route.args || [];
    if (!a.length) return viewSeries();
    const n = a[0], got = episodeFor(n);
    if (got.none) return wrap(`<p class="sl2-back"><a href="#/btp">← ${L("All episodes", "Todos los episodios")}</a></p><h1 class="sl2-h1">${L("Episode not found", "Episodio no encontrado")}</h1>`);
    if (got.loading) return wrap(`<h1 class="sl2-h1">${h(pick(got.x.title))}</h1><p role="status">${L("Loading…", "Cargando…")}</p>`);
    if (got.error) return wrap(`<h1 class="sl2-h1">${h(pick(got.x.title))}</h1><p role="alert">${L("This episode could not load. Check the internet connection and reload the page.", "Este episodio no pudo cargar. Revisa la conexión a internet y vuelve a cargar la página.")}</p>`);
    const ep = got.ep;
    if (!SL2.unitOpen(ep.unit)) return wrap(SL2.lockedNotice(ep.unit));
    rec = load(get);
    const e = epRec(rec, ep.id);
    if (a[1] === "summary") return viewSummary(ep, got.x, n, e);
    if (a[1] && stageOf(ep, a[1])) return viewStage(ep, got.x, n, e, a[1]);
    return viewOverview(ep, got.x, n, e);
  }

  /* ----- interaction: update the record, redraw the stage, keep keyboard focus ----- */
  function current() {
    const r = SL2.route(); if (!r || r.name !== "btp" || !r.args || !r.args[1]) return null;
    const got = episodeFor(r.args[0]); if (!got.ep) return null;
    return { ep: got.ep, n: r.args[0], sid: r.args[1], e: epRec(rec, got.ep.id) };
  }
  function redraw(c, focusKey) {
    const st = stageOf(c.ep, c.sid); if (!st) return;
    const body = document.getElementById("btpBody"); if (!body) return;
    const openD = [...body.querySelectorAll("details")].map(d => d.open);
    body.innerHTML = STAGE[c.sid](c.ep, st, c.e);
    [...body.querySelectorAll("details")].forEach((d, i) => { if (openD[i] != null) d.open = openD[i]; });
    const steps = document.querySelector(".btp-steps");
    if (steps) steps.outerHTML = stepper(c.ep, c.n, c.sid, progress(c.ep, c.e).done);
    const f = focusKey && body.querySelector(`[data-k="${focusKey}"]`);
    if (f) f.focus({ preventScroll: true });
  }
  function onEvent(ev) {
    const t = ev.target.closest && ev.target.closest("[data-btp]"); if (!t) return;
    const c = current(); if (!c) return;
    const act = t.dataset.btp, id = t.dataset.id, e = c.e, ep = c.ep;
    if (ev.type === "input") {
      if (act === "note") { e.notes[id] = t.value.slice(0, 4000); save(); }
      if (act === "expl") { e.expl[id] = t.value.slice(0, 4000); save(); }
      return;
    }
    if (ev.type === "change") {
      if (act === "sort") { e[t.dataset.store][id] = t.value; e.checked[t.dataset.ck] = false; save(); redraw(c, t.dataset.k); }
      else if (act === "ev") { const set = new Set(Array.isArray(e.ev[id]) ? e.ev[id] : []); if (t.checked) set.add(t.value); else set.delete(t.value); e.ev[id] = [...set]; e.checked["ev-" + id] = false; save(); redraw(c, t.dataset.k); }
      else if (act === "ap") { e.apply.ans[id] = Number(t.value); e.apply.checked = false; save(); redraw(c, t.dataset.k); }
      else if (act === "quality") {
        prefs().quality = t.value; save();
        const v = document.getElementById("btpVideo"); if (!v) return;
        const at = v.currentTime, playing = !v.paused, srcEl = v.querySelector("source");
        srcEl.src = videoSrc(ep.media); v.load();
        v.addEventListener("loadedmetadata", () => {
          if (playing) v.addEventListener("seeked", () => { const p = v.play(); if (p && p.catch) p.catch(() => {}); }, { once: true });
          v.currentTime = at;
        }, { once: true });
      }
      else if (act === "describe") { prefs().describe = t.checked; save(); if (t.checked) loadDescriptions(ep.media); else if ("speechSynthesis" in root) speechSynthesis.cancel(); }
      return;
    }
    if (ev.type !== "click") return;
    let key = t.dataset.k;
    switch (act) {
      case "check": e.checked[t.dataset.ck] = true; break;
      case "watched": e.checked.watch = !e.checked.watch; break;
      case "evcheck": e.checked["ev-" + id] = true; break;
      case "say": {
        const sc = stageOf(ep, "change").scenes.find(s => s.id === t.dataset.scene);
        const path = (Array.isArray(e.scenes[sc.id]) ? e.scenes[sc.id] : []).concat(Number(t.dataset.i)), w = walk(sc, path);
        e.scenes[sc.id] = path;
        if (w.end) finishScene(e, sc, w.end);
        key = w.end ? `restart-${sc.id}` : `say-${sc.id}-${w.node}-0`;
        break;
      }
      case "back": { const p = (e.scenes[t.dataset.scene] || []).slice(0, -1); e.scenes[t.dataset.scene] = p; const sc = stageOf(ep, "change").scenes.find(s => s.id === t.dataset.scene); key = `say-${sc.id}-${walk(sc, p).node}-0`; break; }
      case "restart": { e.scenes[t.dataset.scene] = []; const sc = stageOf(ep, "change").scenes.find(s => s.id === t.dataset.scene); key = `say-${sc.id}-${sc.start}-0`; break; }
      case "apcheck": submitApply(ep, e); break;
      case "apretry": e.apply.ans = {}; e.apply.checked = false; key = `ap-${stageOf(ep, "apply").questions[0].id}-0`; break;
      case "replay": { const v = document.getElementById("btpVideo"); if (v) { v.currentTime = 0; const p = v.play(); if (p && p.catch) p.catch(() => {}); } return; }
      default: return;
    }
    afterChange(ep, e);
    redraw(c, key);
  }
  ["click", "change", "input"].forEach(type => document.addEventListener(type, onEvent));
  SL2.addRoute("btp", { view });
})(typeof window !== "undefined" ? window : globalThis);
