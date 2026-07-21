import { describe, expect, test } from "bun:test";

import {
  evaluateBaselineGuard,
  isScreenshotBaselinePath,
  qualifiesSmokeBaselineUpdate,
} from "./vr-baseline-guard.ts";

describe("qualifiesSmokeBaselineUpdate", () => {
  test("packages, examples, and non-baseline visual tests qualify", () => {
    expect(qualifiesSmokeBaselineUpdate("packages/svelte/src/lib/Plot.svelte")).toBe(true);
    expect(qualifiesSmokeBaselineUpdate("examples/bar/stacked/Example.svelte")).toBe(true);
    expect(qualifiesSmokeBaselineUpdate("tests/visual/vr.spec.ts")).toBe(true);
    expect(qualifiesSmokeBaselineUpdate("tests/visual/smoke-matrix.ts")).toBe(true);
  });

  test("screenshot baselines never qualify by themselves", () => {
    expect(
      qualifiesSmokeBaselineUpdate("tests/visual/__screenshots__/point-scatter-color-light.png"),
    ).toBe(false);
  });

  test("docs content-only paths do not qualify (Codex P2)", () => {
    expect(qualifiesSmokeBaselineUpdate("apps/docs/src/lib/catalog/guide.ts")).toBe(false);
    expect(qualifiesSmokeBaselineUpdate("apps/docs/src/lib/generated/search-index.ts")).toBe(false);
    expect(qualifiesSmokeBaselineUpdate("scripts/llms-guide-content.ts")).toBe(false);
    expect(qualifiesSmokeBaselineUpdate("scripts/gen-docs-search.ts")).toBe(false);
  });

  test("docs render surface qualifies", () => {
    expect(qualifiesSmokeBaselineUpdate("apps/docs/src/app.css")).toBe(true);
    expect(qualifiesSmokeBaselineUpdate("apps/docs/src/styles/tokens.css")).toBe(true);
    expect(
      qualifiesSmokeBaselineUpdate("apps/docs/src/routes/examples/[category]/[name]/+page.svelte"),
    ).toBe(true);
  });
});

describe("evaluateBaselineGuard", () => {
  test("no baseline changes → ok", () => {
    expect(evaluateBaselineGuard(["packages/core/src/x.ts"]).ok).toBe(true);
  });

  test("baseline-only → fail", () => {
    const v = evaluateBaselineGuard(["tests/visual/__screenshots__/point-scatter-color-light.png"]);
    expect(v.ok).toBe(false);
  });

  test("baseline + content-only docs → fail", () => {
    const v = evaluateBaselineGuard([
      "tests/visual/__screenshots__/point-scatter-color-light.png",
      "apps/docs/src/lib/catalog/guide.ts",
    ]);
    expect(v.ok).toBe(false);
  });

  test("baseline + package → ok", () => {
    const v = evaluateBaselineGuard([
      "tests/visual/__screenshots__/point-scatter-color-light.png",
      "packages/svelte/src/lib/Plot.svelte",
    ]);
    expect(v.ok).toBe(true);
  });

  test("baseline + smoke-matrix test change → ok", () => {
    const v = evaluateBaselineGuard([
      "tests/visual/__screenshots__/point-scatter-color-light.png",
      "tests/visual/smoke-matrix.ts",
    ]);
    expect(v.ok).toBe(true);
  });

  test("vr-update branch → ok", () => {
    const v = evaluateBaselineGuard(
      ["tests/visual/__screenshots__/point-scatter-color-light.png"],
      { vrUpdateBranch: true },
    );
    expect(v.ok).toBe(true);
  });

  test("isScreenshotBaselinePath", () => {
    expect(isScreenshotBaselinePath("tests/visual/__screenshots__/x.png")).toBe(true);
    expect(isScreenshotBaselinePath("tests/visual/vr.spec.ts")).toBe(false);
  });
});
