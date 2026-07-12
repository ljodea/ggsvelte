import { describe, expect, it } from "bun:test";

import {
  CATEGORICAL_PALETTE_10,
  niceLinearDomain,
  trainBand,
  trainColor,
  trainLinear,
} from "../src/scales/train.ts";

describe("niceLinearDomain", () => {
  it("expands to tick-aligned bounds", () => {
    expect(niceLinearDomain(0.13, 9.87)).toEqual([0, 10]);
    expect(niceLinearDomain(-3, 103)).toEqual([-10, 110]);
  });

  it("pads zero-variance domains (ggplot2-style)", () => {
    const [lo, hi] = niceLinearDomain(5, 5);
    expect(lo).toBeLessThan(5);
    expect(hi).toBeGreaterThan(5);
  });

  it("defaults to [0, 1] for non-finite input", () => {
    expect(niceLinearDomain(NaN, NaN)).toEqual([0, 1]);
  });
});

describe("trainLinear", () => {
  it("computes the finite extent across arrays and normalizes into [0,1]", () => {
    const { scale, empty } = trainLinear([
      new Float64Array([1, NaN, 9.5]),
      new Float64Array([3, 4]),
    ]);
    expect(empty).toBe(false);
    expect(scale.domain).toEqual([1, 10]);
    expect(scale.normalize(1)).toBe(0);
    expect(scale.normalize(5.5)).toBe(0.5);
    expect(scale.normalize(10)).toBe(1);
  });

  it("reports empty domains and still yields a usable scale", () => {
    const { scale, empty } = trainLinear([new Float64Array([NaN])]);
    expect(empty).toBe(true);
    expect(scale.domain).toEqual([0, 1]);
  });
});

describe("trainBand", () => {
  it("assigns first-seen band positions (centers)", () => {
    const scale = trainBand([["b", "a", "c", "a"]]);
    expect(scale.domain).toEqual(["b", "a", "c"]);
    expect(scale.indexOf("b")).toBe(0);
    expect(scale.normalize("b")).toBeCloseTo(1 / 6);
    expect(scale.normalize("a")).toBeCloseTo(3 / 6);
    expect(scale.normalize("zzz")).toBeUndefined();
  });
});

describe("trainColor (value-stable, decision 0002)", () => {
  it("assigns palette colors first-seen and keeps them across data changes", () => {
    const first = trainColor(["a", "b", "c"]);
    expect(first.colorOf("a")).toBe(CATEGORICAL_PALETTE_10[0]);
    expect(first.colorOf("b")).toBe(CATEGORICAL_PALETTE_10[1]);

    // remove "b": a and c keep their colors
    const second = trainColor(["a", "c"], first.state);
    expect(second.colorOf("a")).toBe(first.colorOf("a"));
    expect(second.colorOf("c")).toBe(first.colorOf("c"));

    // re-add "b": it gets its OLD color back
    const third = trainColor(["a", "b", "c"], second.state);
    expect(third.colorOf("b")).toBe(CATEGORICAL_PALETTE_10[1]);
  });

  it("round-trips state through JSON (SSR adoption path)", () => {
    const first = trainColor(["x", "y"]);
    const revived = JSON.parse(JSON.stringify(first.state)) as typeof first.state;
    const second = trainColor(["y", "z"], revived);
    expect(second.colorOf("y")).toBe(first.colorOf("y"));
  });
});
