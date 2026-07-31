import { describe, expect, it } from "vitest";

import type { InteractiveLegendEntry } from "../../src/lib/legend/focus.js";
import {
  filterInteractiveLegendEntries,
  isLegendFocusPropEnabled,
  resolveLegendFocusCapability,
} from "../../src/lib/legend/resolve-legend-focus.js";

describe("resolveLegendFocusCapability", () => {
  it("is off when neither plot prop nor children request focus", () => {
    expect(
      resolveLegendFocusCapability({
        plotProp: undefined,
        layers: [],
      }),
    ).toEqual({
      requested: false,
      configInput: false,
      channels: new Set(),
    });
  });

  it("uses plot prop alone as all-channel enablement", () => {
    const resolved = resolveLegendFocusCapability({
      plotProp: true,
      layers: [],
    });
    expect(resolved.requested).toBe(true);
    expect(resolved.configInput).toBe(true);
    expect(resolved.channels).toBe("all");
  });

  it("collects channels from GuideLegend focus layers", () => {
    const resolved = resolveLegendFocusCapability({
      plotProp: undefined,
      layers: [
        { kind: "guides", value: { color: { type: "legend" } } },
        {
          kind: "legendFocus",
          value: { channel: "color", input: true },
        },
        {
          kind: "legendFocus",
          value: { channel: "shape", input: { preview: false } },
        },
        { kind: "legendFocus", value: null },
      ],
    });
    expect(resolved.requested).toEqual({ preview: false });
    expect(resolved.configInput).toEqual({ preview: false });
    expect(resolved.channels).toEqual(new Set(["color", "shape"]));
  });

  it("prefers child channels when both prop and children are set", () => {
    const resolved = resolveLegendFocusCapability({
      plotProp: true,
      layers: [{ kind: "legendFocus", value: { channel: "fill", input: true } }],
    });
    expect(resolved.channels).toEqual(new Set(["fill"]));
    expect(resolved.configInput).toBe(true);
  });

  it("disables preview when the plot prop sets preview false", () => {
    const resolved = resolveLegendFocusCapability({
      plotProp: { preview: false },
      layers: [],
    });
    expect(resolved.configInput).toEqual({ preview: false });
  });

  it("any explicit preview false wins across prop and children", () => {
    // plot true + child {preview: false}
    expect(
      resolveLegendFocusCapability({
        plotProp: true,
        layers: [{ kind: "legendFocus", value: { channel: "color", input: { preview: false } } }],
      }).configInput,
    ).toEqual({ preview: false });
    // plot {preview: false} + child true — the child cannot re-enable preview
    expect(
      resolveLegendFocusCapability({
        plotProp: { preview: false },
        layers: [{ kind: "legendFocus", value: { channel: "color", input: true } }],
      }).configInput,
    ).toEqual({ preview: false });
  });

  it("plot-prop-alone passes the raw prop reference through", () => {
    const prop = { preview: false } as const;
    const resolved = resolveLegendFocusCapability({ plotProp: prop, layers: [] });
    expect(resolved.requested).toBe(prop);
    expect(resolved.configInput).toBe(prop);
  });
});

describe("filterInteractiveLegendEntries", () => {
  const colorLegend = {
    type: "discrete" as const,
    scale: "color" as const,
    title: "Color",
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    entries: [],
    swatchSize: 8,
  };
  const shapeOnMerged = {
    type: "discrete" as const,
    scale: "color" as const,
    aesthetics: ["color", "shape"] as const,
    title: "Merged",
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    entries: [],
    swatchSize: 8,
  };

  const entries: InteractiveLegendEntry[] = [
    {
      legend: colorLegend,
      entry: { label: "a", value: "a", y: 0 },
      identity: { scale: "color", entryIndex: 0 },
    },
    {
      legend: shapeOnMerged,
      entry: { label: "b", value: "b", y: 0 },
      identity: { scale: "color", entryIndex: 0 },
    },
  ];

  it("keeps every entry when channels is all", () => {
    expect(filterInteractiveLegendEntries(entries, "all")).toHaveLength(2);
  });

  it("matches merged legends via aesthetics, not only primary scale", () => {
    const filtered = filterInteractiveLegendEntries(entries, new Set(["shape"]));
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.legend.title).toBe("Merged");
  });

  it("drops entries when the channel set is empty", () => {
    expect(filterInteractiveLegendEntries(entries, new Set())).toEqual([]);
  });
});

describe("isLegendFocusPropEnabled", () => {
  it("treats true and options objects as enabled", () => {
    expect(isLegendFocusPropEnabled(true)).toBe(true);
    expect(isLegendFocusPropEnabled({ preview: false })).toBe(true);
    expect(isLegendFocusPropEnabled(false)).toBe(false);
  });
});
