import { describe, expect, it } from "vitest";

import {
  bandChannelsForZoom,
  capabilityStatusText,
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
