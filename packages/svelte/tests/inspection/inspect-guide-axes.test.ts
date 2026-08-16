import { describe, expect, it } from "vitest";

import { inspectGuideAxes } from "../../src/lib/inspection/inspect-guide-axes.js";
import type { ResolvedInspectMode } from "../../src/lib/interaction/interaction.js";

const cases: readonly {
  mode: ResolvedInspectMode;
  flipped: boolean;
  vertical: boolean;
  horizontal: boolean;
}[] = [
  { mode: "exact", flipped: false, vertical: false, horizontal: false },
  { mode: "exact", flipped: true, vertical: false, horizontal: false },
  { mode: "x", flipped: false, vertical: true, horizontal: false },
  { mode: "x", flipped: true, vertical: false, horizontal: true },
  { mode: "y", flipped: false, vertical: false, horizontal: true },
  { mode: "y", flipped: true, vertical: true, horizontal: false },
  { mode: "xy", flipped: false, vertical: true, horizontal: true },
  { mode: "xy", flipped: true, vertical: true, horizontal: true },
];

describe("inspectGuideAxes", () => {
  it.each(cases)(
    "$mode flipped=$flipped → vertical=$vertical horizontal=$horizontal",
    ({ mode, flipped, vertical, horizontal }) => {
      expect(inspectGuideAxes(mode, flipped)).toEqual({ vertical, horizontal });
    },
  );
});
