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
  return paths.filter(isRuntimeBehaviorPath);
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

export function assertGitObjectExists(repoRoot: string, sha: string, label: string): void {
  const result = git(repoRoot, ["cat-file", "-e", `${sha}^{commit}`]);
  if (result.status !== 0) {
    throw new Error(`${label} commit ${sha} is not present in this repository`);
  }
}

export function assertAncestor(repoRoot: string, ancestor: string, descendant: string): void {
  const result = git(repoRoot, ["merge-base", "--is-ancestor", ancestor, descendant]);
  if (result.status !== 0) {
    throw new Error(
      `alias base commit ${ancestor} is not an ancestor of release commit ${descendant}`,
    );
  }
}

export function listChangedFiles(repoRoot: string, base: string, head: string): string[] {
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
export function hasSubstantiveDiff(
  repoRoot: string,
  base: string,
  head: string,
  path: string,
): boolean {
  const result = git(repoRoot, ["diff", `${base}..${head}`, "--", path]);
  if (result.status !== 0) {
    throw new Error(
      `git diff ${base}..${head} -- ${path} failed: ${result.stderr.trim() || result.stdout.trim()}`,
    );
  }
  for (const line of result.stdout.split("\n")) {
    if (!(line.startsWith("+") || line.startsWith("-"))) continue;
    if (line.startsWith("+++") || line.startsWith("---")) continue;
    const body = line.slice(1).trim();
    if (body.length === 0) continue;
    if (body.startsWith("//")) continue;
    if (body.startsWith("/*") || body.startsWith("*") || body.startsWith("*/")) continue;
    return true;
  }
  return false;
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
}): void {
  const { repoRoot, baseCommit, releaseCommit } = input;
  assertGitObjectExists(repoRoot, baseCommit, "inherited tested");
  assertGitObjectExists(repoRoot, releaseCommit, "alias release");
  assertAncestor(repoRoot, baseCommit, releaseCommit);
  const offenders = findSubstantiveRuntimePaths(repoRoot, baseCommit, releaseCommit);
  if (offenders.length > 0) {
    throw new Error(
      `manual AT alias ${releaseCommit} changes runtime sources and requires a complete record: ${offenders.join(", ")}`,
    );
  }
}
