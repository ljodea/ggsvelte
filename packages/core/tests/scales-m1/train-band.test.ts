/**
 * Band scale training (pinned domain and reverse).
 */
import { describe, expect, it } from "bun:test";

import { trainBand } from "../../src/scales/train.ts";

describe("trainBand — pinned domains and reverse", () => {
  it("explicit domain pins order and membership", () => {
    const scale = trainBand([["b", "a", "z"]], { domain: ["a", "b", "c"] });
    expect(scale.domain).toEqual(["a", "b", "c"]);
    expect(scale.normalize("z")).toBeUndefined(); // out-of-domain drops
    expect(scale.normalize("a")).toBeCloseTo(1 / 6, 12);
  });

  it("reverse flips band centers", () => {
    const scale = trainBand([["a", "b"]], { reverse: true });
    expect(scale.normalize("a")).toBe(0.75);
    expect(scale.normalize("b")).toBe(0.25);
  });
});
