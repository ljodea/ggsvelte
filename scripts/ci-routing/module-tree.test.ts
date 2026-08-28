import { describe, expect, test } from "bun:test";

import {
  CACHEABLE_EXECUTIONS,
  JOB_CONTENT_INPUTS,
  classifyChangedPaths,
  listJobContentPaths,
  planJobs,
  shouldBypassContentCache,
} from "../ci-routing";

describe("ci-routing module tree (split-safe)", () => {
  test("subtree files set ci_routing, force full surface, and bypass content cache", () => {
    for (const file of [
      "scripts/ci-routing.ts",
      "scripts/ci-routing/routing.ts",
      "scripts/ci-routing/types.ts",
      "scripts/ci-routing/patterns.ts",
      "scripts/ci-routing/match.ts",
      "scripts/ci-routing/docs-membership.ts",
      "scripts/ci-routing/plan.ts",
      "scripts/ci-routing/git-paths.ts",
      "scripts/ci-routing/content-hash.ts",
      "scripts/ci-routing/cli.ts",
      "scripts/ci-routing/cli-io.ts",
      "scripts/ci-routing/content-hash-cli.ts",
      "scripts/ci-routing/detect-changes-cli.ts",
    ]) {
      const flags = classifyChangedPaths([file]);
      expect(flags.ci_routing, file).toBe(true);
      const plan = planJobs(flags);
      expect(plan.unit, file).toBe(true);
      expect(plan.build, file).toBe(true);
      expect(plan.component, file).toBe(true);
      expect(plan.consumer, file).toBe(true);
      expect(plan.pages, file).toBe(true);
      expect(shouldBypassContentCache(flags), file).toBe(true);
    }
  });

  test("every cacheable execution includes the ci-routing subtree via universal inputs", () => {
    for (const execution of CACHEABLE_EXECUTIONS) {
      expect(JOB_CONTENT_INPUTS[execution], execution).toContain("scripts/ci-routing/**");
      const matched = listJobContentPaths(execution, [
        "scripts/ci-routing/routing.ts",
        "scripts/ci-routing/patterns.ts",
        "scripts/ci-routing/plan.ts",
        "scripts/ci-routing/content-hash.ts",
        "scripts/ci-routing/cli.ts",
        "scripts/ci-routing/cli-io.ts",
        "scripts/ci-routing/content-hash-cli.ts",
        "scripts/ci-routing/detect-changes-cli.ts",
      ]);
      expect(matched, execution).toContain("scripts/ci-routing/routing.ts");
      expect(matched, execution).toContain("scripts/ci-routing/patterns.ts");
      expect(matched, execution).toContain("scripts/ci-routing/plan.ts");
      expect(matched, execution).toContain("scripts/ci-routing/content-hash.ts");
      expect(matched, execution).toContain("scripts/ci-routing/cli.ts");
      expect(matched, execution).toContain("scripts/ci-routing/cli-io.ts");
      expect(matched, execution).toContain("scripts/ci-routing/content-hash-cli.ts");
      expect(matched, execution).toContain("scripts/ci-routing/detect-changes-cli.ts");
    }
  });

  // Dynamic import is intentional here: the test inspects the runtime module
  // namespace (module-loading boundary), not compile-time exports.
  test("public runtime export surface stays stable from the root entry", async () => {
    const mod = await import("../ci-routing");
    const expected = [
      "CACHEABLE_EXECUTIONS",
      "CONTENT_HASH_SCHEMA",
      "DOCS_CONTENT_ONLY_PATHS",
      "DOCS_CONTENT_SCRIPT_PATTERNS",
      "JOB_CONTENT_INPUTS",
      "LANE_PATTERNS",
      "classifyChangedPaths",
      "collectGitHeadInputDigests",
      "contentHashCacheKey",
      "docsPackageInvokedScripts",
      "docsSourceScriptImports",
      "emptyChangeFlags",
      "evaluateGate",
      "formatGithubOutputs",
      "formatTreeEntryDigest",
      "hashJobInputs",
      "isDocsContentOnlyPath",
      "isDocsRenderPath",
      "jobNames",
      "listJobContentPaths",
      "matchPathPattern",
      "normalizeJobResult",
      "parseFileList",
      "parseGitLsTreeLine",
      "parseNameStatusList",
      "parseSuccessMarker",
      "planJobs",
      "requireJobInputDigests",
      "serializeSuccessMarker",
      "shouldBypassContentCache",
      "successMarkerPath",
      "validateSuccessMarker",
    ].toSorted();
    expect(Object.keys(mod).toSorted()).toEqual(expected);
  });

  test("importing the root module does not require CLI argv", async () => {
    // Characterization: side-effect free import (CLI is gated on import.meta.main).
    const mod = await import("../ci-routing");
    expect(typeof mod.planJobs).toBe("function");
  });
});
