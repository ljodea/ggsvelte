/**
 * actionlint runner over the lockfile-installed wasm build (npm `actionlint`).
 *
 * The npm package is a library (no CLI bin), so this thin runner lints every
 * workflow under .github/workflows and exits non-zero on findings. Limitation
 * vs the Go binary: the wasm build cannot shell out to shellcheck/pyflakes,
 * so `run:` script contents get actionlint's own checks only.
 *
 * Config parity with the Go CLI: self-hosted runner labels are read from
 * `.github/actionlint.yaml` (the Go CLI loads that file; the wasm build has no
 * config hook). Keep labels only in that yaml — this runner derives the
 * "label is unknown" suppressions from it so the two cannot drift.
 *
 * Usage: bun scripts/actionlint.ts [files...]
 */
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const ACTIONLINT_YAML = ".github/actionlint.yaml";

/** Parse `self-hosted-runner.labels` from actionlint.yaml without a YAML dep. */
export function parseSelfHostedLabels(yaml: string): string[] {
  const labels: string[] = [];
  let inSelfHosted = false;
  let inLabels = false;
  for (const raw of yaml.split("\n")) {
    const line = raw.replace(/\r$/, "");
    if (/^self-hosted-runner:\s*(#.*)?$/.test(line)) {
      inSelfHosted = true;
      inLabels = false;
      continue;
    }
    // A new top-level key ends the self-hosted-runner block.
    if (inSelfHosted && /^\S/.test(line) && line.trim() !== "" && !line.startsWith("#")) {
      inSelfHosted = false;
      inLabels = false;
    }
    if (!inSelfHosted) continue;
    if (/^\s+labels:\s*(#.*)?$/.test(line)) {
      inLabels = true;
      continue;
    }
    if (!inLabels) continue;
    const item = line.match(/^\s+-\s+(.+?)\s*$/);
    if (item) {
      labels.push(item[1]!.replaceAll(/^['"]|['"]$/g, ""));
      continue;
    }
    // Blank / comment lines stay inside the list; any other key ends it.
    if (line.trim() === "" || /^\s*#/.test(line)) continue;
    inLabels = false;
  }
  return labels;
}

/** Build the message-filter list used against wasm findings. */
export function buildKnownFalsePositives(selfHostedLabels: string[]): RegExp[] {
  // The npm wasm build (2.0.6) lags the Go actionlint and does not know the
  // `vars` context (GitHub "configuration variables", valid since 2022; used by
  // release.yml's NPM_PUBLISH_ENABLED gate). Filter that one false positive.
  // Remove this when the npm package's checker recognizes `vars`.
  const patterns: RegExp[] = [/undefined variable "vars"/];
  for (const label of selfHostedLabels) {
    // Escape regex metacharacters in labels so "ggsvelte" stays literal.
    const escaped = label.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
    patterns.push(new RegExp(`label "${escaped}" is unknown`));
  }
  return patterns;
}

async function loadSelfHostedLabels(): Promise<string[]> {
  try {
    const yaml = await readFile(ACTIONLINT_YAML, "utf8");
    return parseSelfHostedLabels(yaml);
  } catch {
    console.warn(
      `actionlint: could not read ${ACTIONLINT_YAML} — no self-hosted labels suppressed.`,
    );
    return [];
  }
}

async function main(): Promise<void> {
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

  // Graceful skip when the wasm binding fails to load (arch mismatch, missing
  // native bits, etc.). CI's actions-security job still enforces actionlint.
  let createLinter: typeof import("actionlint").createLinter;
  try {
    ({ createLinter } = await import("actionlint"));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(
      `actionlint: wasm package failed to load — skipping local gate (${msg}). CI actions-security still enforces this.`,
    );
    process.exit(0);
  }

  let lint: (
    source: string,
    path: string,
  ) => Iterable<{
    file: string;
    line: number;
    column: number;
    message: string;
    kind: string;
  }>;
  try {
    lint = await createLinter();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(
      `actionlint: createLinter failed — skipping local gate (${msg}). CI actions-security still enforces this.`,
    );
    process.exit(0);
  }

  const knownFalsePositives = buildKnownFalsePositives(await loadSelfHostedLabels());

  let findings = 0;
  let suppressed = 0;
  for (const file of files) {
    const source = await readFile(file, "utf8");
    for (const r of lint(source, file)) {
      if (knownFalsePositives.some((re) => re.test(r.message))) {
        suppressed += 1;
        continue;
      }
      findings += 1;
      console.error(`${r.file}:${r.line}:${r.column}: ${r.message} [${r.kind}]`);
    }
  }
  if (suppressed > 0) {
    console.log(
      `actionlint: ${suppressed} known-false-positive finding(s) suppressed (from ${ACTIONLINT_YAML} labels + wasm gaps).`,
    );
  }

  if (findings > 0) {
    console.error(`actionlint: ${findings} finding(s) in ${files.length} file(s).`);
    process.exit(1);
  }
  console.log(`actionlint: ${files.length} workflow file(s) clean.`);
}

if (import.meta.main) {
  await main();
}
