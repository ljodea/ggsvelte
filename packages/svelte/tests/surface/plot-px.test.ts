import { describe, expect, it } from "vitest";

import type { CandidateFacts } from "@ggsvelte/core";
import type { SceneHit } from "@ggsvelte/core/dom";

import {
  bestDirectionalIndex,
  buildTraversalHits,
  CANDIDATE_HIT_TOLERANCE,
  cycleCoincidentIndex,
  hitFromCandidate,
  matchCandidateFromHit,
  nextTraversalIndex,
  planCycleCoincident,
  planDirectionalNavigate,
  plotPointFromClient,
} from "../../src/lib/surface/plot-px.js";

const hit = (x: number, y: number, extras: Partial<SceneHit> = {}): SceneHit => ({
  layerIndex: 0,
  panelIndex: 0,
  rowIndex: 0,
  x,
  y,
  kind: "point",
  ...extras,
});

describe("plotPointFromClient", () => {
  it("maps client coordinates into scene space", () => {
    expect(
      plotPointFromClient(
        150,
        120,
        { left: 100, top: 100, width: 200, height: 100 },
        {
          width: 400,
          height: 200,
        },
      ),
    ).toEqual({ x: 100, y: 40 });
  });

  it("returns origin when the element has zero size", () => {
    expect(
      plotPointFromClient(
        10,
        10,
        { left: 0, top: 0, width: 0, height: 50 },
        {
          width: 400,
          height: 200,
        },
      ),
    ).toEqual({ x: 0, y: 0 });
    expect(
      plotPointFromClient(
        10,
        10,
        { left: 0, top: 0, width: 50, height: 0 },
        {
          width: 400,
          height: 200,
        },
      ),
    ).toEqual({ x: 0, y: 0 });
  });

  it("does not clamp out-of-bounds client coordinates", () => {
    expect(
      plotPointFromClient(
        50,
        50,
        { left: 100, top: 100, width: 100, height: 100 },
        {
          width: 100,
          height: 100,
        },
      ),
    ).toEqual({ x: -50, y: -50 });
  });
});

describe("hitFromCandidate", () => {
  it("copies hit fields from a candidate", () => {
    const candidate = {
      layerIndex: 2,
      panelIndex: 1,
      rowIndex: 7,
      x: 12.5,
      y: 44,
      kind: "line",
    } as CandidateFacts;
    expect(hitFromCandidate(candidate)).toEqual({
      layerIndex: 2,
      panelIndex: 1,
      rowIndex: 7,
      x: 12.5,
      y: 44,
      kind: "line",
    });
  });
});

describe("nextTraversalIndex", () => {
  it("wraps modularly in both directions", () => {
    expect(nextTraversalIndex(0, 1, 3)).toBe(1);
    expect(nextTraversalIndex(2, 1, 3)).toBe(0);
    expect(nextTraversalIndex(0, -1, 3)).toBe(2);
    expect(nextTraversalIndex(1, -1, 3)).toBe(0);
  });
});

describe("bestDirectionalIndex", () => {
  const origin = { x: 50, y: 50 };
  const hits = [
    hit(40, 50), // left of origin
    hit(70, 50), // right
    hit(80, 50), // farther right
    hit(70, 55), // right with orthogonal offset
    hit(50, 50), // coincident with origin
  ];

  it("returns -1 for empty hits or no candidates in the direction", () => {
    expect(bestDirectionalIndex(origin, [], 1, 0)).toBe(-1);
    expect(bestDirectionalIndex(origin, hits, -1, 0)).toBe(0);
    expect(bestDirectionalIndex(origin, [hit(40, 50)], 1, 0)).toBe(-1);
  });

  it("prefers the best score and breaks ties by later traversal order", () => {
    // Both index 1 and a duplicate at same position: later wins on equal score.
    const tied = [hit(70, 50), hit(70, 50)];
    expect(bestDirectionalIndex(origin, tied, 1, 0)).toBe(1);
    // Among rightward hits, nearer primary with zero orthogonal wins over farther.
    expect(bestDirectionalIndex(origin, hits, 1, 0)).toBe(1);
  });

  it("applies orthogonal penalty so collinear-ish neighbors win", () => {
    // index 1: primary=20, ortho=0 → score 20
    // index 3: primary=20, ortho=5 → score 20+10=30
    expect(bestDirectionalIndex(origin, hits, 1, 0)).toBe(1);
  });

  it("excludes origin-coincident and behind-direction hits (primary <= 0)", () => {
    expect(bestDirectionalIndex(origin, [hit(50, 50), hit(60, 50)], 1, 0)).toBe(1);
    expect(bestDirectionalIndex(origin, [hit(40, 50)], 1, 0)).toBe(-1);
  });
});

describe("buildTraversalHits", () => {
  const asCandidate = (id: number, partial: Partial<CandidateFacts> = {}): CandidateFacts =>
    ({
      id,
      layerIndex: 0,
      panelIndex: 0,
      rowIndex: id,
      x: id * 10,
      y: id * 10,
      kind: "point",
      autoMode: "exact",
      lineage: id,
      ...partial,
    }) as CandidateFacts;

  it("walks first/next order and projects candidates to hits", () => {
    const order = [2, 0, 1];
    const store = {
      traverse(fromId: number | null, direction: "first" | "next"): number | null {
        if (direction === "first") return order[0] ?? null;
        if (fromId === null) return null;
        const index = order.indexOf(fromId);
        return index < 0 ? null : (order[index + 1] ?? null);
      },
      candidate(id: number): CandidateFacts | null {
        return asCandidate(id);
      },
    };
    expect(buildTraversalHits(store)).toEqual([
      hitFromCandidate(asCandidate(2)),
      hitFromCandidate(asCandidate(0)),
      hitFromCandidate(asCandidate(1)),
    ]);
  });

  it("stops on cycles and skips missing candidates", () => {
    const store = {
      traverse(fromId: number | null, direction: "first" | "next"): number | null {
        if (direction === "first") return 0;
        if (fromId === 0) return 1;
        if (fromId === 1) return 0; // cycle
        return null;
      },
      candidate(id: number): CandidateFacts | null {
        return id === 1 ? null : asCandidate(id);
      },
    };
    expect(buildTraversalHits(store)).toEqual([hitFromCandidate(asCandidate(0))]);
  });

  it("returns empty when traverse has no first candidate", () => {
    expect(
      buildTraversalHits({
        traverse: () => null,
        candidate: () => null,
      }),
    ).toEqual([]);
  });
});

describe("cycleCoincidentIndex", () => {
  const origin = { x: 10, y: 20 };
  const hits = [
    hit(10, 20), // 0 coincident
    hit(50, 50), // 1 not
    hit(10.4, 20.4), // 2 coincident (< 0.5)
    hit(10.6, 20), // 3 not (>= 0.5 on x)
    hit(10, 20), // 4 coincident
  ];

  it("returns -1 when fewer than two coincident hits", () => {
    expect(cycleCoincidentIndex(origin, [hit(10, 20)], 0, 1)).toBe(-1);
    expect(cycleCoincidentIndex(origin, [hit(0, 0), hit(1, 1)], 0, 1)).toBe(-1);
  });

  it("cycles forward and wraps", () => {
    expect(cycleCoincidentIndex(origin, hits, 0, 1)).toBe(2);
    expect(cycleCoincidentIndex(origin, hits, 2, 1)).toBe(4);
    expect(cycleCoincidentIndex(origin, hits, 4, 1)).toBe(0);
  });

  it("cycles backward and wraps", () => {
    expect(cycleCoincidentIndex(origin, hits, 0, -1)).toBe(4);
  });

  it("starts at first coincident when active index is not in the set", () => {
    // activeIndex 1 is not coincident → Math.max(0, -1) = 0 → next from first
    expect(cycleCoincidentIndex(origin, hits, 1, 1)).toBe(2);
  });
});

describe("planDirectionalNavigate", () => {
  it("returns none when there are no hits", () => {
    expect(
      planDirectionalNavigate({
        hitCount: 0,
        hasInspection: true,
        currentIndex: 0,
        bestIndex: () => 2,
      }),
    ).toEqual({ type: "none" });
  });

  it("advances by +1 from currentIndex when uninspected (not hard-coded first)", () => {
    expect(
      planDirectionalNavigate({
        hitCount: 3,
        hasInspection: false,
        currentIndex: 1,
        bestIndex: () => {
          throw new Error("thunk must not run when uninspected");
        },
      }),
    ).toEqual({ type: "set-index", index: 2 });
  });

  it("uses the bestIndex thunk when inspected", () => {
    let called = false;
    expect(
      planDirectionalNavigate({
        hitCount: 4,
        hasInspection: true,
        currentIndex: 0,
        bestIndex: () => {
          called = true;
          return 3;
        },
      }),
    ).toEqual({ type: "set-index", index: 3 });
    expect(called).toBe(true);
  });

  it("returns none when the thunk reports no forward candidate", () => {
    expect(
      planDirectionalNavigate({
        hitCount: 4,
        hasInspection: true,
        currentIndex: 0,
        bestIndex: () => -1,
      }),
    ).toEqual({ type: "none" });
  });
});

describe("planCycleCoincident", () => {
  it("advances by +1 when uninspected, including empty → none", () => {
    expect(
      planCycleCoincident({
        hasInspection: false,
        hitCount: 0,
        currentIndex: 0,
        nextIndex: () => {
          throw new Error("thunk must not run when uninspected");
        },
      }),
    ).toEqual({ type: "none" });
    expect(
      planCycleCoincident({
        hasInspection: false,
        hitCount: 3,
        currentIndex: 2,
        nextIndex: () => {
          throw new Error("thunk must not run when uninspected");
        },
      }),
    ).toEqual({ type: "set-index", index: 0 });
  });

  it("uses the nextIndex thunk when inspected", () => {
    expect(
      planCycleCoincident({
        hasInspection: true,
        hitCount: 5,
        currentIndex: 0,
        nextIndex: () => 4,
      }),
    ).toEqual({ type: "set-index", index: 4 });
  });

  it("returns none when the thunk reports fewer than two coincident", () => {
    expect(
      planCycleCoincident({
        hasInspection: true,
        hitCount: 5,
        currentIndex: 0,
        nextIndex: () => -1,
      }),
    ).toEqual({ type: "none" });
  });
});

describe("matchCandidateFromHit", () => {
  const base = {
    id: 0,
    layerIndex: 0,
    panelIndex: 0,
    rowIndex: 1 as number | null,
    x: 10,
    y: 20,
    kind: "point" as const,
    autoMode: "exact" as const,
    lineage: 0,
  };

  const asCandidate = (partial: Partial<typeof base> & { id: number }): CandidateFacts =>
    ({
      ...base,
      ...partial,
    }) as CandidateFacts;

  it("matches on layer/panel/row/kind within exclusive 0.5 tolerance", () => {
    const candidates = [
      asCandidate({ id: 0, x: 10.49, y: 20.49 }),
      asCandidate({ id: 1, x: 10, y: 20, rowIndex: 2 }),
    ];
    const matched = matchCandidateFromHit(candidates, hit(10, 20, { rowIndex: 1 }));
    expect(matched?.id).toBe(0);
  });

  it("rejects |Δ| === CANDIDATE_HIT_TOLERANCE (exclusive bound)", () => {
    expect(CANDIDATE_HIT_TOLERANCE).toBe(0.5);
    const candidates = [asCandidate({ id: 0, x: 10 + CANDIDATE_HIT_TOLERANCE, y: 20 })];
    expect(matchCandidateFromHit(candidates, hit(10, 20, { rowIndex: 1 }))).toBeNull();
  });

  it("returns the first match in iteration order", () => {
    const candidates = [asCandidate({ id: 0, x: 10, y: 20 }), asCandidate({ id: 1, x: 10, y: 20 })];
    expect(matchCandidateFromHit(candidates, hit(10, 20, { rowIndex: 1 }))?.id).toBe(0);
  });

  it("requires kind and row identity", () => {
    const candidates = [asCandidate({ id: 0, kind: "line" as never })];
    expect(
      matchCandidateFromHit(candidates, hit(10, 20, { rowIndex: 1, kind: "point" })),
    ).toBeNull();
  });
});
