/**
 * ggplot2 parity for the count stat and stack/fill/dodge positions, against
 * the R-generated fixtures in tests/fixtures/positions (regenerate with
 * `Rscript packages/core/tests/fixtures/positions/generate.R`).
 *
 * Comparisons are keyed by (x, g) so they are row-order-independent; the
 * fixture datasets keep first-occurrence order aligned with factor-level
 * order (the documented precondition for order-sensitive parity).
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { deriveGroups } from "../src/grouping.ts";
import { positionDodge, positionStack } from "../src/positions/positions.ts";
import { statCount } from "../src/stats/count.ts";
import type { CellValue } from "../src/table.ts";

const dir = join(import.meta.dir, "fixtures", "positions");

interface Fixture {
  case: string;
  data: Record<string, CellValue[]>;
  expected: Record<string, CellValue>[];
}

function load(name: string): Fixture {
  return JSON.parse(readFileSync(join(dir, name), "utf8")) as Fixture;
}

/** The pipeline's group derivation for aes(x, fill = g). */
function groupsOf(data: Record<string, CellValue[]>): number[] {
  const aes =
    "g" in data ? { x: { field: "x" }, fill: { field: "g" } } : ({ x: { field: "x" } } as const);
  return [...deriveGroups(data, aes).groups];
}

function key(row: Record<string, CellValue>): string {
  return `${String(row["x"])}|${String(row["g"] ?? "all")}`;
}

describe("count stat — ggplot2 parity (R fixtures)", () => {
  it("01: counts per x (single group)", () => {
    const fixture = load("01-count-by-x.json");
    const result = statCount({
      x: fixture.data["x"]!,
      groups: groupsOf({ x: fixture.data["x"]! }),
    });
    const actual = new Map(result.x.map((x, i) => [`${String(x)}|all`, result.count[i]!]));
    expect(actual.size).toBe(fixture.expected.length);
    for (const row of fixture.expected) {
      expect(actual.get(key(row))).toBe(row["count"] as number);
    }
  });

  for (const [name, hasWeight] of [
    ["02-count-by-x-and-fill.json", false],
    ["03-count-weighted.json", true],
  ] as const) {
    it(`${name}: counts per (x, fill group)${hasWeight ? " with weights" : ""}`, () => {
      const fixture = load(name);
      const result = statCount({
        x: fixture.data["x"]!,
        groups: groupsOf(fixture.data),
        weights: hasWeight ? Float64Array.from(fixture.data["w"] as number[]) : null,
        carried: { g: fixture.data["g"]! },
      });
      const actual = new Map(
        result.x.map((x, i) => [
          `${String(x)}|${String(result.carried["g"]![i])}`,
          result.count[i]!,
        ]),
      );
      expect(actual.size).toBe(fixture.expected.length);
      for (const row of fixture.expected) {
        expect(actual.get(key(row))).toBe(row["count"] as number);
      }
    });
  }
});

describe("position stack/fill — ggplot2 parity (R fixtures)", () => {
  for (const [name, mode] of [
    ["04-stack-positive.json", "stack"],
    ["05-stack-mixed-sign.json", "stack"],
    ["06-fill-proportions.json", "fill"],
  ] as const) {
    it(name, () => {
      const fixture = load(name);
      const { x, g, y } = fixture.data as { x: string[]; g: string[]; y: number[] };
      const groups = groupsOf(fixture.data);
      const { ymin, ymax } = positionStack({
        slots: x,
        groups,
        y: Float64Array.from(y),
        mode,
      });
      const actual = new Map(
        x.map((xv, i) => [`${xv}|${g[i]!}`, { ymin: ymin[i]!, ymax: ymax[i]! }]),
      );
      for (const row of fixture.expected) {
        const got = actual.get(key(row))!;
        expect(got).toBeDefined();
        expect(got.ymin).toBeCloseTo(row["ymin"] as number, 10);
        expect(got.ymax).toBeCloseTo(row["ymax"] as number, 10);
      }
    });
  }
});

describe("position dodge — ggplot2 parity (R fixtures)", () => {
  it("07: per-x slots, offsets from the band center (width 0.9)", () => {
    const fixture = load("07-dodge-slots.json");
    const { x, g } = fixture.data as { x: string[]; g: string[] };
    const groups = groupsOf(fixture.data);
    const { slot, slotCount } = positionDodge({ slots: x, groups });
    const WIDTH = 0.9;
    const actual = new Map(
      x.map((xv, i) => {
        const n = slotCount[i]!;
        const w = WIDTH / n;
        const center = WIDTH * ((slot[i]! + 0.5) / n - 0.5);
        return [`${xv}|${g[i]!}`, { xminOffset: center - w / 2, xmaxOffset: center + w / 2 }];
      }),
    );
    for (const row of fixture.expected) {
      const got = actual.get(key(row))!;
      expect(got).toBeDefined();
      expect(got.xminOffset).toBeCloseTo(row["xminOffset"] as number, 10);
      expect(got.xmaxOffset).toBeCloseTo(row["xmaxOffset"] as number, 10);
    }
  });

  it("uneven groups divide each band among the groups PRESENT (preserve='total')", () => {
    // Pinned against ggplot2 directly (see decision 0008): at an x with two of
    // three groups, each present group gets half of the 0.9 band.
    const x = ["p", "p", "p", "q", "q"];
    const groups = [0, 1, 2, 0, 2];
    const { slot, slotCount } = positionDodge({ slots: x, groups });
    expect([...slot]).toEqual([0, 1, 2, 0, 1]);
    expect([...slotCount]).toEqual([3, 3, 3, 2, 2]);
  });
});
