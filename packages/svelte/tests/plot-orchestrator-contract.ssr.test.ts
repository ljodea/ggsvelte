import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const orchestratorPath = join(import.meta.dirname, "../src/lib/plot-orchestrator.svelte.ts");

function expectOrdered(source: string, tokens: readonly string[]): void {
  let previousIndex = -1;
  for (const token of tokens) {
    const index = source.indexOf(token);
    expect(index, `missing orchestrator contract token: ${token}`).toBeGreaterThanOrEqual(0);
    expect(
      index,
      `${token} must remain after ${tokens[tokens.indexOf(token) - 1]}`,
    ).toBeGreaterThan(previousIndex);
    previousIndex = index;
  }
}

describe("plot orchestrator lifecycle contract", () => {
  const source = readFileSync(orchestratorPath, "utf8");

  it("keeps controller construction in dependency order", () => {
    expectOrdered(source, [
      "const zoomState = createPlotZoomState(",
      "const legendFilterState = createLegendFilterState(",
      "const runtime = createPlotRuntime(",
      "const semanticKeys = createSemanticKeyService(",
      "const legendEntryKeys = createLegendEntryKeyIndex(",
      "const inspectionState = createInspectionState(",
      "const surfaceState = createSurfaceState(",
      "const selectionState = createSelectionState(",
      "const legendFocusState = createLegendFocusState(",
      "const intervalState = createIntervalState(",
      "const chromeState = createPlotChromeState(",
    ]);
  });

  it("uses the model-owned CandidateStore without constructing a second hit index", () => {
    expect(source).not.toContain("buildHitIndex");
    expect(source).not.toContain("SceneHitIndex");
  });

  it("keeps phased effects in registration order", () => {
    expectOrdered(source, [
      "runtime.registerModelEffects();",
      "semanticKeys.registerEffects();",
      "surfaceState.registerSurfaceEffects();",
      "legendFilterState.registerCatalogEffects(",
      "legendFocusState.registerReconcileEffects();",
      "inspectionState.registerInspectionEffects();",
      "runtime.registerLateEffects();",
    ]);
  });
});
