import { describe, expect, it } from "bun:test";

import { neighbourOverlap, neighbourOverlapByPlane } from "../../src/layout/axis-overlap.ts";

describe("neighbourOverlapByPlane: top-aligned wrapped band labels", () => {
  // Renderer stacks wrap lines top-down (first tspan dy=0.71em, then +lineStep).
  // Plane k is shared across ticks; a 1-line neighbour occupies only plane 0.
  // Rejecting on max(lineWidths) as a centered block is too strict when line1 is
  // longer than line0 and no neighbour has text on plane 1.

  it("accepts a longer second line that would fail a max-width block AABB", () => {
    // Three ticks 70px apart. Middle: line0=50, line1=90. Neighbours: single 50.
    // Block half=45 → edges collide with neighbour half=25 (gap 4):
    //   70 - 25 - 45 = 0 < 4.
    const centers = [35, 105, 175];
    const planes: number[][] = [
      [50], // only plane 0
      [50, 90], // long line1, no neighbour on that plane
      [50],
    ];
    const blockItems = centers.map((pos, i) => ({
      pos,
      half: Math.max(...planes[i]!) / 2,
    }));
    expect(neighbourOverlap(blockItems, 4)).toBe(true);

    expect(
      neighbourOverlapByPlane(
        centers.map((pos, i) => ({
          pos,
          halfByPlane: planes[i]!.map((w) => w / 2),
        })),
        4,
      ),
    ).toBe(false);
  });

  it("still rejects when two multi-line labels collide on plane 1", () => {
    const centers = [40, 100]; // 60px apart
    // Both have wide second lines → plane 1 halves 40+40 + gap 4 > 60.
    expect(
      neighbourOverlapByPlane(
        [
          { pos: centers[0]!, halfByPlane: [20, 40] },
          { pos: centers[1]!, halfByPlane: [20, 40] },
        ],
        4,
      ),
    ).toBe(true);
  });
});
