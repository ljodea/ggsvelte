import { describe, expect, it } from "vitest";

import {
  consumeIntervalKeys,
  nextLocalIntervalRecords,
  recomputePanelIntervalKeys,
  sameIntervalRecord,
  type IntervalConsumptionCandidate,
} from "../src/lib/plot-interval-consumption.js";
import type { PlotInteractionInterval } from "../src/lib/interaction.js";

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

  it("atomically replaces chart-local records when the preset changes", () => {
    const independent = [
      record("north", "independent", ["n1"]),
      record("south", "independent", ["s2"]),
    ];
    expect(nextLocalIntervalRecords(independent, record("south", "union", ["s8"]))).toEqual([
      record("south", "union", ["s8"]),
    ]);
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
});
