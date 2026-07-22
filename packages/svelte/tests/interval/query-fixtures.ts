/**
 * Shared IntervalQueryScene builder for pure interval/query unit suites.
 */
import { fromPartial } from "@total-typescript/shoehorn";

import type { IntervalQueryScene } from "../../src/lib/interval/query.js";

export function scene(partial: {
  panel?: IntervalQueryScene["panel"];
  singlePanel?: boolean;
  flip?: boolean;
  coord?: IntervalQueryScene["coord"];
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
    ...(partial.coord !== undefined && { coord: partial.coord }),
    scales: fromPartial<IntervalQueryScene["scales"]>({
      x: {
        type: "linear",
        invert: (t: number) => (flip ? 1 - t : t) * 10,
      },
      y: {
        type: "linear",
        invert: (t: number) => (flip ? t : 1 - t) * 20,
      },
    }),
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
