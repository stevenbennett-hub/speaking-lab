/* Speak Up | The Speaking Lab — read-only view of a student's saved progress, for unit states and (later)
   achievements. It only READS the existing localStorage keys and never renames or rewrites them:
     speakup-quiz-v1  { u: { "<unit>": { best: 0-100, … } } }   Reading checks (80% = mastered)
     speakup-test-v1  { "<unit>": { best: 0-100, … } }          Practice tests
   Progress is per browser and per computer, can be cleared, and is not official grading evidence. */
(function (root) {
  "use strict";
  const MASTERY = 80;
  const read = k => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } };
  /** Progress for one unit: quiz and test best scores, and simple, honest states. */
  function unit(id) {
    const Q = read("speakup-quiz-v1"), P = read("speakup-test-v1");
    const q = Q && Q.u && Q.u[id], t = P && P[id];
    const quizBest = q && q.best != null ? q.best : null, testBest = t && t.best != null ? t.best : null;
    const started = quizBest != null || testBest != null || !!(q && Object.keys(q).length) || !!(t && Object.keys(t).length);
    const mastered = quizBest != null && quizBest >= MASTERY;
    return { id, quizBest, testBest, mastered, started, completed: mastered && testBest != null, source: "self-check" };
  }
  root.SLProgress = { MASTERY, unit, all: ids => ids.map(unit) };
})(typeof window !== "undefined" ? window : globalThis);
