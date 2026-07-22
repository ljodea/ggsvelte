/**
 * Pure unit tests for buildIntervalSelectionFromScene and intervalQuerySceneFromModel.
 */
import { fromPartial } from "@total-typescript/shoehorn";
import { describe, expect, it } from "vitest";

import {
  buildIntervalSelectionFromScene,
  intervalQuerySceneFromModel,
  resolveIntervalQueryParts,
  type IntervalQueryModelPort,
  type IntervalQueryScene,
} from "../../src/lib/interval/query.js";
import { scene } from "./query-fixtures.js";

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
  const scales = fromPartial<IntervalQueryScene["scales"]>({
    x: { type: "linear", invert: (t: number) => t * 10 },
    y: { type: "linear", invert: (t: number) => (1 - t) * 20 },
  });

  function port(partial: {
    panels?: IntervalQueryModelPort["scene"]["panels"];
    byId?: Record<number, { lineage: number } | null>;
    lineage?: Record<number, number[]>;
    onQueryRect?: (x0: number, y0: number, x1: number, y1: number) => void;
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
        queryRect(x0, y0, x1, y1) {
          partial.onQueryRect?.(x0, y0, x1, y1);
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

  it("queryCandidates forwards expanded bounds, filters nulls, and lineageKeys delegates", () => {
    const seen: number[][] = [];
    const adapted = intervalQuerySceneFromModel(
      port({
        onQueryRect(x0, y0, x1, y1) {
          seen.push([x0, y0, x1, y1]);
        },
      }),
      false,
    );
    expect(adapted.queryCandidates({ x0: 3, y0: 4, x1: 5, y1: 6 })).toEqual([
      { lineage: 1 },
      { lineage: 2 },
    ]);
    expect(seen).toEqual([[3, 4, 5, 6]]);
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
