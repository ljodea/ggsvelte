import { describe, expect, it } from "vitest";

import {
  filterFilterableLegendEntries,
  isLegendFilterPropEnabled,
  resolveLegendFilterCapability,
} from "../../src/lib/legend/resolve-legend-filter.js";

describe("resolveLegendFilterCapability", () => {
  it("is off when neither plot prop nor children request filter", () => {
    expect(
      resolveLegendFilterCapability({
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
    const resolved = resolveLegendFilterCapability({
      plotProp: true,
      layers: [],
    });
    expect(resolved.requested).toBe(true);
    expect(resolved.configInput).toBe(true);
    expect(resolved.channels).toBe("all");
  });

  it("collects channels from GuideLegend filter layers", () => {
    const resolved = resolveLegendFilterCapability({
      plotProp: undefined,
      layers: [
        { kind: "guides", value: { color: { type: "legend" } } },
        {
          kind: "legendFilter",
          value: { channel: "color", input: true },
        },
        {
          kind: "legendFilter",
          value: { channel: "fill", input: { mode: "include", multiple: false } },
        },
        { kind: "legendFilter", value: null },
      ],
    });
    expect(resolved.requested).toEqual({ mode: "include", multiple: false });
    expect(resolved.configInput).toEqual({ mode: "include", multiple: false });
    expect(resolved.channels).toEqual(new Set(["color", "fill"]));
  });

  it("prefers child channels when both prop and children are set", () => {
    const resolved = resolveLegendFilterCapability({
      plotProp: true,
      layers: [{ kind: "legendFilter", value: { channel: "fill", input: true } }],
    });
    expect(resolved.channels).toEqual(new Set(["fill"]));
    expect(resolved.configInput).toBe(true);
  });

  it("merges mode and multiple from plot prop and children (last wins)", () => {
    const resolved = resolveLegendFilterCapability({
      plotProp: { mode: "exclude", multiple: true },
      layers: [
        {
          kind: "legendFilter",
          value: { channel: "color", input: { mode: "include", multiple: false } },
        },
      ],
    });
    expect(resolved.configInput).toEqual({ mode: "include", multiple: false });
    expect(resolved.channels).toEqual(new Set(["color"]));
  });

  it("keeps plot options when children only pass boolean true", () => {
    const resolved = resolveLegendFilterCapability({
      plotProp: { mode: "include", multiple: false },
      layers: [{ kind: "legendFilter", value: { channel: "color", input: true } }],
    });
    expect(resolved.configInput).toEqual({ mode: "include", multiple: false });
  });
});

describe("filterFilterableLegendEntries", () => {
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

  const entries = [
    {
      legend: colorLegend,
      entry: { label: "a", value: "a", y: 0 },
      field: "series",
      visible: true,
    },
    {
      legend: shapeOnMerged,
      entry: { label: "b", value: "b", y: 0 },
      field: "series",
      visible: true,
    },
  ];

  it("keeps every entry when channels is all", () => {
    expect(filterFilterableLegendEntries(entries, "all")).toHaveLength(2);
  });

  it("matches merged legends via aesthetics, not only primary scale", () => {
    const filtered = filterFilterableLegendEntries(entries, new Set(["shape"]));
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.legend.title).toBe("Merged");
  });

  it("drops entries when the channel set is empty", () => {
    expect(filterFilterableLegendEntries(entries, new Set())).toEqual([]);
  });
});

describe("isLegendFilterPropEnabled", () => {
  it("treats true and options objects as enabled", () => {
    expect(isLegendFilterPropEnabled(true)).toBe(true);
    expect(isLegendFilterPropEnabled({ mode: "include" })).toBe(true);
    expect(isLegendFilterPropEnabled(false)).toBe(false);
  });
});
