/**
 * Composition advisory delivery through a mounted <GGPlot> (#1408):
 * pure collectors in composition.ts are unit-tested in
 * composition-collect.test.ts; this file pins the plot-engine wire-up —
 * registry.layers → collectCompositionDiagnostics → deliverAdvisoriesOnce
 * (compositionAdvisoryDedupKey) → ondiagnostic.
 *
 * Family-specific assembly suites (scale-children, labs-guides-legend-children,
 * coord-facet-children) also touch these codes while asserting last-wins merge
 * behaviour. This file is the dedicated delivery pin: exact codes + severity,
 * silence for clean compositions, multi-key compositionAdvisoryDedupKey, and
 * once-per-instance dedup — matching the #1206 pattern for inspect advisories.
 *
 * Browser lane on purpose: every delivery path runs inside $effect, which
 * svelte/server render() never executes, so these assertions would be
 * vacuous in the SSR lane.
 */
import { flushSync } from "svelte";
import { describe, expect, it } from "vitest";

import CoordFacetChildrenPlot from "../fixtures/CoordFacetChildrenPlot.svelte";
import LabsGuidesLegendPlot from "../fixtures/LabsGuidesLegendPlot.svelte";
import ScaleChildrenPlot from "../fixtures/ScaleChildrenPlot.svelte";
import { render } from "../helpers/render.js";
import { collect, settled } from "../helpers/diagnostic-harness.js";

const COMPOSITION_CODES = [
  "DUPLICATE_SCALE_CHANNEL",
  "DUPLICATE_MERGE_KEY",
  "DUPLICATE_PLOT_LAYER",
] as const;

describe("composition advisories through GGPlot ondiagnostic (#1408)", () => {
  it("fires DUPLICATE_SCALE_CHANNEL for two scale children on the same channel", async () => {
    const { diagnostics, ondiagnostic } = collect();
    render(ScaleChildrenPlot, {
      useScaleColorDiscrete: true,
      colorScheme: "colorblind",
      useScaleColourContinuous: true,
      ondiagnostic,
    });
    await expect
      .poll(() => diagnostics.find((d) => d.code === "DUPLICATE_SCALE_CHANNEL"))
      .toMatchObject({
        severity: "advisory",
        code: "DUPLICATE_SCALE_CHANNEL",
        channel: "color",
        kind: "scale",
      });
  });

  it("fires DUPLICATE_MERGE_KEY for two Labs children on the same key", async () => {
    const { diagnostics, ondiagnostic } = collect();
    render(LabsGuidesLegendPlot, {
      useLabs: true,
      labsTitle: "First",
      useSecondLabs: true,
      secondLabsTitle: "Second",
      ondiagnostic,
    });
    await expect
      .poll(() => diagnostics.find((d) => d.code === "DUPLICATE_MERGE_KEY"))
      .toMatchObject({
        severity: "advisory",
        code: "DUPLICATE_MERGE_KEY",
        kind: "labs",
        key: "title",
      });
  });

  it("fires DUPLICATE_MERGE_KEY for two guide children on the same channel", async () => {
    const { diagnostics, ondiagnostic } = collect();
    render(LabsGuidesLegendPlot, {
      useGuideLegend: true,
      guideChannel: "color",
      useSecondGuideNone: true,
      secondGuideChannel: "color",
      ondiagnostic,
    });
    await expect
      .poll(() => diagnostics.find((d) => d.code === "DUPLICATE_MERGE_KEY"))
      .toMatchObject({
        severity: "advisory",
        code: "DUPLICATE_MERGE_KEY",
        kind: "guides",
        key: "color",
      });
  });

  it("fires DUPLICATE_MERGE_KEY for two Legend children on the same key", async () => {
    const { diagnostics, ondiagnostic } = collect();
    render(LabsGuidesLegendPlot, {
      useLegend: true,
      legendOrder: "sorted",
      useSecondLegend: true,
      secondLegendOrder: "stable-domain",
      ondiagnostic,
    });
    await expect
      .poll(() => diagnostics.find((d) => d.code === "DUPLICATE_MERGE_KEY"))
      .toMatchObject({
        severity: "advisory",
        code: "DUPLICATE_MERGE_KEY",
        kind: "legend",
        key: "order",
      });
  });

  it("fires DUPLICATE_PLOT_LAYER for two coord children", async () => {
    const { diagnostics, ondiagnostic } = collect();
    render(CoordFacetChildrenPlot, {
      useCoordFlip: true,
      useCoordFixed: true,
      fixedRatio: 2,
      ondiagnostic,
    });
    await expect
      .poll(() => diagnostics.find((d) => d.code === "DUPLICATE_PLOT_LAYER"))
      .toMatchObject({
        severity: "advisory",
        code: "DUPLICATE_PLOT_LAYER",
        kind: "coord",
      });
  });

  it("fires DUPLICATE_PLOT_LAYER for FacetWrap + FacetGrid", async () => {
    const { diagnostics, ondiagnostic } = collect();
    render(CoordFacetChildrenPlot, {
      useFacetWrap: true,
      useFacetGrid: true,
      facetField: "g",
      facetRows: "a",
      facetCols: "b",
      ondiagnostic,
    });
    await expect
      .poll(() => diagnostics.find((d) => d.code === "DUPLICATE_PLOT_LAYER"))
      .toMatchObject({
        severity: "advisory",
        code: "DUPLICATE_PLOT_LAYER",
        kind: "facet",
      });
  });

  it("fires DUPLICATE_PLOT_LAYER for two theme children", async () => {
    const { diagnostics, ondiagnostic } = collect();
    render(CoordFacetChildrenPlot, {
      useThemeDark: true,
      useThemeLight: true,
      ondiagnostic,
    });
    await expect
      .poll(() => diagnostics.find((d) => d.code === "DUPLICATE_PLOT_LAYER"))
      .toMatchObject({
        severity: "advisory",
        code: "DUPLICATE_PLOT_LAYER",
        kind: "theme",
      });
  });

  it("delivers distinct compositionAdvisoryDedupKey entries for coord + facet dups", async () => {
    // Without compositionAdvisoryDedupKey the default `${code}:${prop}` collapses
    // both REPLACE advisories to one key (`DUPLICATE_PLOT_LAYER:undefined`).
    const { diagnostics, ondiagnostic } = collect();
    render(CoordFacetChildrenPlot, {
      useCoordFlip: true,
      useCoordFixed: true,
      fixedRatio: 2,
      useFacetWrap: true,
      useFacetGrid: true,
      facetField: "g",
      facetRows: "a",
      facetCols: "b",
      ondiagnostic,
    });
    await expect
      .poll(() => diagnostics.filter((d) => d.code === "DUPLICATE_PLOT_LAYER").length)
      .toBe(2);
    const plotLayerAdvisories = diagnostics.filter(
      (diagnostic) => diagnostic.code === "DUPLICATE_PLOT_LAYER",
    );
    const kinds = plotLayerAdvisories.map((diagnostic) =>
      "kind" in diagnostic ? diagnostic.kind : null,
    );
    expect(new Set(kinds)).toEqual(new Set(["coord", "facet"]));
    for (const advisory of plotLayerAdvisories) {
      expect(advisory.severity).toBe("advisory");
    }
  });

  it("stays silent for a clean scale composition (distinct channels)", async () => {
    const { diagnostics, ondiagnostic } = collect();
    const { container } = render(ScaleChildrenPlot, {
      useScaleColorDiscrete: true,
      colorScheme: "colorblind",
      useScaleFillContinuous: true,
      ondiagnostic,
    });
    await settled(container);
    for (const code of COMPOSITION_CODES) {
      expect(diagnostics.map((d) => d.code)).not.toContain(code);
    }
  });

  it("stays silent for a clean merge-key composition (distinct keys)", async () => {
    const { diagnostics, ondiagnostic } = collect();
    const { container } = render(LabsGuidesLegendPlot, {
      useLabs: true,
      labsTitle: "First",
      useSecondLabs: true,
      secondLabsY: "Y",
      useGuideLegend: true,
      guideChannel: "color",
      useSecondGuideNone: true,
      secondGuideChannel: "size",
      ondiagnostic,
    });
    await settled(container);
    for (const code of COMPOSITION_CODES) {
      expect(diagnostics.map((d) => d.code)).not.toContain(code);
    }
  });

  it("stays silent for a single REPLACE child of each kind", async () => {
    const { diagnostics, ondiagnostic } = collect();
    const { container } = render(CoordFacetChildrenPlot, {
      useCoordFlip: true,
      useFacetWrap: true,
      facetField: "g",
      useThemeDark: true,
      ondiagnostic,
    });
    await settled(container);
    for (const code of COMPOSITION_CODES) {
      expect(diagnostics.map((d) => d.code)).not.toContain(code);
    }
  });

  it("delivers once per plot instance, not once per reactive update", async () => {
    const { diagnostics, ondiagnostic } = collect();
    const view = render(ScaleChildrenPlot, {
      useScaleColorDiscrete: true,
      colorScheme: "colorblind",
      useScaleColourContinuous: true,
      ondiagnostic,
    });
    await expect
      .poll(() => diagnostics.filter((d) => d.code === "DUPLICATE_SCALE_CHANNEL").length)
      .toBe(1);

    for (const next of ["observable10", "ipsum", "flexoki"] as const) {
      await view.rerender({
        useScaleColorDiscrete: true,
        colorScheme: next,
        useScaleColourContinuous: true,
        ondiagnostic,
      });
      flushSync();
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
    }
    expect(diagnostics.filter((d) => d.code === "DUPLICATE_SCALE_CHANNEL")).toHaveLength(1);
  });
});
