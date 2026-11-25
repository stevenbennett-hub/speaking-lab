/* Speak Up | The Speaking Lab — Instructor Playbook (teacher-facing; Lesson Manager → Playbook).
   Data: site/data/playbook/unit-N.json, loaded only when a teacher opens the Playbook (students never load it).
   The playbook EXTENDS lessons.json by lesson key (wWWdD): objectives, success criteria, journals and AI permissions
   are always read from the lesson and journal data (the Lesson Manager's drafts on this browser), never copied.
   Meeting plans are computed from the live schedule (odd/even group, Wednesdays, holidays, overrides): a 90-minute
   block opens with the journal, then the planned days that fall in it are taught as segments; compose() fits their
   core activities into the block, shortens them when needed, gives speeches the remaining time, and adds stretch
   activities when there is room. Teacher notes are kept in this browser only (speakup-teacher-notes-v1).
   Nothing here records or sends student information. */
(function (root) {
  "use strict";
  const PHASES = ["learn", "observe", "investigate", "practice", "perform", "reflect"];
  const NOTES = "speakup-teacher-notes-v1";
  const sum = a => a.reduce((n, x) => n + x, 0);
  const budgetOf = pb => { const b = (pb && pb.block) || {}; return (b.minutes || 90) - (b.journal || 15) - (b.transitions || 3); };

  /** Fit the segments of one block. keys: the planned days in this meeting (in order); taught: keys already taught
      at an earlier meeting of this unit for this group (a repeat becomes 10 minutes of review). */
  function compose(pb, keys, taught) {
    taught = taught || [];
    const segs = keys.map(k => {
      const ls = pb && pb.lessons && pb.lessons[k];
      if (!ls) return { key: k, missing: true, items: [] };
      if (taught.includes(k)) return { key: k, repeat: true, title: ls.title, items: [{ key: k, i: -1, phase: "reflect", title: "Review and catch-up for absent students", min: 10, core: true, review: true }] };
      return { key: k, title: ls.title, items: ls.phases.map((ph, i) => ({ key: k, i, phase: ph.phase, title: ph.title, min: ph.min, short: ph.short || null, core: !!ph.core, fill: !!ph.fill, video: ph.video || null })) };
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
    const plan = items.filter(x => x.plan > 0);
    return { budget, segs, plan, over: Math.max(0, need - budget), free, shortened, added, deferred,
      speechMinutes: sum(fills.map(x => x.plan)), speakers: Math.floor(sum(fills.map(x => x.plan)) / 3) };
  }

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
      for (const f of ["learn", "lang", "success", "prompt"]) if (f in l) err(k, `${f} belongs in lessons.json / journals.json, not the playbook`);
      if (!Array.isArray(l.phases) || !l.phases.some(p => p.core)) err(k, "needs at least one core phase");
      for (const p of l.phases || []) {
        if (!PHASES.includes(p.phase)) err(k, `unknown phase ${p.phase}`);
        if (!(Number.isInteger(p.min) && p.min > 0 && p.min <= 90)) err(k, `bad minutes in "${p.title}"`);
        if (p.short != null && !(Number.isInteger(p.short) && p.short > 0 && p.short < p.min)) err(k, `short must be less than min in "${p.title}"`);
        if (p.video && !vids.has(p.video)) err(k, `unknown video ${p.video}`);
        if (!Array.isArray(p.teacher) || !p.teacher.length) err(k, `"${p.title}" needs teacher steps`);
      }
      for (const f of ["ml", "access", "extend", "misconceptions"]) if (!Array.isArray(l[f]) || !l[f].length) warn(k, `no ${f}`);
    }
    for (const r of pb.resources || []) if (!r.id || !r.title || !r.use || !Array.isArray(r.lines) || !r.lines.length) err(r.id || "resource", "resource needs id, title, use and lines");
    if (/student (name|id)|disab|IEP|504/i.test(JSON.stringify(pb.resources || []))) err("resources", "resources never collect names, IDs or disability information");
    if (pb.flex && ctx.journals && !ctx.journals.some(j => j.id === pb.flex.journal && j.flex)) err("flex", "flex journal not found");
    if (!["draft", "approved"].includes(pb.status)) err("file", "status must be draft or approved");
    return { errors, warnings };
  }

  /* ---------- browser part ---------- */
  const B = { PHASES, NOTES, compose, validate, budgetOf, cache: {} };
  root.SLPlaybook = B;
  if (typeof document === "undefined" || !root.SL2) return;
  const X = root.SL2, { h } = X;
  const PH = { learn: "Learn", observe: "Observe", investigate: "Investigate", practice: "Practice", perform: "Perform", reflect: "Reflect" };
  const mmss = m => `${Math.floor(m / 60) ? Math.floor(m / 60) + ":" : ""}${String(m % 60).padStart(Math.floor(m / 60) ? 2 : 1, "0")}`;
  const list = a => (a && a.length ? `<ul>${a.map(x => `<li>${h(x)}</li>`).join("")}</ul>` : "<p>—</p>");
  const getNotes = () => { try { const r = JSON.parse(localStorage.getItem(NOTES) || "null"); return r && r.v === 1 ? r : { v: 1, notes: {} }; } catch (e) { return { v: 1, notes: {} }; } };

  B.load = function (unit) {
    if (unit in B.cache) return B.cache[unit];
    B.cache[unit] = undefined;
    fetch(`data/playbook/unit-${unit}.json`, { cache: "no-cache" }).then(r => (r.ok ? r.json() : null)).catch(() => null)
      .then(j => { B.cache[unit] = j; if (X.refresh) X.refresh(); });
    return undefined;
  };
  const loading = u => (B.cache[u] === null ? `<p>No playbook has been written for Unit ${u} yet. Unit 1 is the prototype; Units 2–6 follow after it is approved.</p>` : `<p role="status">Loading the Unit ${u} playbook…</p>`);

  /** All meetings of a unit for the Lesson Manager's semester and group, with what each one teaches. */
  function unitMeetings(ctx, unit) {
    const rows = ctx.meetings().filter(m => m.unit === unit), taught = [];
    return rows.map(m => { const mod = ctx.model(m.date); const keys = (mod && mod.keys) || []; const out = { m, mod, keys, taught: taught.slice() }; keys.forEach(k => { if (!taught.includes(k)) taught.push(k); }); return out; });
  }
  B.unitMeetings = unitMeetings;

  function phaseDetail(pb, ls, x) {
    if (x.review) return `<p>Review the previous lesson's key ideas and finish anything students missed (absent students, the site tour, unfinished labs).</p>`;
    const p = ls.phases[x.i], v = p.video && (pb.videos || []).find(y => y.id === p.video);
    return `${list(p.teacher)}${p.students ? `<p><b>Students:</b> ${h(p.students)}</p>` : ""}${p.check ? `<p><b>Check:</b> ${h(p.check)}</p>` : ""}${v ? `<p><b>Video:</b> <a href="#/teacher/playbook/${pb.unit}/videos#${h(v.id)}">${h(v.title)}</a> (viewing guide)</p>` : ""}`;
  }
  function timeline(pb, c, mod) {
    const j = pb.block.journal || 15;
    let t = j;
    const rows = [`<tr><td>0–10</td><td>Reflect</td><td>Daily Learning Journal${mod && mod.journal ? ` #${mod.meeting.number}` : ""} (handwritten)</td></tr>`, `<tr><td>10–${j}</td><td>Reflect</td><td>Stand and share with someone new</td></tr>`];
    for (const x of c.plan) { rows.push(`<tr><td>${t}–${t + x.plan}</td><td>${PH[x.phase]}</td><td>${h(x.title)}${x.plan < x.min && !x.fill ? ` <i>(shortened from ${x.min})</i>` : ""}${x.fill ? ` <i>(speech time)</i>` : ""} ${x.core ? "" : " <i>(stretch)</i>"} <span class="pb-key">${h(x.key)}</span></td></tr>`); t += x.plan; }
    rows.push(`<tr><td>${t}–90</td><td>—</td><td>Transitions and buffer${c.free ? ` (${c.free} unplanned minutes)` : ""}</td></tr>`);
    return `<div class="sl2-tablewrap"><table class="sl2-table pb-time"><thead><tr><th scope="col">Minutes</th><th scope="col">Phase</th><th scope="col">Activity</th></tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
  }
  function segmentSections(pb, key, mod, printing, inMeeting) {
    const ls = pb.lessons[key]; if (!ls) return "";
    const lesson = mod && mod.lessons ? mod.lessons[mod.keys.indexOf(key)] : null;
    return `<section class="pb-seg"><h3>${h(key)} · ${h(ls.title)}</h3>
      ${lesson ? `<p><b>Learning objective:</b> ${h(X.pick(lesson.learn))}</p><p><b>Language objective:</b> ${h(X.pick(lesson.lang))}</p>${lesson.col ? `<p><b>College objective:</b> ${h(X.pick(lesson.col))}</p>` : ""}<p><b>Success criteria:</b></p>${list(X.pick(lesson.success) || [])}` : ""}
      <p><b>Essential question:</b> ${h(ls.essential)}</p>
      <p><b>Academic vocabulary:</b> ${h((ls.vocab || []).join(", "))}</p>
      ${inMeeting ? "" : `<div class="pb-2col"><div><h4>Materials</h4>${list(ls.materials)}</div><div><h4>Preparation</h4>${list(ls.prep)}</div></div>`}
      <h4>Activities</h4>${ls.phases.map((p, i) => `<details class="pb-ph"${p.core || printing ? " open" : ""}><summary>${PH[p.phase]} · ${h(p.title)} · ${p.min} min${p.core ? "" : " (stretch)"}</summary>${phaseDetail(pb, ls, { i })}</details>`).join("")}
      <h4>Discussion questions</h4>${list(ls.discuss)}
      <h4>Anticipated misconceptions</h4>${(ls.misconceptions || []).length ? `<ul>${ls.misconceptions.map(m => `<li><b>${h(m.m)}</b> → ${h(m.fix)}</li>`).join("")}</ul>` : "<p>—</p>"}
      <div class="pb-2col"><div><h4>Multilingual learners</h4>${list(ls.ml)}</div><div><h4>Accessibility and flexible supports</h4>${list(ls.access)}</div></div>
      <h4>Advanced and college extensions</h4>${list(ls.extend)}
      <h4>Formative assessment</h4><p><b>Evidence:</b> ${h(ls.formative.evidence)}</p>${list(ls.formative.lookFor)}<p><b>If…then:</b> ${h(ls.formative.respond)}</p>
      <h4>AI permission</h4><p>${h(ls.ai || "")}</p>
      <h4>Canvas</h4>${list(ls.canvas)}
      <h4>Exit reflection</h4><p>${h(ls.exit)}</p>
      <h4>Teacher reflection</h4>${list(ls.reflect)}
      ${printing ? printNote(key) : noteBox(key)}</section>`;
  }
  function printNote(key) { const n = getNotes().notes[key]; return n && n.text ? `<h4>My notes</h4><p>${h(n.text)}</p>` : `<h4>My notes</h4><div class="sp-lines"></div>`; }
  function noteBox(key) {
    const n = getNotes().notes[key] || {};
    return `<div class="pb-note sl2-noprint"><label for="pbn-${h(key)}"><b>My notes for ${h(key)}</b> (saved in this browser only; no student names)</label><textarea id="pbn-${h(key)}" rows="3" data-pb-note="${h(key)}">${h(n.text || "")}</textarea>${n.updated ? `<p class="sl2-small">Last saved ${h(n.updated)}</p>` : ""}</div>${n.text ? `<div class="pb-noteprint"><h4>My notes</h4><p>${h(n.text)}</p></div>` : ""}`;
  }

  /** A full teacher plan for one class meeting. */
  function meetingPlan(pb, ctx, day, printing) {
    const all = unitMeetings(ctx, pb.unit), row = all.find(r => r.m.date === day);
    if (!row) return `<p>The ${h(ctx.groupLabel)} group has no Unit ${pb.unit} class on ${h(X.fmtLong(day))}.</p>`;
    const c = compose(pb, row.keys, row.taught), mod = row.mod, n = all.indexOf(row) + 1;
    const flex = mod && mod.journal && pb.flex && mod.journal.id === pb.flex.journal;
    const fresh = row.keys.filter(k => !row.taught.includes(k));
    const mats = [...new Set(fresh.flatMap(k => (pb.lessons[k] || {}).materials || []))], prep = [...new Set(fresh.flatMap(k => (pb.lessons[k] || {}).prep || []))];
    const ai = mod && X.aiLevel(mod.ai.level);
    const last = fresh.length ? pb.lessons[fresh[fresh.length - 1]] : null;
    return `<h2 class="sl2-h2">${h(X.fmtLong(day))} · ${h(ctx.groupLabel)} · Unit ${pb.unit} meeting ${n} of ${all.length}</h2>
      <p class="pb-draft" role="note">${pb.status === "approved" ? "Approved playbook." : "Draft playbook: not yet approved."} Objectives, success criteria, the journal and the AI permission come from the published lesson data (your unpublished drafts show here only while "Show my drafts" is on in Publish).</p>
      <p><b>Planned days in this block:</b> ${row.keys.map(k => `${h(k)}${row.taught.includes(k) ? " (already taught; review)" : ""}`).join(", ") || "none"}${mod && mod.extendOf ? ` · continues ${h(X.fmtShort(mod.extendOf))}` : ""}${mod && mod.meeting && mod.meeting.note ? ` · note: ${h(mod.meeting.note)}` : ""}</p>
      ${c.over ? `<p class="pb-warn" role="status"><b>Over by ${c.over} minutes</b> even with shortened activities. Move one core activity to the next meeting or split speeches.</p>` : ""}
      ${c.shortened.length ? `<p class="pb-warn">Shortened to fit: ${c.shortened.map(x => `${h(x.title)} (${x.min}→${x.plan})`).join("; ")}.</p>` : ""}
      ${c.speechMinutes ? `<p><b>Speech time:</b> ${c.speechMinutes} minutes ≈ ${c.speakers} high school speakers (about 3 minutes each; college about 4).</p>` : ""}
      ${c.deferred.length ? `<p><b>Stretch activities that don't fit today:</b> ${c.deferred.map(x => h(x.title)).join("; ")}.</p>` : ""}
      ${c.free >= 10 && (pb.overview.spare || []).length ? `<p><b>${c.free} unplanned minutes.</b> Options:</p>${list(pb.overview.spare)}` : ""}
      <h3>Timing (90-minute block)</h3>${timeline(pb, c, mod)}
      <h3>Journal</h3>${mod && mod.journal ? `<p><b>Journal #${mod.meeting.number}:</b> ${h(X.pick(mod.journal.prompt))}</p><p><b>Stand and share:</b> ${h(X.pick(mod.journal.share))}</p>${flex ? `<p><b>Flex meeting:</b> ${h(pb.flex.when)} Plan: ${pb.flex.phases.map(p => `${h(p.title)} (${p.min} min${p.core ? "" : ", if time"})`).join("; ")}. ${h(pb.flex.note)}</p>` : ""}` : "<p>No journal for this class.</p>"}
      <h3>AI permission for today's work</h3><p>${ai ? h(X.pick(ai.name)) : "Class default"}${mod && mod.ai.note ? ` (${h(X.pick(mod.ai.note))})` : ""}. Set per lesson in the Lesson Manager.</p>
      <div class="pb-2col"><div><h3>Materials</h3>${list(mats)}</div><div><h3>Preparation</h3>${list(prep)}</div></div>
      ${fresh.map(k => segmentSections(pb, k, mod, printing, true)).join("")}
      ${last ? `<h3>Exit reflection for this block</h3><p>${h(last.exit)}</p>` : ""}
      ${printing ? "" : `<p class="sl2-btns sl2-noprint"><a class="btn primary" href="#/teacher/print/plan/${day}">Printable plan</a> <a class="btn" href="#/sub/${ctx.grp}/${day}">Substitute plan</a> <a class="btn" href="#/teacher/date/${day}">This date in the Lesson Manager</a></p>`}`;
  }

  function overview(pb, ctx) {
    const o = pb.overview, rows = unitMeetings(ctx, pb.unit);
    const map = rows.map((r, n) => { const c = compose(pb, r.keys, r.taught); return `<tr><td><a href="#/teacher/playbook/${pb.unit}/${r.m.date}">${h(X.fmtShort(r.m.date))}</a>${new Date(r.m.date + "T12:00:00Z").getUTCDay() === 3 ? " (Wed)" : ""}</td><td>${n + 1}</td><td>${r.mod && r.mod.journal ? `#${r.m.number}${r.mod.journal.flex ? " flex" : ""}` : "—"}</td><td>${r.keys.map(k => r.taught.includes(k) ? `${h(k)} (review)` : h(k)).join(", ")}</td><td>${c.over ? `<b>over ${c.over} min</b>` : c.speechMinutes ? `${c.speechMinutes} min speeches (≈${c.speakers})` : `${c.free} min spare`}</td></tr>`; }).join("");
    return `<h2 class="sl2-h2">Unit ${pb.unit}: ${h(o.title)}</h2>
      <p class="pb-draft" role="note">Instructor Playbook · ${h(pb.status)} · updated ${h(pb.updated)}. Teacher-facing; students never load it.</p>
      <p class="sl2-btns"><a class="btn" href="#/teacher/playbook/${pb.unit}/videos">Video viewing guides</a> <a class="btn" href="#/teacher/print/playbook/${pb.unit}">Print the unit overview</a> <button type="button" class="btn" data-pb-notesdl>Download my notes</button></p>
      <h3>Meeting map · ${h(ctx.semLabel)} · ${h(ctx.groupLabel)}</h3>
      <p class="sl2-small">Computed from the calendar, the odd/even groups, Wednesdays and your overrides. Change the semester or group above to see the others.</p>
      <div class="sl2-tablewrap"><table class="sl2-table"><thead><tr><th scope="col">Date</th><th scope="col">Meeting</th><th scope="col">Journal</th><th scope="col">Planned days</th><th scope="col">Fit</th></tr></thead><tbody>${map || `<tr><td colspan="5">No meetings found.</td></tr>`}</tbody></table></div>
      ${unitOverview(pb)}
      ${resources(pb)}<h3>Lessons (planned days)</h3><ul>${Object.entries(pb.lessons).map(([k, l]) => `<li><a href="#/teacher/playbook/${pb.unit}/${k}">${h(k)}</a> · ${h(l.title)}</li>`).join("")}</ul>`;
  }
  function unitOverview(pb) {
    const o = pb.overview;
    return `<h3>Unit overview</h3><p><b>Essential question:</b> ${h(o.essential)}</p><h4>Guiding questions</h4>${list(o.questions)}<h4>Enduring understandings</h4>${list(o.understandings)}
      <h4>Summative assessment</h4><p>${h(o.summative)}</p>
      <h4>${pb.framework.map(f => f.name).join(" → ")}</h4><div class="sl2-tablewrap"><table class="sl2-table"><thead><tr><th scope="col">Phase</th><th scope="col">Where</th><th scope="col">What</th></tr></thead><tbody>${o.arc.map(a => `<tr><td>${PH[a.phase]}</td><td>${h(a.where)}</td><td>${h(a.what)}</td></tr>`).join("")}</tbody></table></div>
      <h4>Academic vocabulary</h4><p>${h(o.vocab.join(", "))}</p><h4>Readings</h4>${list(o.readings)}
      <div class="pb-2col"><div><h4>Materials checklist</h4>${list(o.materials)}</div><div><h4>Preparation checklist</h4>${list(o.prep)}</div></div>
      <h4>Scheduling notes</h4>${list(o.scheduling)}<h4>Speech days</h4><p>${h(o.speechDays)}</p><h4>Beyond the Podium</h4><p>${h(o.btp)}</p>${pb.flex ? `<p><b>Flex meeting:</b> ${h(pb.flex.when)}</p>` : ""}<h4>When a block has spare time</h4>${list(o.spare)}
      <h4>Multilingual learners</h4><p>${h(o.ml)}</p><h4>Accessibility (UDL)</h4><p>${h(o.access)}</p><h4>College Public Speaking</h4><p>${h(o.college)}</p>`;
  }
  function videos(pb) {
    return `<h2 class="sl2-h2">Unit ${pb.unit} video viewing guides</h2>
      <p class="pb-draft" role="note">Segments and timestamps are blank until you preview each video; nothing here quotes a video. Open videos in a new tab (no autoplay); turn captions on.</p>
      ${pb.videos.map(v => `<section class="pb-vid" id="${h(v.id)}"><h3>${h(v.title)}</h3>
        <p><b>Speaker:</b> ${h(v.speaker)} · <b>Source:</b> ${h(v.channel)} (${h(v.upload)}) · <a href="${h(v.url)}" target="_blank" rel="noopener">Open on YouTube<span class="sr"> (opens in a new tab)</span></a></p>
        <p><b>On the site:</b> ${h(v.onSite)} · <b>Used in:</b> ${h(v.lessons.join(", "))}</p><p><b>Purpose:</b> ${h(v.purpose)}</p>
        <p><b>Segment:</b> ${v.segment.start ? `${h(v.segment.start)}–${h(v.segment.end || "end")}` : "start ____ end ____"} ${v.segment.verified ? "(verified)" : "<i>(not verified: preview and fill in)</i>"}. ${h(v.segment.note)}</p>
        <dl class="pb-dl"><dt>Before viewing</dt><dd>${h(v.before)}</dd><dt>During viewing</dt><dd>${h(v.during)}</dd><dt>Pause and discuss</dt><dd>${list(v.pauses)}</dd><dt>After viewing</dt><dd>${h(v.after)}</dd><dt>Student practice</dt><dd>${h(v.practice)}</dd><dt>Formative check</dt><dd>${h(v.check)}</dd><dt>Language scaffolding</dt><dd>${h(v.language)}</dd><dt>College extension</dt><dd>${h(v.college)}</dd><dt>Captions</dt><dd>${h(v.captions)}</dd><dt>If the video is blocked</dt><dd>${h(v.alternative)}</dd></dl></section>`).join("")}`;
  }

  function resources(pb) {
    return (pb.resources || []).length ? `<h3>Formative assessment resources (printable)</h3>${pb.resources.map(r => `<section class="pb-res"><h4>${h(r.title)}</h4><p class="sl2-small">${h(r.use)}</p><ul class="pb-lines">${r.lines.map(l => `<li>${h(l)}</li>`).join("")}</ul></section>`).join("")}` : "";
  }
  /** Lesson Manager tab: #/teacher/playbook[/unit[/YYYY-MM-DD | /wWWdD | /videos]] */
  B.tab = function (a1, a2, ctx) {
    B.ctx = ctx; // the Lesson Manager's current semester and group (used by tests/tools/playbook-export.py)
    const unit = Number(a1) || 1, pb = B.load(unit);
    if (!pb) return loading(unit);
    const units = [1, 2, 3, 4, 5, 6].map(u => `<a class="btn${u === unit ? " primary" : ""}" href="#/teacher/playbook/${u}">Unit ${u}</a>`).join(" ");
    const nav = `<p class="sl2-btns sl2-noprint">${units}${a2 ? ` <a class="btn" href="#/teacher/playbook/${unit}">← Unit ${unit} overview</a>` : ""}</p>`;
    if (a2 === "videos") return nav + videos(pb);
    if (a2 && /^w\d{2}d[1-5]$/.test(a2)) return nav + (pb.lessons[a2] ? segmentSections(pb, a2, null) : `<p>No playbook entry for ${h(a2)}.</p>`);
    if (a2 && /^\d{4}-\d{2}-\d{2}$/.test(a2)) return nav + meetingPlan(pb, ctx, a2, false);
    return nav + overview(pb, ctx);
  };
  /** Print routes: #/teacher/print/plan/YYYY-MM-DD and #/teacher/print/playbook/N */
  B.print = function (kind, arg, ctx) {
    const unit = kind === "playbook" ? Number(arg) || 1 : (ctx.model(arg) || {}).unit || 1, pb = B.load(unit);
    const body = !pb ? loading(unit) : kind === "playbook" ? `<h2 class="sl2-h2">Unit ${unit} Instructor Playbook</h2>${unitOverview(pb)}${resources(pb)}${videos(pb)}` : meetingPlan(pb, ctx, arg, true);
    return `<div class="wrap sl2 sp pb" id="sl2-main" data-notr><p class="sl2-noprint sl2-btns"><a class="btn" href="#/teacher/playbook/${unit}${kind === "plan" ? "/" + h(arg) : ""}">← Playbook</a> <button type="button" class="btn primary" data-sl2-print>Print</button></p>
      <h1 class="sl2-h1">${kind === "plan" ? "Teacher lesson plan · Speech" : "Instructor Playbook · Speech"}</h1><p>Mr. Bennett, Wyandotte High School. Contains no student information.</p>${body}</div>`;
  };
  /** Extra section for the substitute plan (#/sub/...): the playbook's substitute steps for each planned day. */
  B.sub = function (mod) {
    if (!mod || !mod.unit) return "";
    const pb = B.load(mod.unit); if (!pb) return "";
    const segs = (mod.keys || []).map(k => pb.lessons[k]).filter(Boolean); if (!segs.length) return "";
    return `<h3>Substitute instructions (Instructor Playbook, draft)</h3>${segs.map(l => `<p><b>${h(l.title)}:</b> ${l.sub.ok ? "" : "<i>Not recommended for a substitute.</i> "}</p>${list(l.sub.plan)}`).join("")}${list((pb.sub || {}).general)}`;
  };

  // This script loads after the Lesson Manager; redraw a teacher page that was drawn before the playbook existed.
  if (/^#\/(teacher|sub)(\/|$)/.test(location.hash) && X.refresh) X.refresh();
  document.addEventListener("input", e => {
    const t = e.target; if (!t.matches || !t.matches("[data-pb-note]")) return;
    const r = getNotes(); const k = t.dataset.pbNote; if (t.value.trim()) r.notes[k] = { text: t.value.slice(0, 5000), updated: X.today() }; else delete r.notes[k];
    try { localStorage.setItem(NOTES, JSON.stringify(r)); } catch (err) {}
  });
  document.addEventListener("click", e => {
    const t = e.target.closest && e.target.closest("[data-pb-notesdl]"); if (!t) return;
    const r = getNotes(), text = Object.entries(r.notes).map(([k, n]) => `${k} (${n.updated})\n${n.text}\n`).join("\n") || "No notes yet.";
    try { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" })); a.download = `playbook-notes-${X.today()}.txt`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); } catch (err) {}
  });
})(typeof window !== "undefined" ? window : globalThis);
