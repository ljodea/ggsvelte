import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const orchestratorPath = join(import.meta.dirname, "../src/lib/plot-orchestrator.svelte.ts");
const interactionAssemblyPath = join(
  import.meta.dirname,
  "../src/lib/plot-interaction-assembly.svelte.ts",
);
const transitionOwnerPath = join(import.meta.dirname, "../src/lib/interaction/transition-owner.ts");

describe("plot interaction assembly seam (#627)", () => {
  const orchestratorSource = readFileSync(orchestratorPath, "utf8");
  const assemblySource = readFileSync(interactionAssemblyPath, "utf8");
  const transitionOwnerSource = readFileSync(transitionOwnerPath, "utf8");

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
      "createSemanticCandidateProjection(",
      "createPlotChromeState(",
    ]) {
      expect(orchestratorSource).not.toContain(factory);
    }
  });

  it("uses the model-owned CandidateStore without constructing a second hit index", () => {
    expect(assemblySource).not.toContain("buildHitIndex");
    expect(assemblySource).not.toContain("SceneHitIndex");
  });

  it("keeps semantic Candidate projection knowledge behind one module seam", () => {
    expect(assemblySource).toContain("createSemanticCandidateProjection(");
    for (const implementationDetail of [
      "needIntervalConsumptionWalk",
      "sharedCandidateProjection",
      "fusedConsumptionCandidates",
    ]) {
      expect(assemblySource).not.toContain(implementationDetail);
    }
  });

  it("owns multi-module dismiss apply in transition-owner (not inspection surface deps)", () => {
    expect(transitionOwnerSource).toContain("applyInspectionDismissSideEffects");
    expect(assemblySource).not.toContain("clearBrush: () =>");
    expect(assemblySource).not.toContain("chooseTool: (next)");
    expect(assemblySource).not.toContain("registerSurfaceEffects");
    expect(assemblySource).not.toContain("registerInspectionEffects");
    expect(assemblySource).not.toContain("registerCatalogEffects");
    expect(assemblySource).not.toContain("registerReconcileEffects");
    expect(assemblySource).not.toContain("registerModelEffects");
    expect(assemblySource).not.toContain("registerLateEffects");
    expect(assemblySource).not.toContain("semanticKeys.registerEffects");
    // Irreducible host-derived legend-focus reconcile (not sibling cycles).
    expect(assemblySource).toContain("installHostDerivedEffects");
  });
});
