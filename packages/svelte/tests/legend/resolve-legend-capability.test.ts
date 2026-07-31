import { describe, expect, it } from "vitest";

import {
  filterEntriesByChannels,
  resolveLegendChannelCapability,
} from "../../src/lib/legend/resolve-legend-capability.js";

type FakeInput = true | { flag?: boolean };

/** Children-path merge used by the tests: object-with-count so merges are visible. */
function mergeCount(
  plotProp: FakeInput | undefined,
  children: ReadonlyArray<{ channel: string; input: Exclude<FakeInput, false> }>,
): Exclude<FakeInput, false> {
  const explicit = (plotProp !== undefined && plotProp !== true ? 1 : 0) + children.length;
  return { flag: explicit > 1 };
}

describe("resolveLegendChannelCapability", () => {
  it("is off when neither plot prop nor children enable the kind", () => {
    expect(
      resolveLegendChannelCapability<FakeInput>({
        plotProp: undefined,
        layers: [{ kind: "other", value: { channel: "color", input: true } }],
        layerKind: "legendFocus",
        mergeChildrenConfig: mergeCount,
      }),
    ).toEqual({ requested: false, configInput: false, channels: new Set() });
  });

  it("plot prop alone is all-channels and passes the raw reference through", () => {
    const prop = { flag: true } as const;
    const resolved = resolveLegendChannelCapability<FakeInput>({
      plotProp: prop,
      layers: [],
      layerKind: "legendFocus",
      mergeChildrenConfig: () => {
        throw new Error("mergeChildrenConfig must not run on the plot-alone path");
      },
    });
    expect(resolved.requested).toBe(prop);
    expect(resolved.configInput).toBe(prop);
    expect(resolved.channels).toBe("all");
  });

  it("children define the channel set and route through the capability merge", () => {
    const resolved = resolveLegendChannelCapability<FakeInput>({
      plotProp: true,
      layers: [
        { kind: "legendFocus", value: { channel: "color", input: true } },
        { kind: "legendFocus", value: { channel: "shape", input: { flag: false } } },
        // Skipped: wrong kind, null value, disabled input.
        { kind: "legendFilter", value: { channel: "alpha", input: true } },
        { kind: "legendFocus", value: null },
        { kind: "legendFocus", value: { channel: "size", input: false } },
      ],
      layerKind: "legendFocus",
      mergeChildrenConfig: mergeCount,
    });
    expect(resolved.channels).toEqual(new Set(["color", "shape"]));
    expect(resolved.requested).toEqual({ flag: true });
    expect(resolved.configInput).toEqual({ flag: true });
  });
});

describe("filterEntriesByChannels", () => {
  const entries = [
    { legend: { scale: "color" }, name: "plain" },
    { legend: { scale: "color", aesthetics: ["color", "shape"] }, name: "merged" },
  ];

  it("keeps all on 'all', drops all on empty, matches merged aesthetics", () => {
    expect(filterEntriesByChannels(entries, "all")).toHaveLength(2);
    expect(filterEntriesByChannels(entries, new Set())).toEqual([]);
    const shape = filterEntriesByChannels(entries, new Set(["shape"]));
    expect(shape.map((entry) => entry.name)).toEqual(["merged"]);
  });
});
