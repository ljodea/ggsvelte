import { describe, expect, it } from "vitest";

import {
  consumeIntervalKeys,
  nextLocalIntervalRecords,
  type IntervalConsumptionCandidate,
} from "../../src/lib/interval/consumption.js";

import { candidates, panels, record } from "./consumption-fixtures.js";

describe("facet interval consumption", () => {
  it("consumes independent records only through exact visible panel identity", () => {
    expect(
      consumeIntervalKeys({
        records: [
          record("north", "independent", ["n1", "n4"]),
          record("dormant", "independent", ["gone"]),
        ],
        panels,
        candidates,
      }),
    ).toEqual(["n1", "n4"]);
  });

  it("does not let an independent key follow a row into another panel", () => {
    expect(
      consumeIntervalKeys({
        records: [record("north", "independent", ["moved"])],
        panels,
        candidates: [{ panelId: "south", xValue: 2, keys: ["moved"] }],
      }),
    ).toEqual([]);
    expect(
      consumeIntervalKeys({
        records: [record("north", "union", ["moved"])],
        panels,
        candidates: [{ panelId: "south", xValue: 2, keys: ["moved"] }],
      }),
    ).toEqual(["moved"]);
  });

  // Independent consumption indexes candidates by panelId once (O(C + R·c_panel)),
  // not re-filters the full candidate list per record (O(R·C)). Structural
  // property of the implementation; perf-regression coverage lives in the
  // bench-smoke job, not a wall-clock unit assertion (flakes under CI contention).
  it("intersects independent keys only with same-panel candidates across many panels", () => {
    const panelCount = 40;
    const candidatesPerPanel = 80;
    // Keep first 10 candidate keys per panel; also inject foreign keys that
    // only exist on the next panel so a wrong-panel scan would leak them.
    const keptPerPanel = 10;
    const multiPanels = Array.from({ length: panelCount }, (_, p) => ({ id: `p${p}` }));
    const multiCandidates: IntervalConsumptionCandidate<string>[] = multiPanels.flatMap(
      (panel, p) =>
        Array.from({ length: candidatesPerPanel }, (_, j) => ({
          panelId: panel.id,
          xValue: j,
          keys: [`p${p}-c${j}`],
        })),
    );
    const multiRecords = multiPanels.map((panel, p) => {
      const ownKeys = Array.from({ length: keptPerPanel }, (_, j) => `p${p}-c${j}`);
      const foreignKeys = Array.from({ length: 5 }, (_, j) => `p${(p + 1) % panelCount}-c${j}`);
      return record(panel.id, "independent", [...ownKeys, ...foreignKeys]);
    });
    // Dormant panel brush must not contribute even if its keys exist elsewhere.
    multiRecords.push(record("dormant", "independent", ["p0-c0", "ghost"]));

    const keys = consumeIntervalKeys({
      records: multiRecords,
      panels: multiPanels,
      candidates: multiCandidates,
    });

    // 40 panels × 10 same-panel keys each; foreign and dormant keys excluded.
    const expected = multiPanels.flatMap((panel, p) =>
      Array.from({ length: keptPerPanel }, (_, j) => `p${p}-c${j}`),
    );
    expect(keys).toEqual(expected);
    expect(keys).toHaveLength(panelCount * keptPerPanel);
    expect(keys).not.toContain("ghost");
    expect(keys).not.toContain("p0-c10");
  });

  it("atomically replaces chart-local records when the preset changes", () => {
    const independent = [
      record("north", "independent", ["n1"]),
      record("south", "independent", ["s2"]),
    ];
    expect(nextLocalIntervalRecords(independent, record("south", "union", ["s8"]))).toEqual([
      record("south", "union", ["s8"]),
    ]);
  });

  it("consumes union records without any candidate projection", () => {
    // Hosts skip the O(candidates) semantic projection for union records —
    // the union path must read only stored record keys.
    expect(
      consumeIntervalKeys({
        records: [record("north", "union", ["n4", "shared"])],
        panels,
        candidates: [],
      }),
    ).toEqual(["n4", "shared"]);
  });

  it("unions stored keys for visible panels and de-duplicates stable keys", () => {
    expect(
      consumeIntervalKeys({
        records: [
          record("south", "union", ["s2", "shared"]),
          record("north", "union", ["n4", "shared"]),
          record("dormant", "union", ["gone"]),
        ],
        panels,
        candidates,
      }),
    ).toEqual(["s2", "shared", "n4"]);
  });

  it("projects cross-panel linear domains through every visible panel", () => {
    expect(
      consumeIntervalKeys({
        records: [record("north", "cross-panel", ["stale-origin-key"])],
        panels,
        candidates,
      }),
    ).toEqual(["n1", "n4", "shared", "s2"]);
  });
});
