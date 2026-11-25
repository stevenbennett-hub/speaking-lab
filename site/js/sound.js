/* Speak Up | The Speaking Lab — Slice 12 central audio manager and sound/motion preferences.
   The only place in the site that plays interface or achievement sounds. Rules:
   - Off by default. A student turns sound on in Preferences (that click is the intentional interaction); after a page
     load nothing plays until the student has interacted with the page again (browser autoplay rules are respected).
   - Separate switches: interface sounds and learning-feedback/achievement sounds, plus a volume setting.
   - Never plays on page load, while scrolling, hovering or typing, over a playing video or recording, in presentation
     mode, or on top of another sound (one sound at a time; an achievement sound may replace an interface sound).
   - Files are local (site/media/sfx/). The manifest is requested only when a sound is about to play, and a file is
     requested only when the manifest says it is present. Missing or broken files fail silently.
   - No ElevenLabs (or any other) API calls, accounts or keys: the files were generated once and are hosted here.
   Preferences live in speakup-prefs-v1 (this browser only; included in the student's own backup file). */
(function (root) {
  "use strict";
  const KEY = "speakup-prefs-v1";
  const DEFAULTS = { v: 1, sound: false, ui: false, ach: false, volume: 60, anim: true, motion: "device" };
  // Which file each cue plays and which switch it belongs to.
  const CUES = {
    ui: ["ui-click", "ui"], open: ["studio-open", "ui"], backup: ["backup-success", "ui"],
    correct: ["correct-answer", "ach"], tryagain: ["try-again", "ach"], complete: ["activity-complete", "ach"],
    "badge-knowledge": ["badge-knowledge", "ach"], "badge-applied": ["badge-applied", "ach"], "badge-verified": ["badge-verified", "ach"],
    "badge-capstone": ["badge-capstone", "ach"], unlock: ["unit-unlock", "ach"],
  };
  // An achievement sound may replace learning feedback, which may replace an interface sound; never the other way.
  const PRIORITY = name => (/^badge-/.test(name) ? 3 : CUES[name][1] === "ach" ? 2 : 1);
  const store = (() => { try { return root.localStorage; } catch (e) { return null; } })();
  function prefs() {
    let p = null; try { p = JSON.parse((store && store.getItem(KEY)) || "null"); } catch (e) { p = null; }
    const out = Object.assign({}, DEFAULTS);
    if (p && typeof p === "object") {
      for (const k of ["sound", "ui", "ach", "anim"]) if (typeof p[k] === "boolean") out[k] = p[k];
      if (typeof p.volume === "number" && p.volume >= 0 && p.volume <= 100) out.volume = Math.round(p.volume);
      if (p.motion === "device" || p.motion === "reduce") out.motion = p.motion;
    }
    return out;
  }
  function set(patch) {
    const p = Object.assign(prefs(), patch || {});
    try { if (store) store.setItem(KEY, JSON.stringify(p)); } catch (e) {}
    if (!p.sound) stop();
    apply(p);
    return p;
  }
  /** Quiet Classroom: every sound off, visual feedback kept. */
  const quiet = () => set({ sound: false, ui: false, ach: false });

  /* ---------- motion ---------- */
  const deviceReduced = () => { try { return !!(root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; } };
  const reducedMotion = () => prefs().motion === "reduce" || deviceReduced();
  const animations = () => prefs().anim && !reducedMotion();
  function apply(p) {
    p = p || prefs();
    const d = root.document && root.document.documentElement; if (!d) return;
    d.dataset.motion = p.motion === "reduce" ? "reduce" : "device";
    d.dataset.anim = p.anim ? "on" : "off";
    const b = root.document.getElementById("soundBtn"); if (b) b.hidden = !p.sound; // the header mute button shows only while sound is on
  }

  /* ---------- playback ---------- */
  let armed = false, manifest = null, loading = null, current = null, currentPri = 0;
  const broken = {};
  // Any real interaction after the page loads arms playback (never a timer or page load).
  if (root.document) ["pointerdown", "keydown"].forEach(t => root.document.addEventListener(t, () => { armed = true; }, { capture: true, passive: true }));
  function loadManifest() {
    if (manifest) return Promise.resolve(manifest);
    if (!loading) loading = (root.fetch ? root.fetch("media/sfx/manifest.json", { cache: "no-cache" }).then(r => (r.ok ? r.json() : null)) : Promise.resolve(null))
      .catch(() => null).then(m => { manifest = m && Array.isArray(m.files) ? m : { files: [] }; return manifest; });
    return loading;
  }
  const busyMedia = () => { if (!root.document) return false; return [...root.document.querySelectorAll("video, audio:not([data-slsfx])")].some(m => !m.paused && !m.ended && m.currentTime > 0); };
  const presenting = () => !!(root.document && root.document.body && root.document.body.classList.contains("sl2-present"));
  /** Why a cue would not play right now (null = it may play). Used by tests and by cue(). */
  function blocked(name, p) {
    p = p || prefs(); const c = CUES[name];
    if (!c) return "unknown";
    if (!p.sound) return "off";
    if (!p[c[1]]) return "channel-off";
    if (!armed) return "no-interaction";
    if (busyMedia()) return "media-playing";
    if (presenting()) return "presenting";
    if (current && !current.ended && !current.paused && currentPri >= PRIORITY(name)) return "busy";
    return null;
  }
  function stop() { if (current) { try { current.pause(); } catch (e) {} } current = null; currentPri = 0; }
  /** Play a cue if the student's preferences and the situation allow it. Returns a promise of true/false. */
  function cue(name) {
    const p = prefs(); if (blocked(name, p)) return Promise.resolve(false);
    const [file, ch] = CUES[name];
    return loadManifest().then(m => {
      const f = m.files.find(x => x.id === file && x.present === true);
      if (!f || broken[file] || blocked(name, prefs())) return false;
      stop();
      const a = new root.Audio("media/sfx/" + f.file); a.setAttribute("data-slsfx", ""); a.preload = "auto";
      a.volume = Math.max(0, Math.min(1, prefs().volume / 100));
      a.addEventListener("error", () => { broken[file] = true; }, { once: true });
      current = a; currentPri = PRIORITY(name);
      const pr = a.play(); return pr && pr.then ? pr.then(() => true, () => false) : true;
    }).catch(() => false);
  }
  /** Preferences "Try it" button: the click is the intentional interaction. */
  const sample = name => { armed = true; return cue(name); };
  /* ---------- learning-lab feedback (Slice 12 refinement) ----------
     The existing labs show each checked answer as .pl-fb.ok / .pl-fb.no (the Respectful Audience Lab also uses
     .au-dfb). When a student clicks or changes something inside a lab, the lab's result counts before and just after
     are compared: one more "ok" plays correct-answer, otherwise one more "no" plays try-again. Re-renders, language
     changes and page loads add nothing (no student action), so they never sound. The labs themselves are unchanged. */
  const FB_OK = ".pl-fb.ok, .au-dfb.ok", FB_NO = ".pl-fb.no, .au-dfb.no";
  const fbCount = el => [el.querySelectorAll(FB_OK).length, el.querySelectorAll(FB_NO).length];
  function labFeedback(e) {
    const t = e.target, pane = t && t.closest && t.closest(".labpane");
    if (!pane || !t.closest("button, input, select, label, [role=button], [draggable], [tabindex]")) return;
    const before = fbCount(pane);
    root.setTimeout(() => { const after = fbCount(pane); if (after[0] > before[0]) cue("correct"); else if (after[1] > before[1]) cue("tryagain"); }, 80);
  }
  if (root.document) { root.document.addEventListener("click", labFeedback, true); root.document.addEventListener("change", labFeedback, true); }

  /* ---------- unit unlock (Slice 12 refinement) ----------
     Plays once, the first time a student deliberately opens a unit that became available after they started using the
     site. Units already open the first time this runs are recorded silently; a page load never plays it (not armed);
     each unit is recorded once in speakup-unlock-v1, so it never repeats. */
  const UNLOCK = "speakup-unlock-v1";
  function unitOpened(id, openIds, intentional) {
    let r = null; try { r = JSON.parse((store && store.getItem(UNLOCK)) || "null"); } catch (e) { r = null; }
    const save = x => { try { if (store) store.setItem(UNLOCK, JSON.stringify(x)); } catch (e) {} };
    if (!r || r.v !== 1 || !Array.isArray(r.seen)) { save({ v: 1, seen: [...new Set(openIds.concat(id).filter(x => x != null))].sort() }); return false; } // first run: silent
    if (id == null) return false;
    if (r.seen.includes(id)) return false;
    r.seen = [...new Set(r.seen.concat(id))].sort(); save(r);
    if (intentional) cue("unlock");
    return !!intentional;
  }

  root.SLSound = { KEY, UNLOCK, DEFAULTS, unitOpened, labFeedback, CUES, prefs, set, quiet, cue, sample, stop, blocked, reducedMotion, animations, apply, _arm: v => { armed = v !== false; }, _manifest: m => { manifest = m; } };
  apply();
  if (root.document) root.document.addEventListener("click", e => { const b = e.target.closest && e.target.closest("#soundBtn"); if (b) { quiet(); const pf = root.document.querySelector("header a.prefbtn"); if (pf) pf.focus(); } });
})(typeof window !== "undefined" ? window : globalThis);
