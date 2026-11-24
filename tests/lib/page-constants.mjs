// Reads named top-level constants straight out of site/index.html so tests can compare
// them with the JSON data files. Each value is evaluated alone, with no DOM and no other page code.
import { readFileSync } from "node:fs";
import vm from "node:vm";

export function pageSource(path = new URL("../../site/index.html", import.meta.url)) {
  return readFileSync(path, "utf8");
}

// Return the source text of `const NAME = <value>;` by matching brackets and skipping strings.
export function constSource(src, name) {
  const re = new RegExp(`\\bconst ${name}\\s*=\\s*`);
  const m = re.exec(src);
  if (!m) throw new Error(`const ${name} not found`);
  let i = m.index + m[0].length;
  const start = i;
  let depth = 0, q = null;
  for (; i < src.length; i++) {
    const c = src[i];
    if (q) { if (c === "\\") { i++; continue; } if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === "`") { q = c; continue; }
    if (c === "[" || c === "{" || c === "(") depth++;
    else if (c === "]" || c === "}" || c === ")") depth--;
    else if ((c === ";" || c === ",") && depth === 0) break;
    if (depth === 0 && (c === "]" || c === "}") ) { i++; break; }
  }
  return src.slice(start, i).trim();
}

export function constValue(src, name) {
  // JSON round trip: values built in another VM context have foreign prototypes, which strict deepEqual rejects.
  return JSON.parse(JSON.stringify(vm.runInNewContext(`(${constSource(src, name)})`, {})));
}
