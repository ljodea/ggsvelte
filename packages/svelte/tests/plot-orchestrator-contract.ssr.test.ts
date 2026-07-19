import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const orchestratorPath = join(import.meta.dirname, "../src/lib/plot-orchestrator.svelte.ts");
const interactionAssemblyPath = join(
  import.meta.dirname,
  "../src/lib/plot-interaction-assembly.svelte.ts",
);

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

describe("plot interaction assembly lifecycle contract", () => {
  const orchestratorSource = readFileSync(orchestratorPath, "utf8");
  const assemblySource = readFileSync(interactionAssemblyPath, "utf8");

  it("keeps interaction topology behind the assembly seam", () => {
    expect(orchestratorSource).toContain("createPlotInteractionAssembly(");
    for (const factory of [
      "createPlotZoomState(",
      "createLegendFilterState(",
      "createPlotRuntime(",
      "createSemanticKeyService(",
      "createLegendEntryKeyIndex(",
      "createInspectionState(",
      "createSurfaceState(",
      "createSelectionState(",
      "createLegendFocusState(",
      "createIntervalState(",
      "createPlotChromeState(",
    ]) {
      expect(orchestratorSource).not.toContain(factory);
    }
  });

  it("keeps controller construction in dependency order", () => {
    expectOrdered(assemblySource, [
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
    expect(assemblySource).not.toContain("buildHitIndex");
    expect(assemblySource).not.toContain("SceneHitIndex");
  });

  it("keeps phased effects in registration order", () => {
    expectOrdered(assemblySource, [
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
