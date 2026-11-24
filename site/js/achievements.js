/* Speak Up | The Speaking Lab — achievements engine (Slice 4).
   Pure logic plus small renderers; the page (js/student.js) supplies storage and the labs' summaries.
   - Reads existing progress (reading checks, practice tests, lab summaries) and never changes it.
   - Keeps its own record in one key, speakup-achieve-v1: when a badge was first earned, and each check's
     first-seen score so improvement after a retry can be recognized. Updating it twice changes nothing.
   - Learning points are recalculated from what is mastered, so nothing can be counted twice.
   - Communication badges are teacher-verified and stay pending: nothing online can award them.
   Badges are informal learning achievements, saved in this browser only; not grades or credentials. */
(function (root) {
  "use strict";
  const KEY = "speakup-achieve-v1";
  const parse = s => { try { return JSON.parse(s || "null"); } catch (e) { return null; } };

  /** Gather what the achievements look at. env: { get(key) → string|null, labs: { rlab: [...summary], … } } */
  function collect(env) {
    const Q = parse(env.get("speakup-quiz-v1")) || {}, P = parse(env.get("speakup-test-v1")) || {};
    const A = parse(env.get("speakup-aud-v1")) || {}, LI = parse(env.get("speakup-listen-v1")) || {}, PL = parse(env.get("speakup-plab-v1")) || {};
    const quiz = {}, test = {};
    for (let u = 1; u <= 6; u++) {
      const q = Q.u && Q.u[u], t = P[u];
      if (q && q.best != null) quiz[u] = Number(q.best);
      if (t && t.best != null) test[u] = Number(t.best);
    }
    const labs = {};
    for (const [id, list] of Object.entries(env.labs || {})) labs[id] = Object.fromEntries((list || []).map(a => [a.id, !!a.mastered]));
    return {
      quiz, test, labs,
      plabDone: (PL && PL.done) || {},
      audBest: A.mc && A.mc.best != null ? Number(A.mc.best) : null,
      listenFinal: LI.fin && LI.fin.best != null ? Number(LI.fin.best) : null,
      btp: btpParts(parse(env.get("speakup-btp-v1"))),
      ai: aiParts(parse(env.get("speakup-ai-v1"))),
    };
  }

  /** Beyond the Podium (js/btp.js, key speakup-btp-v1): only mastery that js/btp.js recorded after checking
      the student's answers counts. Anything malformed (wrong shape, not a real date) is ignored, never fatal.
      A browser record is a motivational learning record, not a secure or official grade. */
  const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
  function btpParts(rec) {
    const out = {};
    if (!rec || typeof rec !== "object" || rec.v !== 1 || !rec.eps || typeof rec.eps !== "object" || Array.isArray(rec.eps)) return out;
    for (const [id, ep] of Object.entries(rec.eps)) {
      if (!/^ep\d{1,2}$/.test(id) || !ep || typeof ep !== "object") continue;
      const m = ep.mastered && typeof ep.mastered === "object" ? ep.mastered : {};
      const ok = k => typeof m[k] === "string" && ISO_DAY.test(m[k]) && !isNaN(new Date(m[k] + "T12:00:00Z"));
      out[id] = { detective: ok("detective"), change: ok("change"), apply: ok("apply") };
    }
    return out;
  }

  /** AI Coaching Studio (js/aistudio.js, key speakup-ai-v1): same rule as Beyond the Podium. Only the dated
      `mastered` parts that js/aistudio.js recorded after checking answers count; copying prompts or visiting
      pages records nothing. */
  const AI_PARTS = ["ethics", "ownership", "factcheck"];
  function aiParts(rec) {
    const out = {};
    if (!rec || typeof rec !== "object" || rec.v !== 1 || !rec.mastered || typeof rec.mastered !== "object" || Array.isArray(rec.mastered)) return out;
    for (const k of AI_PARTS) { const d = rec.mastered[k]; out[k] = typeof d === "string" && ISO_DAY.test(d) && !isNaN(new Date(d + "T12:00:00Z")); }
    return out;
  }

  /** Update the achievement record. Returns { store, newly } — newly = badges earned for the first time now. */
  function track(cfg, sources, store, today) {
    const s = JSON.parse(JSON.stringify(store && store.v === 1 ? store : { v: 1, seen: {}, improved: {}, earned: {} }));
    const checks = [...Object.entries(sources.quiz).map(([u, b]) => [`quiz:${u}`, b]), ...Object.entries(sources.test).map(([u, b]) => [`test:${u}`, b])];
    for (const [k, best] of checks) {
      if (!s.seen[k]) s.seen[k] = { first: best, best };
      else { if (best > s.seen[k].best) s.seen[k].best = best; if (s.seen[k].best > s.seen[k].first && !s.improved[k]) s.improved[k] = today; }
    }
    const res = evaluate(cfg, sources, s), newly = [];
    for (const r of res) if (r.met && r.status === "active" && !s.earned[r.id]) { s.earned[r.id] = today; newly.push(r.id); }
    return { store: s, newly };
  }

  function part(c, src, store, M) {
    const label = c.label;
    switch (c.type) {
      case "quiz": case "test": {
        const v = src[c.type][c.unit];
        return { label, done: v != null && v >= c.min, have: v == null ? null : v, need: c.min, kind: "score" };
      }
      case "lab": {
        const L = src.labs[c.lab] || {}, have = c.acts.filter(a => L[a]).length;
        return { label, done: have === c.acts.length, have, need: c.acts.length, kind: "count", missing: c.acts.filter(a => !L[a]) };
      }
      case "labDone": {
        const have = c.acts.filter(a => src.plabDone[a]).length;
        return { label, done: have === c.acts.length, have, need: c.acts.length, kind: "count" };
      }
      case "listenFinal": return { label, done: src.listenFinal != null && src.listenFinal >= c.min, have: src.listenFinal, need: c.min, kind: "score" };
      case "audCheck": return { label, done: src.audBest != null && src.audBest >= c.min, have: src.audBest, need: c.min, kind: "of10" };
      case "btp": { const e = (src.btp || {})[c.episode] || {}; return { label, done: !!e[c.part], have: e[c.part] ? 1 : 0, need: 1, kind: "step" }; }
      case "ai": { const v = !!(src.ai || {})[c.part]; return { label, done: v, have: v ? 1 : 0, need: 1, kind: "step" }; }
      case "improved": { const have = Object.keys((store && store.improved) || {}).length; return { label, done: have >= c.count, have: Math.min(have, c.count), need: c.count, kind: "count" }; }
      default: return { label, done: false, have: null, need: null, kind: c.type }; // teacher, external: never met online
    }
  }

  /** Every badge with its state: earned | progress | notstarted | pending (teacher) | coming (not built yet). */
  function evaluate(cfg, sources, store) {
    return cfg.badges.map(b => {
      const parts = b.criteria.map(c => part(c, sources, store, cfg.mastery));
      const met = b.status === "active" && parts.every(p => p.done);
      const earnedOn = store && store.earned && store.earned[b.id] || null;
      const started = parts.some(p => p.done || (p.have != null && p.have !== 0));
      const state = b.status === "pending-verification" ? "pending" : b.status === "coming" ? "coming"
        : (met || earnedOn) ? "earned" : started ? "progress" : "notstarted";
      return { id: b.id, badge: b, status: b.status, state, met, earnedOn, parts };
    });
  }

  /** Learning points: each mastered thing counts once, recalculated every time (no duplicates possible). */
  function points(cfg, sources, results) {
    const P = cfg.points;
    const lab = Object.values(sources.labs).reduce((n, L) => n + Object.values(L).filter(Boolean).length, 0) + Object.values(sources.plabDone).filter(Boolean).length;
    const quiz = Object.values(sources.quiz).filter(v => v >= cfg.mastery).length;
    const test = Object.values(sources.test).filter(v => v >= cfg.mastery).length;
    const badges = results.filter(r => r.state === "earned").length;
    // Each Beyond the Podium mastery part counts once, like a lab activity.
    const btp = Object.values(sources.btp || {}).reduce((n, e) => n + ["detective", "change", "apply"].filter(k => e[k]).length, 0);
    const ai = AI_PARTS.filter(k => (sources.ai || {})[k]).length; // each AI Coaching Studio skill once
    return { total: (lab + btp + ai) * P.labActivity + quiz * P.quiz + test * P.test + badges * P.badge, lab, btp, ai, quiz, test, badges };
  }

  /* ---------- badge artwork: one medallion design, a glyph per badge ---------- */
  const GLYPH = {
    compass: "M12 3a9 9 0 100 18 9 9 0 000-18zm3.5 5.5l-2 5-5 2 2-5z",
    magnifier: "M10 4a6 6 0 104.5 10l4.2 4.2 1.4-1.4-4.2-4.2A6 6 0 0010 4zm0 2a4 4 0 110 8 4 4 0 010-8z",
    climb: "M4 19h4v-4h4v-4h4V7h4V5h-6v4h-4v4H6v4H4z",
    ear: "M12 3a7 7 0 00-7 7h2a5 5 0 0110 0c0 2-1 3-2.5 4.2-1.2 1-2 2-2 3.3a1.5 1.5 0 01-3 0H7.5a3.5 3.5 0 007 0c0-.6.5-1.1 1.6-2 1.7-1.4 2.9-2.9 2.9-5.5a7 7 0 00-7-7zm0 4a3 3 0 00-3 3h2a1 1 0 112 0c0 .8-.6 1.3-1.3 1.8l1.1 1.6C14 12.6 15 11.6 15 10a3 3 0 00-3-3z",
    audience: "M7 7a2.5 2.5 0 110 5 2.5 2.5 0 010-5zm10 0a2.5 2.5 0 110 5 2.5 2.5 0 010-5zM12 9a2.5 2.5 0 110 5 2.5 2.5 0 010-5zM2 19c0-2.8 2.2-5 5-5 1 0 1.8.3 2.6.7A6 6 0 006 19zm16 0a6 6 0 00-3.6-4.3c.8-.4 1.6-.7 2.6-.7 2.8 0 5 2.2 5 5zM7 20c0-2.8 2.2-5 5-5s5 2.2 5 5z",
    document: "M6 3h8l4 4v14H6zm2 2v14h8V8h-3V5zm2 6h4v2h-4zm0 4h4v2h-4z",
    scale: "M11 4h2v2h5l3 7a4 4 0 01-8 0l2.7-6H13v12h4v2H7v-2h4V7H8.3L11 13a4 4 0 01-8 0l3-7h5zM6 8.5L4.3 13h3.4zm12 0L16.3 13h3.4z",
    spark: "M12 2l2.2 6.3L21 9.5l-5.2 4.1L17.6 21 12 17.2 6.4 21l1.8-7.4L3 9.5l6.8-1.2z",
    gears: "M10 3h4l.5 2.5 1.8.8 2.2-1.4 2.8 2.8-1.4 2.2.8 1.8L21 12v4l-2.5.5-.8 1.8 1.4 2.2-2.8 2.8-2.2-1.4-1.8.8L14 21h-4l-.5-2.5-1.8-.8-2.2 1.4-2.8-2.8 1.4-2.2-.8-1.8L3 14v-4l2.5-.5.8-1.8-1.4-2.2 2.8-2.8 2.2 1.4 1.8-.8zm2 6a3 3 0 100 6 3 3 0 000-6z",
    megaphone: "M3 10v4h3l7 4V6L6 10zm12-1.5v7a4 4 0 000-7zM6 15l1.5 5h2.2L8.3 15z",
    mic: "M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3zM6 11h2a4 4 0 008 0h2a6 6 0 01-5 5.9V20h3v2H8v-2h3v-3.1A6 6 0 016 11z",
    book: "M4 5c2.5-1 5-1 8 1 3-2 5.5-2 8-1v14c-2.5-1-5-1-8 1-3-2-5.5-2-8-1zm2 1.6v10c1.8-.4 3.5-.1 5 .7v-10c-1.5-.9-3.2-1.1-5-.7zm12 0c-1.8-.4-3.5-.2-5 .7v10c1.5-.8 3.2-1.1 5-.7z",
    crown: "M3 7l5 4 4-6 4 6 5-4-2 11H5zm3 13h12v2H6z",
    bridge: "M2 16h20v2H2zm2-6a8 8 0 0116 0v6h-2v-4h-2v4h-2v-5h-4v5H8v-4H6v4H4z",
    lightbulb: "M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2zM9 18h6v2H9zm1 3h4v1h-4z",
    quote: "M5 6h6v6H8c0 2 1 3 3 3v3c-4 0-6-2.5-6-6zm8 0h6v6h-3c0 2 1 3 3 3v3c-4 0-6-2.5-6-6z",
  };
  const LEVEL_TOKEN = { knowledge: "var(--u2)", applied: "var(--u5)", communication: "var(--u6)" };
  /** A medallion. Decorative (aria-hidden): the badge's name and state are always written next to it. */
  function medallion(b, state) {
    const on = state === "earned", c = on ? LEVEL_TOKEN[b.level] : "var(--muted)";
    const ring = state === "pending" ? ' stroke-dasharray="5 4"' : "";
    return `<svg class="sl2-medal is-${state}" viewBox="0 0 64 64" width="64" height="64" aria-hidden="true" focusable="false">
      <circle cx="32" cy="32" r="29" fill="${on ? c : "none"}" fill-opacity="${on ? 0.14 : 0}" stroke="${c}" stroke-width="${on ? 4 : 2.5}"${ring}/>
      <circle cx="32" cy="32" r="22" fill="none" stroke="${c}" stroke-opacity=".45" stroke-width="1.5"/>
      <g transform="translate(20 20)"><path d="${GLYPH[b.glyph] || GLYPH.spark}" fill="${c}"/></g>
      ${state === "coming" ? '<g transform="translate(43 43)"><circle r="9" cx="9" cy="9" fill="var(--bg)" stroke="var(--muted)" stroke-width="1.5"/><path d="M5.5 8.5V7a3.5 3.5 0 017 0v1.5H13V14H5V8.5zm2 0h3V7a1.5 1.5 0 00-3 0z" fill="var(--muted)"/></g>' : ""}
    </svg>`;
  }

  root.SLAchieve = { KEY, collect, track, evaluate, points, medallion, GLYPH };
})(typeof window !== "undefined" ? window : globalThis);
