/**
 * Same-PR smoke baseline guard — pure helpers for ci.yml's vr-baseline-guard.
 *
 * Allow __screenshots__/ diffs only when the PR also touches non-baseline
 * render-relevant paths. Content-only docs paths (guide catalogs, generators)
 * do not qualify (Codex P2).
 */

import { isDocsContentOnlyPath, isDocsRenderPath } from "./ci-routing/routing.ts";

export function isScreenshotBaselinePath(filePath: string): boolean {
  const path = filePath.replaceAll("\\", "/").replace(/^\.\//, "");
  return path.startsWith("tests/visual/__screenshots__/");
}

/**
 * A path that may legitimately change smoke pixels (or the smoke suite itself).
 * Excludes baseline blobs and docs content-only paths.
 */
export function qualifiesSmokeBaselineUpdate(filePath: string): boolean {
  const path = filePath.replaceAll("\\", "/").replace(/^\.\//, "");
  if (!path || isScreenshotBaselinePath(path)) return false;
  if (path.startsWith("packages/")) return true;
  if (path.startsWith("examples/")) return true;
  if (path.startsWith("tests/visual/")) return true;
  // Docs: only fail-closed render surface, never content-only catalogs/generators.
  if (path === "apps/docs" || path.startsWith("apps/docs/")) {
    return isDocsRenderPath(path);
  }
  // Script generators classified as content-only never justify baselines.
  if (isDocsContentOnlyPath(path)) return false;
  return false;
}

export type BaselineGuardVerdict = { ok: true; reason: string } | { ok: false; reason: string };

export function evaluateBaselineGuard(
  changedPaths: readonly string[],
  options: { vrUpdateBranch?: boolean } = {},
): BaselineGuardVerdict {
  const paths = changedPaths.map((p) => p.replaceAll("\\", "/").replace(/^\.\//, ""));
  const hasBaseline = paths.some((path) => isScreenshotBaselinePath(path));
  if (!hasBaseline) {
    return { ok: true, reason: "no baseline changes in this PR — ok" };
  }
  if (options.vrUpdateBranch === true) {
    return { ok: true, reason: "baseline changes from vr-update branch — ok" };
  }
  if (paths.some((path) => qualifiesSmokeBaselineUpdate(path))) {
    return {
      ok: true,
      reason: "baseline changes paired with render-relevant non-baseline paths — ok",
    };
  }
  return {
    ok: false,
    reason:
      "baseline changes without non-baseline render-relevant paths " +
      "(packages/, examples/, tests/visual/ excluding __screenshots__/, or apps/docs render surface)",
  };
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const vrUpdate = args.includes("--vr-update-branch");
  const paths: string[] = [];
  for await (const chunk of Bun.stdin.stream()) {
    paths.push(...new TextDecoder().decode(chunk).split(/\r?\n/));
  }
  const cleaned = paths.map((l) => l.trim()).filter((l) => l.length > 0);
  const verdict = evaluateBaselineGuard(cleaned, { vrUpdateBranch: vrUpdate });
  process.stdout.write(`${verdict.reason}\n`);
  if (!verdict.ok) process.exitCode = 1;
}
