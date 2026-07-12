/**
 * actionlint runner over the lockfile-installed wasm build (npm `actionlint`).
 *
 * The npm package is a library (no CLI bin), so this thin runner lints every
 * workflow under .github/workflows and exits non-zero on findings. Limitation
 * vs the Go binary: the wasm build cannot shell out to shellcheck/pyflakes,
 * so `run:` script contents get actionlint's own checks only.
 *
 * Usage: bun scripts/actionlint.ts [files...]
 */
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { createLinter } from "actionlint";

const explicit = process.argv.slice(2);
let files = explicit;
if (files.length === 0) {
  const dir = ".github/workflows";
  try {
    files = (await readdir(dir))
      .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
      .map((f) => join(dir, f));
  } catch {
    console.log("actionlint: no .github/workflows directory — nothing to lint.");
    process.exit(0);
  }
}

if (files.length === 0) {
  console.log("actionlint: no workflow files found — nothing to lint.");
  process.exit(0);
}

const lint = await createLinter();
let findings = 0;
for (const file of files) {
  const source = await readFile(file, "utf8");
  for (const r of lint(source, file)) {
    findings += 1;
    console.error(`${r.file}:${r.line}:${r.column}: ${r.message} [${r.kind}]`);
  }
}

if (findings > 0) {
  console.error(`actionlint: ${findings} finding(s) in ${files.length} file(s).`);
  process.exit(1);
}
console.log(`actionlint: ${files.length} workflow file(s) clean.`);
