/**
 * SVG pathData string shape for multi-series line denseness (linear + step).
 * Pins output so a linear fast-path rewrite cannot drift from step/closed rings.
 */
import { describe, expect, it } from "bun:test";

import { pathData } from "../src/render-svg-marks.ts";

describe("pathData multi-vertex linear", () => {
  it("emits M then L segments with two-decimal px for open linear", () => {
    // (0,0) → (10.126, 20.994) → (30, 40)
    const positions = Float32Array.of(0, 0, 10.126, 20.994, 30, 40);
    expect(pathData(positions, 0, 3, "linear", false)).toBe("M0 0L10.13 20.99L30 40");
  });

  it("closes with Z when closed=true", () => {
    const positions = Float32Array.of(0, 0, 10, 0, 10, 10);
    expect(pathData(positions, 0, 3, "linear", true)).toBe("M0 0L10 0L10 10Z");
  });

  it("inserts step-hv corners between vertices", () => {
    const positions = Float32Array.of(0, 0, 10, 10);
    // step-hv: horizontal then vertical → corner (10, 0)
    expect(pathData(positions, 0, 2, "step-hv", false)).toBe("M0 0L10 0L10 10");
  });

  it("returns empty string for empty span", () => {
    const positions = Float32Array.of(1, 2);
    expect(pathData(positions, 0, 0, "linear", false)).toBe("");
  });

  it("handles a dense linear span without dropping vertices", () => {
    const n = 1000;
    const positions = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      positions[i * 2] = i;
      positions[i * 2 + 1] = i * 0.5;
    }
    const d = pathData(positions, 0, n, "linear", false);
    expect(d.startsWith("M0 0")).toBe(true);
    // n vertices → 1 M + (n-1) L
    expect(d.match(/L/g)?.length).toBe(n - 1);
    expect(d.endsWith("L999 499.5")).toBe(true);
  });
});
