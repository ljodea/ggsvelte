import { describe, expect, it } from "bun:test";

import { formatEnUS } from "../src/layout/format-en-us.ts";

function icu(v: number, decimals: number, useGrouping: boolean): string {
  return v.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping,
  });
}

describe("formatEnUS", () => {
  it("matches toLocaleString on documented edge cases", () => {
    const cases: [number, number, boolean][] = [
      [0, 0, false],
      [-0, 0, false],
      [-0.04, 0, false], // ICU renders "-0"
      [1, 0, false],
      [-1, 0, false],
      [0.5, 0, false],
      [2.5, 0, false],
      [-2.5, 0, false],
      [1.005, 2, false],
      [2.675, 2, false],
      [999.5, 0, true],
      [1000, 0, true],
      [1234567.891, 2, true],
      [1234567.891, 2, false],
      [0.1, 1, false],
      [-0.1, 1, false],
      [1e15, 0, true],
      [9007199254740991, 0, true], // 2^53 - 1 boundary
      [1e18, 0, true], // beyond the exact range: falls back to ICU
      [1e18 - 1, 0, true],
      [12345.6789, 6, true],
      [-98765.4321, 3, true],
    ];
    for (const [v, d, g] of cases) {
      expect(formatEnUS(v, d, g)).toBe(icu(v, d, g));
    }
  });

  it("matches toLocaleString across a random sweep in the exact range", () => {
    let state = 31;
    const rnd = () => (state = (state * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let d = 0; d <= 6; d++) {
      for (let i = 0; i < 4000; i++) {
        const v = (rnd() - 0.5) * 2 * 10 ** Math.floor(rnd() * 7);
        for (const g of [true, false]) {
          expect(formatEnUS(v, d, g)).toBe(icu(v, d, g));
        }
      }
    }
  });
});
