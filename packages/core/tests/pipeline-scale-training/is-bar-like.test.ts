/**
 * isBarLike helper characterization.
 */
import { describe, expect, it } from "bun:test";

import { isBarLike } from "../../src/pipeline/scale-training.ts";

describe("isBarLike", () => {
  it("recognizes bar/col/area only", () => {
    expect(isBarLike("bar")).toBe(true);
    expect(isBarLike("col")).toBe(true);
    expect(isBarLike("area")).toBe(true);
    expect(isBarLike("point")).toBe(false);
    expect(isBarLike("line")).toBe(false);
  });
});
