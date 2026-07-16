import { describe, expect, it } from "vitest";

import {
  bandChannelsForZoom,
  capabilityStatusText,
  filterAvailableTools,
  legendFocusDiscreteOnlyDiagnostics,
  resolveChooseToolAction,
  resolveEffectiveTool,
  isEmptyPlotScene,
  shouldShowInertSelectionOverlay,
  shouldShowToolRail,
  zoomScaleDiagnosticsFromChannels,
  zoomSupportsChannel,
} from "../src/lib/plot-capability.js";

const continuous = { x: { type: "linear" }, y: { type: "linear" } };
const bandX = { x: { type: "band" }, y: { type: "linear" } };
const bandBoth = { x: { type: "band" }, y: { type: "band" } };

describe("zoomSupportsChannel", () => {
  it("is true when any requested channel is continuous", () => {
    expect(zoomSupportsChannel("xy", continuous)).toBe(true);
    expect(zoomSupportsChannel("xy", bandX)).toBe(true); // y continuous
    expect(zoomSupportsChannel("x", bandX)).toBe(false);
    expect(zoomSupportsChannel("y", bandX)).toBe(true);
    expect(zoomSupportsChannel("xy", bandBoth)).toBe(false);
  });
});

describe("bandChannelsForZoom", () => {
  it("lists only band channels required by mode", () => {
    expect(bandChannelsForZoom("xy", bandX)).toEqual(["x"]);
    expect(bandChannelsForZoom("y", bandX)).toEqual([]);
    expect(bandChannelsForZoom("xy", bandBoth)).toEqual(["x", "y"]);
    expect(bandChannelsForZoom("x", bandBoth)).toEqual(["x"]);
  });
});

describe("zoomScaleDiagnosticsFromChannels", () => {
  it("maps channels to catalog diagnostics with prop/actual", () => {
    const entry = {
      code: "INTERACTION_INTERVAL_SCALE_UNSUPPORTED" as const,
      message: "Band scales cannot zoom",
      severity: "warning" as const,
    };
    expect(zoomScaleDiagnosticsFromChannels(["x", "y"], entry)).toEqual([
      {
        ...entry,
        prop: "scales.x",
        actual: "band",
      },
      {
        ...entry,
        prop: "scales.y",
        actual: "band",
      },
    ]);
  });
});

describe("filterAvailableTools", () => {
  const all = ["inspect", "point", "select-area", "zoom-area"] as const;

  it("keeps zoom-area only when a continuous channel supports it", () => {
    expect(filterAvailableTools(all, true)).toEqual([...all]);
    expect(filterAvailableTools(all, false)).toEqual(["inspect", "point", "select-area"]);
  });

  it("leaves non-zoom tools untouched when zoom is unsupported", () => {
    expect(filterAvailableTools(["inspect", "point"], false)).toEqual(["inspect", "point"]);
    expect(filterAvailableTools(["zoom-area"], false)).toEqual([]);
  });
});

describe("resolveEffectiveTool", () => {
  it("keeps the requested tool when it is available", () => {
    expect(resolveEffectiveTool("point", ["inspect", "point", "select-area"])).toBe("point");
  });

  it("falls back to the first available tool when requested is unavailable", () => {
    expect(resolveEffectiveTool("zoom-area", ["inspect", "point"])).toBe("inspect");
    expect(resolveEffectiveTool("inspect", ["point", "select-area"])).toBe("point");
  });

  it("falls back to inspect when available is empty (host asymmetry vs chooseTool)", () => {
    // Host tool $effect dispatches "inspect" even when it is not in availableTools.
    // chooseTool rejects tools not in availableTools — pin the split intentionally.
    expect(resolveEffectiveTool("zoom-area", [])).toBe("inspect");
    expect(resolveEffectiveTool("inspect", [])).toBe("inspect");
  });
});

describe("resolveChooseToolAction", () => {
  const available = ["inspect", "point", "select-area"] as const;

  it("ignores unavailable tools before the controlled check (no callback)", () => {
    expect(
      resolveChooseToolAction({
        next: "zoom-area",
        available,
        isControlled: true,
      }),
    ).toEqual({ type: "ignore" });
    expect(
      resolveChooseToolAction({
        next: "zoom-area",
        available,
        isControlled: false,
      }),
    ).toEqual({ type: "ignore" });
  });

  it("requests only when controlled and available", () => {
    expect(
      resolveChooseToolAction({
        next: "point",
        available,
        isControlled: true,
      }),
    ).toEqual({ type: "request" });
  });

  it("applies when local and available", () => {
    expect(
      resolveChooseToolAction({
        next: "point",
        available,
        isControlled: false,
      }),
    ).toEqual({ type: "apply" });
  });
});

describe("capabilityStatusText", () => {
  const diag = {
    code: "INTERACTION_INTERVAL_SCALE_UNSUPPORTED" as const,
    message: "Band scales cannot zoom",
    severity: "warning" as const,
    prop: "scales.x",
    actual: "band",
  };

  it("prefers facet unavailability over zoom messages", () => {
    expect(
      capabilityStatusText({
        facetUnavailableMessage: "facets unsupported",
        areaDiagnostics: [diag],
        zoomSupported: false,
        interactive: true,
        emptyPlot: false,
        candidateCount: 0,
      }),
    ).toBe("Area interaction unavailable: facets unsupported");
  });

  it("reports zoom limited vs unavailable from zoomSupported", () => {
    expect(
      capabilityStatusText({
        areaDiagnostics: [diag],
        zoomSupported: true,
        interactive: true,
        emptyPlot: false,
        candidateCount: 5,
      }),
    ).toBe("Zoom limited: Band scales cannot zoom");
    expect(
      capabilityStatusText({
        areaDiagnostics: [diag],
        zoomSupported: false,
        interactive: true,
        emptyPlot: false,
        candidateCount: 5,
      }),
    ).toBe("Zoom unavailable: Band scales cannot zoom");
  });

  it("reports no inspectable marks only when model exists (candidateCount not null)", () => {
    expect(
      capabilityStatusText({
        areaDiagnostics: [],
        zoomSupported: true,
        interactive: true,
        emptyPlot: false,
        candidateCount: 0,
      }),
    ).toBe("No inspectable marks");
    expect(
      capabilityStatusText({
        areaDiagnostics: [],
        zoomSupported: true,
        interactive: true,
        emptyPlot: false,
        candidateCount: null,
      }),
    ).toBeNull();
    expect(
      capabilityStatusText({
        areaDiagnostics: [],
        zoomSupported: true,
        interactive: true,
        emptyPlot: true,
        candidateCount: 0,
      }),
    ).toBeNull();
    expect(
      capabilityStatusText({
        areaDiagnostics: [],
        zoomSupported: true,
        interactive: false,
        emptyPlot: false,
        candidateCount: 0,
      }),
    ).toBeNull();
  });
});

describe("isEmptyPlotScene", () => {
  it("is true when every batch has zero rows, including no batches", () => {
    expect(isEmptyPlotScene([])).toBe(true);
    expect(isEmptyPlotScene([{ rowIndex: [] }, { rowIndex: [] }])).toBe(true);
  });

  it("is false when any batch has rows", () => {
    expect(isEmptyPlotScene([{ rowIndex: [0] }, { rowIndex: [] }])).toBe(false);
  });
});

describe("shouldShowToolRail", () => {
  const base = {
    interactive: true,
    availableToolCount: 1,
    canPublishPointSelection: false,
    selectedKeyCount: 0,
    hasIntervalSelection: false,
    hasZoomDomains: false,
  } as const;

  it("is false when interaction is disabled regardless of recovery state", () => {
    expect(
      shouldShowToolRail({
        ...base,
        interactive: false,
        availableToolCount: 4,
        hasIntervalSelection: true,
        hasZoomDomains: true,
      }),
    ).toBe(false);
  });

  it("is false for a single tool with no selection or zoom recovery", () => {
    expect(shouldShowToolRail(base)).toBe(false);
  });

  it("is true when more than one tool is available", () => {
    expect(shouldShowToolRail({ ...base, availableToolCount: 2 })).toBe(true);
  });

  it("is true only when point selection is publishable and non-empty", () => {
    expect(
      shouldShowToolRail({
        ...base,
        canPublishPointSelection: true,
        selectedKeyCount: 1,
      }),
    ).toBe(true);
    expect(
      shouldShowToolRail({
        ...base,
        canPublishPointSelection: true,
        selectedKeyCount: 0,
      }),
    ).toBe(false);
    expect(
      shouldShowToolRail({
        ...base,
        canPublishPointSelection: false,
        selectedKeyCount: 3,
      }),
    ).toBe(false);
  });

  it("is true when an interval selection or zoom domains are present", () => {
    expect(shouldShowToolRail({ ...base, hasIntervalSelection: true })).toBe(true);
    expect(shouldShowToolRail({ ...base, hasZoomDomains: true })).toBe(true);
  });
});

describe("shouldShowInertSelectionOverlay", () => {
  it("is false when the chart is interactive even with anchors", () => {
    expect(
      shouldShowInertSelectionOverlay({
        interactive: true,
        selectedAnchorCount: 2,
        emphasizedAnchorCount: 3,
      }),
    ).toBe(false);
  });

  it("is true only when non-interactive and at least one anchor set is non-empty", () => {
    expect(
      shouldShowInertSelectionOverlay({
        interactive: false,
        selectedAnchorCount: 1,
        emphasizedAnchorCount: 0,
      }),
    ).toBe(true);
    expect(
      shouldShowInertSelectionOverlay({
        interactive: false,
        selectedAnchorCount: 0,
        emphasizedAnchorCount: 2,
      }),
    ).toBe(true);
    expect(
      shouldShowInertSelectionOverlay({
        interactive: false,
        selectedAnchorCount: 0,
        emphasizedAnchorCount: 0,
      }),
    ).toBe(false);
  });
});

describe("legendFocusDiscreteOnlyDiagnostics", () => {
  it("returns empty when disabled or there are no legends", () => {
    expect(legendFocusDiscreteOnlyDiagnostics(false, [{ type: "ramp" }])).toEqual([]);
    expect(legendFocusDiscreteOnlyDiagnostics(true, [])).toEqual([]);
  });

  it("returns empty when any legend is discrete", () => {
    expect(legendFocusDiscreteOnlyDiagnostics(true, [{ type: "discrete" }])).toEqual([]);
    expect(
      legendFocusDiscreteOnlyDiagnostics(true, [{ type: "discrete" }, { type: "ramp" }]),
    ).toEqual([]);
  });

  it("advises when every legend is non-discrete (ramp or unknown)", () => {
    const rampOnly = legendFocusDiscreteOnlyDiagnostics(true, [{ type: "ramp" }]);
    expect(rampOnly).toHaveLength(1);
    const rampDiag = rampOnly[0];
    expect(rampDiag).toMatchObject({
      code: "INTERACTION_LEGEND_DISCRETE_ONLY",
      severity: "advisory",
      prop: "legendFocus",
      actual: ["ramp"],
    });
    expect(typeof rampDiag.message).toBe("string");
    expect(rampDiag.message.length).toBeGreaterThan(0);

    const mixed = legendFocusDiscreteOnlyDiagnostics(true, [
      { type: "ramp" },
      { type: "continuous" },
    ]);
    expect(mixed[0]).toMatchObject({
      code: "INTERACTION_LEGEND_DISCRETE_ONLY",
      actual: ["ramp", "continuous"],
    });
  });
});
