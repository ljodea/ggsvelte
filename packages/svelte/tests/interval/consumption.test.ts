import { describe, expect, it } from "vitest";

import {
  candidateInInterval,
  consumeIntervalKeys,
  nextLocalIntervalRecords,
  recomputePanelIntervalKeys,
  recomputePanelIntervalProjection,
  sameIntervalRecord,
  type IntervalConsumptionCandidate,
} from "../../src/lib/interval/consumption.js";
import type { PlotInteractionInterval } from "../../src/lib/interaction/interaction.js";

const panels = [{ id: "north" }, { id: "south" }] as const;
const candidates: readonly IntervalConsumptionCandidate<string>[] = [
  { panelId: "north", xValue: 1, yValue: "low", keys: ["n1"] },
  { panelId: "north", xValue: 4, yValue: "high", keys: ["n4", "shared"] },
  { panelId: "south", xValue: 2, yValue: "low", keys: ["s2", "shared"] },
  { panelId: "south", xValue: 8, yValue: "high", keys: ["s8"] },
  { panelId: "dormant", xValue: 3, yValue: "low", keys: ["gone"] },
];

function record(
  panelId: string,
  preset: PlotInteractionInterval<string>["preset"],
  keys: readonly string[],
): PlotInteractionInterval<string> {
  return {
    panelId,
    preset,
    domains: { x: { kind: "linear", domain: [1, 5] } },
    keys,
  };
}

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

  it("intersects x and y domains naturally and returns empty when disjoint", () => {
    const cross: PlotInteractionInterval<string> = {
      panelId: "north",
      preset: "cross-panel",
      domains: {
        x: { kind: "time", domain: [Date.UTC(2025, 0, 2), Date.UTC(2025, 0, 3)] },
        y: { kind: "linear", domain: [10, 20] },
      },
      keys: [],
    };
    const timeCandidates = [
      {
        panelId: "north",
        xValue: new Date(Date.UTC(2025, 0, 2)),
        yValue: 30,
        keys: ["x-only"],
      },
      {
        panelId: "south",
        xValue: "2025-01-03",
        yValue: 5,
        keys: ["also-x-only"],
      },
    ];
    expect(consumeIntervalKeys({ records: [cross], panels, candidates: timeCandidates })).toEqual(
      [],
    );
  });

  it("uses positive numeric membership for logarithmic domains", () => {
    const cross: PlotInteractionInterval<string> = {
      panelId: "north",
      preset: "cross-panel",
      domains: { x: { kind: "log", domain: [1, 100] } },
      keys: [],
    };
    expect(
      consumeIntervalKeys({
        records: [cross],
        panels,
        candidates: [
          { panelId: "north", xValue: -2, keys: ["negative"] },
          { panelId: "north", xValue: 10, keys: ["inside"] },
          { panelId: "south", xValue: 1000, keys: ["outside"] },
        ],
      }),
    ).toEqual(["inside"]);
  });

  it("matches band domains by canonical typed identity", () => {
    const cross: PlotInteractionInterval<string> = {
      panelId: "north",
      preset: "cross-panel",
      domains: { x: { kind: "band", values: ["@n:1"] } },
      keys: [],
    };
    expect(
      consumeIntervalKeys({
        records: [cross],
        panels,
        candidates: [
          { panelId: "north", xValue: 1, keys: ["number"] },
          { panelId: "north", xValue: "1", keys: ["string"] },
        ],
      }),
    ).toEqual(["number"]);
  });

  // Band membership is O(1) amortized via a Set built once per axis (not
  // includes() per candidate). This is a structural property of the
  // implementation; perf-regression coverage lives in the bench-smoke job,
  // not a wall-clock unit assertion (which flakes under CI contention).
  it("projects large band domains across many candidates without losing matches", () => {
    const selectedCount = 200;
    const candidateCount = 2_000;
    // Encoded band keys for numbers 0..selectedCount-1 (canonical @n: form).
    const values = Array.from({ length: selectedCount }, (_, i) => `@n:${i}`);
    const cross: PlotInteractionInterval<string> = {
      panelId: "north",
      preset: "cross-panel",
      domains: { x: { kind: "band", values } },
      keys: [],
    };
    const bandCandidates: IntervalConsumptionCandidate<string>[] = Array.from(
      { length: candidateCount },
      (_, i) => ({
        panelId: i % 2 === 0 ? "north" : "south",
        // Mix selected tail, unselected head, and typed string lookalikes.
        xValue: i < selectedCount ? i : i < selectedCount * 2 ? String(i % selectedCount) : i,
        keys: [`k${i}`],
      }),
    );
    const keys = consumeIntervalKeys({
      records: [cross],
      panels,
      candidates: bandCandidates,
    });
    // Only numeric values whose encodeKey is in the selected band set match.
    // Candidates with xValue in [0, selectedCount) match; string/"lookalike"
    // and out-of-band numbers do not.
    expect(keys).toHaveLength(selectedCount);
    expect(keys[0]).toBe("k0");
    expect(keys[selectedCount - 1]).toBe(`k${selectedCount - 1}`);
    expect(keys).not.toContain(`k${selectedCount}`);
  });

  it("candidateInInterval rejects undefined axis values and keeps numeric axes", () => {
    expect(
      candidateInInterval(
        { xValue: undefined, yValue: "low" },
        { x: { kind: "band", values: ["low"] }, y: { kind: "band", values: ["low"] } },
      ),
    ).toBe(false);
    expect(
      candidateInInterval(
        { xValue: 3, yValue: 10 },
        { x: { kind: "linear", domain: [1, 5] }, y: { kind: "log", domain: [1, 100] } },
      ),
    ).toBe(true);
    expect(
      candidateInInterval(
        { xValue: 3, yValue: -1 },
        { x: { kind: "linear", domain: [1, 5] }, y: { kind: "log", domain: [1, 100] } },
      ),
    ).toBe(false);
  });

  it("treats records as the same across key order and controller canonicalization", () => {
    const committed = record("north", "independent", ["n4", "n1"]);
    const canonical: PlotInteractionInterval<string> = {
      panelId: "north",
      preset: "independent",
      domains: { x: { kind: "linear", domain: [1, 5] } },
      keys: ["n1", "n4"],
    };
    expect(sameIntervalRecord(committed, canonical)).toBe(true);
    expect(
      sameIntervalRecord(
        {
          ...committed,
          domains: {
            x: { kind: "band", values: ["@n:1", "1"] },
            y: { kind: "log", domain: [1, 100] },
          },
        },
        {
          ...canonical,
          domains: {
            x: { kind: "band", values: ["@n:1", "1"] },
            y: { kind: "log", domain: [1, 100] },
          },
        },
      ),
    ).toBe(true);
  });

  it("detects replaced records by panel, preset, domain, or key changes", () => {
    const committed = record("north", "independent", ["n1"]);
    expect(sameIntervalRecord(null, committed)).toBe(false);
    expect(sameIntervalRecord(committed, record("south", "independent", ["n1"]))).toBe(false);
    expect(sameIntervalRecord(committed, record("north", "union", ["n1"]))).toBe(false);
    expect(sameIntervalRecord(committed, record("north", "independent", ["n1", "n4"]))).toBe(false);
    expect(
      sameIntervalRecord(committed, {
        ...record("north", "independent", ["n1"]),
        domains: { x: { kind: "linear", domain: [1, 9] } },
      }),
    ).toBe(false);
    expect(
      sameIntervalRecord(committed, {
        ...record("north", "independent", ["n1"]),
        domains: {
          x: { kind: "linear", domain: [1, 5] },
          y: { kind: "band", values: ["low"] },
        },
      }),
    ).toBe(false);
    expect(
      sameIntervalRecord(
        {
          ...record("north", "independent", ["n1"]),
          domains: { x: { kind: "band", values: ["a", "b"] } },
        },
        {
          ...record("north", "independent", ["n1"]),
          domains: { x: { kind: "band", values: ["b", "a"] } },
        },
      ),
    ).toBe(false);
  });

  it("recomputes precise-bound keys in only the edited panel", () => {
    expect(
      recomputePanelIntervalKeys({
        panelId: "south",
        domains: {
          x: { kind: "linear", domain: [1, 3] },
          y: { kind: "band", values: ["low"] },
        },
        candidates,
      }),
    ).toEqual(["s2", "shared"]);
  });

  it("recomputePanelIntervalProjection returns keys and lineageCount in one pass", () => {
    const projection = recomputePanelIntervalProjection({
      panelId: "south",
      domains: {
        x: { kind: "linear", domain: [1, 3] },
        y: { kind: "band", values: ["low"] },
      },
      candidates: [
        {
          panelId: "south",
          xValue: 2,
          yValue: "low",
          keys: ["s2", "shared"],
          sourceRows: [10, 11, 10],
        },
        {
          panelId: "south",
          xValue: 2,
          yValue: "low",
          keys: ["s3"],
          sourceRows: [11, 12],
        },
        {
          panelId: "north",
          xValue: 2,
          yValue: "low",
          keys: ["n1"],
          sourceRows: [99],
        },
      ],
    });
    expect(projection.keys).toEqual(["s2", "shared", "s3"]);
    // Unique source rows on south only: 10, 11, 12
    expect(projection.lineageCount).toBe(3);
  });

  it("recomputePanelIntervalProjection lineageCount is 0 when sourceRows omitted", () => {
    const projection = recomputePanelIntervalProjection({
      panelId: "south",
      domains: {
        x: { kind: "linear", domain: [1, 3] },
        y: { kind: "band", values: ["low"] },
      },
      candidates,
    });
    expect(projection.keys).toEqual(["s2", "shared"]);
    expect(projection.lineageCount).toBe(0);
  });

  it("recomputes panel keys against a large band domain via Set membership", () => {
    const selectedCount = 150;
    const values = Array.from({ length: selectedCount }, (_, i) => `@n:${i}`);
    // 500 south + 500 north. south xValue = i % 300, so matches are:
    // i=0..149 and i=300..449 (xValue in [0, 150)).
    const panelCandidates: IntervalConsumptionCandidate<string>[] = Array.from(
      { length: 1_000 },
      (_, i) => ({
        panelId: i < 500 ? "south" : "north",
        xValue: i % 300,
        keys: [`p${i}`],
      }),
    );
    const keys = recomputePanelIntervalKeys({
      panelId: "south",
      domains: { x: { kind: "band", values } },
      candidates: panelCandidates,
    });
    const expected = [
      ...Array.from({ length: 150 }, (_, i) => `p${i}`),
      ...Array.from({ length: 150 }, (_, i) => `p${300 + i}`),
    ];
    expect(keys).toEqual(expected);
  });
});
