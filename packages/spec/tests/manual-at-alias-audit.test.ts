import { describe, expect, it } from "bun:test";
import { join } from "node:path";

import {
  auditAliasCommitRange,
  findSubstantiveRuntimePaths,
  isRuntimeBehaviorPath,
  runtimeBehaviorPaths,
} from "./manual-at-alias-audit.ts";

const repoRoot = join(import.meta.dir, "..", "..", "..");

describe("manual AT alias commit audit", () => {
  it("classifies chart and core sources as runtime behavior paths", () => {
    expect(isRuntimeBehaviorPath("packages/svelte/src/lib/GGPlot.svelte")).toBe(true);
    expect(isRuntimeBehaviorPath("packages/core/src/pipeline.ts")).toBe(true);
    expect(isRuntimeBehaviorPath("packages/spec/src/artifact.ts")).toBe(false);
    expect(isRuntimeBehaviorPath("packages/svelte/package.json")).toBe(false);
    expect(isRuntimeBehaviorPath("docs/accessibility/manual-at/README.md")).toBe(false);
    expect(
      runtimeBehaviorPaths([
        "packages/svelte/package.json",
        "packages/svelte/src/lib/interaction.ts",
        "packages/core/CHANGELOG.md",
        "packages/core/src/theme.ts",
      ]),
    ).toEqual(["packages/svelte/src/lib/interaction.ts", "packages/core/src/theme.ts"]);
  });

  it("accepts the packaging-only v0.1.0→v0.1.1 alias range", () => {
    // Inherited testedCommit (v0.1.0) .. releaseCommit (v0.1.1).
    const base = "7f95673c2c72ddfd10329acc3195f62ef8ecea87";
    const head = "68f29f80b22b91d301378b4e6e17d2abd7b093ec";
    expect(findSubstantiveRuntimePaths(repoRoot, base, head)).toEqual([]);
    expect(() =>
      auditAliasCommitRange({ repoRoot, baseCommit: base, releaseCommit: head }),
    ).not.toThrow();
  });

  it("rejects a commit range that substantively edits runtime sources", () => {
    // v0.1.1 packaging tip .. linked interaction controller (#43).
    const packagingTip = "68f29f80b22b91d301378b4e6e17d2abd7b093ec";
    const withRuntime = "1fc7b4d0847b5c9664806b4dd40c7db8e306a2fa";
    const offenders = findSubstantiveRuntimePaths(repoRoot, packagingTip, withRuntime);
    expect(offenders.some((path) => path.includes("interaction"))).toBe(true);
    expect(() =>
      auditAliasCommitRange({
        repoRoot,
        baseCommit: packagingTip,
        releaseCommit: withRuntime,
      }),
    ).toThrow(/requires a complete record/);
  });
});
