import { describe, expect, it } from "vitest";

import type { PortableSpec } from "@ggsvelte/spec";

import {
  applyZoomToSpec,
  resolveBrushZoomDomains,
  sanitizePartialZoomDomains,
} from "../src/lib/plot-zoom.js";

const continuousScale = (domain: [number, number]) => {
  const [d0, d1] = domain;
  const span = d1 - d0;
  return {
    type: "continuous" as const,
    invert: (t: number) => d0 + t * span,
  };
};

const bandScale = {
  type: "band" as const,
  invert: (_t: number) => 0,
};

const panel = { x: 0, y: 0, width: 100, height: 100 };

describe("applyZoomToSpec", () => {
  const base = {
    aes: {},
    layers: [{ geom: "point" }],
    scales: {
      x: { type: "continuous", nice: true },
      y: { type: "continuous", nice: true },
    },
  } as unknown as PortableSpec;

  it("returns the same reference when domains are null or empty", () => {
    expect(applyZoomToSpec(base, null)).toBe(base);
    expect(applyZoomToSpec(base, {})).toBe(base);
    expect(applyZoomToSpec(base, { x: undefined, y: undefined })).toBe(base);
  });

  it("merges continuous domains with nice:false and clones tuples", () => {
    const x: [number, number] = [10, 20];
    const next = applyZoomToSpec(base, { x });
    expect(next).not.toBe(base);
    expect(next.scales?.x).toEqual({
      type: "continuous",
      nice: false,
      domain: [10, 20],
    });
    expect(next.scales?.x?.domain).not.toBe(x);
    expect(next.scales?.y).toEqual(base.scales?.y);
    x[0] = 99;
    expect(next.scales?.x?.domain).toEqual([10, 20]);
  });

  it("handles absent scale configs via spread of undefined", () => {
    const bare = {
      aes: {},
      layers: [{ geom: "point" }],
    } as unknown as PortableSpec;
    const next = applyZoomToSpec(bare, { y: [0, 1] });
    expect(next.scales?.y).toEqual({ domain: [0, 1], nice: false });
    expect(next.scales?.x).toBeUndefined();
  });
});

describe("sanitizePartialZoomDomains", () => {
  const scales = {
    x: continuousScale([0, 100]),
    y: bandScale,
  };

  it("keeps finite continuous channels and drops band/non-finite", () => {
    expect(sanitizePartialZoomDomains({ x: [5, 15], y: [0, 1] }, scales as never, null)).toEqual({
      x: [5, 15],
    });
  });

  it("retains the other channel from current domains", () => {
    expect(
      sanitizePartialZoomDomains(
        { x: [1, 2] },
        {
          x: continuousScale([0, 10]),
          y: continuousScale([0, 10]),
        } as never,
        { y: [3, 4] },
      ),
    ).toEqual({ x: [1, 2], y: [3, 4] });
  });

  it("returns null when nothing valid remains", () => {
    expect(
      sanitizePartialZoomDomains(
        { x: [Number.NaN, 1], y: [0, Number.POSITIVE_INFINITY] },
        {
          x: continuousScale([0, 1]),
          y: continuousScale([0, 1]),
        } as never,
        null,
      ),
    ).toBeNull();
    expect(
      sanitizePartialZoomDomains({ x: [0, 1] }, { x: bandScale, y: bandScale } as never, null),
    ).toBeNull();
  });
});

describe("resolveBrushZoomDomains", () => {
  const scales = {
    x: continuousScale([0, 100]),
    y: continuousScale([0, 50]),
  };

  it("rejects only when both normalized pixel spans are non-positive", () => {
    expect(
      resolveBrushZoomDomains(
        { x0: 10, y0: 10, x1: 10, y1: 10 },
        panel,
        scales as never,
        false,
        "xy",
        null,
      ),
    ).toBeNull();
  });

  it("allows a single-axis-thin brush (existing behavior)", () => {
    const domains = resolveBrushZoomDomains(
      { x0: 10, y0: 20, x1: 10, y1: 80 },
      panel,
      scales as never,
      false,
      "xy",
      null,
    );
    expect(domains).not.toBeNull();
    expect(domains!.y).toBeDefined();
  });

  it("filters by mode and merges with current domains", () => {
    const xOnly = resolveBrushZoomDomains(
      { x0: 10, y0: 10, x1: 90, y1: 90 },
      panel,
      scales as never,
      false,
      "x",
      { y: [1, 2] },
    );
    expect(xOnly?.x).toEqual([10, 90]);
    expect(xOnly?.y).toEqual([1, 2]);

    const yOnly = resolveBrushZoomDomains(
      { x0: 10, y0: 10, x1: 90, y1: 90 },
      panel,
      scales as never,
      false,
      "y",
      null,
    );
    expect(yOnly?.x).toBeUndefined();
    expect(yOnly?.y).toBeDefined();
  });

  it("inverts through flipped coordinates", () => {
    // Flipped: screen-x → y scale [0,50], screen-y → x scale [0,100].
    const domains = resolveBrushZoomDomains(
      { x0: 0, y0: 0, x1: 100, y1: 100 },
      panel,
      scales as never,
      true,
      "xy",
      null,
    );
    expect(domains?.x).toEqual([0, 100]);
    expect(domains?.y).toEqual([0, 50]);
  });
});
