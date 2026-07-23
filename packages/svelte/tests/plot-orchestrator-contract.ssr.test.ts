import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const orchestratorPath = join(import.meta.dirname, "../src/lib/plot-orchestrator.svelte.ts");
const assemblyPath = join(import.meta.dirname, "../src/lib/plot-interaction-assembly.svelte.ts");
const transitionPortPath = join(import.meta.dirname, "../src/lib/interaction/transition-port.ts");

describe("plot interaction assembly lifecycle contract", () => {
  const orchestratorSource = readFileSync(orchestratorPath, "utf8");
  const assemblySource = readFileSync(assemblyPath, "utf8");
  const transitionPortSource = readFileSync(transitionPortPath, "utf8");

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

  it("routes sibling interaction transitions through one port owner", () => {
    expect(assemblySource).toContain("bindInteractionTransitionPort(");
    expect(assemblySource).toContain("port,");
    expect(transitionPortSource).toContain("bindInteractionTransitionPort(");
    for (const deferredSibling of [
      "inspection: () => inspectionState",
      "interval: () => intervalState",
      "reducer: () => surfaceState.reducer",
      "clearBrush: () =>",
      "registerSurfaceEffects();",
      "registerInspectionEffects();",
      "registerCatalogEffects(",
      "registerReconcileEffects();",
      "registerLateEffects();",
    ]) {
      expect(assemblySource).not.toContain(deferredSibling);
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
});
