import { describe, expect, it } from "bun:test";
import { join } from "node:path";

import {
  auditAliasCommitRange,
  diffTextIsSubstantive,
  findSubstantiveRuntimePaths,
  isRuntimeBehaviorPath,
  isSkippableCommentLine,
  packageVersionAtCommit,
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

  it("does not treat CSS universal-selector edits as JSDoc noise", () => {
    expect(isSkippableCommentLine(" * inherited matrix remains applicable")).toBe(true);
    expect(isSkippableCommentLine(" *")).toBe(true);
    expect(isSkippableCommentLine(" // re-export surface")).toBe(true);
    expect(isSkippableCommentLine(" * { pointer-events: none; }")).toBe(false);
    expect(isSkippableCommentLine("*.mark { opacity: 0.4; }")).toBe(false);
    expect(
      diffTextIsSubstantive(`diff --git a/x.svelte b/x.svelte
--- a/x.svelte
+++ b/x.svelte
@@ -1 +1 @@
-* { pointer-events: auto; }
+* { pointer-events: none; }
`),
    ).toBe(true);
    expect(
      diffTextIsSubstantive(`diff --git a/cli.ts b/cli.ts
--- a/cli.ts
+++ b/cli.ts
@@ -1,3 +1,3 @@
 /**
- * old package name
+ * new package name
  */
`),
    ).toBe(false);
    expect(
      diffTextIsSubstantive(
        "Binary files a/packages/svelte/src/lib/icon.png and b/packages/svelte/src/lib/icon.png differ\n",
      ),
    ).toBe(true);
  });

  it("accepts the packaging-only v0.1.0→v0.1.1 alias range", () => {
    // Inherited testedCommit (v0.1.0) .. releaseCommit (v0.1.1).
    const base = "7f95673c2c72ddfd10329acc3195f62ef8ecea87";
    const head = "68f29f80b22b91d301378b4e6e17d2abd7b093ec";
    expect(packageVersionAtCommit(repoRoot, head)).toBe("0.1.1");
    expect(findSubstantiveRuntimePaths(repoRoot, base, head)).toEqual([]);
    expect(() => {
      auditAliasCommitRange({
        repoRoot,
        baseCommit: base,
        releaseCommit: head,
        releaseVersion: "0.1.1",
      });
    }).not.toThrow();
  });

  it("rejects a releaseCommit that does not publish the claimed release version", () => {
    const packagingTip = "68f29f80b22b91d301378b4e6e17d2abd7b093ec";
    const base = "7f95673c2c72ddfd10329acc3195f62ef8ecea87";
    expect(() => {
      auditAliasCommitRange({
        repoRoot,
        baseCommit: base,
        releaseCommit: packagingTip,
        releaseVersion: "0.1.2",
      });
    }).toThrow(/@ggsvelte\/svelte is 0\.1\.1/);
  });

  it("rejects a commit range that substantively edits runtime sources", () => {
    // v0.1.1 packaging tip .. linked interaction controller (#43).
    const packagingTip = "68f29f80b22b91d301378b4e6e17d2abd7b093ec";
    const withRuntime = "1fc7b4d0847b5c9664806b4dd40c7db8e306a2fa";
    const offenders = findSubstantiveRuntimePaths(repoRoot, packagingTip, withRuntime);
    expect(offenders.some((path) => path.includes("interaction"))).toBe(true);
    // Interaction commit still reports package version 0.1.1, so bind a matching
    // version and still fail on the runtime path audit.
    expect(() => {
      auditAliasCommitRange({
        repoRoot,
        baseCommit: packagingTip,
        releaseCommit: withRuntime,
        releaseVersion: packageVersionAtCommit(repoRoot, withRuntime),
      });
    }).toThrow(/requires a complete record/);
  });
});
