/**
 * Audit helpers for manual-AT release evidence aliases.
 *
 * An alias may ship without a new AT matrix only when the release commit range
 * does not touch chart/interaction runtime sources. The boolean
 * `runtimeBehaviorChanged: false` is necessary but not sufficient.
 */
import { spawnSync } from "node:child_process";

/** Paths whose substantive edits require a complete manual AT record. */
export function isRuntimeBehaviorPath(path: string): boolean {
  return path.startsWith("packages/svelte/src/") || path.startsWith("packages/core/src/");
}

export function runtimeBehaviorPaths(paths: readonly string[]): string[] {
  return paths.filter((path) => isRuntimeBehaviorPath(path));
}

/**
 * True when a unified (or binary) diff contains non-comment behavior changes.
 * JSDoc/block-comment noise is ignored; CSS universal selectors and code are not.
 */
export function diffTextIsSubstantive(diff: string): boolean {
  if (diff.includes("Binary files ") || diff.includes("GIT binary patch")) return true;

  for (const line of diff.split("\n")) {
    if (!(line.startsWith("+") || line.startsWith("-"))) continue;
    if (line.startsWith("+++") || line.startsWith("---")) continue;
    if (!isSkippableCommentLine(line.slice(1))) return true;
  }
  return false;
}

/** Lines that are blank or documentation-only (not CSS/code). */
export function isSkippableCommentLine(body: string): boolean {
  const trimmed = body.trim();
  if (trimmed.length === 0) return true;
  if (trimmed.startsWith("//")) return true;
  if (trimmed.startsWith("/*")) return true;
  if (trimmed === "*/" || trimmed.startsWith("*/")) return true;
  if (!trimmed.startsWith("*")) return false;

  // JSDoc middle lines are `* text` / lone `*`. CSS universal selectors look like
  // `* {…}`, `*.class`, `*#id`, `*:hover`, `*, div`, `*[attr]`.
  const afterStar = trimmed.slice(1).trimStart();
  if (afterStar.length === 0) return true;
  if (afterStar.startsWith("/")) return true; // */
  if (/^[{.,#:[\]]/.test(afterStar)) return false;
  return true;
}

function git(
  repoRoot: string,
  args: readonly string[],
): { status: number; stdout: string; stderr: string } {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function assertGitObjectExists(repoRoot: string, sha: string, label: string): void {
  const result = git(repoRoot, ["cat-file", "-e", `${sha}^{commit}`]);
  if (result.status !== 0) {
    throw new Error(`${label} commit ${sha} is not present in this repository`);
  }
}

function assertAncestor(repoRoot: string, ancestor: string, descendant: string): void {
  const result = git(repoRoot, ["merge-base", "--is-ancestor", ancestor, descendant]);
  if (result.status !== 0) {
    throw new Error(
      `alias base commit ${ancestor} is not an ancestor of release commit ${descendant}`,
    );
  }
}

function listChangedFiles(repoRoot: string, base: string, head: string): string[] {
  const result = git(repoRoot, ["diff", "--name-only", `${base}..${head}`]);
  if (result.status !== 0) {
    throw new Error(
      `git diff ${base}..${head} failed: ${result.stderr.trim() || result.stdout.trim()}`,
    );
  }
  return result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** True when the unified diff has non-comment, non-blank added/removed lines. */
function hasSubstantiveDiff(repoRoot: string, base: string, head: string, path: string): boolean {
  const result = git(repoRoot, ["diff", `${base}..${head}`, "--", path]);
  if (result.status !== 0) {
    throw new Error(
      `git diff ${base}..${head} -- ${path} failed: ${result.stderr.trim() || result.stdout.trim()}`,
    );
  }
  return diffTextIsSubstantive(result.stdout);
}

export function packageVersionAtCommit(
  repoRoot: string,
  commit: string,
  packageJsonPath = "packages/svelte/package.json",
): string {
  const result = git(repoRoot, ["show", `${commit}:${packageJsonPath}`]);
  if (result.status !== 0) {
    throw new Error(
      `cannot read ${packageJsonPath} at ${commit}: ${result.stderr.trim() || result.stdout.trim()}`,
    );
  }
  const parsed = JSON.parse(result.stdout) as { version?: unknown };
  if (typeof parsed.version !== "string" || parsed.version.length === 0) {
    throw new Error(`${packageJsonPath} at ${commit} has no version field`);
  }
  return parsed.version;
}

export function findSubstantiveRuntimePaths(
  repoRoot: string,
  base: string,
  head: string,
  paths: readonly string[] = listChangedFiles(repoRoot, base, head),
): string[] {
  return runtimeBehaviorPaths(paths).filter((path) =>
    hasSubstantiveDiff(repoRoot, base, head, path),
  );
}

export function auditAliasCommitRange(input: {
  repoRoot: string;
  baseCommit: string;
  releaseCommit: string;
  releaseVersion: string;
}): void {
  const { repoRoot, baseCommit, releaseCommit, releaseVersion } = input;
  assertGitObjectExists(repoRoot, baseCommit, "inherited tested");
  assertGitObjectExists(repoRoot, releaseCommit, "alias release");
  assertAncestor(repoRoot, baseCommit, releaseCommit);

  const versionAtTip = packageVersionAtCommit(repoRoot, releaseCommit);
  if (versionAtTip !== releaseVersion) {
    throw new Error(
      `alias release ${releaseVersion} points at commit ${releaseCommit} where @ggsvelte/svelte is ${versionAtTip}`,
    );
  }

  const offenders = findSubstantiveRuntimePaths(repoRoot, baseCommit, releaseCommit);
  if (offenders.length > 0) {
    throw new Error(
      `manual AT alias ${releaseCommit} changes runtime sources and requires a complete record: ${offenders.join(", ")}`,
    );
  }
}
