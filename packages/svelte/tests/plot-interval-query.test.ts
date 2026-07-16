import { describe, expect, it } from "vitest";

import {
  buildIntervalSelectionFromScene,
  intervalQuerySceneFromModel,
  resolveIntervalQueryParts,
  type IntervalQueryModelPort,
  type IntervalQueryScene,
} from "../src/lib/plot-interval-query.js";

function scene(partial: {
  panel?: IntervalQueryScene["panel"];
  singlePanel?: boolean;
  flip?: boolean;
  candidates?: readonly { lineage: number; x0: number; y0: number; x1: number; y1: number }[];
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

describe("intervalQuerySceneFromModel", () => {
  const scales = {
    x: { type: "linear", invert: (t: number) => t * 10 },
    y: { type: "linear", invert: (t: number) => (1 - t) * 20 },
  } as IntervalQueryScene["scales"];

  function port(partial: {
    panels?: IntervalQueryModelPort["scene"]["panels"];
    byId?: Record<number, { lineage: number } | null>;
    lineage?: Record<number, number[]>;
  }): IntervalQueryModelPort {
    const byId = partial.byId ?? {
      0: { lineage: 1 },
      1: null,
      2: { lineage: 2 },
    };
    const lineage = partial.lineage ?? { 1: [10], 2: [20, 21] };
    return {
      scene: {
        panels: partial.panels ?? [{ x: 1, y: 2, width: 30, height: 40, id: "p0" }],
      },
      scales,
      candidates: {
        queryRect() {
          return Object.keys(byId).map(Number);
        },
        candidate(id) {
          return byId[id] ?? null;
        },
      },
      lineage: {
        keys(lineageId) {
          return lineage[lineageId] ?? [];
        },
      },
    };
  }

  it("maps first panel geometry and singlePanel from panel count", () => {
    const one = intervalQuerySceneFromModel(port({}), false);
    expect(one.panel).toEqual({ x: 1, y: 2, width: 30, height: 40, id: "p0" });
    expect(one.singlePanel).toBe(true);
    expect(one.flip).toBe(false);
    expect(one.scales).toBe(scales);

    const multi = intervalQuerySceneFromModel(
      port({
        panels: [
          { x: 0, y: 0, width: 10, height: 10, id: "a" },
          { x: 10, y: 0, width: 10, height: 10, id: "b" },
        ],
      }),
      true,
    );
    expect(multi.panel?.id).toBe("a");
    expect(multi.singlePanel).toBe(false);
    expect(multi.flip).toBe(true);
  });

  it("returns null panel when the model has no panels", () => {
    const empty = intervalQuerySceneFromModel(port({ panels: [] }), false);
    expect(empty.panel).toBeNull();
    expect(empty.singlePanel).toBe(false);
  });

  it("queryCandidates filters null candidates and lineageKeys delegates", () => {
    const adapted = intervalQuerySceneFromModel(port({}), false);
    expect(adapted.queryCandidates({ x0: 0, y0: 0, x1: 1, y1: 1 })).toEqual([
      { lineage: 1 },
      { lineage: 2 },
    ]);
    expect([...adapted.lineageKeys(2)]).toEqual([20, 21]);
    expect([...adapted.lineageKeys(99)]).toEqual([]);
  });

  it("wires through resolveIntervalQueryParts for lineage rows", () => {
    const adapted = intervalQuerySceneFromModel(
      port({
        byId: { 0: { lineage: 1 } },
        lineage: { 1: [5, 6] },
      }),
      false,
    );
    // queryRect returns all byId keys; expanded geometry unused by stub.
    const parts = resolveIntervalQueryParts({
      pixels: { x0: 0, y0: 0, x1: 50, y1: 50 },
      mode: "xy",
      scene: adapted,
    });
    expect([...parts.rowIndexes]).toEqual([5, 6]);
    expect(parts.panelId).toBe("p0");
  });
});
