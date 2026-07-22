/**
 * Pure unit tests for resolveIntervalQueryParts.
 */
import { fromPartial } from "@total-typescript/shoehorn";
import { describe, expect, it } from "vitest";

import {
  resolveIntervalQueryParts,
  type IntervalQueryScene,
} from "../../src/lib/interval/query.js";
import { scene } from "./query-fixtures.js";

describe("resolveIntervalQueryParts", () => {
  it("returns empty parts when scene or panel is missing", () => {
    expect(
      resolveIntervalQueryParts({
        pixels: { x0: 0, y0: 0, x1: 10, y1: 10 },
        mode: "xy",
        scene: null,
      }),
    ).toEqual({ rowIndexes: new Set(), panelId: null, invertedDomain: {} });

    expect(
      resolveIntervalQueryParts({
        pixels: { x0: 0, y0: 0, x1: 10, y1: 10 },
        mode: "xy",
        scene: scene({ panel: null }),
      }),
    ).toEqual({ rowIndexes: new Set(), panelId: null, invertedDomain: {} });
  });

  it("unions lineage rows for candidates in the expanded query", () => {
    const parts = resolveIntervalQueryParts({
      pixels: { x0: 10, y0: 10, x1: 40, y1: 40 },
      mode: "xy",
      scene: scene({
        candidates: [
          { lineage: 1, x0: 15, y0: 15, x1: 16, y1: 16 },
          { lineage: 2, x0: 20, y0: 20, x1: 21, y1: 21 },
          { lineage: 1, x0: 90, y0: 90, x1: 91, y1: 91 }, // outside
        ],
      }),
    });
    expect([...parts.rowIndexes]).toEqual(expect.arrayContaining([10, 11, 12]));
    expect(parts.rowIndexes.size).toBe(3);
    expect(parts.panelId).toBe("p0");
  });

  it("x-mode expands the orthogonal axis so y-position is ignored", () => {
    // Candidate far in y but inside x span of a thin brush should still match in x-mode.
    const parts = resolveIntervalQueryParts({
      pixels: { x0: 10, y0: 50, x1: 30, y1: 51 },
      mode: "x",
      scene: scene({
        candidates: [{ lineage: 1, x0: 20, y0: 5, x1: 21, y1: 6 }],
      }),
    });
    expect([...parts.rowIndexes]).toEqual([10, 11]);
  });

  it("skips domain invert when not single-panel", () => {
    const parts = resolveIntervalQueryParts({
      pixels: { x0: 0, y0: 0, x1: 50, y1: 50 },
      mode: "xy",
      scene: scene({ singlePanel: false }),
    });
    expect(parts.invertedDomain).toEqual({});
  });

  it("uses the requested facet panel identity and its local scales", () => {
    const base = scene({ singlePanel: false });
    const parts = resolveIntervalQueryParts({
      pixels: { x0: 110, y0: 0, x1: 150, y1: 50 },
      mode: "xy",
      panelId: "panel:east",
      scene: {
        ...base,
        panels: [
          {
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            id: "panel:west",
            scales: base.scales,
          },
          {
            x: 100,
            y: 0,
            width: 100,
            height: 100,
            id: "panel:east",
            scales: fromPartial<IntervalQueryScene["scales"]>({
              x: { type: "linear", invert: (t: number) => 100 + t * 100 },
              y: { type: "linear", invert: (t: number) => 1000 - t * 1000 },
            }),
          },
        ],
      },
    });

    expect(parts.panelId).toBe("panel:east");
    expect(parts.invertedDomain.x).toEqual([110, 150]);
    expect(parts.invertedDomain.y).toEqual([0, 500]);
  });

  it("inverts the coordinate projector before continuous interval scales", () => {
    const parts = resolveIntervalQueryParts({
      pixels: { x0: 50, y0: 0, x1: 100, y1: 100 },
      mode: "x",
      scene: scene({
        coord: {
          x: { invertFraction: (fraction: number) => fraction * fraction },
          y: { invertFraction: (fraction: number) => fraction },
        },
      }),
    });
    expect(parts.invertedDomain.x).toEqual([2.5, 10]);
  });

  it("returns inclusive band endpoints for categorical interval selection", () => {
    const base = scene({});
    const parts = resolveIntervalQueryParts({
      pixels: { x0: 20, y0: 0, x1: 70, y1: 100 },
      mode: "x",
      scene: {
        ...base,
        scales: {
          ...base.scales,
          x: {
            type: "band",
            domain: ["a", "b", "c", "d"],
            rawDomain: ["a", "b", "c", "d"],
            indexOf: () => {},
            normalize: () => {},
            step: 0.25,
          },
        },
      },
    });
    expect(parts.invertedDomain.x).toEqual(["a", "c"]);
  });

  it("honors reversed band scales when inverting brush bounds", () => {
    const base = scene({});
    const rawDomain = ["a", "b", "c", "d"] as const;
    const parts = resolveIntervalQueryParts({
      // Screen fractions [0.2, 0.7]; with reverse the domain runs right-to-
      // left, so the brushed categories are the mirrored [0.3, 0.8] → b..d.
      pixels: { x0: 20, y0: 0, x1: 70, y1: 100 },
      mode: "x",
      scene: {
        ...base,
        scales: {
          ...base.scales,
          x: {
            type: "band",
            domain: ["a", "b", "c", "d"],
            rawDomain,
            indexOf: (value: unknown) =>
              rawDomain.findIndex((candidate) => Object.is(candidate, value)),
            normalize: (value: unknown) => {
              const i = rawDomain.findIndex((candidate) => Object.is(candidate, value));
              return i < 0 ? undefined : 1 - (i + 0.5) / rawDomain.length;
            },
            step: 0.25,
          },
        },
      },
    });
    expect(parts.invertedDomain.x).toEqual(["b", "d"]);
  });

  it("returns raw typed band endpoints instead of colliding display labels", () => {
    const base = scene({});
    const date = new Date("2025-01-02T00:00:00.000Z");
    const rawDomain = [1, "1", true, null, date] as const;
    const parts = resolveIntervalQueryParts({
      pixels: { x0: 0, y0: 0, x1: 39, y1: 100 },
      mode: "x",
      scene: {
        ...base,
        scales: {
          ...base.scales,
          x: {
            type: "band",
            domain: ["1", "1", "true", "(null)", date.toISOString()],
            rawDomain,
            indexOf: (value: unknown) =>
              rawDomain.findIndex((candidate) => Object.is(candidate, value)),
            normalize: () => {},
            step: 0.2,
          },
        },
      },
    });

    expect(parts.invertedDomain.x).toEqual([1, "1"]);
  });
});
