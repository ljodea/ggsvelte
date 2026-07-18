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
 * Load/init failures: fatal under CI (`CI` / `GITHUB_ACTIONS`), soft-skip only
 * on local machines (arch mismatch, missing wasm). The pre-push hook and the
 * required `actions-security` job both call this script; CI must never green
 * on a silent skip.
 *
 * Usage: bun scripts/actionlint.ts [files...]
 */
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const ACTIONLINT_YAML = ".github/actionlint.yaml";

/**
 * Soft-skip wasm load failures only outside CI. GitHub Actions sets both
 * `CI=true` and `GITHUB_ACTIONS=true`; local pre-push has neither.
 */
export function allowSoftSkipLoadFailure(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.CI !== "true" && env.GITHUB_ACTIONS !== "true";
}

/**
 * Parse a YAML list-item scalar value (the part after `- `).
 * Strips unquoted inline comments (`ggsvelte # pool` → `ggsvelte`) while
 * keeping `#` inside quotes (`"ggsvelte # literal"` → `ggsvelte # literal`).
 */
export function parseYamlListScalar(raw: string): string {
  const s = raw.trim();
  if (s.length === 0) return "";

  if (s.startsWith('"')) {
    let out = "";
    for (let i = 1; i < s.length; i++) {
      const ch = s[i]!;
      if (ch === '"') return out;
      if (ch !== "\\" || i + 1 >= s.length) {
        out += ch;
        continue;
      }
      // YAML double-quoted escapes (subset sufficient for label scalars).
      const next = s[i + 1]!;
      const simple: Record<string, string> = {
        "0": "\0",
        a: "\u0007",
        b: "\b",
        t: "\t",
        n: "\n",
        v: "\v",
        f: "\f",
        r: "\r",
        e: "\u001B",
        " ": " ",
        '"': '"',
        "/": "/",
        "\\": "\\",
        N: "\u0085",
        _: "\u00A0",
        L: "\u2028",
        P: "\u2029",
      };
      if (next in simple) {
        out += simple[next]!;
        i += 1;
        continue;
      }
      if (next === "x" && i + 3 < s.length) {
        const hex = s.slice(i + 2, i + 4);
        if (/^[0-9a-fA-F]{2}$/.test(hex)) {
          out += String.fromCodePoint(Number.parseInt(hex, 16));
          i += 3;
          continue;
        }
      }
      if (next === "u" && i + 5 < s.length) {
        const hex = s.slice(i + 2, i + 6);
        if (/^[0-9a-fA-F]{4}$/.test(hex)) {
          out += String.fromCodePoint(Number.parseInt(hex, 16));
          i += 5;
          continue;
        }
      }
      if (next === "U" && i + 9 < s.length) {
        const hex = s.slice(i + 2, i + 10);
        if (/^[0-9a-fA-F]{8}$/.test(hex)) {
          out += String.fromCodePoint(Number.parseInt(hex, 16));
          i += 9;
          continue;
        }
      }
      // Unknown escape: keep the escapee literally (YAML rejects these; we
      // stay permissive so a bad config still yields a stable suppression).
      out += next;
      i += 1;
    }
    return out;
  }

  if (s.startsWith("'")) {
    // YAML single-quoted: '' is an escaped single quote.
    let out = "";
    for (let i = 1; i < s.length; i++) {
      const ch = s[i]!;
      if (ch === "'") {
        if (s[i + 1] === "'") {
          out += "'";
          i += 1;
          continue;
        }
        return out;
      }
      out += ch;
    }
    return out;
  }

  // Plain scalar: `#` starts a comment only when preceded by whitespace.
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "#" && (i === 0 || /\s/.test(s[i - 1]!))) {
      return s.slice(0, i).trimEnd();
    }
  }
  return s;
}

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
      const label = parseYamlListScalar(item[1]!);
      if (label.length > 0) labels.push(label);
      continue;
    }
    // Blank / comment lines stay inside the list; any other key ends it.
    if (line.trim() === "" || /^\s*#/.test(line)) continue;
    inLabels = false;
  }
  return labels;
}

/**
 * Prepare workflow source for the lagging wasm actionlint checker.
 * Strips concurrency `queue: max` (GitHub Actions, May 2026) — actionlint
 * 2.0.6 / Go ≤1.7.12 reject the key and the wasm build panics mid-lint.
 * Real workflows keep `queue: max`; only the linter input is rewritten.
 */
export function prepareSourceForLint(source: string): string {
  return source.replace(/^[ \t]*queue:\s*max\s*(?:#.*)?\r?$/gm, "");
}

/** Build the message-filter list used against wasm findings. */
export function buildKnownFalsePositives(selfHostedLabels: string[]): RegExp[] {
  // The npm wasm build (2.0.6) lags the Go actionlint and does not know the
  // `vars` context (GitHub "configuration variables", valid since 2022; used by
  // release.yml's NPM_PUBLISH_ENABLED gate). Filter that one false positive.
  // Remove this when the npm package's checker recognizes `vars`.
  // Note: concurrency `queue: max` is stripped in prepareSourceForLint (not
  // filtered here) because the wasm build panics on that unknown key.
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

  // Local-only soft-skip when the wasm binding fails to load (arch mismatch,
  // missing native bits). Under CI the same failure is fatal so the required
  // actions-security job cannot green without running the linter.
  const softSkip = allowSoftSkipLoadFailure();
  let createLinter: typeof import("actionlint").createLinter;
  try {
    ({ createLinter } = await import("actionlint"));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (softSkip) {
      console.warn(`actionlint: wasm package failed to load — skipping local gate (${msg}).`);
      process.exit(0);
    }
    console.error(`actionlint: wasm package failed to load (${msg}).`);
    process.exit(1);
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
    if (softSkip) {
      console.warn(`actionlint: createLinter failed — skipping local gate (${msg}).`);
      process.exit(0);
    }
    console.error(`actionlint: createLinter failed (${msg}).`);
    process.exit(1);
  }

  const knownFalsePositives = buildKnownFalsePositives(await loadSelfHostedLabels());

  let findings = 0;
  let suppressed = 0;
  for (const file of files) {
    const source = prepareSourceForLint(await readFile(file, "utf8"));
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
