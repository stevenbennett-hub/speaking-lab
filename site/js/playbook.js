/* Speak Up | The Speaking Lab — Instructor Playbook (teacher-facing; Lesson Manager → Playbook).
   Data: site/data/playbook/unit-N.json, loaded only when a teacher opens the Playbook (students never load it).
   The playbook EXTENDS lessons.json by lesson key (wWWdD): objectives, success criteria, journals and AI permissions
   are always read from the lesson and journal data (the Lesson Manager's drafts on this browser), never copied.
   Meeting plans are computed from the live schedule (odd/even group, Wednesdays, holidays, overrides): a 90-minute
   block opens with the journal, then the planned days that fall in it are taught as segments; compose() fits their
   core activities into the block, shortens them when needed, gives speeches the remaining time, and adds stretch
   activities when there is room. Teacher notes are kept in this browser only (speakup-teacher-notes-v1).
   Views (Slice 11 refinements): Quick Teach is the default daily plan (one printable page), with the full plan, a
   concise 1–2 page substitute plan and the editor all built from the same data. Edits are Lesson Manager drafts
   (exported from Publish); planning settings (class size, minutes per speaker) live in speakup-teacher-planning-v1.
   Nothing here records or sends student information. */
(function (root) {
  "use strict";
  const PHASES = ["learn", "observe", "investigate", "practice", "perform", "reflect"];
  const NOTES = "speakup-teacher-notes-v1";
  const sum = a => a.reduce((n, x) => n + x, 0);
  const budgetOf = pb => { const b = (pb && pb.block) || {}; return (b.minutes || 90) - (b.journal || 15) - (b.transitions || 3); };

  /** Fit the segments of one block. keys: the planned days in this meeting (in order); taught: keys already taught
      at an earlier meeting of this unit for this group (a repeat becomes 10 minutes of review). */
  function compose(pb, keys, taught, opts) {
    taught = taught || []; opts = opts || {};
    const segs = keys.map(k => {
      const ls = pb && pb.lessons && pb.lessons[k];
      if (!ls) return { key: k, missing: true, items: [] };
      if (taught.includes(k)) return { key: k, repeat: true, title: ls.title, items: [{ key: k, i: -1, phase: "reflect", title: "Review and catch-up for absent students", min: 10, core: true, review: true }] };
      return { key: k, title: ls.title, items: ls.phases.map((ph, i) => ({ key: k, i, phase: ph.phase, title: ph.title, min: ph.min, short: ph.short || null, core: !!ph.core, fill: !!ph.fill, video: ph.video || null, before: !!(ph.before && opts.first) })) };
    });
    const budget = budgetOf(pb), items = segs.flatMap(s => s.items);
    const core = items.filter(x => x.core), fills = core.filter(x => x.fill), fixed = core.filter(x => !x.fill);
    fixed.forEach(x => { x.plan = x.min; });
    let need = sum(fixed.map(x => x.plan)) + sum(fills.map(x => x.min));
    const shortened = [];
    if (need > budget) {
      const cands = fixed.filter(x => x.short && x.short < x.min).sort((a, b) => (b.min - b.short) - (a.min - a.short));
      for (const x of cands) { if (need <= budget) break; const save = Math.min(x.min - x.short, need - budget); x.plan = x.min - save; need -= save; shortened.push(x); }
    }
    let free = Math.max(0, budget - need);
    fills.forEach(x => { x.plan = x.min; });
    if (fills.length && free > 0) { const per = Math.floor(free / fills.length), rest = free % fills.length; fills.forEach((x, n) => { x.plan += per + (n < rest ? 1 : 0); }); free = 0; }
    const added = [], deferred = [];
    for (const x of items.filter(y => !y.core)) { if (free >= x.min) { x.plan = x.min; free -= x.min; added.push(x); } else deferred.push(x); }
    const all = items.filter(x => x.plan > 0), per = opts.perSpeaker || 3;
    // First class day only: onboarding marked `before` happens before the journal so students know where to find it.
    const pre = all.filter(x => x.before), plan = all.filter(x => !x.before);
    return { budget, segs, pre, plan, over: Math.max(0, need - budget), free, shortened, added, deferred, perSpeaker: per,
      speechMinutes: sum(fills.map(x => x.plan)), speakers: Math.floor(sum(fills.map(x => x.plan)) / per) };
  }

  /** Lab id → the site's existing lab link. */
  const LAB_HASH = { rlab: "lab-research", obuild: "outline-builder", plab: "lab-persuasion", mlab: "lab-model", nvlab: "lab-body-language", nvclab: "lab-nonverbal", glab: "lab-group", implab: "lab-impromptu", storylab: "lab-story", audlab: "lab-audience", listenlab: "lab-listening" };
  const ROUTE_LABEL = { "#rubrics": "Rubrics", "#speeches": "Voices of Change", "#resources": "Resources", "#videos": "Example videos", "#/btp/1": "Beyond the Podium, Episode 1", "#/btp/1/change": "Beyond the Podium: Change the Conversation", "#/ai/ownership": "AI Coaching Studio: Cognitive Ownership", "#/ai/disclosure": "AI-use disclosure", "#/today": "Today's Lesson" };
  /** Every link for one activity: viewing guide and video, lab, reading, or site page. labName(id) and chapter(n) come from the page. */
  function linksFor(pb, p, env) {
    env = env || {}; const out = [];
    const v = p.video && (pb.videos || []).find(y => y.id === p.video);
    if (v) { out.push({ kind: "guide", label: "Viewing guide", href: `#/teacher/playbook/${pb.unit}/videos#${v.id}` }); out.push({ kind: "video", label: "Video", href: v.url, ext: true }); }
    if (p.lab && LAB_HASH[p.lab]) out.push({ kind: "lab", label: (env.labName && env.labName(p.lab)) || p.lab, href: "#" + LAB_HASH[p.lab] });
    if (p.read) { const c = env.chapter && env.chapter(p.read); out.push({ kind: "read", label: `Textbook Ch. ${p.read}${c ? ": " + c.title : ""}`, href: c ? c.url : "#resources", ext: !!c }); }
    if (p.route) out.push({ kind: "page", label: ROUTE_LABEL[p.route] || (/^#\/unit\/\d\/guide$/.test(p.route) ? "Unit guide (assignment, rubric, reading check)" : "Open"), href: p.route });
    return out;
  }
  /** Planning time per speaker (minutes) for the level: the speech, written feedback, and changing speakers. */
  function perSpeaker(pb, settings, college) {
    const d = (pb && pb.overview && pb.overview.speech) || { minutes: 2, colMinutes: 3, feedback: 0.5, transition: 0.5 }, s = settings || {};
    const num = (v, f) => (typeof v === "number" && v >= 0 && v <= 30 ? v : f);
    return num(college ? s.colMinutes : s.minutes, college ? d.colMinutes : d.minutes) + num(s.feedback, d.feedback) + num(s.transition, d.transition);
  }
  /** Can the unit's scheduled speech time hold the whole class? blocks: compose() results. Never changes the schedule. */
  function capacity(blocks, classSize, per) {
    const slots = sum(blocks.map(c => Math.floor((c.speechMinutes || 0) / per)));
    const minutes = sum(blocks.map(c => c.speechMinutes || 0));
    return { minutes, slots, per, size: classSize || null, fits: classSize ? slots >= classSize : null, short: classSize ? Math.max(0, classSize - slots) : 0 };
  }
  /** Save a teacher's edit of one planned day into a draft copy. An approved day goes back to draft when its text changes,
      unless the teacher chose "approved" in this same save (the Lesson Manager's own rule). Never approves anything. */
  function applyLessonEdit(pb, key, next, chosenStatus) {
    const out = JSON.parse(JSON.stringify(pb)), before = out.lessons[key] || {};
    const strip = o => { const c = JSON.parse(JSON.stringify(o || {})); delete c.status; return JSON.stringify(c); };
    let status = chosenStatus === "approved" ? "approved" : "draft";
    if (before.status === "approved" && status === "approved" && strip(before) !== strip(next)) status = "draft";
    out.lessons[key] = { ...next, status };
    return out;
  }
  /** Save verified viewing segments: times only when the teacher confirms they previewed the video. */
  function applyVideoEdit(pb, id, fields, confirmed) {
    const out = JSON.parse(JSON.stringify(pb)), v = out.videos.find(x => x.id === id);
    if (!v) throw new Error("Unknown video.");
    const t = x => (x || "").trim() || null, ok = x => x == null || /^\d{1,2}:\d{2}(:\d{2})?$/.test(x);
    const start = t(fields.start), end = t(fields.end);
    if (!ok(start) || !ok(end)) throw new Error("Use minutes:seconds, for example 1:05.");
    if ((start || end) && !confirmed) throw new Error("Check the box to confirm you previewed the video before saving times.");
    Object.assign(v, fields.text || {});
    v.segment = { start, end, verified: !!((start || end) && confirmed), note: (fields.note != null ? fields.note : v.segment.note) };
    return out;
  }
  const stable = x => JSON.stringify(x, null, 2) + "\n";
  /** Check a playbook file against the lesson data (also run by the tests). */
  function validate(pb, ctx) {
    const errors = [], warnings = [], err = (w, m) => errors.push({ where: w, msg: m }), warn = (w, m) => warnings.push({ where: w, msg: m });
    if (!pb || pb.schema !== 1) { err("file", "schema must be 1"); return { errors, warnings }; }
    const unit = (ctx.units || []).find(u => u.id === pb.unit);
    if (!unit) { err("file", `unknown unit ${pb.unit}`); return { errors, warnings }; }
    const keys = unit.weeks.flatMap(w => [1, 2, 3, 4, 5].map(d => `w${String(w).padStart(2, "0")}d${d}`));
    const vids = new Set((pb.videos || []).map(v => v.id));
    const time = t => t == null || /^\d{1,2}:\d{2}(:\d{2})?$/.test(t);
    for (const v of pb.videos || []) {
      if (!/^https:\/\//.test(v.url || "")) err(v.id, "video url must be https");
      if (/autoplay/i.test(v.url || "")) err(v.id, "no autoplay");
      if (!v.segment || !time(v.segment.start) || !time(v.segment.end)) err(v.id, "segment start/end must be m:ss or blank");
      else if (v.segment.verified !== true && (v.segment.start || v.segment.end)) err(v.id, "timestamps entered must be marked verified (preview the video first)");
      for (const f of ["purpose", "before", "during", "after", "practice", "check", "language", "alternative"]) if (!v[f]) err(v.id, `missing ${f}`);
    }
    for (const k of keys) if (!pb.lessons[k]) err(k, "planned day has no playbook entry");
    for (const [k, l] of Object.entries(pb.lessons || {})) {
      if (!keys.includes(k)) err(k, "not a planned day of this unit");
      if (ctx.lessons && !ctx.lessons.days[k]) err(k, "no such lesson in lessons.json");
      for (const f of ["title", "essential", "formative", "exit", "sub"]) if (!l[f]) err(k, `missing ${f}`);
      if (l.status != null && !["draft", "approved"].includes(l.status)) err(k, "status must be draft or approved");
      for (const f of ["learn", "lang", "success", "prompt"]) if (f in l) err(k, `${f} belongs in lessons.json / journals.json, not the playbook`);
      if (!Array.isArray(l.phases) || !l.phases.some(p => p.core)) err(k, "needs at least one core phase");
      for (const p of l.phases || []) {
        if (!PHASES.includes(p.phase)) err(k, `unknown phase ${p.phase}`);
        if (!(Number.isInteger(p.min) && p.min > 0 && p.min <= 90)) err(k, `bad minutes in "${p.title}"`);
        if (p.short != null && !(Number.isInteger(p.short) && p.short > 0 && p.short < p.min)) err(k, `short must be less than min in "${p.title}"`);
        if (p.video && !vids.has(p.video)) err(k, `unknown video ${p.video}`);
        if (!Array.isArray(p.teacher) || !p.teacher.length) err(k, `"${p.title}" needs teacher steps`);
        if (p.lab != null && !LAB_HASH[p.lab]) err(k, `unknown lab ${p.lab} in "${p.title}"`);
        if (p.route != null && !/^#[\w/.-]+$/.test(p.route)) err(k, `link in "${p.title}" must be a site link starting with #`);
        if (p.read != null && !(Number.isInteger(p.read) && p.read >= 1 && p.read <= 14)) err(k, `reading in "${p.title}" must be a chapter number 1–14`);
      }
      for (const f of ["ml", "access", "extend", "misconceptions"]) if (!Array.isArray(l[f]) || !l[f].length) warn(k, `no ${f}`);
    }
    for (const r of pb.resources || []) if (!r.id || !r.title || !r.use || !Array.isArray(r.lines) || !r.lines.length) err(r.id || "resource", "resource needs id, title, use and lines");
    if (/student (name|id)|disab|IEP|504/i.test(JSON.stringify(pb.resources || []))) err("resources", "resources never collect names, IDs or disability information");
    if (pb.flex && ctx.journals && !ctx.journals.some(j => j.id === pb.flex.journal && j.flex)) err("flex", "flex journal not found");
    if (!["draft", "approved"].includes(pb.status)) err("file", "status must be draft or approved");
    const sp = (pb.overview || {}).speech;
    if (sp) for (const f of ["minutes", "colMinutes", "feedback", "transition"]) if (!(typeof sp[f] === "number" && sp[f] >= 0 && sp[f] <= 30)) err("overview", `speech.${f} must be a number of minutes`);
    return { errors, warnings };
  }

  /* ---------- Slice 12: one authoritative AI permission ----------
     The permission students see is the lesson's own setting (lessons.json "ai") or, when a lesson has none, the class
     default (ai-permissions.json). Two lessons in one block: the more restrictive wins (SL2.aiOf). The playbook's "ai" text
     is a teaching note only. A note that says "no AI" while the setting allows AI is flagged for the teacher, never changed. */
  // A note that claims AI is not allowed (as opposed to "no AI activity is planned", which is consistent with any permission).
  const AI_STRICT = /\bno ai use\b|\bnot applicable\b|\bai (is )?not (permitted|allowed)\b|\bdo not use ai\b|\bno ai today\b/i;
  function aiFor(days, aiperm, key) {
    const ls = days && days[key], lv = ls && ls.ai && ls.ai.level, levels = (aiperm && aiperm.levels) || [];
    const id = levels.some(l => l.id === lv) ? lv : aiperm.default;
    return { id, set: !!(lv && id === lv), level: levels.find(l => l.id === id) || null };
  }
  function aiConflicts(pb, days, aiperm) {
    return Object.keys(pb.lessons || {}).map(k => ({ key: k, note: pb.lessons[k].ai || "", ...aiFor(days, aiperm, k) }))
      .filter(x => AI_STRICT.test(x.note) && x.level && x.level.rank > 0);
  }

  /* ---------- Slice 12: substitute timeline for the whole 90-minute block ----------
     Journal and stand and share (15), the day's substitute-suitable activities (or their written alternatives), then
     meaningful independent practice from the unit's existing labs, readings and rehearsal until the closing routine:
     exit reflection with a self-check (5) and final procedures (3). Always exactly 90 minutes; never formal speech grading. */
  const SUB_CLOSE = { exit: 5, final: 3 };
  /** The exit reflection for a block's last planned day. overview.exitFromJournal lets a skipped journal's prompt become
      the exit (e.g. Journal 3 in the shortened spring schedule); journal numbering is never touched. */
  function exitFor(pb, key, usedJournals, journals) {
    const l = pb.lessons[key]; if (!l) return null;
    const rule = ((pb.overview || {}).exitFromJournal || []).find(r => r.lesson === key);
    if (rule && !(usedJournals || []).includes(rule.journal)) {
      const j = (journals || []).find(x => x.id === rule.journal);
      if (j && j.prompt && j.prompt.en) return { text: j.prompt.en, from: rule.journal };
    }
    return { text: l.exit || "", from: null };
  }
  /** Extension work a substitute can use for one meeting, limited to what the class has already been taught: the labs and
      readings linked in this or earlier planned days, plus the unit's starter labs (listening, audience) and, before
      any reading is assigned, its first reading, and speech
      rehearsal only once the speech has been assigned (overview.speechAssigned). */
  function subExtensions(pb, keysSoFar, unit) {
    const days = [...new Set(keysSoFar)].map(k => pb.lessons[k]).filter(Boolean), o = pb.overview || {};
    let labs = [...new Set(days.flatMap(l => l.phases.map(p => p.lab).filter(Boolean)))];
    let reads = [...new Set(days.flatMap(l => l.phases.map(p => p.read).filter(Boolean)))].sort((a, b) => a - b);
    labs = [...new Set(labs.concat((o.subStarter || {}).labs || []))]; // listening and audience practice suits every Unit 1 day
    if (!reads.length && unit && (unit.reads || []).length) reads = [unit.reads[0]];
    const rehearsal = !!o.speechAssigned && keysSoFar.some(k => k >= o.speechAssigned);
    return { labs, reads, rehearsal };
  }
  function subTimeline(pb, segs, o) {
    o = o || {};
    const total = (pb.block && pb.block.minutes) || 90, j = (pb.block && pb.block.journal) || 15, rows = [];
    let t = 0;
    const add = (min, kind, title, items) => { if (min <= 0) return; rows.push({ from: t, to: t + min, kind, title, items: (items || []).filter(Boolean) }); t += min; };
    add(j, "journal", o.journal ? "Daily Learning Journal and stand and share" : "Opening", []);
    const room = total - j - SUB_CLOSE.exit - SUB_CLOSE.final;
    let used = 0;
    for (const l of segs) {
      const core = sum(l.phases.filter(p => p.core && !p.before && !p.fill).map(p => p.short || p.min));
      const want = l.sub && l.sub.ok ? Math.max(core, 10) : Math.max(Math.min(core, 25), 10);
      const min = Math.min(want, room - used); if (min <= 0) break;
      add(min, l.sub && l.sub.ok ? "lesson" : "alternative", l.title, (l.sub && l.sub.plan) || []);
      used += min;
    }
    let rest = room - used;
    if (rest > 0) {
      const second = rest >= 25 ? Math.round(rest * 0.4 / 5) * 5 : 0, first = rest - second;
      add(first, "practice", "Independent practice in Learning Labs", [o.labs && o.labs.length ? `Students open Today's Lesson and work in: ${o.labs.join("; ")}. Progress saves in their browser; nothing is graded.` : "Students continue the activities linked on Today's Lesson.", "Early finishers: another lab from the list, or the unit's textbook reading."]);
      if (second) add(second, o.speechWeek ? "rehearsal" : "reading", o.speechWeek ? "Speech rehearsal and reading" : "Reading and vocabulary", [o.speechWeek ? "Students who have not presented rehearse with a partner using their note card and a timer (practice only: no scoring, no feedback forms)." : "", o.reads && o.reads.length ? `Textbook: ${o.reads.join("; ")} (linked on Today's Lesson).` : "", o.speechWeek ? "" : "Students list two vocabulary words from the journal and use each in a sentence."]);
    }
    const last = segs[segs.length - 1];
    add(SUB_CLOSE.exit, "exit", "Exit reflection and self-check", [last && last.sub && last.sub.ok && (o.exit || last.exit) ? `Exit reflection: ${o.exit || last.exit}` : "Students check themselves against today's success criteria on Today's Lesson and write one they met and one to work on.", last && last.sub && last.sub.ok && last.formative ? `Collect: ${last.formative.evidence}` : "Collect the exit slips for Mr. Bennett."]);
    add(SUB_CLOSE.final, "final", "Final classroom procedures", ["Laptops closed and returned; papers collected; area clean. Students stay seated until dismissed."]);
    return rows;
  }

  /* ---------- browser part ---------- */
  const B = { PHASES, NOTES, LAB_HASH, compose, validate, budgetOf, linksFor, perSpeaker, capacity, applyLessonEdit, applyVideoEdit, stable, aiFor, aiConflicts, subTimeline, subExtensions, exitFor, AI_STRICT, cache: {} };
  root.SLPlaybook = B;
  if (typeof document === "undefined" || !root.SL2) return;
  const X = root.SL2, { h } = X, D = root.SL_DATA || {};
  const PH = { learn: "Learn", observe: "Observe", investigate: "Investigate", practice: "Practice", perform: "Perform", reflect: "Reflect" };
  const PLAN = "speakup-teacher-planning-v1";
  const list = a => (a && a.length ? `<ul>${a.map(x => `<li>${h(x)}</li>`).join("")}</ul>` : "<p>—</p>");
  const lines = s => String(s || "").split("\n").map(x => x.trim()).filter(Boolean);
  const getJSON = (k, d) => { try { const r = JSON.parse(localStorage.getItem(k) || "null"); return r && r.v === 1 ? r : d; } catch (e) { return d; } };
  const putJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const getNotes = () => getJSON(NOTES, { v: 1, notes: {} });
  const getPlan = () => getJSON(PLAN, { v: 1, size: {} });
  const env = {
    labName: id => { const n = D.units && D.units.labNames && D.units.labNames[id]; return n ? n[0] : id; },
    chapter: n => { try { /* global CH, BOOK (classic page) */ return typeof CH !== "undefined" && CH[n] ? { title: CH[n][1], url: BOOK + CH[n][0] } : null; } catch (e) { return null; } },
  };
  let flash = "";

  /* ---------- data: published file, or this teacher's drafts (Lesson Manager → Playbook → Edit) ---------- */
  B.load = function (unit) {
    if (!(unit in B.cache)) {
      B.cache[unit] = undefined;
      fetch(`data/playbook/unit-${unit}.json`, { cache: "no-cache" }).then(r => (r.ok ? r.json() : null)).catch(() => null)
        .then(j => { B.cache[unit] = j; if (X.refresh) X.refresh(); });
    }
    if (!("classroom" in B.cache)) {
      B.cache.classroom = undefined;
      fetch("data/playbook/classroom.json", { cache: "no-cache" }).then(r => (r.ok ? r.json() : null)).catch(() => null).then(j => { B.cache.classroom = j; if (X.refresh) X.refresh(); });
    }
    const dr = B.ctx && B.ctx.drafts && B.ctx.drafts[unit];
    return B.cache[unit] && dr ? dr : B.cache[unit];
  };
  const loading = u => (B.cache[u] === null ? `<p>No playbook has been written for Unit ${u} yet. Unit 1 is the prototype; Units 2–6 follow after it is approved.</p>` : `<p role="status">Loading the Unit ${u} playbook…</p>`);
  const vctx = () => ({ units: (D.units || {}).units || [], lessons: D.lessons, journals: (D.journals || {}).journals || [] });
  /** Playbook files changed by this teacher's drafts (listed in Publish, exported like the other data files). */
  B.changed = function (drafts) {
    return Object.keys(drafts || {}).filter(u => B.cache[u] && stable(drafts[u]) !== stable(B.cache[u]))
      .map(u => ({ key: `playbook-${u}`, path: `site/data/playbook/unit-${u}.json`, text: stable(drafts[u]), errors: validate(drafts[u], vctx()).errors }));
  };
  /** A playbook file imported in Publish → Import: returns null if the text is not a playbook. */
  B.importText = function (text) {
    let o; try { o = JSON.parse(text); } catch (e) { return null; }
    if (!o || o.schema !== 1 || !o.lessons || !o.unit) return null;
    const v = validate(o, vctx());
    return { ok: !v.errors.length, unit: o.unit, data: o, msg: v.errors.length ? `Not imported. Fix first: ${v.errors.slice(0, 3).map(e => `${e.where}: ${e.msg}`).join("; ")}` : "" };
  };

  /* ---------- meetings, timing and capacity ---------- */
  function unitMeetings(ctx, unit) {
    const rows = ctx.meetings().filter(m => m.unit === unit), taught = [];
    return rows.map(m => { const mod = ctx.model(m.date); const keys = (mod && mod.keys) || []; const out = { m, mod, keys, taught: taught.slice() }; keys.forEach(k => { if (!taught.includes(k)) taught.push(k); }); return out; });
  }
  B.unitMeetings = unitMeetings;
  const sizeKey = ctx => `${ctx.sem}-${ctx.grp}`;
  const college = () => typeof level !== "undefined" && level === "col"; /* global level (classic page) */
  function planFor(pb, ctx) {
    const st = getPlan(), per = perSpeaker(pb, st, college()), rows = unitMeetings(ctx, pb.unit);
    const blocks = rows.map((r, n) => ({ r, n, c: compose(pb, r.keys, r.taught, { first: pb.unit === 1 && n === 0, perSpeaker: per }) }));
    const cap = capacity(blocks.map(b => b.c), st.size[sizeKey(ctx)] || null, per);
    const practice = blocks.reduce((t, b) => t + b.c.plan.filter(x => x.phase === "practice").reduce((n, x) => n + x.plan, 0), 0);
    return { st, per, blocks, cap, practice };
  }
  function capNote(pl, ctx) {
    const c = pl.cap;
    if (!c.minutes) return "";
    if (!c.size) return `<p class="pb-warn">Speech time this unit: ${c.minutes} minutes ≈ ${c.slots} speakers at ${c.per} minutes each. <a href="#/teacher/playbook/1#pb-settings">Enter your class size</a> to check that everyone fits.</p>`;
    return c.fits ? `<p class="pb-ok" role="status">Speech capacity: ${c.slots} speaker slots for ${c.size} students (${ctx.groupLabel}, ${ctx.semLabel}). Everyone fits.</p>`
      : `<p class="pb-warn" role="alert"><b>Not enough speech time:</b> the scheduled speech blocks fit about ${c.slots} of ${c.size} students (${c.per} minutes per speaker). Plan ${c.short} make-up slot${c.short === 1 ? "" : "s"}, shorten feedback time, or add time with an override. Pacing and release dates are not changed automatically.</p>`;
  }

  /* ---------- small renderers ---------- */
  const linkHtml = (pb, p, printing) => linksFor(pb, p, env).map(l => printing ? `${h(l.label)}${l.kind === "video" ? "" : ""}` : `<a href="${h(l.href)}"${l.ext ? ' target="_blank" rel="noopener"' : ""}>${h(l.label)}${l.ext ? '<span class="sr"> (opens in a new tab)</span> ↗' : ""}</a>`).join(" · ");
  function rowsFor(pb, c, mod, withLinks, printing) {
    const j = pb.block.journal || 15, rows = [];
    let t = 0;
    const row = (a, b, title, links) => rows.push(`<tr><td>${a}–${b}</td><td>${title}</td>${withLinks ? `<td>${links || ""}</td>` : ""}</tr>`);
    for (const x of c.pre) { const p = pb.lessons[x.key].phases[x.i]; row(t, t + x.plan, `${h(x.title)} <i>(first class day: before the journal)</i>`, linkHtml(pb, p, printing)); t += x.plan; }
    row(t, t + 10, `Daily Learning Journal${mod && mod.journal ? ` #${mod.meeting.number}` : ""} (handwritten)`, mod && mod.journal ? (printing ? "" : `<a href="#/unit/${mod.unit}/day/${mod.day}">Today's Lesson</a>`) : ""); t += 10;
    row(t, t + (j - 10), "Stand and share with someone new", ""); t += j - 10;
    for (const x of c.plan) {
      const p = x.i >= 0 ? pb.lessons[x.key].phases[x.i] : {};
      row(t, t + x.plan, `<span class="pb-ph-name">${PH[x.phase]}</span> ${h(x.title)}${x.plan < x.min && !x.fill ? ` <i>(shortened from ${x.min})</i>` : ""}${x.fill ? ` <i>(speeches ≈ ${Math.floor(x.plan / c.perSpeaker)})</i>` : ""}${x.core ? "" : " <i>(stretch)</i>"}`, x.i >= 0 ? linkHtml(pb, p, printing) : "");
      t += x.plan;
    }
    rows.push(`<tr><td>${t}–90</td><td>Transitions and buffer${c.free ? ` (${c.free} unplanned minutes)` : ""}</td>${withLinks ? "<td></td>" : ""}</tr>`);
    return `<table class="sl2-table pb-time"><thead><tr><th scope="col">Min</th><th scope="col">Activity</th>${withLinks ? '<th scope="col">Links</th>' : ""}</tr></thead><tbody>${rows.join("")}</tbody></table>`;
  }
  function header(pb, ctx, row, all, mod) {
    return `${h(X.fmtLong(row.m.date))} · ${h(ctx.groupLabel)} · Unit ${pb.unit} meeting ${all.indexOf(row) + 1} of ${all.length}${mod && mod.journal ? ` · Journal #${mod.meeting.number}${mod.journal.flex ? " (flex)" : ""}` : ""}`;
  }
  function meetingBits(pb, ctx, day) {
    const pl = planFor(pb, ctx), b = pl.blocks.find(x => x.r.m.date === day);
    if (!b) return null;
    const { r: row, c } = b, mod = row.mod, fresh = row.keys.filter(k => !row.taught.includes(k)), segs = fresh.map(k => pb.lessons[k]).filter(Boolean);
    const lessons = fresh.map(k => mod && mod.lessons ? mod.lessons[mod.keys.indexOf(k)] : null);
    const used = pl.blocks.map(x => x.r.mod && x.r.mod.journal && x.r.mod.journal.id).filter(Boolean);
    // The block's exit: a journal-exit rule for any planned day in the block (e.g. w01d4 with skipped Journal 3), else the last day's.
    const ruleKey = fresh.find(k => ((pb.overview || {}).exitFromJournal || []).some(r => r.lesson === k));
    const exFor = k => exitFor(pb, k, used, (D.journals || {}).journals), ruled = ruleKey ? exFor(ruleKey) : null;
    const ex = ruled && ruled.from ? ruled : fresh.length ? exFor(fresh[fresh.length - 1]) : null;
    const exitHtml = ex ? `${h(ex.text)}${ex.from ? ` <i>(the ${h(ex.from === "j03" ? "Journal 3" : ex.from)} prompt, used as the exit because this schedule skips that journal; draft)</i>` : ""}` : "—";
    return { pl, row, c, mod, fresh, segs, lessons, all: pl.blocks.map(x => x.r), ex, exitHtml };
  }

  /* ---------- Quick Teach (default daily plan) ---------- */
  function quick(pb, ctx, day, printing) {
    const q = meetingBits(pb, ctx, day);
    if (!q) return `<p>The ${h(ctx.groupLabel)} group has no Unit ${pb.unit} class on ${h(X.fmtLong(day))}.</p>`;
    const { c, mod, fresh, segs, lessons, row } = q, ai = mod && X.aiLevel(mod.ai.level);
    const mats = [...new Set(segs.flatMap(l => l.materials || []))], prep = [...new Set(segs.flatMap(l => l.prep || []))];
    const looks = segs.flatMap(l => (l.formative.lookFor || []).slice(0, segs.length > 2 ? 1 : 2));
    const canvas = [...(mod ? mod.canvas.map(x => `${X.pick(x.label || x.title || { en: "Canvas assignment", es: "Tarea de Canvas" })}${x.url ? ` (${x.url})` : ""}`) : []), ...segs.flatMap(l => l.canvas || [])];
    const last = segs[segs.length - 1];
    const speech = c.speechMinutes ? capNote(q.pl, ctx) : "";
    const links = (() => { const seen = new Set(), out = []; for (const x of c.plan) { if (x.i < 0) continue; for (const l of linksFor(pb, pb.lessons[x.key].phases[x.i], env)) if (!seen.has(l.href)) { seen.add(l.href); out.push(l); } } return out; })();
    const linkList = links.length ? `<ul class="pbq-links">${links.map(l => `<li>${printing ? h(l.label) : `<a href="${h(l.href)}"${l.ext ? ' target="_blank" rel="noopener"' : ""}>${h(l.label)}${l.ext ? '<span class="sr"> (opens in a new tab)</span> ↗' : ""}</a>`}</li>`).join("")}</ul>` : "<p>—</p>";
    const j = mod && mod.journal;
    return `<div class="pbq">
      <h2 class="sl2-h2">${header(pb, ctx, row, q.all, mod)}</h2>
      <p class="pb-draft" role="note">Quick Teach · ${segs.every(l => l.status === "approved") && segs.length ? "approved" : "draft"} · from the lesson data and the Instructor Playbook${B.ctx && B.ctx.drafts && B.ctx.drafts[pb.unit] ? " (including your unsaved-to-GitHub playbook edits)" : ""}.</p>
      ${c.over ? `<p class="pb-warn" role="alert"><b>Over by ${c.over} minutes.</b> Move a core activity to the next meeting.</p>` : ""}${speech}
${(() => { const cl = fresh.filter(k => aiConflicts({ lessons: { [k]: pb.lessons[k] } }, D.lessons.days, D.aiperm).length); return cl.length ? `<p class="pb-warn" role="note"><b>AI note needs your confirmation (${h(cl.join(", "))}):</b> the playbook note says no AI use, but students see the lesson's permission below. ${printing ? "" : `<a href="#/teacher/playbook/${pb.unit}#pb-confirm">Details</a>`}</p>` : ""; })()}
      <div class="pbq-grid">
        <div class="pbq-main">
          <section class="pbq-card"><p class="app-eyebrow">Learning goals</p><h3>Objectives</h3>${lessons.map((ls, i) => ls ? `<p class="pbq-obj"><b>${h(fresh[i])}</b> ${h(X.pick(ls.learn))}<br><i>Language:</i> ${h(X.pick(ls.lang))}</p>` : "").join("") || "<p>Review day (planned days already taught).</p>"}</section>
          <section class="pbq-card"><p class="app-eyebrow">90-minute block</p><h3>Timed sequence</h3>${rowsFor(pb, c, mod, true, printing)}</section>
        </div>
        <div class="pbq-side">
          <section class="pbq-card"><h3>Success criteria</h3>${list(lessons.flatMap(ls => (ls && X.pick(ls.success)) || []))}</section>
          <section class="pbq-card"><h3>Prepare</h3>${list(prep)}<h3>Materials</h3>${list(mats)}</section>
          <section class="pbq-card"><h3>Journal and stand and share</h3>${j ? `<p><b>#${mod.meeting.number}:</b> ${h(X.pick(j.prompt))}</p><p><i>Share:</i> ${h(X.pick(j.share))}</p>` : "<p>No journal for this class.</p>"}</section>
          <section class="pbq-card pbq-linkcard"><h3>Direct links</h3>${linkList}</section>
          <section class="pbq-card"><h3>Formative check</h3>${list(looks)}<h3>Exit reflection</h3><p>${q.exitHtml}</p></section>
          <section class="pbq-card"><p><b>AI permission:</b> ${ai ? h(X.pick(ai.name)) : "class default"}${mod && mod.ai.set ? " (lesson setting)" : " (class default)"}${mod && mod.ai.note ? ` (${h(X.pick(mod.ai.note))})` : ""}</p>${canvas.length ? `<p><b>Canvas:</b> ${h(canvas.map(x => x.replace(/[.;]\s*$/, "")).join("; "))}</p>` : ""}</section>
        </div>
      </div>
      ${printing ? "" : `<p class="sl2-btns sl2-noprint"><a class="btn primary" href="#/teacher/playbook/${pb.unit}/${day}/full">Full instructional plan</a> <a class="btn" href="#/teacher/print/quick/${day}">Print one page</a> <a class="btn" href="#/teacher/print/sub/${day}">Substitute plan (1–2 pages)</a> <a class="btn" href="#/sub/${ctx.grp}/${day}">Full substitute plan</a>${fresh.map(k => ` <a class="btn" href="#/teacher/playbook/${pb.unit}/edit/${k}">Edit ${h(k)}</a>`).join("")}</p>`}</div>`;
  }

  /* ---------- full plan ---------- */
  function phaseDetail(pb, p) {
    const links = linkHtml(pb, p, false);
    return `${list(p.teacher)}${p.students ? `<p><b>Students:</b> ${h(p.students)}</p>` : ""}${p.check ? `<p><b>Check:</b> ${h(p.check)}</p>` : ""}${links ? `<p><b>Links:</b> ${links}</p>` : ""}`;
  }
  function segmentSections(pb, key, mod, printing, inMeeting) {
    const ls = pb.lessons[key]; if (!ls) return "";
    const lesson = mod && mod.lessons ? mod.lessons[mod.keys.indexOf(key)] : null;
    return `<section class="pb-seg"><h3>${h(key)} · ${h(ls.title)} <span class="pb-key">(${h(ls.status || "draft")})</span>${printing ? "" : ` <a class="btn sl2-noprint" href="#/teacher/playbook/${pb.unit}/edit/${key}">Edit</a>`}</h3>
      ${lesson ? `<p><b>Learning objective:</b> ${h(X.pick(lesson.learn))}</p><p><b>Language objective:</b> ${h(X.pick(lesson.lang))}</p>${lesson.col ? `<p><b>College objective:</b> ${h(X.pick(lesson.col))}</p>` : ""}<p><b>Success criteria:</b></p>${list(X.pick(lesson.success) || [])}` : ""}
      <p><b>Essential question:</b> ${h(ls.essential)}</p>
      <p><b>Academic vocabulary:</b> ${h((ls.vocab || []).join(", "))}</p>
      ${inMeeting ? "" : `<div class="pb-2col"><div><h4>Materials</h4>${list(ls.materials)}</div><div><h4>Preparation</h4>${list(ls.prep)}</div></div>`}
      <h4>Activities</h4>${ls.phases.map(p => `<details class="pb-ph"${p.core || printing ? " open" : ""}><summary>${PH[p.phase]} · ${h(p.title)} · ${p.min} min${p.core ? "" : " (stretch)"}${p.before ? " (first class day: before the journal)" : ""}</summary>${phaseDetail(pb, p)}</details>`).join("")}
      <h4>Discussion questions</h4>${list(ls.discuss)}
      <h4>Anticipated misconceptions</h4>${(ls.misconceptions || []).length ? `<ul>${ls.misconceptions.map(m => `<li><b>${h(m.m)}</b> → ${h(m.fix)}</li>`).join("")}</ul>` : "<p>—</p>"}
      <div class="pb-2col"><div><h4>Multilingual learners</h4>${list(ls.ml)}</div><div><h4>Accessibility and flexible supports</h4>${list(ls.access)}</div></div>
      <h4>Advanced and college extensions</h4>${list(ls.extend)}
      <h4>Formative assessment</h4><p><b>Evidence:</b> ${h(ls.formative.evidence)}</p>${list(ls.formative.lookFor)}<p><b>If…then:</b> ${h(ls.formative.respond)}</p>
      <h4>AI permission</h4>${aiBlock(pb, key, lesson)}
      <h4>Canvas</h4>${list(ls.canvas)}
      <h4>Exit reflection</h4><p>${h(ls.exit)}</p>
      <h4>Teacher reflection</h4>${list(ls.reflect)}
      ${printing ? printNote(key) : noteBox(key)}</section>`;
  }
  /** The one AI permission (the lesson's setting or the class default), the playbook's teaching note, and a flag when
      the note contradicts the setting. Used by the full plan, Quick Teach and printed exports. */
  function aiBlock(pb, key, lesson) {
    const a = aiFor(D.lessons.days, D.aiperm, key), note = pb.lessons[key].ai, clash = note && AI_STRICT.test(note) && a.level && a.level.rank > 0;
    return `<p><b>${a.level ? h(X.pick(a.level.name)) : "Class default"}</b> (${a.set ? "lesson setting" : "class default"}; students see this on Today's Lesson)</p>${note ? `<p><i>Teaching note (draft):</i> ${h(note)}</p>` : ""}${clash ? `<p class="pb-warn" role="note"><b>Needs your confirmation:</b> this note says no AI use, but the lesson's permission is ${h(X.pick(a.level.name))}. Students are told the lesson's permission. To make it "Not permitted", change the lesson's AI setting (<a href="#/teacher/day/${h(key)}">edit ${h(key)}</a>); otherwise edit the note.</p>` : ""}`;
  }
  function printNote(key) { const n = getNotes().notes[key]; return n && n.text ? `<h4>My notes</h4><p>${h(n.text)}</p>` : `<h4>My notes</h4><div class="sp-lines"></div>`; }
  function noteBox(key) {
    const n = getNotes().notes[key] || {};
    return `<div class="pb-note sl2-noprint"><label for="pbn-${h(key)}"><b>My notes for ${h(key)}</b> (saved in this browser only; no student names)</label><textarea id="pbn-${h(key)}" rows="3" data-pb-note="${h(key)}">${h(n.text || "")}</textarea>${n.updated ? `<p class="sl2-small">Last saved ${h(n.updated)}</p>` : ""}</div>${n.text ? `<div class="pb-noteprint"><h4>My notes</h4><p>${h(n.text)}</p></div>` : ""}`;
  }
  function meetingPlan(pb, ctx, day, printing) {
    const q = meetingBits(pb, ctx, day);
    if (!q) return `<p>The ${h(ctx.groupLabel)} group has no Unit ${pb.unit} class on ${h(X.fmtLong(day))}.</p>`;
    const { c, mod, fresh, segs, row } = q;
    const flex = mod && mod.journal && pb.flex && mod.journal.id === pb.flex.journal;
    const mats = [...new Set(segs.flatMap(l => l.materials || []))], prep = [...new Set(segs.flatMap(l => l.prep || []))];
    const ai = mod && X.aiLevel(mod.ai.level), last = segs[segs.length - 1];
    return `<h2 class="sl2-h2">${header(pb, ctx, row, q.all, mod)}</h2>
      <p class="pb-draft" role="note">Full instructional plan · draft until approved. Objectives, success criteria, the journal and the AI permission come from the lesson data.</p>
      ${printing ? "" : `<p class="sl2-btns sl2-noprint"><a class="btn" href="#/teacher/playbook/${pb.unit}/${day}">← Quick Teach</a> <a class="btn" href="#/teacher/print/plan/${day}">Print the full plan</a> <a class="btn" href="#/teacher/playbook/${pb.unit}/videos">Video viewing guides</a></p>`}
      <p><b>Planned days in this block:</b> ${row.keys.map(k => `${h(k)}${row.taught.includes(k) ? " (already taught; review)" : ""}`).join(", ") || "none"}${mod && mod.extendOf ? ` · continues ${h(X.fmtShort(mod.extendOf))}` : ""}${mod && mod.meeting && mod.meeting.note ? ` · note: ${h(mod.meeting.note)}` : ""}</p>
      ${c.over ? `<p class="pb-warn" role="status"><b>Over by ${c.over} minutes</b> even with shortened activities. Move one core activity to the next meeting or split speeches.</p>` : ""}
      ${c.shortened.length ? `<p class="pb-warn">Shortened to fit: ${c.shortened.map(x => `${h(x.title)} (${x.min}→${x.plan})`).join("; ")}.</p>` : ""}
      ${c.speechMinutes ? capNote(q.pl, ctx) : ""}
      ${c.deferred.length ? `<p><b>Stretch activities that don't fit today:</b> ${c.deferred.map(x => h(x.title)).join("; ")}.</p>` : ""}
      ${c.free >= 10 && (pb.overview.spare || []).length ? `<p><b>${c.free} unplanned minutes.</b> Options:</p>${list(pb.overview.spare)}` : ""}
      <h3>Timing (90-minute block)</h3>${rowsFor(pb, c, mod, !printing, printing)}
      <h3>Journal</h3>${mod && mod.journal ? `<p><b>Journal #${mod.meeting.number}:</b> ${h(X.pick(mod.journal.prompt))}</p><p><b>Stand and share:</b> ${h(X.pick(mod.journal.share))}</p>${flex ? `<p><b>Flex meeting:</b> ${h(pb.flex.when)} Plan: ${pb.flex.phases.map(p => `${h(p.title)} (${p.min} min${p.core ? "" : ", if time"})`).join("; ")}. ${h(pb.flex.note)}</p>` : ""}` : "<p>No journal for this class.</p>"}
      <h3>AI permission for today's work</h3><p>${ai ? h(X.pick(ai.name)) : "Class default"}${mod && mod.ai.note ? ` (${h(X.pick(mod.ai.note))})` : ""}. Set per lesson in the Lesson Manager.</p>
      <div class="pb-2col"><div><h3>Materials</h3>${list(mats)}</div><div><h3>Preparation</h3>${list(prep)}</div></div>
      ${fresh.map(k => segmentSections(pb, k, mod, printing, true)).join("")}
      ${last ? `<h3>Exit reflection for this block</h3><p>${q.exitHtml}</p>` : ""}`;
  }

  /* ---------- concise substitute plan (1–2 pages) ---------- */
  function subPlan(pb, ctx, day) {
    const q = meetingBits(pb, ctx, day), cr = B.cache.classroom || {};
    if (!q) return `<p>The ${h(ctx.groupLabel)} group has no Unit ${pb.unit} class on ${h(X.fmtLong(day))}.</p>`;
    const { mod, segs, row, c } = q, base = X.siteBase(), j = mod && mod.journal;
    const u = (D.units.units || []).find(x => x.id === pb.unit) || {}, names = D.units.labNames || {};
    const ext = subExtensions(pb, row.taught.concat(row.keys), u);
    const labs = ext.labs.map(id => names[id] ? names[id][0] : null).filter(Boolean);
    const reads = ext.reads.map(n => { const ch = env.chapter(n); return ch ? `Ch. ${n}, ${ch.title}` : `Ch. ${n}`; });
    const rows = subTimeline(pb, segs, { journal: !!j, labs, reads, speechWeek: ext.rehearsal, exit: q.ex ? q.ex.text : null });
    const ai = mod ? X.aiLevel(mod.ai.level) : null;
    const li = r => `<li><b>${r.from}–${r.to} min · ${h(r.title)}${r.kind === "alternative" ? " (not for a substitute: do this instead)" : ""}:</b>${r.kind === "journal" ? ` ${j ? `As students arrive: phones checked in, laptops closed. Show Journal #${mod.meeting.number} on Today's Lesson. Students write by hand for 10 minutes (no devices), then stand and share with someone new: ${h(X.pick(j.share))}<br><i>Prompt:</i> ${h(X.pick(j.prompt))}` : "As students arrive: phones checked in. Students open Today's Lesson and read the success criteria."}` : list(r.items)}</li>`;
    return `<div class="pbs">
      <h2 class="sl2-h2">${header(pb, ctx, row, q.all, mod)}</h2>
      <p>Teacher: Mr. Bennett, Speech, Wyandotte High School. 90-minute block. This plan contains no student information.</p>
      <p><b>On the projector:</b> ${h(base)}#/unit/${mod.unit}/day/${h(day)} (students click <b>Today's Lesson</b>: ${h(base)}#/today)</p>
      <p><b>AI permission today:</b> ${ai ? h(X.pick(ai.name)) : "class default"} (shown to students on Today's Lesson).</p>
      <h3>Classroom expectations</h3>${list(cr.expectations || [])}
      <p><b>Accommodations:</b> ${h(cr.accommodations || "Follow each student's individual accommodations.")}</p>
      <h3>Plan (all 90 minutes)</h3><ol class="pbs-steps">${rows.map(li).join("")}</ol>
      ${list((pb.sub || {}).general)}
      <p><b>If you need help:</b> ${h(cr.contact || "Contact the main office.")}</p>
      <h3>Notes for Mr. Bennett</h3><div class="sp-lines"></div></div>`;
  }

  /* ---------- overview, settings, video guides, resources ---------- */
  function settingsForm(pb, ctx) {
    const st = getPlan(), d = pb.overview.speech || {}, v = (k, f) => (typeof st[k] === "number" ? st[k] : f);
    return `<details class="pb-settings" id="pb-settings"${st.size[sizeKey(ctx)] && !flash ? "" : " open"}><summary><b>Planning settings</b> (this browser only)</summary>
      <p class="sl2-small">Used only to estimate speech capacity. Nothing here changes pacing or release dates.</p>
      <p class="pb-form-row"><label>Class size (${h(ctx.semLabel)}, ${h(ctx.groupLabel)}) <input type="number" min="1" max="60" data-pb-plan="size" value="${h(st.size[sizeKey(ctx)] || "")}"></label>
        <label>Speech minutes (high school) <input type="number" min="0.5" max="15" step="0.5" data-pb-plan="minutes" value="${v("minutes", d.minutes)}"></label>
        <label>Speech minutes (college) <input type="number" min="0.5" max="15" step="0.5" data-pb-plan="colMinutes" value="${v("colMinutes", d.colMinutes)}"></label>
        <label>Feedback minutes <input type="number" min="0" max="5" step="0.5" data-pb-plan="feedback" value="${v("feedback", d.feedback)}"></label>
        <label>Transition minutes <input type="number" min="0" max="5" step="0.5" data-pb-plan="transition" value="${v("transition", d.transition)}"></label></p></details>`;
  }
  function overview(pb, ctx) {
    const o = pb.overview, pl = planFor(pb, ctx);
    const map = pl.blocks.map(({ r, n, c }) => `<tr><td><a href="#/teacher/playbook/${pb.unit}/${r.m.date}">${h(X.fmtShort(r.m.date))}</a>${new Date(r.m.date + "T12:00:00Z").getUTCDay() === 3 ? " (Wed)" : ""}</td><td>${n + 1}</td><td>${r.mod && r.mod.journal ? `#${r.m.number}${r.mod.journal.flex ? " flex" : ""}` : "—"}</td><td>${r.keys.map(k => r.taught.includes(k) ? `${h(k)} (review)` : h(k)).join(", ")}</td><td>${c.over ? `<b>over ${c.over} min</b>` : c.speechMinutes ? `${c.speechMinutes} min speeches (≈${c.speakers})` : `${c.free} min spare`}</td></tr>`).join("");
    const perf = pl.cap.minutes;
    return `<h2 class="sl2-h2">Unit ${pb.unit}: ${h(o.title)}</h2>
      <p class="pb-draft" role="note">Instructor Playbook · ${h(pb.status)} · updated ${h(pb.updated)}. Teacher-facing; students never load it. Open a date for its Quick Teach plan.</p>
      ${flash ? `<p class="tm-flash" role="status">${h(flash)}</p>` : ""}
      <p class="sl2-btns"><a class="btn" href="#/teacher/playbook/${pb.unit}/videos">Video viewing guides</a> <a class="btn" href="#/teacher/print/playbook/${pb.unit}">Print the unit overview</a> <button type="button" class="btn" data-pb-notesdl>Download my notes</button></p>
      ${settingsForm(pb, ctx)}${capNote(pl, ctx)}
      <h3>Meeting map · ${h(ctx.semLabel)} · ${h(ctx.groupLabel)}</h3>
      <p class="sl2-small">Computed from the calendar, the odd/even groups, Wednesdays and your overrides. Change the semester or group above to see the others.</p>
      <div class="sl2-tablewrap"><table class="sl2-table"><thead><tr><th scope="col">Date</th><th scope="col">Meeting</th><th scope="col">Journal</th><th scope="col">Planned days</th><th scope="col">Fit</th></tr></thead><tbody>${map || `<tr><td colspan="5">No meetings found.</td></tr>`}</tbody></table></div>
      ${(o.confirm || []).length ? `<h3>Needs your confirmation</h3><ol class="pb-confirm" id="pb-confirm">${o.confirm.map(x => `<li><b>${h(x.q)}</b> ${h(x.why)}${x.id === "balance" ? ` <i>This group: ${pl.practice} minutes of rehearsal and practice, ${perf} minutes of speeches${pl.cap.size ? `, ${pl.cap.slots} speaker slots for ${pl.cap.size} students` : ""}.</i>` : ""}</li>`).join("")}${(() => { const cl = aiConflicts(pb, D.lessons.days, D.aiperm); return cl.length ? `<li><b>AI permission notes:</b> on ${h(cl.map(x => x.key).join(", "))} the playbook\u2019s teaching note says no AI use, but the lesson\u2019s permission is ${h(X.pick(cl[0].level.name))} (${cl.every(x => !x.set) ? "the class default" : "the lesson setting"}). Students, Quick Teach, the full plan, substitute plans, the projector view and the AI Coaching Studio all use the lesson\u2019s permission. Should these days be set to \u201cNot permitted\u201d, or should the notes change? Nothing was changed.</li>` : ""; })()}</ol>` : ""}
      ${unitOverview(pb)}
      ${resources(pb)}<h3>Lessons (planned days)</h3><ul>${Object.entries(pb.lessons).map(([k, l]) => `<li><a href="#/teacher/playbook/${pb.unit}/${k}">${h(k)}</a> · ${h(l.title)} <span class="pb-key">(${h(l.status || "draft")})</span> · <a href="#/teacher/playbook/${pb.unit}/edit/${k}">Edit</a></li>`).join("")}</ul>`;
  }
  function unitOverview(pb) {
    const o = pb.overview;
    return `<h3>Unit overview</h3><p><b>Essential question:</b> ${h(o.essential)}</p><h4>Guiding questions</h4>${list(o.questions)}<h4>Enduring understandings</h4>${list(o.understandings)}
      <h4>Summative assessment</h4><p>${h(o.summative)}</p>
      <h4>${pb.framework.map(f => f.name).join(" → ")}</h4><div class="sl2-tablewrap"><table class="sl2-table"><thead><tr><th scope="col">Phase</th><th scope="col">Where</th><th scope="col">What</th></tr></thead><tbody>${o.arc.map(a => `<tr><td>${PH[a.phase]}</td><td>${h(a.where)}</td><td>${h(a.what)}</td></tr>`).join("")}</tbody></table></div>
      <h4>Academic vocabulary</h4><p>${h(o.vocab.join(", "))}</p><h4>Readings</h4>${list(o.readings)}
      <div class="pb-2col"><div><h4>Materials checklist</h4>${list(o.materials)}</div><div><h4>Preparation checklist</h4>${list(o.prep)}</div></div>
      <h4>Scheduling notes</h4>${list(o.scheduling)}<h4>Speech days</h4><p>${h(o.speechDays)}</p>${o.speech ? `<p class="sl2-small">${h(o.speech.note)}</p>` : ""}<h4>Beyond the Podium</h4><p>${h(o.btp)}</p>${pb.flex ? `<p><b>Flex meeting:</b> ${h(pb.flex.when)}</p>` : ""}<h4>When a block has spare time</h4>${list(o.spare)}
      <h4>Multilingual learners</h4><p>${h(o.ml)}</p><h4>Accessibility (UDL)</h4><p>${h(o.access)}</p><h4>College Public Speaking</h4><p>${h(o.college)}</p>`;
  }
  function videos(pb, printing) {
    return `<h2 class="sl2-h2">Unit ${pb.unit} video viewing guides</h2>
      <p class="pb-draft" role="note">Segments stay blank until you preview a video and enter verified times (Edit). Nothing here quotes a video. Open videos in a new tab (no autoplay); turn captions on.</p>
      ${pb.videos.map(v => `<section class="pb-vid" id="${h(v.id)}"><h3>${h(v.title)}${printing ? "" : ` <a class="btn sl2-noprint" href="#/teacher/playbook/${pb.unit}/edit/video/${h(v.id)}">Edit or enter verified times</a>`}</h3>
        <p><b>Speaker:</b> ${h(v.speaker)} · <b>Source:</b> ${h(v.channel)} (${h(v.upload)}) · <a href="${h(v.url)}" target="_blank" rel="noopener">Open on YouTube<span class="sr"> (opens in a new tab)</span></a></p>
        <p><b>On the site:</b> ${h(v.onSite)} · <b>Used in:</b> ${h(v.lessons.join(", "))}</p><p><b>Purpose:</b> ${h(v.purpose)}</p>
        <p><b>Segment:</b> ${v.segment.start || v.segment.end ? `${h(v.segment.start || "start")}–${h(v.segment.end || "end")}` : "start ____ end ____"} ${v.segment.verified ? "(verified by the teacher)" : "<i>(not verified: preview and enter the times)</i>"}. ${h(v.segment.note)}</p>
        <dl class="pb-dl"><dt>Before viewing</dt><dd>${h(v.before)}</dd><dt>During viewing</dt><dd>${h(v.during)}</dd><dt>Pause and discuss</dt><dd>${list(v.pauses)}</dd><dt>After viewing</dt><dd>${h(v.after)}</dd><dt>Student practice</dt><dd>${h(v.practice)}</dd><dt>Formative check</dt><dd>${h(v.check)}</dd><dt>Language scaffolding</dt><dd>${h(v.language)}</dd><dt>College extension</dt><dd>${h(v.college)}</dd><dt>Captions</dt><dd>${h(v.captions)}</dd><dt>If the video is blocked</dt><dd>${h(v.alternative)}</dd></dl></section>`).join("")}`;
  }
  function resources(pb) {
    return (pb.resources || []).length ? `<h3>Formative assessment resources (printable)</h3>${pb.resources.map(r => `<section class="pb-res"><h4>${h(r.title)}</h4><p class="sl2-small">${h(r.use)}</p><ul class="pb-lines">${r.lines.map(l => `<li>${h(l)}</li>`).join("")}</ul></section>`).join("")}` : "";
  }

  /* ---------- editing (Lesson Manager → Playbook → Edit): drafts in this browser, exported from Publish ---------- */
  const ta = (id, label, v, rows) => `<label class="pbe-f" for="${id}">${label}<textarea id="${id}" rows="${rows || 3}">${h(v || "")}</textarea></label>`;
  const inp = (id, label, v, type) => `<label class="pbe-f" for="${id}">${label}<input id="${id}" type="${type || "text"}" value="${h(v == null ? "" : v)}"></label>`;
  const sel = (id, label, opts, v) => `<label class="pbe-f" for="${id}">${label}<select id="${id}">${opts.map(([k, t]) => `<option value="${h(k)}"${String(v == null ? "" : v) === k ? " selected" : ""}>${h(t)}</option>`).join("")}</select></label>`;
  function phaseFields(pb, p, i) {
    const id = `pbe-ph-${i}`;
    return `<fieldset class="pbe-ph"><legend>${p.title ? `Activity ${i + 1}: ${h(p.title)}` : "Add an activity (leave the title blank to skip)"}</legend>
      <div class="pbe-row">${sel(id + "-phase", "Phase", Object.entries(PH), p.phase || "practice")}${inp(id + "-title", "Title", p.title)}${inp(id + "-min", "Minutes", p.min, "number")}${inp(id + "-short", "Short minutes (when crowded)", p.short, "number")}
        <label class="pbe-f"><span><input type="checkbox" id="${id}-core"${p.core ? " checked" : ""}> Core (always taught)</span></label>${p.title ? `<label class="pbe-f"><span><input type="checkbox" id="${id}-remove"> Remove</span></label>` : ""}</div>
      ${ta(id + "-teacher", "Teacher talking points and steps (one per line)", (p.teacher || []).join("\n"), 4)}
      <div class="pbe-row">${inp(id + "-students", "What students do", p.students)}${inp(id + "-check", "Check", p.check)}</div>
      <div class="pbe-row">${sel(id + "-video", "Video", [["", "none"], ...pb.videos.map(v => [v.id, v.title])], p.video)}${sel(id + "-lab", "Lab", [["", "none"], ...Object.keys(LAB_HASH).map(k => [k, env.labName(k)])], p.lab)}${inp(id + "-read", "Textbook chapter", p.read, "number")}${inp(id + "-route", "Site link (#…)", p.route)}</div></fieldset>`;
  }
  function editLesson(pb, key) {
    const l = pb.lessons[key]; if (!l) return `<p>No playbook entry for ${h(key)}.</p>`;
    const v = validate(pb, vctx()).errors.filter(e => e.where === key);
    return `<h2 class="sl2-h2">Edit ${h(key)} · ${h(l.title)}</h2>
      <p class="tm-note" role="note">Edits are drafts in this browser. Objectives, success criteria, journals and assignment requirements are edited in the lesson editor (<a href="#/teacher/day/${key}">Edit reusable lesson ${h(key)}</a>), not here. Export the playbook file from Publish.</p>
      ${flash ? `<p class="tm-flash" role="status">${h(flash)}</p>` : ""}${v.length ? `<ul class="tm-issues">${v.map(e => `<li>${h(e.msg)}</li>`).join("")}</ul>` : ""}
      <form class="tm-form pbe" data-pb-edit="${pb.unit}:${key}" novalidate>
        <div class="pbe-row">${inp("pbe-title", "Title", l.title)}${sel("pbe-status", "Review status", [["draft", "Draft"], ["approved", "Approved"]], l.status || "draft")}</div>
        ${ta("pbe-essential", "Essential question", l.essential, 2)}${inp("pbe-vocab", "Academic vocabulary (comma-separated)", (l.vocab || []).join(", "))}
        <div class="pbe-row">${ta("pbe-materials", "Materials (one per line)", (l.materials || []).join("\n"))}${ta("pbe-prep", "Preparation (one per line)", (l.prep || []).join("\n"))}</div>
        <h3>Activities and timing</h3>${l.phases.map((p, i) => phaseFields(pb, p, i)).join("")}${phaseFields(pb, {}, l.phases.length)}
        ${ta("pbe-discuss", "Discussion questions (one per line)", (l.discuss || []).join("\n"))}
        ${ta("pbe-mis", "Misconceptions (one per line: misconception → response)", (l.misconceptions || []).map(m => `${m.m} → ${m.fix}`).join("\n"))}
        <h3>Differentiation</h3><div class="pbe-row">${ta("pbe-ml", "Multilingual learners (one per line)", (l.ml || []).join("\n"))}${ta("pbe-access", "Accessibility and flexible supports (one per line)", (l.access || []).join("\n"))}${ta("pbe-extend", "Advanced and college extensions (one per line)", (l.extend || []).join("\n"))}</div>
        <h3>Formative assessment and exit ticket</h3>${inp("pbe-evidence", "Evidence", l.formative.evidence)}${ta("pbe-look", "Look-fors (one per line)", (l.formative.lookFor || []).join("\n"))}${inp("pbe-respond", "If… then", l.formative.respond)}${inp("pbe-exit", "Exit reflection / exit ticket", l.exit)}
        <div class="pbe-row">${inp("pbe-ai", "AI teaching note (the permission students see is the lesson\u2019s AI setting)", l.ai)}${ta("pbe-canvas", "Canvas reminders (one per line)", (l.canvas || []).join("\n"), 2)}</div>
        ${ta("pbe-reflect", "Teacher reflection prompts (one per line)", (l.reflect || []).join("\n"), 2)}
        <h3>Substitute instructions</h3><label class="pbe-f"><span><input type="checkbox" id="pbe-subok"${l.sub.ok ? " checked" : ""}> Suitable for a substitute</span></label>${ta("pbe-sub", "Substitute steps (one per line)", (l.sub.plan || []).join("\n"))}
        <p class="tm-flash pb-msg" role="status" data-pb-msg></p>
        <p class="sl2-btns"><button type="submit" class="btn primary">Save draft</button> <a class="btn" href="#/teacher/playbook/${pb.unit}/${key}">Cancel</a></p></form>`;
  }
  function readLesson(old) {
    const g = id => { const el = document.getElementById(id); return el ? (el.type === "checkbox" ? el.checked : el.value.trim()) : ""; };
    const num = x => (x === "" || x == null ? null : Number(x));
    const phases = [];
    for (let i = 0; i <= old.phases.length; i++) {
      const id = `pbe-ph-${i}`, prev = old.phases[i] || {};
      if (g(id + "-remove") || !g(id + "-title")) continue;
      const p = { ...prev, phase: g(id + "-phase"), title: g(id + "-title"), min: num(g(id + "-min")), core: !!g(id + "-core"), teacher: lines(g(id + "-teacher")) };
      const opt = { short: num(g(id + "-short")), students: g(id + "-students") || null, check: g(id + "-check") || null, video: g(id + "-video") || null, lab: g(id + "-lab") || null, read: num(g(id + "-read")), route: g(id + "-route") || null };
      for (const [k, v] of Object.entries(opt)) { if (v == null) delete p[k]; else p[k] = v; }
      phases.push(p);
    }
    return { ...old, title: g("pbe-title"), essential: g("pbe-essential"), vocab: g("pbe-vocab").split(",").map(s => s.trim()).filter(Boolean),
      materials: lines(g("pbe-materials")), prep: lines(g("pbe-prep")), phases, discuss: lines(g("pbe-discuss")),
      misconceptions: lines(g("pbe-mis")).map(x => { const [m, fix] = x.split("→").map(s => s.trim()); return { m, fix: fix || "" }; }),
      ml: lines(g("pbe-ml")), access: lines(g("pbe-access")), extend: lines(g("pbe-extend")),
      formative: { evidence: g("pbe-evidence"), lookFor: lines(g("pbe-look")), respond: g("pbe-respond") }, exit: g("pbe-exit"), ai: g("pbe-ai"),
      canvas: lines(g("pbe-canvas")), reflect: lines(g("pbe-reflect")), sub: { ok: !!g("pbe-subok"), plan: lines(g("pbe-sub")) } };
  }
  function editVideo(pb, id) {
    const v = pb.videos.find(x => x.id === id); if (!v) return `<p>No such video.</p>`;
    return `<h2 class="sl2-h2">Viewing guide: ${h(v.title)}</h2>
      <p class="tm-note" role="note">Enter a segment only after you preview the video. Never type times or quotations you have not checked. <a href="${h(v.url)}" target="_blank" rel="noopener">Open the video<span class="sr"> (opens in a new tab)</span> ↗</a></p>
      ${flash ? `<p class="tm-flash" role="status">${h(flash)}</p>` : ""}
      <form class="tm-form pbe" data-pb-video="${pb.unit}:${h(id)}" novalidate>
        <div class="pbe-row">${inp("pbv-start", "Segment start (m:ss)", v.segment.start)}${inp("pbv-end", "Segment end (m:ss)", v.segment.end)}<label class="pbe-f"><span><input type="checkbox" id="pbv-ok"${v.segment.verified ? " checked" : ""}> I previewed the video and checked these times</span></label></div>
        ${inp("pbv-note", "Segment note", v.segment.note)}
        ${[["purpose", "Instructional purpose"], ["before", "Before viewing"], ["during", "During viewing"], ["after", "After viewing"], ["practice", "Student practice"], ["check", "Formative check"], ["language", "Language scaffolding"], ["college", "College extension"], ["captions", "Captions / transcript"], ["alternative", "If the video is blocked"]].map(([k, t]) => ta("pbv-" + k, t, v[k], 2)).join("")}
        ${ta("pbv-pauses", "Pause and discuss (one per line)", (v.pauses || []).join("\n"))}
        <p class="tm-flash pb-msg" role="status" data-pb-msg></p>
        <p class="sl2-btns"><button type="submit" class="btn primary">Save draft</button> <a class="btn" href="#/teacher/playbook/${pb.unit}/videos#${h(id)}">Cancel</a></p></form>`;
  }
  function saveDraft(unit, next) { const ctx = B.ctx; if (!ctx || !ctx.drafts) return false; ctx.drafts[unit] = next; ctx.save(); return true; }

  /* ---------- routes ---------- */
  /** Lesson Manager tab: #/teacher/playbook[/unit[/YYYY-MM-DD[/full] | /wWWdD | /videos | /edit/wWWdD | /edit/video/ID]] */
  B.tab = function (a1, a2, ctx, a3, a4) {
    B.ctx = ctx; // the Lesson Manager's semester, group and drafts (also used by tests/tools/playbook-export.py)
    const unit = Number(a1) || 1, pb = B.load(unit);
    if (!pb) return loading(unit);
    const units = [1, 2, 3, 4, 5, 6].map(u => `<a class="btn${u === unit ? " primary" : ""}" href="#/teacher/playbook/${u}">Unit ${u}</a>`).join(" ");
    const nav = `<p class="sl2-btns sl2-noprint">${units}${a2 ? ` <a class="btn" href="#/teacher/playbook/${unit}">← Unit ${unit} overview</a>` : ""}</p>`;
    let body;
    if (a2 === "videos") body = videos(pb);
    else if (a2 === "edit" && a3 === "video") body = editVideo(pb, a4);
    else if (a2 === "edit") body = editLesson(pb, a3);
    else if (a2 && /^w\d{2}d[1-5]$/.test(a2)) body = pb.lessons[a2] ? segmentSections(pb, a2, null) : `<p>No playbook entry for ${h(a2)}.</p>`;
    else if (a2 && /^\d{4}-\d{2}-\d{2}$/.test(a2)) body = a3 === "full" ? meetingPlan(pb, ctx, a2, false) : quick(pb, ctx, a2, false);
    else body = overview(pb, ctx);
    flash = "";
    return nav + body;
  };
  /** Print routes: #/teacher/print/quick|plan|sub/YYYY-MM-DD and #/teacher/print/playbook/N */
  B.print = function (kind, arg, ctx) {
    B.ctx = ctx;
    const unit = kind === "playbook" ? Number(arg) || 1 : (ctx.model(arg) || {}).unit || 1, pb = B.load(unit);
    const titles = { quick: "Quick Teach · Speech", plan: "Teacher lesson plan · Speech", sub: "Substitute plan · Speech", playbook: "Instructor Playbook · Speech" };
    const body = !pb ? loading(unit) : kind === "playbook" ? `<h2 class="sl2-h2">Unit ${unit} Instructor Playbook</h2>${unitOverview(pb)}${resources(pb)}${videos(pb, true)}`
      : kind === "quick" ? quick(pb, ctx, arg, true) : kind === "sub" ? subPlan(pb, ctx, arg) : meetingPlan(pb, ctx, arg, true);
    const back = kind === "playbook" ? `#/teacher/playbook/${unit}` : kind === "plan" ? `#/teacher/playbook/${unit}/${h(arg)}/full` : `#/teacher/playbook/${unit}/${h(arg)}`;
    return `<div class="wrap sl2 sp pb pb-print-${kind}" id="sl2-main" data-notr><p class="sl2-noprint sl2-btns"><a class="btn" href="${back}">← Playbook</a> <button type="button" class="btn primary" data-sl2-print>Print</button></p>
      <h1 class="sl2-h1">${titles[kind] || titles.plan}</h1>${kind === "sub" ? "" : "<p>Mr. Bennett, Wyandotte High School. Contains no student information.</p>"}${body}</div>`;
  };
  /** Extra section for the full substitute plan (#/sub/...). */
  B.sub = function (mod) {
    if (!mod || !mod.unit) return "";
    const pb = B.load(mod.unit), cr = B.cache.classroom; if (!pb) return "";
    const segs = (mod.keys || []).map(k => pb.lessons[k]).filter(Boolean); if (!segs.length) return "";
    return `${cr ? `<h3>Classroom expectations</h3>${list(cr.expectations)}<p><b>Accommodations:</b> ${h(cr.accommodations)}</p>` : ""}<h3>Substitute instructions (Instructor Playbook, draft)</h3>${segs.map(l => `<p><b>${h(l.title)}:</b> ${l.sub.ok ? "" : "<i>Not recommended for a substitute.</i> "}</p>${list(l.sub.plan)}`).join("")}${list((pb.sub || {}).general)}`;
  };

  // This script loads after the Lesson Manager; redraw a teacher page that was drawn before the playbook existed.
  if (/^#\/(teacher|sub)(\/|$)/.test(location.hash) && X.refresh) X.refresh();
  document.addEventListener("input", e => {
    const t = e.target; if (!t.matches || !t.matches("[data-pb-note]")) return;
    const r = getNotes(); const k = t.dataset.pbNote; if (t.value.trim()) r.notes[k] = { text: t.value.slice(0, 5000), updated: X.today() }; else delete r.notes[k];
    putJSON(NOTES, r);
  });
  document.addEventListener("change", e => {
    const t = e.target; if (!t.matches || !t.matches("[data-pb-plan]") || !B.ctx) return;
    const st = getPlan(), k = t.dataset.pbPlan, n = t.value === "" ? null : Number(t.value), before = JSON.stringify(st);
    if (k === "size") { if (n == null) delete st.size[sizeKey(B.ctx)]; else if (n >= 1 && n <= 60) st.size[sizeKey(B.ctx)] = Math.round(n); }
    else if (n == null) delete st[k]; else if (n >= 0 && n <= 15) st[k] = n;
    if (JSON.stringify(st) === before) return;
    putJSON(PLAN, st); flash = "Planning settings saved in this browser.";
    // Redraw after this event finishes (a change can fire while the page is already redrawing).
    setTimeout(() => { X.refresh(); const f = document.querySelector(`[data-pb-plan="${k}"]`); if (f) f.focus(); }, 0);
  });
  document.addEventListener("submit", e => {
    const f = e.target; if (!f.matches || !(f.matches("[data-pb-edit]") || f.matches("[data-pb-video]"))) return;
    e.preventDefault();
    const [u, id] = (f.dataset.pbEdit || f.dataset.pbVideo).split(":"), unit = Number(u), pb = B.load(unit);
    if (!pb) return;
    try {
      let next;
      if (f.dataset.pbEdit) { const st = (document.getElementById("pbe-status") || {}).value; next = applyLessonEdit(pb, id, readLesson(pb.lessons[id]), st); }
      else {
        const g = k => (document.getElementById("pbv-" + k) || {}).value || "";
        const text = {}; ["purpose", "before", "during", "after", "practice", "check", "language", "college", "captions", "alternative"].forEach(k => { text[k] = g(k).trim(); }); text.pauses = lines(g("pauses"));
        next = applyVideoEdit(pb, id, { start: g("start"), end: g("end"), note: g("note"), text }, !!(document.getElementById("pbv-ok") || {}).checked);
      }
      saveDraft(unit, next);
      const errs = validate(next, vctx()).errors.filter(x => x.where === id);
      flash = errs.length ? `Saved as a draft, but fix before export: ${errs.map(x => x.msg).join("; ")}` : "Saved as a draft in this browser. Export the playbook file from Publish when you are ready.";
    } catch (err) {
      // Keep what the teacher typed: show the problem in the form instead of redrawing it.
      const m = f.querySelector("[data-pb-msg]"); if (m) { m.textContent = "Not saved: " + err.message; m.tabIndex = -1; m.focus(); }
      return;
    }
    X.refresh();
    const m = document.querySelector(".tm-flash"); if (m) { m.tabIndex = -1; m.focus(); }
  });
  document.addEventListener("click", e => {
    const t = e.target.closest && e.target.closest("[data-pb-notesdl]"); if (!t) return;
    const r = getNotes(), text = Object.entries(r.notes).map(([k, n]) => `${k} (${n.updated})\n${n.text}\n`).join("\n") || "No notes yet.";
    try { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" })); a.download = `playbook-notes-${X.today()}.txt`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); } catch (err) {}
  });
})(typeof window !== "undefined" ? window : globalThis);
