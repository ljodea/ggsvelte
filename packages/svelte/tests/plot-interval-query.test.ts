import { describe, expect, it } from "vitest";

import {
  buildIntervalSelectionFromScene,
  resolveIntervalQueryParts,
  type IntervalQueryScene,
} from "../src/lib/plot-interval-query.js";

function scene(partial: {
  panel?: IntervalQueryScene["panel"];
  singlePanel?: boolean;
  flip?: boolean;
  candidates?: readonly {
    lineage: number;
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  }[];
  lineage?: Record<number, number[]>;
}): IntervalQueryScene {
  const panel =
    partial.panel === undefined ? { x: 0, y: 0, width: 100, height: 100, id: "p0" } : partial.panel;
  const candidates = partial.candidates ?? [];
  const lineage = partial.lineage ?? { 1: [10, 11], 2: [11, 12] };
  const flip = partial.flip ?? false;
  return {
    panel,
    singlePanel: partial.singlePanel ?? true,
    flip,
    scales: {
      x: {
        type: "linear",
        invert: (t: number) => (flip ? 1 - t : t) * 10,
      },
      y: {
        type: "linear",
        invert: (t: number) => (flip ? t : 1 - t) * 20,
      },
    } as IntervalQueryScene["scales"],
    queryCandidates(expanded) {
      // Production uses the hit index; tests approximate with axis-aligned bounds.
      return candidates
        .filter(
          (c) =>
            c.x1 >= expanded.x0 &&
            c.x0 <= expanded.x1 &&
            c.y1 >= expanded.y0 &&
            c.y0 <= expanded.y1,
        )
        .map((c) => ({ lineage: c.lineage }));
    },
    lineageKeys(id) {
      return lineage[id] ?? [];
    },
  };
}

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
            scales: {
              x: { type: "linear", invert: (t: number) => 100 + t * 100 },
              y: { type: "linear", invert: (t: number) => 1000 - t * 1000 },
            } as IntervalQueryScene["scales"],
          },
        ],
      },
    });

    expect(parts.panelId).toBe("panel:east");
    expect(parts.invertedDomain.x).toEqual([110, 150]);
    expect(parts.invertedDomain.y).toEqual([0, 500]);
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
            indexOf: () => undefined,
            normalize: () => undefined,
            step: 0.25,
          },
        } as IntervalQueryScene["scales"],
      },
    });
    expect(parts.invertedDomain.x).toEqual(["a", "c"]);
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
            normalize: () => undefined,
            step: 0.2,
          },
        } as IntervalQueryScene["scales"],
      },
    });

    expect(parts.invertedDomain.x).toEqual([1, "1"]);
  });
});

describe("buildIntervalSelectionFromScene", () => {
  it("builds a frozen end event with mode-filtered domain and keys", () => {
    const event = buildIntervalSelectionFromScene({
      phase: "end",
      mode: "x",
      source: "pointer",
      pixels: { x0: 0, y0: 0, x1: 50, y1: 50 },
      scene: scene({
        candidates: [{ lineage: 1, x0: 10, y0: 10, x1: 11, y1: 11 }],
      }),
      keyForRow: (rowIndex) => (rowIndex === 11 ? null : `r${String(rowIndex)}`),
    });
    expect(event.phase).toBe("end");
    expect(event.mode).toBe("x");
    expect(event.panelId).toBe("p0");
    expect(event.keys).toEqual(["r10"]);
    expect(event.lineageCount).toBe(2);
    expect(event.domain.x).toBeDefined();
    expect(event.domain.y).toBeUndefined();
    expect(Object.isFrozen(event)).toBe(true);
  });

  it("preserves start phase with empty scene", () => {
    const event = buildIntervalSelectionFromScene({
      phase: "start",
      mode: "xy",
      source: "keyboard",
      pixels: { x0: 1, y0: 2, x1: 3, y1: 4 },
      scene: null,
      keyForRow: () => "k",
    });
    expect(event).toMatchObject({
      phase: "start",
      keys: [],
      lineageCount: 0,
      panelId: null,
      source: "keyboard",
    });
  });
});
