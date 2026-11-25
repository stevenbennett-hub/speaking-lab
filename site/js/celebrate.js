/* Speak Up | The Speaking Lab — Slice 12 achievement celebration.
   Shown only by js/student.js when the achievement engine (js/achievements.js track()) reports a badge earned for the
   first time while the page is open. Never on page load, refresh, navigation, backup restore, progress import, repeated
   completion or when viewing a badge (student.js records those silently). This file never writes progress, points or
   badges. Teacher demonstration mode (#/demo/celebrate, teacher view) replays the visuals with nothing saved.
   Tiers: knowledge (blue), applied (teal), verified (gold, communication badges: only after real teacher verification,
   which does not exist yet), milestone (the badges listed in data/activities.json portfolio.milestone).
   Motion: CSS only, transform/opacity, about 1.2 s; dismissible at once (button, Escape, backdrop); static with
   reduced motion or when the student turns achievement animations off. */
(function (root) {
  "use strict";
  let queue = [], at = 0, opts = {}, el = null, from = null;
  const D = () => root.SL_DATA || {};
  const es = () => (typeof lang !== "undefined" && lang === "es");
  const L = (en, sp) => (es() ? sp : en);
  const pick = o => (o ? (es() ? o.es || o.en : o.en) : "");
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function tier(b) {
    const ms = ((D().activities || {}).portfolio || {}).milestone || [];
    return ms.includes(b.id) ? "milestone" : b.level === "communication" ? "verified" : b.level === "applied" ? "applied" : "knowledge";
  }
  const TIER = {
    knowledge: ["Knowledge demonstrated", "Conocimiento demostrado", "badge-knowledge"],
    applied: ["Applied communication skill", "Habilidad de comunicación aplicada", "badge-applied"],
    verified: ["Teacher-verified speaking accomplishment", "Logro oral verificado por el maestro", "badge-verified"],
    milestone: ["Major milestone", "Gran logro", "badge-capstone"],
  };
  const isOpen = () => !!(el && !el.hidden);
  function close() {
    if (!el) return; el.hidden = true; el.innerHTML = ""; queue = []; at = 0;
    root.document.body.classList.remove("slc-on");
    if (from && from.focus && root.document.contains(from)) from.focus(); from = null;
  }
  function render() {
    const b = queue[at], t = tier(b), T = TIER[t], last = at === queue.length - 1;
    const medal = root.SLAchieve ? root.SLAchieve.medallion(b, "earned") : "";
    const pts = !opts.demo && opts.points ? `<p class="slc-pts">+${opts.points} ${L("learning points", "puntos de aprendizaje")}</p>` : opts.demo && opts.points ? `<p class="slc-pts">+${opts.points} ${L("learning points (not added)", "puntos de aprendizaje (no se suman)")}</p>` : "";
    el.dataset.tier = t;
    el.innerHTML = `<div class="slc-back" data-slc-close></div>
      <div class="slc-card" role="dialog" aria-modal="true" aria-labelledby="slcT" aria-describedby="slcWhy">
        <p class="slc-kicker">${esc(L("New achievement", "Nuevo logro"))} · ${esc(L(T[0], T[1]))}</p>
        <div class="slc-medal" aria-hidden="true"><span class="slc-glow"></span><span class="slc-ring"></span><span class="slc-ring slc-r2"></span>${t === "knowledge" || t === "milestone" ? '<span class="slc-dots"><i></i><i></i><i></i><i></i><i></i><i></i></span>' : ""}${medal}</div>
        <h2 id="slcT">${esc(pick(b.title))}</h2>
        <p id="slcWhy" class="slc-why">${esc(pick(b.about))}</p>
        ${pts}
        ${queue.length > 1 ? `<p class="slc-count">${esc(L(`${at + 1} of ${queue.length}`, `${at + 1} de ${queue.length}`))}</p>` : ""}
        ${opts.demo ? `<p class="slc-demo">${esc(L("Demonstration only: nothing was awarded or saved.", "Solo demostración: no se otorgó ni guardó nada."))}</p>` : ""}
        <div class="slc-acts"><button type="button" class="btn primary" data-slc-next>${esc(last ? L("Continue learning", "Seguir aprendiendo") : L("Next achievement", "Siguiente logro"))}</button>
          <a class="btn" href="#/certificate/${esc(b.id)}${opts.demo ? "/demo" : ""}" data-slc-close>${esc(L("View certificate", "Ver certificado"))}</a></div>
        <p class="slc-more"><button type="button" class="linkbtn" data-slc-badge>${esc(L("Download badge", "Descargar insignia"))}</button> · <button type="button" class="linkbtn" data-slc-save data-mywork="1">${esc(L("Back up my progress", "Copiar mi progreso"))}</button></p>
      </div>`;
    el.classList.toggle("slc-still", !(root.SLSound ? root.SLSound.animations() : true));
    el.classList.remove("slc-go"); void el.offsetWidth; el.classList.add("slc-go");
    const btn = el.querySelector("[data-slc-next]"); if (btn) btn.focus();
    if (root.SLSound) root.SLSound.cue(T[2]);
  }
  /** Show one or more badges. list = badge objects from achievements.json. opts: { points, demo }. */
  function show(list, o) {
    o = o || {};
    // Outside demonstration mode only active badges can be celebrated (pending teacher-verified badges never are).
    const items = (list || []).filter(b => b && (o.demo || b.status === "active"));
    if (!items.length) return false;
    if (!el) { el = root.document.createElement("div"); el.id = "slCelebrate"; el.className = "slc"; el.hidden = true; el.setAttribute("data-notr", ""); root.document.body.appendChild(el); }
    if (isOpen()) { queue = queue.concat(items); render(); return true; } // several at once: one at a time
    queue = items; at = 0; opts = o; from = root.document.activeElement;
    el.hidden = false; root.document.body.classList.add("slc-on");
    render();
    return true;
  }
  if (root.document) {
    root.document.addEventListener("click", e => {
      if (!isOpen()) return;
      if (e.target.closest("[data-slc-badge]")) { if (root.SLCert) root.SLCert.downloadBadge(queue[at]); return; } // an image only: no award, no points
      if (e.target.closest("[data-slc-save]")) { close(); return; } // the backup dialog (data-mywork) opens on the same click
      if (e.target.closest("[data-slc-next]")) { if (at < queue.length - 1) { at++; render(); } else close(); return; }
      if (e.target.closest("[data-slc-close]")) close();
    });
    root.document.addEventListener("keydown", e => {
      if (!isOpen()) return;
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key === "Tab") { const f = [...el.querySelectorAll("button, a[href]")]; if (!f.length) return; const i = f.indexOf(root.document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }
    });
  }
  root.SLCelebrate = { show, close, open: isOpen, tier, TIER };
})(typeof window !== "undefined" ? window : globalThis);
