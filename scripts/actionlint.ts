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

// The npm wasm build (2.0.6) lags the Go actionlint and does not know the
// `vars` context (GitHub "configuration variables", valid since 2022; used by
// release.yml's NPM_PUBLISH_ENABLED gate). Filter that one false positive.
// Remove this when the npm package's checker recognizes `vars`.
//
// Custom self-hosted label `ggsvelte` is declared in .github/actionlint.yaml
// for the Go CLI; the wasm package has no config hook, so filter the noise.
const KNOWN_FALSE_POSITIVES = [/undefined variable "vars"/, /label "ggsvelte" is unknown/];

const lint = await createLinter();
let findings = 0;
let suppressed = 0;
for (const file of files) {
  const source = await readFile(file, "utf8");
  for (const r of lint(source, file)) {
    if (KNOWN_FALSE_POSITIVES.some((re) => re.test(r.message))) {
      suppressed += 1;
      continue;
    }
    findings += 1;
    console.error(`${r.file}:${r.line}:${r.column}: ${r.message} [${r.kind}]`);
  }
}
if (suppressed > 0) {
  console.log(
    `actionlint: ${suppressed} known-false-positive finding(s) suppressed (see KNOWN_FALSE_POSITIVES).`,
  );
}

if (findings > 0) {
  console.error(`actionlint: ${findings} finding(s) in ${files.length} file(s).`);
  process.exit(1);
}
console.log(`actionlint: ${files.length} workflow file(s) clean.`);
