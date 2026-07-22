import { describe, expect, it } from "bun:test";

import { qt } from "../../src/stats/numeric.ts";

import { load } from "./fixtures.ts";

describe("qt — R parity", () => {
  it("matches R's qt over the smooth stat's p/df grid", () => {
    const fixture = load<{ expected: { p: number; df: number; q: number }[] }>(
      "60-qt-reference.json",
    );
    for (const row of fixture.expected) {
      expect(Math.abs(qt(row.p, row.df) - row.q)).toBeLessThan(1e-9);
    }
  });
});
